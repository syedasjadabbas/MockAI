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

Integrity guarantees:
- Pure deterministic mathematical assessment on active AI outputs; zero random or hardcoded values.
- Graceful degraded-modality fallback: if speech or vision is missing, the available modality
  is dynamically and proportionally utilized without failing or inventing data.
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

# Facial composure + engagement base confidence mapping
_FACIAL_CONFIDENCE_MAP = {
    ("Composed & Stable", "High"): 88.0,
    ("Composed & Stable", "Moderate"): 78.0,
    ("Composed & Stable", "Low (Gaze Disengaged)"): 65.0,
    ("Moderate Composure", "High"): 72.0,
    ("Moderate Composure", "Moderate"): 60.0,
    ("Moderate Composure", "Low (Gaze Disengaged)"): 45.0,
    ("Fluctuating Composure", "High"): 50.0,
    ("Fluctuating Composure", "Moderate"): 40.0,
    ("Fluctuating Composure", "Low (Gaze Disengaged)"): 30.0,
}


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


def _calculate_facial_confidence(facial_result: Dict) -> float:
    """
    Evaluates non-verbal confidence from emotional composure, engagement, and expression valence.
    """
    indicators = facial_result.get("behavioral_indicators", {})
    composure = indicators.get("composure_index", "Moderate Composure")
    engagement = indicators.get("engagement_level", "Moderate")

    base = _FACIAL_CONFIDENCE_MAP.get((composure, engagement))
    if base is None:
        if "Composed" in composure:
            base = 75.0
        elif "Moderate" in composure:
            base = 60.0
        else:
            base = 40.0

    # Expression valence adjustment
    dist = facial_result.get("expression_distribution", {})
    pos = dist.get("neutral", 0.0) + dist.get("happiness", 0.0)
    neg = dist.get("fear", 0.0) + dist.get("sadness", 0.0) + dist.get("anger", 0.0) + dist.get("disgust", 0.0)

    if pos >= 75.0:
        base += 5.0
    if neg >= 15.0:
        base -= 10.0

    return min(100.0, max(0.0, base))


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


def _calculate_facial_stress(facial_result: Dict) -> float:
    """
    Evaluates observable visual tension from CNN facial expressions and composure stability.
    """
    indicators = facial_result.get("behavioral_indicators", {})
    tension = indicators.get("observable_tension", "Low")
    composure = indicators.get("composure_index", "Moderate Composure")

    dist = facial_result.get("expression_distribution", {})
    neg = dist.get("fear", 0.0) + dist.get("anger", 0.0) + dist.get("disgust", 0.0) + dist.get("sadness", 0.0)

    if tension == "Elevated" or neg >= 25.0:
        base = 80.0
    elif tension == "Moderate" or neg >= 12.0:
        base = 50.0
    else:
        base = 20.0

    if composure == "Fluctuating Composure":
        base += 15.0
    elif composure == "Composed & Stable":
        base -= 10.0

    return min(100.0, max(0.0, base))


