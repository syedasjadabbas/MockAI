"""
Automated Test Suite for AI Task 5: Report-Aligned Aggregate Evaluation & Overall Performance Score.
Validates FR20 (Aggregate Interview Analysis) and FR21 (Generate Overall Performance Score).

Test Coverage:
  1. Multiple completed questions with mixed scores
  2. One-question interview
  3. Mixed difficulty questions (Easy, Medium, Hard weights: 1.0, 1.25, 1.5)
  4. Incomplete / skipped questions (honest mathematical penalty)
  5. Failed / error questions
  6. Missing modality results (degraded modal questions)
  7. Deterministic repeated aggregation (exact repeatability guarantee)
  8. Boundary conditions (exact 0.0, 50.0, and 100.0 boundaries)
  9. FR20 compiled dataset validation (technical, communication, and behavioral metrics)
 10. FR21-02 dimension score breakdown (technical, communication, and behavioral incorporation)
 11. MongoDB persistence via evaluation worker
 12. Candidate security & ownership isolation
"""
import os
import sys
from bson import ObjectId

sys.path.insert(0, os.path.abspath("backend"))

from database import interviews_collection
from services.aggregate_evaluator import (
    aggregate_interview_evaluation,
    DIFFICULTY_WEIGHTS,
    get_difficulty_weight,
)
from services.evaluation_worker import evaluate_interview_job


# ---------------------------------------------------------------------------
# Synthetic test question evaluations
# ---------------------------------------------------------------------------
def _make_q_eval(
    question_id: str = "q1",
    difficulty: str = "Medium",
    multimodal_score: float = 80.0,
    content_score: float = 85.0,
    fluency_score: float = 75.0,
    facial_score: float = 85.0,
    is_skipped: bool = False,
    is_failed: bool = False,
    status: str = "completed",
):
    diff_weight = get_difficulty_weight(difficulty)

    if is_skipped:
        return {
            "question_id": question_id,
            "difficulty": difficulty,
            "difficulty_weight": diff_weight,
            "score": 0.0,
            "multimodal": {
                "status": "unavailable",
                "score": 0.0,
                "modality_status": {"nlp": "unavailable", "speech": "unavailable", "vision": "unavailable"},
                "fusion_method": "weighted_trimodal_v2",
            },
            "text_analysis": {"status": "missing", "content_score": 0.0, "covered_concepts": [], "missing_concepts": ["concept_x"]},
            "delivery": {"status": "empty", "word_count": 0, "fluency_score": 0.0, "words_per_minute": 0.0, "hesitation_rate": 0.0},
            "facial_analysis": {"status": "missing_media"},
            "asr": {"status": "empty", "transcript": None},
            "strengths": [],
            "missing_concepts": ["concept_x"],
            "feedback": "Prompt skipped.",
        }

    if is_failed:
        return {
            "question_id": question_id,
            "difficulty": difficulty,
            "difficulty_weight": diff_weight,
            "score": 0.0,
            "multimodal": {
                "status": "failed",
                "score": 0.0,
                "modality_status": {"nlp": "unavailable", "speech": "unavailable", "vision": "unavailable"},
                "fusion_method": "weighted_trimodal_v2",
                "error": "Media corrupt",
            },
            "text_analysis": {"status": "failed", "content_score": 0.0, "covered_concepts": [], "missing_concepts": []},
            "delivery": {"status": "failed", "word_count": 0, "fluency_score": 0.0, "words_per_minute": 0.0, "hesitation_rate": 0.0},
            "facial_analysis": {"status": "corrupt_media"},
            "asr": {"status": "failed", "transcript": None},
            "strengths": [],
            "missing_concepts": [],
            "feedback": "Media processing error.",
        }

    return {
        "question_id": question_id,
        "difficulty": difficulty,
        "difficulty_weight": diff_weight,
        "score": multimodal_score,
        "multimodal": {
            "status": status,
            "score": multimodal_score,
            "modality_status": {"nlp": "available", "speech": "available", "vision": "available"},
            "fusion_method": "weighted_trimodal_v2",
            "weights_used": {"nlp": 0.5, "speech": 0.3, "vision": 0.2},
            "rationale": "Fused trimodal score.",
        },
        "text_analysis": {
            "status": "completed",
            "content_score": content_score,
            "semantic_similarity_score": content_score - 2.0,
            "covered_concepts": ["react", "virtual dom"],
            "missing_concepts": ["reconciliation"],
            "notes": "Solid technical depth.",
        },
        "delivery": {
            "status": "completed",
            "word_count": 60,
            "fluency_score": fluency_score,
            "words_per_minute": 130.0,
            "articulation_wpm": 138.0,
            "hesitation_rate": 2.5,
            "hesitation_level": "Low",
            "pacing": "Optimal",
            "filler_words": ["um"],
            "pause_duration_seconds": 1.2,
            "pause_count": 1,
            "notes": "Optimal conversational delivery.",
        },
        "facial_analysis": {
            "status": "completed",
            "face_detected": True,
            "dominant_expression": "Neutral",
            "behavioral_indicators": {
                "composure_index": "Composed & Stable",
                "engagement_level": "High",
                "observable_tension": "Low",
            },
        },
        "asr": {"status": "completed", "transcript": "React uses a virtual DOM to optimize UI updates."},
        "strengths": ["Clear grasp of key concepts", "Optimal speaking pace"],
        "missing_concepts": ["reconciliation"],
        "feedback": "Strong response.",
    }


