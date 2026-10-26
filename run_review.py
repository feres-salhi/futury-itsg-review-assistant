"""Run one review: TEEL0 file + test case -> checks -> attacks -> report, traced in Langfuse.

Usage:  python run_review.py [--case data/case_correct.json] [--teel0 "ITSG Files/TEEL0-Test1-DBVO"]
                             [--checker-dir checker] [--public]
Env:    LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_HOST (from .env). Without keys the
        review still runs; only tracing is off.
Output: reports/<report id>.json and a human-readable table on stdout.
"""
import argparse
import calendar
import contextlib
import copy
import json
import os
import sys
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Field positions (1-based, length) from Verfahrensbeschreibung DTA EEL 13.4
DSLW_FIELDS = {"DATUM-ERSTELLUNG": (42, 8), "DATENSATZ-ID": (99, 36), "ABGABEGRUND": (201, 2)}  # §3.1.5, §3.1.18
DBVO_FIELDS = {"GRUNDAV": (5, 1), "AU-AB-AG": (6, 8), "KZ-AK-AU": (22, 1), "ANZAHL-AU": (31, 2)}  # §3.12.1-3.12.6
DBVO_PERIOD = 50  # §3.12.7-3.12.14: BEGINN 8, ENDE 8, then 34 insurer-side characters per prior AU


def load_env(path):
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"'))


def d(s):
    """'20260311' or '11.03.2026' -> date"""
    return datetime.strptime(s, "%Y%m%d" if "." not in s else "%d.%m.%Y").date()


def fmt(day):
    return day.strftime("%d.%m.%Y")


def add_months(day, months):
    m = day.month - 1 + months
    y, m = day.year + m // 12, m % 12 + 1
    return date(y, m, min(day.day, calendar.monthrange(y, m)[1]))


def parse_teel0(path):
    raw = Path(path).read_text(encoding="latin-1")
    dslw = raw[raw.index("DSLW"):]
    out = {k: dslw[a - 1:a - 1 + n] for k, (a, n) in DSLW_FIELDS.items()}
    dbvo = raw[raw.index("DBVO"):]
    out.update({k: dbvo[a - 1:a - 1 + n] for k, (a, n) in DBVO_FIELDS.items()})
    out["AU-ZEITRAEUME"] = []
    for k in range(int(out["ANZAHL-AU"])):
        p = dbvo[32 + k * DBVO_PERIOD:32 + (k + 1) * DBVO_PERIOD]
        out["AU-ZEITRAEUME"].append([fmt(d(p[0:8])), fmt(d(p[8:16]))])
    out["DATUM-ERSTELLUNG"] = fmt(d(out["DATUM-ERSTELLUNG"]))
    out["AU-AB-AG"] = fmt(d(out["AU-AB-AG"]))
    return out


def chain(periods, current_start):
    """Prior AUs that belong in the 41: going back from the current AU, each gap <= 6 months (criterion aade0289)."""
    kept, nxt = [], current_start
    for start, end in sorted(periods, key=lambda p: d(p[1]), reverse=True):
        if add_months(d(end), 6) < nxt:
            break
        kept.append([start, end])
        nxt = d(start)
    return kept


def finding(fid, rule, source, expected, actual, status=None, reason=None, criterion_id=None):
    f = {"id": fid}
    if criterion_id:
        f["criterion_id"] = criterion_id
    f.update(rule=rule, source=source, expected=expected, actual=actual,
             status=status or ("PASS" if expected == actual else "MISMATCH"))
    if reason:
        f["reason"] = reason
    return f


