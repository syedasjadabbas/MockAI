"""
Insights & Personalized Recommendations Service (FR24–FR27).

Implements report-aligned explainable AI feedback and coaching:
- FR24 (Score Interpretation Support):
    - FR 24-01: Associate scores with behavioral and technical observations.
    - FR 24-02: Provide detailed mathematical and qualitative explanations for evaluation results.
    - FR 24-03: Assist users in interpreting composite and dimensional scores.
- FR25 (Identify Strengths):
    - FR 25-01: Identify strong communication behaviors (pacing, fluency, minimal fillers).
    - FR 25-02: Highlight confident responses (high question scores, facial composure, low tension).
    - FR 25-03: Include prioritized strengths in feedback report.
- FR26 (Identify Weaknesses):
    - FR 26-01: Identify specific areas needing improvement (missing rubric concepts, depth deficits).
    - FR 26-02: Analyze responses for weak performance indicators (rushed/slow WPM, high fillers, pauses, tension).
    - FR 26-03: Include prioritized weaknesses in feedback report.
- FR27 (Provide Improvement Suggestions):
    - FR 27-01: Generate personalized improvement suggestions directly mapped to identified weaknesses.
    - FR 27-02: Provide structured coaching guidance (STAR method, top-down communication).
    - FR 27-03: Recommend preparation strategies for future interviews.

All text is written to the candidate ("you"), in plain language: no internal
terms (fusion, prompt takes, semantic similarity) and no database IDs.

Strict Guarantees:
- Zero fabrication: If a modality was unavailable, its absence is explicitly documented and no
  synthetic observations or fake metrics are generated.
- Deterministic and repeatable: Identical inputs produce identical structured insights.
"""
from typing import Dict, List, Optional


def _assessed(level: Optional[str]) -> bool:
    return bool(level) and level != "Not Assessed"


def _question_number(per_question_results: List[Dict], target: Dict) -> int:
    for i, q in enumerate(per_question_results, start=1):
        if q is target:
            return i
    return 0


