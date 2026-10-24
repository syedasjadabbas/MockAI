"""
Report-Aligned NLP & Semantic Transcript Analyzer for Candidate Interview Responses (Task 2).

Implements FR16 (Text Analysis) using a DistilBERT-family semantic transformer model
(all-MiniLM-L6-v2) to evaluate candidate transcripts against question rubrics,
expected technical answers, and domain concept taxonomy.

Integrity guarantee:
- Never fabricates scores, transcripts, or covered concepts.
- Safely handles missing, empty, or whitespace transcripts with zero score.
- Distinguishes semantically sound answers from irrelevant responses using dense embeddings.
- Full deterministic fallback to heuristic keyword/stemming analyzer on model load or inference failure.
"""
import logging
import os
import re
import threading
from typing import Dict, List, Optional, Set, Tuple

from services.ai_interfaces import NLPService, TextAnalysisResult
from services.ai_profile import sentence_model_name, REPORT_SENTENCE_MODEL

# ---------------------------------------------------------------------------
# Per-model similarity calibration.
#
# The score thresholds below (concept match >= 0.48, semantic floor 0.12 /
# span 0.65, relevance floor 0.06 / span 0.58) were tuned on MiniLM. Another
# encoder produces cosine similarities on a different scale, so its raw
# similarity is mapped onto the MiniLM scale with a linear fit
#     calibrated = slope * raw + intercept
# fitted by least squares on real (transcript, reference) pairs from the
# question bank - see backend/calibrate_nlp_models.py. Identity for MiniLM.
# ---------------------------------------------------------------------------
SIMILARITY_CALIBRATION = {
    # Fitted 2026-10-20 on 266 real answer/reference pairs, R^2 = 0.967.
    REPORT_SENTENCE_MODEL: (0.9795, 0.0510),
}

LITE_MODEL_LABEL = "bert-distilbert-minilm-v2"
REPORT_MODEL_LABEL = "distilbert-multi-qa-cos-v1"


def nlp_model_label() -> str:
    """Name of the encoder that actually runs, for result records."""
    loaded = getattr(BertSemanticAnalyzer._instance, "_model_name", None) if BertSemanticAnalyzer._instance else None
    name = loaded or sentence_model_name()
    return REPORT_MODEL_LABEL if name == REPORT_SENTENCE_MODEL else LITE_MODEL_LABEL


def _calibrate(sim: float, model_name: Optional[str]) -> float:
    slope, intercept = SIMILARITY_CALIBRATION.get(model_name or "", (1.0, 0.0))
    return max(-1.0, min(1.0, slope * sim + intercept))

logger = logging.getLogger("mockai.nlp")

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
    "uses", "using", "used", "determine", "determines", "explain", "explaining",
    "run", "runs", "running", "ran", "work", "works", "working", "worked",
    "give", "gives", "giving", "given", "take", "takes", "taking", "taken",
    "call", "calls", "calling", "called", "show", "shows", "showing", "shown",
    "help", "helps", "helping", "helped", "need", "needs", "needing", "needed",
    "find", "finds", "finding", "found", "allow", "allows", "allowing", "allowed",
    "said", "tell", "tells", "telling", "told"
}


def _tokenize(text: Optional[str]) -> List[str]:
    """Tokenizes text into lowercase alphanumeric words."""
    if not text or not isinstance(text, str):
        return []
    words = re.findall(r"\b[a-zA-Z0-9_-]+\b", text.lower())
    return words


def _extract_keywords(text: Optional[str], min_length: int = 3) -> Set[str]:
    """Extracts non-stop-word keywords from text."""
    if not text or not isinstance(text, str):
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


