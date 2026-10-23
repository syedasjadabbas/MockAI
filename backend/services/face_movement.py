"""
Face-movement analysis (extension of FR17 behavioural cues) with MediaPipe
Face Landmarker: 478 face landmarks, 52 blendshape scores and the head pose
for each sampled frame.

MEASURED per answer (geometry, no emotion model):
- mouth wide open while the candidate is NOT speaking (sound activity from
  the recording's own audio), e.g. a tongue out or a pulled face;
- exaggerated movements: strong blendshapes that ordinary speech does not
  produce (cheek puff, pucker, jaw shifted sideways, sneer, ...);
- looking away: head turned or tilted well away from the camera.

These describe what the face did, never why. The model cannot tell a yawn
from a tongue out, or reading notes from looking away; the results say so.
Thresholds are calibrated on real recordings of normal answers
(calibrate_face_movement.py); they have not been checked against labelled
recordings of people pulling faces.

Optional: if MediaPipe or its model is missing the analysis reports
"unavailable" and nothing else changes (e.g. the lite profile on Render).
"""
import logging
import math
import os
import threading
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

logger = logging.getLogger("mockai.face_movement")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
FACE_LANDMARKER_PATH = MODELS_DIR / "face_landmarker.task"
FACE_LANDMARKER_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

# Movements speech never produces strongly: counted at any time.
EXAGGERATED_BLENDSHAPES = (
    "cheekPuff", "jawLeft", "jawRight", "jawForward", "mouthLeft", "mouthRight",
    "noseSneerLeft", "noseSneerRight", "tongueOut",
)
# Mouth shapes that ordinary speech also produces: counted only while the
# candidate is not speaking, like jaw opening. mouthPucker / mouthFunnel are
# not used at all: on real answers they scored up to 0.96 when a hand covered
# the mouth or the room was dark (calibrate_face_movement.py).
SPEECH_SHAPED_BLENDSHAPES = (
    "mouthStretchLeft", "mouthStretchRight", "mouthRollLower", "mouthRollUpper",
)
ALL_UNUSUAL_BLENDSHAPES = EXAGGERATED_BLENDSHAPES + SPEECH_SHAPED_BLENDSHAPES

# --- Thresholds -------------------------------------------------------------
# Checked 2026-10-23 on 17 real answers (calibrate_face_movement.py,
# docs/face_movement_calibration.json). Normal answers stay well below them:
# jawOpen while silent max 0.12 (speaking p99 0.15); speech-free movements
# max 0.42; speech-shaped movements while silent max 0.24. Looking away flagged
# 5 answers from two sessions where the candidate sat turned 30-38 degrees to
# the side (confirmed on the video frames). No labelled pulled-face recordings
# exist yet, so these limits are set to avoid false flags, not tuned for recall.
MIN_FRAMES_FOR_MOVEMENT = 8
JAW_OPEN_SILENT = 0.45          # jawOpen blendshape (0-1) counted as "wide open"
EXAGGERATED_THRESHOLD = 0.60    # any EXAGGERATED_BLENDSHAPES score
YAW_AWAY_DEGREES = 30.0         # head turned left/right
PITCH_AWAY_DEGREES = 25.0       # head tilted up/down
SPEECH_WINDOW_SECONDS = 0.30    # sound within +/- this of a frame = speaking
MIN_FLAG_FRAMES = 3
MIN_MOUTH_OPEN_SECONDS = 1.5
MIN_LOOK_AWAY_SHARE = 0.25
MIN_EXAGGERATED_SHARE = 0.10


