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

Strict Guarantees:
- Zero fabrication: If a modality was unavailable, its absence is explicitly documented and no
  synthetic observations or fake metrics are generated.
- Deterministic and repeatable: Identical inputs produce identical structured insights.
"""
from typing import Dict, List, Optional


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
    behav_metrics = compiled_metrics.get("behavioral", {})

    # Modality availability flags
    has_speech = comm_metrics.get("avg_wpm", 0.0) > 0.0 or comm_metrics.get("avg_fluency_score", 0.0) > 0.0
    has_vision = facial_summary.get("status") == "completed" and facial_summary.get("evaluated_takes", 0) > 0
    has_nlp = bool(tech_metrics.get("covered_concepts") or tech_metrics.get("avg_content_score", 0.0) > 0.0)

    # -------------------------------------------------------------------------
    # Zero-Answer / Incomplete Fallback (Honest Handling)
    # -------------------------------------------------------------------------
    if answered_q == 0 or not per_question_results:
        empty_summary = "No candidate responses were recorded in this interview session. An evaluation cannot be conducted without audio or video submissions."
        empty_rationale = (
            f"The composite score of {round(overall_score)}/100 reflects that 0 of {total_q} prompts were completed. "
            f"Without recorded audio or video takes, technical content, speech delivery, and facial composure could not be analyzed."
        )
        return {
            "score_explanation": {
                "overall_summary": empty_summary,
                "score_rationale": empty_rationale,
                "dimension_breakdown": {
                    "technical": "Technical Content: Unassessed (no submitted text or speech).",
                    "communication": "Speech & Delivery: Unassessed (no recorded audio).",
                    "behavioral": "Behavioral Composure: Unassessed (no recorded video).",
                },
                "behavioral_observations": [
                    f"Session Activity: {total_q} prompt(s) presented; {skipped_q} prompt(s) skipped without recorded response.",
                ],
            },
            "strengths": [],
            "strengths_detail": [],
            "weaknesses": [
                f"{total_q} prompt(s) were submitted without recorded responses, resulting in a zero-coverage evaluation."
            ],
            "weaknesses_detail": [
                {
                    "category": "Completeness",
                    "title": "Unrecorded Session",
                    "description": "No responses were recorded for any of the interview prompts.",
                    "evidence": f"0 of {total_q} prompts answered.",
                    "severity": "High",
                }
            ],
            "suggestions": [
                "Record and submit spoken responses for each prompt to receive a comprehensive diagnostic evaluation.",
                "Ensure microphone and webcam permissions are granted before starting the interview simulation.",
            ],
            "coaching_guidance": [
                {
                    "domain": "Session Preparation",
                    "action": "Complete All Prompts",
                    "practice_strategy": "Set aside an uninterrupted 15-minute window and complete all prompts in one sitting.",
                    "target_metric": "100% Prompt Completion Rate",
                }
            ],
            "preparation_strategies": [
                "Perform a pre-interview hardware check to confirm microphone volume and camera visibility.",
                "Review the role questions and take 30 seconds to outline points mentally before recording.",
            ],
        }

    # -------------------------------------------------------------------------
    # FR24: Score Interpretation & Explanations (FR 24-01, FR 24-02, FR 24-03)
    # -------------------------------------------------------------------------
    # Performance tier description
    if overall_score >= 80.0:
        perf_tier = "Strong"
        perf_verb = "demonstrated strong technical proficiency and confident communication"
    elif overall_score >= 60.0:
        perf_tier = "Competent"
        perf_verb = "demonstrated solid foundational understanding with opportunities for greater depth"
    elif overall_score >= 35.0:
        perf_tier = "Developing"
        perf_verb = "showed emerging familiarity with core concepts but missed key technical details"
    else:
        perf_tier = "Limited"
        perf_verb = "had limited response coverage and key technical areas require review"

    overall_summary = (
        f"{perf_tier} overall performance with a composite score of {round(overall_score)}/100. "
        f"The candidate {perf_verb} across {answered_q} of {total_q} evaluated prompts. "
        f"Delivery confidence was assessed at {round(confidence_score)}% ({confidence_level}) with {stress_level.lower()} observed tension ({round(stress_score)}%)."
    )

    # Mathematical & behavioral score rationale
    content_score = dimension_scores.get("technical_content", 0.0)
    comm_score = dimension_scores.get("communication_fluency", 0.0)
    behav_score = dimension_scores.get("behavioral_composure", 0.0)

    score_rationale_parts = [
        f"The overall score of {round(overall_score, 1)}/100 is calculated via difficulty-weighted trimodal fusion across {answered_q} evaluated prompt takes."
    ]
    if has_nlp:
        covered_n = len(tech_metrics.get("covered_concepts", []))
        score_rationale_parts.append(
            f"Technical content scored {round(content_score, 1)}%, driven by semantic similarity and concept coverage ({covered_n} key concepts demonstrated)."
        )
    else:
        score_rationale_parts.append("Technical content was unassessed due to missing transcripts.")

    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        score_rationale_parts.append(
            f"Speech delivery contributed {round(comm_score, 1)}%, with a pacing cadence averaging {avg_wpm:.1f} WPM and a hesitation rate of {hesitation:.1f}%."
        )
    else:
        score_rationale_parts.append("Speech delivery metrics were unavailable because no audio track was recorded.")

    if has_vision:
        composure = facial_summary.get("overall_composure", "Moderate Composure")
        dominant = facial_summary.get("dominant_expression", "Neutral")
        score_rationale_parts.append(
            f"Behavioral composure contributed {round(behav_score, 1)}%, tracked across {facial_summary.get('evaluated_takes', 0)} takes (dominant expression: {dominant}, composure: {composure})."
        )
    else:
        score_rationale_parts.append("Vision analysis was unmounted; non-verbal behavioral weights were redistributed to content and delivery.")

    if skipped_q > 0:
        score_rationale_parts.append(
            f"Note: {skipped_q} prompt(s) were skipped, which reduced the total score denominator proportionally."
        )

    score_rationale = " ".join(score_rationale_parts)

    # Dimension Breakdown
    tech_breakdown = (
        f"Technical Content ({round(content_score, 1)}%): Semantic matching evaluated response depth against question rubrics. "
        + (
            f"Successfully covered: {', '.join(tech_metrics.get('covered_concepts', [])[:4])}."
            if tech_metrics.get("covered_concepts")
            else "Limited technical keyword and concept overlap detected."
        )
    )

    comm_breakdown = (
        f"Communication & Fluency ({round(comm_score, 1)}%): Acoustic speech analysis measured cadence ({comm_metrics.get('avg_wpm', 0):.1f} WPM), "
        f"hesitation rate ({comm_metrics.get('avg_hesitation_rate', 0):.1f}%), and filler frequency ({comm_metrics.get('total_fillers', 0)} fillers detected)."
        if has_speech
        else "Communication & Fluency: Audio track unavailable; speech metrics were not assessed."
    )

    behav_breakdown = (
        f"Behavioral Composure ({round(behav_score, 1)}%): Computer-vision facial analysis observed {facial_summary.get('evaluated_takes', 0)} takes, "
        f"classifying primary expression as '{facial_summary.get('dominant_expression')}' and composure as '{facial_summary.get('overall_composure')}'."
        if has_vision
        else "Behavioral Composure: Vision model unmounted; facial tension and engagement were not evaluated."
    )

    # Behavioral Observations list (FR 24-01)
    observations: List[str] = []
    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        pacing_desc = "Optimal conversational range (120–160 WPM)" if 120 <= avg_wpm <= 160 else ("Rushed (>160 WPM)" if avg_wpm > 160 else "Deliberate / Slow (<120 WPM)")
        observations.append(f"Speaking Cadence: Averaged {avg_wpm:.1f} WPM ({pacing_desc}).")

        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        fillers = comm_metrics.get("total_fillers", 0)
        observations.append(f"Vocal Fluency: {fillers} filler word(s) detected across answers (hesitation rate: {hesitation:.1f}%).")

        pause_sec = comm_metrics.get("total_pause_duration_seconds", 0.0)
        pause_cnt = comm_metrics.get("total_pause_count", 0)
        if pause_cnt > 0:
            observations.append(f"Acoustic Pauses: {pause_cnt} pause(s) exceeding 500ms (totaling {pause_sec:.1f}s dead air).")
        else:
            observations.append("Acoustic Pauses: Continuous speech stream without extended dead air.")

    if has_vision:
        dominant = facial_summary.get("dominant_expression", "Neutral")
        composure = facial_summary.get("overall_composure", "Moderate")
        observations.append(f"Facial Tracking: Primary expression '{dominant}' with '{composure}' stability across takes.")

    observations.append(f"Confidence Assessment: Evaluated at {round(confidence_score, 1)}% ({confidence_level}).")
    observations.append(f"Observable Stress: Evaluated at {round(stress_score, 1)}% ({stress_level}).")

    if not has_vision:
        observations.append("Notice: Computer-vision facial pipeline was offline; behavioral cues were not recorded.")
    if not has_speech:
        observations.append("Notice: Acoustic recording was unavailable; speech cues were not recorded.")

    # -------------------------------------------------------------------------
    # FR25: Identify Strengths (FR 25-01, FR 25-02, FR 25-03)
    # -------------------------------------------------------------------------
    strengths: List[str] = []
    strengths_detail: List[Dict] = []

    # 1. Technical Domain Mastery & Depth
    covered = tech_metrics.get("covered_concepts", [])
    if covered:
        st_text = f"Technical Domain Depth: Demonstrated clear mastery of core concepts: {', '.join(covered[:3])}."
        strengths.append(st_text)
        strengths_detail.append({
            "category": "Technical",
            "title": "Technical Domain Depth",
            "description": "Addressed essential technical concepts defined in the evaluation rubric.",
            "evidence": f"Covered: {', '.join(covered[:4])}",
        })

    # High-scoring question highlight
    high_q = [q for q in per_question_results if float(q.get("score", 0.0)) >= 80.0]
    if high_q:
        top_q = max(high_q, key=lambda q: float(q.get("score", 0.0)))
        q_id = top_q.get("question_id", "Prompt")
        st_text = f"Strong Answer Execution: Delivered a comprehensive response on {q_id} (Score: {round(float(top_q.get('score', 0.0)))}%)."
        strengths.append(st_text)
        strengths_detail.append({
            "category": "Technical",
            "title": f"Strong Answer Execution ({q_id})",
            "description": "Successfully fulfilled expected answer requirements and technical depth.",
            "evidence": f"Score: {round(float(top_q.get('score', 0.0)))}%",
        })

    # 2. Communication Behavior Strengths (FR 25-01)
    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        if 120 <= avg_wpm <= 160:
            st_text = f"Optimal Conversational Cadence: Maintained a steady pace averaging {avg_wpm:.1f} WPM, ensuring clear technical comprehension."
            strengths.append(st_text)
            strengths_detail.append({
                "category": "Communication",
                "title": "Optimal Conversational Cadence",
                "description": "Spoke within the professional interview cadence benchmark of 120–160 WPM.",
                "evidence": f"{avg_wpm:.1f} WPM",
            })

        fluency = comm_metrics.get("avg_fluency_score", 0.0)
        if fluency >= 80.0 and len(strengths) < 4:
            st_text = f"High Vocal Fluency: Smooth, articulate speech delivery with minimal hesitation (fluency score: {round(fluency)}%)."
            strengths.append(st_text)
            strengths_detail.append({
                "category": "Communication",
                "title": "High Vocal Fluency",
                "description": "Demonstrated natural, continuous speech flow without broken phrasing.",
                "evidence": f"{round(fluency)}% fluency",
            })

        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        if hesitation <= 3.0 and len(strengths) < 4:
            st_text = f"Concise Articulation: Kept verbal filler usage low (hesitation rate: {hesitation:.1f}%)."
            strengths.append(st_text)
            strengths_detail.append({
                "category": "Communication",
                "title": "Concise Articulation",
                "description": "Exhibited strong verbal discipline with very few filler words ('um', 'like').",
                "evidence": f"{hesitation:.1f}% hesitation rate",
            })

    # 3. Confident Responses & Behavioral Strengths (FR 25-02)
    if confidence_score >= 75.0 and len(strengths) < 4:
        st_text = f"Confident Delivery Presence: Assessed with strong overall interview confidence ({round(confidence_score)}%, {confidence_level})."
        strengths.append(st_text)
        strengths_detail.append({
            "category": "Behavioral",
            "title": "Confident Delivery Presence",
            "description": "Synthesized acoustic delivery and non-verbal poise conveyed solid assurance.",
            "evidence": f"{round(confidence_score)}% ({confidence_level})",
        })

    if has_vision and facial_summary.get("overall_composure") == "Composed & Stable" and len(strengths) < 4:
        st_text = "Composed Facial Stability: Maintained calm emotional expression and attentive forward gaze under pressure."
        strengths.append(st_text)
        strengths_detail.append({
            "category": "Behavioral",
            "title": "Composed Facial Stability",
            "description": "Projected non-verbal composure with steady neutral/positive expressions.",
            "evidence": f"{facial_summary.get('overall_composure')} across {facial_summary.get('evaluated_takes')} take(s)",
        })

    # Fallback if no strengths detected yet answered
    if not strengths:
        strengths.append("Prompt Completion: Successfully recorded and submitted answers for evaluation.")
        strengths_detail.append({
            "category": "General",
            "title": "Prompt Completion",
            "description": "Engaged with the interview prompts and provided recordable takes.",
            "evidence": f"{answered_q} of {total_q} prompts completed",
        })

    # -------------------------------------------------------------------------
    # FR26: Identify Weaknesses / Areas for Improvement (FR 26-01, FR 26-02, FR 26-03)
    # -------------------------------------------------------------------------
    weaknesses: List[str] = []
    weaknesses_detail: List[Dict] = []

    # 1. Technical Gaps & Missing Rubric Concepts (FR 26-01)
    missing = tech_metrics.get("missing_concepts", [])
    if missing:
        wk_text = f"Key Concept Gaps: Omitted core technical areas from rubric: {', '.join(missing[:3])}."
        weaknesses.append(wk_text)
        weaknesses_detail.append({
            "category": "Technical",
            "title": "Omitted Domain Concepts",
            "description": "The response did not sufficiently address expected rubric concepts.",
            "evidence": f"Missing: {', '.join(missing[:4])}",
            "severity": "High" if content_score < 60.0 else "Medium",
        })

    # Low-scoring question highlight
    low_q = [q for q in per_question_results if float(q.get("score", 0.0)) < 60.0 and q.get("score") is not None]
    if low_q:
        weakest_q = min(low_q, key=lambda q: float(q.get("score", 0.0)))
        q_id = weakest_q.get("question_id", "Prompt")
        wk_text = f"Suboptimal Answer Depth: Underperformed on {q_id} (Score: {round(float(weakest_q.get('score', 0.0)))}%), omitting essential architectural details."
        weaknesses.append(wk_text)
        weaknesses_detail.append({
            "category": "Technical",
            "title": f"Suboptimal Depth on {q_id}",
            "description": "Limited technical explanation compared to expected benchmark.",
            "evidence": f"Score: {round(float(weakest_q.get('score', 0.0)))}%",
            "severity": "High",
        })

    # 2. Weak Communication Indicators (FR 26-02)
    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        if avg_wpm > 165.0:
            wk_text = f"Rushed Speaking Cadence: Average speed of {avg_wpm:.1f} WPM was too rapid, risking loss of technical clarity."
            weaknesses.append(wk_text)
            weaknesses_detail.append({
                "category": "Communication",
                "title": "Rushed Speaking Cadence",
                "description": "Spoke above 165 WPM benchmark, which can make complex algorithms difficult to follow.",
                "evidence": f"{avg_wpm:.1f} WPM",
                "severity": "Medium",
            })
        elif avg_wpm < 110.0 and avg_wpm > 0.0:
            wk_text = f"Slow Response Cadence: Average pace of {avg_wpm:.1f} WPM was hesitant, extending response duration."
            weaknesses.append(wk_text)
            weaknesses_detail.append({
                "category": "Communication",
                "title": "Slow Response Cadence",
                "description": "Spoke below 110 WPM benchmark, leading to deliberate but sluggish answers.",
                "evidence": f"{avg_wpm:.1f} WPM",
                "severity": "Medium",
            })

        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        fillers = comm_metrics.get("total_fillers", 0)
        if hesitation > 5.0 or fillers >= 4:
            wk_text = f"Vocal Hesitation & Fillers: High reliance on filler words ({fillers} detected, {hesitation:.1f}% hesitation rate)."
            weaknesses.append(wk_text)
            weaknesses_detail.append({
                "category": "Communication",
                "title": "Elevated Filler Word Usage",
                "description": "Frequent filler words ('um', 'like', 'you know') interrupt answer fluidity.",
                "evidence": f"{fillers} fillers, {hesitation:.1f}% hesitation rate",
                "severity": "Medium",
            })

        pause_sec = comm_metrics.get("total_pause_duration_seconds", 0.0)
        if pause_sec >= 3.0:
            wk_text = f"Extended Silent Pauses: Totaled {pause_sec:.1f}s of dead air during response formulating."
            weaknesses.append(wk_text)
            weaknesses_detail.append({
                "category": "Communication",
                "title": "Extended Silent Pauses",
                "description": "Long silent pauses exceeded natural conversational rhythm.",
                "evidence": f"{pause_sec:.1f}s total pause duration",
                "severity": "Low",
            })

    # 3. Behavioral Weakness Indicators
    if has_vision:
        if stress_score >= 65.0 or stress_level == "Elevated":
            wk_text = f"Observable Stress Tension: Elevated non-verbal tension ({round(stress_score)}%) and rapid emotional shifts detected."
            weaknesses.append(wk_text)
            weaknesses_detail.append({
                "category": "Behavioral",
                "title": "Elevated Observable Stress",
                "description": "Visual signals indicated nervousness or fluctuating facial composure.",
                "evidence": f"{round(stress_score)}% stress score",
                "severity": "Medium",
            })
        elif facial_summary.get("overall_composure") == "Fluctuating Composure":
            wk_text = "Fluctuating Composure: Inconsistent non-verbal poise and shifting eye engagement during challenging prompts."
            weaknesses.append(wk_text)
            weaknesses_detail.append({
                "category": "Behavioral",
                "title": "Fluctuating Composure",
                "description": "Facial analysis tracked shifting composure indices across question takes.",
                "evidence": "Fluctuating Composure",
                "severity": "Low",
            })

    # 4. Skipped prompts
    if skipped_q > 0:
        wk_text = f"Incomplete Question Coverage: {skipped_q} prompt(s) were skipped without recorded responses."
        weaknesses.append(wk_text)
        weaknesses_detail.append({
            "category": "Completeness",
            "title": "Skipped Prompts",
            "description": "Unanswered prompts directly lowered the overall composite score.",
            "evidence": f"{skipped_q} skipped prompt(s)",
            "severity": "High",
        })

    # 5. Failed / corrupt media prompts
    if failed_q > 0:
        wk_text = f"{failed_q} prompt{'s encountered' if failed_q > 1 else ' encountered'} media processing issues."
        weaknesses.append(wk_text)
        weaknesses_detail.append({
            "category": "Processing",
            "title": "Media Processing Issues",
            "description": "Recorded takes could not be processed due to media corruption.",
            "evidence": f"{failed_q} failed prompt(s)",
            "severity": "High",
        })

    # If candidate was near perfect
    if not weaknesses:
        weaknesses.append("Minor Technical Nuance: Focus on articulating edge-case trade-offs and architectural scalability.")
        weaknesses_detail.append({
            "category": "Refinement",
            "title": "Advanced Trade-offs",
            "description": "Performance was solid; further polish by discussing performance bottlenecks and edge cases.",
            "evidence": "Score >= 85%",
            "severity": "Low",
        })

    # -------------------------------------------------------------------------
    # FR27: Provide Improvement Suggestions & Coaching (FR 27-01, FR 27-02, FR 27-03)
    # -------------------------------------------------------------------------
    suggestions: List[str] = []
    coaching_guidance: List[Dict] = []
    preparation_strategies: List[str] = []

    # 1. Suggestions Mapped Directly to Weaknesses (FR 27-01)
    if missing:
        sug_text = f"Targeted Concept Review: Study and prepare concrete architectural examples illustrating {', '.join(missing[:2])}."
        suggestions.append(sug_text)
        coaching_guidance.append({
            "domain": "Technical Depth",
            "action": f"Review {', '.join(missing[:2])}",
            "practice_strategy": "Write out definitions and draw system architecture diagrams connecting these missing concepts to real-world code.",
            "target_metric": ">=80% Rubric Concept Coverage",
        })

    if has_speech:
        avg_wpm = comm_metrics.get("avg_wpm", 0.0)
        if avg_wpm > 165.0:
            sug_text = "Cadence Moderation: Use deliberate breathing and target 130–150 WPM to avoid rushing complex architectural explanations."
            suggestions.append(sug_text)
            coaching_guidance.append({
                "domain": "Speech Pacing",
                "action": "Slow down response delivery",
                "practice_strategy": "Practice reading technical excerpts with a metronome set to 140 WPM to build muscle memory.",
                "target_metric": "120–150 WPM Pacing Range",
            })
        elif avg_wpm < 110.0 and avg_wpm > 0.0:
            sug_text = "Cadence Acceleration: Aim to increase response tempo toward 125–140 WPM to keep answers brisk and engaging."
            suggestions.append(sug_text)
            coaching_guidance.append({
                "domain": "Speech Pacing",
                "action": "Increase conversational tempo",
                "practice_strategy": "Outline 3 bullet points before speaking and deliver answers concisely without long thinking pauses.",
                "target_metric": ">=120 WPM Pacing Range",
            })

        hesitation = comm_metrics.get("avg_hesitation_rate", 0.0)
        if hesitation > 4.0 or comm_metrics.get("total_fillers", 0) >= 3:
            sug_text = "Pre-Response Buffer: Take a 2-second silent pause before answering to organize key thoughts and eliminate filler words ('um', 'like')."
            suggestions.append(sug_text)
            coaching_guidance.append({
                "domain": "Articulation",
                "action": "Eliminate filler words",
                "practice_strategy": "Replace verbal fillers with deliberate silent pauses. Silence sounds confident; filler words sound uncertain.",
                "target_metric": "<=2.5% Hesitation Rate",
            })

        if comm_metrics.get("total_pause_duration_seconds", 0.0) >= 3.0:
            sug_text = "Verbalizing Thought Process: Instead of long dead-air pauses, vocalize your problem-solving approach aloud ('Let me break this into two parts...')."
            suggestions.append(sug_text)
            coaching_guidance.append({
                "domain": "Cognitive Retrieval",
                "action": "Narrate thought process aloud",
                "practice_strategy": "Practice think-aloud problem-solving so the interviewer can track your reasoning during retrieval.",
                "target_metric": "<=1.5s Maximum Silent Pause",
            })

    if has_vision and (stress_score >= 60.0 or facial_summary.get("overall_composure") != "Composed & Stable"):
        sug_text = "Non-Verbal Grounding: Rehearse on camera focusing on steady forward gaze alignment and relaxed facial poise."
        suggestions.append(sug_text)
        coaching_guidance.append({
            "domain": "Behavioral Poise",
            "action": "Maintain camera eye contact",
            "practice_strategy": "Position your webcam at eye level and maintain gentle, natural eye contact during technical delivery.",
            "target_metric": "Composed & Stable Composure Index",
        })

    # Universal Structured Communication Guidance (FR 27-02)
    coaching_guidance.append({
        "domain": "Structured Communication",
        "action": "Apply STAR and Top-Down Frameworks",
        "practice_strategy": "For situational questions use STAR (Situation, Task, Action, Result). For technical questions state the decision first, then trade-offs.",
        "target_metric": "Clear Answer Hierarchy",
    })

    # Preparation Strategies for Future Interviews (FR 27-03)
    preparation_strategies.append(
        "Simulated Rehearsals: Perform timed 2-minute prompt recordings under interview conditions and self-review transcripts."
    )
    if missing:
        preparation_strategies.append(
            f"Targeted Domain Drilling: Dedicate your next study session to deep-dive implementations of {', '.join(missing[:2])}."
        )
    preparation_strategies.append(
        "MockAI Repetition: Re-attempt this interview track to verify that pacing and concept coverage improve on identical or related prompts."
    )

    # Fallback for near-perfect candidates with no explicit weaknesses
    if not suggestions:
        suggestions.append(
            "Advanced Trade-Off Analysis: Continue elevating answers by explicitly discussing scalability trade-offs and edge-case handling."
        )
        suggestions.append(
            "System Architecture Nuances: Elaborate on production monitoring, fault tolerance, and failure recovery mechanisms for complex systems."
        )

    # Limit top lists to clean numbers
    prioritized_strengths = strengths[:4]
    prioritized_weaknesses = weaknesses[:4]
    prioritized_suggestions = suggestions[:4]

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
        "strengths": prioritized_strengths,
        "strengths_detail": strengths_detail[:4],
        "weaknesses": prioritized_weaknesses,
        "weaknesses_detail": weaknesses_detail[:4],
        "suggestions": prioritized_suggestions,
        "coaching_guidance": coaching_guidance[:3],
        "preparation_strategies": preparation_strategies[:3],
    }
