"""
Language Quality, Grammar & Tone Analyzer - FR 16-01 / FR 16-02 / FR 16-03
and Objective 3 of the FYP-I report ("analyse the user's answers in grammar,
tone and content").

nlp_analyzer.py already scores *content* (semantic similarity to the model
answer and concept coverage). This module covers the other half of FR16:
*how well the answer is expressed* - grammar, clarity and tone.

Design choices (documented so they can be defended):
- Deterministic and rule-based. Every issue it reports points to the exact
  words that triggered it, so feedback is explainable (NFR 17) and the same
  answer always gets the same result. No external service or Java runtime is
  needed, which matches the report's open-source/limited-compute constraint
  (Section 1.5.2).
- Mode-aware. Spoken answers arrive as ASR transcripts, which have no
  reliable punctuation or capitalisation, so those rules only run on typed
  answers. Spoken disfluencies (fillers, pauses) are already measured by
  delivery_analyzer.py and are not double-counted here.
- Conservative. Rules target common, high-precision interview mistakes
  (subject-verb agreement, article misuse, double comparatives, "could of",
  modal + "to", past tense after "didn't", repeated words). It does not claim
  to be a complete grammar checker.

This analysis is reported alongside the content score and feeds strengths,
weaknesses and suggestions (FR 16-03, FR 25-27). It does not change the
fused question score, so the scoring formula documented in the README stays
unchanged.
"""
import logging
import re
import threading
from typing import Dict, List, Optional, Tuple

from services.ai_profile import REPORT_GRAMMAR_MODEL, is_report_profile

logger = logging.getLogger("mockai.language")

METHOD = "rule_based_language_v1"
BERT_METHOD = "bert_cola+rules_v1"


# ---------------------------------------------------------------------------
# BERT grammatical-acceptability scorer (report AI profile).
#
# Model: textattack/bert-base-uncased-CoLA - BERT-base fine-tuned on the
# Corpus of Linguistic Acceptability, so it outputs P(sentence is
# grammatical). It gives a reliable overall grammar signal but cannot say
# which word is wrong, so the rule checks below still provide the concrete,
# explainable corrections; the two are blended into grammar_score.
# ---------------------------------------------------------------------------

class _BertGrammarScorer:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    inst = super().__new__(cls)
                    inst._model = None
                    inst._tokenizer = None
                    inst._attempted = False
                    inst._acceptable_idx = 1
                    cls._instance = inst
        return cls._instance

    def _load(self) -> bool:
        if self._model is not None:
            return True
        if self._attempted:
            return False
        with self._lock:
            if self._model is not None:
                return True
            self._attempted = True
            try:
                from transformers import AutoModelForSequenceClassification, AutoTokenizer
                try:
                    self._tokenizer = AutoTokenizer.from_pretrained(REPORT_GRAMMAR_MODEL, local_files_only=True)
                    self._model = AutoModelForSequenceClassification.from_pretrained(REPORT_GRAMMAR_MODEL, local_files_only=True)
                except Exception:
                    self._tokenizer = AutoTokenizer.from_pretrained(REPORT_GRAMMAR_MODEL)
                    self._model = AutoModelForSequenceClassification.from_pretrained(REPORT_GRAMMAR_MODEL)
                self._model.eval()
                # CoLA convention: label 1 = acceptable.
                labels = {v.lower(): k for k, v in (self._model.config.id2label or {}).items()}
                self._acceptable_idx = labels.get("acceptable", 1)
                logger.info("BERT CoLA grammar model loaded (%s).", REPORT_GRAMMAR_MODEL)
                return True
            except Exception as e:
                logger.warning("BERT grammar model unavailable, using rules only: %s", e)
                self._model = None
                return False

    def acceptability(self, chunks: List[str]) -> Optional[float]:
        """Length-weighted mean P(acceptable) over text chunks, 0-1."""
        if not chunks or not self._load():
            return None
        try:
            import torch
            with torch.inference_mode():
                enc = self._tokenizer(chunks, padding=True, truncation=True, max_length=96, return_tensors="pt")
                probs = torch.softmax(self._model(**enc).logits, dim=-1)[:, self._acceptable_idx].tolist()
            weights = [max(1, len(c.split())) for c in chunks]
            return sum(p * w for p, w in zip(probs, weights)) / sum(weights)
        except Exception as e:
            logger.warning("BERT grammar inference failed: %s", e)
            return None


