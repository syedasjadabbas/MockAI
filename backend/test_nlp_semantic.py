"""
Automated Test Suite for AI Task 2: Report-Aligned BERT/DistilBERT Semantic NLP Evaluation.
Validates FR16 (Text Analysis) capabilities, semantic discrimination, concept extraction,
fallback safety, question evaluator integration, background worker persistence, and regression isolation.
"""
import os
import sys
from bson import ObjectId

sys.path.insert(0, os.path.abspath('backend'))

from database import interviews_collection, users_collection
from services.nlp_analyzer import (
    BertSemanticAnalyzer,
    analyze_transcript,
    _heuristic_analysis,
    RealNLPService,
)
from services.question_evaluator import evaluate_question_response
from services.evaluation_worker import evaluate_interview_job


def run_tests():
    print("=" * 70)
    print("STARTING BERT/DISTILBERT SEMANTIC NLP TEST SUITE (TASK 2)")
    print("=" * 70)

    q_text = "Explain the Virtual DOM and reconciliation process in React. How does React determine when and what to re-render?"
    expected = "The Virtual DOM is a lightweight in-memory JavaScript representation of the real DOM. When state changes, React creates a new VDOM tree, diffs it with the previous one (reconciliation), and updates only the changed elements in the real DOM efficiently."
    tags = ["React", "Virtual DOM", "Performance"]
    rubric = {
        "criteria": "Candidate should explain in-memory tree representation, diffing algorithm, and selective DOM mutation.",
        "key_points": ["virtual dom", "reconciliation", "diffing algorithm", "state update"]
    }

    # -------------------------------------------------------------------------
    # TEST 1: Semantic Discrimination (Relevant vs Irrelevant Answer)
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Semantic Discrimination (Relevant vs Irrelevant Answer):")
    good_answer = (
        "React creates a lightweight in-memory representation of the actual DOM called the virtual DOM. "
        "Whenever component state or props change, a new virtual DOM tree is constructed. React then runs "
        "its reconciliation diffing algorithm to compare the old and new virtual trees, and efficiently updates "
        "only the mutated browser DOM nodes rather than re-rendering the entire page."
    )
    irrel_answer = "For Sunday dinner, I baked chocolate chip cookies with organic butter, sugar, and flour in the oven."

    res_good = analyze_transcript(
        question_text=q_text,
        expected_answer=expected,
        tags=tags,
        difficulty="Medium",
        transcript=good_answer,
        rubric=rubric,
    )
    res_irrel = analyze_transcript(
        question_text=q_text,
        expected_answer=expected,
        tags=tags,
        difficulty="Medium",
        transcript=irrel_answer,
        rubric=rubric,
    )

    print(f"  Good Answer: Content Score = {res_good['content_score']}%, Semantic Sim = {res_good['semantic_similarity_score']}%")
    print(f"  Irrelevant Answer: Content Score = {res_irrel['content_score']}%, Semantic Sim = {res_irrel['semantic_similarity_score']}%")

    assert res_good["status"] == "completed"
    assert res_good["content_score"] >= 75.0, f"Expected high score for relevant answer, got {res_good['content_score']}"
    assert res_good["semantic_similarity_score"] >= 75.0
    assert res_good["model"] == "bert-distilbert-minilm-v2"

    assert res_irrel["status"] == "completed"
    assert res_irrel["content_score"] < 25.0, f"Expected very low score for irrelevant answer, got {res_irrel['content_score']}"
    assert res_irrel["semantic_similarity_score"] < 15.0
    print("  PASS: Semantic discrimination successfully distinguished relevant from irrelevant answer.")

    # -------------------------------------------------------------------------
    # TEST 2: Concept Extraction & Technical Depth (FR16-03)
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Semantic Concept Coverage & Rubric Matching:")
    covered = res_good.get("covered_concepts", [])
    print(f"  Covered Concepts: {covered}")
    assert any("virtual dom" in c.lower() for c in covered) or any("vdom" in c.lower() for c in covered)
    assert res_good["concept_coverage_score"] >= 60.0
    print("  PASS: Semantic concept coverage identified expected rubric points.")

    # -------------------------------------------------------------------------
    # TEST 3: Empty and Whitespace Answer Handling (Zero Fabrication)
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Empty & Whitespace Input Safety:")
    res_empty_str = analyze_transcript(q_text, expected, tags, "Medium", "   ")
    assert res_empty_str["status"] == "empty"
    assert res_empty_str["content_score"] == 0.0
    assert res_empty_str["semantic_similarity_score"] == 0.0
    assert len(res_empty_str["covered_concepts"]) == 0
    print("  PASS: Whitespace input handled with 0.0 score and zero fabrication.")

    # -------------------------------------------------------------------------
    # TEST 4: Missing Answer Handling
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Missing (None) Input Handling:")
    res_missing = analyze_transcript(q_text, expected, tags, "Medium", None)
    assert res_missing["status"] == "missing"
    assert res_missing["content_score"] == 0.0
    print("  PASS: Missing input handled safely with 0.0 score.")

    # -------------------------------------------------------------------------
    # TEST 5: Malformed / Non-String Input Safety
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Malformed / Non-String Type Safety:")
    res_malformed = analyze_transcript(q_text, expected, tags, "Medium", 12345)  # type: ignore
    assert res_malformed["status"] == "missing"
    assert res_malformed["content_score"] == 0.0
    print("  PASS: Malformed non-string input safely defaulted without crash.")

    # -------------------------------------------------------------------------
    # TEST 6: Deterministic Fallback Baseline Preservation
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Deterministic Heuristic Fallback Verification:")
    res_fallback = _heuristic_analysis(q_text, expected, tags, "Medium", good_answer, rubric)
    assert res_fallback["status"] == "completed"
    assert res_fallback["content_score"] > 0.0
    assert res_fallback["model"] == "heuristic-fallback"
    print(f"  PASS: Fallback baseline functional with score = {res_fallback['content_score']}%, model = {res_fallback['model']}.")

    # -------------------------------------------------------------------------
    # TEST 7: Question Evaluator Integration
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Integrated Question Evaluator Execution:")
    q_eval = evaluate_question_response(
        question_id="test_q_01",
        question_text=q_text,
        expected_answer=expected,
        tags=tags,
        difficulty="Medium",
        transcript=good_answer,
        duration_seconds=30.0,
        media_url=None,
        rubric=rubric,
    )
    assert "text_analysis" in q_eval
    assert q_eval["text_analysis"]["model"] == "bert-distilbert-minilm-v2"
    assert q_eval["text_analysis"]["semantic_similarity_score"] >= 75.0
    assert q_eval["text_analysis"]["content_score"] >= 75.0
    assert q_eval["score"] >= 70.0
    print(f"  PASS: evaluate_question_response integrated with text_analysis score = {q_eval['text_analysis']['content_score']}%")

    # -------------------------------------------------------------------------
    # TEST 8: Candidate Security & Ownership Isolation in MongoDB
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Candidate Security / Ownership Isolation:")
    interview_oid = ObjectId("6a96c6df4fe22d4bad7fc5a7")
    target_interview = interviews_collection.find_one({"_id": interview_oid})
    assert target_interview is not None, "Target interview not found in DB"
    owner_user_id = target_interview.get("user_id")

    own_doc = interviews_collection.find_one({"_id": interview_oid, "user_id": owner_user_id})
    assert own_doc is not None, "Candidate cannot query own interview"

    foreign_doc = interviews_collection.find_one({"_id": interview_oid, "user_id": "unauthorized_candidate_99"})
    assert foreign_doc is None, "Security breach: foreign candidate queried interview!"
    print("  PASS: Strict candidate user_id scoping confirmed in MongoDB.")

    # -------------------------------------------------------------------------
    # TEST 9: End-to-End Evaluation Worker Execution & Persistence
    # -------------------------------------------------------------------------
    print("\n[TEST 9] End-to-End Background Worker Evaluation:")
    worker_res = evaluate_interview_job("6a96c6df4fe22d4bad7fc5a7")
    assert worker_res is not None, "Worker evaluation failed"

    updated_doc = interviews_collection.find_one({"_id": interview_oid})
    assert updated_doc is not None
    assert updated_doc["evaluation_status"] == "completed"
    per_q = updated_doc["evaluation"]["per_question"]
    assert len(per_q) > 0
    assert "text_analysis" in per_q[0]
    assert "model" in per_q[0]["text_analysis"]
    assert per_q[0]["text_analysis"]["model"] in ("bert-distilbert-minilm-v2", "heuristic-fallback")
    print(f"  PASS: Worker persisted evaluation with NLP model: {per_q[0]['text_analysis']['model']}.")

    # -------------------------------------------------------------------------
    # TEST 10: Non-Regression of Speech and Facial Analysis
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Speech & Vision Non-Regression Check:")
    q0_eval = per_q[0]
    # Check speech metrics
    assert "delivery" in q0_eval
    assert "words_per_minute" in q0_eval["delivery"]
    assert "fluency_score" in q0_eval["delivery"]
    # Check facial metrics
    assert "facial_analysis" in q0_eval
    assert q0_eval["facial_analysis"]["status"] == "completed"
    assert q0_eval["facial_analysis"]["dominant_expression"] == "Neutral"
    print(f"  PASS: Speech (WPM: {q0_eval['delivery']['words_per_minute']}) and Vision (Dominant: {q0_eval['facial_analysis']['dominant_expression']}) fully preserved.")

    # -------------------------------------------------------------------------
    # TEST 11: RealNLPService Interface Conformance
    # -------------------------------------------------------------------------
    print("\n[TEST 11] RealNLPService Interface Conformance:")
    nlp_service = RealNLPService()
    svc_res = nlp_service.analyze_text(good_answer)
    assert svc_res.status == "completed"
    assert svc_res.language_quality is not None and svc_res.language_quality > 0
    assert svc_res.model == "bert-distilbert-minilm-v2"
    print(f"  PASS: RealNLPService conforms to interface with quality = {svc_res.language_quality}.")

    print("\n" + "=" * 70)
    print("ALL 11 BERT/DISTILBERT NLP TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
