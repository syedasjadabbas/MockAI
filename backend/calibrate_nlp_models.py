"""
Fits the similarity calibration used in services/nlp_analyzer.py
(SIMILARITY_CALIBRATION) for the report-profile DistilBERT encoder.

nlp_analyzer's score thresholds were tuned on MiniLM's cosine-similarity
scale. This script builds real (candidate answer, reference) pairs from
evaluated interviews in MongoDB - relevant pairs (answer vs its own
question's model answer / question) and irrelevant pairs (answer vs another
question's model answer) - encodes them with both models, and fits
    minilm_sim ~= slope * distilbert_sim + intercept
by least squares. Read-only.

Run (Python 3.11 env with the report packages):
    ../.venv311/Scripts/python.exe calibrate_nlp_models.py
"""
import random

from bson import ObjectId
from sentence_transformers import SentenceTransformer, util

from database import interviews_collection, questions_collection
from services.ai_profile import LITE_SENTENCE_MODEL, REPORT_SENTENCE_MODEL

random.seed(7)


def collect_pairs(limit_interviews: int = 300):
    q_cache = {}

    def question(qid):
        if qid not in q_cache:
            try:
                q_cache[qid] = questions_collection.find_one({"_id": ObjectId(qid)}) or {}
            except Exception:
                q_cache[qid] = {}
        return q_cache[qid]

    answers = []
    for iv in interviews_collection.find({"evaluation_status": "completed"}).limit(limit_interviews):
        for pq in (iv.get("evaluation") or {}).get("per_question") or []:
            transcript = ((pq.get("asr") or {}).get("transcript") or "").strip()
            if len(transcript.split()) < 4:
                continue
            q = question(pq.get("question_id"))
            if q.get("expected_answer"):
                answers.append((transcript, q["expected_answer"], q.get("question_text", "")))

    refs = [a[1] for a in answers]
    pairs = []
    for transcript, expected, qtext in answers:
        pairs.append((transcript, expected))
        if qtext:
            pairs.append((transcript, qtext))
        other = random.choice(refs)
        if other != expected:
            pairs.append((transcript, other))
    return pairs


def sims(model, pairs):
    a = model.encode([p[0] for p in pairs], convert_to_tensor=True, show_progress_bar=False)
    b = model.encode([p[1] for p in pairs], convert_to_tensor=True, show_progress_bar=False)
    return util.cos_sim(a, b).diagonal().tolist()


def main():
    pairs = collect_pairs()
    print(f"Pairs: {len(pairs)}")
    if len(pairs) < 20:
        print("Not enough evaluated answers to calibrate.")
        return
    x = sims(SentenceTransformer(REPORT_SENTENCE_MODEL), pairs)
    y = sims(SentenceTransformer(LITE_SENTENCE_MODEL), pairs)
    n = len(x)
    mx, my = sum(x) / n, sum(y) / n
    sxx = sum((v - mx) ** 2 for v in x)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    slope = sxy / sxx
    intercept = my - slope * mx
    ss_res = sum((b - (slope * a + intercept)) ** 2 for a, b in zip(x, y))
    ss_tot = sum((b - my) ** 2 for b in y)
    print(f"DistilBERT mean sim {mx:.3f} | MiniLM mean sim {my:.3f}")
    print(f"Fit: minilm = {slope:.4f} * distilbert + {intercept:.4f}   (R^2 = {1 - ss_res / ss_tot:.3f})")


if __name__ == "__main__":
    main()