def generate_interview_insights(
    per_question_results: List[Dict],
    overall_score: float,
    dimension_scores: Dict[str, float],
    confidence_score: float,
    confidence_level: str,
    stress_score: float,
    stress_level: str,
    aggregate_analysis: Dict,
    facial_summary: Dict,
) -> Dict:
    """
    Synthesizes complete, explainable feedback, prioritized strengths, genuine weaknesses,
    and personalized coaching suggestions from active multimodal evaluation data.
    """
    total_q = aggregate_analysis.get("total_questions", 0)
    answered_q = aggregate_analysis.get("answered_questions", 0)
    skipped_q = aggregate_analysis.get("skipped_questions", 0)
    failed_q = aggregate_analysis.get("failed_questions", 0)

    compiled_metrics = aggregate_analysis.get("compiled_metrics", {})
    tech_metrics = compiled_metrics.get("technical", {})
    comm_metrics = compiled_metrics.get("communication", {})

    # Modality availability flags
    has_speech = comm_metrics.get("avg_wpm", 0.0) > 0.0 or comm_metrics.get("avg_fluency_score", 0.0) > 0.0
    has_vision = facial_summary.get("status") == "completed" and facial_summary.get("evaluated_takes", 0) > 0
    has_nlp = bool(tech_metrics.get("covered_concepts") or tech_metrics.get("avg_content_score", 0.0) > 0.0)

    # -------------------------------------------------------------------------
    # Zero-Answer / Incomplete Fallback (Honest Handling)
    # -------------------------------------------------------------------------
    if answered_q == 0 or not per_question_results:
        empty_summary = "No answers were recorded in this interview, so there is nothing to score yet."
        empty_rationale = (
            f"You answered 0 of {total_q} questions, so your score is {round(overall_score)}%. "
            "Answer each question out loud or by typing to get feedback on what you said, how you said it and how you came across on camera."
        )
        return {
            "score_explanation": {
                "overall_summary": empty_summary,
                "score_rationale": empty_rationale,
                "dimension_breakdown": {
                    "technical": "What you said: not scored (no answers were recorded).",
                    "communication": "How you said it: not scored (no audio was recorded).",
                    "behavioral": "On camera: not scored (no video was recorded).",
                },
                "behavioral_observations": [
                    f"{total_q} question(s) were shown and {skipped_q} were skipped.",
                ],
            },
            "strengths": [],
            "strengths_detail": [],
            "weaknesses": [
                f"No answers recorded: none of the {total_q} questions were answered."
            ],
            "weaknesses_detail": [
                {
                    "category": "Completeness",
                    "title": "No answers recorded",
                    "description": "None of the interview questions were answered.",
                    "evidence": f"0 of {total_q} questions answered.",
                    "severity": "High",
                }
            ],
            "suggestions": [
                "Answer each question out loud, or type your answer, to get feedback.",
                "Before you start, check that the browser is allowed to use your camera and microphone.",
            ],
            "coaching_guidance": [
                {
                    "domain": "Getting started",
                    "action": "Answer every question",
                    "practice_strategy": "Set aside 15 quiet minutes and answer all the questions in one go.",
                    "target_metric": "All questions answered",
                }
            ],
            "preparation_strategies": [
                "Check your microphone and camera before you start.",
                "Read each question and take 30 seconds to plan your main points before you answer.",
            ],
        }

    # -------------------------------------------------------------------------
    # FR24: Score Interpretation & Explanations (FR 24-01, FR 24-02, FR 24-03)
    # -------------------------------------------------------------------------
    if overall_score >= 80.0:
        perf_tier = "Strong result"
        perf_verb = "You gave strong, well-covered answers"
    elif overall_score >= 60.0:
        perf_tier = "Good result"
        perf_verb = "You covered the basics well, with room for more depth"
    elif overall_score >= 35.0:
        perf_tier = "Fair result"
        perf_verb = "You showed some understanding but missed important points"
    else:
        perf_tier = "Needs work"
        perf_verb = "Your answers missed most of the key points"

    conf_ok, stress_ok = _assessed(confidence_level), _assessed(stress_level)
    if conf_ok and stress_ok:
        behaviour_line = (f" You came across with {confidence_level.lower()} confidence ({round(confidence_score)}%) "
                          f"and {stress_level.lower()} stress ({round(stress_score)}%).")
    elif conf_ok:
        behaviour_line = f" You came across with {confidence_level.lower()} confidence ({round(confidence_score)}%)."
    else:
        behaviour_line = " Confidence and stress were not assessed because your answers were too short to judge."

    overall_summary = (
        f"{perf_tier}: you scored {round(overall_score)}%. "
        f"{perf_verb} across {answered_q} of {total_q} questions."
        f"{behaviour_line}"
    )

    content_score = dimension_scores.get("technical_content", 0.0)
    comm_score = dimension_scores.get("communication_fluency", 0.0)
    behav_score = dimension_scores.get("behavioral_composure", 0.0)

    score_rationale_parts = [
        f"Your score of {round(overall_score, 1)}% combines what you said (50%), how you said it (30%) "
        f"and how you came across on camera (20%), across {answered_q} answered question(s). Harder questions count more."
    ]
    if has_nlp:
        covered_n = len(tech_metrics.get("covered_concepts", []))
        score_rationale_parts.append(
            f"What you said scored {round(content_score, 1)}%: your answers were compared with what a strong answer covers, "
            f"and you covered {covered_n} key point(s)."
        )
    else:
        score_rationale_parts.append("What you said was not scored because the transcript was missing.")

    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        score_rationale_parts.append(
            f"How you said it scored {round(comm_score, 1)}%: you averaged {avg_wpm:.1f} WPM (words per minute) "
            f"with {hesitation:.1f}% hesitation (filler words and long pauses)."
        )
    else:
        score_rationale_parts.append("How you said it was not scored because no audio was recorded.")

    if has_vision:
        composure = facial_summary.get("overall_composure", "Moderate Composure")
        dominant = facial_summary.get("dominant_expression", "Neutral")
        score_rationale_parts.append(
            f"On camera scored {round(behav_score, 1)}% across {facial_summary.get('evaluated_takes', 0)} recorded answer(s) "
            f"(most common expression: {dominant}; expression steadiness: {composure})."
        )
    else:
        score_rationale_parts.append(
            "The camera part was not scored, so its share was added to what you said and how you said it."
        )

    if skipped_q > 0:
        score_rationale_parts.append(
            f"{skipped_q} skipped question(s) count as zero and lower your overall score."
        )

    score_rationale = " ".join(score_rationale_parts)

    # Dimension Breakdown
    tech_breakdown = (
        f"What you said ({round(content_score, 1)}%): your answers were compared with what a strong answer covers. "
        + (
            f"You covered: {', '.join(tech_metrics.get('covered_concepts', [])[:4])}."
            if tech_metrics.get("covered_concepts")
            else "Few of the key points came up in your answers."
        )
    )

    comm_breakdown = (
        f"How you said it ({round(comm_score, 1)}%): {comm_metrics.get('avg_wpm', 0):.1f} WPM, "
        f"{comm_metrics.get('avg_hesitation_rate', 0):.1f}% hesitation and {comm_metrics.get('total_fillers', 0)} filler word(s)."
        if has_speech
        else "How you said it: no audio was recorded, so this was unavailable."
    )

    behav_breakdown = (
        f"On camera ({round(behav_score, 1)}%): {facial_summary.get('evaluated_takes', 0)} answer(s) analysed; most common expression "
        f"'{facial_summary.get('dominant_expression')}', expression steadiness '{facial_summary.get('overall_composure')}'."
        if has_vision
        else "On camera: the face analysis was not available, so this was not evaluated."
    )

    # Observations list (FR 24-01)
    observations: List[str] = []
    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        pacing_desc = (
            "a comfortable pace (120–160 WPM)" if 120 <= avg_wpm <= 160
            else ("fast, over 160 WPM" if avg_wpm > 160 else "slow, under 120 WPM")
        )
        observations.append(f"Speaking pace: {avg_wpm:.1f} WPM, {pacing_desc}.")

        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        fillers = comm_metrics.get("total_fillers", 0)
        observations.append(f"Filler words: {fillers} across your answers ({hesitation:.1f}% hesitation).")

        pause_sec = comm_metrics.get("total_pause_duration_seconds", 0.0)
        pause_cnt = comm_metrics.get("total_pause_count", 0)
        if pause_cnt > 0:
            observations.append(f"Long pauses: {pause_cnt} pause(s) over half a second, {pause_sec:.1f}s in total.")
        else:
            observations.append("Long pauses: none, you spoke without long silences.")

    if has_vision:
        dominant = facial_summary.get("dominant_expression") or "Not Observed"
        composure = facial_summary.get("overall_composure") or "Moderate"
        observations.append(f"Expression: mostly '{dominant}', steadiness '{composure}'.")

    observations.append(
        f"Confidence: {confidence_level} ({round(confidence_score, 1)}%)." if conf_ok
        else "Confidence: not assessed (answers too short to judge)."
    )
    observations.append(
        f"Stress: {stress_level} ({round(stress_score, 1)}%)." if stress_ok
        else "Stress: not assessed (answers too short to judge)."
    )

    if not has_vision:
        observations.append("The camera part was not available for this interview.")
    if not has_speech:
        observations.append("No audio was recorded for this interview.")

    # -------------------------------------------------------------------------
    # FR25: Identify Strengths (FR 25-01, FR 25-02, FR 25-03)
    # -------------------------------------------------------------------------
    strengths: List[str] = []
    strengths_detail: List[Dict] = []

    covered = tech_metrics.get("covered_concepts", [])
    if covered:
        strengths.append(f"Key points covered: you explained {', '.join(covered[:3])} well.")
        strengths_detail.append({
            "category": "Technical",
            "title": "Key points covered",
            "description": "Your answers included the main points a strong answer is expected to cover.",
            "evidence": f"Covered: {', '.join(covered[:4])}",
        })

    high_q = [q for q in per_question_results if float(q.get("score", 0.0)) >= 80.0]
    if high_q:
        top_q = max(high_q, key=lambda q: float(q.get("score", 0.0)))
        n = _question_number(per_question_results, top_q)
        top_score = round(float(top_q.get("score", 0.0)))
        strengths.append(f"Strong answer: question {n} scored {top_score}%.")
        strengths_detail.append({
            "category": "Technical",
            "title": f"Strong answer (question {n})",
            "description": "This answer covered what was expected in good depth.",
            "evidence": f"Score: {top_score}%",
        })

    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        if 120 <= avg_wpm <= 160:
            strengths.append(f"Good speaking pace: you averaged {avg_wpm:.1f} WPM, which is easy to follow.")
            strengths_detail.append({
                "category": "Communication",
                "title": "Good speaking pace",
                "description": "You spoke within the comfortable interview range of 120–160 words per minute.",
                "evidence": f"{avg_wpm:.1f} WPM",
            })

        fluency = comm_metrics.get("avg_fluency_score", 0.0)
        if fluency >= 80.0 and len(strengths) < 4:
            strengths.append(f"Smooth delivery: you spoke smoothly with little hesitation (fluency {round(fluency)}%).")
            strengths_detail.append({
                "category": "Communication",
                "title": "Smooth delivery",
                "description": "Your speech flowed naturally without broken sentences.",
                "evidence": f"{round(fluency)}% fluency",
            })

        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        if hesitation <= 3.0 and len(strengths) < 4:
            strengths.append(f"Few filler words: only {hesitation:.1f}% hesitation across your answers.")
            strengths_detail.append({
                "category": "Communication",
                "title": "Few filler words",
                "description": "You rarely used fillers like \"um\" and \"uh\".",
                "evidence": f"{hesitation:.1f}% hesitation",
            })

    if conf_ok and confidence_score >= 75.0 and len(strengths) < 4:
        strengths.append(f"Confident delivery: you came across as confident ({round(confidence_score)}%, {confidence_level}).")
        strengths_detail.append({
            "category": "Behavioral",
            "title": "Confident delivery",
            "description": "Your speech and expression came across as sure of yourself.",
            "evidence": f"{round(confidence_score)}% ({confidence_level})",
        })

    if has_vision and facial_summary.get("overall_composure") == "Composed & Stable" and len(strengths) < 4:
        strengths.append("Calm on camera: your expression stayed steady through your answers.")
        strengths_detail.append({
            "category": "Behavioral",
            "title": "Calm on camera",
            "description": "Your expression stayed steady and calm.",
            "evidence": f"{facial_summary.get('overall_composure')} across {facial_summary.get('evaluated_takes')} answer(s)",
        })

    if not strengths:
        strengths.append("You completed the interview and submitted your answers.")
        strengths_detail.append({
            "category": "General",
            "title": "Interview completed",
            "description": "You worked through the interview and recorded your answers.",
            "evidence": f"{answered_q} of {total_q} questions answered",
        })

    # -------------------------------------------------------------------------
    # FR26: Identify Weaknesses / Areas for Improvement (FR 26-01, FR 26-02, FR 26-03)
    # -------------------------------------------------------------------------
    weaknesses: List[str] = []
    weaknesses_detail: List[Dict] = []

    missing = tech_metrics.get("missing_concepts", [])
    if missing:
        weaknesses.append(f"Missing key points: your answers did not cover {', '.join(missing[:3])}.")
        weaknesses_detail.append({
            "category": "Technical",
            "title": "Missing key points",
            "description": "Important points a strong answer would include did not come up.",
            "evidence": f"Missing: {', '.join(missing[:4])}",
            "severity": "High" if content_score < 60.0 else "Medium",
        })

    low_q = [q for q in per_question_results if float(q.get("score", 0.0)) < 60.0 and q.get("score") is not None]
    if low_q:
        weakest_q = min(low_q, key=lambda q: float(q.get("score", 0.0)))
        n = _question_number(per_question_results, weakest_q)
        low_score = round(float(weakest_q.get("score", 0.0)))
        weaknesses.append(f"Weakest answer: question {n} scored {low_score}% and left out important details.")
        weaknesses_detail.append({
            "category": "Technical",
            "title": f"Weakest answer (question {n})",
            "description": "This answer was missing much of what was expected.",
            "evidence": f"Score: {low_score}%",
            "severity": "High",
        })

    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        if avg_wpm > 165.0:
            weaknesses.append(f"Speaking too fast: you averaged {avg_wpm:.1f} WPM, which can make answers hard to follow.")
            weaknesses_detail.append({
                "category": "Communication",
                "title": "Speaking too fast",
                "description": "Above 165 words per minute, detailed explanations become hard to follow.",
                "evidence": f"{avg_wpm:.1f} WPM",
                "severity": "Medium",
            })
        elif 0.0 < avg_wpm < 110.0:
            weaknesses.append(f"Speaking slowly: you averaged {avg_wpm:.1f} WPM, which makes answers feel long.")
            weaknesses_detail.append({
                "category": "Communication",
                "title": "Speaking slowly",
                "description": "Below 110 words per minute, answers can sound hesitant.",
                "evidence": f"{avg_wpm:.1f} WPM",
                "severity": "Medium",
            })

        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        fillers = comm_metrics.get("total_fillers", 0)
        if hesitation > 5.0 or fillers >= 4:
            weaknesses.append(f"Filler words: you used {fillers} fillers like \"um\" and \"uh\" ({hesitation:.1f}% hesitation).")
            weaknesses_detail.append({
                "category": "Communication",
                "title": "Filler words",
                "description": "Frequent fillers (\"um\", \"uh\", \"you know\") break up your answers.",
                "evidence": f"{fillers} fillers, {hesitation:.1f}% hesitation",
                "severity": "Medium",
            })

        pause_sec = comm_metrics.get("total_pause_duration_seconds", 0.0)
        if pause_sec >= 3.0:
            weaknesses.append(f"Long silences: {pause_sec:.1f}s of silence in total while you were answering.")
            weaknesses_detail.append({
                "category": "Communication",
                "title": "Long silences",
                "description": "Long pauses made the answers feel stop-start.",
                "evidence": f"{pause_sec:.1f}s of pauses",
                "severity": "Low",
            })

    if has_vision:
        if stress_ok and (stress_score >= 65.0 or stress_level == "Elevated"):
            weaknesses.append(f"Visible tension: the analysis saw signs of stress ({round(stress_score)}%).")
            weaknesses_detail.append({
                "category": "Behavioral",
                "title": "Visible tension",
                "description": "Your speech and expression showed signs of nervousness.",
                "evidence": f"{round(stress_score)}% stress",
                "severity": "Medium",
            })
        elif facial_summary.get("overall_composure") == "Fluctuating Composure":
            weaknesses.append("Changing expression: your expression shifted a lot during your answers.")
            weaknesses_detail.append({
                "category": "Behavioral",
                "title": "Changing expression",
                "description": "The face analysis saw your expression change often.",
                "evidence": "Fluctuating Composure",
                "severity": "Low",
            })

    if skipped_q > 0:
        weaknesses.append(f"Skipped questions: you skipped {skipped_q} question(s), which count as zero.")
        weaknesses_detail.append({
            "category": "Completeness",
            "title": "Skipped questions",
            "description": "Unanswered questions lowered your overall score.",
            "evidence": f"{skipped_q} skipped",
            "severity": "High",
        })

    if failed_q > 0:
        weaknesses.append(f"{failed_q} answer(s) could not be processed because the recording was unreadable.")
        weaknesses_detail.append({
            "category": "Processing",
            "title": "Unreadable recordings",
            "description": "Some recordings could not be read, so those answers were not scored.",
            "evidence": f"{failed_q} answer(s)",
            "severity": "High",
        })

    if not weaknesses:
        weaknesses.append("Room to polish: talk through trade-offs and edge cases to make strong answers even better.")
        weaknesses_detail.append({
            "category": "Refinement",
            "title": "Room to polish",
            "description": "Your answers were strong; discussing trade-offs, standard practice and edge cases would make them stand out.",
            "evidence": "Score >= 85%",
            "severity": "Low",
        })

    # -------------------------------------------------------------------------
    # FR27: Provide Improvement Suggestions & Coaching (FR 27-01, FR 27-02, FR 27-03)
    # -------------------------------------------------------------------------
    suggestions: List[str] = []
    coaching_guidance: List[Dict] = []
    preparation_strategies: List[str] = []

    if missing:
        suggestions.append(f"Review the missing points: prepare short, real examples that show {', '.join(missing[:2])}.")
        coaching_guidance.append({
            "domain": "Knowledge",
            "action": f"Review {', '.join(missing[:2])}",
            "practice_strategy": "Write a short definition and one real example for each point, then explain it out loud.",
            "target_metric": "Cover most key points in each answer",
        })

    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        if avg_wpm > 165.0:
            suggestions.append("Slow down: take a breath between points and aim for about 130–150 WPM.")
            coaching_guidance.append({
                "domain": "Speaking pace",
                "action": "Slow down",
                "practice_strategy": "Read a practice answer aloud at a calm pace, pausing briefly after each point.",
                "target_metric": "120–150 WPM",
            })
        elif 0.0 < avg_wpm < 110.0:
            suggestions.append("Pick up the pace a little: aim for about 125–140 WPM and keep answers to the point.")
            coaching_guidance.append({
                "domain": "Speaking pace",
                "action": "Speed up slightly",
                "practice_strategy": "Jot down three points before you answer, then go through them without long breaks.",
                "target_metric": "At least 120 WPM",
            })

        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        if hesitation > 4.0 or comm_metrics.get("total_fillers", 0) >= 3:
            suggestions.append("Pause instead of saying \"um\": take two seconds to plan before you answer.")
            coaching_guidance.append({
                "domain": "Filler words",
                "action": "Replace fillers with short pauses",
                "practice_strategy": "When you feel an \"um\" coming, stop for a moment instead. A short silence sounds more confident.",
                "target_metric": "Under 2.5% hesitation",
            })

        if comm_metrics.get("total_pause_duration_seconds", 0.0) >= 3.0:
            suggestions.append("Think out loud: instead of long silences, say how you are approaching it (\"Let me break this into two parts...\").")
            coaching_guidance.append({
                "domain": "Long silences",
                "action": "Talk through your thinking",
                "practice_strategy": "Practise saying your approach out loud so the interviewer can follow your reasoning.",
                "target_metric": "No silence longer than 1.5 seconds",
            })

    if has_vision and ((stress_ok and stress_score >= 60.0) or facial_summary.get("overall_composure") != "Composed & Stable"):
        suggestions.append("Practise on camera: look at the lens and keep a relaxed, steady expression.")
        coaching_guidance.append({
            "domain": "On camera",
            "action": "Keep eye contact with the camera",
            "practice_strategy": "Put your webcam at eye level and look at the lens while you answer.",
            "target_metric": "Steady, calm expression",
        })

    coaching_guidance.append({
        "domain": "Structuring answers",
        "action": "Use the STAR method",
        "practice_strategy": "For situation questions, cover the Situation, Task, Action and Result. For technical questions, give your answer first, then explain why.",
        "target_metric": "Clear, well-ordered answers",
    })

    preparation_strategies.append(
        "Practise under real conditions: record timed answers of about two minutes and read back your transcript."
    )
    if missing:
        preparation_strategies.append(
            f"Focus your next study session on {', '.join(missing[:2])}, with real examples."
        )
    preparation_strategies.append(
        "Retake this interview track and check whether your pace and key points improve."
    )

    if not suggestions:
        suggestions.append(
            "Go deeper: mention trade-offs, standard practice and edge cases in your answers."
        )
        suggestions.append(
            "Back up each point with a real example from your experience or studies."
        )

    return {
        "score_explanation": {
            "overall_summary": overall_summary,
            "score_rationale": score_rationale,
            "dimension_breakdown": {
                "technical": tech_breakdown,
                "communication": comm_breakdown,
                "behavioral": behav_breakdown,
            },
            "behavioral_observations": observations,
        },
        "strengths": strengths[:4],
        "strengths_detail": strengths_detail[:4],
        "weaknesses": weaknesses[:4],
        "weaknesses_detail": weaknesses_detail[:4],
        "suggestions": suggestions[:4],
        "coaching_guidance": coaching_guidance[:3],
        "preparation_strategies": preparation_strategies[:3],
    }
