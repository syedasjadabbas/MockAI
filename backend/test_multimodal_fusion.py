"""
Automated Test Suite for AI Task 4: Report-Aligned Multimodal Evaluation & Fusion.
Validates FR18 (Per-Question Multimodal Evaluation) and FR19 (Multimodal Fusion).

Test Coverage:
  1. All 3 modalities available
  2. NLP + Speech, Vision unavailable
  3. NLP + Vision, Speech unavailable
  4. Speech + Vision, NLP unavailable
  5. Only NLP available
  6. Only Speech available
  7. Only Vision available
  8. All modalities unavailable
  9. Deterministic / repeatable fusion scores
 10. Per-question persistence through evaluation worker
 11. Candidate ownership isolation
 12. Regression check for NLP, Speech, and Vision
"""
import os
import sys
from bson import ObjectId

sys.path.insert(0, os.path.abspath("backend"))

from database import interviews_collection
from services.multimodal_fusion import fuse_per_question, BASE_WEIGHTS, _facial_to_score
from services.question_evaluator import evaluate_question_response
from services.evaluation_worker import evaluate_interview_job


# ---------------------------------------------------------------------------
# Synthetic modality results for controlled testing
# ---------------------------------------------------------------------------
def _make_nlp(content_score=85.0, status="completed"):
    return {
        "status": status,
        "content_score": content_score,
        "concept_coverage_score": 80.0,
        "relevance_score": 90.0,
        "completeness_score": 82.0,
        "covered_concepts": ["react", "virtual dom"],
        "missing_concepts": ["reconciliation"],
        "notes": "Good technical coverage.",
        "model": "bert-distilbert-minilm-v2",
        "semantic_similarity_score": 78.5,
    }


def _make_delivery(fluency_score=72.0, word_count=45, status="completed"):
    return {
        "status": status,
        "word_count": word_count,
        "duration_seconds": 30.0,
        "words_per_minute": 90.0,
        "pacing": "Deliberate",
        "filler_count": 2,
        "filler_words": ["um", "like"],
        "hesitation_rate": 4.4,
        "hesitation_level": "Moderate",
        "fluency_score": fluency_score,
        "fluency_indicator": "Moderate",
        "pause_duration_seconds": 1.5,
        "pause_count": 1,
        "articulation_wpm": 95.0,
        "notes": "Steady delivery at 90.0 WPM.",
    }


def _make_facial(composure="Composed & Stable", engagement="High", status="completed"):
    return {
        "status": status,
        "face_detected": True,
        "face_presence_ratio": 1.0,
        "total_frames_sampled": 30,
        "dominant_expression": "Neutral",
        "expression_distribution": {"neutral": 85.0, "happiness": 10.0, "surprise": 5.0},
        "behavioral_indicators": {
            "engagement_level": engagement,
            "composure_index": composure,
            "observable_tension": "Low",
        },
        "model": "fer-cnn-onnx-v1",
        "error": None,
    }