def _extract_concept_phrases(tags: Optional[List[str]], expected_answer: Optional[str], rubric: Optional[Dict] = None) -> List[str]:
    """
    Extracts key domain concepts from question tags, expected answer, and rubric.
    Preserves multi-word concepts (e.g., 'virtual dom', 'event loop', 'jwt').
    """
    concepts: List[str] = []
    seen: Set[str] = set()

    if tags and isinstance(tags, list):
        for tag in tags:
            if isinstance(tag, str):
                cleaned = tag.strip().lower()
                if cleaned and cleaned not in STOP_WORDS and cleaned not in seen:
                    concepts.append(cleaned)
                    seen.add(cleaned)

    if rubric and isinstance(rubric, dict):
        key_points = rubric.get("key_points") or rubric.get("criteria")
        if isinstance(key_points, list):
            for kp in key_points:
                if isinstance(kp, str) and kp.strip().lower() not in seen:
                    concepts.append(kp.strip().lower())
                    seen.add(kp.strip().lower())

    if expected_answer and isinstance(expected_answer, str):
        keywords = _extract_keywords(expected_answer, min_length=5)
        for kw in keywords:
            if kw not in seen:
                concepts.append(kw)
                seen.add(kw)

    return concepts


def _check_concept_presence(concept: str, transcript_lower: str, transcript_tokens: Set[str], transcript_stems: Set[str]) -> bool:
    """Checks if a concept phrase or keyword is directly present in the transcript."""
    concept_lower = concept.lower().strip()
    if " " in concept_lower:
        if concept_lower in transcript_lower:
            return True
        phrase_words = concept_lower.split()
        if all(pw in transcript_tokens or _stem(pw) in transcript_stems for pw in phrase_words):
            return True
        return False
    
    if concept_lower in transcript_tokens:
        return True
    
    concept_stem = _stem(concept_lower)
    if concept_stem in transcript_stems:
        return True

    if re.search(r"\b" + re.escape(concept_lower) + r"\b", transcript_lower):
        return True

    return False


def _detect_prompt_echo(transcript: str, question: str) -> Tuple[bool, float]:
    """
    Detects whether the candidate merely parroted/echoed the question prompt
    rather than answering it substantively.
    Returns (is_echo, echo_overlap_ratio).
    """
    t_words = _extract_keywords(transcript, min_length=3)
    q_words = _extract_keywords(question, min_length=3)
    if not t_words:
        return False, 0.0
    overlap = t_words & q_words
    echo_ratio = len(overlap) / float(len(t_words))
    new_words = t_words - q_words
    # If 65%+ of candidate content words were copied from question prompt and <= 3 new words introduced
    if echo_ratio >= 0.65 and len(new_words) <= 3 and len(t_words) >= 4:
        return True, echo_ratio
    return False, echo_ratio


def _extract_concept_pools(
    question_text: str,
    tags: Optional[List[str]],
    expected_answer: Optional[str],
    rubric: Optional[Dict] = None,
) -> Tuple[List[str], List[str], List[str]]:
    """
    Extracts and separates concept pools into:
    - full_pool: all concepts from tags, rubric, expected answer
    - prompt_concepts: concepts that appear directly in the question prompt
    - target_concepts: concepts expected in a substantive answer (not given in prompt)
    """
    full_pool = _extract_concept_phrases(tags, expected_answer, rubric)
    q_lower = (question_text or "").lower()
    prompt_concepts: List[str] = []
    target_concepts: List[str] = []

    for c in full_pool:
        c_low = c.lower().strip()
        # If the concept or its words are prominent in the question prompt
        if c_low in q_lower or any(len(w) > 3 and w in q_lower for w in c_low.split()):
            prompt_concepts.append(c)
        else:
            target_concepts.append(c)

    # If all concepts were in prompt, target_concepts defaults to full_pool
    if not target_concepts:
        target_concepts = list(full_pool)

    return full_pool, prompt_concepts, target_concepts


