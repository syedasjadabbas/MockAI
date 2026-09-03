"""
Speech Delivery & Fluency Analyzer for candidate interview responses (Phase 2).

Extracts explainable, defensible delivery metrics from response transcripts and
audio/video recording metadata (duration, word volume, speaking rate, fillers).

Integrity guarantees:
- Calculates metrics strictly from genuine transcript tokens and elapsed duration.
- Safely handles missing, empty, or unmeasured responses (yielding 0.0 without crash).
- Never claims facial emotions, eye contact, or stress beyond defensible speech signals.
"""
import logging
import os
import re
from typing import Dict, List, Optional, Set, Tuple

logger = logging.getLogger("mockai.delivery")

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


def _analyze_acoustic_pauses(media_url: Optional[str]) -> Tuple[float, int, float]:
    """
    Extracts acoustic silent pause metrics from the candidate's recording.
    Returns:
        (pause_duration_seconds, pause_count, speech_duration_seconds)
    """
    if not media_url:
        return 0.0, 0, 0.0

    try:
        from services.media_storage import get_media_storage
        from services.media_conversion import extract_audio_to_wav, is_ffmpeg_available
        import scipy.io.wavfile as wavfile
        import numpy as np
        import tempfile
        from pathlib import Path
        import uuid

        media_path = get_media_storage().resolve_path(media_url)
        if not media_path and os.path.isfile(str(media_url)):
            media_path = Path(media_url)

        if not media_path or not Path(media_path).is_file():
            return 0.0, 0, 0.0

        if not is_ffmpeg_available():
            return 0.0, 0, 0.0

        wav_path = Path(tempfile.gettempdir()) / f"mockai_pause_{uuid.uuid4().hex}.wav"
        try:
            extract_audio_to_wav(media_path, wav_path)
            rate, data = wavfile.read(str(wav_path))
            if len(data) == 0:
                return 0.0, 0, 0.0

            # Convert to mono if stereo
            if len(data.shape) > 1:
                data = np.mean(data, axis=1)

            total_duration = len(data) / float(rate)
            # 50ms frames
            frame_len = int(rate * 0.05)
            if frame_len <= 0:
                return 0.0, 0, total_duration

            frames = [data[i:i+frame_len] for i in range(0, len(data), frame_len) if len(data[i:i+frame_len]) == frame_len]
            if not frames:
                return 0.0, 0, total_duration

            rms = [np.sqrt(np.mean(f.astype(np.float32)**2)) for f in frames]
            peak_rms = max(rms) if rms else 0.0
            if peak_rms < 1e-4:
                # Completely silent audio
                return round(total_duration, 2), 1, 0.0

            # Dynamic silence threshold: 6% of peak RMS or floor
            silence_thresh = max(10.0, peak_rms * 0.06)

            # Detect contiguous silent runs >= 500ms (10 frames)
            pause_count = 0
            pause_frames = 0
            curr_silent_streak = 0

            for r in rms:
                if r < silence_thresh:
                    curr_silent_streak += 1
                else:
                    if curr_silent_streak >= 10:  # >= 0.5s pause
                        pause_count += 1
                        pause_frames += curr_silent_streak
                    curr_silent_streak = 0

            if curr_silent_streak >= 10:
                pause_count += 1
                pause_frames += curr_silent_streak

            pause_duration = round(pause_frames * 0.05, 2)
            speech_duration = round(max(0.0, total_duration - pause_duration), 2)
            return pause_duration, pause_count, speech_duration

        finally:
            wav_path.unlink(missing_ok=True)
    except Exception:
        return 0.0, 0, 0.0


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
            - pause_duration_seconds: float
            - pause_count: int
            - articulation_wpm: float
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
            "pause_duration_seconds": 0.0,
            "pause_count": 0,
            "articulation_wpm": 0.0,
            "notes": "No spoken words were recorded for this prompt.",
        }

    words = _tokenize_words(transcript)
    word_count = len(words)
    filler_count, detected_fillers = _count_fillers(transcript)

    # Acoustic pause extraction if media file exists
    pause_duration, pause_count, speech_dur = _analyze_acoustic_pauses(media_url)

    # 1. Words Per Minute
    if dur > 0.0:
        wpm = round((word_count / dur) * 60.0, 1)
    else:
        wpm = round(float(word_count), 1)

    # Articulation Rate (WPM during active speech)
    if speech_dur > 0.0:
        articulation_wpm = round((word_count / speech_dur) * 60.0, 1)
    else:
        articulation_wpm = wpm

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

    # 3. Hesitation & Filler Rate (synthesizing lexical fillers + acoustic pauses)
    lexical_hesitation_rate = (filler_count / max(1, word_count)) * 100.0
    acoustic_hesitation_penalty = min(15.0, (pause_duration / max(1.0, dur)) * 25.0) if dur > 0 else 0.0
    hesitation_rate = round(lexical_hesitation_rate + (acoustic_hesitation_penalty * 0.3), 1)

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
        notes = f"Fluid spoken delivery at {wpm} WPM ({pacing} pacing) with minimal hesitation ({hesitation_rate}% fillers/pauses)."
    elif fluency_score >= 50.0:
        notes = f"Steady delivery at {wpm} WPM ({pacing} pacing). {filler_count} filler words detected with {pause_count} pauses."
    else:
        notes = f"Spoken delivery exhibited {hesitation_level.lower()} hesitation ({filler_count} fillers, {pause_duration}s pauses) at {wpm} WPM ({pacing})."

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
        "pause_duration_seconds": pause_duration,
        "pause_count": pause_count,
        "articulation_wpm": articulation_wpm,
        "notes": notes,
    }
