"""
Media storage abstraction for interview response recordings (FR12/FR13's
"stored for later analysis").

Current implementation: LocalFilesystemMediaStorage, writing under
backend/media/interviews/<interview_id>/<question_id>/response.<ext>.enc on
the backend's own disk, encrypted at rest (see "Encryption at rest" below).

Future production implementation: object storage such as S3 or another
cloud storage service. That future class only needs to implement the same
three methods below (save/resolve_path/delete) and be swapped in wherever
get_media_storage() is called - no change to the upload endpoint, the ASR
service, or any other caller. No AWS/S3 code exists yet; this is the
documented seam where it will attach.

Path-traversal safety: callers NEVER pass raw user input into `save()`.
interview_id and question_id are only ever accepted here after the caller
has already verified them against MongoDB (a real interview the requesting
candidate owns, a real question that belongs to that interview) - see
routes/candidate_interview.py's upload endpoint. The browser-supplied
filename is never used to build a path; only a fixed name ("response")
plus a server-determined extension is used.
"""
import os
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

# Only ever produced by our own validation logic below - never taken
# directly from Mongo ObjectId string or the caller without this check,
# so even a defensive re-verification here costs nothing.
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


def _sanitize_id_segment(value: str, label: str) -> str:
    """Last-line defense: even though callers only ever pass already-
    validated Mongo IDs, refuse anything that isn't a plain alphanumeric
    token before it touches a filesystem path - no `..`, `/`, `\\`, or
    null bytes can ever reach os.path.join from here."""
    if not value or not _SAFE_ID_RE.match(value):
        raise ValueError(f"Unsafe {label} for media storage: {value!r}")
    return value


class MediaStorageService(ABC):
    @abstractmethod
    def save(self, interview_id: str, question_id: str, extension: str, data: bytes) -> str:
        """Persists `data` and returns an opaque storage reference (never a
        publicly-servable URL - see module docstring on privacy)."""
        raise NotImplementedError

    @abstractmethod
    def resolve_path(self, media_ref: str) -> Optional[Path]:
        """Resolves a storage reference back to a local, readable path for
        internal processing (e.g. the ASR service). Returns None if the
        reference doesn't exist."""
        raise NotImplementedError

    @abstractmethod
    def delete(self, media_ref: str) -> None:
        raise NotImplementedError


class LocalFilesystemMediaStorage(MediaStorageService):
    def __init__(self, base_dir: str = None):
        if base_dir:
            self.base_dir = Path(base_dir).resolve()
        elif os.getenv("MEDIA_STORAGE_DIR"):
            self.base_dir = Path(os.getenv("MEDIA_STORAGE_DIR")).resolve()
        else:
            source_backend_media = (Path(__file__).resolve().parent.parent / "media").resolve()
            if source_backend_media.is_dir():
                self.base_dir = source_backend_media
            else:
                self.base_dir = Path("media").resolve()

    def _target_dir(self, interview_id: str, question_id: str) -> Path:
        interview_id = _sanitize_id_segment(interview_id, "interview_id")
        question_id = _sanitize_id_segment(question_id, "question_id")
        target = self.base_dir / "interviews" / interview_id / question_id
        # Defense in depth: confirm the resolved path is still inside
        # base_dir before ever writing to it.
        target_resolved = target.resolve()
        if self.base_dir not in target_resolved.parents and target_resolved != self.base_dir:
            raise ValueError("Resolved media path escapes the storage root")
        return target

    def save(self, interview_id: str, question_id: str, extension: str, data: bytes) -> str:
        extension = extension.lstrip(".")
        if not re.match(r"^[a-zA-Z0-9]+$", extension):
            raise ValueError(f"Unsafe file extension: {extension!r}")

        target_dir = self._target_dir(interview_id, question_id)
        target_dir.mkdir(parents=True, exist_ok=True)
        # A re-recorded answer replaces the previous take (any container).
        for old in target_dir.glob("response*"):
            old.unlink(missing_ok=True)
        _drop_plain_cache(target_dir)
        target_path = target_dir / f"response.{extension}"
        if _encryption_enabled():
            # FR 13-03 / FR 30-01 / NFR 7-01 - recordings are encrypted at rest.
            (target_dir / f"response.{extension}{ENCRYPTED_SUFFIX}").write_bytes(_fernet().encrypt(data))
        else:
            target_path.write_bytes(data)

        # Opaque relative reference, not a filesystem path or public URL.
        return f"interviews/{interview_id}/{question_id}/response.{extension}"

    def _stored_path(self, media_ref: str) -> Optional[Path]:
        if not media_ref:
            return None
        candidate = (self.base_dir / media_ref).resolve()
        if self.base_dir not in candidate.parents and candidate != self.base_dir:
            return None  # refuses to resolve outside the storage root
        return candidate

    def resolve_path(self, media_ref: str) -> Optional[Path]:
        candidate = self._stored_path(media_ref)
        if candidate is None:
            return None
        encrypted = candidate.with_name(candidate.name + ENCRYPTED_SUFFIX)
        if encrypted.is_file():
            # Decrypted only into a private, short-lived cache for analysis.
            return _plain_copy(encrypted, candidate.name)
        return candidate if candidate.is_file() else None

    def delete(self, media_ref: str) -> None:
        candidate = self._stored_path(media_ref)
        if candidate is None:
            return
        for path in (candidate, candidate.with_name(candidate.name + ENCRYPTED_SUFFIX)):
            path.unlink(missing_ok=True)
        _drop_plain_cache(candidate.parent)
        for extra in candidate.parent.glob(f"{candidate.stem}_normalized.*"):
            extra.unlink(missing_ok=True)

    def delete_interview(self, interview_id: str) -> int:
        """Deletes every recording of one interview (candidate request or
        retention expiry). Returns the number of files removed."""
        interview_id = _sanitize_id_segment(interview_id, "interview_id")
        root = (self.base_dir / "interviews" / interview_id).resolve()
        if self.base_dir not in root.parents or not root.is_dir():
            return 0
        removed = 0
        for path in sorted(root.rglob("*"), key=lambda x: len(x.parts), reverse=True):
            if path.is_file():
                _drop_plain_cache(path.parent)
                path.unlink(missing_ok=True)
                removed += 1
            elif path.is_dir():
                _drop_plain_cache(path)
                path.rmdir()
        root.rmdir()
        return removed


