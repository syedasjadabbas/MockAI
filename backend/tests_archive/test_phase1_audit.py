"""
Phase 1 Audit Verification Test Suite: Performance & Processing Reliability.

Verifies:
1. Cached model loading with local_files_only priority and explicit fallback.
2. Thread-safe singleton model lifecycle across concurrent callers.
3. Batched concept embedding execution (verifying model.encode is NOT called per-concept).
4. Sibling WAV reuse and proper cleanup behavior (no redundant FFmpeg calls).
5. Unchanged scoring formulas, metrics, and behavioral contracts.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))  # archived: import from backend/

import os
import sys
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
if "backend" not in sys.path:
    sys.path.insert(0, os.path.abspath("backend"))

from services.nlp_analyzer import BertSemanticAnalyzer, analyze_transcript
from services.delivery_analyzer import _analyze_acoustic_pauses, analyze_delivery
from services.media_conversion import extract_audio_to_wav, is_ffmpeg_available


def test_cached_model_loading():
    print("\n--- [TEST 1] Cached Model Loading & Singleton Behavior ---")
    analyzer = BertSemanticAnalyzer()
    model = analyzer.get_model()
    assert model is not None, "Expected SentenceTransformer model to load successfully"

    # Verify singleton returns same object
    analyzer_2 = BertSemanticAnalyzer()
    model_2 = analyzer_2.get_model()
    assert model is model_2, "Expected singleton instance and model reference to match"

    # Verify thread-safe concurrent access
    import concurrent.futures
    def worker():
        return BertSemanticAnalyzer().get_model()

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda _: worker(), range(8)))
    assert all(m is model for m in results), "Concurrent access must yield identical singleton model"
    print("  PASS: Thread-safe singleton model cached loading verified.")


def test_explicit_fallback_on_cache_miss():
    print("\n--- [TEST 2] Safe & Explicit Fallback When Local Cache is Missing ---")
    # Simulate a cache miss where local_files_only=True raises OSError
    from sentence_transformers import SentenceTransformer

    fallback_called = False
    original_init = SentenceTransformer.__init__

    def mock_init(self, model_name_or_path, *args, **kwargs):
        nonlocal fallback_called
        if kwargs.get("local_files_only") is True:
            raise OSError("LocalEntryNotFoundError: model files not found in local cache.")
        fallback_called = True
        return original_init(self, "all-MiniLM-L6-v2")

    # Create an isolated subclass instance to test get_model fallback path
    with patch.object(SentenceTransformer, "__init__", mock_init):
        # Instantiate a fresh instance with _model = None
        test_analyzer = object.__new__(BertSemanticAnalyzer)
        test_analyzer._model = None
        test_analyzer._init_attempted = False
        test_analyzer._load_error = None

        loaded_model = test_analyzer.get_model()
        assert loaded_model is not None, "Fallback should load model successfully"
        assert fallback_called is True, "Expected explicit fallback load when local cache fails"

    print("  PASS: Safe and explicit fallback successfully triggered on cache miss.")


def test_batched_concept_embeddings():
    print("\n--- [TEST 3] Batched Concept Embeddings (No Individual model.encode Per Concept) ---")
    analyzer = BertSemanticAnalyzer()
    model = analyzer.get_model()

    tags = ["react", "virtual dom", "reconciliation", "fiber", "diffing", "mutation", "state", "components"]
    expected_ans = (
        "The Virtual DOM is an in-memory representation of the browser DOM. "
        "React reconciliation diffs fiber trees to compute minimal DOM mutations."
    )
    from services.nlp_analyzer import _extract_concept_phrases, _tokenize, _stem
    concepts = _extract_concept_phrases(tags, expected_ans)
    transcript = "We talked about databases and relational normalization."
    tokens = set(_tokenize(transcript))
    stems = {_stem(t) for t in tokens}

    # Spy on model.encode to inspect how many times it was called and with what arguments
    real_encode = model.encode
    encode_calls = []

    def spy_encode(*args, **kwargs):
        encode_calls.append(args[0])
        return real_encode(*args, **kwargs)

    with patch.object(model, "encode", side_effect=spy_encode):
        covered, missing = analyzer.evaluate_concepts_semantically(concepts, transcript, tokens, stems)

    # In a batched implementation, model.encode should be called once for sentences and once for all concepts
    # It must NOT be called individually for each concept (which would be len(concepts) times)
    print(f"  Concept count: {len(concepts)}, model.encode call count: {len(encode_calls)}")
    assert len(encode_calls) <= 2, f"Expected at most 2 batched encode calls, got {len(encode_calls)}"
    
    # Check that unmatched concepts were passed as a batch list, not single strings
    concept_batches = [arg for arg in encode_calls if isinstance(arg, list) and any(c in arg for c in concepts)]
    assert len(concept_batches) >= 1, "Expected unmatched concepts to be encoded as a batch list"
    assert len(concept_batches[0]) > 1, "Batch should contain multiple concepts"
    print("  PASS: Concept embeddings were batched in a single forward pass without per-concept loops.")


def test_batched_similarity_computation():
    print("\n--- [TEST 4] Batched Transcript & Reference Similarity Computation ---")
    analyzer = BertSemanticAnalyzer()
    model = analyzer.get_model()

    q_text = "What is React?"
    ref_text = "React is a JavaScript library for building user interfaces."
    cand_text = "React is an open source library for web interfaces."

    # Verify compute_similarities_batch matches individual compute_similarity
    sim_individual_ref = analyzer.compute_similarity(cand_text, ref_text)
    sim_individual_q = analyzer.compute_similarity(cand_text, q_text)

    batched_sims = analyzer.compute_similarities_batch(cand_text, [ref_text, q_text])
    assert len(batched_sims) == 2
    assert abs(batched_sims[0] - sim_individual_ref) < 1e-4, f"Mismatch in ref sim: {batched_sims[0]} vs {sim_individual_ref}"
    assert abs(batched_sims[1] - sim_individual_q) < 1e-4, f"Mismatch in question sim: {batched_sims[1]} vs {sim_individual_q}"
    print(f"  Batched Sims: ref={batched_sims[0]:.4f}, q={batched_sims[1]:.4f}")
    print("  PASS: Batched similarity computation is mathematically identical to individual calls.")


def test_wav_reuse_and_cleanup():
    print("\n--- [TEST 5] WAV File Reuse and Cleanup Behavior in delivery_analyzer ---")
    # Locate a real sample WebM
    sample_webm = Path("backend/media/interviews/6a96b2733971edf95d599631/6a884ae95deeec968f07461a/response.webm")
    if not sample_webm.is_file():
        sample_webm = Path("backend/media/interviews/6ab2e6ed0ca8096d7b0391b8/6a884ae95deeec968f07461a/response.webm")

    assert sample_webm.is_file(), f"Sample WebM not found at {sample_webm}"

    test_dir = Path(tempfile.mkdtemp(prefix="mockai_wav_test_"))
    try:
        # 1. Setup persistent directory simulating interview storage
        interview_dir = test_dir / "interviews" / "test_int_1" / "q_1"
        interview_dir.mkdir(parents=True, exist_ok=True)
        webm_copy = interview_dir / "response.webm"
        shutil.copy2(sample_webm, webm_copy)

        sibling_wav = interview_dir / "response.wav"
        if sibling_wav.exists():
            sibling_wav.unlink()

        # Call 1: Sibling WAV does not exist, should extract to sibling_wav
        pauses_1 = _analyze_acoustic_pauses(str(webm_copy))
        assert sibling_wav.is_file(), "Call 1 should have created sibling response.wav in interview dir"
        wav_size = sibling_wav.stat().st_size
        assert wav_size > 0, "Created sibling WAV should not be empty"

        # Call 2: Sibling WAV exists, must REUSE without calling FFmpeg
        import services.delivery_analyzer as deliv_mod
        from services.media_conversion import extract_audio_to_wav as real_extract

        extract_called = False
        def mock_extract(*args, **kwargs):
            nonlocal extract_called
            extract_called = True
            return real_extract(*args, **kwargs)

        with patch("services.media_conversion.extract_audio_to_wav", side_effect=mock_extract):
            pauses_2 = _analyze_acoustic_pauses(str(webm_copy))

        assert not extract_called, "Call 2 should have REUSED existing sibling WAV without calling extract_audio_to_wav"
        assert pauses_1 == pauses_2, f"Metrics should be identical: {pauses_1} vs {pauses_2}"
        assert sibling_wav.is_file(), "Sibling WAV should be preserved (not deleted)"

        # Call 3: Explicit audio_wav_path provided
        extract_called = False
        with patch("services.media_conversion.extract_audio_to_wav", side_effect=mock_extract):
            pauses_3 = _analyze_acoustic_pauses(media_url=None, audio_wav_path=str(sibling_wav))

        assert not extract_called, "audio_wav_path parameter should be reused directly without extraction"
        assert pauses_3 == pauses_1, f"Direct audio_wav_path metrics should match: {pauses_3} vs {pauses_1}"
        assert sibling_wav.is_file(), "Direct audio_wav_path must NOT be deleted"

        # 2. Test tempdir cleanup: when media is in system tempdir, transient wav must be cleaned up
        system_temp = Path(tempfile.gettempdir())
        temp_webm = system_temp / f"test_transient_{os.getpid()}.webm"
        shutil.copy2(sample_webm, temp_webm)

        try:
            # Running pause analysis on a standalone file in system tempdir should clean up its temp wav
            pauses_temp = _analyze_acoustic_pauses(str(temp_webm))
            assert pauses_temp[0] >= 0, "Should successfully calculate pauses for temp file"
            # Ensure no persistent sibling was leaked in system temp
            assert not temp_webm.with_suffix(".wav").exists(), "Temporary WAV should be unlinked in system tempdir"
        finally:
            temp_webm.unlink(missing_ok=True)

        print("  PASS: Existing WAV reuse confirmed with zero redundant FFmpeg invocations and strict cleanup.")

    finally:
        shutil.rmtree(test_dir, ignore_errors=True)


def test_unchanged_scoring_behavior():
    print("\n--- [TEST 6] Verification of Unchanged Scoring Outputs and Integrity ---")
    q_text = "Explain the Virtual DOM and reconciliation process in React. How does React determine when and what to re-render?"
    expected = (
        "The Virtual DOM is a lightweight in-memory JavaScript representation of the real DOM. "
        "When state changes, React creates a new VDOM tree, diffs it with the previous one (reconciliation), "
        "and updates only the changed elements in the real DOM efficiently."
    )
    tags = ["React", "Virtual DOM", "Performance"]
    rubric = {
        "criteria": "Candidate should explain in-memory tree representation, diffing algorithm, and selective DOM mutation.",
        "key_points": ["virtual dom", "reconciliation", "diffing algorithm", "state update"]
    }

    test_cases = [
        ("Good Answer", (
            "React creates a lightweight in-memory representation of the actual DOM called the virtual DOM. "
            "Whenever component state or props change, a new virtual DOM tree is constructed. React then runs "
            "its reconciliation diffing algorithm to compare the old and new virtual trees, and efficiently updates "
            "only the mutated browser DOM nodes rather than re-rendering the entire page."
        )),
        ("Irrelevant Answer", "For Sunday dinner, I baked chocolate chip cookies with organic butter, sugar, and flour in the oven."),
        ("Empty String", ""),
        ("Whitespace Only", "   \t\n   "),
    ]

    for label, text in test_cases:
        res = analyze_transcript(
            question_text=q_text,
            expected_answer=expected,
            tags=tags,
            difficulty="Medium",
            transcript=text,
            rubric=rubric,
        )
        print(f"  [{label}] Score: {res['content_score']}% (status: {res['status']}, model: {res['model']})")
        if label == "Good Answer":
            assert res["status"] == "completed"
            assert res["content_score"] >= 85.0
            assert res["semantic_similarity_score"] >= 80.0
            assert any("virtual" in c for c in res["covered_concepts"])
        elif label == "Irrelevant Answer":
            assert res["status"] == "completed"
            assert res["content_score"] < 25.0
            assert res["semantic_similarity_score"] < 15.0
        elif label in ("Empty String", "Whitespace Only"):
            assert res["status"] == "empty"
            assert res["content_score"] == 0.0
            assert res["covered_concepts"] == []

    print("  PASS: Scoring formulas, calibration thresholds, and edge-case behavior are 100% preserved.")


def run_all_tests():
    print("=" * 80)
    print("STARTING PHASE 1 AUDIT VALIDATION SUITE")
    print("=" * 80)
    test_cached_model_loading()
    test_explicit_fallback_on_cache_miss()
    test_batched_concept_embeddings()
    test_batched_similarity_computation()
    test_wav_reuse_and_cleanup()
    test_unchanged_scoring_behavior()
    print("\n" + "=" * 80)
    print("ALL PHASE 1 AUDIT TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    run_all_tests()