def dbvo_findings(scenario, obs):
    cur = d(scenario["current_au"]["start"])
    prior = [[p["start"], p["end"]] for p in scenario["prior_au"]]
    exp_chain = chain(prior, cur)
    file_periods = obs["AU-ZEITRAEUME"]
    au_start = d(obs["AU-AB-AG"])
    last_end = max(d(e) for _, e in file_periods) if file_periods else None
    f = [
        finding("F1", "Abgabegrund = 41", "VB 13.4 §3.1.18 p.43", "41", obs["ABGABEGRUND"]),
        finding("F2", "ANZAHL-AU = number of prior AUs to report", "VB 13.4 §3.12.6 p.139",
                f"{len(exp_chain):02d}", obs["ANZAHL-AU"]),
        finding("F3", "Reported prior AU periods (order-independent)", "VB 13.4 §3.12.7/3.12.8 p.140-141",
                sorted(exp_chain), sorted(file_periods)),
        finding("F4", "Employer sends KZ-AK-AU = 0 (Grundstellung)", "VB 13.4 §3.12.4 p.138", "0", obs["KZ-AK-AU"]),
        finding("C9", "41 only if current AU and >=1 prior AU are certified", "SRC-CRIT; VB 13.4 §3.12 p.135",
                True, None, "NOT EVALUATED", "certificate status is not contained in the message",
                "f41c7278-b5a5-4ec3-b321-39bca5c3aeeb"),
    ]
    if last_end:
        gap = (au_start - last_end).days
        f.append(finding("C10", "<= 6 months between start of current AU and end of last prior AU",
                         "SRC-CRIT; VB 13.4 §3.12 p.135", "<= 6 months",
                         f"{gap} days ({fmt(last_end)} -> {fmt(au_start)})",
                         "PASS" if au_start <= add_months(last_end, 6) else "MISMATCH",
                         criterion_id="0cefe80e-4fd9-41e1-be4f-3ae1ecbde646"))
    else:
        f.append(finding("C10", "<= 6 months to last prior AU", "SRC-CRIT", "<= 6 months", None, "MISMATCH",
                         "no prior AU in the 41", "0cefe80e-4fd9-41e1-be4f-3ae1ecbde646"))
    f.append(finding("C11", "Prior AUs included only if each gap <= 6 months", "SRC-CRIT; VB 13.4 §3.12 p.135",
                     len(file_periods), len(chain(file_periods, au_start)),
                     criterion_id="aade0289-e8f9-4e12-9c49-464cf6cd0789"))
    msg_date = d(obs["DATUM-ERSTELLUNG"])
    prior_days = sum((d(e) - d(s)).days + 1 for s, e in file_periods)
    if msg_date < au_start:
        f.append(finding("C12", "Prior AUs + current AU >= 30 days at time of message", "SRC-CRIT; VB 13.4 §3.12 p.135",
                         ">= 30", f"{prior_days} prior + current (reference date unclear)", "NOT EVALUATED",
                         f"message date {fmt(msg_date)} is before AU start {fmt(au_start)}",
                         "9c8c9b58-4d0f-4066-98ac-973095418d63"))
    else:
        total = prior_days + (msg_date - au_start).days + 1
        f.append(finding("C12", "Prior AUs + current AU >= 30 days at time of message", "SRC-CRIT; VB 13.4 §3.12 p.135",
                         ">= 30", total, "PASS" if total >= 30 else "MISMATCH",
                         criterion_id="9c8c9b58-4d0f-4066-98ac-973095418d63"))
    return f


def flow_findings(case, checker_dir):
    """C1-C8 from Fares' comparator (checker/checks.py); FAIL is reported as MISMATCH."""
    try:
        sys.path.insert(0, str(checker_dir))
        from checks import run_checks
    except ImportError:
        return [finding(f"C{i}", "message flow check", "checker/checks.py", None, None, "NOT EVALUATED",
                        f"checker not found in {checker_dir}") for i in range(1, 9)]
    status_map = {"PASS": "PASS", "MISMATCH": "MISMATCH", "NOT_EVALUATED": "NOT EVALUATED", "NOT EVALUATED": "NOT EVALUATED"}
    return [finding(r["id"], r["rule"], r["source"], r["expected"], r["actual"],
                    status_map.get(r["status"], "MISMATCH"), r.get("reason")) for r in run_checks(case)]


def robustness(case):
    try:
        from attacks import mutations, evaluate
    except ImportError:
        return {"result": "NOT EVALUATED", "reason": "checker/attacks.py not found", "attacks": []}
    baseline, _ = evaluate(copy.deepcopy(case))
    rows = []
    for kind, name, fn in mutations():
        c = copy.deepcopy(case)
        fn(c)
        status, failed = evaluate(c)
        rows.append({"kind": kind, "attack": name, "result": status, "failed_checks": failed})
    stopped = sum(r["result"] in ("CAUGHT", "BLOCKED") for r in rows)
    return {"tool": "checker/attacks.py", "baseline": "no false alarm" if baseline == "MISSED" else f"FALSE ALARM ({baseline})",
            "result": f"{stopped}/{len(rows)} stopped", "attacks": rows}


