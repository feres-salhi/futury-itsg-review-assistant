"""LangGraph orchestrator: two graphs, six agents, code checks and human gates G1 / G3 / G5.

design graph   02 requirement_agent -> citation_check -> requirement_critic (max 2 revisions) -> G1
               03 testcase_agent -> expected_calc (code) -> testcase_critic (max 2 revisions) -> G3
verdict graph  04 compare (code) -> findings_critic -> explainer -> G5   (broken output: straight to G5)

Gates pause with interrupt() until a person answers. With --auto a gate is passed as "auto-approved (harness)";
that is recorded as such and never counted as a human approval.

Usage:
  python orchestrator/graph.py design [--auto]
  python orchestrator/graph.py verdict --cases GOLD-13.1,GOLD-13.3 [--auto]
"""
import argparse
import json
import re
import sys
import tempfile
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any, TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path[:0] = [str(HERE), str(ROOT), str(ROOT / "harness")]
from agents import (explainer, findings_critic, requirement_agent, requirement_critic,  # noqa: E402
                    testcase_agent, testcase_critic)
from llm import AgentError, lf_client  # noqa: E402
from generate_cases import decide  # noqa: E402
from run_harness import TEMPLATE, evaluate  # noqa: E402
from run_review import load_env  # noqa: E402

MAX_REVISIONS = 2   # critic -> author loops per stage
MAX_REJECTS = 2     # a person may send work back twice, then the run stops at the gate
AUTO = "auto-approved (harness)"


class Design(TypedDict, total=False):
    mode: str
    chunks: list
    criteria: list
    issues: list
    cite_rounds: int
    req_rounds: int
    g1_rejects: int
    cases: list
    tc_rounds: int
    g3_rejects: int
    gates: list
    log: list
    status: str


# ---------------------------------------------------------------- helpers
def note(state, msg):
    return state.get("log", []) + [f"{datetime.now():%H:%M:%S} {msg}"]


def gate(state, name, payload):
    """Pause for a person (or pass automatically in harness mode). Returns the decision record."""
    if state.get("mode") == "harness":   # never auto-approve a BLOCKED step: the run stops there
        decision = ({"decision": "stop", "by": AUTO, "note": "BLOCKED: nothing to approve"}
                    if state.get("status") == "BLOCKED" else {"decision": "approve", "by": AUTO, "note": ""})
    else:
        decision = interrupt({"gate": name, **payload})
    decision = {**decision, "gate": name, "at": datetime.now().isoformat(timespec="seconds")}
    lf = lf_client()
    if lf:
        with lf.start_as_current_span(name=f"gate {name}", input=payload.get("summary"), output=decision,
                                      metadata={"human": decision["by"] != AUTO}):
            pass
    return decision


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


# ---------------------------------------------------------------- 02 requirements
def req_draft(s: Design):
    try:
        crit = requirement_agent(s["chunks"], s.get("criteria"), s.get("issues"))
        return {"criteria": crit, "issues": [], "log": note(s, f"requirement_agent: {len(crit)} criteria")}
    except AgentError as exc:
        return {"criteria": [], "status": "BLOCKED", "log": note(s, f"BLOCKED {exc}")}


def citation_check(s: Design):
    text = {c["path"]: norm(c["text"]) for c in s["chunks"]}
    bad = [c for c in s["criteria"] if norm(c.get("quote")) not in text.get(c.get("chunk"), "") or not norm(c.get("quote"))]
    if bad and s.get("cite_rounds", 0) < MAX_REVISIONS:
        issues = [{"criterion": c["id"], "problem": "quote not found in the chunk", "fix": "copy the quote exactly"} for c in bad]
        return {"issues": issues, "cite_rounds": s.get("cite_rounds", 0) + 1,
                "log": note(s, f"citation_check: {len(bad)} quotes not found -> redraft")}
    keep = [c for c in s["criteria"] if c not in bad]
    return {"criteria": keep, "issues": [], "log": note(s, f"citation_check: {len(keep)} cited, {len(bad)} dropped")}


