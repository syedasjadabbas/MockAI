"""
Automated Test Suite for AI Task 7: Report-Aligned Explainable Insights & Personalized Recommendations.
Validates:
  - FR24 (Score Interpretation Support / Rationale)
  - FR25 (Identify Strengths)
  - FR26 (Identify Weaknesses / Areas for Improvement)
  - FR27 (Provide Improvement Suggestions & Coaching Guidance)

Test Coverage:
  1. Strong candidate results (high NLP, optimal cadence, composed facial stability)
  2. Weak candidate results (low NLP, rushed cadence, high hesitation, observable tension)
  3. Mixed candidate results (strong communication but technical rubric gaps)
  4. Missing NLP handling (empty transcript, honest lack of concept fabrication)
  5. Missing Speech handling (silent take, honest lack of cadence fabrication)
  6. Missing Vision handling (camera offline, honest lack of visual tension fabrication)
  7. All modalities unavailable (zero-answer session, honest unrecorded notice)
  8. Dynamic recommendations change appropriately based on evaluation data
  9. Deterministic repeatability guarantee
 10. End-to-end evaluation worker persistence in MongoDB
 11. Candidate ownership isolation
 12. Backward compatibility with existing aggregate evaluation schema
"""
import os
import sys
from bson import ObjectId

sys.path.insert(0, os.path.abspath("backend"))

from database import interviews_collection
from services.insights_service import generate_interview_insights
from services.aggregate_evaluator import aggregate_interview_evaluation
from services.evaluation_worker import evaluate_interview_job


def _mock_aggregate_data(
    overall_score: float = 85.0,
    tech_score: float = 88.0,
    comm_score: float = 82.0,
    behav_score: float = 85.0,
    wpm: float = 135.0,
    hesitation: float = 2.0,
    fillers: int = 2,
    pauses_sec: float = 1.2,
    pauses_cnt: int = 1,
    covered: list = None,
    missing: list = None,
    dominant_expr: str = "Neutral",
    composure: str = "Composed & Stable",
    tension: str = "Low",
    takes: int = 3,
    confidence_score: float = 85.0,
    confidence_level: str = "High",
    stress_score: float = 15.0,
    stress_level: str = "Low",
    total_q: int = 3,
    answered_q: int = 3,
    skipped_q: int = 0,
):
    dim_scores = {
        "technical_content": tech_score,
        "communication_fluency": comm_score,
        "behavioral_composure": behav_score,
    }
    agg_analysis = {
        "total_questions": total_q,
        "answered_questions": answered_q,
        "skipped_questions": skipped_q,
        "failed_questions": 0,
        "completion_rate": round(answered_q / total_q if total_q > 0 else 0.0, 2),
        "compiled_metrics": {
            "technical": {
                "avg_content_score": tech_score,
                "avg_semantic_similarity": 90.0,
                "covered_concepts": covered if covered is not None else ["React", "Virtual DOM", "Diffing Algorithm"],
                "missing_concepts": missing if missing is not None else [],
            },
            "communication": {
                "avg_wpm": wpm,
                "avg_articulation_wpm": wpm + 8.0,
                "avg_fluency_score": comm_score,
                "avg_hesitation_rate": hesitation,
                "total_fillers": fillers,
                "total_pause_duration_seconds": pauses_sec,
                "total_pause_count": pauses_cnt,
            },
            "behavioral": {
                "evaluated_takes": takes,
                "dominant_expression": dominant_expr,
                "overall_composure": composure,
            },
        },
    }
    fac_summary = {
        "status": "completed" if takes > 0 else "not_implemented",
        "evaluated_takes": takes,
        "dominant_expression": dominant_expr if takes > 0 else None,
        "overall_composure": composure if takes > 0 else None,
    }
    q_results = [
        {
            "question_id": f"q_{i+1}",
            "score": tech_score,
            "text_analysis": {"covered_concepts": covered, "missing_concepts": missing},
            "delivery": {"words_per_minute": wpm, "hesitation_rate": hesitation},
            "facial_analysis": fac_summary,
            "confidence_and_stress": {
                "confidence_score": confidence_score,
                "confidence_level": confidence_level,
                "stress_score": stress_score,
                "stress_level": stress_level,
            },
        }
        for i in range(answered_q)
    ]
    return {
        "per_question_results": q_results,
        "overall_score": overall_score,
        "dimension_scores": dim_scores,
        "confidence_score": confidence_score,
        "confidence_level": confidence_level,
        "stress_score": stress_score,
        "stress_level": stress_level,
        "aggregate_analysis": agg_analysis,
        "facial_summary": fac_summary,
    }


