"""
Confidence & Stress Analysis Service (FR22 / FR23).

Implements report-required behavioral evaluation by synthesizing:
- Speech Delivery Signals (FR22-02, FR23-02): speaking pace / WPM, fluency score,
  hesitation rate, filler words, and acoustic pauses.
- Facial Behavioral Signals (FR22-01, FR23-01): model-derived facial expression
  distribution, composure index, observable tension, and engagement level.

Produces:
- FR22: Bounded 0–100 Confidence Score and categorical level ("High" | "Moderate" | "Developing" | "Low").
- FR23: Bounded 0–100 Stress Score and categorical indicator ("Low" | "Moderate" | "Elevated").

Integrity rules (v2):
- Confidence and stress are INFERENCES and require adequate spoken evidence
  (the report's verbal-primacy principle, FR22-02 / FR23-02). With no or too
  little recognised speech they are "Not Assessed"; facial observations are
  still reported but never stand in for the missing speech.
- Missing or unsupported signals can never raise confidence or lower stress:
  * camera presence is not engagement and adds nothing to confidence;
  * a neutral/happy face is not evidence of confidence;
  * the absence of negative facial expressions is not evidence of low stress,
    so facial stress only contributes when tension is actually observed.
- Speech confidence combines delivery fluency with explicit verbal-uncertainty
  markers in the transcript ("I don't know", "I can't answer", hedges).
- All mappings below are uncalibrated heuristics (no labelled validation data
  yet); outputs carry evidence_quality and assessment_basis so the UI and the
  report can present them honestly.
"""
from typing import Dict, List, Optional, Tuple

# Base weights for dual-modality fusion
CONFIDENCE_WEIGHTS = {
    "speech": 0.60,
    "vision": 0.40,
}

STRESS_WEIGHTS = {
    "speech": 0.50,
    "vision": 0.50,
}

METHOD = "behavioural heuristic v2 (uncalibrated)"

# Minimum spoken evidence before confidence / stress are inferred at all.
# Filler / hesitation RATES over a dozen words are dominated by noise (one
# filler in 12 words is an "8% filler rate"), so short answers are reported as
# Not Assessed instead of producing extreme scores.
MIN_WORDS_FOR_ASSESSMENT = 20
MIN_SECONDS_FOR_ASSESSMENT = 6.0

# Facial expression-consistency -> confidence component. Engagement and
# expression valence are deliberately NOT used (see module docstring).
_FACIAL_CONFIDENCE_BY_COMPOSURE = {
    "Composed & Stable": 75.0,
    "Moderate Composure": 60.0,
    "Fluctuating Composure": 40.0,
}

# Speech confidence = DELIVERY_SHARE * fluency-based delivery + rest * verbal certainty
DELIVERY_SHARE = 0.70
UNCERTAINTY_PENALTY_PER_100_WORDS = 12.5


def derive_confidence_level(score: float) -> str:
    """Maps 0–100 confidence score to human-readable categorical level (FR22-03)."""
    if score >= 80.0:
        return "High"
    elif score >= 60.0:
        return "Moderate"
    elif score >= 40.0:
        return "Developing"
    else:
        return "Low"


def derive_stress_level(score: float) -> str:
    """Maps 0–100 stress score to human-readable categorical indicator (FR23-03)."""
    if score < 35.0:
        return "Low"
    elif score < 65.0:
        return "Moderate"
    else:
        return "Elevated"


def _calculate_speech_confidence(delivery_result: Dict) -> float:
    """
    Evaluates speech delivery confidence from vocal fluency, pace consistency, and hesitation.
    """
    fluency = float(delivery_result.get("fluency_score", 0.0))
    pacing = delivery_result.get("pacing", "Optimal")
    hesitation = float(delivery_result.get("hesitation_rate", 0.0))

    score = fluency
    # Penalize erratic pacing
    if pacing in ("Rushed", "Slow"):
        score -= 5.0
    # Penalize elevated vocal hesitation
    if hesitation > 8.0:
        score -= 10.0
    elif hesitation > 5.0:
        score -= 5.0

    return min(100.0, max(0.0, score))


def _facial_indicators_assessed(facial_result: Optional[Dict]) -> bool:
    if not facial_result or facial_result.get("status") != "completed" or not facial_result.get("face_detected"):
        return False
    composure = (facial_result.get("behavioral_indicators") or {}).get("composure_index")
    return composure in _FACIAL_CONFIDENCE_BY_COMPOSURE


