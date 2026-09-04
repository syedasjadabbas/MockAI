"""
Regression Test Suite: WebM Video Normalization & Facial CV Extraction (Task 12D)

Verifies:
1. Direct FFmpeg normalization of streaming WebM to frame-readable MP4.
2. OpenCV VideoCapture frame stepping and frame readability from normalized video.
3. FacialAnalyzer automatic WebM detection, normalization, and face/emotion inference.
4. Guaranteed cleanup of temporary converted MP4 files (zero disk leak).
5. Graceful degradation on missing or corrupted media.
6. Trimodal fusion integration in question evaluation with real WebM media.
"""
import os
import sys
import glob
import tempfile
from typing import Optional
from pathlib import Path

import cv2

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.media_conversion import is_ffmpeg_available, normalize_video_to_mp4, has_video_stream, MediaConversionError
from services.facial_analyzer import FacialAnalyzer
from services.question_evaluator import evaluate_question_response


def find_sample_webm() -> Path:
    """Finds an existing real WebM candidate recording containing video stream and human face."""
    real_candidate = BACKEND_DIR / "media/interviews/6a96c6df4fe22d4bad7fc5a7/6a884ae95deeec968f07461a/response.webm"
    if real_candidate.is_file() and has_video_stream(real_candidate):
        return real_candidate

    candidates = list(BACKEND_DIR.glob("media/interviews/*/*/response.webm"))
    if not candidates:
        candidates = list(BACKEND_DIR.parent.glob("backend/media/interviews/*/*/response.webm"))
    
    # Filter for webm files that contain a video stream
    video_webms = [c for c in candidates if has_video_stream(c)]
    if not video_webms:
        raise RuntimeError("No sample video response.webm found in media storage for testing.")
    return video_webms[0]


def find_audio_only_webm() -> Optional[Path]:
    """Finds an audio-only WebM recording for edge-case testing if available."""
    candidates = list(BACKEND_DIR.glob("media/interviews/*/*/response.webm"))
    if not candidates:
        candidates = list(BACKEND_DIR.parent.glob("backend/media/interviews/*/*/response.webm"))
    audio_webms = [c for c in candidates if not has_video_stream(c)]
    return audio_webms[0] if audio_webms else None


def test_ffmpeg_available():
    """Ensure FFmpeg binary is installed and detected on PATH."""
    assert is_ffmpeg_available() is True, "FFmpeg is required for production video normalization but was not found."


def test_normalize_video_to_mp4_direct():
    """Verifies direct normalization of a browser-recorded WebM to indexed MP4."""
    sample_webm = find_sample_webm()
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tf:
        out_mp4_path = Path(tf.name)

    try:
        normalize_video_to_mp4(sample_webm, out_mp4_path)
        assert out_mp4_path.exists(), "Normalized MP4 output file does not exist."
        assert out_mp4_path.stat().st_size > 0, "Normalized MP4 output file is 0 bytes."

        # Verify OpenCV frame readability
        cap = cv2.VideoCapture(str(out_mp4_path))
        assert cap.isOpened(), "OpenCV VideoCapture failed to open normalized MP4."
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        assert frame_count > 0, f"Expected frame_count > 0, got {frame_count}"
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        assert width > 0 and height > 0, f"Invalid dimensions: {width}x{height}"

        ret, frame = cap.read()
        cap.release()
        assert ret is True, "Failed to read first frame from normalized MP4."
        assert frame is not None and frame.shape == (height, width, 3)
    finally:
        if out_mp4_path.exists():
            out_mp4_path.unlink()


def test_facial_analyzer_automatic_normalization_and_cleanup():
    """Verifies that FacialAnalyzer automatically normalizes WebM, extracts faces, and cleans up temp files."""
    sample_webm = find_sample_webm()
    temp_pattern = os.path.join(tempfile.gettempdir(), "mockai_norm_*.mp4")
    before_temp_files = set(glob.glob(temp_pattern))

    analyzer = FacialAnalyzer()
    result = analyzer.analyze_video(str(sample_webm), max_samples=10, fps_sample_rate=1.0)

    after_temp_files = set(glob.glob(temp_pattern))
    leaked_files = after_temp_files - before_temp_files

    assert len(leaked_files) == 0, f"Temporary normalized MP4 files were leaked: {leaked_files}"
    assert result["status"] == "completed", f"Expected completed status, got {result['status']}: {result.get('error')}"
    assert result["face_detected"] is True, "Expected face_detected to be True for candidate video."
    assert result["total_frames_sampled"] > 0, "Expected sampled frames > 0"
    assert result["frames_with_face"] > 0, "Expected frames with face > 0"
    assert result["dominant_expression"] in ["Neutral", "Happiness", "Surprise", "Sadness", "Anger", "Disgust", "Fear", "Contempt"]
    assert "behavioral_indicators" in result
    assert result["behavioral_indicators"]["engagement_level"] != "Unavailable"
    assert result["behavioral_indicators"]["composure_index"] != "Unavailable"
    assert result["behavioral_indicators"]["observable_tension"] != "Unavailable"


