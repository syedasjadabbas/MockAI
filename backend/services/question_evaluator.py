"""
Question-Level Evaluator for candidate interview responses (Phase 3 / Task 4).

Combines NLP transcript content analysis, speech delivery metrics, and
computer-vision facial behavioral analysis to produce a deterministic,
explainable 0-100 multimodal score for a single question response.

Difficulty weights:
- Easy: 1.0
- Medium: 1.25
- Hard: 1.5
"""
from typing import Dict, List, Optional
from services.nlp_analyzer import analyze_transcript
from services.delivery_analyzer import analyze_delivery
from services.multimodal_fusion import fuse_per_question
from services.confidence_stress_analyzer import analyze_question_confidence_and_stress
from services.language_analyzer import analyze_language
from services.camera_conduct import assess_answer_camera_conduct

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
    rubric: Optional[Dict] = None,
    response_mode: str = "spoken",
) -> Dict:
    """
    Evaluates a candidate's response to an individual question.

    response_mode: "spoken" (recorded take, transcript from ASR) or "text"
    (typed answer). Typed answers have no audio or video, so speech delivery
    and facial analysis are reported as not applicable and the fusion engine
    applies its text-only weighting.

    Returns structured evaluation matching the per_question MongoDB schema.
    """
    is_typed = response_mode == "text"
    diff_normalized = difficulty.capitalize() if difficulty else "Medium"
    diff_weight = get_difficulty_weight(diff_normalized)

    # If media was recorded or ASR completed/empty, an omitted/None transcript
    # represents a recorded silent response (status="empty"), not missing hardware.
    effective_transcript = transcript
    if effective_transcript is None and (media_url or asr_status in ("completed", "empty")):
        effective_transcript = ""

    # 1. NLP Content Analysis (FR16: BERT/DistilBERT semantic analysis)
    nlp_result = analyze_transcript(
        question_text=question_text,
        expected_answer=expected_answer,
        tags=tags,
        difficulty=diff_normalized,
        transcript=effective_transcript,
        rubric=rubric,
    )

    # 1b. Language quality, grammar & tone (FR16-01 / Objective 3)
    language_result = analyze_language(effective_transcript, mode="text" if is_typed else "spoken")

    # 2. Delivery Analysis (FR15 / FR22 / FR23) - spoken answers only
    if is_typed:
        delivery_result = {
            "status": "not_applicable",
            "word_count": len((effective_transcript or "").split()),
            "duration_seconds": float(duration_seconds or 0.0),
            "words_per_minute": None,
            "pacing": "Not Applicable",
            "filler_count": 0,
            "filler_words": [],
            "hesitation_rate": None,
            "hesitation_level": "Not Applicable",
            "fluency_score": None,
            "fluency_indicator": "Typed Answer",
            "pause_duration_seconds": 0.0,
            "pause_count": 0,
            "articulation_wpm": None,
            "notes": "Typed answer: speech delivery was not assessed.",
        }
    else:
        delivery_result = analyze_delivery(
            transcript=effective_transcript,
            duration_seconds=duration_seconds,
            media_url=media_url,
        )

    # 3. Facial & Behavioral Analysis (FR13 / FR17)
    resolved_video_path = None
    if media_url:
        try:
            import os
            from services.media_storage import LocalFilesystemMediaStorage
            storage = LocalFilesystemMediaStorage()
            resolved = storage.resolve_path(media_url)
            if resolved and resolved.is_file():
                resolved_video_path = str(resolved)
            elif os.path.isfile(str(media_url)):
                resolved_video_path = str(media_url)
        except Exception:
            import os
            resolved_video_path = media_url if (media_url and os.path.isfile(str(media_url))) else None

    from services.facial_analyzer import FacialAnalyzer
    facial_analysis_data = FacialAnalyzer().analyze_video(
        video_path=resolved_video_path,
        duration_seconds=duration_seconds,
    )

    # 4. Multimodal Fusion (FR18 / FR19)
    multimodal_data = fuse_per_question(
        nlp_result=nlp_result,
        delivery_result=delivery_result,
        facial_result=facial_analysis_data,
    )

    # The fused multimodal score becomes the canonical question score
    question_score = multimodal_data["score"]

    # 5. Confidence & Stress Analysis (FR22 / FR23)
    confidence_and_stress_data = analyze_question_confidence_and_stress(
        delivery_result=delivery_result,
        facial_result=facial_analysis_data,
        language_result=language_result,
    )

    # 6. Derive strengths, feedback, and missing concepts
    is_unanswered = not transcript or not transcript.strip() or nlp_result["status"] in ("empty", "missing")

    if is_unanswered:
        strengths: List[str] = []
        missing_concepts = nlp_result.get("missing_concepts", [])
        feedback = "No response was recorded for this question prompt."
    else:
        strengths = []
        covered = nlp_result.get("covered_concepts", [])
        target_covered = nlp_result.get("covered_target_concepts", [])
        content_score = nlp_result.get("content_score", 0.0)
        is_echo = nlp_result.get("is_echo", False)
        is_fragment = nlp_result.get("is_fragment", False)

        # Grounding check: Only credit key concept grasp when evidence shows substantive understanding
        # (Must have >= 55% content score, demonstrate target concepts, and not be an echo or fragment)
        display_concepts = target_covered if target_covered else covered
        if content_score >= 55.0 and len(display_concepts) >= 1 and not is_echo and not is_fragment:
            strengths.append(f"Clear grasp of key concepts: {', '.join(display_concepts[:3])}.")

        if delivery_result.get("pacing") == "Optimal":
            strengths.append(f"Optimal speaking pace ({delivery_result.get('words_per_minute')} WPM).")
        elif delivery_result.get("fluency_indicator") == "Fluent":
            strengths.append("Smooth conversational delivery with minimal hesitation.")
        if content_score >= 80.0:
            strengths.append("Thorough domain depth addressing core requirements.")
        if facial_analysis_data.get("status") == "completed":
            indicators = facial_analysis_data.get("behavioral_indicators", {})
            if indicators.get("composure_index") == "Composed & Stable":
                strengths.append("Maintained calm facial composure throughout response.")

        if language_result.get("status") == "completed" and language_result["grammar_score"] >= 90 and language_result["word_count"] >= 20:
            strengths.append("Grammatically clean, well-formed phrasing.")
        if language_result.get("tone", {}).get("label") == "Confident":
            strengths.append("Confident, direct tone.")

        missing_concepts = nlp_result.get("missing_concepts", [])
        feedback = f"{nlp_result['notes']} {delivery_result['notes']} {language_result.get('notes', '')}".strip()

    # Camera presence / expression flags: measured even for unanswered takes,
    # so a candidate who walked away is told so.
    camera_conduct = assess_answer_camera_conduct(facial_analysis_data)
    if camera_conduct.get("notes"):
        feedback = f"{feedback} {' '.join(camera_conduct['notes'])}".strip()

    asr_data = {
        "status": asr_status or ("completed" if transcript else "empty"),
        "transcript": transcript,
        "provider": asr_provider or ("google_speech" if transcript else None),
        "error": None,
    }
    if is_typed:
        asr_data["provider"] = "typed_input"

    text_analysis_data = {
        "status": nlp_result["status"],
        "content_score": nlp_result["content_score"],
        "semantic_similarity_score": nlp_result.get("semantic_similarity_score", 0.0),
        "concept_coverage_score": nlp_result["concept_coverage_score"],
        "relevance_score": nlp_result["relevance_score"],
        "completeness_score": nlp_result["completeness_score"],
        "covered_concepts": nlp_result["covered_concepts"],
        "missing_concepts": nlp_result["missing_concepts"],
        "notes": nlp_result["notes"],
        "model": nlp_result.get("model", "bert-distilbert-minilm-v2"),
        "error": nlp_result.get("error"),
        # FR16-01: language quality / grammar / tone (services/language_analyzer.py)
        "language_quality_score": language_result.get("language_quality_score"),
        "grammar_score": language_result.get("grammar_score"),
        "clarity_score": language_result.get("clarity_score"),
        "tone": (language_result.get("tone") or {}).get("label"),
        "language_analysis": language_result,
    }

    return {
        "question_id": question_id,
        "response_mode": "text" if is_typed else "spoken",
        "difficulty": diff_normalized,
        "difficulty_weight": diff_weight,
        "score": question_score,
        "asr": asr_data,
        "text_analysis": text_analysis_data,
        "facial_analysis": facial_analysis_data,
        "delivery": delivery_result,
        "multimodal": multimodal_data,
        "confidence_and_stress": confidence_and_stress_data,
        "camera_conduct": camera_conduct,
        "strengths": strengths,
        "missing_concepts": missing_concepts,
        "feedback": feedback,
    }