def req_critic(s: Design):
    try:
        issues = requirement_critic(s["chunks"], s["criteria"])
    except AgentError as exc:
        return {"issues": [], "log": note(s, f"requirement_critic failed, goes to G1 unchecked: {exc}")}
    if issues and s.get("req_rounds", 0) < MAX_REVISIONS:
        return {"issues": issues, "req_rounds": s.get("req_rounds", 0) + 1,
                "log": note(s, f"requirement_critic: {len(issues)} issues -> revise")}
    return {"issues": issues, "log": note(s, f"requirement_critic: {len(issues)} issues left for G1")}


def g1(s: Design):
    d = gate(s, "G1", {"summary": f"{len(s['criteria'])} criteria, {len(s.get('issues', []))} open critic issues",
                       "criteria": s["criteria"], "open_issues": s.get("issues", [])})
    upd = {"gates": s.get("gates", []) + [d], "log": note(s, f"G1 {d['decision']} by {d['by']}")}
    if d["decision"] != "approve" or s.get("status") == "BLOCKED":
        upd.update(issues=[{"criterion": None, "problem": "expert rejected", "fix": d.get("note", "")}],
                   g1_rejects=s.get("g1_rejects", 0) + 1, gates=upd["gates"][:-1] + [{**d, "decision": d["decision"]
                   if d["decision"] != "approve" else "reject"}], status="" if d["decision"] != "stop" else "BLOCKED")
    return upd


# ---------------------------------------------------------------- 03 test design
def tc_draft(s: Design):
    try:
        cases = testcase_agent(s["criteria"], s.get("cases"), s.get("issues"))
        return {"cases": cases, "issues": [], "log": note(s, f"testcase_agent: {len(cases)} cases")}
    except AgentError as exc:
        return {"cases": [], "status": "BLOCKED", "log": note(s, f"BLOCKED {exc}")}


def to_dates(sc):
    p = lambda v: date.fromisoformat(v) if v else None  # noqa: E731
    out = {"current_start": p(sc["current_start"]), "current_end": p(sc.get("current_end")), "today": p(sc["today"]),
           "current_cert": bool(sc["current_cert"]), "insurance": sc["insurance"],
           "prior": [{"start": p(x["start"]), "end": p(x["end"]), "cert": bool(x["cert"])} for x in sc.get("prior", [])]}
    if out["current_end"] and out["current_end"] < out["current_start"]:
        raise ValueError("current AU ends before it starts")
    if any(x["end"] < x["start"] for x in out["prior"]):
        raise ValueError("a prior AU ends before it starts")
    return out


def expected_calc(s: Design):
    """Code, not AI: expected result of every case from rules R1-R6 (generate_cases.decide)."""
    out = []
    for c in s["cases"]:
        try:
            send, rule, dbvo = decide(to_dates(c["scenario"]))
            c = {**c, "expected": json.loads(json.dumps({"send_41": send, "rule": rule, "dbvo": dbvo}, default=str))}
        except (KeyError, TypeError, ValueError) as exc:
            c = {**c, "expected": None, "blocked": f"{type(exc).__name__}: {exc}"}
        out.append(c)
    bad = sum(1 for c in out if c.get("blocked"))
    return {"cases": out, "log": note(s, f"expected_calc: {len(out) - bad} computed, {bad} BLOCKED (bad scenario)")}


def tc_critic(s: Design):
    try:
        issues = testcase_critic(s["criteria"], s["cases"])
    except AgentError as exc:
        return {"issues": [], "log": note(s, f"testcase_critic failed, goes to G3 unchecked: {exc}")}
    if issues and s.get("tc_rounds", 0) < MAX_REVISIONS:
        return {"issues": issues, "tc_rounds": s.get("tc_rounds", 0) + 1,
                "log": note(s, f"testcase_critic: {len(issues)} issues -> revise")}
    return {"issues": issues, "log": note(s, f"testcase_critic: {len(issues)} issues left for G3")}