def analyze_question_confidence_and_stress(
    delivery_result: Optional[Dict],
    facial_result: Optional[Dict],
) -> Dict:
    """
    Computes per-question confidence score/level and stress score/level from real speech & vision outputs.

    Returns structured dict matching schema:
      - confidence_score: float (0.0 - 100.0)
      - confidence_level: "High" | "Moderate" | "Developing" | "Low" | "Not Assessed"
      - stress_score: float (0.0 - 100.0)
      - stress_level: "Low" | "Moderate" | "Elevated" | "Not Assessed"
      - modality_status: Dict
      - speech_evidence: Dict | None
      - facial_evidence: Dict | None
      - rationale: str
    """
    speech_available = bool(
        delivery_result
        and delivery_result.get("status") == "completed"
        and delivery_result.get("word_count", 0) > 0
    )

    facial_available = bool(
        facial_result
        and facial_result.get("status") == "completed"
        and facial_result.get("face_detected", False)
    )

    modality_status = {
        "speech": "available" if speech_available else "unavailable",
        "vision": "available" if facial_available else "unavailable",
    }

    # Case 0: Neither modality available
    if not speech_available and not facial_available:
        return {
            "confidence_score": 0.0,
            "confidence_level": "Not Assessed",
            "stress_score": 0.0,
            "stress_level": "Not Assessed",
            "modality_status": modality_status,
            "speech_evidence": None,
            "facial_evidence": None,
            "rationale": "No speech or facial behavioral recording was available for evaluation.",
        }

    # Extract single-modality scores
    speech_conf = _calculate_speech_confidence(delivery_result) if speech_available else None
    facial_conf = _calculate_facial_confidence(facial_result) if facial_available else None

    speech_stress = _calculate_speech_stress(delivery_result) if speech_available else None
    facial_stress = _calculate_facial_stress(facial_result) if facial_available else None

    # Fuse with graceful degradation
    if speech_available and facial_available:
        conf_score = round(
            CONFIDENCE_WEIGHTS["speech"] * speech_conf + CONFIDENCE_WEIGHTS["vision"] * facial_conf,
            1,
        )
        str_score = round(
            STRESS_WEIGHTS["speech"] * speech_stress + STRESS_WEIGHTS["vision"] * facial_stress,
            1,
        )
        rationale = (
            f"Dual-modality assessment: Speech delivery (conf {speech_conf:.1f}%, stress {speech_stress:.1f}%) "
            f"fused with facial composure (conf {facial_conf:.1f}%, stress {facial_stress:.1f}%)."
        )
    elif speech_available:
        conf_score = round(speech_conf, 1)
        str_score = round(speech_stress, 1)
        rationale = f"Speech-only assessment: Derived from acoustic pacing ({delivery_result.get('words_per_minute', 0)} WPM) and vocal fluency."
    else:
        conf_score = round(facial_conf, 1)
        str_score = round(facial_stress, 1)
        indicators = facial_result.get("behavioral_indicators", {})
        rationale = f"Vision-only assessment: Derived from facial composure ({indicators.get('composure_index')}) and observable tension."

    conf_score = min(100.0, max(0.0, conf_score))
    str_score = min(100.0, max(0.0, str_score))

    speech_evidence = (
        {
            "fluency_score": delivery_result.get("fluency_score", 0.0),
            "words_per_minute": delivery_result.get("words_per_minute", 0.0),
            "pacing": delivery_result.get("pacing", "Unknown"),
            "hesitation_rate": delivery_result.get("hesitation_rate", 0.0),
            "hesitation_level": delivery_result.get("hesitation_level", "Unknown"),
            "filler_count": delivery_result.get("filler_count", 0),
            "pause_duration_seconds": delivery_result.get("pause_duration_seconds", 0.0),
            "speech_confidence": speech_conf,
            "speech_stress": speech_stress,
        }
        if speech_available
        else None
    )

    facial_evidence = (
        {
            "dominant_expression": facial_result.get("dominant_expression", "Unknown"),
            "composure_index": facial_result.get("behavioral_indicators", {}).get("composure_index", "Unknown"),
            "engagement_level": facial_result.get("behavioral_indicators", {}).get("engagement_level", "Unknown"),
            "observable_tension": facial_result.get("behavioral_indicators", {}).get("observable_tension", "Unknown"),
            "facial_confidence": facial_conf,
            "facial_stress": facial_stress,
        }
        if facial_available
        else None
    )

    return {
        "confidence_score": conf_score,
        "confidence_level": derive_confidence_level(conf_score),
        "stress_score": str_score,
        "stress_level": derive_stress_level(str_score),
        "modality_status": modality_status,
        "speech_evidence": speech_evidence,
        "facial_evidence": facial_evidence,
        "rationale": rationale,
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
            cs = analyze_question_confidence_and_stress(q.get("delivery"), q.get("facial_analysis"))

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
                facial_stress_list.append(float(fa_ev["facial_stress"]))

    evaluated_takes = len(q_confidences)
    if evaluated_takes == 0:
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

    avg_confidence = round(sum(q_confidences) / evaluated_takes, 1)
    avg_stress = round(sum(q_stresses) / evaluated_takes, 1)

    avg_speech_conf = round(sum(speech_conf_list) / len(speech_conf_list), 1) if speech_conf_list else 0.0
    avg_facial_conf = round(sum(facial_conf_list) / len(facial_conf_list), 1) if facial_conf_list else 0.0
    avg_speech_stress = round(sum(speech_stress_list) / len(speech_stress_list), 1) if speech_stress_list else 0.0
    avg_facial_stress = round(sum(facial_stress_list) / len(facial_stress_list), 1) if facial_stress_list else 0.0

    modality_status = {
        "speech": "available" if speech_conf_list else "unavailable",
        "vision": "available" if facial_conf_list else "unavailable",
    }

    return {
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
