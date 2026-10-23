"""
Re-runs the per-question and interview-level evaluation on existing interview
recordings WITHOUT writing anything to the database, and saves the output to
a JSON file, so before/after changes to the evaluation logic can be compared
on the same real recordings.

The stored ASR transcript of each answer is reused (so speech recognition
variability does not affect the comparison); facial, delivery,
confidence/stress and aggregation logic run fresh from the media files.

    python compare_evaluation.py --label before --out before.json  <interview_id>[@local|@atlas] ...
    python compare_evaluation.py --diff before.json after.json

Read-only: media files and database records are never modified.
"""
import argparse
import json
import os
import sys


def _load_interview(iid: str, target: str):
    from pymongo import MongoClient
    from bson import ObjectId
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
    uri = os.getenv("LOCAL_MONGO_URI", "mongodb://127.0.0.1:27017") if target == "local" else os.getenv("MONGO_URI")
    db = MongoClient(uri, serverSelectionTimeoutMS=20000)[os.getenv("DATABASE_NAME", "mockai")]
    return db.interviews.find_one({"_id": ObjectId(iid)})


def run(ids, label, out):
    from services.question_evaluator import evaluate_question_response
    from services.aggregate_evaluator import aggregate_interview_evaluation

    report = {"label": label, "interviews": {}}
    for spec in ids:
        iid, _, target = spec.partition("@")
        iv = _load_interview(iid, target or "atlas")
        if not iv:
            print(f"[skip] {spec}: not found")
            continue
        stored = {q.get("question_id"): q for q in (iv.get("evaluation") or {}).get("per_question") or []}
        responses = {r.get("question_id"): r for r in iv.get("responses", [])}
        per_q = []
        for q in iv.get("questions", []):
            qid = q.get("question_id")
            resp = responses.get(qid)
            transcript = ((stored.get(qid) or {}).get("asr") or {}).get("transcript")
            res = evaluate_question_response(
                question_id=qid,
                question_text=q.get("question_text") or "",
                difficulty=q.get("difficulty", "Medium"),
                transcript=transcript if resp else None,
                duration_seconds=resp.get("duration_seconds") if resp else None,
                media_url=resp.get("media_url") if resp else None,
                asr_status=((stored.get(qid) or {}).get("asr") or {}).get("status") if resp else None,
                response_mode=(resp or {}).get("response_mode") or "spoken",
            )
            per_q.append(res)
        agg = aggregate_interview_evaluation(per_q)
        rows = []
        for res in per_q:
            f = res.get("facial_analysis") or {}
            d = res.get("delivery") or {}
            cs = res.get("confidence_and_stress") or {}
            rows.append({
                "question": res["question_id"][-4:],
                "words": d.get("word_count"),
                "fluency": d.get("fluency_score"),
                "frames": f"{f.get('frames_with_face')}/{f.get('total_frames_sampled')}",
                "dominant": f.get("dominant_expression"),
                "indicators": f.get("behavioral_indicators"),
                "variability": (f.get("temporal_dynamics") or {}).get("expression_variability"),
                "confidence": [cs.get("confidence_score"), cs.get("confidence_level")],
                "stress": [cs.get("stress_score"), cs.get("stress_level")],
                "basis": cs.get("assessment_basis") or cs.get("rationale"),
            })
        report["interviews"][spec] = {
            "per_question": rows,
            "overall": {
                "score": agg.get("overall_score"),
                "confidence": [agg.get("confidence_score"), agg.get("confidence_level")],
                "stress": [agg.get("stress_score"), agg.get("stress_level")],
                "facial_summary": agg.get("facial_summary"),
            },
        }
        print(f"== {spec}: confidence {agg.get('confidence_score')} {agg.get('confidence_level')} | "
              f"stress {agg.get('stress_score')} {agg.get('stress_level')} | face {agg.get('facial_summary')}")
        for r in rows:
            print(f"   Q{r['question']} words={r['words']} frames={r['frames']} {r['dominant']} {r['indicators']} "
                  f"var={r['variability']} conf={r['confidence']} stress={r['stress']}")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, default=str)
    print(f"saved {out}")


def diff(a_path, b_path):
    a = json.load(open(a_path, encoding="utf-8"))
    b = json.load(open(b_path, encoding="utf-8"))
    for spec, av in a["interviews"].items():
        bv = b["interviews"].get(spec)
        if not bv:
            continue
        print(f"== {spec}")
        print(f"   overall confidence {av['overall']['confidence']} -> {bv['overall']['confidence']}")
        print(f"   overall stress     {av['overall']['stress']} -> {bv['overall']['stress']}")
        print(f"   facial summary     {av['overall']['facial_summary']} -> {bv['overall']['facial_summary']}")
        for ra, rb in zip(av["per_question"], bv["per_question"]):
            if ra["words"] is None and ra["frames"] in ("0/0", "None/None"):
                continue
            print(f"   Q{ra['question']}: conf {ra['confidence']} -> {rb['confidence']} | stress {ra['stress']} -> {rb['stress']} "
                  f"| indicators {ra['indicators']} -> {rb['indicators']}")


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    p = argparse.ArgumentParser()
    p.add_argument("ids", nargs="*")
    p.add_argument("--label", default="run")
    p.add_argument("--out", default="evaluation_run.json")
    p.add_argument("--diff", nargs=2, metavar=("BEFORE", "AFTER"))
    a = p.parse_args()
    if a.diff:
        diff(*a.diff)
    else:
        run(a.ids, a.label, a.out)