# ---------------------------------------------------------------------------
# Encryption at rest (Fernet: AES-128-CBC + HMAC-SHA256). The key comes from
# MEDIA_ENCRYPTION_KEY, or is derived from the server SECRET_KEY. Analysis
# code reads a decrypted copy in a private temp cache that is removed after
# a short time; recordings stored before encryption was added stay readable.
# Set MEDIA_ENCRYPTION=off to store plain files (e.g. for debugging).
# ---------------------------------------------------------------------------

ENCRYPTED_SUFFIX = ".enc"
PLAIN_CACHE_TTL_SECONDS = 30 * 60


def _encryption_enabled() -> bool:
    return (os.getenv("MEDIA_ENCRYPTION") or "on").strip().lower() not in ("off", "0", "false", "no")


def _fernet():
    import base64
    import hashlib
    from cryptography.fernet import Fernet

    key = (os.getenv("MEDIA_ENCRYPTION_KEY") or "").strip()
    if not key:
        secret = os.getenv("SECRET_KEY") or ""
        if not secret:
            raise RuntimeError("Set MEDIA_ENCRYPTION_KEY or SECRET_KEY to store recordings encrypted")
        key = base64.urlsafe_b64encode(hashlib.sha256(("mockai-media:" + secret).encode()).digest()).decode()
    return Fernet(key.encode())


def _cache_root() -> Path:
    import tempfile
    root = Path(tempfile.gettempdir()) / "mockai_media_plain"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _cache_dir_for(stored_dir: Path) -> Path:
    import hashlib
    return _cache_root() / hashlib.sha256(str(stored_dir.resolve()).encode()).hexdigest()[:24]


def _drop_plain_cache(stored_dir: Path) -> None:
    import shutil
    shutil.rmtree(_cache_dir_for(stored_dir), ignore_errors=True)


def _sweep_plain_cache() -> None:
    import shutil
    import time
    now = time.time()
    for d in _cache_root().iterdir():
        try:
            if d.is_dir() and now - d.stat().st_mtime > PLAIN_CACHE_TTL_SECONDS:
                shutil.rmtree(d, ignore_errors=True)
        except OSError:
            pass


def _plain_copy(encrypted: Path, plain_name: str) -> Path:
    _sweep_plain_cache()
    target_dir = _cache_dir_for(encrypted.parent)
    target = target_dir / plain_name
    if target.is_file() and target.stat().st_mtime >= encrypted.stat().st_mtime:
        return target
    target_dir.mkdir(parents=True, exist_ok=True)
    target.write_bytes(_fernet().decrypt(encrypted.read_bytes()))
    return target


_storage_instance: Optional[MediaStorageService] = None


def get_media_storage() -> MediaStorageService:
    """Single access point for the configured storage backend. Swapping to
    a future S3MediaStorage happens here and nowhere else."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalFilesystemMediaStorage()
    return _storage_instance
