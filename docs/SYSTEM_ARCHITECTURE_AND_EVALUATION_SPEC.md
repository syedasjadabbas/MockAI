# MockAI — System Architecture & AI Evaluation Specification

**Document Version:** 2.0 (Final FYP Verification & Deployment Release)  
**Academic Degree:** Bachelor of Science in Computer Science (BS CS)  
**Institution:** COMSATS University Islamabad, Lahore Campus  
**Project:** MockAI — AI-Powered Career Interview Coach  
**Project Team:**
- Syed Muhammad Asjad Abbas Zaidi (Software Architecture & Systems Integration)
- Syed Hassan Ali Kazmi (Artificial Intelligence & Machine Learning)

---

## Executive Summary

MockAI is an enterprise-grade multimodal artificial intelligence platform engineered to simulate realistic technical and behavioral job interviews. The system captures candidate interview responses across three core communication modalities—**Natural Language (NLP)**, **Speech Delivery (Acoustic)**, and **Facial Behavior (Computer Vision)**—and synthesizes these signals into an explainable, difficulty-weighted performance evaluation.

This specification provides the definitive architectural, algorithmic, and mathematical reference for the final implemented MockAI system as verified in the Final Year Project (FYP) evaluation.

---

## 1. System Architecture

The MockAI architecture adopts a modular, decoupled tier structure comprising a modern single-page application (SPA), an asynchronous RESTful backend API gateway, dedicated machine learning inference pipelines, a background evaluation worker, and a secure document datastore.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (SPA)                              │
│  React 18 • Vite • Tailwind CSS • React Router 6 • Chart.js • Lucide Icons │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WSS / REST
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY (FASTAPI)                            │
│  FastAPI (Python 3.11) • Uvicorn ASGI • CORS • OAuth2 / JWT Auth Middleware │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  Candidate Routes                    │  Admin Routes                        │
│  - /candidate/register, /login, /me  │  - /admin/login, /admin/me           │
│  - /candidate/interviews (CRUD)      │  - /admin/interviews (Audit Dossiers)│
│  - /candidate/mentors (Appointments) │  - /admin/question-bank (CRUD)       │
│  - /candidate/stats (Analytics)      │  - /admin/stats & /admin/logs        │
└──────────────────┬───────────────────┴───────────────────┬──────────────────┘
                   │                                       │
                   ▼                                       ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────┐
│      PERSISTENCE LAYER (MONGODB)     │  │       MEDIA STORAGE SUBSYSTEM    │
│  MongoDB Atlas Replica Set           │  │  - Local Chunk Buffer /uploads   │
│  - users, admins, interviews         │  │  - Normalized Media /media       │
│  - categories, questions, otps       │  │  - LocalFilesystemMediaStorage   │
│  - mentors, appointments, admin_logs │  │  - FFmpeg Transcoding Pipeline   │
└──────────────────────────────────────┘  └──────────────────────────────────┘
                   │                                       │
                   └───────────────────┬───────────────────┘
                                       │ Asynchronous Task Hand-off
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BACKGROUND EVALUATION WORKER                           │
│  services/evaluation_worker.py • Non-blocking Process Inference             │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Audio/Video Normalization Engine (FFmpeg Subprocess)                    │
│  2. Automatic Speech Recognition Service (Google Cloud Speech ASR)          │
│  3. Semantic NLP & Rubric Matcher (DistilBERT / all-MiniLM-L6-v2)           │
│  4. Speech Delivery & Pacing Analyzer (Librosa / Soundfile / Heuristic NLP) │
│  5. Facial Emotion & Composure Engine (OpenCV YuNet + Emotion-FERPlus ONNX) │
│  6. Late Multimodal Fusion Engine (Verbal Primacy & Proportional Fallback)  │
│  7. Difficulty-Weighted Aggregate Evaluator (FR20 / FR21)                   │
│  8. Dual Confidence & Stress Synthesizer (FR22 / FR23)                      │
│  9. Explainable Insights & STAR Coaching Engine (FR24 – FR27)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete End-to-End AI Evaluation Pipeline

