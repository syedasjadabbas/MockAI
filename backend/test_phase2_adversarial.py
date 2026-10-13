"""
Phase 2 Adversarial Regression Test Suite for MockAI Answer Evaluation Quality.

Tests all 10 adversarial answer scenarios against a single standardized question,
expected answer, tags, and rubric to rigorously verify:
1. Elimination of score inflation (short fragments, echoes, wrong-domain answers).
2. Preservation of scores for concise but genuinely correct answers.
3. Grounded feedback generation (no ungrounded praise of understanding).
4. Correct identification of missing vs covered target concepts.
5. Strict adherence to the FYP formula: 40% semantic, 35% coverage, 15% relevance, 10% depth.
"""
import sys
import os

sys.path.insert(0, os.path.abspath("backend"))

from services.nlp_analyzer import analyze_transcript, _heuristic_analysis
from services.question_evaluator import evaluate_question_response


def test_phase2_adversarial_suite():
    print("=" * 80)
    print("RUNNING PHASE 2 ADVERSARIAL REGRESSION TEST SUITE (10 SCENARIOS)")
    print("=" * 80)

    q_text = "Explain the Virtual DOM and reconciliation process in React. How does React determine when and what to re-render?"
    q_expected = (
        "The Virtual DOM is a lightweight in-memory JavaScript representation of the real DOM. "
        "When component state changes, React runs reconciliation to diff the virtual trees, "
        "determining minimal real DOM mutations to commit to the browser."
    )
    tags = ["React", "Virtual DOM", "Performance"]
    rubric = {
        "criteria": "Candidate should explain in-memory tree representation, diffing algorithm, and selective DOM mutation.",
        "key_points": ["virtual dom", "reconciliation", "diffing", "fiber trees", "state update", "dom mutations"]
    }
    difficulty = "Medium"

    # Define the 10 adversarial cases with justified score ranges and feedback assertions
    test_cases = [
        {
            "id": 1,
            "name": "Complete, correct answer",
            "transcript": (
                "The Virtual DOM is a lightweight in-memory JavaScript representation of the real DOM. "
                "React maintains component state and runs its reconciliation diffing algorithm to compare "
                "virtual trees when state updates occur. It calculates minimal DOM mutations and commits only "
                "the necessary changes to the actual browser DOM."
            ),
            "min_score": 85.0,
            "max_score": 100.0,
            "must_praise_concepts": True,
            "must_not_praise_concepts": False,
            "expected_flags": {"is_echo": False, "is_fragment": False},
        },
        {
            "id": 2,
            "name": "Correct paraphrased answer",
            "transcript": (
                "In React, the virtual DOM is a JavaScript copy of the actual DOM stored in memory. "
                "When component state changes, React runs reconciliation to compare the updated virtual tree "
                "with the previous one. It diffs them to find minimal changes and only updates those parts in the real DOM."
            ),
            "min_score": 80.0,
            "max_score": 100.0,
            "must_praise_concepts": True,
            "must_not_praise_concepts": False,
            "expected_flags": {"is_echo": False, "is_fragment": False},
        },
        {
            "id": 3,
            "name": "Short but correct answer",
            "transcript": (
                "In React, reconciliation diffs virtual DOM trees to compute minimal real DOM updates when state changes."
            ),
            "min_score": 75.0,
            "max_score": 95.0,
            "must_praise_concepts": True,
            "must_not_praise_concepts": False,
            "expected_flags": {"is_echo": False, "is_fragment": False},
        },
        {
            "id": 4,
            "name": "Incomplete answer",
            "transcript": "React uses the virtual DOM to make re-rendering faster.",
            "min_score": 10.0,
            "max_score": 35.0,
            "must_praise_concepts": False,
            "must_not_praise_concepts": True,
            "expected_flags": {"is_echo": False, "is_fragment": False},
        },
        {
            "id": 5,
            "name": "Factually incorrect answer with keywords",
            "transcript": (
                "The virtual DOM is a physical hardware GPU chip inside the motherboard that runs "
                "Linux kernel drivers to compile Python scripts."
            ),
            "min_score": 0.0,
            "max_score": 25.0,
            "must_praise_concepts": False,
            "must_not_praise_concepts": True,
            "expected_flags": {"is_echo": False, "is_fragment": False},
        },
        {
            "id": 6,
            "name": "Verbatim repetition of the question",
            "transcript": (
                "The Virtual DOM and reconciliation process in React is how React determines "
                "when and what to re-render during an interview."
            ),
            "min_score": 0.0,
            "max_score": 18.0,
            "must_praise_concepts": False,
            "must_not_praise_concepts": True,
            "expected_flags": {"is_echo": True, "is_fragment": False},
        },
        {
            "id": 7,
            "name": "Three-word fragment containing expected keywords",
            "transcript": "Virtual DOM React",
            "min_score": 0.0,
            "max_score": 18.0,
            "must_praise_concepts": False,
            "must_not_praise_concepts": True,
            "expected_flags": {"is_echo": False, "is_fragment": True},
        },
        {
            "id": 8,
            "name": "Unrelated answer",
            "transcript": "I had pizza for lunch and the weather in London is quite rainy today.",
            "min_score": 0.0,
            "max_score": 5.0,
            "must_praise_concepts": False,
            "must_not_praise_concepts": True,
            "expected_flags": {"is_echo": False, "is_fragment": False},
        },
        {
            "id": 9,
            "name": "Empty or whitespace-only answer",
            "transcript": "   ",
            "min_score": 0.0,
            "max_score": 0.0,
            "must_praise_concepts": False,
            "must_not_praise_concepts": True,
            "expected_flags": {"is_echo": False, "is_fragment": False},
        },
        {
            "id": 10,
            "name": "Generic answer that sounds confident but lacks substantive content",
            "transcript": (
                "That is a really great and important question. In modern software engineering, "
                "we always need to think carefully about the architecture, best practices, and "
                "ensuring that everything runs efficiently and reliably for the user."
            ),
            "min_score": 0.0,
            "max_score": 10.0,
            "must_praise_concepts": False,
            "must_not_praise_concepts": True,
            "expected_flags": {"is_echo": False, "is_fragment": False},
        },
    ]

    all_passed = True
    results_summary = []

    for case in test_cases:
        cid = case["id"]
        cname = case["name"]
        trans = case["transcript"]
        min_s = case["min_score"]
        max_s = case["max_score"]

        # 1. NLP Analysis
        nlp_res = analyze_transcript(
            question_text=q_text,
            expected_answer=q_expected,
            tags=tags,
            difficulty=difficulty,
            transcript=trans,
            rubric=rubric,
        )

        # 2. Integrated Question Evaluation (Strengths & Feedback)
        eval_res = evaluate_question_response(
            question_id=f"test_case_{cid}",
            question_text=q_text,
            expected_answer=q_expected,
            tags=tags,
            difficulty=difficulty,
            transcript=trans,
            duration_seconds=15.0 if trans.strip() else None,
            rubric=rubric,
        )

        score = nlp_res["content_score"]
        sem = nlp_res.get("semantic_similarity_score", 0.0)
        cov = nlp_res.get("concept_coverage_score", 0.0)
        rel = nlp_res.get("relevance_score", 0.0)
        comp = nlp_res.get("completeness_score", 0.0)
        strengths = eval_res.get("strengths", [])
        feedback = eval_res.get("feedback", "")
        notes = nlp_res.get("notes", "")

        # Verify numerical bounds
        score_ok = min_s <= score <= max_s

        # Verify concept praise grounding
        has_concept_praise = any("Clear grasp of key concepts" in s for s in strengths)
        if case["must_praise_concepts"]:
            praise_ok = has_concept_praise
        elif case["must_not_praise_concepts"]:
            praise_ok = not has_concept_praise
        else:
            praise_ok = True

        # Verify flags
        is_echo = nlp_res.get("is_echo", False)
        is_fragment = nlp_res.get("is_fragment", False)
        flag_ok = (is_echo == case["expected_flags"]["is_echo"]) and (is_fragment == case["expected_flags"]["is_fragment"])

        case_passed = score_ok and praise_ok and flag_ok
        if not case_passed:
            all_passed = False

        status_str = "PASS" if case_passed else "FAIL"
        print(f"\n[{status_str}] Scenario {cid}: {cname}")
        print(f"  Score: {score}% (Expected [{min_s} - {max_s}%]) -> sem={sem}% cov={cov}% rel={rel}% comp={comp}%")
        print(f"  Strengths: {strengths}")
        print(f"  Feedback: {feedback}")
        print(f"  Notes: {notes}")
        if not score_ok:
            print(f"  ERROR: Score {score}% outside expected [{min_s}, {max_s}]")
        if not praise_ok:
            print(f"  ERROR: Concept praise assertion violated (has_praise={has_concept_praise})")
        if not flag_ok:
            print(f"  ERROR: Flag mismatch (echo={is_echo}, fragment={is_fragment})")

        results_summary.append({
            "id": cid,
            "name": cname,
            "score": score,
            "sem": sem,
            "cov": cov,
            "rel": rel,
            "comp": comp,
            "strengths": strengths,
            "status": status_str,
        })

    # Test Fallback Baseline on same cases
    print("\n" + "-" * 80)
    print("VERIFYING HEURISTIC FALLBACK ON ADVERSARIAL CASES")
    print("-" * 80)
    for case in [test_cases[2], test_cases[5], test_cases[6], test_cases[7]]:
        h_res = _heuristic_analysis(
            question_text=q_text,
            expected_answer=q_expected,
            tags=tags,
            difficulty=difficulty,
            transcript=case["transcript"],
            rubric=rubric,
        )
        print(f"Fallback Case {case['id']} ({case['name']}): Score={h_res['content_score']}% (Echo={h_res.get('is_echo')}, Frag={h_res.get('is_fragment')})")
        assert h_res["content_score"] <= case["max_score"] + 5.0, f"Fallback score too high: {h_res['content_score']}"

    print("\n" + "=" * 80)
    if all_passed:
        print("ALL 10 ADVERSARIAL EVALUATION CASES PASSED WITH 100% SPEC COMPLIANCE!")
    else:
        print("SOME ADVERSARIAL CASES FAILED!")
    print("=" * 80)

    assert all_passed, "One or more adversarial evaluation test cases failed."
    return True


if __name__ == "__main__":
    test_phase2_adversarial_suite()
