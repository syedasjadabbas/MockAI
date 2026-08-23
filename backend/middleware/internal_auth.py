"""
Internal service authentication - deliberately separate from both
verify_admin and verify_candidate. The endpoint this guards
(PUT /internal/evaluations/{interview_id}) is where a future AI worker/
pipeline writes real evaluation results; neither a Candidate's JWT nor an
Admin's JWT should ever be usable there; a Candidate must never be able to
write their own "evaluation," and this isn't an Admin-management action
either. A third, narrow credential (a shared secret the worker process
holds) keeps that boundary explicit rather than overloading an existing
identity for a purpose it wasn't meant for.

This is intentionally minimal - a single shared secret checked via a
header, matching the scope of "foundation, not production infrastructure."
"""
import os

from fastapi import Header, HTTPException, status


def verify_internal_service(x_internal_key: str = Header(default=None)):
    expected = os.getenv("INTERNAL_SERVICE_KEY")

    if not expected:
        # Fails closed: if the key was never configured, the internal
        # endpoint is unusable rather than silently open.
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Internal evaluation service is not configured")

    if not x_internal_key or x_internal_key != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal service credentials")

    return True
