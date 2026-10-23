"""
Calibrates the camera-presence measurement against known ground truth.

Takes real interview recordings where the candidate was in frame throughout,
blacks out a known share of each clip (one continuous stretch, like walking
away), runs the real facial analyzer, and compares the measured in-frame ratio
with the true one. Also reports how often the 60% "mostly off camera" cutoff
gives the right answer.

This validates the MEASUREMENT (does the detector see the face when it is
there and not when it is gone). It does not validate expression flags, which
need human-labelled recordings (see docs/EVALUATION_VALIDATION_PLAN.md).

Usage (from backend/, read-only on the database):
  ../.venv311/Scripts/python.exe calibrate_camera_presence.py [--clips 6] [--out ../docs/camera_presence_calibration.json]
"""
import argparse
import json
import random
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from services.facial_analyzer import FacialAnalyzer, OFF_CAMERA_PRESENCE_THRESHOLD  # noqa: E402

MEDIA = Path(__file__).parent / "media" / "interviews"
OFF_SHARES = [0.0, 0.2, 0.4, 0.5, 0.7, 0.9]
CLIP_SECONDS = 30.0


def duration(path: Path) -> float:
    # Browser MediaRecorder WebM files carry no duration in the header, so read
    # the last video packet timestamp instead of format=duration.
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    times = [float(t) for t in out.stdout.split() if t.replace(".", "", 1).isdigit()]
    return max(times) if times else 0.0


def fully_in_frame_clips(analyzer: FacialAnalyzer, limit: int):
    clips = []
    for webm in sorted(MEDIA.glob("*/*/response.webm")):
        d = duration(webm)
        if d < 10:
            continue
        res = analyzer.analyze_video(str(webm), duration_seconds=d)
        cp = res.get("camera_presence") or {}
        if cp.get("status") == "measured" and cp.get("ratio", 0) >= 0.95:
            clips.append((webm, min(d, CLIP_SECONDS)))
            print(f"  baseline in frame {cp['ratio']:.0%}: {webm.parent.parent.name}/{webm.parent.name} ({d:.0f}s)", flush=True)
        if len(clips) >= limit:
            break
    return clips


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", type=int, default=6)
    ap.add_argument("--out", default=None)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    analyzer = FacialAnalyzer()

    print("Finding recordings with the candidate in frame throughout...")
    clips = fully_in_frame_clips(analyzer, args.clips)
    if not clips:
        sys.exit("No suitable recordings found under media/interviews.")

    rows = []
    with tempfile.TemporaryDirectory() as td:
        for webm, d in clips:
            for share in OFF_SHARES:
                off = share * d
                start = rng.uniform(0, d - off) if off < d else 0.0
                out = Path(td) / "clip.mp4"
                vf = f"drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='between(t,{start:.2f},{start + off:.2f})'" if off > 0 else "null"
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(webm), "-t", f"{d:.2f}", "-vf", vf, "-an", str(out)], check=True)
                res = analyzer.analyze_video(str(out), duration_seconds=d)
                measured = (res.get("camera_presence") or {}).get("ratio")
                true_in = 1.0 - share
                rows.append({
                    "clip": f"{webm.parent.parent.name}/{webm.parent.name}",
                    "true_in_frame": round(true_in, 3),
                    "measured_in_frame": measured,
                    "error": None if measured is None else round(measured - true_in, 3),
                    "true_off_camera": true_in < OFF_CAMERA_PRESENCE_THRESHOLD,
                    "flagged_off_camera": None if measured is None else measured < OFF_CAMERA_PRESENCE_THRESHOLD,
                })
                print(f"  true {true_in:.0%}  measured {measured if measured is None else f'{measured:.0%}'}", flush=True)

    valid = [r for r in rows if r["measured_in_frame"] is not None]
    errs = [abs(r["error"]) for r in valid]
    correct = sum(1 for r in valid if r["true_off_camera"] == r["flagged_off_camera"])
    missed_face = sum(1 for r in valid if r["true_in_frame"] == 1.0 and r["measured_in_frame"] < 0.95)
    summary = {
        "clips": len(clips),
        "trials": len(rows),
        "mean_absolute_error": round(sum(errs) / len(errs), 3) if errs else None,
        "max_absolute_error": round(max(errs), 3) if errs else None,
        "mean_signed_error": round(sum(r["error"] for r in valid) / len(valid), 3) if valid else None,
        "cutoff": OFF_CAMERA_PRESENCE_THRESHOLD,
        "cutoff_decisions_correct": f"{correct}/{len(valid)}",
        "unblocked_clips_with_missed_face": missed_face,
        "note": "Ground truth = share of the clip blacked out. Measures detector accuracy, not human judgement.",
    }
    print(json.dumps(summary, indent=1))
    if args.out:
        Path(args.out).write_text(json.dumps({"summary": summary, "trials": rows}, indent=1), encoding="utf-8")
        print(f"Saved -> {args.out}")


if __name__ == "__main__":
    main()