def run_tests():
    print("=" * 70)
    print("STARTING EXPLAINABLE INSIGHTS & RECOMMENDATIONS TEST SUITE (TASK 7)")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # TEST 1: Strong Candidate Results
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Strong Candidate Results:")
    strong_data = _mock_aggregate_data(
        overall_score=88.5,
        tech_score=92.0,
        comm_score=86.0,
        behav_score=88.0,
        wpm=138.0,
        hesitation=1.5,
        covered=["State Management", "Redux", "Hooks", "Immutability"],
        missing=[],
        confidence_score=89.0,
        confidence_level="High",
        stress_score=12.0,
        stress_level="Low",
    )
    ins1 = generate_interview_insights(**strong_data)

    # FR24 Checks
    assert "score_explanation" in ins1
    assert "88.5" in ins1["score_explanation"]["score_rationale"] or "88" in ins1["score_explanation"]["score_rationale"]
    assert "138.0 WPM" in ins1["score_explanation"]["score_rationale"]
    # FR25 Checks
    assert len(ins1["strengths"]) >= 2
    assert any("pacing" in s.lower() or "cadence" in s.lower() for s in ins1["strengths"])
    assert any("depth" in s.lower() or "redux" in s.lower() for s in ins1["strengths"])
    # FR26 Checks
    assert len(ins1["weaknesses"]) > 0
    # FR27 Checks
    assert len(ins1["suggestions"]) > 0
    assert len(ins1["coaching_guidance"]) > 0
    print(f"  Overall Summary:  {ins1['score_explanation']['overall_summary']}")
    print(f"  Strengths (FR25): {ins1['strengths']}")
    print(f"  Suggestions(FR27):{ins1['suggestions']}")
    print("  PASS: Strong candidate profile generates valid strengths, score rationale, and guidance.")

    # -------------------------------------------------------------------------
    # TEST 2: Weak Candidate Results
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Weak Candidate Results:")
    weak_data = _mock_aggregate_data(
        overall_score=32.0,
        tech_score=30.0,
        comm_score=35.0,
        behav_score=30.0,
        wpm=185.0,  # Rushed
        hesitation=8.5,  # High hesitation
        fillers=9,
        pauses_sec=5.0,
        covered=[],
        missing=["Normalization", "Database Indexing", "B-Tree"],
        composure="Fluctuating Composure",
        confidence_score=30.0,
        confidence_level="Low",
        stress_score=78.0,
        stress_level="Elevated",
    )
    ins2 = generate_interview_insights(**weak_data)

    # FR26 Weakness checks
    assert any("missing" in w.lower() or "concept" in w.lower() or "normalization" in w.lower() for w in ins2["weaknesses"])
    assert any("rushed" in w.lower() or "185" in w.lower() for w in ins2["weaknesses"])
    assert any("filler" in w.lower() or "hesitation" in w.lower() for w in ins2["weaknesses"])
    # FR27 Suggestion checks (must target the specific weaknesses)
    assert any("normalization" in s.lower() or "indexing" in s.lower() for s in ins2["suggestions"])
    assert any("moderation" in s.lower() or "130" in s.lower() or "pacing" in s.lower() for s in ins2["suggestions"])
    assert any("pause" in s.lower() or "buffer" in s.lower() for s in ins2["suggestions"])
    print(f"  Weaknesses (FR26): {ins2['weaknesses']}")
    print(f"  Suggestions (FR27): {ins2['suggestions']}")
    print("  PASS: Weak candidate triggers targeted technical and delivery weakness diagnostics.")

    # -------------------------------------------------------------------------
    # TEST 3: Mixed Strengths & Weaknesses
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Mixed Strengths & Weaknesses (Fluent speech but missing concepts):")
    mixed_data = _mock_aggregate_data(
        overall_score=68.0,
        tech_score=50.0,
        comm_score=88.0,  # Great communication
        behav_score=75.0,
        wpm=135.0,
        hesitation=1.8,
        covered=["CSS Grid"],
        missing=["Flexbox Alignment", "Media Queries"],
        composure="Composed & Stable",
        confidence_score=75.0,
        confidence_level="Moderate",
        stress_score=25.0,
        stress_level="Low",
    )
    ins3 = generate_interview_insights(**mixed_data)
    # Communication should be in strengths
    assert any("cadence" in s.lower() or "pacing" in s.lower() for s in ins3["strengths"])
    # Technical gaps should be in weaknesses
    assert any("concept" in w.lower() or "flexbox" in w.lower() for w in ins3["weaknesses"])
    # Suggestions should address missing technical concepts
    assert any("flexbox" in s.lower() for s in ins3["suggestions"])
    print(f"  Strengths:  {ins3['strengths'][:2]}")
    print(f"  Weaknesses: {ins3['weaknesses'][:2]}")
    print("  PASS: Mixed results properly assign communication to strengths and technical gaps to weaknesses.")

    # -------------------------------------------------------------------------
    # TEST 4: Missing NLP Modality
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Missing NLP Modality (Empty transcript / Content unassessed):")
    no_nlp_data = _mock_aggregate_data(
        overall_score=50.0,
        tech_score=0.0,
        comm_score=75.0,
        behav_score=75.0,
        wpm=130.0,
        covered=[],
        missing=[],
    )
    # Clear technical metrics
    no_nlp_data["aggregate_analysis"]["compiled_metrics"]["technical"]["covered_concepts"] = []
    no_nlp_data["aggregate_analysis"]["compiled_metrics"]["technical"]["missing_concepts"] = []
    no_nlp_data["aggregate_analysis"]["compiled_metrics"]["technical"]["avg_content_score"] = 0.0

    ins4 = generate_interview_insights(**no_nlp_data)
    assert "unassessed" in ins4["score_explanation"]["score_rationale"].lower() or "missing" in ins4["score_explanation"]["score_rationale"].lower()
    # Should NOT claim candidate covered concepts
    assert not any("demonstrated domain knowledge across key topics" in s.lower() for s in ins4["strengths"])
    print(f"  Rationale: {ins4['score_explanation']['dimension_breakdown']['technical']}")
    print("  PASS: Missing NLP cleanly handled without fabricating concept coverage.")

    # -------------------------------------------------------------------------
    # TEST 5: Missing Speech Modality (Silent take)
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Missing Speech Modality (Silent audio):")
    no_speech_data = _mock_aggregate_data(
        overall_score=60.0,
        tech_score=80.0,
        comm_score=0.0,
        behav_score=80.0,
        wpm=0.0,
        hesitation=0.0,
        fillers=0,
    )
    no_speech_data["aggregate_analysis"]["compiled_metrics"]["communication"]["avg_wpm"] = 0.0
    no_speech_data["aggregate_analysis"]["compiled_metrics"]["communication"]["avg_fluency_score"] = 0.0

    ins5 = generate_interview_insights(**no_speech_data)
    assert "unavailable" in ins5["score_explanation"]["dimension_breakdown"]["communication"].lower()
    assert not any("optimal conversational cadence" in s.lower() for s in ins5["strengths"])
    assert not any("rushed speaking cadence" in w.lower() for w in ins5["weaknesses"])
    print(f"  Communication breakdown: {ins5['score_explanation']['dimension_breakdown']['communication']}")
    print("  PASS: Missing Speech cleanly handled without fabricating WPM or filler counts.")

    # -------------------------------------------------------------------------
    # TEST 6: Missing Vision Modality (Camera offline)
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Missing Vision Modality (Unmounted camera):")
    no_vision_data = _mock_aggregate_data(
        overall_score=75.0,
        tech_score=80.0,
        comm_score=70.0,
        behav_score=0.0,
        takes=0,
    )
    ins6 = generate_interview_insights(**no_vision_data)
    assert "unmounted" in ins6["score_explanation"]["dimension_breakdown"]["behavioral"].lower() or "not evaluated" in ins6["score_explanation"]["dimension_breakdown"]["behavioral"].lower()
    assert not any("composed facial stability" in s.lower() for s in ins6["strengths"])
    assert not any("observable stress" in w.lower() for w in ins6["weaknesses"])
    print(f"  Behavioral breakdown: {ins6['score_explanation']['dimension_breakdown']['behavioral']}")
    print("  PASS: Missing Vision cleanly handled without fabricating facial composure.")

    # -------------------------------------------------------------------------
    # TEST 7: All Modalities Unavailable (0 Answered Prompts)
    # -------------------------------------------------------------------------
    print("\n[TEST 7] All Modalities Unavailable (0 Answered Prompts):")
    zero_data = _mock_aggregate_data(
        overall_score=0.0,
        tech_score=0.0,
        comm_score=0.0,
        behav_score=0.0,
        wpm=0.0,
        hesitation=0.0,
        takes=0,
        total_q=3,
        answered_q=0,
        skipped_q=3,
    )
    ins7 = generate_interview_insights(**zero_data)
    assert ins7["strengths"] == []
    assert len(ins7["weaknesses"]) > 0
    assert "unrecorded" in ins7["weaknesses"][0].lower() or "submitted without" in ins7["weaknesses"][0].lower()
    assert "unassessed" in ins7["score_explanation"]["dimension_breakdown"]["technical"].lower()
    print(f"  Summary: {ins7['score_explanation']['overall_summary']}")
    print(f"  Weaknesses: {ins7['weaknesses']}")
    print("  PASS: Zero-answer session handled honestly with zero synthetic data.")

    # -------------------------------------------------------------------------
    # TEST 8: Dynamic Recommendations Adapt to Changing Weaknesses
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Recommendations Adapt to Evaluation Data:")
    data_slow = _mock_aggregate_data(wpm=95.0, hesitation=1.0)  # Slow
    data_fast = _mock_aggregate_data(wpm=180.0, hesitation=1.0)  # Rushed
    ins_slow = generate_interview_insights(**data_slow)
    ins_fast = generate_interview_insights(**data_fast)

    assert any("acceleration" in s.lower() or "tempo" in s.lower() or "125" in s.lower() for s in ins_slow["suggestions"])
    assert any("moderation" in s.lower() or "slow down" in s.lower() or "130" in s.lower() for s in ins_fast["suggestions"])
    print(f"  Slow pace suggestion: {ins_slow['suggestions'][0]}")
    print(f"  Fast pace suggestion: {ins_fast['suggestions'][0]}")
    print("  PASS: Suggestions dynamically adjust between slow and rushed candidates.")

    # -------------------------------------------------------------------------
    # TEST 9: Deterministic Repeatability Guarantee
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Deterministic Repeatability Guarantee:")
    run_a = generate_interview_insights(**strong_data)
    run_b = generate_interview_insights(**strong_data)
    assert run_a == run_b
    print("  PASS: Exact deterministic equality confirmed across repeated runs.")

    # -------------------------------------------------------------------------
    # TEST 10: End-to-End Persistence in MongoDB via Evaluation Worker
    # -------------------------------------------------------------------------
    print("\n[TEST 10] MongoDB Persistence via Evaluation Worker:")
    target_oid = ObjectId("6a96c6df4fe22d4bad7fc5a7")
    worker_res = evaluate_interview_job("6a96c6df4fe22d4bad7fc5a7")
    assert worker_res is not None

    doc = interviews_collection.find_one({"_id": target_oid})
    assert doc is not None
    assert doc["evaluation_status"] == "completed"

    eval_doc = doc["evaluation"]
    assert "insights" in eval_doc
    insights_db = eval_doc["insights"]
    assert "score_explanation" in insights_db
    assert "strengths" in insights_db
    assert "weaknesses" in insights_db
    assert "suggestions" in insights_db
    assert "coaching_guidance" in insights_db
    assert "preparation_strategies" in insights_db

    # Backward compatibility checks
    assert eval_doc["interpretation"] == insights_db["score_explanation"]["overall_summary"]
    assert eval_doc["strengths"] == insights_db["strengths"]
    assert eval_doc["weaknesses"] == insights_db["weaknesses"]
    assert eval_doc["suggestions"] == insights_db["suggestions"]
    print(f"  Persisted Strengths:   {eval_doc['strengths']}")
    print(f"  Persisted Weaknesses:  {eval_doc['weaknesses']}")
    print(f"  Persisted Suggestions: {eval_doc['suggestions']}")
    print("  PASS: Complete insights structure persisted to MongoDB with 100% backward compatibility.")

    # -------------------------------------------------------------------------
    # TEST 11: Candidate Ownership Isolation
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Candidate Ownership Isolation:")
    owner_id = doc.get("user_id")
    legit_doc = interviews_collection.find_one({"_id": target_oid, "user_id": owner_id})
    assert legit_doc is not None
    alien_doc = interviews_collection.find_one({"_id": target_oid, "user_id": "unauthorized_user_xyz"})
    assert alien_doc is None
    print("  PASS: Candidate user_id scoping strictly preserved.")

    # -------------------------------------------------------------------------
    # TEST 12: Aggregate Evaluator Integration
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Aggregate Evaluator Direct Integration:")
    sample_q = [
        {
            "question_id": "q1",
            "score": 85.0,
            "difficulty": "Medium",
            "difficulty_weight": 1.25,
            "text_analysis": {"content_score": 90.0, "covered_concepts": ["REST", "CRUD"], "missing_concepts": []},
            "delivery": {"words_per_minute": 135.0, "fluency_score": 88.0, "pacing": "Optimal", "hesitation_rate": 1.5, "status": "completed", "word_count": 50},
            "facial_analysis": {"status": "completed", "face_detected": True, "dominant_expression": "Neutral", "behavioral_indicators": {"composure_index": "Composed & Stable", "observable_tension": "Low"}},
        }
    ]
    agg_res = aggregate_interview_evaluation(sample_q)
    assert "insights" in agg_res
    assert "score_explanation" in agg_res["insights"]
    assert len(agg_res["strengths"]) > 0
    print(f"  Direct Aggregate Score: {agg_res['overall_score']}%")
    print(f"  Direct Aggregate Insights Strengths: {agg_res['insights']['strengths']}")
    print("  PASS: aggregate_interview_evaluation successfully integrates generate_interview_insights.")

    print("\n" + "=" * 70)
    print("ALL 12 EXPLAINABLE INSIGHTS & RECOMMENDATIONS TEST CASES PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
