"""
AI module interfaces - the plug-in points for the report's three analysis
modules. This file defines CONTRACTS ONLY: no BERT/DistilBERT, DeepFace/CNN/
OpenCV, Whisper, Google Speech API, or DeepSpeech is implemented or
installed here. Each interface's only concrete implementation right now is
a "Null" stand-in that honestly reports "not_implemented" - it never
fabricates a transcript, a score, or a behavioral observation.

Report grounding (FYP-I, section 2.2.1 "AI Processing" + the tools named in
section 5.3):
  - FR15 Speech to Text Conversion  -> ASRService   (report names Google
    Speech API / DeepSpeech as candidate providers)
  - FR16 Text Analysis              -> NLPService   (report names BERT /
    DistilBERT)
  - FR17 Facial Expression Analysis -> VisionService (report names
    DeepFace / CNN / OpenCV-based approaches)
  - FR18/FR19 Per-Question Analysis & Multimodal Analysis Integration
    -> FusionService, which combines the three outputs above for one
    response. The report does not define numerical fusion weights (there
    is no such formula anywhere in FR18/FR19 or their activity diagrams,
    AD018/AD019) - see evaluation_pipeline.py's docstring for how that
    open decision is documented rather than guessed at here.

Why interfaces instead of a single function: the report explicitly expects
three separate, independently-sourced analyses (speech, text, facial)
combined afterward (FR18-02, FR19-01) - modeling them as three swappable
services mirrors that structure directly, and lets a real implementation
of just one of them (e.g. wiring up Google Speech API for ASRService) be
dropped in later without touching the other two, the fusion step, the
evaluation routes, or the Candidate frontend at all.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Result types - every field a real implementation would eventually fill in
# starts as None. `status` is the honest signal of whether anything real
# happened: "not_implemented" (the Null* classes below, and the only status
# possible until a real phase replaces them), "completed", or "failed".
# ---------------------------------------------------------------------------

@dataclass
class ASRResult:
    """FR15 - Speech to Text Conversion output for one response."""
    status: str = "not_implemented"  # "not_implemented" | "completed" | "failed"
    transcript: Optional[str] = None
    provider: Optional[str] = None  # e.g. "google_speech" | "deepspeech" once real
    error: Optional[str] = None


@dataclass
class TextAnalysisResult:
    """FR16 - Text/NLP Analysis output for one response's transcript."""
    status: str = "not_implemented"
    language_quality: Optional[float] = None
    clarity: Optional[float] = None
    notes: Optional[str] = None
    model: Optional[str] = None  # e.g. "bert-base-uncased" | "distilbert-base" once real
    error: Optional[str] = None


@dataclass
class FacialAnalysisResult:
    """FR17 - Facial Expression Analysis output for one response."""
    status: str = "not_implemented"
    confidence_indicators: Optional[dict] = None
    stress_indicators: Optional[dict] = None
    model: Optional[str] = None  # e.g. "deepface" | "opencv-cnn" once real
    error: Optional[str] = None


@dataclass
class MultimodalResult:
    """
    FR18/FR19 - the per-question fused result. `fusion_method` records
    which algorithm/weighting scheme combined the three inputs once one
    exists - see evaluation_pipeline.py for why it's undecided today.
    """
    status: str = "not_implemented"
    integrated_score: Optional[float] = None
    behavioral_insights: Optional[str] = None
    fusion_method: Optional[str] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Service interfaces
# ---------------------------------------------------------------------------

class ASRService(ABC):
    """FR15 - Speech to Text Conversion."""

    @abstractmethod
    def transcribe(self, media_url: Optional[str], duration_seconds: Optional[float] = None) -> ASRResult:
        raise NotImplementedError


class NLPService(ABC):
    """FR16 - Text Analysis."""

    @abstractmethod
    def analyze_text(self, transcript: Optional[str]) -> TextAnalysisResult:
        raise NotImplementedError


class VisionService(ABC):
    """FR17 - Facial Expression Analysis."""

    @abstractmethod
    def analyze_facial_expressions(self, media_url: Optional[str]) -> FacialAnalysisResult:
        raise NotImplementedError


class FusionService(ABC):
    """FR18/FR19 - Per-Question Analysis / Multimodal Analysis Integration."""

    @abstractmethod
    def fuse(self, asr: ASRResult, text: TextAnalysisResult, facial: FacialAnalysisResult) -> MultimodalResult:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Null implementations - the only concrete implementations that exist in
# this phase. They are honest no-ops: given real input, they return
# "not_implemented" and None for every analytical field, never a fabricated
# number. These are what evaluation_pipeline.py uses by default, and what
# a background worker would replace with real providers later by
# constructing the pipeline with different service instances - no other
# code needs to change.
# ---------------------------------------------------------------------------

class NullASRService(ASRService):
    def transcribe(self, media_url: Optional[str], duration_seconds: Optional[float] = None) -> ASRResult:
        return ASRResult(status="not_implemented")


class NullNLPService(NLPService):
    def analyze_text(self, transcript: Optional[str]) -> TextAnalysisResult:
        return TextAnalysisResult(status="not_implemented")


class NullVisionService(VisionService):
    def analyze_facial_expressions(self, media_url: Optional[str]) -> FacialAnalysisResult:
        return FacialAnalysisResult(status="not_implemented")


class NullFusionService(FusionService):
    def fuse(self, asr: ASRResult, text: TextAnalysisResult, facial: FacialAnalysisResult) -> MultimodalResult:
        return MultimodalResult(status="not_implemented")
