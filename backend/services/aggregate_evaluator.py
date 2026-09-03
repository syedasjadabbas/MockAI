"""
Aggregate Evaluation Service (Phase 4).

Synthesizes per-question NLP and delivery assessments into a comprehensive,
explainable interview evaluation:
- Weighted overall score (0-100) using difficulty weights (Easy: 1.0, Med: 1.25, Hard: 1.5)
- Speech confidence score from defensible delivery/fluency signals
- Stress/composure indicator based on speech stability and hesitation
- Specific demonstrated strengths and growth areas
- Actionable improvement suggestions based on missed concepts and pacing
- Clear performance interpretation

Integrity guarantees:
- Never fabricates random numbers or pseudo-scientific claims.
- Correctly scales difficulty and accounts for skipped responses.
"""
from typing import Dict, List, Optional


def aggregate_interview_evaluation(per_question_results: List[Dict]) -> Dict:
    """
    Combines per-question evaluations into an interview-level evaluation document.

    Returns:
        Dict matching the evaluation subdocument schema:
            - overall_score: float (0.0 to 100.0)
            - confidence_score: float (0.0 to 100.0)
            - stress_level: "Low" | "Moderate" | "Elevated" | "Not Assessed"
            - interpretation: str
            - strengths: List[str]
            - weaknesses: List[str]
            - suggestions: List[str]
    """
    if not per_question_results:
        return {
            "overall_score": 0.0,
            "confidence_score": 0.0,
            "stress_level": "Not Assessed",
            "interpretation": "No questions were evaluated in this session.",
            "strengths": [],
            "weaknesses": ["No prompts were recorded or submitted."],
            "suggestions": ["Record and submit spoken responses for each prompt."],
        }

    # 1. Calculate Weighted Overall Score
    total_weight = 0.0
    weighted_score_sum = 0.0

    for q_eval in per_question_results:
        w = float(q_eval.get("difficulty_weight", 1.25))
        s = float(q_eval.get("score", 0.0))
        total_weight += w
        weighted_score_sum += (s * w)

    if total_weight > 0:
        overall_score = round(min(100.0, max(0.0, weighted_score_sum / total_weight)), 1)
    else:
        overall_score = 0.0

    # 2. Filter Answered Responses for Delivery & Confidence Metrics
    answered_questions = [
        q for q in per_question_results
        if q.get("text_analysis", {}).get("status") == "completed" and q.get("delivery", {}).get("word_count", 0) > 0
    ]

    answered_count = len(answered_questions)
    total_count = len(per_question_results)

    if answered_count == 0:
        confidence_score = 0.0
        stress_level = "Not Assessed"
    else:
        # Confidence Score: defensible average of delivery fluency scores
        fluency_scores = [q["delivery"]["fluency_score"] for q in answered_questions]
        avg_fluency = sum(fluency_scores) / len(fluency_scores)
        confidence_score = round(min(100.0, max(0.0, avg_fluency)), 1)

        # Stress & Composure Level: inferred from average hesitation rate & pacing stability
        hesitation_rates = [q["delivery"]["hesitation_rate"] for q in answered_questions]
        avg_hesitation = sum(hesitation_rates) / len(hesitation_rates)
        rushed_count = sum(1 for q in answered_questions if q["delivery"]["pacing"] == "Rushed")

        if avg_hesitation <= 3.5 and rushed_count == 0:
            stress_level = "Low"
        elif avg_hesitation <= 7.5 and rushed_count <= 1:
            stress_level = "Moderate"
        else:
            stress_level = "Elevated"

    # 3. Synthesize Demonstrated Strengths
    strengths: List[str] = []
    
    # Collect all covered concepts
    all_covered_concepts: List[str] = []
    for q in answered_questions:
        all_covered_concepts.extend(q.get("text_analysis", {}).get("covered_concepts", []))
    
    if all_covered_concepts:
        unique_covered = list(dict.fromkeys(all_covered_concepts))
        strengths.append(f"Demonstrated domain knowledge across key topics: {', '.join(unique_covered[:4])}.")

    # Delivery strengths
    if answered_count > 0:
        optimal_pacing_count = sum(1 for q in answered_questions if q["delivery"]["pacing"] == "Optimal")
        if optimal_pacing_count >= (answered_count / 2):
            avg_wpm = round(sum(q["delivery"]["words_per_minute"] for q in answered_questions) / answered_count, 1)
            strengths.append(f"Maintained steady conversational pacing across prompts (averaging {avg_wpm} WPM).")
        
        low_hesitation_count = sum(1 for q in answered_questions if q["delivery"]["hesitation_level"] == "Low")
        if low_hesitation_count >= (answered_count / 2):
            strengths.append("Clear verbal articulation with minimal filler hesitation.")

    if not strengths:
        if answered_count > 0:
            strengths.append("Successfully completed and submitted recorded responses.")
        else:
            strengths.append("Interview session initialized and recorded.")

    # 4. Synthesize Weaknesses & Growth Areas
    weaknesses: List[str] = []
    
    # Collect missed concepts
    all_missing_concepts: List[str] = []
    for q in per_question_results:
        all_missing_concepts.extend(q.get("text_analysis", {}).get("missing_concepts", []))
    
    unique_missing = list(dict.fromkeys(all_missing_concepts))
    if unique_missing:
        weaknesses.append(f"Opportunities for deeper coverage on: {', '.join(unique_missing[:3])}.")

    # Pacing / delivery growth areas
    if answered_count > 0:
        elevated_fillers = sum(1 for q in answered_questions if q["delivery"]["hesitation_level"] == "Elevated")
        if elevated_fillers > 0:
            weaknesses.append("Noticeable hesitation and filler word usage during technical explanations.")
        
        slow_or_rushed = sum(1 for q in answered_questions if q["delivery"]["pacing"] in ("Slow", "Rushed"))
        if slow_or_rushed > 0:
            weaknesses.append("Pacing variance observed between rapid and deliberate response sections.")

    if answered_count < total_count:
        skipped_count = total_count - answered_count
        weaknesses.append(f"{skipped_count} prompt{'s were' if skipped_count > 1 else ' was'} skipped without recorded responses.")

    # 5. Actionable Suggestions
    suggestions: List[str] = []
    if unique_missing:
        suggestions.append(f"Prepare specific technical examples illustrating {', '.join(unique_missing[:2])}.")
    
    if answered_count > 0:
        avg_wpm = sum(q["delivery"]["words_per_minute"] for q in answered_questions) / answered_count
        if avg_wpm < 110:
            suggestions.append("Aim to slightly increase response cadence toward 120-150 words per minute.")
        elif avg_wpm > 165:
            suggestions.append("Practice pausing between points to avoid rushing complex architectural explanations.")
        else:
            suggestions.append("Continue practicing structured responses using the STAR method (Situation, Task, Action, Result).")
            
        suggestions.append("Use brief 1-2 second pauses before answering to organize key points and reduce fillers.")
    else:
        suggestions.append("Complete all prompt recordings to receive a full comprehensive evaluation.")

    # 6. Performance Interpretation
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
        f"Delivery fluency was assessed at {round(confidence_score)}% with {stress_level.lower()} observed tension."
    )

    # 7. Synthesize Visual Behavioral Signals if available (FR17 / FR22 / FR23)
    facial_results = [
        q.get("facial_analysis") for q in per_question_results
        if isinstance(q.get("facial_analysis"), dict) and q.get("facial_analysis", {}).get("status") == "completed"
    ]
    if facial_results:
        dominant_expressions = [f.get("dominant_expression") for f in facial_results if f.get("dominant_expression")]
        most_common_expression = max(set(dominant_expressions), key=dominant_expressions.count) if dominant_expressions else "Neutral"
        composure_indices = [f.get("behavioral_indicators", {}).get("composure_index") for f in facial_results]
        stable_count = sum(1 for c in composure_indices if c == "Composed & Stable")
        overall_composure = "Composed & Stable" if stable_count >= (len(facial_results) / 2) else "Moderate Composure"

        facial_summary = {
            "status": "completed",
            "evaluated_takes": len(facial_results),
            "dominant_expression": most_common_expression,
            "overall_composure": overall_composure,
        }
        if overall_composure == "Composed & Stable" and len(strengths) < 4:
            strengths.append("Maintained calm facial composure and steady visual engagement.")
    else:
        facial_summary = {
            "status": "not_implemented",
            "evaluated_takes": 0,
            "dominant_expression": None,
            "overall_composure": None,
        }

    return {
        "overall_score": overall_score,
        "confidence_score": confidence_score,
        "stress_level": stress_level,
        "interpretation": interpretation,
        "strengths": strengths[:4],
        "weaknesses": weaknesses[:3],
        "suggestions": suggestions[:4],
        "facial_summary": facial_summary,
    }