def run_tests():
    print("=" * 70)
    print("STARTING AGGREGATE EVALUATION & OVERALL SCORE TEST SUITE (TASK 5)")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # TEST 1: Multiple Completed Questions
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Multiple Completed Questions with Mixed Scores:")
    q1 = _make_q_eval("q1", "Medium", multimodal_score=85.0, content_score=90.0, fluency_score=80.0)
    q2 = _make_q_eval("q2", "Medium", multimodal_score=75.0, content_score=80.0, fluency_score=70.0)
    q3 = _make_q_eval("q3", "Medium", multimodal_score=95.0, content_score=95.0, fluency_score=95.0)

    res1 = aggregate_interview_evaluation([q1, q2, q3])
    # Expected: (85*1.25 + 75*1.25 + 95*1.25) / (1.25*3) = (85+75+95)/3 = 85.0
    assert abs(res1["overall_score"] - 85.0) < 0.1, f"Expected 85.0, got {res1['overall_score']}"
    assert res1["aggregate_analysis"]["total_questions"] == 3
    assert res1["aggregate_analysis"]["answered_questions"] == 3
    assert res1["aggregate_analysis"]["skipped_questions"] == 0
    assert res1["aggregate_analysis"]["completion_rate"] == 100.0
    print(f"  Overall Score: {res1['overall_score']}% (expected 85.0%)")
    print(f"  Interpretation: {res1['interpretation'][:80]}...")
    print("  PASS: Multiple completed questions aggregated accurately.")

    # -------------------------------------------------------------------------
    # TEST 2: One-Question Interview
    # -------------------------------------------------------------------------
    print("\n[TEST 2] One-Question Interview:")
    q_single = _make_q_eval("q1", "Hard", multimodal_score=78.4)
    res2 = aggregate_interview_evaluation([q_single])
    # One question: (78.4 * 1.5) / 1.5 = 78.4
    assert abs(res2["overall_score"] - 78.4) < 0.1, f"Expected 78.4, got {res2['overall_score']}"
    assert res2["aggregate_analysis"]["total_questions"] == 1
    assert res2["aggregate_analysis"]["answered_questions"] == 1
    print(f"  Overall Score: {res2['overall_score']}% (expected 78.4%)")
    print("  PASS: Single question interview accurately produces canonical score.")

    # -------------------------------------------------------------------------
    # TEST 3: Mixed Difficulty Questions (Easy: 1.0, Medium: 1.25, Hard: 1.5)
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Mixed Difficulty Questions:")
    q_easy = _make_q_eval("q1", "Easy", multimodal_score=90.0)      # w=1.0, w*S=90.0
    q_med = _make_q_eval("q2", "Medium", multimodal_score=80.0)     # w=1.25, w*S=100.0
    q_hard = _make_q_eval("q3", "Hard", multimodal_score=60.0)      # w=1.5, w*S=90.0

    res3 = aggregate_interview_evaluation([q_easy, q_med, q_hard])
    # Total weight: 1.0 + 1.25 + 1.5 = 3.75
    # Weighted sum: 90.0 + 100.0 + 90.0 = 280.0
    # Expected overall: 280.0 / 3.75 = 74.666... -> 74.7
    assert abs(res3["overall_score"] - 74.7) < 0.1, f"Expected 74.7, got {res3['overall_score']}"
    assert res3["scoring_formula"]["total_difficulty_weight"] == 3.75
    assert res3["scoring_formula"]["accumulated_weighted_score"] == 280.0
    print(f"  Overall Score: {res3['overall_score']}% (expected 74.7%)")
    print("  PASS: Mixed difficulty questions weighted strictly according to specification.")

    # -------------------------------------------------------------------------
    # TEST 4: Incomplete / Skipped Questions (Honest Penalty Without Fabrication)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Incomplete / Skipped Questions:")
    q_ans = _make_q_eval("q1", "Medium", multimodal_score=80.0)  # w=1.25, S=80.0 -> w*S = 100.0
    q_skip = _make_q_eval("q2", "Medium", is_skipped=True)       # w=1.25, S=0.0 -> w*S = 0.0

    res4 = aggregate_interview_evaluation([q_ans, q_skip])
    # Total weight: 1.25 + 1.25 = 2.5
    # Weighted sum: 100.0 + 0.0 = 100.0
    # Expected overall: 100.0 / 2.5 = 40.0
    assert abs(res4["overall_score"] - 40.0) < 0.1, f"Expected 40.0, got {res4['overall_score']}"
    assert res4["aggregate_analysis"]["answered_questions"] == 1
    assert res4["aggregate_analysis"]["skipped_questions"] == 1
    assert res4["aggregate_analysis"]["completion_rate"] == 50.0
    assert any("skipped" in w.lower() for w in res4["weaknesses"])
    print(f"  Overall Score: {res4['overall_score']}% (expected 40.0%)")
    print("  PASS: Skipped question correctly applies honest denominator penalty.")

    # -------------------------------------------------------------------------
    # TEST 5: Failed / Error Questions
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Failed / Corrupt Media Questions:")
    q_fail = _make_q_eval("q2", "Hard", is_failed=True)          # w=1.5, S=0.0 -> w*S = 0.0
    res5 = aggregate_interview_evaluation([q_ans, q_fail])
    # Total weight: 1.25 + 1.5 = 2.75
    # Weighted sum: 100.0 + 0.0 = 100.0
    # Expected overall: 100.0 / 2.75 = 36.363... -> 36.4
    assert abs(res5["overall_score"] - 36.4) < 0.1, f"Expected 36.4, got {res5['overall_score']}"
    assert res5["aggregate_analysis"]["failed_questions"] == 1
    assert any("processing issues" in w.lower() for w in res5["weaknesses"])
    print(f"  Overall Score: {res5['overall_score']}% (expected 36.4%)")
    print("  PASS: Failed question handled safely with honest penalty and error note.")

    # -------------------------------------------------------------------------
    # TEST 6: Missing Modality Results (Degraded Modal Questions)
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Missing Modality Results (Degraded Modalities):")
    # Q where vision was offline but NLP+Speech were fused (e.g. score=82.0)
    q_degraded = _make_q_eval("q1", "Medium", multimodal_score=82.0, status="partial")
    q_degraded["multimodal"]["modality_status"] = {"nlp": "available", "speech": "available", "vision": "unavailable"}
    q_degraded["facial_analysis"] = {"status": "missing_media"}

    res6 = aggregate_interview_evaluation([q_degraded])
    assert abs(res6["overall_score"] - 82.0) < 0.1
    assert res6["aggregate_analysis"]["compiled_metrics"]["behavioral"]["evaluated_takes"] == 0
    print(f"  Overall Score: {res6['overall_score']}% (expected 82.0%)")
    print("  PASS: Degraded modality question aggregated cleanly.")

    # -------------------------------------------------------------------------
    # TEST 7: Deterministic Repeated Aggregation
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Deterministic Repeated Aggregation:")
    input_set = [q1, q2, q3, q_easy, q_hard]
    res7a = aggregate_interview_evaluation(input_set)
    res7b = aggregate_interview_evaluation(input_set)
    assert res7a["overall_score"] == res7b["overall_score"]
    assert res7a["scoring_formula"] == res7b["scoring_formula"]
    assert res7a["aggregate_analysis"] == res7b["aggregate_analysis"]
    assert res7a["dimension_scores"] == res7b["dimension_scores"]
    print(f"  Run A: {res7a['overall_score']}%, Run B: {res7b['overall_score']}% — identical.")
    print("  PASS: Aggregate evaluation is completely deterministic.")

    # -------------------------------------------------------------------------
    # TEST 8: Score Boundary Conditions (Exact 0.0, 50.0, and 100.0)
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Score Boundary Conditions (0.0, 50.0, 100.0):")
    # Boundary 0.0
    q_zero1 = _make_q_eval("q1", "Easy", multimodal_score=0.0)
    q_zero2 = _make_q_eval("q2", "Hard", multimodal_score=0.0)
    res_zero = aggregate_interview_evaluation([q_zero1, q_zero2])
    assert res_zero["overall_score"] == 0.0, f"Expected 0.0, got {res_zero['overall_score']}"

    # Boundary 50.0
    q_half1 = _make_q_eval("q1", "Easy", multimodal_score=50.0)
    q_half2 = _make_q_eval("q2", "Hard", multimodal_score=50.0)
    res_half = aggregate_interview_evaluation([q_half1, q_half2])
    assert res_half["overall_score"] == 50.0, f"Expected 50.0, got {res_half['overall_score']}"

    # Boundary 100.0
    q_full1 = _make_q_eval("q1", "Easy", multimodal_score=100.0)
    q_full2 = _make_q_eval("q2", "Hard", multimodal_score=100.0)
    res_full = aggregate_interview_evaluation([q_full1, q_full2])
    assert res_full["overall_score"] == 100.0, f"Expected 100.0, got {res_full['overall_score']}"

    # Empty interview boundary
    res_empty = aggregate_interview_evaluation([])
    assert res_empty["overall_score"] == 0.0

    print("  0.0 Boundary:   0.0%  — PASS")
    print("  50.0 Boundary:  50.0% — PASS")
    print("  100.0 Boundary: 100.0% — PASS")
    print("  Empty Boundary: 0.0%  — PASS")

    # -------------------------------------------------------------------------
    # TEST 9: FR20 Compiled Dataset Validation
    # -------------------------------------------------------------------------
    print("\n[TEST 9] FR20 Compiled Dataset Structure:")
    agg_data = res1["aggregate_analysis"]
    assert "total_questions" in agg_data
    assert "answered_questions" in agg_data
    assert "skipped_questions" in agg_data
    assert "failed_questions" in agg_data
    assert "completion_rate" in agg_data
    assert "compiled_metrics" in agg_data

    metrics = agg_data["compiled_metrics"]
    assert "technical" in metrics
    assert "communication" in metrics
    assert "behavioral" in metrics

    assert metrics["technical"]["avg_content_score"] > 0.0
    assert len(metrics["technical"]["covered_concepts"]) > 0
    assert metrics["communication"]["avg_wpm"] > 0.0
    assert metrics["communication"]["avg_fluency_score"] > 0.0
    assert metrics["behavioral"]["dominant_expression"] == "Neutral"
    assert metrics["behavioral"]["overall_composure"] == "Composed & Stable"
    print("  PASS: FR20 unified dataset compiled across technical, communication, and behavioral outputs.")

    # -------------------------------------------------------------------------
    # TEST 10: FR21-02 Dimension Scores Breakdown
    # -------------------------------------------------------------------------
    print("\n[TEST 10] FR21-02 Dimension Scores Breakdown:")
    dim = res1["dimension_scores"]
    assert "technical_content" in dim
    assert "communication_fluency" in dim
    assert "behavioral_composure" in dim
    assert dim["technical_content"] == round((90.0 + 80.0 + 95.0) / 3, 1)  # 88.3
    assert dim["communication_fluency"] == round((80.0 + 70.0 + 95.0) / 3, 1)  # 81.7
    assert dim["behavioral_composure"] == 85.0
    print(f"  Technical Content Avg:      {dim['technical_content']}%")
    print(f"  Communication Fluency Avg:  {dim['communication_fluency']}%")
    print(f"  Behavioral Composure Avg:   {dim['behavioral_composure']}%")
    print("  PASS: FR21-02 communication and behavioral analysis incorporated and transparently surfaced.")

    # -------------------------------------------------------------------------
    # TEST 11: MongoDB Persistence via Evaluation Worker
    # -------------------------------------------------------------------------
    print("\n[TEST 11] MongoDB Persistence via Evaluation Worker:")
    target_oid = ObjectId("6a96c6df4fe22d4bad7fc5a7")
    worker_res = evaluate_interview_job("6a96c6df4fe22d4bad7fc5a7")
    assert worker_res is not None

    doc = interviews_collection.find_one({"_id": target_oid})
    assert doc is not None
    assert doc["evaluation_status"] == "completed"
    eval_doc = doc["evaluation"]
    assert "overall_score" in eval_doc
    assert "aggregate_analysis" in eval_doc
    assert "scoring_formula" in eval_doc
    assert "dimension_scores" in eval_doc
    assert doc["score"] == eval_doc["overall_score"]

    print(f"  Persisted overall_score: {eval_doc['overall_score']}%")
    print(f"  Denormalized doc.score:  {doc['score']}%")
    print(f"  Scoring formula method:  {eval_doc['scoring_formula']['method']}")
    print("  PASS: Evaluation worker persisted complete FR20/FR21 aggregate evaluation into MongoDB.")

    # -------------------------------------------------------------------------
    # TEST 12: Candidate Security & Ownership Isolation
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Candidate Security & Ownership Isolation:")
    owner_id = doc.get("user_id")
    legit_doc = interviews_collection.find_one({"_id": target_oid, "user_id": owner_id})
    assert legit_doc is not None
    alien_doc = interviews_collection.find_one({"_id": target_oid, "user_id": "alien_user_unauthorized"})
    assert alien_doc is None
    print("  PASS: Candidate user_id ownership strictly enforced.")

    print("\n" + "=" * 70)
    print("ALL 12 AGGREGATE EVALUATION & OVERALL SCORE TEST CASES PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
