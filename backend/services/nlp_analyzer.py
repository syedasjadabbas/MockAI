"""
Real NLP & Transcript Analyzer for candidate interview responses (Phase 1).

Compares candidate response transcripts against the Question Bank snapshot
(question_text, expected_answer, tags, difficulty) to calculate an explainable,
deterministic 0-100 content evaluation score.

Integrity guarantee:
- Never fabricates transcripts or covered concepts.
- Safely handles missing, empty, or unconfigured ASR transcripts.
- Fully explainable scoring based on keyword/concept coverage, question relevance,
  and answer completeness.
"""
import re
from typing import Dict, List, Optional, Set, Tuple

from services.ai_interfaces import NLPService, TextAnalysisResult

# Common English stop words to exclude from keyword extraction
STOP_WORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
    "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves", "also", "well", "like", "just", "know", "mean",
    "actually", "basically", "literally", "yeah", "yes", "um", "uh", "ah",
    "make", "makes", "making", "made", "creates", "create", "creating", "use",
    "uses", "using", "used", "determine", "determines", "explain", "explaining"
}


def _tokenize(text: Optional[str]) -> List[str]:
    """Tokenizes text into lowercase alphanumeric words."""
    if not text:
        return []
    words = re.findall(r"\b[a-zA-Z0-9_-]+\b", text.lower())
    return words


def _extract_keywords(text: Optional[str], min_length: int = 3) -> Set[str]:
    """Extracts non-stop-word keywords from text."""
    if not text:
        return set()
    tokens = _tokenize(text)
    return {w for w in tokens if len(w) >= min_length and w not in STOP_WORDS}


def _stem(word: str) -> str:
    """Simple heuristic suffix stemmer for English technical terms."""
    w = word.lower().strip()
    for suffix in ("ing", "tion", "tions", "ness", "ment", "ments", "ies", "es", "s", "ed", "al", "ic"):
        if len(w) > len(suffix) + 3 and w.endswith(suffix):
            return w[:-len(suffix)]
    return w


def _extract_concept_phrases(tags: Optional[List[str]], expected_answer: Optional[str]) -> List[str]:
    """
    Extracts key domain concepts from question tags and expected answer.
    Preserves multi-word concepts (e.g., 'virtual dom', 'event loop', 'jwt').
    """
    concepts: List[str] = []
    seen: Set[str] = set()

    if tags:
        for tag in tags:
            cleaned = tag.strip().lower()
            if cleaned and cleaned not in STOP_WORDS and cleaned not in seen:
                concepts.append(cleaned)
                seen.add(cleaned)

    if expected_answer:
        keywords = _extract_keywords(expected_answer, min_length=4)
        for kw in keywords:
            if kw not in seen:
                concepts.append(kw)
                seen.add(kw)

    return concepts


def _check_concept_presence(concept: str, transcript_lower: str, transcript_tokens: Set[str], transcript_stems: Set[str]) -> bool:
    """Checks if a concept phrase or keyword is present in the transcript."""
    concept_lower = concept.lower().strip()
    if " " in concept_lower:
        # Multi-word phrase: direct substring in transcript
        if concept_lower in transcript_lower:
            return True
        phrase_words = concept_lower.split()
        if all(pw in transcript_tokens or _stem(pw) in transcript_stems for pw in phrase_words):
            return True
        return False
    
    # Single word exact match in tokens
    if concept_lower in transcript_tokens:
        return True
    
    # Stem match
    concept_stem = _stem(concept_lower)
    if concept_stem in transcript_stems:
        return True

    # Word boundary substring in transcript
    if re.search(r"\b" + re.escape(concept_lower) + r"\b", transcript_lower):
        return True

    return False