def _grammar_chunks(raw: str, mode: str) -> List[str]:
    if mode == "text":
        parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", raw) if len(p.split()) >= 3]
        if parts:
            return parts[:12]
    # Spoken transcripts have no punctuation: score ~18-word windows.
    words = raw.split()
    return [" ".join(words[i:i + 18]) for i in range(0, len(words), 18) if len(words[i:i + 18]) >= 3][:12]

# ---------------------------------------------------------------------------
# Grammar rules: (issue type, compiled regex, suggestion builder)
# All patterns run on lowercased text with single spaces.
# ---------------------------------------------------------------------------

_VOWEL_SOUND_EXCEPTIONS = (
    "uni", "use", "usu", "uti", "ure", "eu", "one", "once", "ewe", "ufo", "uk", "us ",
)
_SILENT_H_WORDS = ("hour", "honest", "honor", "honour", "heir", "herb")
_EED_VERBS = ("need", "feed", "seed", "speed", "proceed", "succeed", "exceed", "bleed", "breed", "embed", "shed")
_COMPARATIVES = (
    "better", "worse", "easier", "faster", "bigger", "smaller", "larger", "higher", "lower",
    "simpler", "harder", "cheaper", "quicker", "best", "worst", "easiest", "fastest", "biggest",
)


def _rule_subject_verb(text: str) -> List[Tuple[str, str]]:
    issues = []
    patterns = [
        (r"\bi (is|are|has|does|doesn't)\b", {"is": "am", "are": "am", "has": "have", "does": "do", "doesn't": "don't"}),
        (r"\b(he|she|it) (are|were|have|don't)\b", {"are": "is", "were": "was", "have": "has", "don't": "doesn't"}),
        (r"\b(we|they|you) (is|was|has|does|doesn't)\b", {"is": "are", "was": "were", "has": "have", "does": "do", "doesn't": "don't"}),
    ]
    for pattern, fix in patterns:
        for m in re.finditer(pattern, text):
            words = m.group(0).split(" ")
            verb = words[-1]
            issues.append((m.group(0), f"{' '.join(words[:-1])} {fix.get(verb, verb)}"))
    return issues


def _rule_articles(text: str) -> List[Tuple[str, str]]:
    issues = []
    for m in re.finditer(r"\ba ([aeiou][a-z]+)\b", text):
        word = m.group(1)
        if word.startswith(_VOWEL_SOUND_EXCEPTIONS):
            continue
        issues.append((m.group(0), f"an {word}"))
    for m in re.finditer(r"\ban ([b-df-hj-np-tv-z][a-z]+)\b", text):
        word = m.group(1)
        # Skip silent-h words and short tokens that are probably acronyms
        # read out letter by letter ("an SQL query", "an MBA").
        if word.startswith(_SILENT_H_WORDS) or len(word) <= 3 or not re.search(r"[aeiouy]", word):
            continue
        issues.append((m.group(0), f"a {word}"))
    return issues


def _rule_double_comparative(text: str) -> List[Tuple[str, str]]:
    issues = []
    pattern = r"\b(more|most) (" + "|".join(_COMPARATIVES) + r")\b"
    for m in re.finditer(pattern, text):
        issues.append((m.group(0), m.group(2)))
    return issues


def _rule_modal_of(text: str) -> List[Tuple[str, str]]:
    return [(m.group(0), f"{m.group(1)} have") for m in re.finditer(r"\b(could|should|would|must|might) of\b", text)]


def _rule_modal_to(text: str) -> List[Tuple[str, str]]:
    return [(m.group(0), f"{m.group(1)} {m.group(2)}") for m in re.finditer(r"\b(can|will|should|must|could) to ([a-z]+)\b", text)]


def _rule_did_past(text: str) -> List[Tuple[str, str]]:
    issues = []
    for m in re.finditer(r"\b(didn't|did not|doesn't|does not|don't|do not) ([a-z]+ed)\b", text):
        verb = m.group(2)
        if verb.endswith(_EED_VERBS) or verb.endswith("eed") or len(verb) <= 4:
            continue
        issues.append((m.group(0), f"{m.group(1)} + base verb (not \"{verb}\")"))
    return issues


def _rule_repeated_word(text: str) -> List[Tuple[str, str]]:
    issues = []
    for m in re.finditer(r"\b([a-z']+) \1\b", text):
        if m.group(1) in ("that", "had", "is", "very"):
            continue
        issues.append((m.group(0), m.group(1)))
    return issues