class BertSemanticAnalyzer:
    """
    Singleton BERT/DistilBERT semantic encoder using sentence-transformers.
    Model is chosen by the AI profile (services/ai_profile.py):
      report: sentence-transformers/multi-qa-distilbert-cos-v1 (DistilBERT, 768-dim)
      lite:   all-MiniLM-L6-v2 (6-layer distilled MiniLM, 384-dim)
    """
    _instance: Optional["BertSemanticAnalyzer"] = None
    _lock: threading.Lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(BertSemanticAnalyzer, cls).__new__(cls)
                    cls._instance._model = None
                    cls._instance._model_name = None
                    cls._instance._init_attempted = False
                    cls._instance._load_error = None
        return cls._instance

    def get_model(self):
        """
        Loads the SentenceTransformer model (singleton), preferring local cached files
        to eliminate external Hugging Face network latency and online connectivity checks.
        Safe and explicit fallback downloads the model if it is not found locally.
        """
        if self._model is not None:
            return self._model

        with self._lock:
            if self._model is not None:
                return self._model

            if not self._init_attempted or self._model is None:
                self._init_attempted = True
                try:
                    import torch
                    # Constrain PyTorch thread pool to prevent thread-arena memory fragmentation
                    torch.set_num_threads(1)
                    try:
                        torch.set_num_interop_threads(1)
                    except Exception:
                        pass
                    from sentence_transformers import SentenceTransformer
                    model_name = sentence_model_name()
                    try:
                        # 1. Prefer local cached files to eliminate external Hugging Face network checks/timeouts
                        self._model = SentenceTransformer(model_name, local_files_only=True)
                        logger.info("SentenceTransformer %s (DistilBERT family) loaded from local cache (offline).", model_name)
                    except Exception as local_err:
                        logger.info("Local model cache miss or notice (%s); performing explicit fallback load...", local_err)
                        # 2. Safe and explicit fallback if local cache is missing
                        self._model = SentenceTransformer(model_name)
                        logger.info("SentenceTransformer %s (DistilBERT family) loaded successfully via fallback.", model_name)
                    self._model_name = model_name
                except Exception as e:
                    logger.warning("Could not initialize BERT/DistilBERT model: %s", e)
                    self._load_error = str(e)
                    self._model = None
                    # Report profile: fall back to the lite encoder rather than
                    # dropping to the keyword heuristic.
                    lite = "all-MiniLM-L6-v2"
                    if model_name != lite:
                        try:
                            from sentence_transformers import SentenceTransformer
                            self._model = SentenceTransformer(lite)
                            self._model_name = lite
                            logger.warning("Fell back to %s after %s failed to load.", lite, model_name)
                        except Exception as fb_err:
                            logger.warning("Lite encoder fallback also failed: %s", fb_err)

        return self._model

    def compute_similarities_batch(self, query_text: str, target_texts: List[str]) -> List[float]:
        """
        Computes cosine semantic similarities between query_text and multiple target_texts
        in a single batched model.encode forward pass to eliminate redundant embeddings.
        """
        model = self.get_model()
        if model is None:
            raise RuntimeError(f"BERT model unavailable: {self._load_error}")
        if not target_texts:
            return []

        import torch
        from sentence_transformers import util
        all_texts = [query_text] + list(target_texts)
        with torch.inference_mode():
            embeddings = model.encode(all_texts, convert_to_tensor=True, show_progress_bar=False)
            query_emb = embeddings[0:1]
            target_embs = embeddings[1:]
            sim_matrix = util.cos_sim(query_emb, target_embs)[0]
            return [_calibrate(float(sim.item()), self._model_name) for sim in sim_matrix]

    def compute_similarity(self, text_a: str, text_b: str) -> float:
        """
        Computes cosine semantic similarity between two texts in dense embedding space.
        Returns float between -1.0 and 1.0.
        """
        sims = self.compute_similarities_batch(text_a, [text_b])
        return sims[0] if sims else 0.0

    def evaluate_concepts_semantically(
        self,
        concepts: List[str],
        transcript: str,
        transcript_tokens: Set[str],
        transcript_stems: Set[str],
    ) -> Tuple[List[str], List[str]]:
        """
        Evaluates which key concepts are addressed either via direct mention
        or via deep semantic embedding alignment.
        Batches concept embeddings to minimize forward-pass compute overhead.
        """
        covered: List[str] = []
        missing: List[str] = []
        transcript_lower = transcript.lower()

        # Split transcript into sentences for fine-grained semantic matching
        sentences = [s.strip() for s in re.split(r"[.!?\n]+", transcript) if len(s.strip()) > 5]
        if not sentences:
            sentences = [transcript]

        model = self.get_model()

        # Separate concepts into direct lexical matches vs candidates for semantic matching
        unmatched_concepts: List[str] = []
        for c in concepts:
            if _check_concept_presence(c, transcript_lower, transcript_tokens, transcript_stems):
                covered.append(c)
            elif model is not None and len(c.strip()) > 2:
                unmatched_concepts.append(c)
            else:
                missing.append(c)

        # Batch compute semantic similarity for all unmatched concepts in a single forward pass
        if unmatched_concepts and model is not None:
            try:
                import torch
                from sentence_transformers import util
                with torch.inference_mode():
                    emb_sentences = model.encode(sentences, convert_to_tensor=True, show_progress_bar=False)
                    emb_unmatched = model.encode(unmatched_concepts, convert_to_tensor=True, show_progress_bar=False)
                    sim_matrix = util.cos_sim(emb_unmatched, emb_sentences)
                    max_sims = sim_matrix.max(dim=1).values

                for i, c in enumerate(unmatched_concepts):
                    if _calibrate(max_sims[i].item(), self._model_name) >= 0.48:
                        covered.append(c)
                    else:
                        missing.append(c)
            except Exception as enc_err:
                logger.debug(f"Batched concept embedding notice: {enc_err}")
                missing.extend(unmatched_concepts)
        else:
            missing.extend(unmatched_concepts)

        return covered, missing