class FaceMovementAnalyzer:
    _instance: Optional["FaceMovementAnalyzer"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._landmarker = None
            cls._instance._error = None
            cls._instance._tried = False
            cls._instance._lock = threading.Lock()
        return cls._instance

    def _load(self) -> bool:
        if self._landmarker is not None:
            return True
        if self._tried:
            return False
        self._tried = True
        try:
            from mediapipe.tasks.python import BaseOptions, vision
            if not FACE_LANDMARKER_PATH.is_file():
                import urllib.request
                os.makedirs(MODELS_DIR, exist_ok=True)
                logger.info("Downloading MediaPipe face landmarker to %s", FACE_LANDMARKER_PATH)
                urllib.request.urlretrieve(FACE_LANDMARKER_URL, str(FACE_LANDMARKER_PATH))
            opts = vision.FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(FACE_LANDMARKER_PATH)),
                running_mode=vision.RunningMode.IMAGE,
                num_faces=2,
                output_face_blendshapes=True,
                output_facial_transformation_matrixes=True,
            )
            self._landmarker = vision.FaceLandmarker.create_from_options(opts)
            return True
        except Exception as e:  # mediapipe not installed, model unavailable, ...
            self._error = str(e)[:200]
            logger.warning("Face-movement analysis unavailable: %s", self._error)
            return False

    @property
    def available(self) -> bool:
        return self._load()

    def measure_frame(self, frame_bgr: np.ndarray) -> Optional[Dict]:
        """Landmarks, blendshapes and head pose of the largest face, or None."""
        if frame_bgr is None or not self._load():
            return None
        import cv2
        import mediapipe as mp
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        with self._lock:
            res = self._landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
        if not res.face_landmarks:
            return None

        def area(lms):
            xs, ys = [p.x for p in lms], [p.y for p in lms]
            return (max(xs) - min(xs)) * (max(ys) - min(ys))

        i = max(range(len(res.face_landmarks)), key=lambda k: area(res.face_landmarks[k]))
        shapes = {c.category_name: float(c.score) for c in res.face_blendshapes[i]} if res.face_blendshapes else {}
        yaw = pitch = roll = None
        if res.facial_transformation_matrixes:
            yaw, pitch, roll = head_pose_degrees(np.asarray(res.facial_transformation_matrixes[i]))
        always = {k: shapes[k] for k in EXAGGERATED_BLENDSHAPES if k in shapes}
        shaped = {k: shapes[k] for k in SPEECH_SHAPED_BLENDSHAPES if k in shapes}
        top = max(always, key=always.get) if always else None
        stop = max(shaped, key=shaped.get) if shaped else None
        return {
            "jaw_open": shapes.get("jawOpen"),
            "exaggerated_max": always.get(top) if top else None,
            "exaggerated_top": top,
            "speech_shaped_max": shaped.get(stop) if stop else None,
            "speech_shaped_top": stop,
            "yaw": yaw, "pitch": pitch, "roll": roll,
        }


def head_pose_degrees(matrix: np.ndarray) -> Tuple[float, float, float]:
    """(yaw, pitch, roll) in degrees from MediaPipe's 4x4 face transform.
    0/0/0 = facing the camera."""
    r = matrix[:3, :3]
    sy = math.sqrt(r[0, 0] ** 2 + r[1, 0] ** 2)
    pitch = math.degrees(math.atan2(r[2, 1], r[2, 2]))
    yaw = math.degrees(math.atan2(-r[2, 0], sy))
    roll = math.degrees(math.atan2(r[1, 0], r[0, 0]))
    return round(yaw, 1), round(pitch, 1), round(roll, 1)


def _speaking_at(t: float, activity: Optional[Tuple[float, Sequence[bool]]]) -> Optional[bool]:
    if not activity:
        return None
    step, active = activity
    lo = max(0, int((t - SPEECH_WINDOW_SECONDS) / step))
    hi = min(len(active), int((t + SPEECH_WINDOW_SECONDS) / step) + 1)
    if lo >= len(active):
        return None
    return any(active[lo:hi])


