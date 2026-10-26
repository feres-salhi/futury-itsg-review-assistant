import json, sys
from datetime import datetime

EXPECTED = {
    "AZVU": "1234-5678-007",          # Testkonstellation, ID table
    "EFZ_Ende_final": "27.03.2026",   # Testkonstellation text: sick pay ends 27.03 after correction
}

def valid_date(s):
    try:
        datetime.strptime(s, "%d.%m.%Y")
        return True
    except (TypeError, ValueError):
        return False

def run_checks(case):
    m = case.get("messages", [])
    results = []

    def add(cid, rule, source, expected, actual):
        results.append({"id": cid, "rule": rule, "source": source,
                        "expected": expected, "actual": actual,
                        "status": "PASS" if expected == actual else "FAIL"})

    codes = [x.get("Abgabegrund") for x in m]
    ag01 = [i for i, x in enumerate(m) if x.get("Abgabegrund") == "01"]
    st88 = [i for i, x in enumerate(m) if x.get("Abgabegrund") == "88"]

    add("C1", "All messages use the same AZVU", "Testkonstellation, ID table",
        [EXPECTED["AZVU"]], sorted({str(x.get("AZVU")) for x in m}))

    add("C2", "Exactly one cancellation (88) is sent", "Testkonstellation, ID table",
        1, len(st88))

    add("C3", "The cancellation is flagged Stornierung = J", "GG EEL 13.1, section 2.5",
        "J", m[st88[0]].get("Stornierung") if st88 else None)

    first01 = m[ag01[0]].get("DSID") if ag01 else None
    add("C4", "88 points (DSID-UR) to the DSID of the first 01 message", "GG EEL 13.1, section 2.5",
        first01, m[st88[0]].get("DSID-UR") if st88 else None)

    add("C5", "A new 01 message is sent after the cancellation", "Testkonstellation text",
        True, bool(st88) and any(i > st88[0] for i in ag01))

    add("C6", "Final sick-pay end (EFZ) is 27.03.2026", "Testkonstellation text",
        EXPECTED["EFZ_Ende_final"], m[ag01[-1]].get("EFZ_Ende") if ag01 else None)

    add("C7", "Employer asks about prior illness (41) before sending 01", "Testkonstellation, ID table",
        True, "41" in codes and "01" in codes and codes.index("41") < codes.index("01"))

    date_fields = ["Beginn_12_Monatsfrist", "EFZ_Ende", "Ende_EEL"]
    dates = [x[f] for x in m for f in date_fields if f in x]
    add("C8", "All dates are real dates (DD.MM.YYYY)", "Verfahrensbeschreibung 13.4 (date format)",
        True, all(valid_date(d) for d in dates))

    return results

if __name__ == "__main__":
    path = sys.argv[1]
    with open(path, encoding="utf-8-sig") as f:
        case = json.load(f)
    results = run_checks(case)
    for r in results:
        print(f"[{r['status']}] {r['id']} {r['rule']}")
        if r["status"] == "FAIL":
            print(f"        expected: {r['expected']} | actual: {r['actual']}")
    passed = sum(r["status"] == "PASS" for r in results)
    print(f"\nScore: {passed}/{len(results)} checks passed")
    with open("data/results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
