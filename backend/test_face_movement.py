"""
Tests for face-movement analysis (MediaPipe): mouth wide open while not
speaking, exaggerated movements, looking away; their effect on the score and
the feedback wording; and a false-flag check on a real normal answer.

Synthetic measurements test the LOGIC. Whether pulled faces are caught in
practice needs labelled recordings (calibrate_face_movement.py --labelled).

Run with: ../.venv311/Scripts/python.exe test_face_movement.py
"""
import math
import os
from pathlib import Path
from unittest.mock import patch

os.environ["TESTING"] = "1"

import numpy as np

from services import face_movement as FM
from services.face_movement import summarize_face_movement, head_pose_degrees
from services.multimodal_fusion import _vision_assessment
from services.camera_conduct import assess_answer_camera_conduct, summarize_camera_conduct, camera_conduct_feedback
from services.facial_analyzer import FacialAnalyzer

FIXTURE = Path(__file__).parent / "media/interviews/6a96c6df4fe22d4bad7fc5a7/6a884ae95deeec968f07461a/response.webm"
passed = 0


def expect(cond, msg):
    global passed
    if not cond:
        raise AssertionError(msg)
    passed += 1
    print(f"[PASS] {msg}")


def frame(jaw=0.05, exag=0.05, top="mouthPucker", yaw=0.0, pitch=-5.0):
    return {"jaw_open": jaw, "exaggerated_max": exag, "exaggerated_top": top, "yaw": yaw, "pitch": pitch, "roll": 0.0}


def samples(n=20, overrides=None):
    overrides = overrides or {}
    return [(k * 1.0, overrides.get(k, frame())) for k in range(n)]


def silence(n_seconds=20):
    return 0.05, [False] * int(n_seconds / 0.05)


def speech(n_seconds=20):
    return 0.05, [True] * int(n_seconds / 0.05)


def flags(summary):
    return [f["type"] for f in summary["flags"]]


def facial(composure="Composed & Stable", movement_flags=None):
    return {
        "status": "completed",
        "behavioral_indicators": {"composure_index": composure},
        "camera_presence": {"status": "measured", "ratio": 1.0, "mostly_off_camera": False},
        "expression_conduct": {"status": "assessed", "flags": []},
        "face_movement": {"status": "assessed", "flags": movement_flags or []},
    }