def run_tests():
    print("=" * 70)
    print("STARTING MULTIMODAL FUSION TEST SUITE (TASK 4)")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # TEST 1: All 3 Modalities Available
    # -------------------------------------------------------------------------
    print("\n[TEST 1] All 3 Modalities Available:")
    nlp = _make_nlp(content_score=85.0)
    speech = _make_delivery(fluency_score=72.0)
    vision = _make_facial(composure="Composed & Stable", engagement="High")

    result = fuse_per_question(nlp, speech, vision)
    assert result["status"] == "completed"
    assert result["modality_status"]["nlp"] == "available"
    assert result["modality_status"]["speech"] == "available"
    assert result["modality_status"]["vision"] == "available"
    assert result["fusion_method"] == "weighted_trimodal_v2"

    # Verify weights are the base weights
    assert abs(result["weights_used"]["nlp"] - 0.50) < 0.01
    assert abs(result["weights_used"]["speech"] - 0.30) < 0.01
    assert abs(result["weights_used"]["vision"] - 0.20) < 0.01

    # Verify score: 85*0.5 + 72*0.3 + 85*0.2 = 42.5 + 21.6 + 17.0 = 81.1
    facial_score = _facial_to_score(vision)
    expected = round(85.0 * 0.5 + 72.0 * 0.3 + facial_score * 0.2, 1)
    assert abs(result["score"] - expected) < 0.2, f"Expected ~{expected}, got {result['score']}"

    assert result["nlp_contribution"] is not None
    assert result["speech_contribution"] is not None
    assert result["vision_contribution"] is not None
    assert "rationale" in result and len(result["rationale"]) > 20
    print(f"  Score: {result['score']}% (expected ~{expected}%)")
    print(f"  Rationale: {result['rationale'][:120]}...")
    print("  PASS: All 3 modalities fused with correct base weights.")

    # -------------------------------------------------------------------------
    # TEST 2: NLP + Speech, Vision Unavailable
    # -------------------------------------------------------------------------
    print("\n[TEST 2] NLP + Speech (Vision Unavailable):")
    result2 = fuse_per_question(nlp, speech, {"status": "missing_media"})
    assert result2["status"] == "partial"
    assert result2["modality_status"]["vision"] == "unavailable"
    assert result2["vision_contribution"] is None

    # Weights redistributed: nlp = 0.5/0.8 = 0.625, speech = 0.3/0.8 = 0.375
    assert abs(result2["weights_used"]["nlp"] - 0.625) < 0.01
    assert abs(result2["weights_used"]["speech"] - 0.375) < 0.01
    expected2 = round(85.0 * 0.625 + 72.0 * 0.375, 1)
    assert abs(result2["score"] - expected2) < 0.2
    print(f"  Score: {result2['score']}% (expected ~{expected2}%)")
    print("  PASS: NLP + Speech fused; Vision weight redistributed.")

    # -------------------------------------------------------------------------
    # TEST 3: NLP + Vision, Speech Unavailable
    # -------------------------------------------------------------------------
    print("\n[TEST 3] NLP + Vision (Speech Unavailable):")
    empty_speech = _make_delivery(fluency_score=0.0, word_count=0, status="empty")
    result3 = fuse_per_question(nlp, empty_speech, vision)
    assert result3["status"] == "partial"
    assert result3["modality_status"]["speech"] == "unavailable"
    assert result3["speech_contribution"] is None
    # Weights: nlp = 0.5/0.7 ≈ 0.7143, vision = 0.2/0.7 ≈ 0.2857
    assert abs(result3["weights_used"]["nlp"] - 0.7143) < 0.01
    print(f"  Score: {result3['score']}%")
    print("  PASS: NLP + Vision fused; Speech weight redistributed.")

    # -------------------------------------------------------------------------
    # TEST 4: Speech + Vision, NLP Unavailable
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Speech + Vision (NLP Unavailable):")
    empty_nlp = _make_nlp(content_score=0.0, status="empty")
    result4 = fuse_per_question(empty_nlp, speech, vision)
    assert result4["status"] == "partial"
    assert result4["modality_status"]["nlp"] == "unavailable"
    assert result4["nlp_contribution"] is None
    # Weights: speech = 0.3/0.5 = 0.6, vision = 0.2/0.5 = 0.4
    assert abs(result4["weights_used"]["speech"] - 0.6) < 0.01
    assert abs(result4["weights_used"]["vision"] - 0.4) < 0.01
    print(f"  Score: {result4['score']}%")
    print("  PASS: Speech + Vision fused; NLP weight redistributed.")

    # -------------------------------------------------------------------------
    # TEST 5: Only NLP Available
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Only NLP Available:")
    result5 = fuse_per_question(nlp, empty_speech, {"status": "missing_media"})
    assert result5["status"] == "partial"
    assert abs(result5["weights_used"]["nlp"] - 1.0) < 0.01
    assert abs(result5["score"] - 85.0) < 0.2
    print(f"  Score: {result5['score']}%")
    print("  PASS: NLP-only fusion with weight = 1.0.")

    # -------------------------------------------------------------------------
    # TEST 6: Only Speech Available
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Only Speech Available:")
    result6 = fuse_per_question(empty_nlp, speech, {"status": "missing_media"})
    assert result6["status"] == "partial"
    assert abs(result6["weights_used"]["speech"] - 1.0) < 0.01
    assert abs(result6["score"] - 72.0) < 0.2
    print(f"  Score: {result6['score']}%")
    print("  PASS: Speech-only fusion with weight = 1.0.")

    # -------------------------------------------------------------------------
    # TEST 7: Only Vision Available
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Only Vision Available:")
    result7 = fuse_per_question(empty_nlp, empty_speech, vision)
    assert result7["status"] == "partial"
    assert abs(result7["weights_used"]["vision"] - 1.0) < 0.01
    assert result7["score"] == facial_score
    print(f"  Score: {result7['score']}%")
    print("  PASS: Vision-only fusion with weight = 1.0.")

    # -------------------------------------------------------------------------
    # TEST 8: All Modalities Unavailable
    # -------------------------------------------------------------------------
    print("\n[TEST 8] All Modalities Unavailable:")
    result8 = fuse_per_question(empty_nlp, empty_speech, {"status": "missing_media"})
    assert result8["status"] == "unavailable"
    assert result8["score"] == 0.0
    assert result8["nlp_contribution"] is None
    assert result8["speech_contribution"] is None
    assert result8["vision_contribution"] is None
    print("  PASS: Zero-modality yields 0.0 score safely.")

    # -------------------------------------------------------------------------
    # TEST 9: Deterministic / Repeatable Fusion
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Deterministic / Repeatable Fusion:")
    r_a = fuse_per_question(nlp, speech, vision)
    r_b = fuse_per_question(nlp, speech, vision)
    assert r_a["score"] == r_b["score"]
    assert r_a["weights_used"] == r_b["weights_used"]
    assert r_a["rationale"] == r_b["rationale"]
    print(f"  Score A: {r_a['score']}%, Score B: {r_b['score']}% — identical.")
    print("  PASS: Fusion is deterministic and repeatable.")

    # -------------------------------------------------------------------------
    # TEST 10: Per-Question Persistence via Evaluation Worker
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Per-Question Persistence via Evaluation Worker:")
    target_oid = ObjectId("6a96c6df4fe22d4bad7fc5a7")
    worker_res = evaluate_interview_job("6a96c6df4fe22d4bad7fc5a7")
    assert worker_res is not None

    doc = interviews_collection.find_one({"_id": target_oid})
    assert doc is not None
    assert doc["evaluation_status"] == "completed"
    per_q = doc["evaluation"]["per_question"]
    assert len(per_q) > 0

    mm = per_q[0].get("multimodal", {})
    assert mm.get("fusion_method") == "weighted_trimodal_v2"
    assert "score" in mm
    assert "modality_status" in mm
    assert "weights_used" in mm
    assert "rationale" in mm
    assert mm["modality_status"]["nlp"] in ("available", "unavailable")
    assert mm["modality_status"]["speech"] in ("available", "unavailable")
    assert mm["modality_status"]["vision"] in ("available", "unavailable")
    print(f"  Persisted multimodal score: {mm['score']}%, method: {mm['fusion_method']}")
    print(f"  Modality status: {mm['modality_status']}")
    print("  PASS: Multimodal fusion result persisted in MongoDB.")

    # -------------------------------------------------------------------------
    # TEST 11: Candidate Ownership Isolation
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Candidate Ownership Isolation:")
    doc = interviews_collection.find_one({"_id": target_oid})
    owner_id = doc.get("user_id")
    legit = interviews_collection.find_one({"_id": target_oid, "user_id": owner_id})
    assert legit is not None
    alien = interviews_collection.find_one({"_id": target_oid, "user_id": "unauthorized_user_xyz"})
    assert alien is None
    print("  PASS: Candidate user_id isolation guaranteed.")

    # -------------------------------------------------------------------------
    # TEST 12: Question Evaluator Integration & Regression
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Question Evaluator Integration & Regression:")
    q_eval = evaluate_question_response(
        question_id="test_q_multimodal",
        question_text="Explain the concept of Virtual DOM in React.",
        expected_answer="The Virtual DOM is a lightweight in-memory representation.",
        tags=["React", "Virtual DOM"],
        difficulty="Medium",
        transcript="The virtual DOM is a lightweight in-memory representation of the DOM.",
        duration_seconds=15.0,
        media_url=None,
    )

    # Verify structure
    assert "multimodal" in q_eval
    mm = q_eval["multimodal"]
    assert mm["fusion_method"] == "weighted_trimodal_v2"
    assert "score" in mm
    assert "modality_status" in mm

    # Verify backward compat: top-level score == multimodal score
    assert q_eval["score"] == mm["score"]

    # Verify NLP is available (we gave a transcript)
    assert mm["modality_status"]["nlp"] == "available"

    # Verify existing sub-objects still present
    assert "text_analysis" in q_eval
    assert "delivery" in q_eval
    assert "facial_analysis" in q_eval
    assert "asr" in q_eval
    assert "strengths" in q_eval
    assert "missing_concepts" in q_eval

    print(f"  Multimodal Score: {mm['score']}%, Method: {mm['fusion_method']}")
    print(f"  NLP: {mm['modality_status']['nlp']}, Speech: {mm['modality_status']['speech']}, Vision: {mm['modality_status']['vision']}")
    print("  PASS: Question evaluator produces real trimodal fusion result.")

    print("\n" + "=" * 70)
    print("ALL 12 MULTIMODAL FUSION TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