When a candidate completes an interview session, the asynchronous evaluation pipeline executes the following deterministic stages:

```
[Candidate Media Take: WebM Format]
                │
                ▼
  [FFmpeg Normalization Engine]
  ├── Standardizes Video: H.264 / 30fps / Indexed MP4
  └── Extracts Audio: 16-bit PCM / 16kHz / Mono WAV
                │
     ┌──────────┴──────────────────────────────────────┐
     │                                                 │
     ▼                                                 ▼
[Google Cloud Speech ASR]                    [OpenCV YuNet Face Detector]
- Transcribes Spoken Response                - Scans Sampled Video Frames (1-2 FPS)
- Word Timestamps & Confidence               - Detects Bounding Boxes & Facial Landmarks
- Silence / Noise Detection                            │
     │                                                 ▼
     ├───────────────────────┐               [Emotion-FERPlus ONNX Classifier]
     ▼                       ▼               - 64x64 Grayscale Aligned Crops
[DistilBERT NLP Engine]  [Speech Delivery]   - 8-Class Emotion Distribution
- Dense 384d Embeddings  - Speaking Rate WPM - Baseline vs. Secondary Mood
- Cosine Rubric Sim      - Acoustic Pauses   - Peak Expressive Timestamp
- Concept Overlap Match  - Fillers ("um")    - Composure Index & Tension Rating
     │                       │                         │
     └───────────────────────┼─────────────────────────┘
                             ▼
            [Late Multimodal Fusion Engine]
            - Base Weights: 50% NLP / 30% Speech / 20% Vision
            - Verbal Primacy Rule: Silence caps Vision at 20% max
            - Hardware Absence: Proportional verbal rescaling
                             │
                             ▼
            [Difficulty-Weighted Scoring]
            - Multipliers: Easy (1.0x), Med (1.25x), Hard (1.5x)
            - Multi-Question Aggregation
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
[Confidence & Stress Synthesizer]   [Explainable Insights Engine]
- Acoustic + Visual Synthesis       - Mathematical Rationale
- Confidence Level (High/Mod/Low)   - Strengths (Rubric, Fluency)
- Stress Level (Low/Mod/Elevated)   - Weaknesses (Missing Concepts)
                                    - Personalized STAR Coaching
                                              │
                                              ▼
                              [MongoDB ACID Persistence & Dossier]
```

---

## 3. Subsystem Specifications

### 3.1 Automatic Speech Recognition (ASR)
- **Module:** `backend/services/asr_google.py` (Implements FR15)
- **Provider:** Google Cloud Speech-to-Text API via Python `SpeechRecognition` library.
- **Input:** 16-bit linear PCM WAV, 16kHz sampling rate, mono channel.
- **Output Schema:**
  - `transcript`: Verbatim candidate speech string.
  - `status`: `"completed"` | `"empty"` | `"failed"`
  - `provider`: `"google_speech_v2"`
- **Integrity Guarantee:** If audio is completely silent or below signal threshold, status is explicitly marked `"empty"` with `transcript: None`. The system never fabricates hallucinated speech.

### 3.2 Semantic NLP & Content Analysis
- **Module:** `backend/services/nlp_analyzer.py` (Implements FR16)
- **Architecture:** Transformer Sentence Embeddings (`sentence-transformers/all-MiniLM-L6-v2`, DistilBERT family).
- **Rubric Matcher:** Evaluates candidate transcript against predefined domain answers and essential concept keywords.
- **Scoring Formulation:**
  $$\text{Content Score} = \text{round}\Big(0.40 \times \text{Semantic Alignment} + 0.35 \times \text{Concept Mastery} + 0.15 \times \text{Question Relevance} + 0.10 \times \text{Answer Depth}, 1\Big)$$
  where:
  - **Semantic Alignment** ($\text{sem\_score}$): Calibrated dense cosine similarity between candidate transcript and reference rubric criteria ($\frac{\text{sim} - 0.10}{0.70} \times 100$).
  - **Concept Mastery** ($\text{cov\_score}$): Ratio of core domain concepts identified either lexically or via embedding similarity ($\ge 0.48$).
  - **Question Relevance** ($\text{rel\_score}$): Dense semantic similarity between transcript and prompt text ($\frac{\text{sim} - 0.05}{0.65} \times 100$).
  - **Answer Depth** ($\text{comp\_score}$): Word volume evaluated against difficulty target lengths (Easy: 25 words, Medium: 45 words, Hard: 70 words).
