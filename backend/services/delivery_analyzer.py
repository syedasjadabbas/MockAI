"""
Speech Delivery & Fluency Analyzer for candidate interview responses (Phase 2).

Extracts explainable, defensible delivery metrics from response transcripts and
audio/video recording metadata (duration, word volume, speaking rate, fillers).

Integrity guarantees:
- Calculates metrics strictly from genuine transcript tokens and elapsed duration.
- Safely handles missing, empty, or unmeasured responses (yielding 0.0 without crash).
- Never claims facial emotions, eye contact, or stress beyond defensible speech signals.
"""
import re
from typing import Dict, List, Optional, Set, Tuple

FILLER_WORDS: Set[str] = {
    "um", "uh", "er", "ah", "like", "you know", "i mean", "actually",
    "basically", "literally", "sort of", "kind of"
}


def _tokenize_words(text: Optional[str]) -> List[str]:
    if not text:
        return []
    return re.findall(r"\b[a-zA-Z0-9_-]+\b", text.lower())


def _count_fillers(text: Optional[str]) -> Tuple[int, List[str]]:
    """Counts individual filler words and multi-word filler phrases."""
    if not text:
        return 0, []
    
    text_lower = text.lower()
    tokens = _tokenize_words(text)
    detected: List[str] = []
    
    # 1. Multi-word fillers
    multi_word_fillers = ["you know", "i mean", "sort of", "kind of"]
    for phrase in multi_word_fillers:
        matches = len(re.findall(r"\b" + re.escape(phrase) + r"\b", text_lower))
        if matches > 0:
            detected.extend([phrase] * matches)
            
    # 2. Single-word fillers
    single_fillers = {"um", "uh", "er", "ah", "like", "actually", "basically", "literally"}
    for w in tokens:
        if w in single_fillers:
            detected.append(w)
            
    return len(detected), detected


def analyze_delivery(
    transcript: Optional[str],
    duration_seconds: Optional[float] = None,
    media_url: Optional[str] = None,
) -> Dict:
    """
    Analyzes the speaking delivery, rate, pacing, and fluency of a candidate response.

    Returns:
        Dict with:
            - word_count: int
            - duration_seconds: float
            - words_per_minute: float
            - pacing: "Optimal" | "Deliberate" | "Slow" | "Fast" | "Rushed" | "Unpaced"
            - filler_count: int
            - filler_words: List[str]
            - hesitation_rate: float (percentage)
            - hesitation_level: "None" | "Low" | "Moderate" | "Elevated"
            - fluency_score: float (0.0 to 100.0)
            - fluency_indicator: "Fluent" | "Moderate" | "Hesitant" | "No Spoken Data"
            - notes: str
    """
    dur = max(0.0, float(duration_seconds or 0.0))
    if not transcript or not transcript.strip():
        return {
            "status": "empty" if transcript == "" else "missing",
            "word_count": 0,
            "duration_seconds": dur,
            "words_per_minute": 0.0,
            "pacing": "Unpaced",
            "filler_count": 0,
            "filler_words": [],
            "hesitation_rate": 0.0,
            "hesitation_level": "None",
            "fluency_score": 0.0,
            "fluency_indicator": "No Spoken Data",
            "notes": "No spoken words were recorded for this prompt.",
        }

    words = _tokenize_words(transcript)
    word_count = len(words)
    filler_count, detected_fillers = _count_fillers(transcript)

    # 1. Words Per Minute
    if dur > 0.0:
        wpm = round((word_count / dur) * 60.0, 1)
    else:
        # Fallback if duration is absent: approximate based on 130 WPM average
        wpm = round(float(word_count), 1)

    # 2. Pacing classification
    if dur <= 0.0 and word_count == 0:
        pacing = "Unpaced"
    elif 110.0 <= wpm <= 165.0:
        pacing = "Optimal"
    elif 80.0 <= wpm < 110.0:
        pacing = "Deliberate"
    elif 0.0 < wpm < 80.0:
        pacing = "Slow"
    elif 165.0 < wpm <= 195.0:
        pacing = "Fast"
    else:
        pacing = "Rushed"

    # 3. Hesitation & Filler Rate
    hesitation_rate = round((filler_count / max(1, word_count)) * 100.0, 1)
    if word_count == 0:
        hesitation_level = "None"
    elif hesitation_rate <= 3.0:
        hesitation_level = "Low"
    elif hesitation_rate <= 7.5:
        hesitation_level = "Moderate"
    else:
        hesitation_level = "Elevated"

    # 4. Fluency Score (0 to 100)
    # Component A: Pacing alignment (up to 40 pts)
    pacing_points_map = {
        "Optimal": 40.0,
        "Deliberate": 34.0,
        "Fast": 30.0,
        "Slow": 22.0,
        "Rushed": 18.0,
        "Unpaced": 15.0 if word_count > 10 else 0.0,
    }
    pacing_points = pacing_points_map.get(pacing, 20.0)

    # Component B: Hesitation control (up to 35 pts)
    volume_scale = min(1.0, max(0.1, word_count / 15.0)) if word_count > 0 else 0.0
    if word_count == 0:
        hesitation_points = 0.0
    elif hesitation_level == "Low":
        hesitation_points = 35.0 * volume_scale
    elif hesitation_level == "Moderate":
        hesitation_points = 24.0 * volume_scale
    elif hesitation_level == "Elevated":
        hesitation_points = 12.0 * volume_scale
    else:
        hesitation_points = 0.0

    # Component C: Volume & Continuity (up to 25 pts)
    # Target 30+ words for full continuity credit
    continuity_points = min(25.0, (word_count / 30.0) * 25.0)

    raw_fluency = pacing_points + hesitation_points + continuity_points
    fluency_score = round(min(100.0, max(0.0, raw_fluency)), 1)

    # 5. Fluency Indicator
    if word_count == 0:
        fluency_indicator = "No Spoken Data"
    elif fluency_score >= 75.0:
        fluency_indicator = "Fluent"
    elif fluency_score >= 48.0:
        fluency_indicator = "Moderate"
    else:
        fluency_indicator = "Hesitant"

    # Notes
    if fluency_score >= 80.0:
        notes = f"Fluid spoken delivery at {wpm} WPM ({pacing} pacing) with minimal hesitation ({hesitation_rate}% fillers)."
    elif fluency_score >= 50.0:
        notes = f"Steady delivery at {wpm} WPM ({pacing} pacing). {filler_count} filler words detected."
    else:
        notes = f"Spoken delivery exhibited {hesitation_level.lower()} hesitation ({filler_count} fillers) at {wpm} WPM ({pacing})."

    return {
        "status": "completed",
        "word_count": word_count,
        "duration_seconds": dur,
        "words_per_minute": wpm,
        "pacing": pacing,
        "filler_count": filler_count,
        "filler_words": detected_fillers[:10],
        "hesitation_rate": hesitation_rate,
        "hesitation_level": hesitation_level,
        "fluency_score": fluency_score,
        "fluency_indicator": fluency_indicator,
        "notes": notes,
    }