def g3(s: Design):
    d = gate(s, "G3", {"summary": f"{len(s['cases'])} cases with expected results",
                       "cases": [{k: c.get(k) for k in ("id", "criterion", "kind", "idea", "expected", "blocked")}
                                 for c in s["cases"]], "open_issues": s.get("issues", [])})
    upd = {"gates": s.get("gates", []) + [d], "log": note(s, f"G3 {d['decision']} by {d['by']}")}
    if d["decision"] != "approve" or s.get("status") == "BLOCKED":
        upd.update(issues=[{"case": None, "problem": "reviewer rejected", "fix": d.get("note", "")}],
                   g3_rejects=s.get("g3_rejects", 0) + 1, gates=upd["gates"][:-1] + [{**d, "decision": d["decision"]
                   if d["decision"] != "approve" else "reject"}], status="" if d["decision"] != "stop" else "BLOCKED")
    else:
        upd["status"] = "APPROVED"
    return upd


def build_design():
    g = StateGraph(Design)
    for name, fn in [("requirement_agent", req_draft), ("citation_check", citation_check),
                     ("requirement_critic", req_critic), ("G1", g1), ("testcase_agent", tc_draft),
                     ("expected_calc", expected_calc), ("testcase_critic", tc_critic), ("G3", g3)]:
        g.add_node(name, fn)
    g.add_conditional_edges(START, lambda s: "testcase_agent" if s.get("criteria") and s.get("gates") else "requirement_agent")
    g.add_conditional_edges("requirement_agent", lambda s: "G1" if s.get("status") == "BLOCKED" else "citation_check")
    g.add_conditional_edges("citation_check", lambda s: "requirement_agent" if s.get("issues") else "requirement_critic")
    g.add_conditional_edges("requirement_critic", lambda s: "requirement_agent" if s["log"][-1].endswith("-> revise") else "G1")
    g.add_conditional_edges("G1", route_g1)
    g.add_conditional_edges("testcase_agent", lambda s: "G3" if s.get("status") == "BLOCKED" else "expected_calc")
    g.add_edge("expected_calc", "testcase_critic")
    g.add_conditional_edges("testcase_critic", lambda s: "testcase_agent" if s["log"][-1].endswith("-> revise") else "G3")
    g.add_conditional_edges("G3", route_g3)
    return g.compile(checkpointer=InMemorySaver())


def route_g1(s):
    if s["gates"][-1]["decision"] == "approve":
        return "testcase_agent"
    return END if s.get("g1_rejects", 0) > MAX_REJECTS or s["gates"][-1]["decision"] == "stop" else "requirement_agent"


def route_g3(s):
    if s["gates"][-1]["decision"] == "approve":
        return END
    return END if s.get("g3_rejects", 0) > MAX_REJECTS or s["gates"][-1]["decision"] == "stop" else "testcase_agent"


# ---------------------------------------------------------------- 04 verdict (one case)
class Verdict(TypedDict, total=False):
    mode: str
    case: Any
    findings: list
    score: dict
    sampled: bool
    critic_changed: list
    summary: str
    gates: list
    log: list


_RAW = None
_TMP = tempfile.mkdtemp(prefix="team10-")


def compare(s: Verdict):
    global _RAW
    _RAW = _RAW or TEMPLATE.read_text(encoding="latin-1")
    findings, score = evaluate(s["case"], _RAW, _TMP)
    return {"findings": findings, "score": score, "log": note(s, f"compare: {score['outcome']}")}


def f_critic(s: Verdict):
    try:
        review = findings_critic(s["case"], s["findings"])
    except AgentError as exc:
        return {"critic_changed": [], "log": note(s, f"findings_critic failed, verdict unchanged: {exc}")}
    named = {r.get("check"): r.get("note", "") for r in review}
    out, changed = [], []
    for f in s["findings"]:   # the critic can only send a check to a person; it cannot pass or fail anything
        if f["id"] in named and f["status"] in ("PASS", "MISMATCH"):
            f = {**f, "status": "NEEDS_REVIEW", "reason": f"findings_critic: {named[f['id']]}", "was": f["status"]}
            changed.append(f["id"])
        out.append(f)
    return {"findings": out, "critic_changed": changed, "log": note(s, f"findings_critic: {changed or 'no change'}")}


def explain(s: Verdict):
    try:
        return {"summary": explainer(s["findings"]), "log": note(s, "explainer: done")}
    except AgentError as exc:
        return {"summary": None, "log": note(s, f"explainer failed: {exc}")}