def _calculate_facial_confidence(facial_result: Dict) -> Optional[float]:
    """
    Facial confidence component from MEASURED expression consistency only.
    Returns None when the facial indicators were not assessed (insufficient
    evidence), so the face cannot contribute.
    """
    if not _facial_indicators_assessed(facial_result):
        return None
    indicators = facial_result.get("behavioral_indicators", {})
    base = _FACIAL_CONFIDENCE_BY_COMPOSURE[indicators["composure_index"]]
    if indicators.get("observable_tension") == "Elevated":
        base -= 10.0
    return min(100.0, max(0.0, base))


def _verbal_certainty(language_result: Optional[Dict]) -> Optional[Dict]:
    """Explicit uncertainty markers in the transcript (from language_analyzer):
    self-reported inability ("I don't know", "I can't answer", "sorry") and
    hedges ("maybe", "I think"). Returns None if no language analysis exists."""
    if not language_result or language_result.get("status") != "completed":
        return None
    tone = language_result.get("tone") or {}
    words = max(1, int(language_result.get("word_count") or 0))
    negative = list(tone.get("negative_phrases") or [])
    hedges = list(tone.get("hedges") or [])
    density = (len(negative) + len(hedges)) / max(words, 30) * 100.0
    certainty = round(max(0.0, 100.0 - density * UNCERTAINTY_PENALTY_PER_100_WORDS), 1)
    return {"verbal_certainty": certainty, "uncertainty_statements": negative, "hedges": hedges}


def _calculate_speech_stress(delivery_result: Dict) -> float:
    """
    Evaluates acoustic stress from filler hesitation rate, rushed speech anxiety, and dead-air pauses.
    """
    hesitation = float(delivery_result.get("hesitation_rate", 0.0))
    pacing = delivery_result.get("pacing", "Optimal")
    pause_dur = float(delivery_result.get("pause_duration_seconds", 0.0))
    pause_cnt = int(delivery_result.get("pause_count", 0))
    fluency = float(delivery_result.get("fluency_score", 0.0))

    # Baseline stress from hesitation rate (e.g. rate 2.0 -> 15.0; rate 6.0 -> 45.0; rate 10.0 -> 75.0)
    base_stress = min(75.0, hesitation * 7.5)

    # Rushed speech penalty (speech anxiety symptom)
    rushed_pen = 15.0 if pacing == "Rushed" else 0.0

    # Long hesitation pause penalty
    pause_pen = 10.0 if (pause_dur >= 3.0 or pause_cnt >= 3) else 0.0

    # Disfluency residual
    disfluency_pen = (100.0 - fluency) * 0.20

    total_stress = base_stress + rushed_pen + pause_pen + disfluency_pen
    return min(100.0, max(0.0, total_stress))


def _calculate_facial_stress(facial_result: Dict) -> Optional[float]:
    """
    Facial stress component. Contributes ONLY when tension is actually observed
    (negative expression classes); a calm-looking or neutral face is not
    evidence of low stress, and changing expressions alone are not stress.
    Returns None when there is no positive evidence of tension.
    """
    if not _facial_indicators_assessed(facial_result):
        return None
    tension = (facial_result.get("behavioral_indicators") or {}).get("observable_tension")
    if tension == "Elevated":
        return 80.0
    if tension == "Moderate":
        return 50.0
    return None


def _speech_evidence_state(delivery_result: Optional[Dict]) -> str:
    """'adequate' | 'insufficient' (some words, too few) | 'none'."""
    if not delivery_result or delivery_result.get("status") != "completed":
        return "none"
    words = int(delivery_result.get("word_count") or 0)
    if words == 0:
        return "none"
    seconds = float(delivery_result.get("duration_seconds") or 0.0)
    if words < MIN_WORDS_FOR_ASSESSMENT or (seconds and seconds < MIN_SECONDS_FOR_ASSESSMENT):
        return "insufficient"
    return "adequate"


def _facial_evidence_dict(facial_result: Optional[Dict], facial_conf, facial_stress) -> Optional[Dict]:
    if not facial_result or facial_result.get("status") != "completed" or not facial_result.get("face_detected"):
        return None
    ind = facial_result.get("behavioral_indicators") or {}
    return {
        "dominant_expression": facial_result.get("dominant_expression", "Not Observed"),
        "composure_index": ind.get("composure_index", "Not Assessed"),
        "engagement_level": ind.get("engagement_level", "Not Assessed"),
        "observable_tension": ind.get("observable_tension", "Not Assessed"),
        "evidence_quality": facial_result.get("evidence_quality"),
        "facial_confidence": facial_conf,
        "facial_stress": facial_stress,
        "used_for_confidence": facial_conf is not None,
        "used_for_stress": facial_stress is not None,
    }


