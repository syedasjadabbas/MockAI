"""
AI model profile switch.

  AI_PROFILE=report  - the exact stack named in the FYP-I report (Section 1.1,
                       5.3): DistilBERT sentence encoder for NLP, BERT
                       (fine-tuned on CoLA) for grammar, DeepFace CNN for facial
                       emotion. Needs ~2-3 GB RAM and Python 3.11/3.12 (see
                       requirements-report.txt). Intended for local runs.
  AI_PROFILE=lite    - lighter models with the same roles (MiniLM, rule-based
                       grammar, FERPlus ONNX CNN) for small cloud instances
                       such as Render Starter (512 MB). This is the default.

If a report-profile model cannot be loaded (package missing, no internet on
first download, out of memory) the service falls back to its lite
equivalent and records which model actually ran in its output - results
never claim a model that was not used.
"""
import os

REPORT = "report"
LITE = "lite"

# Report-profile model identifiers
REPORT_SENTENCE_MODEL = "sentence-transformers/multi-qa-distilbert-cos-v1"
REPORT_GRAMMAR_MODEL = "textattack/bert-base-uncased-CoLA"
LITE_SENTENCE_MODEL = "all-MiniLM-L6-v2"


def get_profile() -> str:
    value = (os.getenv("AI_PROFILE") or LITE).strip().lower()
    return REPORT if value == REPORT else LITE


def is_report_profile() -> bool:
    return get_profile() == REPORT


def sentence_model_name() -> str:
    # An explicit override still wins (used by tests / experiments).
    override = os.getenv("SENTENCE_TRANSFORMER_MODEL")
    if override:
        return override
    return REPORT_SENTENCE_MODEL if is_report_profile() else LITE_SENTENCE_MODEL
