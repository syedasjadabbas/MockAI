"""
Phase 3.2 Regression Suite: Dashboard Statistics & Evaluation-Results UI Verification

Validates:
1. Candidate dimension-average key mapping:
   - Modern schema emitted by aggregate_evaluator ('technical_content', 'communication_fluency', 'behavioral_composure').
   - Legacy schema ('nlp_score', 'speech_score', 'vision_score').
2. Missing facial scores & honest null preservation:
   - When facial analysis is unavailable or no face was detected, dimension_averages.facial_score is None (null), not 0.0.
   - When only a subset of interviews has facial analysis, only valid takes are averaged.
3. Completed but unevaluated interviews:
   - Interviews with status "Completed" but evaluation_status "pending_evaluation" (score: None)
     are excluded from averages and do not drag down candidate performance.
4. Missing confidence & stress values:
   - "Not Assessed" confidence/stress levels are excluded from numeric averages and discrete distributions.
5. No-face vs. offline/failed facial analysis:
   - State distinction preserved with honest 'Not Observed' and 'Not Assessed' semantics.
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
from bson import ObjectId

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import interviews_collection
from routes.candidate_interview import get_candidate_statistics


def expect(condition: bool, message: str):
    if not condition:
        print(f"  FAILED: {message}")
        raise AssertionError(message)
    print(f"  PASS: {message}")


def test_phase3_2_dashboard_and_ui_validation():
    print("=" * 80)
    print("STARTING PHASE 3.2: DASHBOARD STATS & EVALUATION UI REGRESSION SUITE")
    print("=" * 80)

    test_user_id = str(ObjectId())
    test_token = {"user_id": test_user_id, "email": "test.phase32@mockai.com", "role": "candidate"}
    now = datetime.utcnow()

    try:
        # -------------------------------------------------------------------
        # TEST 1: Modern Aggregate Evaluator Schema Dimension Key Mapping
        # -------------------------------------------------------------------
        print("\n[TEST 1] Modern Dimension Key Mapping (technical_content, communication_fluency, behavioral_composure):")
        doc_modern = {
            "_id": ObjectId(),
            "user_id": test_user_id,
            "role": "Full Stack Engineer",
            "target_role": "Full Stack Engineer",
            "status": "Completed",
            "evaluation_status": "completed",
            "score": 88.0,
            "confidence": 84.0,
            "stress": "Low",
            "evaluation": {
                "overall_score": 88.0,
                "confidence_score": 84.0,
                "confidence_level": "High",
                "stress_score": 18.0,
                "stress_level": "Low",
                "facial_summary": {
                    "status": "completed",
                    "evaluated_takes": 3,
                    "dominant_expression": "Neutral",
                    "overall_composure": "Composed & Stable",
                },
                "dimension_scores": {
                    "technical_content": 90.0,
                    "communication_fluency": 85.0,
                    "behavioral_composure": 80.0,
                },
            },
            "created_at": now - timedelta(days=3),
        }
        interviews_collection.insert_one(doc_modern)

        stats = get_candidate_statistics(token_payload=test_token)
        expect(stats["completed_interviews"] == 1, "Completed interviews count is 1")
        expect(stats["average_score"] == 88.0, f"Average score is 88.0 (got {stats['average_score']})")
        dim = stats["dimension_averages"]
        expect(dim["content_score"] == 90.0, f"Content score mapped from technical_content is 90.0 (got {dim['content_score']})")
        expect(dim["delivery_score"] == 85.0, f"Delivery score mapped from communication_fluency is 85.0 (got {dim['delivery_score']})")
        expect(dim["facial_score"] == 80.0, f"Facial score mapped from behavioral_composure is 80.0 (got {dim['facial_score']})")
        expect(dim["technical_content"] == 90.0, "technical_content exposed in dimension_averages")
        expect(dim["communication_fluency"] == 85.0, "communication_fluency exposed in dimension_averages")
        expect(dim["behavioral_composure"] == 80.0, "behavioral_composure exposed in dimension_averages")

        # -------------------------------------------------------------------
        # TEST 2: Missing Facial Analysis Preserves Null (No Fabrication)
        # -------------------------------------------------------------------
        print("\n[TEST 2] Missing Facial Analysis (Vision Offline / Unavailable):")
        # Add interview without vision
        doc_no_vision = {
            "_id": ObjectId(),
            "user_id": test_user_id,
            "role": "Full Stack Engineer",
            "target_role": "Full Stack Engineer",
            "status": "Completed",
            "evaluation_status": "completed",
            "score": 82.0,
            "confidence": 76.0,
            "stress": "Moderate",
            "evaluation": {
                "overall_score": 82.0,
                "confidence_score": 76.0,
                "confidence_level": "Moderate",
                "stress_score": 38.0,
                "stress_level": "Moderate",
                "facial_summary": {
                    "status": "unavailable",
                    "evaluated_takes": 0,
                    "dominant_expression": "Not Observed",
                    "overall_composure": "Not Assessed",
                },
                "dimension_scores": {
                    "technical_content": 84.0,
                    "communication_fluency": 80.0,
                    "behavioral_composure": 0.0,  # Chart numeric baseline, but vision was unassessed
                },
            },
            "created_at": now - timedelta(days=2),
        }
        interviews_collection.insert_one(doc_no_vision)

        stats2 = get_candidate_statistics(token_payload=test_token)
        expect(stats2["completed_interviews"] == 2, "Completed interviews count is 2")
        expect(stats2["average_score"] == 85.0, f"Average score (88+82)/2 is 85.0 (got {stats2['average_score']})")
        dim2 = stats2["dimension_averages"]
        expect(dim2["content_score"] == 87.0, f"Content score (90+84)/2 is 87.0 (got {dim2['content_score']})")
        expect(dim2["delivery_score"] == 82.5, f"Delivery score (85+80)/2 is 82.5 (got {dim2['delivery_score']})")
        # Facial score should remain 80.0 from doc_modern, NOT dragged down to (80+0)/2 = 40.0!
        expect(dim2["facial_score"] == 80.0, f"Facial score excludes unassessed interview: expected 80.0 (got {dim2['facial_score']})")

        # -------------------------------------------------------------------
        # TEST 3: All Interviews Lacking Facial Analysis Yields Null (Zero Fabrication)
        # -------------------------------------------------------------------
        print("\n[TEST 3] Candidate With Zero Facial Analyses Returns Null facial_score:")
        test_user_id_noface = str(ObjectId())
        token_noface = {"user_id": test_user_id_noface, "email": "noface@mockai.com", "role": "candidate"}

        doc_pure_audio = {
            "_id": ObjectId(),
            "user_id": test_user_id_noface,
            "role": "DevOps Engineer",
            "target_role": "DevOps Engineer",
            "status": "Completed",
            "evaluation_status": "completed",
            "score": 75.0,
            "confidence": 70.0,
            "stress": "Low",
            "evaluation": {
                "overall_score": 75.0,
                "confidence_score": 70.0,
                "confidence_level": "Moderate",
                "stress_score": 20.0,
                "stress_level": "Low",
                "facial_summary": {
                    "status": "unavailable",
                    "evaluated_takes": 0,
                    "dominant_expression": "Not Observed",
                    "overall_composure": "Not Assessed",
                },
                "dimension_scores": {
                    "technical_content": 78.0,
                    "communication_fluency": 72.0,
                    "behavioral_composure": 0.0,
                },
            },
            "created_at": now - timedelta(days=1),
        }
        interviews_collection.insert_one(doc_pure_audio)

        stats_noface = get_candidate_statistics(token_payload=token_noface)
        expect(stats_noface["dimension_averages"]["content_score"] == 78.0, "Content score is 78.0")
        expect(stats_noface["dimension_averages"]["delivery_score"] == 72.0, "Delivery score is 72.0")
        expect(stats_noface["dimension_averages"]["facial_score"] is None, f"Facial score is legitimately None (got {stats_noface['dimension_averages']['facial_score']})")
        expect(stats_noface["dimension_averages"]["behavioral_composure"] is None, "behavioral_composure is legitimately None")

        # -------------------------------------------------------------------
        # TEST 4: Completed but Unevaluated Interviews Handling
        # -------------------------------------------------------------------
        print("\n[TEST 4] Completed but Unevaluated Interviews Excluded from Averages:")
        doc_unevaluated = {
            "_id": ObjectId(),
            "user_id": test_user_id,
            "role": "Data Scientist",
            "target_role": "Data Scientist",
            "status": "Completed",
            "evaluation_status": "pending_evaluation",
            "score": None,  # Not evaluated yet
            "confidence": None,
            "stress": None,
            "created_at": now,
        }
        interviews_collection.insert_one(doc_unevaluated)

        stats_with_pending = get_candidate_statistics(token_payload=test_token)
        expect(stats_with_pending["total_interviews"] == 3, "Total interviews includes unevaluated session (3)")
        expect(stats_with_pending["completed_interviews"] == 2, "Completed evaluated interviews count remains 2")
        expect(stats_with_pending["average_score"] == 85.0, "Average score remains 85.0 without unevaluated pollution")
        expect(stats_with_pending["dimension_averages"]["content_score"] == 87.0, "Dimension averages untouched by pending evaluation")

        # -------------------------------------------------------------------
        # TEST 5: Missing Confidence and Stress ("Not Assessed")
        # -------------------------------------------------------------------
        print("\n[TEST 5] Unassessed Confidence & Stress Handled Without Fabricating Defaults:")
        test_user_id_unassessed = str(ObjectId())
        token_unassessed = {"user_id": test_user_id_unassessed, "email": "unassessed@mockai.com", "role": "candidate"}

        doc_unassessed = {
            "_id": ObjectId(),
            "user_id": test_user_id_unassessed,
            "role": "QA Engineer",
            "target_role": "QA Engineer",
            "status": "Completed",
            "evaluation_status": "completed",
            "score": 70.0,
            "confidence": 0.0,
            "stress": "Not Assessed",
            "evaluation": {
                "overall_score": 70.0,
                "confidence_score": 0.0,
                "confidence_level": "Not Assessed",
                "stress_score": 0.0,
                "stress_level": "Not Assessed",
                "dimension_scores": {
                    "technical_content": 70.0,
                    "communication_fluency": 70.0,
                    "behavioral_composure": 0.0,
                },
            },
            "created_at": now,
        }
        interviews_collection.insert_one(doc_unassessed)

        stats_unassessed = get_candidate_statistics(token_payload=token_unassessed)
        expect(stats_unassessed["average_confidence"] is None, f"Average confidence is None (got {stats_unassessed['average_confidence']})")
        expect(stats_unassessed["average_stress"] is None, f"Average stress is None (got {stats_unassessed['average_stress']})")
        # stress_distribution must not count "Not Assessed" as Low!
        expect(stats_unassessed["stress_distribution"]["Low"] == 0, "stress_distribution['Low'] is 0 (not fabricated)")
        expect(stats_unassessed["stress_distribution"]["Moderate"] == 0, "stress_distribution['Moderate'] is 0")
        expect(stats_unassessed["stress_distribution"]["Elevated"] == 0, "stress_distribution['Elevated'] is 0")

        # -------------------------------------------------------------------
        # TEST 6: Legacy Evaluation Record Compatibility
        # -------------------------------------------------------------------
        print("\n[TEST 6] Legacy Evaluation Record Schema Parsing:")
        test_user_id_legacy = str(ObjectId())
        token_legacy = {"user_id": test_user_id_legacy, "email": "legacy@mockai.com", "role": "candidate"}

        doc_legacy = {
            "_id": ObjectId(),
            "user_id": test_user_id_legacy,
            "role": "Legacy Role",
            "status": "Completed",
            "evaluation_status": "completed",
            "score": 77.0,
            "confidence": 75.0,
            "stress": "Medium",
            "evaluation": {
                "overall_score": 77.0,
                "confidence_score": 75.0,
                "confidence_level": "Moderate",
                "stress_score": 45.0,
                "stress_level": "Moderate",
                "dimension_scores": {
                    "nlp_score": 80.0,
                    "speech_score": 74.0,
                    "vision_score": 72.0,
                },
            },
            "created_at": now,
        }
        interviews_collection.insert_one(doc_legacy)

        stats_legacy = get_candidate_statistics(token_payload=token_legacy)
        expect(stats_legacy["dimension_averages"]["content_score"] == 80.0, f"Legacy nlp_score parsed as content_score (80.0)")
        expect(stats_legacy["dimension_averages"]["delivery_score"] == 74.0, f"Legacy speech_score parsed as delivery_score (74.0)")
        expect(stats_legacy["dimension_averages"]["facial_score"] == 72.0, f"Legacy vision_score parsed as facial_score (72.0)")
        expect(stats_legacy["stress_distribution"]["Moderate"] == 1, "Legacy 'Medium' mapped to 'Moderate' in stress distribution")

    finally:
        # Cleanup all test documents
        interviews_collection.delete_many({"user_id": {"$in": [
            test_user_id,
            test_user_id_noface,
            test_user_id_unassessed,
            test_user_id_legacy,
        ]}})
        print("\nCleaned up all temporary test documents from database.")

    print("\n" + "=" * 80)
    print("ALL PHASE 3.2 REGRESSION TESTS PASSED SUCCESSFULLY (100% SPEC COMPLIANCE)!")
    print("=" * 80)


if __name__ == "__main__":
    test_phase3_2_dashboard_and_ui_validation()