- **Output:** `content_score` (0–100), `covered_concepts` (list), `missing_concepts` (list), `evaluation_notes`.

### 3.3 Speech Delivery & Fluency Analysis
- **Module:** `backend/services/delivery_analyzer.py`
- **Acoustic Features Extracted:**
  - **Words Per Minute (WPM):** $\text{WPM} = \frac{\text{Word Count}}{\text{Duration (seconds)}} \times 60.0$
    - Optimal Cadence: $110.0 \le \text{WPM} \le 165.0$
    - Deliberate Cadence: $80.0 \le \text{WPM} < 110.0$
    - Slow Cadence: $0.0 < \text{WPM} < 80.0$
    - Fast Cadence: $165.0 < \text{WPM} \le 195.0$
    - Rushed Cadence: $\text{WPM} > 195.0$ (or unpaced erratic speech)
  - **Acoustic Pauses:** Calculated using root-mean-square (RMS) energy thresholding; logs pause frequency and total pause seconds.
  - **Filler Word Detection:** Scans transcripts against lexical filler patterns (`"um"`, `"uh"`, `"like"`, `"basically"`, `"actually"`, `"you know"`).
  - **Fluency Score:** Derived by scoring pacing alignment (up to 40 pts), filler hesitation control (up to 35 pts), pause control (up to 15 pts), and articulation flow (up to 10 pts).

### 3.4 Facial Expression & Behavioral Analysis
- **Module:** `backend/services/facial_analyzer.py` (Implements FR17)
- **Face Localization:** OpenCV YuNet ONNX (`face_detection_yunet_2023mar.onnx`) detects faces, confidence scores, and 5 facial landmarks across sampled frames.
- **Emotion Classification:** Emotion-FERPlus ONNX (`ferplus_model.onnx`) processes 64x64 aligned grayscale face crops.
- **Classes Evaluated:** 8 categorical emotions: *Neutral, Happiness, Surprise, Sadness, Anger, Disgust, Fear, Contempt*.
- **Temporal Aggregation (Implementation Enhancement):**
  - **Baseline Expression:** The prevailing emotional state maintained over the majority of the take duration (e.g., Neutral: 76.5%).
  - **Secondary Expression:** The most prominent secondary emotion observed during the session (e.g., Happiness: 18.2%).
  - **Peak Expressive Moment:** The precise frame timestamp exhibiting the highest non-neutral probability spike (e.g., Happiness at 1.5s).
  - **Composure Index:** Categorized as `"Composed & Stable"`, `"Moderate Composure"`, or `"Fluctuating Composure"`.
  - **Observable Tension:** Assessed as `"Low"`, `"Moderate"`, or `"Elevated"`.
  - **Honest Absence State:** If video hardware is missing or no face is detected, returns `dominant_expression: "Not Observed"` and `composure_index: "Not Assessed"`.

---

## 4. Multimodal Late Fusion & Scoring Rules

### 4.1 Base Trimodal Late Fusion (FR18 / FR19)
When all three modalities (NLP, Speech, Vision) are available and valid:
$$\text{Question Score} = \Big(0.50 \times \text{NLP Score}\Big) + \Big(0.30 \times \text{Speech Score}\Big) + \Big(0.20 \times \text{Vision Score}\Big)$$