def test_corrupt_media_graceful_degradation():
    """Verifies that 0-byte and corrupted media files degrade gracefully without exceptions."""
    analyzer = FacialAnalyzer()

    # 1. 0-byte file
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tf:
        empty_path = tf.name
    try:
        res_empty = analyzer.analyze_video(empty_path)
        assert res_empty["status"] == "corrupt_media"
        assert res_empty["face_detected"] is False
    finally:
        if os.path.exists(empty_path):
            os.remove(empty_path)

    # 2. Corrupted header file
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tf:
        corrupt_path = tf.name
        tf.write(b"NOT_A_VALID_WEBM_OR_EBML_HEADER")
    try:
        res_corrupt = analyzer.analyze_video(corrupt_path)
        assert res_corrupt["status"] in ("corrupt_media", "insufficient_data")
        assert res_corrupt["face_detected"] is False
    finally:
        if os.path.exists(corrupt_path):
            os.remove(corrupt_path)


def test_missing_media_graceful_degradation():
    """Verifies that non-existent media paths degrade cleanly with status missing_media."""
    analyzer = FacialAnalyzer()
    res = analyzer.analyze_video("non_existent_path_xyz_12345.webm")
    assert res["status"] == "missing_media"
    assert res["face_detected"] is False


def test_e2e_question_evaluator_trimodal_with_webm():
    """Verifies that evaluate_question_response completes with active Vision from WebM."""
    sample_webm = find_sample_webm()

    eval_result = evaluate_question_response(
        question_id="6a884ae95deeec968f07461a",
        question_text="Tell me about yourself and your technical background.",
        expected_answer="I am a software engineer with extensive experience in full stack development.",
        tags=["experience", "software", "development", "projects"],
        difficulty="Medium",
        transcript="I am a software engineer with extensive experience in full stack development and building scalable applications.",
        duration_seconds=15.0,
        media_url=str(sample_webm),
    )

    assert "facial_analysis" in eval_result
    assert eval_result["facial_analysis"]["status"] == "completed"
    assert eval_result["facial_analysis"]["face_detected"] is True

    assert "multimodal" in eval_result
    mm = eval_result["multimodal"]
    assert mm["modality_status"]["vision"] == "available"
    assert mm["weights_used"]["vision"] > 0
    assert mm["vision_contribution"] is not None

    cd = eval_result["confidence_and_stress"]
    assert cd["modality_status"]["vision"] == "available"
    assert cd["facial_evidence"] is not None


def test_audio_only_webm_graceful_handling():
    """Verifies that an audio-only WebM cleanly degrades to insufficient_data without errors."""
    audio_webm = find_audio_only_webm()
    if not audio_webm:
        return
    analyzer = FacialAnalyzer()
    res = analyzer.analyze_video(str(audio_webm))
    assert res["status"] == "insufficient_data"
    assert res["face_detected"] is False
    assert "audio-only" in res.get("error", "").lower() or "video stream" in res.get("error", "").lower()


if __name__ == "__main__":
    print("=" * 70)
    print("RUNNING WEBM VIDEO NORMALIZATION & VISION REGRESSION TESTS")
    print("=" * 70)

    test_ffmpeg_available()
    print("  PASS: test_ffmpeg_available")

    test_normalize_video_to_mp4_direct()
    print("  PASS: test_normalize_video_to_mp4_direct")

    test_facial_analyzer_automatic_normalization_and_cleanup()
    print("  PASS: test_facial_analyzer_automatic_normalization_and_cleanup")

    test_corrupt_media_graceful_degradation()
    print("  PASS: test_corrupt_media_graceful_degradation")

    test_missing_media_graceful_degradation()
    print("  PASS: test_missing_media_graceful_degradation")

    test_audio_only_webm_graceful_handling()
    print("  PASS: test_audio_only_webm_graceful_handling")

    test_e2e_question_evaluator_trimodal_with_webm()
    print("  PASS: test_e2e_question_evaluator_trimodal_with_webm")

    print("\nALL 7 WEBM NORMALIZATION & FACIAL REGRESSION TESTS PASSED!")
