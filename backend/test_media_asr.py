"""
Media Ingestion + Speech-to-Text backend test suite.

Covers: media_storage.py (path-traversal safety, save/resolve), media_
conversion.py (real ffmpeg audio extraction against a real webm fixture),
asr_google.py (honest not-configured behavior, mocked success/failure
paths, and an explicit skip-if-unconfigured live-integration path), and
the full upload endpoint (auth, ownership, question validation, interview-
state validation, content-type/size validation, safe filename generation,
persistence, and - explicitly - that no fake transcript is ever stored).

A real 1-second webm/opus audio fixture is synthesized with ffmpeg at test
start (not a checked-in binary) so both the upload endpoint and the real
ffmpeg extraction path are exercised against genuine webm bytes, not
placeholder text pretending to be media.

Run with: ../.venv/Scripts/python.exe test_media_asr.py
"""
import os
import subprocess
import tempfile
import time
from pathlib import Path
from unittest.mock import patch

from bson import ObjectId
from fastapi.testclient import TestClient

from main import app
from database import interviews_collection
from services.ai_interfaces import ASRResult
from services.media_storage import LocalFilesystemMediaStorage, get_media_storage
from services.media_conversion import extract_audio_to_wav, is_ffmpeg_available
from services.asr_google import GoogleSpeechASRService

client = TestClient(app)


def expect(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"[PASS] {message}")


def make_test_webm(path: Path, duration: int = 1):
    subprocess.run(
        ["ffmpeg", "-f", "lavfi", "-i", f"sine=frequency=440:duration={duration}", "-c:a", "libopus", "-y", str(path)],
        capture_output=True, check=True,
    )


def register_and_login(label: str):
    email = f"media.{label}.{int(time.time() * 1000)}@example.com"
    password = "MediaTest123"
    reg = client.post("/candidate/register", json={
        "name": f"Media Candidate {label}", "email": email,
        "password": password, "confirm_password": password,
    })
    expect(reg.status_code == 201, f"Candidate {label} registers successfully")
    return reg.json()["access_token"]


def start_interview(headers):
    cats = client.get("/candidate/categories", headers=headers).json()
    resp = client.post("/candidate/interviews", json={"category_id": cats[0]["id"], "type": "technical"}, headers=headers)
    return resp.json()


# ---------------------------------------------------------------------------
# media_storage.py
# ---------------------------------------------------------------------------

def test_media_storage():
    print("--- media_storage.py ---\n")
    tmp_base = Path(tempfile.mkdtemp())
    storage = LocalFilesystemMediaStorage(base_dir=str(tmp_base))

    ref = storage.save("interview123", "question456", "webm", b"fake webm bytes")
    expect(ref == "interviews/interview123/question456/response.webm", "save() returns the expected opaque reference")

    resolved = storage.resolve_path(ref)
    expect(resolved is not None and resolved.is_file(), "resolve_path() finds the saved file")
    expect(resolved.read_bytes() == b"fake webm bytes", "Saved file content matches exactly what was written")

    expect(storage.resolve_path("interviews/does/not/exist/response.webm") is None, "resolve_path() returns None for a non-existent reference")

    for malicious_id in ["../../etc", "..", "a/b", "a\\b", "a;rm -rf", ""]:
        try:
            storage.save(malicious_id, "q1", "webm", b"x")
            raise AssertionError(f"save() should have rejected unsafe interview_id={malicious_id!r}")
        except ValueError:
            pass
    print("[PASS] save() rejects every path-traversal-shaped interview_id tried")

    escape_attempt = storage.resolve_path("../../../../etc/passwd")
    expect(escape_attempt is None, "resolve_path() refuses a reference that tries to escape the storage root")

    expect(get_media_storage() is get_media_storage(), "get_media_storage() returns a stable singleton")
    print()


# ---------------------------------------------------------------------------
# media_conversion.py - real ffmpeg, real (synthesized) webm bytes
# ---------------------------------------------------------------------------

def test_media_conversion():
    print("--- media_conversion.py (real ffmpeg) ---\n")
    expect(is_ffmpeg_available(), "ffmpeg is available in this environment (confirmed by inspection, not assumed)")

    tmp_dir = Path(tempfile.mkdtemp())
    webm_path = tmp_dir / "input.webm"
    wav_path = tmp_dir / "output.wav"
    make_test_webm(webm_path)

    extract_audio_to_wav(webm_path, wav_path)
    expect(wav_path.exists(), "extract_audio_to_wav() produces an output file from a real webm input")
    header = wav_path.read_bytes()[:12]
    expect(header[:4] == b"RIFF" and header[8:12] == b"WAVE", "Output file is a genuine RIFF/WAVE file, not a stub")
    print()


# ---------------------------------------------------------------------------
# asr_google.py - honesty, mocked provider paths, live-integration skip
# ---------------------------------------------------------------------------