| Modality | Contribution | Role & Rationale |
| :--- | :---: | :--- |
| **NLP / Content** | **50%** | **Primary:** Verifies what candidate answered against technical rubrics. |
| **Speech / Delivery** | **30%** | **Secondary:** Evaluates how clearly, fluently, and briskly they spoke. |
| **Vision / Facial** | **20%** | **Adjunct:** Measures non-verbal poise, facial composure, and engagement. |

### 4.2 Verbal-Primacy & Silent-Response Safeguard (Phase 2 Enhancement)
- **Academic Rationale:** In an authentic job interview, looking composed while saying nothing must never be rewarded with a passing score.
- **Implementation Rule:** If video and audio were successfully recorded, but the candidate produced no verbal response (word count = 0, empty transcript):
  - $\text{NLP Score} = 0.0$
  - $\text{Speech Score} = 0.0$
  - $\text{Vision Weight} = 0.20$ (Strictly capped at baseline 20%; verbal weights are **never** redistributed to Vision).
- **Mathematical Bound:** A silent candidate displaying perfect composure (85.0% score) receives:
  $$\text{Final Score} = (0 \times 0.50) + (0 \times 0.30) + (85.0 \times 0.20) = \mathbf{17.0\%}$$
  Score inflation on silent answers is strictly eliminated.

### 4.3 Graceful Degradation Matrix (Missing Hardware)
When hardware is legitimately absent or unmounted:

| Modalities Present | NLP Weight ($w_{\text{nlp}}$) | Speech Weight ($w_{\text{speech}}$) | Vision Weight ($w_{\text{vision}}$) | Mathematical Formulation |
| :--- | :---: | :---: | :---: | :--- |
| **Trimodal (Full)** | `0.5000` (50.0%) | `0.3000` (30.0%) | `0.2000` (20.0%) | Base trimodal formula |
| **No Camera (Audio Only)** | `0.6250` (62.5%) | `0.3750` (37.5%) | `0.0000` (0.0%) | $\frac{0.50}{0.80} \text{ NLP} + \frac{0.30}{0.80} \text{ Speech}$ |
| **Text Only (Typed Answer)** | `1.0000` (100.0%) | `0.0000` (0.0%) | `0.0000` (0.0%) | Pure semantic rubric scoring |
| **Text + Video (Camera On)** | `0.7143` (71.4%) | `0.0000` (0.0%) | `0.2857` (28.6%) | $\frac{0.50}{0.70} \text{ NLP} + \frac{0.20}{0.70} \text{ Vision}$ |
| **Speech Delivery + Video** | `0.0000` (0.0%) | `0.6000` (60.0%) | `0.4000` (40.0%) | $\frac{0.30}{0.50} \text{ Speech} + \frac{0.20}{0.50} \text{ Vision}$ |
| **Speech Delivery Only** | `0.0000` (0.0%) | `1.0000` (100.0%) | `0.0000` (0.0%) | Pure acoustic pacing evaluation |
| **No Modalities Available** | `0.0000` | `0.0000` | `0.0000` | Fused score = `0.0`, status = `"unavailable"` |

### 4.4 Difficulty-Weighted Interview Aggregation (FR20 / FR21)
- **Question Difficulty Multipliers:**
  - Easy: $\mathbf{1.0\times}$
  - Medium: $\mathbf{1.25\times}$
  - Hard: $\mathbf{1.5\times}$
- **Formula:**
  $$\text{Overall Performance Score} = \text{round}\left( \frac{\sum_{i=1}^{N} \Big(\text{DifficultyWeight}_i \times \text{QuestionScore}_i\Big)}{\sum_{i=1}^{N} \text{DifficultyWeight}_i}, 1 \right)$$
- **Omission Penalty:** Unanswered, skipped, or failed questions receive a score of `0.0` while their full difficulty multiplier remains in the denominator.

---

## 5. Confidence, Stress, & Insights Synthesis

### 5.1 Dual-Modality Confidence Score (FR22)
Combines acoustic stability and visual poise:
$$\text{Confidence Score} = \Big(0.60 \times \text{Speech Confidence}\Big) + \Big(0.40 \times \text{Visual Confidence}\Big)$$
- High: $\ge 80.0$ | Moderate: $60.0 - 79.9$ | Developing: $40.0 - 59.9$ | Low: $< 40.0$

