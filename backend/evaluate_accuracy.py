"""
Accuracy evaluation for MockAI - Objective 7 of the FYP-I report
("Practical testing, user survey and accuracy testing").

Compares MockAI's automated scores against a human reference and reports
agreement (Pearson r, Spearman rho, mean absolute error, bias and the share
of scores within +/-10 points).

Two reference sources:

1. Candidate self-ratings collected by the in-app survey:
       python evaluate_accuracy.py --surveys

2. Expert / supervisor ratings in a CSV file (recommended for the FYP-II
   report). See docs/accuracy_ratings_template.csv. Columns:
       interview_id   - MongoDB id of the interview (required)
       question_id    - optional; if set, compares that question's score,
                        otherwise the interview's overall score
       human_score    - 0-100 rating given by the human rater (required)
       rater          - optional rater name, for per-rater agreement
   Run:
       python evaluate_accuracy.py --ratings path/to/ratings.csv [--out results.csv]

Read-only: never modifies any interview or survey.
"""
import argparse
import csv
import sys
from collections import defaultdict

from bson import ObjectId

from database import interviews_collection, surveys_collection
from services.accuracy_metrics import agreement_report


def _print_report(title: str, report: dict) -> None:
    print(f"\n{title}")
    print("-" * len(title))
    if report["n"] == 0:
        print("  No paired scores found.")
        return
    print(f"  Pairs (n):                 {report['n']}")
    print(f"  Pearson r:                 {report['pearson_r']}")
    print(f"  Spearman rho:              {report['spearman_rho']}")
    print(f"  Mean absolute error:       {report['mae']} points")
    print(f"  Bias (system - human):     {report['bias']} points")
    print(f"  Within +/-{int(report['tolerance'])} points:        {report['within_tolerance_pct']}%")
    if report["n"] < 10:
        print("  Note: fewer than 10 pairs - treat these figures as indicative only.")


def run_surveys() -> int:
    pairs = [
        (s.get("system_score"), s.get("self_rated_score"))
        for s in surveys_collection.find({"self_rated_score": {"$ne": None}})
    ]
    pairs = [(a, b) for a, b in pairs if isinstance(a, (int, float)) and isinstance(b, (int, float))]
    _print_report("MockAI score vs candidate self-rating (survey)", agreement_report(
        [a for a, _ in pairs], [b for _, b in pairs]
    ))
    return 0


def _system_score(interview: dict, question_id: str):
    evaluation = interview.get("evaluation") or {}
    if not question_id:
        return evaluation.get("overall_score", interview.get("score"))
    for q in evaluation.get("per_question") or []:
        if q.get("question_id") == question_id:
            return (q.get("multimodal") or {}).get("score", q.get("score"))
    return None


def run_ratings(path: str, out_path: str = None) -> int:
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if not (row.get("interview_id") or "").strip() or not (row.get("human_score") or "").strip():
                continue
            rows.append(row)
    if not rows:
        print("No usable rows found (need interview_id and human_score).")
        return 1

    cache = {}
    results = []
    for row in rows:
        iid = row["interview_id"].strip()
        qid = (row.get("question_id") or "").strip()
        if iid not in cache:
            try:
                cache[iid] = interviews_collection.find_one({"_id": ObjectId(iid)})
            except Exception:
                cache[iid] = None
        interview = cache[iid]
        system = _system_score(interview, qid) if interview else None
        results.append({
            "interview_id": iid,
            "question_id": qid,
            "rater": (row.get("rater") or "").strip() or "unspecified",
            "human_score": float(row["human_score"]),
            "system_score": system,
            "difference": round(system - float(row["human_score"]), 1) if isinstance(system, (int, float)) else None,
        })

    missing = [r for r in results if r["system_score"] is None]
    if missing:
        print(f"Warning: {len(missing)} row(s) had no evaluated system score and were skipped.")

    valid = [r for r in results if r["system_score"] is not None]
    _print_report("MockAI score vs human rating (all raters)", agreement_report(
        [r["system_score"] for r in valid], [r["human_score"] for r in valid]
    ))
    by_rater = defaultdict(list)
    for r in valid:
        by_rater[r["rater"]].append(r)
    if len(by_rater) > 1:
        for rater, items in sorted(by_rater.items()):
            _print_report(f"Rater: {rater}", agreement_report(
                [r["system_score"] for r in items], [r["human_score"] for r in items]
            ))

    if out_path:
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(results[0].keys()))
            writer.writeheader()
            writer.writerows(results)
        print(f"\nPer-row results written to {out_path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="MockAI accuracy evaluation (Objective 7)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--surveys", action="store_true", help="compare against candidate survey self-ratings")
    group.add_argument("--ratings", metavar="CSV", help="compare against human ratings in a CSV file")
    parser.add_argument("--out", metavar="CSV", help="write per-row results (with --ratings)")
    args = parser.parse_args()
    if args.surveys:
        return run_surveys()
    return run_ratings(args.ratings, args.out)


if __name__ == "__main__":
    sys.exit(main())