def test_asr_service():
    print("--- asr_google.py ---\n")
    service = GoogleSpeechASRService()

    expect(GoogleSpeechASRService.is_configured() is False, "is_configured() honestly reports False - no credentials exist in this environment")

    result = service.transcribe(None)
    expect(result.status == "failed" and result.transcript is None, "transcribe(None) fails honestly with no transcript")

    result2 = service.transcribe("interviews/x/y/response.webm")
    expect(result2.status == "failed", "transcribe() without configured credentials reports failed")
    expect(result2.transcript is None, "transcribe() without credentials NEVER returns a fabricated transcript")
    expect("not configured" in (result2.error or "").lower(), "Error message clearly identifies the missing-credentials cause")

    # Mocked: credentials "present", Google client mocked to succeed.
    tmp_dir = Path(tempfile.mkdtemp())
    webm_path = tmp_dir / "input.webm"
    make_test_webm(webm_path)
    storage = get_media_storage()
    media_ref = storage.save("mocktest", "q1", "webm", webm_path.read_bytes())

    class FakeAlternative:
        transcript = "this is a mocked transcript"

    class FakeResult:
        alternatives = [FakeAlternative()]

    class FakeResponse:
        results = [FakeResult()]

    class FakeSpeechClient:
        def recognize(self, config, audio):
            return FakeResponse()

    with patch.object(GoogleSpeechASRService, "is_configured", staticmethod(lambda: True)):
        with patch("google.cloud.speech.SpeechClient", return_value=FakeSpeechClient()):
            mocked_result = service.transcribe(media_ref, duration_seconds=1.0)
    expect(mocked_result.status == "completed", "Mocked successful Google response maps to status='completed'")
    expect(mocked_result.transcript == "this is a mocked transcript", "Mocked transcript is passed through correctly")
    expect(mocked_result.provider == "google_speech_v1", "Provider metadata is recorded")

    # Mocked: Google client raises - must fail honestly, never fabricate.
    class ExplodingSpeechClient:
        def recognize(self, config, audio):
            raise RuntimeError("simulated quota/auth failure")

    with patch.object(GoogleSpeechASRService, "is_configured", staticmethod(lambda: True)):
        with patch("google.cloud.speech.SpeechClient", return_value=ExplodingSpeechClient()):
            error_result = service.transcribe(media_ref, duration_seconds=1.0)
    expect(error_result.status == "failed", "A Google API exception results in status='failed'")
    expect(error_result.transcript is None, "A Google API exception never produces a fabricated transcript")

    # Explicit live-integration path - only runs for real if credentials
    # actually exist; otherwise it explicitly reports the skip rather than
    # silently passing or hitting the network.
    if GoogleSpeechASRService.is_configured():
        live_result = GoogleSpeechASRService().transcribe(media_ref, duration_seconds=1.0)
        expect(live_result.status in ("completed", "failed"), "Live Google Speech-to-Text call returns a real, honest status")
        print(f"[LIVE] Real Google Speech-to-Text call executed - status={live_result.status}, transcript={live_result.transcript!r}")
    else:
        print("[SKIPPED] Live Google Speech-to-Text integration test - GOOGLE_APPLICATION_CREDENTIALS is not configured in this environment")
    print()


# ---------------------------------------------------------------------------
# Upload endpoint (API level)
# ---------------------------------------------------------------------------

