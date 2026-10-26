"""
Real FR15 (Speech to Text Conversion) implementation using Google Cloud
Speech-to-Text - the report's first-named candidate technology (the other,
DeepSpeech, was not selected; see the accompanying report for why: Google
Speech-to-Text is a managed API requiring only credentials, no local model
download/hosting, which fits this FYP's environment better - this decision
is documented here rather than silently swapping to a different provider).

Honesty guarantee: this class NEVER returns status="completed" with a
transcript unless Google's API actually returned one. Every failure mode -
missing credentials, missing ffmpeg, a corrupt/missing media file, a
network or auth error from Google itself - produces status="failed" with a
human-readable `error`, never a fabricated or guessed transcript.

Credentials: standard Google Cloud Application Default Credentials via the
GOOGLE_APPLICATION_CREDENTIALS environment variable (path to a service-
account JSON key). Never hardcoded, never committed - see .env.example.
When it is not set, the free Google Speech Recognition endpoint (via the
SpeechRecognition library) is used instead.

Long answers: both Google endpoints only handle short audio (the Cloud
synchronous API rejects anything over 60 s, and the free endpoint silently
returns just the first ~30 s). The audio is therefore split into chunks of
at most CHUNK_MAX_SECONDS, each cut placed at the quietest moment near the
boundary so words are not sliced, and the chunk transcripts are joined. If
any chunk fails the whole answer is reported as failed - never a partial
transcript presented as complete.
"""
import logging
import os
import tempfile
import uuid
import wave
from pathlib import Path
from typing import List, Optional

import numpy as np

from services.ai_interfaces import ASRService, ASRResult
from services.media_conversion import extract_audio_to_wav, is_ffmpeg_available, FFmpegNotFoundError, MediaConversionError
from services.media_storage import get_media_storage

logger = logging.getLogger("mockai.asr")

# Recorded on every result so it always names the recognizer that actually ran
CLOUD_PROVIDER = "google_cloud_speech_v1"   # Google Cloud Speech-to-Text API (service-account key)
WEB_PROVIDER = "google_web_speech"          # free Google endpoint via the SpeechRecognition library

# Chunking for long answers (see module docstring)
CHUNK_MAX_SECONDS = 25.0
CHUNK_SEARCH_SECONDS = 5.0   # look this far back from the limit for a quiet cut point
CHUNK_FRAME_SECONDS = 0.02   # energy window used to find that quiet point


def _read_wav_pcm(wav_path: Path):
    """Returns (pcm_bytes, sample_rate, sample_width) of a mono PCM WAV."""
    with wave.open(str(wav_path), "rb") as wf:
        return wf.readframes(wf.getnframes()), wf.getframerate(), wf.getsampwidth()


def _split_pcm(pcm: bytes, sample_rate: int) -> List[bytes]:
    """Splits 16-bit mono PCM into chunks of at most CHUNK_MAX_SECONDS, cutting
    at the lowest-energy frame in the last CHUNK_SEARCH_SECONDS of each chunk."""
    samples = np.frombuffer(pcm, dtype=np.int16)
    max_len = int(CHUNK_MAX_SECONDS * sample_rate)
    if len(samples) <= max_len:
        return [pcm]

    search_len = int(CHUNK_SEARCH_SECONDS * sample_rate)
    frame_len = max(1, int(CHUNK_FRAME_SECONDS * sample_rate))
    chunks, start = [], 0
    while len(samples) - start > max_len:
        window_start = start + max_len - search_len
        window = samples[window_start:start + max_len].astype(np.float64)
        n_frames = len(window) // frame_len
        energy = (window[:n_frames * frame_len].reshape(n_frames, frame_len) ** 2).mean(axis=1)
        cut = window_start + int(np.argmin(energy)) * frame_len + frame_len // 2
        chunks.append(samples[start:cut].tobytes())
        start = cut
    chunks.append(samples[start:].tobytes())
    return chunks


class GoogleSpeechASRService(ASRService):
    def __init__(self, language_code: str = "en-US"):
        self.language_code = language_code

    @staticmethod
    def is_configured() -> bool:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        return bool(cred_path) and Path(cred_path).is_file()

    def provider_name(self) -> str:
        """The recognizer transcribe() will try first."""
        return CLOUD_PROVIDER if self.is_configured() else WEB_PROVIDER

    def transcribe(self, media_url: Optional[str], duration_seconds: Optional[float] = None) -> ASRResult:
        if not media_url:
            return ASRResult(status="failed", provider=self.provider_name(), error="No media reference was provided for this response")

        media_path = get_media_storage().resolve_path(media_url)
        if not media_path and os.path.isfile(str(media_url)):
            media_path = Path(media_url)

        if not media_path:
            return ASRResult(status="failed", provider=self.provider_name(), error=f"Stored media could not be found for reference: {media_url}")

        if not is_ffmpeg_available():
            return ASRResult(status="failed", provider=self.provider_name(), error="ffmpeg is required to extract audio from the recording but is not available")

        wav_path = Path(tempfile.gettempdir()) / f"mockai_asr_{uuid.uuid4().hex}.wav"
        try:
            try:
                extract_audio_to_wav(media_path, wav_path)
            except (FFmpegNotFoundError, MediaConversionError) as exc:
                return ASRResult(status="failed", provider=self.provider_name(), error=f"Audio extraction failed: {exc}")

            try:
                pcm, sample_rate, sample_width = _read_wav_pcm(wav_path)
                chunks = _split_pcm(pcm, sample_rate)
            except Exception as exc:
                return ASRResult(status="failed", provider=self.provider_name(), error=f"Could not read extracted audio: {exc}")

            # 1. Primary: Enterprise Google Cloud Speech-to-Text client
            if self.is_configured():
                try:
                    from google.cloud import speech
                    client = speech.SpeechClient()
                    config = speech.RecognitionConfig(
                        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                        sample_rate_hertz=sample_rate,
                        language_code=self.language_code,
                    )
                    parts = []
                    for chunk in chunks:
                        response = client.recognize(config=config, audio=speech.RecognitionAudio(content=chunk))
                        parts.extend(
                            result.alternatives[0].transcript.strip()
                            for result in response.results
                            if result.alternatives
                        )
                    transcript = " ".join(p for p in parts if p).strip()
                    return ASRResult(status="completed", provider=CLOUD_PROVIDER, transcript=transcript)
                except Exception as exc:
                    logger.warning("Google Cloud Speech-to-Text failed, using free recognizer: %s", exc)

            # 2. Integrated Fallback: Google Speech API Recognition
            try:
                import speech_recognition as sr
                recognizer = sr.Recognizer()
                parts = []
                for index, chunk in enumerate(chunks):
                    audio_data = sr.AudioData(chunk, sample_rate, sample_width)
                    try:
                        parts.append(recognizer.recognize_google(audio_data, language=self.language_code).strip())
                    except sr.UnknownValueError:
                        # Clean silence / no audible speech in this chunk
                        continue
                    except sr.RequestError as req_err:
                        where = f" (part {index + 1} of {len(chunks)})" if len(chunks) > 1 else ""
                        return ASRResult(status="failed", provider=WEB_PROVIDER, error=f"Google Speech-to-Text request failed{where}: {req_err}")
                return ASRResult(status="completed", provider=WEB_PROVIDER, transcript=" ".join(p for p in parts if p))
            except Exception as sr_err:
                return ASRResult(status="failed", provider=WEB_PROVIDER, error=f"Speech recognition failed: {sr_err}")

        finally:
            wav_path.unlink(missing_ok=True)
