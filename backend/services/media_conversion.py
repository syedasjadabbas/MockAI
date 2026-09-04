"""
Isolated media-processing service - audio extraction/conversion, kept
separate from both media_storage.py (where bytes live) and asr_google.py
(what calls a speech provider) so either can change without touching this.

Why this exists at all: the browser's actual MediaRecorder output was
inspected empirically (not assumed) and is a muxed video+audio WebM file
(`video/webm;codecs=vp8,opus` - see InterviewSimulator.jsx). Google Cloud
Speech-to-Text expects an audio-only stream in one of its supported
encodings; sending it the combined video+audio container directly is not
a supported usage. This module extracts just the audio track and
transcodes it to 16kHz mono LINEAR16 PCM WAV, the most universally
compatible encoding for the Speech-to-Text API, using FFmpeg.

FFmpeg was inspected and found already installed in this environment
(available on PATH) before writing this - no new dependency was added to
get audio conversion working. If FFmpeg is missing in some other
environment, conversion fails loudly and honestly (see
FFmpegNotFoundError) rather than silently skipping extraction.
"""
import shutil
import subprocess
from pathlib import Path


class FFmpegNotFoundError(RuntimeError):
    pass


class MediaConversionError(RuntimeError):
    pass


def is_ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def has_video_stream(input_path: Path) -> bool:
    """Checks if the media file contains at least one decodable video stream."""
    if not shutil.which("ffprobe"):
        return True  # Fallback to True if ffprobe binary is absent
    try:
        res = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_type",
                "-of", "csv=p=0",
                str(input_path),
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return "video" in res.stdout.strip().lower()
    except Exception:
        return True



def extract_audio_to_wav(input_path: Path, output_path: Path, sample_rate: int = 16000) -> None:
    """
    Extracts the audio track from `input_path` (any container FFmpeg can
    demux - here always our stored WebM recordings) into a mono,
    `sample_rate`Hz, 16-bit PCM WAV file at `output_path`, matching
    Google Speech-to-Text's LINEAR16 encoding requirements.
    """
    if not is_ffmpeg_available():
        raise FFmpegNotFoundError("ffmpeg is required for audio extraction but was not found on PATH")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        [
            "ffmpeg", "-y",
            "-loglevel", "error",
            "-i", str(input_path),
            "-vn",                      # drop the video track entirely
            "-acodec", "pcm_s16le",     # LINEAR16
            "-ar", str(sample_rate),
            "-ac", "1",                  # mono
            str(output_path),
        ],
        capture_output=True,
        timeout=60,
    )

    if result.returncode != 0 or not output_path.exists():
        stderr = result.stderr.decode("utf-8", errors="replace")[-500:]
        raise MediaConversionError(f"ffmpeg audio extraction failed: {stderr}")


def normalize_video_to_mp4(
    input_path: Path,
    output_path: Path,
    crf: int = 23,
    preset: str = "ultrafast",
) -> None:
    """
    Normalizes/transcodes a candidate video recording (such as browser-recorded
    streaming WebM/VP8/VP9 without EBML cues) into a frame-readable, indexed
    MP4 container with H.264 video stream.

    The output MP4 contains valid container headers, duration, and frame indices
    required for OpenCV VideoCapture frame stepping and YuNet face detection.
    Audio stream is dropped (-an) to minimize CPU overhead and disk usage during
    facial analysis.
    """
    if not is_ffmpeg_available():
        raise FFmpegNotFoundError("ffmpeg is required for video normalization but was not found on PATH")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        [
            "ffmpeg", "-y",
            "-loglevel", "error",
            "-i", str(input_path),
            "-c:v", "libx264",
            "-preset", preset,
            "-crf", str(crf),
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-an",
            str(output_path),
        ],
        capture_output=True,
        timeout=60,
    )

    if result.returncode != 0 or not output_path.exists() or output_path.stat().st_size == 0:
        stderr = result.stderr.decode("utf-8", errors="replace")[-500:]
        raise MediaConversionError(f"ffmpeg video normalization failed: {stderr}")

