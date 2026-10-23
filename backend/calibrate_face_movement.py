"""
Calibrates the face-movement thresholds (services/face_movement.py) on real
recordings of normal interview answers.

For every recorded answer under media/interviews it samples frames like the
evaluation does, measures jaw opening, the strongest "exaggerated" blendshape
and head pose with MediaPipe, and marks whether the candidate was speaking at
each frame (from the recording's audio). It then reports:
- the distribution of each measure over normal answers (per frame and the
  per-answer maximum), and
- how many normal answers the current thresholds would flag (false flags).

What this cannot do: show that pulled faces ARE caught. That needs recordings
of people deliberately pulling faces, labelled by a person (add them with
--labelled <dir>, one sub-folder per clip named faces_* or normal_*).

Usage (from backend/, read-only):
  ../.venv311/Scripts/python.exe calibrate_face_movement.py [--out ../docs/face_movement_calibration.json]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import cv2  # noqa: E402
import numpy as np  # noqa: E402

from services import face_movement as FM  # noqa: E402
from services.delivery_analyzer import sound_activity_timeline  # noqa: E402

MEDIA = Path(__file__).parent / "media" / "interviews"
SAMPLES = 40


def duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    times = [float(t) for t in out.stdout.split() if t.replace(".", "", 1).isdigit()]
    return max(times) if times else 0.0


def sample_frames(path: Path, d: float):
    # Browser WebM has no seek index: extract the sampled frames with FFmpeg
    # at a fixed rate instead of seeking with OpenCV.
    import tempfile
    rate = SAMPLES / d
    out = []
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"fps={rate:.5f},scale=480:-2",
                        "-frames:v", str(SAMPLES), str(Path(td) / "f_%03d.png")], check=False)
        for k, png in enumerate(sorted(Path(td).glob("f_*.png"))):
            frame = cv2.imread(str(png))
            if frame is not None:
                out.append(((k + 0.5) / rate, frame))
    return out


def analyse(path: Path, label: str = "normal"):
    d = duration(path)
    if d < 5:
        return None
    analyzer = FM.FaceMovementAnalyzer()
    activity = sound_activity_timeline(media_url=str(path))
    samples = [(t, analyzer.measure_frame(f)) for t, f in sample_frames(path, d)]
    measured = [(t, m) for t, m in samples if m]
    if len(measured) < FM.MIN_FRAMES_FOR_MOVEMENT:
        return None
    silent = [m for t, m in measured if FM._speaking_at(t, activity) is False]
    summary = FM.summarize_face_movement(samples, activity, d)
    return {
        "clip": f"{path.parent.parent.name}/{path.parent.name}",
        "label": label,
        "seconds": round(d, 1),
        "frames": len(measured),
        "silent_frames": len(silent),
        "jaw_open_silent": [round(m["jaw_open"] or 0, 3) for m in silent],
        "jaw_open_speaking": [round(m["jaw_open"] or 0, 3) for t, m in measured if FM._speaking_at(t, activity)],
        "exaggerated": [round(m["exaggerated_max"] or 0, 3) for _, m in measured],
        "exaggerated_names": [m["exaggerated_top"] for _, m in measured],
        "speech_shaped_silent": [round(m["speech_shaped_max"] or 0, 3) for m in silent],
        "speech_shaped_speaking": [round(m["speech_shaped_max"] or 0, 3) for t, m in measured if FM._speaking_at(t, activity)],
        "abs_yaw": [abs(m["yaw"]) for _, m in measured if m["yaw"] is not None],
        "abs_pitch": [abs(m["pitch"]) for _, m in measured if m["pitch"] is not None],
        "flags": [f["type"] for f in summary["flags"]],
    }


def pct(values, q):
    return round(float(np.percentile(values, q)), 3) if values else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    ap.add_argument("--labelled", default=None, help="folder of labelled clips: faces_*/ or normal_* sub-folders with a video")
    args = ap.parse_args()

    rows = []
    for webm in sorted(MEDIA.glob("*/*/response.webm")):
        r = analyse(webm)
        if r:
            rows.append(r)
            print(f"  {r['clip']} {r['seconds']}s frames={r['frames']} silent={r['silent_frames']} flags={r['flags']}", flush=True)
    if args.labelled:
        for vid in sorted(Path(args.labelled).glob("*/*")):
            label = "faces" if vid.parent.name.startswith("faces") else "normal"
            r = analyse(vid, label)
            if r:
                rows.append(r)
                print(f"  [{label}] {vid} flags={r['flags']}", flush=True)

    normal = [r for r in rows if r["label"] == "normal"]
    allv = lambda key: [v for r in normal for v in r[key]]  # noqa: E731
    per_clip_max = lambda key: [max(r[key]) for r in normal if r[key]]  # noqa: E731
    summary = {
        "normal_answers": len(normal),
        "jaw_open_while_speaking": {"p95": pct(allv("jaw_open_speaking"), 95), "p99": pct(allv("jaw_open_speaking"), 99), "max": pct(allv("jaw_open_speaking"), 100)},
        "jaw_open_while_silent": {"p95": pct(allv("jaw_open_silent"), 95), "p99": pct(allv("jaw_open_silent"), 99), "max": pct(allv("jaw_open_silent"), 100)},
        "exaggerated_blendshape": {"p95": pct(allv("exaggerated"), 95), "p99": pct(allv("exaggerated"), 99), "max": pct(allv("exaggerated"), 100)},
        "speech_shaped_while_speaking": {"p95": pct(allv("speech_shaped_speaking"), 95), "p99": pct(allv("speech_shaped_speaking"), 99), "max": pct(allv("speech_shaped_speaking"), 100)},
        "speech_shaped_while_silent": {"p95": pct(allv("speech_shaped_silent"), 95), "p99": pct(allv("speech_shaped_silent"), 99), "max": pct(allv("speech_shaped_silent"), 100)},
        "abs_yaw_degrees": {"p95": pct(allv("abs_yaw"), 95), "p99": pct(allv("abs_yaw"), 99), "max": pct(allv("abs_yaw"), 100)},
        "abs_pitch_degrees": {"p95": pct(allv("abs_pitch"), 95), "p99": pct(allv("abs_pitch"), 99), "max": pct(allv("abs_pitch"), 100)},
        "per_answer_max_jaw_open_silent": sorted(per_clip_max("jaw_open_silent"))[-5:],
        "thresholds": {"jaw_open_silent": FM.JAW_OPEN_SILENT, "exaggerated": FM.EXAGGERATED_THRESHOLD,
                       "yaw": FM.YAW_AWAY_DEGREES, "pitch": FM.PITCH_AWAY_DEGREES},
        "normal_answers_flagged": [{"clip": r["clip"], "flags": r["flags"]} for r in normal if r["flags"]],
        "labelled_faces_caught": [{"clip": r["clip"], "flags": r["flags"]} for r in rows if r["label"] == "faces"],
    }
    print(json.dumps(summary, indent=1))
    if args.out:
        Path(args.out).write_text(json.dumps({"summary": summary, "answers": rows}, indent=1), encoding="utf-8")
        print(f"Saved -> {args.out}")


if __name__ == "__main__":
    main()
