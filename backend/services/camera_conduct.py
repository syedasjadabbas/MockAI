"""
Camera conduct summary (extension of FR17 behavioural analysis).

Turns each answer's measured camera presence and expression flags (see
facial_analyzer._camera_presence / _expression_conduct) into:
- a per-answer record the results page can show ("Answer 3: in frame 20%"),
- interview-level feedback: weaknesses and suggestions that name the answers.

Everything here restates measurements. The expression model cannot recognise
teasing, tongue-out or mocking faces as such, so flags are worded as what the
model observed, never as the candidate's intent.
"""
from typing import Dict, List


def _fmt_seconds(s: float) -> str:
    s = int(round(s or 0))
    return f"{s // 60}:{s % 60:02d}"


def assess_answer_camera_conduct(facial_result: Dict) -> Dict:
    """Per-answer camera conduct record (attached to each per_question result)."""
    facial_result = facial_result or {}
    presence = facial_result.get("camera_presence") or {}
    conduct = facial_result.get("expression_conduct") or {}
    if presence.get("status") != "measured":
        return {"status": "not_measured", "notes": []}

    notes: List[str] = []
    ratio = float(presence.get("ratio") or 0.0)
    if presence.get("mostly_off_camera"):
        notes.append(f"Your face was in frame for only {ratio:.0%} of this answer. Stay centred in front of the camera.")
    elif ratio < 0.95 and (presence.get("longest_off_camera_seconds") or 0) >= 3:
        seg = max(presence.get("off_camera_segments") or [{}], key=lambda s: (s.get("end", 0) - s.get("start", 0)))
        if seg:
            notes.append(f"You left the frame from {_fmt_seconds(seg.get('start'))} to {_fmt_seconds(seg.get('end'))}.")
    movement = facial_result.get("face_movement") or {}
    flags = (conduct.get("flags") or []) + (movement.get("flags") or [])
    notes.extend(f["message"] for f in flags if f.get("message"))
    return {
        "status": "measured",
        "camera_presence_ratio": ratio,
        "off_camera_seconds": presence.get("off_camera_seconds"),
        "mostly_off_camera": bool(presence.get("mostly_off_camera")),
        "off_camera_segments": presence.get("off_camera_segments") or [],
        "expression_flags": [f.get("type") for f in flags],
        "expression_conduct_status": conduct.get("status", "not_assessed"),
        "notes": notes,
    }


def summarize_camera_conduct(per_question_results: List[Dict]) -> Dict:
    answers: List[Dict] = []
    for idx, q in enumerate(per_question_results or [], start=1):
        rec = q.get("camera_conduct") or assess_answer_camera_conduct(q.get("facial_analysis") or {})
        if rec.get("status") != "measured":
            continue
        answers.append({"answer": idx, "question_id": q.get("question_id"), **rec})
    if not answers:
        return {"status": "not_measured", "answers": [], "off_camera_answers": [], "flagged_answers": []}
    ratios = [a["camera_presence_ratio"] for a in answers]
    return {
        "status": "measured",
        "answers": answers,
        "average_presence_ratio": round(sum(ratios) / len(ratios), 3),
        "off_camera_answers": [a["answer"] for a in answers if a["mostly_off_camera"]],
        "flagged_answers": [a["answer"] for a in answers if a["expression_flags"]],
        "limitation": "Camera presence is measured by face detection. Expression flags use the model's emotion classes and face-movement flags use face geometry; neither can tell why the face moved (teasing, a yawn, reading notes).",
    }


_FLAG_LABELS = {
    "negative_expressions": "expressions read as anger, disgust or contempt",
    "rapid_expression_changes": "expression switching rapidly",
    "mouth_open_silent": "mouth wide open while not speaking",
    "exaggerated_movements": "exaggerated face movements",
    "looking_away": "head turned away from the camera",
}


def _answer_list(nums: List[int]) -> str:
    nums = [str(n) for n in nums]
    return nums[0] if len(nums) == 1 else ", ".join(nums[:-1]) + " and " + nums[-1]


def camera_conduct_feedback(summary: Dict) -> Dict:
    """Weaknesses / suggestions naming the answers concerned (empty if fine)."""
    out = {"weaknesses": [], "weaknesses_detail": [], "suggestions": [], "strengths": []}
    if (summary or {}).get("status") != "measured":
        return out
    off = summary.get("off_camera_answers") or []
    flagged = summary.get("flagged_answers") or []
    if off:
        worst = min((a for a in summary["answers"] if a["mostly_off_camera"]), key=lambda a: a["camera_presence_ratio"])
        out["weaknesses"].append(
            f"Away From the Camera: you were mostly out of frame in answer{'s' if len(off) > 1 else ''} {_answer_list(off)} "
            f"(as low as {worst['camera_presence_ratio']:.0%} in answer {worst['answer']}), which lowered your score."
        )
        out["weaknesses_detail"].append({
            "category": "Behavioral",
            "title": "Away From the Camera",
            "description": "Your face was not visible for most of these answers, so the camera share of the score was based on presence.",
            "evidence": ", ".join(f"Answer {a['answer']}: {a['camera_presence_ratio']:.0%} in frame" for a in summary["answers"] if a["mostly_off_camera"]),
            "severity": "High",
        })
        out["suggestions"].append(
            "Stay On Camera: sit centred at arm's length with your face lit from the front, and stay in frame for the whole answer."
        )
    if flagged:
        kinds: List[str] = []
        for a in summary["answers"]:
            for t in a["expression_flags"]:
                label = _FLAG_LABELS.get(t, t)
                if label not in kinds:
                    kinds.append(label)
        out["weaknesses"].append(
            f"Unprofessional Face Conduct: flagged in answer{'s' if len(flagged) > 1 else ''} {_answer_list(flagged)} "
            f"({'; '.join(kinds)})."
        )
        out["weaknesses_detail"].append({
            "category": "Behavioral",
            "title": "Unprofessional Face Conduct",
            "description": ("The face analysis observed " + "; ".join(kinds) + ". It measures what the face did, not why "
                            "(it cannot tell teasing from a yawn or reading notes), so review the recording."),
            "evidence": ", ".join(f"Answer {a['answer']}" for a in summary["answers"] if a["expression_flags"]),
            "severity": "Medium",
        })
        out["suggestions"].append(
            "Keep a Professional Expression: treat the practice like a real interview; face the camera, avoid pulling faces and keep a calm, attentive look."
        )
    if not off and not flagged and summary.get("average_presence_ratio", 0) >= 0.9 and len(summary["answers"]) >= 2:
        out["strengths"].append("Stayed On Camera: your face was clearly in frame throughout your answers.")
    return out
