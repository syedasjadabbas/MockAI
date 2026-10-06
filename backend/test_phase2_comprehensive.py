"""
Comprehensive Automated Test Suite for MockAI Phase 2 Implementation.

Covers:
- Phase 2A: Multimodal Fusion, FERPlus Facial Aggregation, Removal of Mock Evaluation
- Phase 2B: Real Mentor Backend & Scheduling
- Phase 2C: Statistics & Aggregations (Candidate & Admin)
"""

import os
import sys
from datetime import datetime, timedelta
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import (
    users_collection,
    interviews_collection,
    mentors_collection,
    appointments_collection,
    admins_collection,
)
from utils.auth import create_access_token, hash_password
from services.multimodal_fusion import fuse_per_question, _facial_to_score
from services.question_evaluator import evaluate_question_response
from services.delivery_analyzer import analyze_delivery
from services.facial_analyzer import FacialAnalyzer
from routes.candidate_mentors import list_mentors, get_mentor, get_mentor_availability, book_appointment, list_my_appointments, get_appointment, cancel_appointment, BookAppointmentRequest
from routes.candidate_interview import get_candidate_statistics
from routes.admin import get_admin_dashboard


def expect(condition, message):
    if not condition:
        print(f"  FAILED: {message}")
        raise AssertionError(message)
    print(f"  PASSED: {message}")


