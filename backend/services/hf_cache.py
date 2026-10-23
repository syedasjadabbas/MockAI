"""
Keeps the Hugging Face libraries offline when every model the active AI
profile needs is already in the local cache.

Without this, huggingface_hub still makes background requests to the Hub
(and logs "You are sending unauthenticated requests to the HF Hub") even
though the models load from disk. If any required model is missing (a fresh
machine, or Render's first boot) nothing changes and it downloads as before.

Must run before huggingface_hub / transformers / sentence_transformers are
imported, because they read HF_HUB_OFFLINE at import time.
"""
import os
from pathlib import Path


def _hub_cache_dir() -> Path:
    if os.getenv("HF_HUB_CACHE"):
        return Path(os.environ["HF_HUB_CACHE"])
    home = os.getenv("HF_HOME") or os.path.join(os.path.expanduser("~"), ".cache", "huggingface")
    return Path(home) / "hub"


def _is_cached(repo_id: str) -> bool:
    if "/" not in repo_id:  # sentence-transformers short names
        repo_id = f"sentence-transformers/{repo_id}"
    snapshots = _hub_cache_dir() / f"models--{repo_id.replace('/', '--')}" / "snapshots"
    return snapshots.is_dir() and any(
        (snap / name).exists() for snap in snapshots.iterdir()
        for name in ("model.safetensors", "pytorch_model.bin")
    )


def prefer_offline_hub() -> bool:
    """Sets HF_HUB_OFFLINE=1 if all models for the active profile are cached.
    Returns True when offline mode was enabled."""
    if os.getenv("HF_HUB_OFFLINE") is not None:  # explicit setting wins
        return os.getenv("HF_HUB_OFFLINE") == "1"
    from services.ai_profile import (
        REPORT_SENTENCE_MODEL, REPORT_GRAMMAR_MODEL, LITE_SENTENCE_MODEL, is_report_profile,
    )
    required = [REPORT_SENTENCE_MODEL, REPORT_GRAMMAR_MODEL] if is_report_profile() else [LITE_SENTENCE_MODEL]
    override = os.getenv("SENTENCE_TRANSFORMER_MODEL")
    if override:
        required[0] = override
    if all(_is_cached(r) for r in required):
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        return True
    return False