def human(report):
    r, cnt = report["report"], report["report"]["counts"]
    short = lambda v: (json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v)[:12] if v is not None else "-"
    lines = [f"REVIEW REPORT {r['id']} – Abgabegrund 41 (DBVO) + message flow     Overall: {r['overall_status']}",
             f"Template: {r['template']}",
             f"Test data: {report['execution']['file']}   ID {report['execution']['observed']['DATENSATZ-ID']}",
             f"Test case: {report['test_case']['source']}",
             f"Result: {cnt['PASS']} PASS · {cnt['MISMATCH']} MISMATCH · {cnt['NOT EVALUATED']} NOT EVALUATED",
             "-" * 79,
             f"{'ID':4} {'Check':38} {'Expected':12} {'Actual':12} {'Status':15} Source"]
    for f in report["findings"]:
        lines.append(f"{f['id']:4} {f['rule'][:38]:38} {short(f['expected']):12} {short(f['actual']):12} "
                     f"{f['status']:15} {f['source'][:24]}")
    rb = report["robustness"]
    lines += ["-" * 79, f"Robustness: {rb['result']} · baseline {rb.get('baseline', '-')}",
              f"Reviewer: {report['review']['decision']}        Trace: {report['trace_url'] or 'tracing off'}"]
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--case", default=str(ROOT / "data" / "case_correct.json"))
    ap.add_argument("--teel0", default=str(ROOT / "ITSG Files" / "TEEL0-Test1-DBVO"))
    ap.add_argument("--checker-dir", default=str(ROOT / "checker"))
    ap.add_argument("--public", action="store_true", help="make the Langfuse trace viewable by link")
    args = ap.parse_args()

    load_env(ROOT / ".env")
    lf = None
    if os.environ.get("LANGFUSE_PUBLIC_KEY") and os.environ.get("LANGFUSE_SECRET_KEY"):
        from langfuse import get_client
        lf = get_client()
    span = (lambda **kw: lf.start_as_current_span(**kw)) if lf else (lambda **kw: contextlib.nullcontext())

    report_id = "RPT-" + datetime.now().strftime("%Y%m%d-%H%M%S")
    case = json.loads(Path(args.case).read_text(encoding="utf-8-sig"))
    with span(name="review-run", input={"case": args.case, "teel0": args.teel0}):
        if lf:
            lf.update_current_trace(name="review-run", tags=["Team10", "Abgabegrund-41", "DBVO"], public=args.public,
                                    metadata={"report_id": report_id, "test_case": case.get("source")})
        with span(name="load_test_case", input=args.case, output={"scenario": case["scenario"], "messages": len(case["messages"])}):
            pass
        observed = parse_teel0(args.teel0)
        with span(name="parse_teel0", input=args.teel0, output=observed):
            pass
        findings = dbvo_findings(case["scenario"], observed) + flow_findings(case, args.checker_dir)
        with span(name="checks", output={"total": len(findings)}):
            for f in findings:
                with span(name=f"check {f['id']}", input={"rule": f["rule"], "source": f["source"], "expected": f["expected"]},
                          output={"actual": f["actual"], "status": f["status"], "reason": f.get("reason")},
                          level="DEFAULT" if f["status"] == "PASS" else "WARNING"):
                    pass
        rb = robustness(case)
        with span(name="attacks", output=rb):
            pass

        counts = {s: sum(f["status"] == s for f in findings) for s in ("PASS", "MISMATCH", "NOT EVALUATED")}
        overall = "MISMATCH" if counts["MISMATCH"] else "NOT EVALUATED" if counts["NOT EVALUATED"] else "PASS"
        trace_url = lf.get_trace_url(trace_id=lf.get_current_trace_id()) if lf else None
        report = {
            "report": {"id": report_id, "created_at": datetime.now().strftime("%d.%m.%Y %H:%M"),
                       "scope": "DTA EEL – Abgabegrund 41 (DBVO) + message flow 41→61→01→61→88→01→62",
                       "template": "SYNTHETIC – no official ITSG report form found; no compliance claim",
                       "overall_status": overall, "counts": counts},
            "test_case": {"id": "TC-1", "source": case.get("source", args.case), "inputs": case["scenario"]},
            "execution": {"id": "RUN-" + report_id[4:], "file": Path(args.teel0).name, "observed": observed,
                          "observed_sources": {"message_1_41": "TEEL0 file (software output)",
                                               "messages_2_to_7": "test case ID table (reference flow)"}},
            "findings": findings,
            "robustness": rb,
            "review": {"reviewer": None, "decision": "pending", "timestamp": None},
            "trace_url": trace_url,
        }
        with span(name="report", output=report):
            pass
        if lf:
            lf.update_current_trace(output={"overall_status": overall, "counts": counts, "robustness": rb["result"]})

    if lf:
        lf.flush()
    out = ROOT / "reports" / f"{report_id}.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(human(report))
    print(f"\nSaved: {out}")


if __name__ == "__main__":
    main()