### 5.2 Dual-Modality Stress Level (FR23)
Evaluates speech hesitation, pause frequency, facial tension, and negative emotion spikes:
$$\text{Stress Score} = \Big(0.50 \times \text{Speech Stress}\Big) + \Big(0.50 \times \text{Visual Stress}\Big)$$
- Low: $< 35.0$ | Moderate: $35.0 - 64.9$ | Elevated: $\ge 65.0$

### 5.3 Explainable Coaching Engine (FR24 – FR27)
- **Mathematical Rationale (FR24):** Details exactly how modality scores and difficulty weights yielded the final score.
- **Strengths (FR25):** Highlights master concepts covered, steady pacing, and stable composure.
- **Weaknesses (FR26):** Pinpoints omitted technical rubric areas, high filler word rates, or nervous pauses.
- **Actionable Guidance (FR27):** Recommends specific technical topics and structure coaching using the **STAR Method** (Situation, Task, Action, Result).

---

## 6. Database Architecture & Indexing

The platform uses MongoDB Atlas with strict schema isolation across 9 core collections:

| Collection Name | Document Responsibility | Key Compound Indexes |
| :--- | :--- | :--- |
| `users` | Candidate profiles, hashed credentials, Google auth IDs. | `email` (unique), `role`, `created_at` |
| `admins` | Administrative accounts and elevated privileges. | `email` (unique) |
| `interviews` | Session state, questions, responses, transcripts, evaluations. | `user_id`, `status`, `created_at`, `(status, created_at)` |
| `categories` | Technical domains (Frontend, Backend, AI/ML, Cloud). | `name`, `status`, `created_at` |
| `questions` | Curated question bank, difficulty levels, rubric keywords. | `category_id`, `difficulty`, `status` |
| `otps` | Cryptographic SHA-256 hashes for registration and password reset. | `email`, `created_at` |
| `admin_logs` | Immutable audit trail for administrative changes. | `created_at` (-1), `admin_email` |
| `mentors` | Industry mentor profiles, specializations, hourly rates, slots. | `specialization`, `name`, `is_active` |
| `appointments` | Scheduled candidate-mentor mentorship sessions. | `(mentor_id, date, start_time, status)`, `(candidate_id, date, start_time, status)` |

### Double-Booking Prevention & Tenant Isolation
- **Index:** `appointments.create_index([("mentor_id", 1), ("date", 1), ("start_time", 1), ("status", 1)])`
- **Concurrency Protection:** The booking endpoint checks active slot availability atomically and returns `409 Conflict` if the slot is occupied.
- **Candidate Isolation:** Appointments and interviews enforce strict owner matching (`candidate_id == user["user_id"]`), returning `404 Not Found` or `403 Forbidden` on unauthorized cross-tenant requests.

---

## 7. Role-Based Access Control (RBAC) & Security

1. **JSON Web Tokens (JWT):** Signed using HMAC-SHA256 (`HS256`) with a 24-hour expiration.
2. **Cryptographic Separation:**
   - Candidate routes enforce `verify_candidate` (`payload["role"] == "user"`).
   - Admin routes enforce `verify_admin` (`payload["role"] == "admin"`).
   - Neither role can authenticate against the other's endpoints.
3. **Password Security:** Salted bcrypt hashing (`cost factor: 12`) applied via Passlib and direct `bcrypt` fallback. Plaintext passwords are never logged or stored.
4. **Google Sign-In Protection:** Verifies Google ID token cryptographic signatures directly against Google's public key certs (`google.oauth2.id_token.verify_oauth2_token`). Forged tokens are rejected with HTTP 401.

---

## 8. Mentor Scheduling Subsystem (Implementation Enhancement)

