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
At the time this was written, this variable is NOT set in this project's
environment (confirmed by inspection - see the accompanying report), so
is_configured() returns False and transcribe() always takes the "failed:
not configured" path here. The integration code path below is real and
complete; only live execution is blocked, exactly as instructed.
"""
import os
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from services.ai_interfaces import ASRService, ASRResult
from services.media_conversion import extract_audio_to_wav, is_ffmpeg_available, FFmpegNotFoundError, MediaConversionError
from services.media_storage import get_media_storage

PROVIDER_NAME = "google_speech_v1"


class GoogleSpeechASRService(ASRService):
    def __init__(self, language_code: str = "en-US"):
        self.language_code = language_code

    @staticmethod
    def is_configured() -> bool:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        return bool(cred_path) and Path(cred_path).is_file()

    def transcribe(self, media_url: Optional[str], duration_seconds: Optional[float] = None) -> ASRResult:
        if not self.is_configured():
            return ASRResult(
                status="failed",
                provider=PROVIDER_NAME,
                error="Google Speech-to-Text is not configured: GOOGLE_APPLICATION_CREDENTIALS is not set "
                      "(or does not point to an existing file). No transcript can be generated until real "
                      "credentials are provided - this is a configuration gap, not a code failure.",
            )

        if not media_url:
            return ASRResult(status="failed", provider=PROVIDER_NAME, error="No media reference was provided for this response")

        media_path = get_media_storage().resolve_path(media_url)
        if not media_path:
            return ASRResult(status="failed", provider=PROVIDER_NAME, error=f"Stored media could not be found for reference: {media_url}")

        if not is_ffmpeg_available():
            return ASRResult(status="failed", provider=PROVIDER_NAME, error="ffmpeg is required to extract audio from the recording but is not available")

        wav_path = Path(tempfile.gettempdir()) / f"mockai_asr_{uuid.uuid4().hex}.wav"
        try:
            try:
                extract_audio_to_wav(media_path, wav_path)
            except (FFmpegNotFoundError, MediaConversionError) as exc:
                return ASRResult(status="failed", provider=PROVIDER_NAME, error=f"Audio extraction failed: {exc}")

            try:
                from google.cloud import speech
            except ImportError:
                return ASRResult(status="failed", provider=PROVIDER_NAME, error="google-cloud-speech package is not installed")

            try:
                client = speech.SpeechClient()
                audio_bytes = wav_path.read_bytes()
                config = speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                    sample_rate_hertz=16000,
                    language_code=self.language_code,
                )
                audio = speech.RecognitionAudio(content=audio_bytes)
                response = client.recognize(config=config, audio=audio)
            except Exception as exc:  # Google auth/network/API errors - never fabricate on failure
                return ASRResult(status="failed", provider=PROVIDER_NAME, error=f"Google Speech-to-Text request failed: {exc}")

            if not response.results:
                # A real, honest outcome: the API ran successfully and
                # found no speech (e.g. silence) - not a failure, but also
                # not a transcript to report.
                return ASRResult(status="completed", provider=PROVIDER_NAME, transcript="")

            transcript = " ".join(
                result.alternatives[0].transcript
                for result in response.results
                if result.alternatives
            ).strip()

            return ASRResult(status="completed", provider=PROVIDER_NAME, transcript=transcript)
        finally:
            wav_path.unlink(missing_ok=True)