def run_all_tests():
    print("======================================================================")
    print("STARTING COMPREHENSIVE PHASE 2 TEST SUITE")
    print("======================================================================")

    # =========================================================================
    # SECTION 1: PHASE 2A — MULTIMODAL FUSION SCENARIOS A - H
    # =========================================================================
    print("\n--- SECTION 1: MULTIMODAL FUSION SCENARIOS A - H ---")

    def _nlp(score=80.0, status="completed"):
        return {"status": status, "content_score": score, "relevance_score": score, "completeness_score": score}

    def _speech(score=75.0, status="completed", wpm=120.0):
        return {"status": status, "fluency_score": score, "words_per_minute": wpm, "filler_count": 1}

    def _vision(status="completed", dominant="Neutral", composure="Composed & Stable", ratio=1.0):
        return {
            "status": status,
            "face_detected": (status == "completed"),
            "face_presence_ratio": ratio,
            "dominant_expression": dominant,
            "expression_distribution": {"neutral": 80.0, "happiness": 20.0},
            "behavioral_indicators": {"composure_index": composure, "observable_tension": "Low"},
        }

    # Scenario A: Speech + Face (Normal spoken answer)
    res_a = fuse_per_question(_nlp(85.0), _speech(70.0), _vision("completed"))
    expect(res_a["status"] == "completed", "Scenario A: Trimodal status completed")
    expect(abs(res_a["weights_used"]["nlp"] - 0.50) < 0.01, "Scenario A: NLP weight 0.50")
    expect(abs(res_a["weights_used"]["speech"] - 0.30) < 0.01, "Scenario A: Speech weight 0.30")
    expect(abs(res_a["weights_used"]["vision"] - 0.20) < 0.01, "Scenario A: Vision weight 0.20")
    expect(res_a["score"] > 70.0, f"Scenario A: Expected good score, got {res_a['score']}")

    # Scenario B: Silence + Face (CRITICAL FIX: Recorded silent take)
    # Silent answer: NLP=0 (empty), Delivery=0 (empty), Vision=85 (completed)
    nlp_silent = {"status": "empty", "content_score": 0.0}
    speech_silent = {"status": "empty", "fluency_score": 0.0}
    vision_composed = _vision("completed", composure="Composed & Stable")  # score = 85.0
    res_b = fuse_per_question(nlp_silent, speech_silent, vision_composed)
    expect(res_b["status"] == "completed", "Scenario B: Silence + face produces completed fusion")
    expect(res_b["weights_used"]["vision"] <= 0.21, f"Scenario B: Vision weight strictly capped at 20% baseline, got {res_b['weights_used']['vision']}")
    # Score should be: 0*0.5 + 0*0.3 + 85*0.2 = 17.0
    expect(res_b["score"] <= 20.0, f"Scenario B: Silent interview with face composure receives low score (~17%), got {res_b['score']}")
    expect(res_b["score"] > 10.0, f"Scenario B: Vision adjunct contribution preserved (got {res_b['score']})")

    # Scenario C: Speech + No Face
    res_c = fuse_per_question(_nlp(80.0), _speech(70.0), _vision("no_face_detected"))
    expect(res_c["modality_status"]["vision"] == "unavailable", "Scenario C: Vision marked unavailable")
    expect(abs(res_c["weights_used"]["nlp"] - 0.625) < 0.01, "Scenario C: NLP gracefully rescaled (5/8 = 0.625)")
    expect(abs(res_c["weights_used"]["speech"] - 0.375) < 0.01, "Scenario C: Speech gracefully rescaled (3/8 = 0.375)")
    expect(res_c["weights_used"]["vision"] == 0.0, "Scenario C: Vision weight 0.0")

    # Scenario D: Silence + No Face
    res_d = fuse_per_question(nlp_silent, speech_silent, _vision("no_face_detected"))
    expect(res_d["score"] == 0.0, f"Scenario D: Silence + no face yields score 0.0, got {res_d['score']}")

    # Scenario E: Very Short Speech
    eval_short = evaluate_question_response(
        question_id="q_short",
        question_text="Explain polymorphism in object oriented programming.",
        expected_answer="Polymorphism allows objects of different classes to be treated as objects of a common superclass, typically through method overriding or interfaces.",
        transcript="It is many forms.",
        duration_seconds=2.0,
    )
    expect(eval_short["delivery"]["status"] == "completed", "Scenario E: Short speech evaluated by delivery analyzer")
    expect(eval_short["multimodal"]["score"] < 50.0, f"Scenario E: Very short answer receives appropriately low composite score ({eval_short['multimodal']['score']})")

    # Scenario F: Low-quality / corrupt media
    res_f = fuse_per_question(_nlp(75.0), _speech(65.0), {"status": "corrupt_media", "dominant_expression": "Not Observed"})
    expect(res_f["modality_status"]["vision"] == "unavailable", "Scenario F: Corrupt vision gracefully flagged unavailable")
    expect(res_f["score"] > 60.0, "Scenario F: Surviving modalities maintain evaluation")

    # Scenario G: Camera unavailable (Hardware genuine absence)
    res_g = fuse_per_question(_nlp(85.0), _speech(80.0), {"status": "missing"})
    expect(res_g["modality_status"]["vision"] == "unavailable", "Scenario G: Camera hardware absence degrades gracefully")
    expect(res_g["weights_used"]["vision"] == 0.0, "Scenario G: Vision weight 0")

    # Scenario H: Both camera and audio unavailable
    res_h = fuse_per_question(_nlp(90.0), {"status": "missing"}, {"status": "missing"})
    expect(res_h["modality_status"]["vision"] == "unavailable" and res_h["modality_status"]["speech"] == "unavailable", "Scenario H: Audio & vision missing")
    expect(res_h["weights_used"]["nlp"] == 1.0, "Scenario H: NLP gets 1.0 weight")
    expect(res_h["score"] == 90.0, f"Scenario H: Text-only score preserved at 90.0, got {res_h['score']}")

    # =========================================================================
    # SECTION 2: PHASE 2A — FACIAL ANALYSIS AGGREGATION & HONEST REPORTING
    # =========================================================================
    print("\n--- SECTION 2: FACIAL ANALYSIS AGGREGATION & HONEST REPORTING ---")
    fer_service = FacialAnalyzer()

    # Test error / missing inputs return "Not Observed" (never fake "Neutral")
    err_none = fer_service.analyze_video(None)
    expect(err_none["dominant_expression"] == "Not Observed", "Facial: None input returns dominant 'Not Observed'")
    expect(err_none["baseline_expression"] == "Not Observed", "Facial: None input returns baseline 'Not Observed'")
    expect(err_none["behavioral_indicators"]["composure_index"] == "Not Assessed", "Facial: None input composure 'Not Assessed'")

    err_empty = fer_service.analyze_video("nonexistent_path_to_video.webm")
    expect(err_empty["dominant_expression"] == "Not Observed", "Facial: Missing file returns dominant 'Not Observed'")
    expect(err_empty["baseline_expression"] == "Not Observed", "Facial: Missing file returns baseline 'Not Observed'")

    # Test temporal aggregation logic on synthetic frame distributions
    agg_res = fer_service._aggregate_expression_sequence([
        {"neutral": 0.85, "happiness": 0.10, "surprise": 0.05, "sadness": 0.0, "anger": 0.0, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},
        {"neutral": 0.70, "happiness": 0.25, "surprise": 0.05, "sadness": 0.0, "anger": 0.0, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},
        {"neutral": 0.20, "happiness": 0.75, "surprise": 0.05, "sadness": 0.0, "anger": 0.0, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},  # Peak
        {"neutral": 0.80, "happiness": 0.15, "surprise": 0.05, "sadness": 0.0, "anger": 0.0, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},
    ], sampled_timestamps=[0.5, 1.0, 1.5, 2.0])

    expect(agg_res["baseline_expression"] == "Neutral", f"Facial: Baseline expression is Neutral, got {agg_res['baseline_expression']}")
    expect(agg_res["secondary_expression"] == "Happiness", f"Facial: Secondary expression identified as Happiness, got {agg_res['secondary_expression']}")
    expect(agg_res["peak_moment"] is not None, "Facial: Peak expressive moment recorded")
    expect(agg_res["peak_moment"]["expression"] == "Happiness", f"Facial: Peak moment is Happiness, got {agg_res['peak_moment']['expression']}")
    expect(agg_res["peak_moment"]["timestamp_seconds"] == 1.5, f"Facial: Peak timestamp recorded accurately, got {agg_res['peak_moment']['timestamp_seconds']}")

    # Verify 8-class expression probabilities are preserved
    dist = agg_res["expression_distribution"]
    expect(len(dist) == 8, f"Facial: All 8 emotion categories preserved in distribution, got {len(dist)}")
    expect("neutral" in dist and "happiness" in dist and "surprise" in dist and "sadness" in dist, "Facial: Standard FERPlus classes present")
    dist_sum = sum(dist.values())
    expect(abs(dist_sum - 100.0) < 1.0, f"Facial: Expression distribution sums to 100% (got {dist_sum}%)")

    # Verify different expression inputs produce different predictions (does not always collapse to Neutral)
    happy_frames = [
        {"neutral": 0.10, "happiness": 0.80, "surprise": 0.10, "sadness": 0.0, "anger": 0.0, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},
        {"neutral": 0.15, "happiness": 0.75, "surprise": 0.10, "sadness": 0.0, "anger": 0.0, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},
    ]
    agg_happy = fer_service._aggregate_expression_sequence(happy_frames)
    expect(agg_happy["baseline_expression"] == "Happiness", f"Facial: Happy input yields dominant/baseline Happiness (got {agg_happy['baseline_expression']})")

    surprise_frames = [
        {"neutral": 0.10, "happiness": 0.05, "surprise": 0.80, "sadness": 0.05, "anger": 0.0, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},
        {"neutral": 0.15, "happiness": 0.05, "surprise": 0.75, "sadness": 0.05, "anger": 0.0, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},
    ]
    agg_surprise = fer_service._aggregate_expression_sequence(surprise_frames)
    expect(agg_surprise["baseline_expression"] == "Surprise", f"Facial: Surprise input yields dominant/baseline Surprise (got {agg_surprise['baseline_expression']})")

    sadness_frames = [
        {"neutral": 0.10, "happiness": 0.0, "surprise": 0.0, "sadness": 0.85, "anger": 0.05, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},
        {"neutral": 0.15, "happiness": 0.0, "surprise": 0.0, "sadness": 0.80, "anger": 0.05, "disgust": 0.0, "fear": 0.0, "contempt": 0.0},
    ]
    agg_sadness = fer_service._aggregate_expression_sequence(sadness_frames)
    expect(agg_sadness["baseline_expression"] == "Sadness", f"Facial: Sadness input yields dominant/baseline Sadness (got {agg_sadness['baseline_expression']})")

    # Verify face detector and emotion model files exist and session is active
    from services.facial_analyzer import FER_MODEL_PATH, YUNET_MODEL_PATH
    expect(FER_MODEL_PATH.is_file(), "Facial: FERPlus ONNX model file exists on disk")
    expect(YUNET_MODEL_PATH.is_file(), "Facial: YuNet face detection ONNX model file exists on disk")
    expect(fer_service.ort_session is not None, "Facial: FERPlus ONNX inference session is initialized")

    # =========================================================================
    # SECTION 3: PHASE 2A — SPEECH DELIVERY ANALYZER
    # =========================================================================
    print("\n--- SECTION 3: SPEECH DELIVERY ANALYZER ---")

    # Normal spoken transcript
    del_norm = analyze_delivery("In Python, a dictionary is a hash map implementation offering constant time key lookups.", duration_seconds=10.0)
    expect(del_norm["status"] == "completed", "Speech: Normal transcript status completed")
    expect(del_norm["words_per_minute"] > 60.0, f"Speech: WPM calculated ({del_norm['words_per_minute']})")
    expect(del_norm["fluency_score"] > 60.0, f"Speech: Good fluency score ({del_norm['fluency_score']})")

    # Silent response
    del_silent = analyze_delivery("", duration_seconds=10.0)
    expect(del_silent["status"] == "empty", "Speech: Silence results in status 'empty'")
    expect(del_silent["fluency_score"] == 0.0, "Speech: Silence fluency score is 0.0")
    expect(del_silent["word_count"] == 0, "Speech: Silence word count is 0")

    # Fillers counting and detection
    from services.delivery_analyzer import _count_fillers, _analyze_acoustic_pauses
    filler_text = "Um, basically we use, you know, a distributed lock with Redis."
    f_count, f_detected = _count_fillers(filler_text)
    expect(f_count >= 3, f"Speech: Correctly counted fillers (got {f_count})")
    expect("um" in f_detected and "basically" in f_detected, "Speech: Detected specific filler phrases ('um', 'basically')")

    # Acoustic pause calculation on synthetic signal
    import tempfile, scipy.io.wavfile as wavfile, numpy as np
    pause_wav = os.path.join(tempfile.gettempdir(), "test_phase2_pause.wav")
    sr = 16000
    t_seg = np.linspace(0, 1.0, int(sr * 1.0), endpoint=False)
    tone_seg = (0.5 * np.sin(2 * np.pi * 440 * t_seg) * 32767).astype(np.int16)
    silence_seg = np.zeros(int(sr * 1.0), dtype=np.int16)
    full_audio = np.concatenate([tone_seg, silence_seg, tone_seg])
    wavfile.write(pause_wav, sr, full_audio)
    pause_dur, pause_cnt, speech_dur = _analyze_acoustic_pauses(pause_wav)
    expect(pause_dur >= 0.8, f"Speech: Acoustic pause duration detected ({pause_dur}s)")
    expect(pause_cnt >= 1, f"Speech: Acoustic pause count detected ({pause_cnt})")
    if os.path.exists(pause_wav):
        os.unlink(pause_wav)

    # ASR failure handling
    from services.asr_google import GoogleSpeechASRService
    asr_svc = GoogleSpeechASRService()
    asr_fail = asr_svc.transcribe("nonexistent_audio_file.webm")
    expect(asr_fail.status == "failed", "Speech: Nonexistent audio safely triggers status 'failed'")
    expect(asr_fail.transcript is None, "Speech: Failed ASR produces None transcript (no fabrication)")

    # =========================================================================
    # SECTION 4: PHASE 2A — CLIENT MOCK ERADICATION
    # =========================================================================
    print("\n--- SECTION 4: MOCK EVALUATION ERADICATION ---")
    candidate_api_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "candidate", "services", "candidateApi.js"))
    with open(candidate_api_path, "r", encoding="utf-8") as f:
        api_content = f.read()

    expect("generateMockEvaluation" not in api_content, "Mock: generateMockEvaluation completely absent from candidateApi.js")
    expect("STRENGTH_POOL" not in api_content, "Mock: STRENGTH_POOL removed from candidateApi.js")
    expect("WEAKNESS_POOL" not in api_content, "Mock: WEAKNESS_POOL removed from candidateApi.js")
    expect("SUGGESTION_POOL" not in api_content, "Mock: SUGGESTION_POOL removed from candidateApi.js")

    # Verify pending evaluation in DB never fabricates random scores
    from routes.candidate_interview import _public_interview
    pending_doc = {
        "_id": ObjectId(),
        "user_id": "test_user_pending",
        "role": "Frontend Development",
        "status": "Completed",
        "evaluation_status": "pending_evaluation",
        "score": None,
        "confidence": None,
        "stress": None,
        "created_at": datetime.utcnow(),
    }
    pub_pending = _public_interview(pending_doc, include_questions=False)
    expect(pub_pending["score"] is None, "Mock: Pending evaluation score is None")
    expect(pub_pending["confidence"] is None, "Mock: Pending evaluation confidence is None")
    expect(pub_pending["stress"] is None, "Mock: Pending evaluation stress is None")

    # =========================================================================
    # SECTION 5: PHASE 2B — REAL MENTOR BACKEND
    # =========================================================================
    print("\n--- SECTION 5: REAL MENTOR BACKEND ---")

    # Setup test candidate user
    test_user_id = str(ObjectId())
    test_user_id_2 = str(ObjectId())
    token_candidate = {"user_id": test_user_id, "role": "user"}
    token_candidate_2 = {"user_id": test_user_id_2, "role": "user"}

    # 1. List mentors
    mentors_list = list_mentors(search=None, specialization=None, page=1, limit=10, token_payload=token_candidate)
    expect(len(mentors_list) >= 5, f"Mentors: Retrieved {len(mentors_list)} seeded mentors")

    # 2. Filter mentors by specialization
    ml_mentors = list_mentors(search=None, specialization="AI & Machine Learning", page=1, limit=10, token_payload=token_candidate)
    expect(len(ml_mentors) >= 1, "Mentors: Filter by 'AI & Machine Learning' returned mentors")
    expect(any("AI & Machine Learning" in m["specialization"] for m in ml_mentors), "Mentors: Specialization confirmed in returned mentors")

    # 3. Get single mentor by ID
    target_mentor = mentors_list[0]
    target_id = target_mentor["id"]
    mentor_detail = get_mentor(target_id, token_payload=token_candidate)
    expect(mentor_detail["name"] == target_mentor["name"], f"Mentors: Retrieved profile for {mentor_detail['name']}")
    expect(len(mentor_detail["available_slots"]) > 0, "Mentors: Profile has available slots")

    slot_to_book = mentor_detail["available_slots"][0]
    book_date = slot_to_book["date"]
    book_time = slot_to_book["start_time"]

    # 4. Check initial availability
    avail_before = get_mentor_availability(target_id, date=book_date, token_payload=token_candidate)
    matching_slot = next((s for s in avail_before if s["start_time"] == book_time), None)
    expect(matching_slot is not None and not matching_slot["is_booked"], "Mentors: Target slot initially unbooked")

    # 5. Book appointment
    book_req = BookAppointmentRequest(
        mentor_id=target_id,
        slot_id=slot_to_book["id"],
        date=book_date,
        start_time=book_time,
        notes="Reviewing system design for distributed transactions."
    )
    booked_apt = book_appointment(book_req, token_payload=token_candidate)
    expect(booked_apt["status"] == "scheduled", "Mentors: Appointment successfully scheduled")
    expect(booked_apt["candidate_id"] == test_user_id, "Mentors: Appointment has correct candidate ownership")
    apt_id = booked_apt["id"]

    # 6. Verify slot now shows is_booked = True
    avail_after = get_mentor_availability(target_id, date=book_date, token_payload=token_candidate)
    matching_slot_after = next((s for s in avail_after if s["start_time"] == book_time), None)
    expect(matching_slot_after["is_booked"] is True, "Mentors: Target slot now marked is_booked=True")

    # 7. Reject Double-Booking (409 Conflict)
    try:
        book_appointment(book_req, token_payload=token_candidate_2)
        expect(False, "Mentors: Double booking should have been rejected!")
    except Exception as e:
        status_code = getattr(e, "status_code", None)
        expect(status_code == 409, f"Mentors: Double-booking correctly rejected with 409 Conflict (got {status_code})")

    # 8. List candidate appointments (isolation verification)
    cand1_apts = list_my_appointments(token_payload=token_candidate)
    expect(any(a["id"] == apt_id for a in cand1_apts), "Mentors: Candidate 1 sees their booked appointment")

    cand2_apts = list_my_appointments(token_payload=token_candidate_2)
    expect(not any(a["id"] == apt_id for a in cand2_apts), "Mentors: Candidate 2 cannot see Candidate 1's appointment (strict isolation)")

    # 8b. Single appointment lookup & ownership check
    cand1_single = get_appointment(apt_id, token_payload=token_candidate)
    expect(cand1_single["id"] == apt_id, "Mentors: Candidate 1 can fetch single appointment by ID")
    try:
        get_appointment(apt_id, token_payload=token_candidate_2)
        expect(False, "Mentors: Candidate 2 fetching Candidate 1 appointment should be forbidden!")
    except Exception as e:
        status_code = getattr(e, "status_code", None)
        expect(status_code == 403, f"Mentors: Unauthorized appointment lookup rejected with 403 Forbidden (got {status_code})")

    # 9. Cancel appointment ownership protection
    try:
        cancel_appointment(apt_id, token_payload=token_candidate_2)
        expect(False, "Mentors: Unauthorized cancellation should be forbidden!")
    except Exception as e:
        status_code = getattr(e, "status_code", None)
        expect(status_code == 403, f"Mentors: Unauthorized cancel rejected with 403 Forbidden (got {status_code})")

    # 10. Legitimate cancellation
    cancel_res = cancel_appointment(apt_id, token_payload=token_candidate)
    expect(cancel_res["success"] is True, "Mentors: Appointment cancelled successfully")
    expect(cancel_res["appointment"]["status"] == "cancelled", "Mentors: Cancelled status returned")

    # Verify cancellation persisted in MongoDB
    db_apt = appointments_collection.find_one({"_id": ObjectId(apt_id)})
    expect(db_apt["status"] == "cancelled", "Mentors: Status 'cancelled' persisted in MongoDB")
    expect(db_apt["cancelled_at"] is not None, "Mentors: Cancellation timestamp persisted")

    # Verify slot is released after cancellation
    avail_released = get_mentor_availability(target_id, date=book_date, token_payload=token_candidate)
    matching_released = next((s for s in avail_released if s["start_time"] == book_time), None)
    expect(matching_released["is_booked"] is False, "Mentors: Slot released back to available after cancellation")

    # =========================================================================
    # SECTION 6: PHASE 2C — STATISTICS & AGGREGATIONS
    # =========================================================================
    print("\n--- SECTION 6: STATISTICS & AGGREGATIONS ---")

    stat_user_id = f"stat_user_{ObjectId()}"
    stat_token = {"user_id": stat_user_id, "role": "user"}

    # Insert 3 test interviews:
    # 1: Completed with evaluation (Score: 82.0, Confidence: 85.0, Stress: 25.0 / "Low")
    # 2: Completed with evaluation (Score: 74.0, Confidence: 70.0, Stress: 48.0 / "Moderate")
    # 3: In Progress (Should be excluded from completed stats)
    now = datetime.utcnow()
    i1 = {
        "_id": ObjectId(),
        "user_id": stat_user_id,
        "role": "Frontend Development",
        "target_role": "Frontend Development",
        "status": "Completed",
        "evaluation_status": "completed",
        "score": 82.0,
        "confidence": 85.0,
        "stress": "Low",
        "evaluation": {
            "overall_score": 82.0,
            "confidence_score": 85.0,
            "confidence_level": "High",
            "stress_score": 25.0,
            "stress_level": "Low",
            "dimension_scores": {"nlp_score": 84.0, "speech_score": 78.0, "vision_score": 85.0},
        },
        "created_at": now - timedelta(days=2),
    }

    i2 = {
        "_id": ObjectId(),
        "user_id": stat_user_id,
        "role": "Backend & Distributed Systems",
        "target_role": "Backend & Distributed Systems",
        "status": "Completed",
        "evaluation_status": "completed",
        "score": 74.0,
        "confidence": 70.0,
        "stress": "Moderate",
        "evaluation": {
            "overall_score": 74.0,
            "confidence_score": 70.0,
            "confidence_level": "Medium",
            "stress_score": 48.0,
            "stress_level": "Moderate",
            "dimension_scores": {"nlp_score": 76.0, "speech_score": 72.0, "vision_score": 70.0},
        },
        "created_at": now - timedelta(days=1),
    }

    i3 = {
        "_id": ObjectId(),
        "user_id": stat_user_id,
        "role": "AI & Machine Learning",
        "status": "In Progress",
        "evaluation_status": "pending_evaluation",
        "score": None,
        "created_at": now,
    }

    interviews_collection.insert_many([i1, i2, i3])

    # 1. Test Candidate Statistics Endpoint
    c_stats = get_candidate_statistics(token_payload=stat_token)
    expect(c_stats["total_interviews"] == 3, f"Stats: Total interviews is 3 (got {c_stats['total_interviews']})")
    expect(c_stats["completed_interviews"] == 2, f"Stats: Completed evaluated interviews is 2 (got {c_stats['completed_interviews']})")
    expect(c_stats["average_score"] == 78.0, f"Stats: Average score is (82+74)/2 = 78.0 (got {c_stats['average_score']})")
    expect(c_stats["best_score"] == 82.0, f"Stats: Best score is 82.0 (got {c_stats['best_score']})")
    expect(c_stats["dimension_averages"]["content_score"] == 80.0, f"Stats: NLP dimension average is 80.0 (got {c_stats['dimension_averages']['content_score']})")
    expect(c_stats["average_stress"] == 36.5, f"Stats: Numeric stress average is (25+48)/2 = 36.5 (got {c_stats['average_stress']})")
    expect(c_stats["stress_distribution"]["Low"] == 1, "Stats: Low stress count is 1")
    expect(c_stats["stress_distribution"]["Moderate"] == 1, "Stats: Moderate stress count is 1")
    expect(len(c_stats["score_trend"]) == 2, "Stats: Score trend has 2 completed data points")
    expect(len(c_stats["by_category"]) == 2, "Stats: Domain breakdown has 2 distinct categories")

    # 2. Test Admin Dashboard Statistics Aggregation
    admin_token = {"role": "admin", "email": "admin@mockai.com"}
    admin_dash = get_admin_dashboard(token_payload=admin_token)
    expect(isinstance(admin_dash["average_stress"], (int, float)), f"Stats: Admin average_stress is numeric, got {admin_dash['average_stress']}")
    expect(isinstance(admin_dash["average_score"], (int, float)), f"Stats: Admin average_score is numeric, got {admin_dash['average_score']}")
    expect("score_buckets" in admin_dash, "Stats: Admin score_buckets exists")
    expect("status_buckets" in admin_dash, "Stats: Admin status_buckets exists")

    # Cleanup test interviews
    interviews_collection.delete_many({"user_id": stat_user_id})

    print("\n======================================================================")
    print("ALL PHASE 2 COMPREHENSIVE TESTS PASSED SUCCESSFULLY!")
    print("======================================================================")


if __name__ == "__main__":
    run_all_tests()