To bridge the gap between AI practice and real-world industry feedback, MockAI includes a complete mentorship scheduling platform:
- **Mentor Profiles:** Seeded with 5 industry engineering leaders covering Frontend, Backend, AI/ML, DevOps, and Data Science.
- **Interactive Booking:** Candidates browse bios, ratings, and real-time available time slots.
- **Appointment Management:** Candidates can view upcoming sessions, access individual booking dossiers, and cancel reservations (which automatically frees the slot back to the mentor's calendar).

---

## 9. Platform Analytics

- **Candidate Analytics (`GET /candidate/stats`):** Computes individual historical interview volume, completion rates, overall score trajectory, dimension averages (Technical, Communication, Behavioral), numeric average stress, and category performance breakdown.
- **Admin Analytics (`GET /admin/stats`):** Computes global system-wide aggregates: total candidates registered, total interviews conducted, platform average score, average stress, score distribution buckets (0–49, 50–69, 70–84, 85–100), and interview status distribution.

---

## 10. Verification & Test Evidence

The MockAI platform has undergone exhaustive verification across 12 primary regression, compliance, and acceptance test suites (out of 23 automated test modules in `backend/`) with **100% pass rates**:

| Test Suite File | Scope of Verification | Pass Rate |
| :--- | :--- | :---: |
| `test_final_compliance_gate.py` | Full FYP Specification (FR01–FR36, 108 Sub-requirements) | **100% (PASS)** |
| `test_system_integration_fr30_fr36.py` | Integration across FR30–FR36 (Interviews, History, Admin, RBAC) | **100% (PASS)** |
| `test_phase2_comprehensive.py` | Scenarios A–H, Temporal aggregation, Mentors backend, Stats | **100% (PASS)** |
| `test_multimodal_fusion.py` | Late fusion weights (50/30/20), Verbal primacy, Graceful degradation | **100% (PASS)** |
| `test_facial_analysis.py` | YuNet face localization & Emotion-FERPlus ONNX inference | **100% (PASS)** |
| `test_speech_delivery.py` | Speaking rate WPM, silence detection, pause duration, fillers | **100% (PASS)** |
| `test_nlp_semantic.py` | DistilBERT embeddings, cosine similarity, concept coverage | **100% (PASS)** |
| `test_confidence_stress.py` | Acoustic + visual confidence and stress categorization | **100% (PASS)** |
| `test_insights_service.py` | Rationale generation, prioritized strengths, weaknesses, STAR tips | **100% (PASS)** |
| `test_aggregate_evaluation.py` | Difficulty multipliers (1.0x, 1.25x, 1.5x), whole-interview sum | **100% (PASS)** |
| `test_summary_visuals.py` | Visual radar datasets, dimension scores, chart payload contracts | **100% (PASS)** |
| `test_final_production_acceptance.py` | Live production gate against Render Cloud & MongoDB Atlas (35 checks)| **100% (PASS)** |

---

## 11. Production Deployment Requirements

1. **Host Environment:** Linux (Ubuntu 22.04 LTS / Debian 12) or Docker container.
2. **Runtimes:** Python 3.11+, Node.js 18+ LTS.
3. **External Utilities:** System **FFmpeg** (`ffmpeg` and `ffprobe`) installed and available in `$PATH`.
4. **Database:** MongoDB 6.0+ cluster (MongoDB Atlas recommended with SRV DNS resolution).
5. **Environment Configuration (`.env`):**
   ```bash
   SECRET_KEY=your_secure_256bit_jwt_secret
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net
   DATABASE_NAME=mockai
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/google_service_account.json
   ALLOWED_ORIGINS=https://mockai-frontend.onrender.com
   FRONTEND_URL=https://mockai-frontend.onrender.com
   ```
6. **ONNX Machine Learning Models:**
   - `backend/models/face_detection_yunet_2023mar.onnx` (YuNet Face Detector)
   - `backend/models/ferplus_model.onnx` (Emotion-FERPlus Classifier)
7. **Production Build Command:**
   - Frontend: `npm run build` (outputs optimized bundle to `frontend/dist/`)
   - Backend: `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4`