def test_upload_endpoint():
    print("--- Upload endpoint (API) ---\n")
    token_a = register_and_login("A")
    token_b = register_and_login("B")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    interview = start_interview(headers_a)
    interview_id = interview["id"]
    question_id = interview["questions"][0]["question_id"]

    tmp_dir = Path(tempfile.mkdtemp())
    webm_path = tmp_dir / "response.webm"
    make_test_webm(webm_path)
    webm_bytes = webm_path.read_bytes()

    def upload(headers, iid, qid, filename="response.webm", content_type="video/webm", data=None, duration=5.0):
        return client.post(
            f"/candidate/interviews/{iid}/responses/{qid}/media",
            headers=headers,
            files={"file": (filename, data if data is not None else webm_bytes, content_type)},
            data={"duration_seconds": str(duration)},
        )

    # --- Auth ---
    no_auth = client.post(f"/candidate/interviews/{interview_id}/responses/{question_id}/media", files={"file": ("r.webm", webm_bytes, "video/webm")})
    expect(no_auth.status_code == 401, "Upload with no token returns 401")

    bad_token = client.post(
        f"/candidate/interviews/{interview_id}/responses/{question_id}/media",
        headers={"Authorization": "Bearer garbage.token.value"},
        files={"file": ("r.webm", webm_bytes, "video/webm")},
    )
    expect(bad_token.status_code == 401, "Upload with an invalid JWT returns 401")

    # --- Ownership / validation ---
    b_attempt = upload(headers_b, interview_id, question_id)
    expect(b_attempt.status_code == 404, "Candidate B cannot upload into Candidate A's interview")

    bad_question = upload(headers_a, interview_id, "000000000000000000000000")
    expect(bad_question.status_code == 400, "Uploading against a question_id not in this interview is rejected")

    bad_type = upload(headers_a, interview_id, question_id, content_type="image/png")
    expect(bad_type.status_code == 400, "Uploading a non-webm content-type is rejected")

    empty_file = upload(headers_a, interview_id, question_id, data=b"")
    expect(empty_file.status_code == 400, "Uploading an empty file is rejected")

    # --- Oversized ---
    old_limit = os.environ.get("MAX_RESPONSE_MEDIA_MB")
    os.environ["MAX_RESPONSE_MEDIA_MB"] = "0"
    try:
        too_big = upload(headers_a, interview_id, question_id)
        expect(too_big.status_code == 413, "Oversized upload is rejected with 413")
    finally:
        if old_limit is None:
            os.environ.pop("MAX_RESPONSE_MEDIA_MB", None)
        else:
            os.environ["MAX_RESPONSE_MEDIA_MB"] = old_limit

    # --- Malicious filename is ignored; safe server-side path is used ---
    malicious = upload(headers_a, interview_id, question_id, filename="../../../../evil.webm")
    expect(malicious.status_code == 200, f"Upload succeeds even with a malicious client filename (got {malicious.status_code}: {malicious.text})")
    expected_ref = f"interviews/{interview_id}/{question_id}/response.webm"
    expect(malicious.json()["responses"][0]["media_url"] == expected_ref, "Stored media_url uses the safe server-generated path, not the client's filename")
    resolved_path = get_media_storage().resolve_path(expected_ref)
    expect(resolved_path is not None and resolved_path.is_file(), "The file is actually persisted on disk at the safe, expected path")

    # --- Successful upload + metadata + honest ASR (no credentials -> "failed", never fabricated) ---
    success = upload(headers_a, interview_id, question_id, duration=12.5)
    expect(success.status_code == 200, f"A clean upload succeeds (got {success.status_code}: {success.text})")
    body = success.json()
    expect(len(body["responses"]) == 1, "Re-uploading the same question replaces rather than duplicates the response entry")
    expect(body["responses"][0]["size_bytes"] == len(webm_bytes), "size_bytes is the real, server-measured byte count, not client-supplied")
    expect(body["responses"][0]["duration_seconds"] == 12.5, "duration_seconds from the form field is recorded")
    expect(body["responses"][0]["media_url"] == expected_ref, "media_url is set to the real storage reference")

    db_doc = interviews_collection.find_one({"_id": ObjectId(interview_id)})
    per_q = db_doc["evaluation"]["per_question"]
    expect(len(per_q) == 1 and per_q[0]["question_id"] == question_id, "ASR result was recorded against the correct question in evaluation.per_question")
    expect(per_q[0]["asr"]["status"] == "failed", "ASR status is honestly 'failed' (no credentials configured) - not fabricated as 'completed'")
    expect(per_q[0]["asr"]["transcript"] is None, "No transcript exists anywhere in MongoDB for this response - nothing fake was ever persisted")
    expect(db_doc["evaluation_status"] == "pending_evaluation", "evaluation_status is untouched by ASR alone - still 'pending_evaluation' (interview not completed yet)")
    expect(db_doc["score"] is None, "Top-level score is still null - ASR running is not evaluation completing")

    # --- Interview state validation: cannot upload after completion ---
    for q in interview["questions"][1:]:
        client.post(f"/candidate/interviews/{interview_id}/responses/{q['question_id']}/media", headers=headers_a,
                    files={"file": ("r.webm", webm_bytes, "video/webm")}, data={"duration_seconds": "5"})
    client.post(f"/candidate/interviews/{interview_id}/complete", headers=headers_a)

    after_complete = upload(headers_a, interview_id, question_id)
    expect(after_complete.status_code == 400, "Uploading to an already-Completed interview is rejected")

    # --- start_evaluation preserves per_question ASR data (non-destructive) ---
    client.post(f"/candidate/interviews/{interview_id}/evaluation/start", headers=headers_a)
    after_start = interviews_collection.find_one({"_id": ObjectId(interview_id)})
    expect(after_start["evaluation_status"] == "processing", "Starting evaluation transitions to 'processing'")
    expect(len(after_start["evaluation"]["per_question"]) == len(interview["questions"]),
           "Starting evaluation PRESERVES the per_question ASR data collected during the interview - does not wipe it")
    expect(after_start["evaluation"]["overall_score"] is None, "Aggregate scoring fields remain null - ASR completing responses does not complete evaluation")

    # --- Admin regression: existing endpoints still work with real media-backed interviews present ---
    admin_login = client.post("/admin/login", json={"email": "admin@mockai.com", "password": "admin123"})
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    admin_check = client.get("/admin/interviews", headers=admin_headers)
    expect(admin_check.status_code == 200, "Admin's existing /admin/interviews still works with real media-backed interviews present")

    print("\nALL MEDIA INGESTION + ASR TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_media_storage()
    test_media_conversion()
    test_asr_service()
    test_upload_endpoint()