def summarize_face_movement(
    samples: List[Tuple[float, Optional[Dict]]],
    activity: Optional[Tuple[float, Sequence[bool]]],
    duration_seconds: float,
) -> Dict:
    """Turns per-frame measurements into flags. samples = [(t, measure|None)]."""
    measured = [(t, m) for t, m in samples if m]
    n = len(measured)
    if n < MIN_FRAMES_FOR_MOVEMENT:
        return {"status": "not_assessed", "flags": [],
                "reason": f"Only {n} frames with face landmarks (minimum {MIN_FRAMES_FOR_MOVEMENT})."}
    slice_s = (duration_seconds or 0.0) / max(1, len(samples))
    flags: List[Dict] = []

    # 1. Mouth wide open while not speaking
    open_silent = [t for t, m in measured
                   if (m.get("jaw_open") or 0) >= JAW_OPEN_SILENT and _speaking_at(t, activity) is False]
    open_seconds = round(len(open_silent) * slice_s, 1)
    if activity and len(open_silent) >= MIN_FLAG_FRAMES and open_seconds >= MIN_MOUTH_OPEN_SECONDS:
        flags.append({
            "type": "mouth_open_silent",
            "frames": len(open_silent),
            "seconds": open_seconds,
            "first_at": round(open_silent[0], 1),
            "message": (f"Your mouth was wide open for about {open_seconds:.0f} s while you were not speaking "
                        f"(first at {_fmt(open_silent[0])}). This happens when pulling faces or sticking the tongue out; "
                        "the model cannot tell it apart from a yawn."),
        })

    # 2. Exaggerated movements: speech-free shapes at any time, speech-shaped
    #    ones (pucker, stretch, ...) only while the candidate is silent.
    exaggerated = []
    for t, m in measured:
        name = unusual_movement(m, _speaking_at(t, activity))
        if name:
            exaggerated.append((t, name))
    if len(exaggerated) >= MIN_FLAG_FRAMES and len(exaggerated) / n >= MIN_EXAGGERATED_SHARE:
        kinds: Dict[str, int] = {}
        for _, name in exaggerated:
            kinds[name] = kinds.get(name, 0) + 1
        named = ", ".join(_human(k) for k in sorted(kinds, key=lambda k: -kinds[k])[:3])
        flags.append({
            "type": "exaggerated_movements",
            "frames": len(exaggerated),
            "share": round(len(exaggerated) / n, 3),
            "movements": kinds,
            "first_at": round(exaggerated[0][0], 1),
            "message": (f"Exaggerated face movements in {len(exaggerated) / n:.0%} of frames ({named}), "
                        f"first at {_fmt(exaggerated[0][0])}. Keep a relaxed, natural expression."),
        })

    # 3. Looking away (head turned or tilted)
    posed = [(t, m) for t, m in measured if m.get("yaw") is not None]
    away = [t for t, m in posed if abs(m["yaw"]) >= YAW_AWAY_DEGREES or abs(m["pitch"]) >= PITCH_AWAY_DEGREES]
    if posed and len(away) >= MIN_FLAG_FRAMES and len(away) / len(posed) >= MIN_LOOK_AWAY_SHARE:
        flags.append({
            "type": "looking_away",
            "frames": len(away),
            "share": round(len(away) / len(posed), 3),
            "seconds": round(len(away) * slice_s, 1),
            "first_at": round(away[0], 1),
            "message": (f"Your head was turned away from the camera for about {len(away) * slice_s:.0f} s "
                        f"({len(away) / len(posed):.0%} of the answer). Face the camera while answering; "
                        "the model cannot tell reading notes from looking around."),
        })

    yaws = [abs(m["yaw"]) for _, m in posed]
    return {
        "status": "assessed",
        "flags": flags,
        "frames_considered": n,
        "speech_timing": "measured" if activity else "unavailable (mouth-open check skipped)",
        "max_jaw_open_silent": round(max([m.get("jaw_open") or 0 for t, m in measured if _speaking_at(t, activity) is False] or [0]), 3),
        "max_exaggerated": round(max((m.get("exaggerated_max") or 0) for _, m in measured), 3),
        "max_speech_shaped_silent": round(max([m.get("speech_shaped_max") or 0 for t, m in measured if _speaking_at(t, activity) is False] or [0]), 3),
        "max_abs_yaw": round(max(yaws), 1) if yaws else None,
        "method": "MediaPipe Face Landmarker blendshapes + head pose; speech timing from the recording's audio",
        "limitation": ("Measures face geometry only: it cannot tell a yawn from a tongue out, or reading notes from looking "
                       "away. Thresholds are calibrated on normal answers, not on labelled recordings of pulled faces."),
    }


def unusual_movement(m: Dict, speaking: Optional[bool]) -> Optional[str]:
    """Name of the exaggerated movement in this frame, or None. Speech-shaped
    movements only count when the candidate is known to be silent."""
    if (m.get("exaggerated_max") or 0) >= EXAGGERATED_THRESHOLD:
        return m.get("exaggerated_top")
    if speaking is False and (m.get("speech_shaped_max") or 0) >= EXAGGERATED_THRESHOLD:
        return m.get("speech_shaped_top")
    return None


def _fmt(t: float) -> str:
    t = int(round(t or 0))
    return f"{t // 60}:{t % 60:02d}"


_HUMAN = {
    "cheekPuff": "puffed cheeks", "mouthPucker": "puckered lips", "mouthFunnel": "funnelled lips",
    "jawLeft": "jaw pushed sideways", "jawRight": "jaw pushed sideways", "jawForward": "jaw pushed forward",
    "mouthLeft": "mouth pulled sideways", "mouthRight": "mouth pulled sideways",
    "mouthRollLower": "lips rolled in", "mouthRollUpper": "lips rolled in",
    "noseSneerLeft": "sneer", "noseSneerRight": "sneer",
    "mouthStretchLeft": "mouth stretched", "mouthStretchRight": "mouth stretched", "tongueOut": "tongue out",
}


def _human(name: Optional[str]) -> str:
    return _HUMAN.get(name or "", name or "unknown")