def g5(s: Verdict):
    bad = [f["id"] for f in s["findings"] if f["status"] != "PASS"]
    d = gate(s, "G5", {"summary": f"case {s['case']['id']}: {s['score']['outcome']}, not PASS: {bad}",
                       "explanation": s.get("summary")})
    return {"gates": s.get("gates", []) + [d], "log": note(s, f"G5 {d['decision']} by {d['by']}")}


def build_verdict():
    g = StateGraph(Verdict)
    for name, fn in [("compare", compare), ("findings_critic", f_critic), ("explainer", explain), ("G5", g5)]:
        g.add_node(name, fn)
    g.add_edge(START, "compare")
    g.add_conditional_edges("compare", lambda s: "G5" if any(f["status"] == "BLOCKED" for f in s["findings"])
                            else ("findings_critic" if s.get("sampled", True) else "G5"))
    g.add_edge("findings_critic", "explainer")
    g.add_edge("explainer", "G5")
    g.add_edge("G5", END)
    return g.compile(checkpointer=InMemorySaver())


# ---------------------------------------------------------------- running with a person at the gates
def ask_person(payload):
    print("\n" + "=" * 70 + f"\n{payload['gate']}  {payload['summary']}")
    for k in ("criteria", "cases"):
        for row in payload.get(k, []):
            print("  ", json.dumps(row, ensure_ascii=False, default=str)[:220])
    if payload.get("open_issues"):
        print("  open critic issues:", json.dumps(payload["open_issues"], ensure_ascii=False)[:400])
    if payload.get("explanation"):
        print("  explanation:", payload["explanation"])
    ans = input("approve / reject <note> / stop > ").strip()
    word, _, rest = ans.partition(" ")
    who = input("your name > ").strip() or "unknown"
    return {"decision": {"a": "approve", "approve": "approve", "stop": "stop"}.get(word.lower(), "reject"), "note": rest, "by": who}


def run(graph, state, auto):
    cfg = {"configurable": {"thread_id": str(uuid.uuid4())}}
    state = {**state, "mode": "harness" if auto else "demo"}
    out = graph.invoke(state, cfg)
    while "__interrupt__" in out:
        out = graph.invoke(Command(resume=ask_person(out["__interrupt__"][0].value)), cfg)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("what", choices=["design", "verdict"])
    ap.add_argument("--auto", action="store_true", help="pass gates automatically (harness), never counted as human")
    ap.add_argument("--cases", default="GOLD-13.1,GOLD-13.2,GOLD-13.3,GOLD-13.4,GOLD-13.5")
    args = ap.parse_args()
    load_env(ROOT / ".env")
    run_id = f"AGENTS-{args.what}-{datetime.now():%Y%m%d-%H%M%S}"
    lf = lf_client()
    root = lf.start_as_current_span(name=f"agents-{args.what}") if lf else None
    span = root.__enter__() if root else None
    if args.what == "design":
        chunks = [json.loads(line) for line in open(ROOT / "chunks" / "chunks.jsonl", encoding="utf-8")]
        chunks = [c for c in chunks if c["doc"] == "VB" and re.fullmatch(r"3\.12(\.[1-8])?", str(c["section"]))]
        result = run(build_design(), {"chunks": chunks}, args.auto)
        result.pop("chunks", None)
    else:
        want = args.cases.split(",")
        cases = [c for c in json.loads((ROOT / "data" / "testcases.json").read_text(encoding="utf-8")) if c["id"] in want]
        result = {"cases": [run(build_verdict(), {"case": c, "sampled": True}, args.auto) for c in cases]}
        for r in result["cases"]:
            r["case"] = r["case"]["id"]
    if span:
        span.update_trace(name=f"agents-{args.what}", session_id=run_id, tags=["Team10", "agents", args.what],
                          output={"status": result.get("status"), "gates": result.get("gates")})
        root.__exit__(None, None, None)
        lf.flush()
    out = ROOT / "reports" / f"{run_id}.json"
    out.write_text(json.dumps(result, indent=1, ensure_ascii=False, default=str), encoding="utf-8")
    for line in result.get("log", []):
        print(line)
    for r in result.get("cases", []) if args.what == "verdict" else []:
        print(r["case"], r["score"]["outcome"], "| critic changed:", r.get("critic_changed"), "|", r.get("summary"))
    print("->", out)


if __name__ == "__main__":
    main()
