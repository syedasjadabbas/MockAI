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