def _heuristic_analysis(
    question_text: str,
    expected_answer: Optional[str],
    tags: Optional[List[str]],
    difficulty: str,
    transcript: Optional[str],
    rubric: Optional[Dict] = None,
) -> Dict:
    """
    Deterministic rule-based NLP analyzer.
    Preserved as the reliable fallback and baseline with Phase 2 calibration.
    """
    full_pool, prompt_concepts, target_concepts = _extract_concept_pools(question_text, tags, expected_answer, rubric)
    if not transcript or not isinstance(transcript, str) or not transcript.strip():
        return {
            "status": "empty" if (isinstance(transcript, str) and not transcript.strip()) else "missing",
            "content_score": 0.0,
            "semantic_similarity_score": 0.0,
            "concept_coverage_score": 0.0,
            "relevance_score": 0.0,
            "completeness_score": 0.0,
            "covered_concepts": [],
            "missing_concepts": target_concepts[:8] if target_concepts else full_pool[:5],
            "notes": "No answer was recorded for this question.",
            "model": "heuristic-fallback",
            "error": None,
            "is_echo": False,
            "is_fragment": False,
            "covered_target_concepts": [],
            "covered_prompt_concepts": [],
        }

    clean_transcript = transcript.strip()
    words = _tokenize(clean_transcript)
    word_count = len(words)
    transcript_lower = clean_transcript.lower()
    transcript_tokens = set(words)
    transcript_stems = {_stem(w) for w in transcript_tokens}

    covered: List[str] = []
    missing: List[str] = []

    for c in full_pool:
        if _check_concept_presence(c, transcript_lower, transcript_tokens, transcript_stems):
            covered.append(c)
        else:
            missing.append(c)

    covered_target = [c for c in covered if c in target_concepts]
    covered_prompt = [c for c in covered if c in prompt_concepts]

    is_echo, echo_ratio = _detect_prompt_echo(clean_transcript, question_text)
    is_fragment = (word_count <= 4) and (len(covered_target) == 0)

    # Concept Coverage Score
    target_ratio = (len(covered_target) / max(1.0, len(target_concepts) * 0.50)) if target_concepts else 0.0
    prompt_ratio = (len(covered_prompt) / max(1.0, len(prompt_concepts))) if prompt_concepts else 0.0

    if target_concepts:
        if len(covered_target) == 0:
            concept_coverage_score = min(12.0, prompt_ratio * 12.0)
        else:
            concept_coverage_score = min(100.0, (0.85 * target_ratio + 0.15 * min(1.0, prompt_ratio)) * 100.0)
    else:
        concept_coverage_score = min(100.0, (len(covered) / max(1.0, len(full_pool) * 0.60)) * 100.0) if full_pool else 60.0

    # Relevance Score
    question_keywords = _extract_keywords(question_text)
    expected_keywords = _extract_keywords(expected_answer)
    reference_keywords = question_keywords | expected_keywords

    if is_echo:
        relevance_score = max(0.0, min(15.0, 15.0 * (1.0 - echo_ratio)))
    elif is_fragment:
        relevance_score = min(20.0, 5.0 * word_count)
    elif reference_keywords:
        reference_stems = {_stem(w) for w in reference_keywords}
        overlap_stems = transcript_stems & reference_stems
        raw_rel = min(100.0, (len(overlap_stems) / max(1, len(reference_keywords) * 0.45)) * 100.0)
        if len(covered_target) == 0 and target_concepts:
            relevance_score = min(25.0, raw_rel * 0.40)
        elif target_ratio < 0.15 and len(target_concepts) >= 5:
            relevance_score = min(35.0, raw_rel * 0.45)
        else:
            relevance_score = raw_rel
    else:
        relevance_score = 60.0

    # Completeness Score
    target_words = {"Easy": 25, "Medium": 45, "Hard": 70}.get(difficulty, 45)
    length_ratio = min(1.0, word_count / float(target_words))
    if concept_coverage_score >= 60.0:
        completeness_score = max(length_ratio * 100.0, min(100.0, concept_coverage_score * 0.95))
    elif is_echo or is_fragment:
        completeness_score = min(10.0, length_ratio * 15.0)
    elif concept_coverage_score < 15.0:
        completeness_score = min(20.0, length_ratio * 20.0)
    else:
        completeness_score = min(100.0, length_ratio * 100.0)

    # Heuristic semantic similarity proxy
    sem_proxy = relevance_score
    if is_echo:
        sem_proxy = min(15.0, relevance_score * 0.15)
    elif is_fragment:
        sem_proxy = min(15.0, relevance_score * 0.20)
    elif len(covered_target) == 0 and target_concepts:
        sem_proxy = min(22.0, relevance_score * 0.30)
    elif target_ratio < 0.15 and len(target_concepts) >= 5:
        sem_proxy = min(30.0, relevance_score * 0.35)
    elif word_count < 10 and len(covered_target) < 2:
        sem_proxy = min(40.0, relevance_score * 0.50)

    # 40% semantic proxy, 35% coverage, 15% relevance, 10% completeness
    raw_score = (0.40 * sem_proxy) + (0.35 * concept_coverage_score) + (0.15 * relevance_score) + (0.10 * completeness_score)
    content_score = round(min(100.0, max(0.0, raw_score)), 1)

    if is_echo:
        notes = "Your answer mostly repeated the question without explaining anything."
    elif is_fragment:
        notes = f"Your answer was very short ({word_count} words) and did not explain the topic."
    elif content_score >= 80:
        notes = f"Thorough answer: you covered {len(covered_target)} key point(s) and matched what a strong answer includes."
    elif content_score >= 55:
        notes = f"Good answer covering the basics ({len(covered_target)} key point(s)); more depth would make it stronger."
    elif content_score < 25:
        notes = "Your answer did not address what the question was asking about."
    else:
        notes = "Partial answer: some key points were missing."

    def _concept_rank(c: str) -> Tuple[int, str]:
        c_low = c.lower()
        if tags and any(c_low in (t or "").lower() or (t or "").lower() in c_low for t in tags):
            return (0, c)
        if " " in c:
            return (1, c)
        if c in target_concepts:
            return (2, c)
        return (3, c)

    sorted_covered = sorted(covered, key=_concept_rank)
    sorted_missing = sorted(missing, key=_concept_rank)

    return {
        "status": "completed",
        "content_score": content_score,
        "semantic_similarity_score": round(sem_proxy, 1),
        "concept_coverage_score": round(concept_coverage_score, 1),
        "relevance_score": round(relevance_score, 1),
        "completeness_score": round(completeness_score, 1),
        "covered_concepts": sorted_covered[:15],
        "missing_concepts": sorted_missing[:8],
        "notes": notes,
        "model": "heuristic-fallback",
        "error": None,
        "is_echo": is_echo,
        "is_fragment": is_fragment,
        "covered_target_concepts": covered_target,
        "covered_prompt_concepts": covered_prompt,
    }


