"""
Aggregate Evaluation Service (FR20 / FR21).

Synthesizes per-question multimodal assessments (NLP, Speech, Vision) into a
comprehensive, explainable interview evaluation:
- FR20 (Aggregate Interview Analysis): Compiles evaluation results for all questions,
  combines analysis outputs into a single structured dataset, and prepares data for scoring.
- FR21 (Generate Overall Performance Score): Calculates a deterministic, explainable
  overall performance score (0-100) incorporating technical content, communication delivery,
  and behavioral composure using difficulty weights (Easy: 1.0, Med: 1.25, Hard: 1.5).

Integrity guarantees:
- Never fabricates random numbers or pseudo-scientific claims.
- Correctly scales difficulty and accounts for skipped/failed responses with zero fabrication.
- Deterministic and repeatable mathematical scoring.
"""
from typing import Dict, List, Optional
from services.confidence_stress_analyzer import aggregate_confidence_and_stress

DIFFICULTY_WEIGHTS: Dict[str, float] = {
    "Easy": 1.0,
    "Medium": 1.25,
    "Hard": 1.5,
}


def get_difficulty_weight(difficulty: Optional[str]) -> float:
    if not difficulty:
        return 1.25
    return DIFFICULTY_WEIGHTS.get(difficulty.capitalize(), 1.25)