def analyze_question_confidence_and_stress(
    delivery_result: Optional[Dict],
    facial_result: Optional[Dict],
    language_result: Optional[Dict] = None,
) -> Dict:
    """
    Per-question confidence (FR22) and stress (FR23) from measured evidence.

    Returns (schema unchanged, fields added):
      confidence_score, confidence_level ("High" | "Moderate" | "Developing" | "Low" | "Not Assessed"),
      stress_score, stress_level ("Low" | "Moderate" | "Elevated" | "Not Assessed"),
      modality_status, speech_evidence, facial_evidence, rationale,
      evidence_quality ("sufficient" | "insufficient"), assessment_basis, method.
    """
    speech_state = _speech_evidence_state(delivery_result)
    facial_conf = _calculate_facial_confidence(facial_result) if facial_result else None
    facial_stress = _calculate_facial_stress(facial_result) if facial_result else None
    facial_evidence = _facial_evidence_dict(facial_result, facial_conf, facial_stress)

    modality_status = {
        "speech": "available" if speech_state == "adequate" else ("insufficient" if speech_state == "insufficient" else "unavailable"),
        "vision": "available" if facial_conf is not None or facial_stress is not None
                  else ("observed" if facial_evidence else "unavailable"),
    }

    if speech_state != "adequate":
        if speech_state == "insufficient":
            reason = (f"Too little speech to assess (fewer than {MIN_WORDS_FOR_ASSESSMENT} words or "
                      f"under {MIN_SECONDS_FOR_ASSESSMENT:.0f} s).")
        else:
            reason = "No recognisable speech in this answer."
        if facial_evidence:
            reason += " Facial observations are reported separately but are not enough on their own to infer confidence or stress."
        return {
            "confidence_score": 0.0,
            "confidence_level": "Not Assessed",
            "stress_score": 0.0,
            "stress_level": "Not Assessed",
            "modality_status": modality_status,
            "speech_evidence": None,
            "facial_evidence": facial_evidence,
            "rationale": reason,
            "evidence_quality": "insufficient",
            "assessment_basis": reason,
            "method": METHOD,
        }

    # Speech confidence: delivery fluency + explicit verbal certainty
    delivery_conf = _calculate_speech_confidence(delivery_result)
    verbal = _verbal_certainty(language_result)
    if verbal is not None:
        speech_conf = round(DELIVERY_SHARE * delivery_conf + (1 - DELIVERY_SHARE) * verbal["verbal_certainty"], 1)
    else:
        speech_conf = delivery_conf
    speech_stress = _calculate_speech_stress(delivery_result)

    basis = ["speech delivery (pace, fillers, pauses)"]
    if verbal is not None:
        basis.append(f"verbal certainty ({len(verbal['uncertainty_statements'])} uncertainty statements, {len(verbal['hedges'])} hedges)")

    if facial_conf is not None:
        conf_score = CONFIDENCE_WEIGHTS["speech"] * speech_conf + CONFIDENCE_WEIGHTS["vision"] * facial_conf
        basis.append("facial expression consistency")
    else:
        conf_score = speech_conf
    if facial_stress is not None:
        str_score = STRESS_WEIGHTS["speech"] * speech_stress + STRESS_WEIGHTS["vision"] * facial_stress
        basis.append("observed facial tension")
    else:
        str_score = speech_stress

    conf_score = round(min(100.0, max(0.0, conf_score)), 1)
    str_score = round(min(100.0, max(0.0, str_score)), 1)

    not_used = []
    if facial_evidence and facial_conf is None:
        not_used.append("facial indicators (insufficient facial evidence)")
    elif facial_evidence and facial_stress is None:
        not_used.append("facial stress (no tension observed; a calm face is not evidence of low stress)")
    assessment_basis = "Based on " + ", ".join(basis) + "." + (" Not used: " + "; ".join(not_used) + "." if not_used else "")

    speech_evidence = {
        "fluency_score": delivery_result.get("fluency_score", 0.0),
        "words_per_minute": delivery_result.get("words_per_minute", 0.0),
        "pacing": delivery_result.get("pacing", "Unknown"),
        "hesitation_rate": delivery_result.get("hesitation_rate", 0.0),
        "hesitation_level": delivery_result.get("hesitation_level", "Unknown"),
        "filler_count": delivery_result.get("filler_count", 0),
        "pause_duration_seconds": delivery_result.get("pause_duration_seconds", 0.0),
        "delivery_confidence": delivery_conf,
        "verbal_certainty": verbal["verbal_certainty"] if verbal else None,
        "uncertainty_statements": verbal["uncertainty_statements"] if verbal else [],
        "speech_confidence": speech_conf,
        "speech_stress": speech_stress,
    }

    return {
        "confidence_score": conf_score,
        "confidence_level": derive_confidence_level(conf_score),
        "stress_score": str_score,
        "stress_level": derive_stress_level(str_score),
        "modality_status": modality_status,
        "speech_evidence": speech_evidence,
        "facial_evidence": facial_evidence,
        "rationale": assessment_basis,
        "evidence_quality": "sufficient",
        "assessment_basis": assessment_basis,
        "method": METHOD,
    }


