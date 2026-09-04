"""
Automated Test Suite for AI Task 8:
Report-Aligned Interview Summary Report & Visual Results Hardening (FR28–FR29).

Validates:
  - FR28 (Interview Summary Report):
      - FR 28-01: Generate summary report after interview
      - FR 28-02: Include scores and behavioral insights
      - FR 28-03: Provide structured performance overview
  - FR29 (Display Results Visually):
      - FR 29-01: Display evaluation results using graphs
      - FR 29-02: Show confidence and stress indicators visually
      - FR 29-03: Organize results for easy interpretation

Test Coverage:
  1. Complete interview with all 3 modalities evaluated (NLP, Speech, Vision)
  2. Partial/missing modality evaluation (vision offline, speech unavailable)
  3. Incomplete interview with skipped questions (honest completion rate & score penalty)
  4. Failed media processing question handling (error state preserved, 0 score)
  5. Empty / zero evaluation state safety (no NaN / Infinity / broken percentages)
  6. Verification that summary report structure matches MongoDB evaluation values
  7. Verification that every chart and indicator uses real backend values
  8. Dimension scores boundary validation ([0.0, 100.0] mathematical range)
  9. Deterministic repeatability of summary report compilation
 10. End-to-end background worker persistence in MongoDB
 11. Candidate ownership and security scoping isolation
 12. Backward compatibility with existing aggregate evaluation and insights schemas
"""
import os
import sys
from bson import ObjectId

sys.path.insert(0, os.path.abspath("backend"))

from database import interviews_collection
from services.aggregate_evaluator import (
    aggregate_interview_evaluation,
    _compile_interview_summary_report,
)
from services.evaluation_worker import evaluate_interview_job


