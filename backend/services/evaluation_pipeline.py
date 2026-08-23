"""
Evaluation pipeline orchestrator - the foundation for FR18-FR27.

This module demonstrates and unit-tests how the four AI interfaces in
ai_interfaces.py compose into the two-stage flow the report itself
describes (Use Case 6 "Analyze Interview Responses" then Use Case 7
"Generate Scores and Feedback" - see FYP-I section 2.3.6/2.3.7):

  Stage 1 (per response):  ASR -> NLP -> Vision -> Fusion   (FR15-FR19)
  Stage 2 (per interview): aggregate all per-response results (FR20),
                            then derive scores/feedback (FR21-FR27)

With the default Null* services (see ai_interfaces.py) this always
produces a structurally-complete but content-empty result: every status
is "not_implemented" and every analytical field is None. That is
deliberate - this function proves the CONTRACT works end-to-end (shapes
line up, nothing crashes, nothing is fabricated) without claiming any
analysis happened. It is intentionally NOT wired into the live HTTP
"start evaluation" endpoint (see routes/candidate_evaluation.py) - that
endpoint only performs the pending_evaluation -> processing state
transition. Actually invoking this pipeline against real interview data
is a future background-worker's job, once real service implementations
replace the Null* defaults.

Open design decisions this phase deliberately does NOT resolve, because
the report does not specify them (see FR18/FR19 and their activity
diagrams AD018/AD019 - neither defines a fusion formula or aggregation
weights):
  - HOW per-question ASR/NLP/Vision outputs are numerically combined into
    one integrated_score (fusion_method on MultimodalResult records
    whichever method is eventually chosen).
  - HOW per-question integrated scores combine into the interview's
    overall_score/confidence_score/stress_level (aggregate_analysis
    below is the named placeholder for that formula).
These are correctly left for the actual AI/model-evaluation phase, not
guessed at here.
"""
from dataclasses import asdict
from typing import Optional

from services.ai_interfaces import (
    ASRService, NLPService, VisionService, FusionService,
    NullASRService, NullNLPService, NullVisionService, NullFusionService,
)


def analyze_response(
    question_id: str,
    media_url: Optional[str],
    duration_seconds: Optional[float],
    asr: ASRService,
    nlp: NLPService,
    vision: VisionService,
    fusion: FusionService,
) -> dict:
    """
    Stage 1 for a single response - FR15 through FR19. Returns a plain
    dict in the exact shape stored under interview.evaluation.per_question
    (see routes/candidate_evaluation.py's schema comment).
    """
    asr_result = asr.transcribe(media_url, duration_seconds)
    text_result = nlp.analyze_text(asr_result.transcript)
    facial_result = vision.analyze_facial_expressions(media_url)
    multimodal_result = fusion.fuse(asr_result, text_result, facial_result)

    return {
        "question_id": question_id,
        "asr": asdict(asr_result),
        "text_analysis": asdict(text_result),
        "facial_analysis": asdict(facial_result),
        "multimodal": asdict(multimodal_result),
    }


def aggregate_analysis(per_question_results: list) -> dict:
    """
    Stage 2 - FR20 (aggregate) feeding FR21-FR23 (scores). The aggregation
    formula itself is an open decision (see module docstring) - until
    every per-question multimodal result is actually "completed", this
    honestly reports that scoring cannot happen yet rather than producing
    a partial or fabricated number.
    """
    all_completed = bool(per_question_results) and all(
        q.get("multimodal", {}).get("status") == "completed" for q in per_question_results
    )

    if not all_completed:
        return {
            "status": "not_implemented",
            "overall_score": None,
            "confidence_score": None,
            "stress_level": None,
            "interpretation": None,
            "strengths": None,
            "weaknesses": None,
            "suggestions": None,
        }

    # Reached only once real per-question multimodal results exist. The
    # actual combination formula (FR21-FR23) is intentionally not decided
    # here - see module docstring.
    raise NotImplementedError(
        "Aggregation formula for real per-question results is not yet defined - "
        "this is future AI/model-evaluation-phase work, not part of this foundation."
    )


def run_evaluation_pipeline(
    interview_doc: dict,
    asr: ASRService = None,
    nlp: NLPService = None,
    vision: VisionService = None,
    fusion: FusionService = None,
) -> dict:
    """
    Runs the full two-stage flow over one interview document's responses.
    Defaults to the Null* services, so calling this with no arguments
    (as the test suite does) always yields an honest, empty-but-well-formed
    result - never fabricated data. A future worker would call this same
    function with real service instances injected.
    """
    asr = asr or NullASRService()
    nlp = nlp or NullNLPService()
    vision = vision or NullVisionService()
    fusion = fusion or NullFusionService()

    responses_by_question = {r["question_id"]: r for r in interview_doc.get("responses", [])}

    per_question = []
    for q in interview_doc.get("questions", []):
        response = responses_by_question.get(q["question_id"])
        media_url = response.get("media_url") if response else None
        duration = response.get("duration_seconds") if response else None
        per_question.append(analyze_response(q["question_id"], media_url, duration, asr, nlp, vision, fusion))

    aggregate = aggregate_analysis(per_question)

    return {
        "per_question": per_question,
        **aggregate,
    }