def run():
    print("\n=== 1. Head pose ===")
    expect(head_pose_degrees(np.eye(4)) == (0.0, 0.0, 0.0), "Facing the camera: yaw/pitch/roll 0")
    a = math.radians(40)
    rot_y = np.array([[math.cos(a), 0, math.sin(a), 0], [0, 1, 0, 0], [-math.sin(a), 0, math.cos(a), 0], [0, 0, 0, 1]])
    expect(abs(head_pose_degrees(rot_y)[0] - 40.0) < 0.5, "Head turned 40 degrees: yaw 40")

    print("\n=== 2. Mouth wide open while not speaking ===")
    open_mouth = {k: frame(jaw=0.7) for k in range(5, 11)}
    s = summarize_face_movement(samples(overrides=open_mouth), silence(), 20.0)
    expect("mouth_open_silent" in flags(s), "Mouth wide open for 6 s of silence is flagged")
    msg = next(f["message"] for f in s["flags"] if f["type"] == "mouth_open_silent")
    expect("cannot tell it apart from a yawn" in msg, "Message says it cannot tell a pulled face from a yawn")
    expect("mouth_open_silent" not in flags(summarize_face_movement(samples(overrides=open_mouth), speech(), 20.0)),
           "Same mouth opening while speaking is not flagged")
    expect("mouth_open_silent" not in flags(summarize_face_movement(samples(overrides={5: frame(jaw=0.7)}), silence(), 20.0)),
           "A single open-mouth frame is not flagged")
    no_audio = summarize_face_movement(samples(overrides=open_mouth), None, 20.0)
    expect("mouth_open_silent" not in flags(no_audio) and "unavailable" in no_audio["speech_timing"],
           "Without audio timing the mouth check is skipped, and says so")

    print("\n=== 3. Exaggerated movements ===")
    puffs = {k: frame(exag=0.8, top="cheekPuff") for k in range(3, 8)}
    s = summarize_face_movement(samples(overrides=puffs), speech(), 20.0)
    expect("exaggerated_movements" in flags(s), "Puffed cheeks in 25% of frames are flagged")
    expect("puffed cheeks" in s["flags"][0]["message"], "Message names the movement in plain words")
    expect(flags(summarize_face_movement(samples(overrides={3: frame(exag=0.8)}), speech(), 20.0)) == [],
           "One exaggerated frame is not flagged")
    stretch = {k: dict(frame(), speech_shaped_max=0.8, speech_shaped_top="mouthStretchLeft") for k in range(3, 8)}
    expect(flags(summarize_face_movement(samples(overrides=stretch), speech(), 20.0)) == [],
           "Stretched mouth while speaking (normal speech shape) is not flagged")
    expect("exaggerated_movements" in flags(summarize_face_movement(samples(overrides=stretch), silence(), 20.0)),
           "Same stretched mouth while silent is flagged")
    expect("mouthPucker" not in FM.ALL_UNUSUAL_BLENDSHAPES,
           "Puckered lips are not used (false flags with a hand over the mouth or a dark room)")

    print("\n=== 4. Looking away ===")
    turned = {k: frame(yaw=45.0) for k in range(0, 8)}
    s = summarize_face_movement(samples(overrides=turned), speech(), 20.0)
    expect("looking_away" in flags(s), "Head turned 45 degrees for 40% of the answer is flagged")
    expect("reading notes" in s["flags"][0]["message"], "Message says it cannot tell reading notes from looking around")
    small_turn = {k: frame(yaw=15.0) for k in range(0, 20)}
    expect(flags(summarize_face_movement(samples(overrides=small_turn), speech(), 20.0)) == [],
           "Natural head movement (15 degrees) is not flagged")
    down = {k: frame(pitch=-35.0) for k in range(0, 8)}
    expect("looking_away" in flags(summarize_face_movement(samples(overrides=down), speech(), 20.0)), "Looking down 35 degrees is flagged")

    print("\n=== 5. Evidence limits ===")
    few = summarize_face_movement([(k, frame()) for k in range(5)], speech(), 5.0)
    expect(few["status"] == "not_assessed", "Too few frames with landmarks: not assessed")
    calm = summarize_face_movement(samples(), silence(), 20.0)
    expect(calm["status"] == "assessed" and calm["flags"] == [], "Calm, still face: assessed with no flags")
    expect("cannot tell a yawn" in calm["limitation"], "Result states what the measurement cannot tell")

    print("\n=== 6. Scoring and feedback ===")
    mflag = [{"type": "mouth_open_silent", "message": "Your mouth was wide open for about 6 s while you were not speaking."}]
    expect(_vision_assessment(facial()) == (70.0, "composure"), "No movement flags: composure score unchanged")
    expect(_vision_assessment(facial(movement_flags=mflag)) == (30.0, "composure_capped_by_face_movement"),
           "Movement flag caps the camera score at 30")
    expect(_vision_assessment(facial(composure="Not Assessed", movement_flags=mflag)) == (30.0, "face_movement"),
           "Expressions not interpretable but movements flagged: scored 30 instead of dropped")
    expect(_vision_assessment(facial(composure="Not Assessed")) == (None, None),
           "Nothing interpretable and nothing flagged: no camera score (no penalty)")
    from services.multimodal_fusion import fuse_per_question
    weak_nlp, weak_speech = {"status": "completed", "content_score": 5.0}, {"status": "completed", "fluency_score": 10.0}
    verbal_only = round(5.0 * 0.625 + 10.0 * 0.375, 1)
    flagged_unclear = facial(composure="Not Assessed", movement_flags=mflag)
    expect(fuse_per_question(weak_nlp, weak_speech, flagged_unclear)["score"] <= verbal_only,
           "A movement penalty never raises a weak answer above its verbal-only score")
    off = {"status": "no_face_detected", "camera_presence": {"status": "measured", "ratio": 0.0, "mostly_off_camera": True}}
    expect(fuse_per_question({"status": "empty", "content_score": 0.0}, {"status": "empty", "fluency_score": 0.0}, off)["score"] == 0.0,
           "Silent answer given off camera scores 0, not more")
    rec = assess_answer_camera_conduct(facial(movement_flags=mflag))
    expect(rec["notes"] and "mouth was wide open" in rec["notes"][0], "Answer note carries the movement message")
    expect(rec["expression_flags"] == ["mouth_open_silent"], "Answer record lists the movement flag")
    perq = [{"question_id": "q1", "facial_analysis": facial()}, {"question_id": "q2", "facial_analysis": facial(movement_flags=mflag)}]
    fb = camera_conduct_feedback(summarize_camera_conduct(perq))
    expect(fb["weaknesses"] and "answer 2" in fb["weaknesses"][0] and "mouth wide open while not speaking" in fb["weaknesses"][0],
           "Weakness names answer 2 and what was observed")

    print("\n=== 7. MediaPipe missing ===")
    with patch.object(FM.FaceMovementAnalyzer, "available", new_callable=lambda: property(lambda self: False)):
        r = FacialAnalyzer._face_movement([], "x.webm", 10.0, 0.0)
    expect(r["status"] == "unavailable" and r["flags"] == [], "Without MediaPipe: unavailable, no flags, no effect")

    print("\n=== 8. Real normal answer (false-flag check) ===")
    if FIXTURE.is_file() and FM.FaceMovementAnalyzer().available:
        res = FacialAnalyzer().analyze_video(str(FIXTURE), duration_seconds=30.0)
        fm = res.get("face_movement") or {}
        expect(fm.get("status") == "assessed", f"Real answer: face movement assessed ({fm.get('frames_considered')} frames)")
        expect(fm.get("speech_timing") == "measured", "Real answer: speech timing measured from the recording's audio")
        expect(fm.get("flags") == [], f"Real normal answer: no movement flags (max yaw {fm.get('max_abs_yaw')}, max unusual {fm.get('max_exaggerated')})")
    else:
        print("[SKIP] fixture recording or MediaPipe not present")

    print(f"\nALL {passed} FACE MOVEMENT CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run()
