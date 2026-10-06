"""
Multimodal Fusion Service (FR18 / FR19).

Combines the three real analytical modality outputs — NLP/Content (BERT),
Speech/Delivery (Google Speech + delivery analyzer), and Vision/Facial
(CNN Emotion-FERPlus) — into a single deterministic, explainable per-question
multimodal result.

Fusion Weights (all modalities available):
    NLP/Content:        0.50  —  What the candidate said (rubric alignment, concepts)
    Speech/Delivery:    0.30  —  How they said it (pace, fluency, hesitation, pauses)
    Vision/Facial:      0.20  —  Observable non-verbal composure and engagement

Degraded-Modality Behavior:
    When a modality is unavailable (status != "completed" or missing data),
    its weight is redistributed proportionally among the remaining available
    modalities. If no modalities are available, the score is 0.0.

Integrity Guarantees:
    - Deterministic: identical inputs always produce identical outputs.
    - Explainable: the returned dict documents exact weights, per-modality
      contributions, and a human-readable rationale.
    - Zero fabrication: unavailable modalities produce no score contribution.
"""
from typing import Dict, Optional


# ---------------------------------------------------------------------------
# Default weights (sum = 1.0)
# ---------------------------------------------------------------------------
BASE_WEIGHTS = {
    "nlp":    0.50,
    "speech": 0.30,
    "vision": 0.20,
}


# ---------------------------------------------------------------------------
# Facial composure → numeric score mapping
# ---------------------------------------------------------------------------
_COMPOSURE_SCORE_MAP = {
    ("Composed & Stable", "High"):                     85.0,
    ("Composed & Stable", "Moderate"):                 75.0,
    ("Composed & Stable", "Low (Gaze Disengaged)"):    65.0,
    ("Moderate Composure", "High"):                    70.0,
    ("Moderate Composure", "Moderate"):                55.0,
    ("Moderate Composure", "Low (Gaze Disengaged)"):   45.0,
    ("Fluctuating Composure", "High"):                 40.0,
    ("Fluctuating Composure", "Moderate"):             35.0,
    ("Fluctuating Composure", "Low (Gaze Disengaged)"):25.0,
}


def _facial_to_score(facial_result: Dict) -> Optional[float]:
    """
    Converts the categorical facial analysis result into a 0–100 numeric score.
    Returns None if the facial result is not usable.
    """
    if not facial_result or facial_result.get("status") != "completed":
        return None

    indicators = facial_result.get("behavioral_indicators", {})
    composure = indicators.get("composure_index", "")
    engagement = indicators.get("engagement_level", "")

    score = _COMPOSURE_SCORE_MAP.get((composure, engagement))
    if score is not None:
        return score

    # Fallback: if the exact pair isn't mapped, derive from composure alone
    if "Composed" in composure:
        return 70.0
    elif "Moderate" in composure:
        return 50.0
    elif "Fluctuating" in composure:
        return 30.0
    return None


