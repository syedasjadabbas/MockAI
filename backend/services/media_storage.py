"""
Media storage abstraction for interview response recordings (FR12/FR13's
"stored for later analysis").

Current implementation: LocalFilesystemMediaStorage, writing under
backend/media/interviews/<interview_id>/<question_id>/response.<ext> on
the backend's own disk. This is explicitly a development-scope choice for
the current FYP environment, not a production design.

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
        target_path = target_dir / f"response.{extension}"
        target_path.write_bytes(data)

        # Opaque relative reference, not a filesystem path or public URL.
        return f"interviews/{interview_id}/{question_id}/response.{extension}"

    def resolve_path(self, media_ref: str) -> Optional[Path]:
        if not media_ref:
            return None
        candidate = (self.base_dir / media_ref).resolve()
        if self.base_dir not in candidate.parents and candidate != self.base_dir:
            return None  # refuses to resolve outside the storage root
        return candidate if candidate.is_file() else None

    def delete(self, media_ref: str) -> None:
        path = self.resolve_path(media_ref)
        if path:
            path.unlink(missing_ok=True)


_storage_instance: Optional[MediaStorageService] = None


def get_media_storage() -> MediaStorageService:
    """Single access point for the configured storage backend. Swapping to
    a future S3MediaStorage happens here and nowhere else."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalFilesystemMediaStorage()
    return _storage_instance