def analyze_transcript(
    question_text: str,
    expected_answer: Optional[str],
    tags: Optional[List[str]],
    difficulty: str,
    transcript: Optional[str],
) -> Dict:
    """
    Analyzes a candidate response transcript against the question requirements.

    Returns:
        Dict with:
            - status: "completed" | "empty" | "missing"
            - content_score: float (0.0 to 100.0)
            - concept_coverage_score: float (0.0 to 100.0)
            - relevance_score: float (0.0 to 100.0)
            - completeness_score: float (0.0 to 100.0)
            - covered_concepts: List[str]
            - missing_concepts: List[str]
            - notes: str
    """
    if not transcript or not transcript.strip():
        # Safely handle missing or empty transcript without inventing anything
        expected_concepts = _extract_concept_phrases(tags, expected_answer)
        return {
            "status": "empty" if transcript == "" else "missing",
            "content_score": 0.0,
            "concept_coverage_score": 0.0,
            "relevance_score": 0.0,
            "completeness_score": 0.0,
            "covered_concepts": [],
            "missing_concepts": expected_concepts[:5],
            "notes": "No spoken response recorded or transcript was empty.",
        }

    clean_transcript = transcript.strip()
    transcript_lower = clean_transcript.lower()
    transcript_tokens = set(_tokenize(clean_transcript))
    transcript_keywords = {w for w in transcript_tokens if w not in STOP_WORDS}
    transcript_stems = {_stem(w) for w in transcript_tokens}

    # 1. Concept Coverage
    concept_pool = _extract_concept_phrases(tags, expected_answer)
    covered: List[str] = []
    missing: List[str] = []

    for c in concept_pool:
        if _check_concept_presence(c, transcript_lower, transcript_tokens, transcript_stems):
            covered.append(c)
        else:
            missing.append(c)

    if concept_pool:
        concept_coverage_score = min(100.0, (len(covered) / max(1, len(concept_pool) * 0.65)) * 100.0)
    else:
        concept_coverage_score = 60.0

    # 2. Relevance Score (overlap between transcript keywords and question keywords)
    question_keywords = _extract_keywords(question_text)
    expected_keywords = _extract_keywords(expected_answer)
    reference_keywords = question_keywords | expected_keywords

    if reference_keywords:
        reference_stems = {_stem(w) for w in reference_keywords}
        overlap_stems = transcript_stems & reference_stems
        relevance_score = min(100.0, (len(overlap_stems) / max(1, len(reference_keywords) * 0.45)) * 100.0)
    else:
        relevance_score = 60.0

    # 3. Completeness Score (depth of response relative to expected length)
    word_count = len(_tokenize(clean_transcript))
    target_words = {"Easy": 25, "Medium": 45, "Hard": 70}.get(difficulty, 45)
    completeness_score = min(100.0, (word_count / float(target_words)) * 100.0)

    # 4. Composite Content Score
    # 45% concept coverage + 35% question relevance + 20% completeness
    raw_score = (0.45 * concept_coverage_score) + (0.35 * relevance_score) + (0.20 * completeness_score)
    content_score = round(min(100.0, max(0.0, raw_score)), 1)

    # Generate explanatory notes
    if content_score >= 80:
        notes = f"Thorough response covering core concepts ({len(covered)} identified). Strong alignment with expected criteria."
    elif content_score >= 55:
        notes = f"Satisfactory answer covering basic principles ({len(covered)} concepts), with opportunities for greater technical depth."
    else:
        notes = f"Partial response with limited key concept coverage. Key areas were missed."

    return {
        "status": "completed",
        "content_score": content_score,
        "concept_coverage_score": round(concept_coverage_score, 1),
        "relevance_score": round(relevance_score, 1),
        "completeness_score": round(completeness_score, 1),
        "covered_concepts": sorted(covered)[:8],
        "missing_concepts": sorted(missing)[:6],
        "notes": notes,
    }


class RealNLPService(NLPService):
    """
    Concrete implementation of the NLPService contract using real rule-based analysis.
    """
    def analyze_text(self, transcript: Optional[str]) -> TextAnalysisResult:
        if not transcript or not transcript.strip():
            return TextAnalysisResult(status="empty", language_quality=0.0, clarity=0.0, notes="Empty transcript", model="real-nlp-v1")
        
        words = _tokenize(transcript)
        word_count = len(words)
        quality = min(100.0, (word_count / 30.0) * 100.0)
        return TextAnalysisResult(
            status="completed",
            language_quality=round(quality, 1),
            clarity=round(quality, 1),
            notes=f"Analyzed {word_count} spoken words",
            model="real-nlp-v1",
        )