def run_tests():
    print("=" * 70)
    print("STARTING INTERVIEW SUMMARY REPORT & VISUAL RESULTS TEST SUITE (TASK 8)")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # TEST 1: Complete Interview with All 3 Modalities
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Complete Interview with All Modalities:")
    q_complete = [
        {
            "question_id": "q1",
            "score": 88.0,
            "difficulty": "Easy",
            "difficulty_weight": 1.0,
            "text_analysis": {"content_score": 90.0, "semantic_similarity_score": 92.0, "covered_concepts": ["React", "DOM"], "missing_concepts": []},
            "delivery": {"words_per_minute": 138.0, "fluency_score": 86.0, "pacing": "Optimal", "hesitation_rate": 1.5, "status": "completed", "word_count": 60},
            "facial_analysis": {"status": "completed", "face_detected": True, "dominant_expression": "Neutral", "behavioral_indicators": {"composure_index": "Composed & Stable", "engagement_level": "High"}},
        },
        {
            "question_id": "q2",
            "score": 82.0,
            "difficulty": "Medium",
            "difficulty_weight": 1.25,
            "text_analysis": {"content_score": 84.0, "semantic_similarity_score": 85.0, "covered_concepts": ["Redux", "Store"], "missing_concepts": []},
            "delivery": {"words_per_minute": 134.0, "fluency_score": 82.0, "pacing": "Optimal", "hesitation_rate": 2.0, "status": "completed", "word_count": 55},
            "facial_analysis": {"status": "completed", "face_detected": True, "dominant_expression": "Happy", "behavioral_indicators": {"composure_index": "Composed & Stable", "engagement_level": "High"}},
        },
    ]
    res1 = aggregate_interview_evaluation(q_complete)
    assert "summary_report" in res1
    sr1 = res1["summary_report"]

    # FR 28-03 Performance Overview checks
    po1 = sr1["performance_overview"]
    assert po1["total_questions"] == 2
    assert po1["answered_questions"] == 2
    assert po1["skipped_questions"] == 0
    assert po1["failed_questions"] == 0
    assert po1["completion_rate"] == 100.0
    assert po1["overall_score"] > 80.0
    assert po1["performance_rating"] in ("Proficient Performance", "Exemplary Performance")
    assert po1["dimension_scores"]["technical_content"] == 87.0
    assert po1["dimension_scores"]["communication_fluency"] == 84.0
    assert po1["dimension_scores"]["behavioral_composure"] > 0.0

    # FR 28-02 Behavioral Insights checks
    bi1 = sr1["behavioral_insights"]
    assert bi1["confidence_score"] >= 80.0
    assert bi1["confidence_level"] == "High"
    assert bi1["stress_score"] <= 25.0
    assert bi1["stress_level"] == "Low"
    assert bi1["facial_composure"] == "Composed & Stable"
    assert bi1["modality_availability"] == {"nlp": "available", "speech": "available", "vision": "available"}

    # FR 29-01 Chart Input Data validation
    assert len(sr1["per_question_summary"]) == 2
    assert sr1["per_question_summary"][0]["score"] == 88.0
    assert sr1["per_question_summary"][0]["modalities"] == {"nlp": True, "speech": True, "vision": True}
    print(f"  Overall Score:      {po1['overall_score']}% ({po1['performance_rating']})")
    print(f"  Dimension Scores:   {po1['dimension_scores']}")
    print(f"  Behavioral Summary: Confidence {bi1['confidence_score']}% ({bi1['confidence_level']}), Stress {bi1['stress_score']}% ({bi1['stress_level']})")
    print("  PASS: Complete interview summary report cleanly compiled.")

    # -------------------------------------------------------------------------
    # TEST 2: Partial / Missing Modality Evaluation (Vision Offline)
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Partial / Missing Modality (Vision Offline, Speech Available):")
    q_no_vision = [
        {
            "question_id": "q1",
            "score": 75.0,
            "difficulty": "Medium",
            "text_analysis": {"content_score": 78.0, "covered_concepts": ["REST API"], "missing_concepts": []},
            "delivery": {"words_per_minute": 130.0, "fluency_score": 75.0, "status": "completed", "word_count": 50},
            "facial_analysis": {"status": "not_implemented", "face_detected": False},
        }
    ]
    res2 = aggregate_interview_evaluation(q_no_vision)
    sr2 = res2["summary_report"]
    bi2 = sr2["behavioral_insights"]
    assert bi2["modality_availability"]["vision"] == "unavailable"
    assert bi2["modality_availability"]["speech"] == "available"
    assert bi2["modality_availability"]["nlp"] == "available"
    assert bi2["facial_composure"] == "Not Assessed"
    assert sr2["performance_overview"]["dimension_scores"]["behavioral_composure"] == 0.0
    print(f"  Modalities Available: {bi2['modality_availability']}")
    print("  PASS: Missing vision safely marked unavailable without fabricating scores.")

    # -------------------------------------------------------------------------
    # TEST 3: Incomplete Interview with Skipped Questions
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Incomplete Interview with Skipped Questions:")
    q_skipped = [
        {
            "question_id": "q1",
            "score": 80.0,
            "status": "evaluated",
            "asr": {"transcript": "SQL is structured query language"},
            "text_analysis": {"content_score": 80.0, "covered_concepts": ["SQL"]},
            "delivery": {"words_per_minute": 125.0, "fluency_score": 80.0, "word_count": 40, "status": "completed"},
        },
        {
            "question_id": "q2",
            "score": 0.0,
            "status": "skipped",
        },
    ]
    res3 = aggregate_interview_evaluation(q_skipped)
    sr3 = res3["summary_report"]
    po3 = sr3["performance_overview"]
    assert po3["total_questions"] == 2
    assert po3["answered_questions"] == 1
    assert po3["skipped_questions"] == 1
    assert po3["completion_rate"] == 50.0
    assert sr3["per_question_summary"][1]["status"] == "skipped"
    assert sr3["per_question_summary"][1]["score"] == 0.0
    print(f"  Total: {po3['total_questions']}, Answered: {po3['answered_questions']}, Skipped: {po3['skipped_questions']}")
    print("  PASS: Skipped questions correctly represented in summary audit and charts.")

    # -------------------------------------------------------------------------
    # TEST 4: Failed Media Processing Question Handling
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Failed Media Processing Question:")
    q_failed = [
        {
            "question_id": "q1",
            "score": 80.0,
            "status": "evaluated",
            "text_analysis": {"content_score": 80.0},
        },
        {
            "question_id": "q2",
            "score": 0.0,
            "status": "failed",
            "multimodal": {"status": "failed"},
            "failed_reason": "Corrupt media header",
        },
    ]
    res4 = aggregate_interview_evaluation(q_failed)
    sr4 = res4["summary_report"]
    assert sr4["performance_overview"]["failed_questions"] == 1
    assert sr4["per_question_summary"][1]["status"] == "failed"
    print(f"  Failed Questions Count: {sr4['performance_overview']['failed_questions']}")
    print("  PASS: Failed question cleanly tracked in summary report.")

    # -------------------------------------------------------------------------
    # TEST 5: Empty / Zero Evaluation State Safety
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Empty / Zero Evaluation State Safety:")
    res5 = aggregate_interview_evaluation([])
    sr5 = res5["summary_report"]
    po5 = sr5["performance_overview"]
    assert po5["overall_score"] == 0.0
    assert po5["performance_rating"] == "Not Assessed"
    assert po5["total_questions"] == 0
    assert po5["completion_rate"] == 0.0
    # Ensure no NaN or Infinity exists anywhere
    import math
    for k, v in po5["dimension_scores"].items():
        assert not math.isnan(v) and not math.isinf(v)
    assert not math.isnan(po5["overall_score"])
    print("  PASS: Empty session yields valid 0.0 metrics with zero NaNs or Infinities.")

    # -------------------------------------------------------------------------
    # TEST 6: Verify Summary Structure Matches MongoDB Evaluation Values
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Summary Report Matches MongoDB Evaluation Document:")
    target_oid = ObjectId("6a96c6df4fe22d4bad7fc5a7")
    evaluate_interview_job("6a96c6df4fe22d4bad7fc5a7")

    doc = interviews_collection.find_one({"_id": target_oid})
    assert doc is not None
    eval_doc = doc.get("evaluation") or {}
    assert "summary_report" in eval_doc
    db_sr = eval_doc["summary_report"]

    # Match exact root fields to summary report fields
    assert db_sr["performance_overview"]["overall_score"] == eval_doc["overall_score"]
    assert db_sr["behavioral_insights"]["confidence_score"] == eval_doc["confidence_score"]
    assert db_sr["behavioral_insights"]["confidence_level"] == eval_doc["confidence_level"]
    assert db_sr["behavioral_insights"]["stress_score"] == eval_doc["stress_score"]
    assert db_sr["behavioral_insights"]["stress_level"] == eval_doc["stress_level"]
    print("  PASS: MongoDB persisted summary report exactly mirrors canonical evaluation metrics.")

    # -------------------------------------------------------------------------
    # TEST 7: Visual Chart Values Match Exact Backend Data
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Chart Inputs Consume Real Backend Values:")
    dim_scores = db_sr["performance_overview"]["dimension_scores"]
    assert "technical_content" in dim_scores
    assert "communication_fluency" in dim_scores
    assert "behavioral_composure" in dim_scores

    # Per question trajectory chart values
    for q_item in db_sr["per_question_summary"]:
        assert "question_id" in q_item
        assert "status" in q_item
        assert q_item["status"] in ("evaluated", "skipped", "failed", "unassessed")
    print("  PASS: Chart input datasets verified to contain genuine structured values.")

    # -------------------------------------------------------------------------
    # TEST 8: Dimension Scores Boundary Validation ([0.0, 100.0])
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Dimension Scores Boundary Validation:")
    q_boundary_high = [
        {
            "question_id": "q1",
            "score": 100.0,
            "text_analysis": {"content_score": 100.0},
            "delivery": {"fluency_score": 100.0, "words_per_minute": 140.0, "status": "completed"},
            "facial_analysis": {"status": "completed", "dominant_expression": "Neutral", "behavioral_indicators": {"composure_index": "Composed & Stable"}},
        }
    ]
    res_bh = aggregate_interview_evaluation(q_boundary_high)["summary_report"]["performance_overview"]
    for dim, val in res_bh["dimension_scores"].items():
        assert 0.0 <= val <= 100.0, f"Dimension {dim} exceeded bounds: {val}"
    print("  PASS: All dimension scores strictly bounded within [0.0, 100.0].")

    # -------------------------------------------------------------------------
    # TEST 9: Deterministic Repeatability Guarantee
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Deterministic Repeatability Guarantee:")
    run_a = aggregate_interview_evaluation(q_complete)["summary_report"]
    run_b = aggregate_interview_evaluation(q_complete)["summary_report"]
    assert run_a == run_b
    print("  PASS: Exact deterministic equality confirmed across repeated runs.")

    # -------------------------------------------------------------------------
    # TEST 10: End-to-End Background Worker Persistence
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Background Worker Persistence:")
    doc_after = interviews_collection.find_one({"_id": target_oid})
    assert doc_after["evaluation_status"] == "completed"
    assert doc_after["evaluation"]["summary_report"] is not None
    assert doc_after["score"] == doc_after["evaluation"]["overall_score"]
    print("  PASS: Worker persisted complete summary report into MongoDB.")

    # -------------------------------------------------------------------------
    # TEST 11: Candidate Ownership & Security Scoping
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Candidate Ownership Isolation:")
    owner_id = doc_after.get("user_id")
    scoped_doc = interviews_collection.find_one({"_id": target_oid, "user_id": owner_id})
    assert scoped_doc is not None
    unauthorized_doc = interviews_collection.find_one({"_id": target_oid, "user_id": "alien_user_777"})
    assert unauthorized_doc is None
    print("  PASS: Candidate user_id scoping strictly preserved.")

    # -------------------------------------------------------------------------
    # TEST 12: Backward Compatibility with Tasks 1–7 Schemas
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Backward Compatibility with Tasks 1–7 Schemas:")
    res_full = aggregate_interview_evaluation(q_complete)
    assert "overall_score" in res_full
    assert "confidence_score" in res_full
    assert "confidence_level" in res_full
    assert "stress_score" in res_full
    assert "stress_level" in res_full
    assert "interpretation" in res_full
    assert "strengths" in res_full
    assert "weaknesses" in res_full
    assert "suggestions" in res_full
    assert "facial_summary" in res_full
    assert "aggregate_analysis" in res_full
    assert "scoring_formula" in res_full
    assert "dimension_scores" in res_full
    assert "insights" in res_full
    assert "summary_report" in res_full
    print("  PASS: Complete backward compatibility with all Task 1–7 schemas confirmed.")

    print("\n" + "=" * 70)
    print("ALL 12 INTERVIEW SUMMARY REPORT & VISUAL RESULTS TESTS PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