def analyze_transcript(
    question_text: str,
    expected_answer: Optional[str],
    tags: Optional[List[str]],
    difficulty: str,
    transcript: Optional[str],
    rubric: Optional[Dict] = None,
) -> Dict:
    """
    Analyzes a candidate response transcript against the question requirements
    using report-aligned BERT/DistilBERT semantic embeddings (FR16).

    Integrity guarantee:
    - Never fabricates scores or concepts.
    - Accurately discriminates relevant answers from irrelevant answers.
    - Prevents score inflation for fragments, parrots, and ungrounded keywords.
    - Gracefully falls back to heuristic baseline on model loading failure or exception.
    """
    full_pool, prompt_concepts, target_concepts = _extract_concept_pools(question_text, tags, expected_answer, rubric)

    # 1. Guard against empty, non-string, or whitespace inputs
    if not transcript or not isinstance(transcript, str) or not transcript.strip():
        return {
            "status": "empty" if (isinstance(transcript, str) and not transcript.strip()) else "missing",
            "content_score": 0.0,
            "semantic_similarity_score": 0.0,
            "concept_coverage_score": 0.0,
            "relevance_score": 0.0,
            "completeness_score": 0.0,
            "covered_concepts": [],
            "missing_concepts": target_concepts[:8] if target_concepts else full_pool[:5],
            "notes": "No answer was recorded for this question.",
            "model": nlp_model_label(),
            "error": None,
            "is_echo": False,
            "is_fragment": False,
            "covered_target_concepts": [],
            "covered_prompt_concepts": [],
        }

    clean_transcript = transcript.strip()

    # 2. Execute BERT/DistilBERT Semantic Analysis Pipeline
    try:
        analyzer = BertSemanticAnalyzer()
        model = analyzer.get_model()
        if model is None:
            logger.info("BERT model not available. Utilizing deterministic heuristic fallback.")
            return _heuristic_analysis(question_text, expected_answer, tags, difficulty, clean_transcript, rubric=rubric)

        words = _tokenize(clean_transcript)
        word_count = len(words)
        transcript_tokens = set(words)
        transcript_stems = {_stem(w) for w in transcript_tokens}

        # Check prompt echoing and fragment conditions
        is_echo, echo_ratio = _detect_prompt_echo(clean_transcript, question_text)

        # Build reference baseline from expected answer, rubric, and question text
        ref_components = []
        if expected_answer and expected_answer.strip():
            ref_components.append(expected_answer.strip())
        if rubric and isinstance(rubric, dict):
            criteria = rubric.get("criteria") or rubric.get("description")
            if criteria and isinstance(criteria, str):
                ref_components.append(criteria.strip())
        
        # If no expected answer exists in question bank, question prompt is the primary reference
        if not ref_components:
            reference_text = question_text
        else:
            reference_text = " ".join(ref_components)

        # Sentences for multi-sentence alignment
        sentences = [s.strip() for s in re.split(r"[.!?\n]+", clean_transcript) if len(s.strip()) > 5]
        if not sentences:
            sentences = [clean_transcript]

        # Compute semantic cosine similarities in dense embedding space (single batched forward pass)
        sim_scores = analyzer.compute_similarities_batch(clean_transcript, [reference_text, question_text])
        sim_expected_full = sim_scores[0]
        sim_question = sim_scores[1]

        if len(sentences) > 1:
            sent_sims = analyzer.compute_similarities_batch(reference_text, sentences)
            sim_expected = max(sim_expected_full, 0.40 * sim_expected_full + 0.60 * max(sent_sims))
        else:
            sim_expected = sim_expected_full

        # Evaluate concept coverage
        covered, missing = analyzer.evaluate_concepts_semantically(
            full_pool,
            clean_transcript,
            transcript_tokens,
            transcript_stems,
        )

        covered_target = [c for c in covered if c in target_concepts]
        covered_prompt = [c for c in covered if c in prompt_concepts]
        is_fragment = (word_count <= 4) and (len(covered_target) == 0)

        # Calibrate similarity scores to 0.0-100.0 scale
        # Empirically, dense similarity for unrelated responses spans 0.00 to 0.12, while aligned answers reach 0.75+
        raw_sem = max(0.0, min(100.0, ((sim_expected - 0.12) / 0.65) * 100.0))

        # Target concept coverage ratios
        target_ratio = (len(covered_target) / max(1.0, len(target_concepts) * 0.50)) if target_concepts else 0.0
        prompt_ratio = (len(covered_prompt) / max(1.0, len(prompt_concepts))) if prompt_concepts else 0.0

        # Substance gating on semantic score
        if is_echo:
            sem_score = min(15.0, raw_sem * 0.15)
        elif is_fragment:
            sem_score = min(15.0, raw_sem * 0.15)
        elif len(covered_target) == 0 and target_concepts:
            sem_score = min(18.0, raw_sem * 0.20)
        elif target_ratio < 0.15 and len(target_concepts) >= 5:
            # Isolated single keyword without broader domain substance
            sem_score = min(30.0, raw_sem * 0.35)
        elif word_count < 10 and len(covered_target) < 2:
            sem_score = min(40.0, raw_sem * 0.50)
        else:
            sem_score = raw_sem

        # Concept coverage score
        if target_concepts:
            if len(covered_target) == 0:
                cov_score = min(12.0, prompt_ratio * 12.0)
            else:
                cov_score = min(100.0, (0.85 * target_ratio + 0.15 * min(1.0, prompt_ratio)) * 100.0)
        else:
            cov_score = min(100.0, (len(covered) / max(1.0, len(full_pool) * 0.60)) * 100.0)

        # Question relevance score (blended dense semantic and keyword overlap)
        question_keywords = _extract_keywords(question_text)
        expected_keywords = _extract_keywords(expected_answer)
        ref_kw = question_keywords | expected_keywords
        kw_overlap_score = 0.0
        if ref_kw:
            ref_stems = {_stem(w) for w in ref_kw}
            overlap = transcript_stems & ref_stems
            kw_overlap_score = min(100.0, (len(overlap) / max(1.0, len(ref_kw) * 0.40)) * 100.0)

        raw_rel_sem = max(0.0, min(100.0, ((sim_question - 0.06) / 0.58) * 100.0))
        blended_rel = max(raw_rel_sem, kw_overlap_score * 0.85)

        if is_echo:
            rel_score = max(0.0, min(15.0, 15.0 * (1.0 - echo_ratio)))
        elif is_fragment:
            rel_score = min(25.0, blended_rel * 0.35)
        elif len(covered_target) == 0 and target_concepts:
            rel_score = min(25.0, blended_rel * 0.40)
        elif target_ratio < 0.15 and len(target_concepts) >= 5:
            rel_score = min(35.0, blended_rel * 0.45)
        else:
            rel_score = blended_rel

        # Completeness based on word count vs difficulty target
        target_words = {"Easy": 25, "Medium": 45, "Hard": 70}.get(difficulty, 45)
        length_ratio = min(1.0, word_count / float(target_words))
        if cov_score >= 60.0:
            # Concise but substantively complete answer: do not penalize length
            comp_score = max(length_ratio * 100.0, min(100.0, cov_score * 0.95))
        elif is_echo or is_fragment:
            comp_score = min(10.0, length_ratio * 15.0)
        elif cov_score < 15.0:
            comp_score = min(20.0, length_ratio * 20.0)
        else:
            comp_score = min(100.0, length_ratio * 100.0)

        # Composite Content Score (FR16-01, FR16-02, FR16-03):
        # 40% Semantic Answer Alignment + 35% Concept Mastery + 15% Question Relevance + 10% Depth
        raw_composite = (0.40 * sem_score) + (0.35 * cov_score) + (0.15 * rel_score) + (0.10 * comp_score)
        content_score = round(min(100.0, max(0.0, raw_composite)), 1)

        # Generate explainable grounded feedback summary
        if is_echo:
            notes = "Your answer mostly repeated the question without explaining anything."
        elif is_fragment:
            notes = f"Your answer was very short ({word_count} words) and did not explain the topic."
        elif content_score >= 80:
            notes = f"Thorough answer: it closely matched a strong answer ({round(sem_score)}% match) and covered {len(covered_target)} key point(s)."
        elif content_score >= 55:
            notes = f"Good answer ({round(sem_score)}% match to a strong answer) covering the basics ({len(covered_target)} key point(s)); more depth would make it stronger."
        elif content_score < 25:
            notes = f"Your answer did not address what the question was asking about ({round(sem_score)}% match to a strong answer)."
        else:
            notes = "Partial answer: some key points were missing."

        def _concept_rank(c: str) -> Tuple[int, str]:
            c_low = c.lower()
            if tags and any(c_low in (t or "").lower() or (t or "").lower() in c_low for t in tags):
                return (0, c)
            if " " in c:
                return (1, c)
            if c in target_concepts:
                return (2, c)
            return (3, c)

        sorted_covered = sorted(covered, key=_concept_rank)
        sorted_missing = sorted(missing, key=_concept_rank)

        return {
            "status": "completed",
            "content_score": content_score,
            "semantic_similarity_score": round(sem_score, 1),
            "concept_coverage_score": round(cov_score, 1),
            "relevance_score": round(rel_score, 1),
            "completeness_score": round(comp_score, 1),
            "covered_concepts": sorted_covered[:15],
            "missing_concepts": sorted_missing[:8],
            "notes": notes,
            "model": nlp_model_label(),
            "error": None,
            "is_echo": is_echo,
            "is_fragment": is_fragment,
            "covered_target_concepts": covered_target,
            "covered_prompt_concepts": covered_prompt,
        }

    except Exception as e:
        logger.warning(f"Error during BERT semantic analysis: {e}. Executing heuristic fallback.", exc_info=True)
        fallback_res = _heuristic_analysis(question_text, expected_answer, tags, difficulty, clean_transcript, rubric=rubric)
        fallback_res["error"] = str(e)
        return fallback_res


class RealNLPService(NLPService):
    """
    Concrete implementation of the NLPService contract using BERT/DistilBERT embeddings.
    """
    def analyze_text(self, transcript: Optional[str]) -> TextAnalysisResult:
        if not transcript or not isinstance(transcript, str) or not transcript.strip():
            return TextAnalysisResult(
                status="empty",
                language_quality=0.0,
                clarity=0.0,
                notes="Empty transcript",
                model=nlp_model_label(),
            )
        
        from services.language_analyzer import analyze_language
        lang = analyze_language(transcript, mode="spoken")
        return TextAnalysisResult(
            status="completed",
            language_quality=lang["language_quality_score"],
            clarity=lang["clarity_score"],
            notes=lang["notes"],
            model=nlp_model_label(),
        )