_GRAMMAR_RULES = [
    ("Subject-verb agreement", _rule_subject_verb),
    ("Article usage", _rule_articles),
    ("Double comparative", _rule_double_comparative),
    ("Verb form", _rule_modal_of),
    ("Verb form", _rule_modal_to),
    ("Verb tense", _rule_did_past),
    ("Repeated word", _rule_repeated_word),
]

# ---------------------------------------------------------------------------
# Tone lexicons
# ---------------------------------------------------------------------------

HEDGES = (
    "i think", "i guess", "maybe", "perhaps", "kind of", "sort of", "probably", "i'm not sure",
    "im not sure", "not sure", "possibly", "i feel like", "somewhat", "i suppose", "might be",
    "hopefully", "more or less",
)
ASSERTIVE = (
    "i led", "i built", "i designed", "i implemented", "i developed", "i delivered", "i achieved",
    "i managed", "i ensured", "i decided", "i improved", "i created", "i resolved", "i solved",
    "we achieved", "we delivered", "resulted in", "which reduced", "which increased", "definitely",
    "clearly", "specifically", "for example", "for instance", "as a result", "i am confident",
    "i'm confident", "my approach", "i would",
)
NEGATIVE_SELF = (
    "i don't know", "i dont know", "no idea", "i'm bad at", "im bad at", "i can't", "i cant",
    "i never", "i forgot", "sorry", "i'm not good", "im not good", "i have no",
)


def _count_phrases(text: str, phrases) -> List[str]:
    found = []
    for p in phrases:
        hits = len(re.findall(r"\b" + re.escape(p) + r"\b", text))
        found.extend([p] * hits)
    return found