def aggregate_confidence_and_stress(per_question_results: List[Dict]) -> Dict:
    """
    Computes interview-level aggregate confidence and stress assessment across all evaluated takes.
    """
    if not per_question_results:
        return {
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
            "formula": "Dual-modality weighted average across answered/evaluated prompts",
        }

    q_confidences: List[float] = []
    q_stresses: List[float] = []
    speech_conf_list: List[float] = []
    facial_conf_list: List[float] = []
    speech_stress_list: List[float] = []
    facial_stress_list: List[float] = []

    for q in per_question_results:
        cs = q.get("confidence_and_stress")
        # If not already attached, compute on the fly
        if not cs or not isinstance(cs, dict):
            cs = analyze_question_confidence_and_stress(
                q.get("delivery"), q.get("facial_analysis"),
                (q.get("text_analysis") or {}).get("language_analysis"),
            )

        if cs.get("confidence_level") != "Not Assessed":
            q_confidences.append(float(cs["confidence_score"]))
            q_stresses.append(float(cs["stress_score"]))

            sp_ev = cs.get("speech_evidence")
            if sp_ev and sp_ev.get("speech_confidence") is not None:
                speech_conf_list.append(float(sp_ev["speech_confidence"]))
                speech_stress_list.append(float(sp_ev["speech_stress"]))

            fa_ev = cs.get("facial_evidence")
            if fa_ev and fa_ev.get("facial_confidence") is not None:
                facial_conf_list.append(float(fa_ev["facial_confidence"]))
            if fa_ev and fa_ev.get("facial_stress") is not None:
                facial_stress_list.append(float(fa_ev["facial_stress"]))

    evaluated_takes = len(q_confidences)
    if evaluated_takes == 0:
        return {
            "evidence_quality": "insufficient",
            "coverage": {"assessed_answers": 0, "total_questions": len(per_question_results), "ratio": 0.0},
            "method": METHOD,
            "reason": "No answer had enough recognisable speech to assess confidence or stress.",
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
            "formula": "Dual-modality weighted average across answered/evaluated prompts",
        }

    avg_confidence = round(sum(q_confidences) / evaluated_takes, 1)
    avg_stress = round(sum(q_stresses) / evaluated_takes, 1)

    avg_speech_conf = round(sum(speech_conf_list) / len(speech_conf_list), 1) if speech_conf_list else 0.0
    avg_facial_conf = round(sum(facial_conf_list) / len(facial_conf_list), 1) if facial_conf_list else 0.0
    avg_speech_stress = round(sum(speech_stress_list) / len(speech_stress_list), 1) if speech_stress_list else 0.0
    avg_facial_stress = round(sum(facial_stress_list) / len(facial_stress_list), 1) if facial_stress_list else 0.0

    modality_status = {
        "speech": "available" if speech_conf_list else "unavailable",
        "vision": "available" if (facial_conf_list or facial_stress_list) else "unavailable",
    }
    total_q = len(per_question_results)
    coverage = round(evaluated_takes / total_q, 2) if total_q else 0.0
    evidence_quality = "sufficient" if (evaluated_takes >= 2 and coverage >= 0.4) else "limited"

    return {
        "evidence_quality": evidence_quality,
        "coverage": {"assessed_answers": evaluated_takes, "total_questions": total_q, "ratio": coverage},
        "method": METHOD,
        "confidence_score": avg_confidence,
        "confidence_level": derive_confidence_level(avg_confidence),
        "stress_score": avg_stress,
        "stress_level": derive_stress_level(avg_stress),
        "evaluated_takes": evaluated_takes,
        "modality_status": modality_status,
        "summary_evidence": {
            "avg_speech_confidence": avg_speech_conf,
            "avg_speech_stress": avg_speech_stress,
            "avg_facial_confidence": avg_facial_conf,
            "avg_facial_stress": avg_facial_stress,
            "weights": {
                "confidence": CONFIDENCE_WEIGHTS,
                "stress": STRESS_WEIGHTS,
            },
        },
        "formula": "0.60 * speech_confidence + 0.40 * facial_confidence | 0.50 * speech_stress + 0.50 * facial_stress",
    }
