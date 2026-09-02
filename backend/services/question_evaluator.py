"""
Question-Level Evaluator for candidate interview responses (Phase 3).

Combines NLP transcript content analysis and delivery metrics to produce an
explainable, deterministic 0-100 score for a single question response.

Difficulty weights:
- Easy: 1.0
- Medium: 1.25
- Hard: 1.5
"""
from typing import Dict, List, Optional
from services.nlp_analyzer import analyze_transcript
from services.delivery_analyzer import analyze_delivery

DIFFICULTY_WEIGHTS: Dict[str, float] = {
    "Easy": 1.0,
    "Medium": 1.25,
    "Hard": 1.5,
}


def get_difficulty_weight(difficulty: Optional[str]) -> float:
    if not difficulty:
        return 1.25
    return DIFFICULTY_WEIGHTS.get(difficulty.capitalize(), 1.25)


def evaluate_question_response(
    question_id: str,
    question_text: str,
    expected_answer: Optional[str] = None,
    tags: Optional[List[str]] = None,
    difficulty: str = "Medium",
    transcript: Optional[str] = None,
    duration_seconds: Optional[float] = None,
    media_url: Optional[str] = None,
    asr_status: Optional[str] = None,
    asr_provider: Optional[str] = None,
) -> Dict:
    """
    Evaluates a candidate's response to an individual question.

    Returns structured evaluation matching the per_question MongoDB schema.
    """
    diff_normalized = difficulty.capitalize() if difficulty else "Medium"
    diff_weight = get_difficulty_weight(diff_normalized)

    # 1. NLP Content Analysis
    nlp_result = analyze_transcript(
        question_text=question_text,
        expected_answer=expected_answer,
        tags=tags,
        difficulty=diff_normalized,
        transcript=transcript,
    )

    # 2. Delivery Analysis
    delivery_result = analyze_delivery(
        transcript=transcript,
        duration_seconds=duration_seconds,
        media_url=media_url,
    )

    is_unanswered = not transcript or not transcript.strip() or nlp_result["status"] in ("empty", "missing")

    if is_unanswered:
        question_score = 0.0
        strengths: List[str] = []
        missing_concepts = nlp_result.get("missing_concepts", [])
        feedback = "No response was recorded for this question prompt."
        behavioral_insights = "Prompt skipped or recording unsubmitted."
        multimodal_status = "completed"
    else:
        # Base Question Score: 70% content + 30% delivery
        content_score = nlp_result["content_score"]
        fluency_score = delivery_result["fluency_score"]
        raw_score = (0.70 * content_score) + (0.30 * fluency_score)
        question_score = round(min(100.0, max(0.0, raw_score)), 1)

        # Identify strengths
        strengths = []
        covered = nlp_result.get("covered_concepts", [])
        if covered:
            strengths.append(f"Clear grasp of key concepts: {', '.join(covered[:3])}.")
        if delivery_result.get("pacing") == "Optimal":
            strengths.append(f"Optimal speaking pace ({delivery_result.get('words_per_minute')} WPM).")
        elif delivery_result.get("fluency_indicator") == "Fluent":
            strengths.append("Smooth conversational delivery with minimal hesitation.")
        if content_score >= 80.0:
            strengths.append("Thorough technical depth addressing core requirements.")

        missing_concepts = nlp_result.get("missing_concepts", [])
        feedback = f"{nlp_result['notes']} {delivery_result['notes']}"
        behavioral_insights = delivery_result["notes"]
        multimodal_status = "completed"

    asr_data = {
        "status": asr_status or ("completed" if transcript else "empty"),
        "transcript": transcript,
        "provider": asr_provider or ("google_speech" if transcript else None),
        "error": None,
    }

    text_analysis_data = {
        "status": nlp_result["status"],
        "content_score": nlp_result["content_score"],
        "concept_coverage_score": nlp_result["concept_coverage_score"],
        "relevance_score": nlp_result["relevance_score"],
        "completeness_score": nlp_result["completeness_score"],
        "covered_concepts": nlp_result["covered_concepts"],
        "missing_concepts": nlp_result["missing_concepts"],
        "notes": nlp_result["notes"],
        "model": "nlp-criteria-v1",
        "error": None,
    }

    facial_analysis_data = {
        "status": "not_implemented",
        "confidence_indicators": None,
        "stress_indicators": None,
        "model": None,
        "error": None,
    }

    multimodal_data = {
        "status": multimodal_status,
        "score": question_score,
        "integrated_score": question_score,
        "behavioral_insights": behavioral_insights,
        "fusion_method": "weighted_content_delivery_v1",
        "error": None,
    }

    return {
        "question_id": question_id,
        "difficulty": diff_normalized,
        "difficulty_weight": diff_weight,
        "score": question_score,
        "asr": asr_data,
        "text_analysis": text_analysis_data,
        "facial_analysis": facial_analysis_data,
        "delivery": delivery_result,
        "multimodal": multimodal_data,
        "strengths": strengths,
        "missing_concepts": missing_concepts,
        "feedback": feedback,
    }