def _sentences(raw: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+", raw.strip())
    return [p for p in parts if p.strip()]


def _empty_result(status: str, mode: str) -> Dict:
    return {
        "status": status,
        "mode": mode,
        "method": METHOD,
        "language_quality_score": 0.0,
        "grammar_score": 0.0,
        "clarity_score": 0.0,
        "vocabulary_score": 0.0,
        "tone": {"label": "Not Assessed", "assertiveness_score": 0.0, "hedges": [], "assertive_markers": [], "negative_phrases": []},
        "grammar_issues": [],
        "issue_count": 0,
        "word_count": 0,
        "sentence_count": 0,
        "avg_sentence_length": 0.0,
        "lexical_diversity": 0.0,
        "notes": "No answer text was available for language analysis.",
    }


def analyze_language(transcript: Optional[str], mode: str = "spoken") -> Dict:
    """
    Analyzes grammar, clarity, vocabulary and tone of one answer.

    mode: "spoken" (ASR transcript) or "text" (typed answer).
    Returns scores on a 0-100 scale plus the concrete issues found.
    """
    mode = "text" if mode == "text" else "spoken"
    if not transcript or not isinstance(transcript, str) or not transcript.strip():
        return _empty_result("empty" if isinstance(transcript, str) else "missing", mode)

    raw = re.sub(r"\s+", " ", transcript.strip())
    lower = raw.lower()
    words = re.findall(r"[a-zA-Z']+", raw)
    word_count = len(words)
    if word_count == 0:
        return _empty_result("empty", mode)

    # ---------------- Grammar ----------------
    issues: List[Dict] = []
    for issue_type, rule in _GRAMMAR_RULES:
        for excerpt, suggestion in rule(lower):
            issues.append({"type": issue_type, "excerpt": excerpt, "suggestion": suggestion})

    sentences = _sentences(raw) if mode == "text" else []
    if mode == "text":
        # Mechanics only make sense for typed text.
        for m in re.finditer(r"(?:^|[\s(])(i)(?=[\s',.!?])", raw):
            issues.append({"type": "Capitalisation", "excerpt": "i", "suggestion": "I"})
            break
        uncapitalised = [s for s in sentences if s[0].isalpha() and s[0].islower()]
        if uncapitalised:
            issues.append({"type": "Capitalisation", "excerpt": uncapitalised[0][:40], "suggestion": "Start each sentence with a capital letter"})
        if word_count >= 8 and raw[-1] not in ".!?":
            issues.append({"type": "Punctuation", "excerpt": raw[-30:], "suggestion": "End the answer with a full stop"})
        for s in sentences:
            if len(re.findall(r"[a-zA-Z']+", s)) > 45:
                issues.append({"type": "Run-on sentence", "excerpt": s[:60] + "...", "suggestion": "Split long sentences into shorter ones"})
                break

    # Penalty scales with issue density so a long answer is not punished more
    # than a short one for the same error rate.
    # Mechanics (capitalisation/punctuation) count half as much as real
    # grammar errors.
    weighted = sum(0.5 if i["type"] in ("Capitalisation", "Punctuation") else 1.0 for i in issues)
    density = weighted / max(word_count, 30) * 100.0  # weighted issues per 100 words
    rule_grammar_score = round(max(0.0, 100.0 - density * 6.0), 1)
    grammar_score = rule_grammar_score
    bert_acceptability = None
    method = METHOD
    if is_report_profile():
        bert_acceptability = _BertGrammarScorer().acceptability(_grammar_chunks(raw, mode))
        if bert_acceptability is not None:
            grammar_score = round(0.6 * bert_acceptability * 100.0 + 0.4 * rule_grammar_score, 1)
            method = BERT_METHOD

    # ---------------- Clarity ----------------
    if mode == "text" and sentences:
        avg_sentence_length = word_count / len(sentences)
    else:
        # Transcripts have no punctuation; approximate clause length from
        # connective words so a single 120-word transcript isn't one "sentence".
        clauses = max(1, len(re.findall(r"\b(and|but|so|because|then|which|first|second|finally|also)\b", lower)) + 1)
        avg_sentence_length = word_count / clauses
    clarity = 100.0
    if avg_sentence_length > 28:
        clarity -= min(35.0, (avg_sentence_length - 28) * 1.5)
    elif avg_sentence_length < 6 and word_count >= 12:
        clarity -= 15.0
    repeated_issues = sum(1 for i in issues if i["type"] == "Repeated word")
    clarity -= min(20.0, repeated_issues * 5.0)
    structure_markers = len(re.findall(r"\b(first|second|third|finally|for example|for instance|because|therefore|as a result|in summary)\b", lower))
    if word_count >= 40 and structure_markers == 0:
        clarity -= 10.0
    clarity_score = round(max(0.0, min(100.0, clarity)), 1)

    # ---------------- Vocabulary ----------------
    lowered_words = [w.lower() for w in words]
    window = lowered_words[:100]
    lexical_diversity = len(set(window)) / len(window)
    # Short answers naturally have high type-token ratios; damp them.
    length_factor = min(1.0, word_count / 25.0)
    vocabulary_score = round(max(0.0, min(100.0, (lexical_diversity - 0.30) / 0.45 * 100.0)) * length_factor, 1)

    # ---------------- Tone ----------------
    hedges = _count_phrases(lower, HEDGES)
    assertive = _count_phrases(lower, ASSERTIVE)
    negative = _count_phrases(lower, NEGATIVE_SELF)
    per_100 = 100.0 / max(word_count, 30)
    assertiveness = 60.0 + len(assertive) * per_100 * 8.0 - len(hedges) * per_100 * 5.0 - len(negative) * per_100 * 10.0
    assertiveness_score = round(max(0.0, min(100.0, assertiveness)), 1)
    if len(negative) >= 2 or (negative and assertiveness_score < 45):
        tone_label = "Uncertain"
    elif assertiveness_score >= 72:
        tone_label = "Confident"
    elif assertiveness_score >= 50:
        tone_label = "Balanced"
    else:
        tone_label = "Tentative"

    language_quality_score = round(0.5 * grammar_score + 0.3 * clarity_score + 0.2 * vocabulary_score, 1)

    # ---------------- Notes ----------------
    notes_parts = []
    if not issues:
        notes_parts.append("No common grammar errors were detected.")
    else:
        types = sorted({i["type"] for i in issues})
        notes_parts.append(f"{len(issues)} language issue(s) to fix ({', '.join(types)}).")
    notes_parts.append(f"Your tone came across as {tone_label.lower()}")
    if hedges:
        notes_parts[-1] += f" ({len(hedges)} unsure phrase(s) such as \"{hedges[0]}\")"
    notes_parts[-1] += "."

    return {
        "status": "completed",
        "mode": mode,
        "method": method,
        "language_quality_score": language_quality_score,
        "grammar_score": grammar_score,
        "rule_grammar_score": rule_grammar_score,
        "bert_acceptability": round(bert_acceptability * 100.0, 1) if bert_acceptability is not None else None,
        "clarity_score": clarity_score,
        "vocabulary_score": vocabulary_score,
        "tone": {
            "label": tone_label,
            "assertiveness_score": assertiveness_score,
            "hedges": hedges[:6],
            "assertive_markers": assertive[:6],
            "negative_phrases": negative[:6],
        },
        "grammar_issues": issues[:10],
        "issue_count": len(issues),
        "word_count": word_count,
        "sentence_count": len(sentences) if mode == "text" else None,
        "avg_sentence_length": round(avg_sentence_length, 1),
        "lexical_diversity": round(lexical_diversity, 3),
        "notes": " ".join(notes_parts),
    }


def summarize_language(per_question_results: List[Dict]) -> Dict:
    """Aggregates per-question language analysis for the interview report."""
    analyses = [
        (q.get("text_analysis") or {}).get("language_analysis")
        for q in per_question_results
    ]
    analyses = [a for a in analyses if isinstance(a, dict) and a.get("status") == "completed"]
    if not analyses:
        return {"status": "unavailable", "method": METHOD, "evaluated_answers": 0}

    def avg(key: str) -> float:
        return round(sum(a[key] for a in analyses) / len(analyses), 1)

    tone_labels = [a["tone"]["label"] for a in analyses]
    dominant_tone = max(set(tone_labels), key=tone_labels.count)
    issue_types: Dict[str, int] = {}
    examples: List[Dict] = []
    for a in analyses:
        for issue in a.get("grammar_issues", []):
            issue_types[issue["type"]] = issue_types.get(issue["type"], 0) + 1
            if len(examples) < 5:
                examples.append(issue)
    all_hedges = [h for a in analyses for h in a["tone"].get("hedges", [])]

    return {
        "status": "completed",
        "method": METHOD,
        "evaluated_answers": len(analyses),
        "avg_language_quality": avg("language_quality_score"),
        "avg_grammar_score": avg("grammar_score"),
        "avg_clarity_score": avg("clarity_score"),
        "avg_vocabulary_score": avg("vocabulary_score"),
        "avg_assertiveness": round(sum(a["tone"]["assertiveness_score"] for a in analyses) / len(analyses), 1),
        "dominant_tone": dominant_tone,
        "total_issues": sum(a.get("issue_count", 0) for a in analyses),
        "issue_breakdown": issue_types,
        "issue_examples": examples,
        "common_hedges": sorted(set(all_hedges), key=all_hedges.count, reverse=True)[:3],
    }


def language_feedback(summary: Dict) -> Dict[str, List[str]]:
    """Turns the language summary into strengths / weaknesses / suggestions
    in the same "Title: explanation" format insights_service.py uses."""
    out = {"strengths": [], "weaknesses": [], "suggestions": []}
    if summary.get("status") != "completed":
        return out

    grammar = summary["avg_grammar_score"]
    tone = summary["dominant_tone"]
    breakdown = summary.get("issue_breakdown", {})

    if grammar >= 90 and summary["evaluated_answers"] >= 1:
        out["strengths"].append("Clean Language: Answers were grammatically clean with no recurring errors.")
    if tone == "Confident":
        out["strengths"].append("Confident Tone: Answers used direct, ownership-focused language (e.g. \"I led\", \"as a result\").")

    if grammar < 75 and breakdown:
        top = max(breakdown, key=breakdown.get)
        example = next((e for e in summary.get("issue_examples", []) if e["type"] == top), None)
        detail = f" e.g. \"{example['excerpt']}\" → \"{example['suggestion']}\"" if example else ""
        out["weaknesses"].append(f"Grammar Accuracy: Recurring {top.lower()} errors{detail}.")
        out["suggestions"].append(
            f"Language Polish: Review {top.lower()} rules and re-read typed answers (or replay spoken ones) before submitting."
        )
    if tone in ("Tentative", "Uncertain"):
        hedges = summary.get("common_hedges") or []
        sample = f" (\"{hedges[0]}\")" if hedges else ""
        out["weaknesses"].append(f"Unsure Tone: Frequent unsure phrases{sample} make your answers sound less confident.")
        out["suggestions"].append(
            "Direct Phrasing: Replace phrases like \"I think\" or \"maybe\" with direct statements and concrete outcomes (\"I implemented X, which reduced Y\")."
        )
    if summary["avg_clarity_score"] < 65:
        out["suggestions"].append(
            "Answer Structure: Use shorter sentences and signpost your points (\"First… Second… As a result…\")."
        )
    return out