def fuse_per_question(
    nlp_result: Optional[Dict],
    delivery_result: Optional[Dict],
    facial_result: Optional[Dict],
) -> Dict:
    """
    Produces a deterministic, explainable multimodal fusion result for one question.

    Args:
        nlp_result:      Output from analyze_transcript() (text_analysis)
        delivery_result: Output from analyze_delivery()
        facial_result:   Output from FacialAnalyzer.analyze_video()

    Returns:
        Dict with:
            status: "completed" | "partial" | "unavailable"
            score: float (0.0 to 100.0) — the fused multimodal score
            nlp_contribution: Dict | None
            speech_contribution: Dict | None
            vision_contribution: Dict | None
            modality_status: Dict — availability of each modality
            fusion_method: str
            weights_used: Dict — actual weights after redistribution
            rationale: str — human-readable explanation
            error: str | None
    """
    # -----------------------------------------------------------------------
    # 1. Determine modality availability and extract raw scores
    # -----------------------------------------------------------------------
    # NLP is available if completed with a score, OR if evaluated as empty (silence = 0.0 score)
    nlp_status = nlp_result.get("status") if nlp_result else "missing"
    nlp_available = (
        nlp_result is not None
        and nlp_status in ("completed", "empty")
        and nlp_result.get("content_score") is not None
    )
    nlp_score = float(nlp_result.get("content_score", 0.0)) if nlp_available else None

    # Speech is available if completed with fluency score, OR if evaluated as empty (0 words = 0.0 score)
    speech_status = delivery_result.get("status") if delivery_result else "missing"
    speech_available = (
        delivery_result is not None
        and speech_status in ("completed", "empty")
        and delivery_result.get("fluency_score") is not None
    )
    speech_score = float(delivery_result.get("fluency_score", 0.0)) if speech_available else None

    vision_score = _facial_to_score(facial_result) if facial_result else None
    vision_status = facial_result.get("status") if facial_result else "missing"
    vision_available = vision_score is not None and vision_status == "completed"

    modality_status = {
        "nlp":    "available" if nlp_available else "unavailable",
        "speech": "available" if speech_available else "unavailable",
        "vision": "available" if vision_available else "unavailable",
    }

    available_count = sum([nlp_available, speech_available, vision_available])

    # -----------------------------------------------------------------------
    # 2. Handle zero-modality case
    # -----------------------------------------------------------------------
    if available_count == 0:
        return {
            "status": "unavailable",
            "score": 0.0,
            "nlp_contribution": None,
            "speech_contribution": None,
            "vision_contribution": None,
            "modality_status": modality_status,
            "fusion_method": "weighted_trimodal_v2",
            "weights_used": {"nlp": 0.0, "speech": 0.0, "vision": 0.0},
            "rationale": "No modality data was available for this question. Score is 0.0.",
            "error": None,
        }

    # -----------------------------------------------------------------------
    # 3. Determine weights with strict verbal primacy & adjunct vision capping
    # -----------------------------------------------------------------------
    # Vision is strictly an adjunct modality (baseline 0.20). In an interview,
    # visual composure alone must NEVER absorb verbal weights (NLP + Speech)
    # or score above its 20% baseline contribution.
    weights_used = {"nlp": 0.0, "speech": 0.0, "vision": 0.0}

    if nlp_available and speech_available and vision_available:
        # Standard trimodal: 50% NLP, 30% Speech, 20% Vision
        weights_used = {"nlp": BASE_WEIGHTS["nlp"], "speech": BASE_WEIGHTS["speech"], "vision": BASE_WEIGHTS["vision"]}
    elif nlp_available and speech_available and not vision_available:
        # Camera unmounted: proportional verbal redistribution (62.5% NLP, 37.5% Speech)
        verbal_sum = BASE_WEIGHTS["nlp"] + BASE_WEIGHTS["speech"]
        weights_used["nlp"] = round(BASE_WEIGHTS["nlp"] / verbal_sum, 4)
        weights_used["speech"] = round(BASE_WEIGHTS["speech"] / verbal_sum, 4)
        weights_used["vision"] = 0.0
    elif nlp_available and not speech_available and not vision_available:
        # Text-only interview mode
        weights_used["nlp"] = 1.0
        weights_used["speech"] = 0.0
        weights_used["vision"] = 0.0
    elif nlp_available and vision_available and not speech_available:
        # Text + video (e.g., typed answer with camera on)
        sub_sum = BASE_WEIGHTS["nlp"] + BASE_WEIGHTS["vision"]
        weights_used["nlp"] = round(BASE_WEIGHTS["nlp"] / sub_sum, 4)
        weights_used["vision"] = round(BASE_WEIGHTS["vision"] / sub_sum, 4)
        weights_used["speech"] = 0.0
    elif speech_available and vision_available and not nlp_available:
        # Speech delivery + video without NLP
        sub_sum = BASE_WEIGHTS["speech"] + BASE_WEIGHTS["vision"]
        weights_used["speech"] = round(BASE_WEIGHTS["speech"] / sub_sum, 4)
        weights_used["vision"] = round(BASE_WEIGHTS["vision"] / sub_sum, 4)
        weights_used["nlp"] = 0.0
    elif speech_available and not nlp_available and not vision_available:
        # Speech delivery only
        weights_used["speech"] = 1.0
        weights_used["nlp"] = 0.0
        weights_used["vision"] = 0.0
    elif vision_available and not nlp_available and not speech_available:
        # Vision ONLY (no verbal response or audio hardware missing):
        # Vision remains capped at its 0.20 baseline contribution.
        # It NEVER absorbs verbal weight to fabricate a high score on an unanswered question.
        weights_used["vision"] = BASE_WEIGHTS["vision"]
        weights_used["nlp"] = 0.0
        weights_used["speech"] = 0.0

    # -----------------------------------------------------------------------
    # 4. Compute weighted fusion score
    # -----------------------------------------------------------------------
    fused_score = 0.0
    contributions = []

    nlp_contribution = None
    speech_contribution = None
    vision_contribution = None

    if nlp_available and weights_used["nlp"] > 0:
        w = weights_used["nlp"]
        contrib = nlp_score * w
        fused_score += contrib
        nlp_contribution = {
            "raw_score": round(nlp_score, 1),
            "weight": w,
            "weighted_contribution": round(contrib, 2),
            "model": nlp_result.get("model", "bert-distilbert-minilm-v2"),
        }
        contributions.append(f"NLP/Content {round(nlp_score, 1)}% × {w:.2f} = {round(contrib, 1)}")

    if speech_available and weights_used["speech"] > 0:
        w = weights_used["speech"]
        contrib = speech_score * w
        fused_score += contrib
        speech_contribution = {
            "raw_score": round(speech_score, 1),
            "weight": w,
            "weighted_contribution": round(contrib, 2),
            "wpm": delivery_result.get("words_per_minute", 0.0),
            "pacing": delivery_result.get("pacing", "Unknown"),
            "fluency_indicator": delivery_result.get("fluency_indicator", "Unknown"),
        }
        contributions.append(f"Speech/Delivery {round(speech_score, 1)}% × {w:.2f} = {round(contrib, 1)}")

    if vision_available and weights_used["vision"] > 0:
        w = weights_used["vision"]
        contrib = vision_score * w
        fused_score += contrib
        indicators = facial_result.get("behavioral_indicators", {})
        vision_contribution = {
            "raw_score": round(vision_score, 1),
            "weight": w,
            "weighted_contribution": round(contrib, 2),
            "composure": indicators.get("composure_index", "Unknown"),
            "engagement": indicators.get("engagement_level", "Unknown"),
            "dominant_expression": facial_result.get("dominant_expression", "Unknown"),
        }
        contributions.append(f"Vision/Facial {round(vision_score, 1)}% × {w:.2f} = {round(contrib, 1)}")

    fused_score = round(min(100.0, max(0.0, fused_score)), 1)

    # -----------------------------------------------------------------------
    # 5. Build rationale
    # -----------------------------------------------------------------------
    status = "completed" if available_count == 3 else "partial"
    modality_names = []
    if nlp_available:
        modality_names.append("NLP/Content")
    if speech_available:
        modality_names.append("Speech/Delivery")
    if vision_available:
        modality_names.append("Vision/Facial")

    unavailable_names = []
    if not nlp_available:
        unavailable_names.append("NLP")
    if not speech_available:
        unavailable_names.append("Speech")
    if not vision_available:
        unavailable_names.append("Vision")

    rationale_parts = [
        f"Fused from {available_count}/3 modalities ({', '.join(modality_names)}).",
    ]
    if nlp_status == "empty" and speech_status == "empty" and vision_available:
        rationale_parts.append(
            "Candidate was silent: verbal modalities evaluated at 0.0%; non-verbal composure capped at 20% baseline."
        )
    rationale_parts.extend(contributions)
    if unavailable_names:
        if "NLP" in unavailable_names and "Speech" in unavailable_names and vision_available:
            rationale_parts.append(
                "Verbal modalities unavailable: Vision capped at 20% baseline contribution (no verbal absorption)."
            )
        else:
            rationale_parts.append(
                f"Unavailable: {', '.join(unavailable_names)} — weights redistributed proportionally."
            )
    rationale = " | ".join(rationale_parts)

    return {
        "status": status,
        "score": fused_score,
        "nlp_contribution": nlp_contribution,
        "speech_contribution": speech_contribution,
        "vision_contribution": vision_contribution,
        "modality_status": modality_status,
        "fusion_method": "weighted_trimodal_v2",
        "weights_used": weights_used,
        "rationale": rationale,
        "error": None,
    }