def aggregate_interview_evaluation(per_question_results: List[Dict]) -> Dict:
    """
    Combines per-question evaluations into an interview-level evaluation document.

    Implements:
      - FR20: Compiles evaluation results and combines analysis outputs into an aggregate dataset.
      - FR21: Calculates difficulty-weighted overall performance score incorporating communication
              and behavioral analysis.
      - FR22: Calculates dual-modality confidence score and categorical level.
      - FR23: Calculates dual-modality stress score and categorical indicator.

    Returns:
        Dict matching the evaluation subdocument schema:
            - overall_score: float (0.0 to 100.0)
            - confidence_score: float (0.0 to 100.0)
            - confidence_level: str ("High" | "Moderate" | "Developing" | "Low" | "Not Assessed")
            - stress_score: float (0.0 to 100.0)
            - stress_level: "Low" | "Moderate" | "Elevated" | "Not Assessed"
            - interpretation: str
            - strengths: List[str]
            - weaknesses: List[str]
            - suggestions: List[str]
            - facial_summary: Dict
            - aggregate_analysis: Dict (FR20 compiled dataset)
            - scoring_formula: Dict (FR21-01 mathematical explainability)
            - dimension_scores: Dict (FR21-02 communication & behavioral analysis incorporation)
            - confidence_and_stress_summary: Dict (FR22 / FR23 detailed evidence)
    """
    if not per_question_results:
        empty_formula = {
            "method": "difficulty_weighted_multimodal_sum",
            "formula": "round(sum(weight * multimodal_score) / sum(weight), 1)",
            "total_difficulty_weight": 0.0,
            "accumulated_weighted_score": 0.0,
            "weights_mapping": DIFFICULTY_WEIGHTS,
        }
        empty_aggregate = {
            "total_questions": 0,
            "answered_questions": 0,
            "skipped_questions": 0,
            "failed_questions": 0,
            "completion_rate": 0.0,
            "compiled_metrics": {
                "technical": {"avg_content_score": 0.0, "avg_semantic_similarity": 0.0, "covered_concepts": [], "missing_concepts": []},
                "communication": {"avg_wpm": 0.0, "avg_fluency_score": 0.0, "total_fillers": 0, "avg_hesitation_rate": 0.0},
                "behavioral": {"evaluated_takes": 0, "dominant_expression": "Unavailable", "overall_composure": "Not Assessed"},
            },
        }
        empty_dimensions = {
            "technical_content": 0.0,
            "communication_fluency": 0.0,
            "behavioral_composure": 0.0,
        }
        empty_cs = {
            "confidence_score": 0.0,
            "confidence_level": "Not Assessed",
            "stress_score": 0.0,
            "stress_level": "Not Assessed",
            "evaluated_takes": 0,
            "modality_status": {"speech": "unavailable", "vision": "unavailable"},
            "summary_evidence": {
                "avg_speech_confidence": 0.0,
                "avg_speech_stress": 0.0,
                "avg_facial_confidence": 0.0,
                "avg_facial_stress": 0.0,
            },
            "formula": "0.60 * speech_confidence + 0.40 * facial_confidence | 0.50 * speech_stress + 0.50 * facial_stress",
        }
        return {
            "overall_score": 0.0,
            "confidence_score": 0.0,
            "confidence_level": "Not Assessed",
            "stress_score": 0.0,
            "stress_level": "Not Assessed",
            "interpretation": "No questions were evaluated in this session.",
            "strengths": [],
            "weaknesses": ["No prompts were recorded or submitted."],
            "suggestions": ["Record and submit spoken responses for each prompt."],
            "facial_summary": {
                "status": "not_implemented",
                "evaluated_takes": 0,
                "dominant_expression": None,
                "overall_composure": None,
            },
            "aggregate_analysis": empty_aggregate,
            "scoring_formula": empty_formula,
            "dimension_scores": empty_dimensions,
            "confidence_and_stress_summary": empty_cs,
        }

    total_count = len(per_question_results)

    # -----------------------------------------------------------------------
    # FR20-01 & FR20-03: Compile questions and prepare data for scoring
    # -----------------------------------------------------------------------
    total_weight = 0.0
    weighted_score_sum = 0.0

    # Categorize questions into answered, skipped, and failed
    answered_questions: List[Dict] = []
    skipped_questions: List[Dict] = []
    failed_questions: List[Dict] = []

    for q_eval in per_question_results:
        # Resolve difficulty weight
        w = float(q_eval.get("difficulty_weight") or get_difficulty_weight(q_eval.get("difficulty")))
        total_weight += w

        # Extract canonical multimodal score (FR18/FR19 result)
        mm = q_eval.get("multimodal", {})
        q_score = float(mm.get("score") if mm and "score" in mm else q_eval.get("score", 0.0))
        # Ensure score is strictly bounded in 0.0 - 100.0
        q_score = min(100.0, max(0.0, q_score))

        weighted_score_sum += (q_score * w)

        # Classify answering status
        text_status = q_eval.get("text_analysis", {}).get("status")
        mm_status = mm.get("status") if mm else None
        asr_info = q_eval.get("asr") or {}
        has_transcript = bool(asr_info.get("transcript") and str(asr_info.get("transcript")).strip())
        word_count = q_eval.get("delivery", {}).get("word_count", 0)

        if mm_status == "failed" or text_status == "failed":
            failed_questions.append(q_eval)
        elif not has_transcript and (text_status in ("empty", "missing") or word_count == 0):
            skipped_questions.append(q_eval)
        else:
            answered_questions.append(q_eval)

    answered_count = len(answered_questions)
    skipped_count = len(skipped_questions)
    failed_count = len(failed_questions)
    completion_rate = round((answered_count / total_count) * 100.0, 1) if total_count > 0 else 0.0

    # -----------------------------------------------------------------------
    # FR21-01: Calculate Overall Performance Score (0.0 to 100.0)
    # -----------------------------------------------------------------------
    if total_weight > 0:
        overall_score = round(min(100.0, max(0.0, weighted_score_sum / total_weight)), 1)
    else:
        overall_score = 0.0

    scoring_formula = {
        "method": "difficulty_weighted_multimodal_sum",
        "formula": "round(sum(weight * multimodal_score) / sum(weight), 1)",
        "total_difficulty_weight": round(total_weight, 2),
        "accumulated_weighted_score": round(weighted_score_sum, 2),
        "weights_mapping": DIFFICULTY_WEIGHTS,
        "unanswered_penalty": "Unanswered/failed questions are scored 0.0 with difficulty weight retained in denominator",
    }

    # -----------------------------------------------------------------------
    # FR20-02 & FR21-02: Combine analysis outputs into single dataset & dimensions
    # -----------------------------------------------------------------------
    # Technical / Content metrics compilation
    all_covered_concepts: List[str] = []
    all_missing_concepts: List[str] = []
    content_scores: List[float] = []
    semantic_sim_scores: List[float] = []

    for q in per_question_results:
        ta = q.get("text_analysis") or {}
        all_missing_concepts.extend(ta.get("missing_concepts") or q.get("missing_concepts") or [])
        if q in answered_questions:
            all_covered_concepts.extend(ta.get("covered_concepts") or [])
            if "content_score" in ta and ta["content_score"] is not None:
                content_scores.append(float(ta["content_score"]))
            if "semantic_similarity_score" in ta and ta["semantic_similarity_score"] is not None:
                semantic_sim_scores.append(float(ta["semantic_similarity_score"]))

    unique_covered = list(dict.fromkeys(all_covered_concepts))
    unique_missing = list(dict.fromkeys(all_missing_concepts))
    avg_content_score = round(sum(content_scores) / len(content_scores), 1) if content_scores else 0.0
    avg_semantic_sim = round(sum(semantic_sim_scores) / len(semantic_sim_scores), 1) if semantic_sim_scores else 0.0

    # Communication / Speech metrics compilation
    fluency_scores: List[float] = []
    wpm_scores: List[float] = []
    articulation_wpms: List[float] = []
    hesitation_rates: List[float] = []
    all_fillers: List[str] = []
    total_pause_duration = 0.0
    total_pause_count = 0

    for q in answered_questions:
        deliv = q.get("delivery") or {}
        if "fluency_score" in deliv and deliv["fluency_score"] is not None:
            fluency_scores.append(float(deliv["fluency_score"]))
        if "words_per_minute" in deliv and deliv["words_per_minute"] is not None:
            wpm_scores.append(float(deliv["words_per_minute"]))
        if "articulation_wpm" in deliv and deliv["articulation_wpm"] is not None:
            articulation_wpms.append(float(deliv["articulation_wpm"]))
        if "hesitation_rate" in deliv and deliv["hesitation_rate"] is not None:
            hesitation_rates.append(float(deliv["hesitation_rate"]))
        all_fillers.extend(deliv.get("filler_words") or [])
        total_pause_duration += float(deliv.get("pause_duration_seconds") or 0.0)
        total_pause_count += int(deliv.get("pause_count") or 0)

    avg_fluency = round(sum(fluency_scores) / len(fluency_scores), 1) if fluency_scores else 0.0
    avg_wpm = round(sum(wpm_scores) / len(wpm_scores), 1) if wpm_scores else 0.0
    avg_articulation_wpm = round(sum(articulation_wpms) / len(articulation_wpms), 1) if articulation_wpms else 0.0
    avg_hesitation = round(sum(hesitation_rates) / len(hesitation_rates), 1) if hesitation_rates else 0.0

    # Behavioral / Facial metrics compilation
    facial_results = [
        q.get("facial_analysis") for q in per_question_results
        if isinstance(q.get("facial_analysis"), dict) and q.get("facial_analysis", {}).get("status") == "completed"
    ]
    facial_scores: List[float] = []
    dominant_expressions: List[str] = []
    composure_indices: List[str] = []
    engagement_levels: List[str] = []

    for f in facial_results:
        if f.get("dominant_expression"):
            dominant_expressions.append(f["dominant_expression"])
        ind = f.get("behavioral_indicators") or {}
        comp = ind.get("composure_index")
        eng = ind.get("engagement_level")
        if comp:
            composure_indices.append(comp)
        if eng:
            engagement_levels.append(eng)
        from services.multimodal_fusion import _facial_to_score
        f_score = _facial_to_score(f)
        if f_score is not None:
            facial_scores.append(f_score)

    most_common_expression = max(set(dominant_expressions), key=dominant_expressions.count) if dominant_expressions else "Neutral"
    stable_count = sum(1 for c in composure_indices if c == "Composed & Stable")
    overall_composure = "Composed & Stable" if stable_count >= (len(facial_results) / 2) and facial_results else ("Moderate Composure" if facial_results else "Not Assessed")
    avg_facial_score = round(sum(facial_scores) / len(facial_scores), 1) if facial_scores else None

    if facial_results:
        facial_summary = {
            "status": "completed",
            "evaluated_takes": len(facial_results),
            "dominant_expression": most_common_expression,
            "overall_composure": overall_composure,
        }
    else:
        facial_summary = {
            "status": "not_implemented",
            "evaluated_takes": 0,
            "dominant_expression": None,
            "overall_composure": None,
        }

    # FR20: Compiled Aggregate Dataset
    aggregate_analysis = {
        "total_questions": total_count,
        "answered_questions": answered_count,
        "skipped_questions": skipped_count,
        "failed_questions": failed_count,
        "completion_rate": completion_rate,
        "compiled_metrics": {
            "technical": {
                "avg_content_score": avg_content_score,
                "avg_semantic_similarity": avg_semantic_sim,
                "covered_concepts": unique_covered,
                "missing_concepts": unique_missing,
            },
            "communication": {
                "avg_wpm": avg_wpm,
                "avg_articulation_wpm": avg_articulation_wpm,
                "avg_fluency_score": avg_fluency,
                "avg_hesitation_rate": avg_hesitation,
                "total_fillers": len(all_fillers),
                "total_pause_duration_seconds": round(total_pause_duration, 2),
                "total_pause_count": total_pause_count,
            },
            "behavioral": {
                "evaluated_takes": len(facial_results),
                "dominant_expression": most_common_expression,
                "overall_composure": overall_composure,
            },
        },
    }

    # FR21-02: Communication and Behavioral Analysis Incorporation (Dimension Scores)
    dimension_scores = {
        "technical_content": avg_content_score,
        "communication_fluency": avg_fluency,
        "behavioral_composure": avg_facial_score if avg_facial_score is not None else 0.0,
    }

    # -----------------------------------------------------------------------
    # FR22 & FR23: Dual-Modality Confidence & Stress Assessment
    # -----------------------------------------------------------------------
    cs_aggregate = aggregate_confidence_and_stress(per_question_results)
    confidence_score = cs_aggregate["confidence_score"]
    confidence_level = cs_aggregate["confidence_level"]
    stress_score = cs_aggregate["stress_score"]
    stress_level = cs_aggregate["stress_level"]

    # -----------------------------------------------------------------------
    # Synthesize Strengths, Weaknesses, Suggestions & Interpretation
    # -----------------------------------------------------------------------
    strengths: List[str] = []
    if unique_covered:
        strengths.append(f"Demonstrated domain knowledge across key topics: {', '.join(unique_covered[:4])}.")

    if answered_count > 0:
        optimal_pacing_count = sum(1 for q in answered_questions if q.get("delivery", {}).get("pacing") == "Optimal")
        if optimal_pacing_count >= (answered_count / 2):
            strengths.append(f"Maintained steady conversational pacing across prompts (averaging {avg_wpm} WPM).")

        low_hesitation_count = sum(1 for q in answered_questions if q.get("delivery", {}).get("hesitation_level") == "Low")
        if low_hesitation_count >= (answered_count / 2):
            strengths.append("Clear verbal articulation with minimal filler hesitation.")

    if facial_results and overall_composure == "Composed & Stable" and len(strengths) < 4:
        strengths.append("Maintained calm facial composure and steady visual engagement.")

    if not strengths:
        if answered_count > 0:
            strengths.append("Successfully completed and submitted recorded responses.")
        else:
            strengths.append("Interview session initialized and recorded.")

    weaknesses: List[str] = []
    if unique_missing:
        weaknesses.append(f"Opportunities for deeper coverage on: {', '.join(unique_missing[:3])}.")

    if answered_count > 0:
        elevated_fillers = sum(1 for q in answered_questions if q.get("delivery", {}).get("hesitation_level") == "Elevated")
        if elevated_fillers > 0:
            weaknesses.append("Noticeable hesitation and filler word usage during technical explanations.")

        slow_or_rushed = sum(1 for q in answered_questions if q.get("delivery", {}).get("pacing") in ("Slow", "Rushed"))
        if slow_or_rushed > 0:
            weaknesses.append("Pacing variance observed between rapid and deliberate response sections.")

    if skipped_count > 0:
        weaknesses.append(f"{skipped_count} prompt{'s were' if skipped_count > 1 else ' was'} skipped without recorded responses.")
    if failed_count > 0:
        weaknesses.append(f"{failed_count} prompt{'s encountered' if failed_count > 1 else ' encountered'} media processing issues.")

    suggestions: List[str] = []
    if unique_missing:
        suggestions.append(f"Prepare specific technical examples illustrating {', '.join(unique_missing[:2])}.")

    if answered_count > 0:
        if avg_wpm < 110:
            suggestions.append("Aim to slightly increase response cadence toward 120-150 words per minute.")
        elif avg_wpm > 165:
            suggestions.append("Practice pausing between points to avoid rushing complex architectural explanations.")
        else:
            suggestions.append("Continue practicing structured responses using the STAR method (Situation, Task, Action, Result).")

        suggestions.append("Use brief 1-2 second pauses before answering to organize key points and reduce fillers.")
    else:
        suggestions.append("Complete all prompt recordings to receive a full comprehensive evaluation.")

    # Performance Interpretation
    if overall_score >= 80.0:
        level_str = "Strong"
        summary_tone = "demonstrated strong technical proficiency and confident communication"
    elif overall_score >= 60.0:
        level_str = "Competent"
        summary_tone = "demonstrated solid foundational understanding with opportunities for greater depth"
    elif overall_score >= 35.0:
        level_str = "Developing"
        summary_tone = "showed emerging familiarity with core concepts but missed key technical details"
    else:
        level_str = "Limited"
        summary_tone = "had limited response coverage and key technical areas require review"

    interpretation = (
        f"{level_str} overall performance with a composite score of {round(overall_score)}/100. "
        f"The candidate {summary_tone} across {answered_count} of {total_count} evaluated prompts. "
        f"Delivery confidence was assessed at {round(confidence_score)}% ({confidence_level}) with {stress_level.lower()} observed tension ({round(stress_score)}%)."
    )

    return {
        "overall_score": overall_score,
        "confidence_score": confidence_score,
        "confidence_level": confidence_level,
        "stress_score": stress_score,
        "stress_level": stress_level,
        "confidence_and_stress_summary": cs_aggregate,
        "interpretation": interpretation,
        "strengths": strengths[:4],
        "weaknesses": weaknesses[:3],
        "suggestions": suggestions[:4],
        "facial_summary": facial_summary,
        "aggregate_analysis": aggregate_analysis,
        "scoring_formula": scoring_formula,
        "dimension_scores": dimension_scores,
    }

