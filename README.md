# 🤖 MockAI

## AI-Powered Career Interview Coach

MockAI is an advanced, multimodal artificial intelligence web application engineered to simulate realistic job interviews and provide candidates with structured, explainable, and difficulty-weighted performance evaluations.

The platform analyzes candidate responses across three core communication dimensions:

- 🧠 **Natural Language Processing (NLP)**: Semantic accuracy, conceptual depth, and rubric alignment.
- 🎙️ **Speech & Acoustic Delivery**: Speaking tempo (WPM), acoustic pauses, hesitations, conversational fillers, and delivery fluency.
- 👤 **Computer Vision & Facial Behavior**: Face localization, 8-class facial emotion distributions, baseline vs. secondary emotional states, peak expressive moments, behavioral composure, and tension indices.

These signals are integrated through a late multimodal fusion engine governing strict verbal primacy rules and difficulty-weighted scoring to generate an actionable coaching report.

---

## 📑 Technical Documentation

Detailed architectural, algorithmic, and verification specifications are maintained in the [`docs/`](docs/) directory:

- 📘 [**System Architecture & AI Evaluation Specification**](docs/SYSTEM_ARCHITECTURE_AND_EVALUATION_SPEC.md) — Comprehensive technical reference detailing models, mathematical scoring formulas, late fusion degradation matrices, database schemas, and RBAC security.
- 📗 [**Final Production Acceptance Report**](docs/FINAL_PRODUCTION_ACCEPTANCE_REPORT.md) — Live production acceptance test results across Render Cloud and MongoDB Atlas.

---

## ✨ System Features

### 👨‍💻 Candidate Platform
- **Secure Authentication**: Email/password authentication with SHA-256 OTP email verification and cryptographic Google OAuth integration.
- **Candidate Dashboard**: Real-time performance overview, interview counts, historical score trajectories, and domain distribution breakdown.
- **Custom Interview Setup**: Technical domains (Frontend, Backend, AI/ML, Cloud), custom roles, and difficulty selection.
- **Hardware Sensor Diagnostics**: Camera and microphone authorization checks with real-time video preview.
- **Interactive Interview Simulator**: Timed teleprompter question delivery, sequential progression, live video recording, and audio extraction.
- **Trimodal AI Evaluation**: Automated per-question analysis combining DistilBERT semantics, BERT grammar scoring, speech delivery metrics, and DeepFace (CNN) facial composure.
- **Answer by Voice, Video or Text**: Record a spoken take on camera, or type the answer (scored on content and language only).
- **Explainable Results & Feedback**: Multi-tab performance dossier featuring radar charts, dimension breakdowns (Technical, Fluency, Composure), detailed mathematical rationales, strengths, rubric omissions, and **STAR method** coaching suggestions.
- **Longitudinal Progress Tracking**: Historical session tracking, score trends, and confidence/stress distributions.
- **Industry Mentorship Subsystem**: Browse industry mentors, inspect specializations and hourly rates, book real-time appointment slots with collision protection, and manage bookings.

### 🛠️ Admin Governance Platform
- **Administrative Authentication**: Role-separated credentials with strict JWT claim validation.
- **Platform Analytics**: Global metrics covering total candidates, total sessions, platform average scores, average stress, and score distribution buckets.
- **Question Bank Management**: Full CRUD operations for technical questions, domain categories, difficulty multipliers, and active/inactive toggles.
- **Interview Monitoring**: Global interview registry with detailed session dossiers, full transcripts, and multimodal breakdowns.
- **Candidate User Management**: Registration registries, user status tracking, and candidate session counts.
- **Audit Logging**: Immutable administrative activity tracking for platform oversight.

---

## 🧠 AI Evaluation Pipeline

```
[Candidate Response: WebM Video/Audio Take]
                    │
                    ▼
      [FFmpeg Media Normalization Engine]
      ├── 16-bit PCM / 16kHz / Mono WAV Audio
      └── Normalized H.264 / 30fps Indexed MP4 Video
                    │
       ┌────────────┴────────────────────────────────┐
       │                                             │
       ▼                                             ▼
[Google Cloud Speech ASR]                  [OpenCV YuNet Face Detector]
- Transcribes Spoken Response              - Scans Sampled Frames (1-2 FPS)
- Word Counts & Silence Tagging            - Localizes Bounding Boxes & Landmarks
       │                                             │
       ├─────────────────────┐                       ▼
       ▼                     ▼             [Emotion-FERPlus ONNX Classifier]
[DistilBERT NLP Engine]  [Speech Delivery] - 8-Class Emotion Distribution
- 384d Dense Embeddings  - Cadence (WPM)   - Baseline & Secondary Moods
- Cosine Rubric Sim      - Acoustic Pauses - Peak Expressive Moment (Timestamp)
- Rubric Concept Overlap - Filler Counts   - Composure Index & Tension Rating
       │                     │                       │
       └─────────────────────┼───────────────────────┘
                             ▼
            [Late Multimodal Fusion Engine]
            - Base Weights: 50% NLP / 30% Speech / 20% Vision
            - Verbal Primacy Safeguard: Silence caps Vision at 20%
            - Graceful Degradation: Proportional weight redistribution
                             │
                             ▼
            [Difficulty-Weighted Scoring]
            - Easy (1.0x), Medium (1.25x), Hard (1.5x)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
[Confidence & Stress Synthesizer]   [Explainable Insights Engine]
- Dual Acoustic + Visual Synthesis  - Mathematical Score Rationale
- Confidence Level (High/Mod/Low)   - Prioritized Strengths & Weaknesses
- Stress Level (Low/Mod/Elevated)   - Personalized STAR Coaching Guidance
                                              │
                                              ▼
                             [MongoDB ACID Persistence & Dossier]
```

---

## 🔀 Multimodal Late Fusion & Scoring Rules

### Base Trimodal Fusion Weights
When all modalities are present and valid:
$$\text{Question Score} = \Big(0.50 \times \text{NLP Score}\Big) + \Big(0.30 \times \text{Speech Score}\Big) + \Big(0.20 \times \text{Vision Score}\Big)$$

| Modality | Weight | Evaluated Characteristic |
| :--- | :---: | :--- |
| 🧠 **NLP / Content** | **50%** | **What was said**: Rubric semantic similarity and technical concept coverage. |
| 🎙️ **Speech / Delivery** | **30%** | **How it was said**: Pacing (WPM), pauses, hesitations, and conversational fillers. |
| 👤 **Vision / Facial** | **20%** | **Non-verbal poise**: Composure stability, engagement level, and facial tension. |

### Verbal-Primacy & Silent-Response Safeguard
- **Rule**: If a candidate records a take but produces no verbal response (silence / 0 WPM):
  - $\text{NLP Score} = 0.0$
  - $\text{Speech Score} = 0.0$
  - $\text{Vision Weight} = 0.20$ (Strictly capped at baseline 20%; verbal weights are **never** redistributed to Vision).
- **Protection**: A candidate displaying perfect facial composure (85.0% score) while answering nothing receives a maximum score of $85 \times 0.20 = \mathbf{17.0\%}$, preventing score inflation on silent takes.

### Graceful Degradation (Hardware Absence)
When hardware is legitimately unavailable:
- **Audio Only (No Camera)**: $w_{\text{nlp}} = 62.5\%$, $w_{\text{speech}} = 37.5\%$, $w_{\text{vision}} = 0\%$.
- **Text Only (Typed Response)**: $w_{\text{nlp}} = 100\%$, $w_{\text{speech}} = 0\%$, $w_{\text{vision}} = 0\%$.
- **Text + Video (Typed with Camera)**: $w_{\text{nlp}} = 71.4\%$, $w_{\text{vision}} = 28.6\%$.

### Difficulty-Weighted Aggregation
$$\text{Overall Score} = \text{round}\left( \frac{\sum_{i=1}^{N} \Big(\text{DifficultyWeight}_i \times \text{QuestionScore}_i\Big)}{\sum_{i=1}^{N} \text{DifficultyWeight}_i}, 1 \right)$$
- **Easy**: $1.0\times$
- **Medium**: $1.25\times$
- **Hard**: $1.5\times$
- Unanswered or skipped questions carry a score of `0.0` while retaining their full difficulty weight in the denominator.

---

## 👥 Industry Mentorship Subsystem

MockAI includes a full-stack mentor scheduling platform integrated into the candidate journey:
- **Real Mentor Profiles**: Seeded with verified industry professionals across AI, Backend, Frontend, Cloud, and Data Engineering.
- **Real-Time Calendar Booking**: Dynamic date and time slot selection.
- **Double-Booking Conflict Prevention**: Database indexes enforce atomic appointment scheduling; collision attempts return HTTP 409 Conflict.
- **Candidate Privacy Isolation**: Candidates access only their own booked appointments; unauthorized lookups or cancellations return HTTP 403 Forbidden.
- **Slot Release**: Cancelling an appointment automatically frees the slot back to the mentor's calendar.

---

## 🛠️ Technology Stack

| Domain | Technology / Library | Role in System |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite | Component-driven single-page architecture |
| **Styling** | Tailwind CSS | Modern Charcoal (`#0B0F17`) + Orange (`#FF6B00`) theme |
| **Data Visuals** | Chart.js, Recharts | Interactive radar charts and performance trends |
| **Backend API** | FastAPI (Python 3.11) | High-performance asynchronous REST gateway |
| **ASGI Server** | Uvicorn | Asynchronous server runtime |
| **Database** | MongoDB Atlas | Cloud document store with compound indexing |
| **Auth & Cryptography** | JWT (PyJWT), Bcrypt, Passlib | Role-based token verification and salted password hashing |
| **Media Processing** | FFmpeg, Soundfile, PyDub | LocalFilesystemMediaStorage, WebM stream chunking, WAV extraction, MP4 normalization |
| **Speech ASR** | Google Cloud Speech-to-Text | Real-time speech transcription |
| **NLP Semantics** | DistilBERT (`multi-qa-distilbert-cos-v1`) · lite: MiniLM (`all-MiniLM-L6-v2`) | Dense transformer embeddings & rubric cosine similarity |
| **Grammar** | BERT (`bert-base-uncased-CoLA`) + rule checks · lite: rule checks | Grammatical acceptability score plus explainable corrections |
| **Face Detection** | OpenCV YuNet ONNX | Real-time bounding box and 5-landmark face localization |
| **Emotion Classifier**| DeepFace CNN + Emotion-FERPlus CNN (weighted ensemble) · lite: Emotion-FERPlus ONNX | Facial expression probability distribution |

### AI Model Profiles

The FYP-I report specifies DistilBERT, BERT and DeepFace. These need about 2–3 GB of RAM, so the backend has two profiles selected by the `AI_PROFILE` environment variable (`backend/services/ai_profile.py`):

| Profile | NLP | Grammar | Facial emotion | Use |
| :--- | :--- | :--- | :--- | :--- |
| `report` | DistilBERT | BERT-CoLA + rules | DeepFace + FERPlus CNN ensemble | Local runs, FYP demo (Python 3.11, `pip install -r backend/requirements-report.txt`) |
| `lite` (default) | MiniLM | Rules | FERPlus CNN | Render Starter (512 MB) cloud deployment |

In the report profile the DeepFace CNN is combined with FERPlus (30/70 weighted average per frame). On 8 real interview recordings, DeepFace alone matched the visible expression in 3 of 7 judgeable cases (misreading neutral faces as happy, fearful or sad, especially in poor lighting), while FERPlus, trained on the same faces with cleaner 10-rater labels, matched 7 of 7; the 30/70 blend also matched 7 of 7 (40/60: 6/7, 50/50: 5/7). Every result records the model that actually ran. If a report-profile model cannot load, that component falls back to its lite equivalent rather than failing.

---

## 🔐 Security & Role-Based Access Control (RBAC)

1. **Authentication Tokens**: RFC 7519 Bearer JWT signed with HMAC-SHA256 (`HS256`), carrying a 24-hour expiration window.
2. **Strict Role Separation**:
   - `verify_candidate` middleware enforces `role == "user"`.
   - `verify_admin` middleware enforces `role == "admin"`.
   - Cross-role privilege escalation is cryptographically rejected with HTTP 401/403.
3. **Data Isolation**: All candidate sessions, evaluations, and appointments are filtered by `user_id`. Cross-candidate lookups return HTTP 404 (zero information leakage).
4. **Credential Safety**: Plaintext passwords are salted and hashed via bcrypt before database insertion. Password hashes are stripped from all API outputs.
5. **Google Sign-In**: Validates cryptographic signatures against Google public RSA certs; forged tokens are rejected.

---

## 🧪 Testing & Verification Evidence

`backend/` holds 20 maintained test scripts (older one-off audit scripts are kept in `backend/tests_archive/`). The suites below were last re-run on **20 October 2026** in both AI profiles — `report` (DistilBERT, BERT-CoLA, DeepFace on Python 3.11) and `lite` (MiniLM, rules, FERPlus) — against MongoDB Atlas, and all passed. The production frontend build compiles 1,645 modules with no errors.

| # | Suite | What it verifies |
| :-: | :--- | :--- |
| 1 | `test_final_compliance_gate.py` | Full lifecycle across FR01–FR36 plus edge cases |
| 2 | `test_system_integration_fr30_fr36.py` | Persistence, history, progress and admin oversight (FR30–FR36) |
| 3 | `test_report_alignment.py` | Login lockout, recording consent, typed answers, grammar & tone, goal chatbot, participation trends, survey & accuracy summary |
| 4 | `test_real_evaluation_engine.py` | 15 end-to-end evaluation scenarios |
| 5 | `test_phase2_comprehensive.py` | Verbal primacy, temporal facial aggregation, mentor backend, statistics |
| 6 | `test_multimodal_fusion.py` | 50/30/20 late fusion and graceful degradation |
| 7 | `test_aggregate_evaluation.py` | Difficulty weighting (1.0×/1.25×/1.5×) and interview aggregation |
| 8 | `test_nlp_semantic.py` | Semantic scoring and rubric concept coverage (DistilBERT / MiniLM) |
| 9 | `test_facial_analysis.py` | Face localisation and emotion inference (DeepFace + FERPlus / FERPlus) |
| 10 | `test_speech_delivery.py` | WPM, acoustic pauses, filler detection |
| 11 | `test_confidence_stress.py` | Acoustic + visual confidence and stress levels |
| 12 | `test_insights_service.py` | Score rationales, strengths, weaknesses, STAR coaching |
| 13 | `test_summary_visuals.py` | Summary report and radar-chart data contracts |
| 14 | `test_media_asr.py` | Media upload, consent enforcement, storage safety, speech-to-text |
| 15 | `test_candidate_auth_api.py` | Registration, OTP, password recovery, Google sign-in |
| 16 | `test_candidate_interview_api.py` | Interview sessions, ownership, role separation |
| 17 | `test_qb_api.py` | Question Bank CRUD, search, stats, audit log |
| 18 | `test_evaluation_foundation.py` | Evaluation state machine, no fabricated scores |
| 19 | `test_evaluation_honesty.py` | Evidence gating for confidence/stress and facial indicators; missing signals never default to Neutral/Stable/High/Low; worker result = database = API |
| 20 | `test_camera_conduct.py` | Live "face not in frame" check, measured camera presence, off-camera scoring, expression flags, feedback naming the answers (incl. a real clip with the candidate out of frame) |
| 21 | `test_evaluation_recovery.py` | Evaluations stuck in "processing" are resumed on startup or after 15 min, never duplicated, and marked failed with a reason after 2 retries |
| 22 | `test_face_movement.py` | MediaPipe face movements: mouth open while not speaking, exaggerated movements, looking away; score cap, feedback wording, and no flags on a real normal answer |

`test_final_production_acceptance.py` and `test_production_facial_live.py` run the same checks against the live Render deployment.

What the behavioural scores can and cannot claim, and the plan to validate them against human ratings, is in [`docs/EVALUATION_VALIDATION_PLAN.md`](docs/EVALUATION_VALIDATION_PLAN.md).

**Not yet done:** a pilot study with real users. The in-app survey and `backend/evaluate_accuracy.py` (agreement between MockAI scores and human ratings — see `docs/accuracy_ratings_template.csv`) are in place to collect that evidence.

Test scripts automatically use a separate database (`mockai_test`), so they never add users or interviews to the real one. Prepare it once with `python setup_test_db.py` (copies the question bank, mentors and one fixture interview from the real database, read-only), then run any suite from `backend/`, e.g. `../.venv311/Scripts/python.exe test_report_alignment.py` (set `AI_PROFILE=report` or `lite`).

---

## 🚀 Getting Started

### Run locally (two terminals)
Once the environments below are set up:

```bash
# Terminal 1 - backend (http://localhost:8000); the AI models take about a minute to load
cd backend
../.venv311/Scripts/python.exe -m uvicorn main:app --port 8000
```

```bash
# Terminal 2 - frontend (http://localhost:5173)
cd frontend
npm run dev
```

Stop either one with **Ctrl+C** in its terminal.

Settings live in `backend/.env`:
- `AI_PROFILE=report` uses the exact FYP-report stack (DistilBERT, BERT-CoLA, DeepFace + FERPlus; needs `.venv311`). `AI_PROFILE=lite` uses the lighter models (run with `.venv` instead).
- `MONGO_TARGET=local` uses a local MongoDB on port 27017 instead of Atlas, for offline demos or networks that block Atlas's port 27017.

### Local database copy
Local mode needs MongoDB Server running on port 27017. On Windows, `winget install MongoDB.Server` installs it as a service that starts automatically. To run the backend against it, use the `backend-local` launch configuration or set `MONGO_TARGET=local` in `backend/.env`.

Fill or refresh the local database from Atlas while on a network that allows port 27017 (a phone hotspot works):

```bash
cd backend
../.venv311/Scripts/python.exe sync_local_db.py --yes
```

The existing local data is backed up to a `mockai_backup_<date>` database before it is replaced. Without Atlas access, `sync_local_db.py --seed-only` creates just the question bank, mentors and admin accounts. Changes made while running locally stay local; they are not copied back to Atlas.


### Prerequisites
- Python 3.11+
- Node.js 18+ LTS
- FFmpeg installed and accessible in system `$PATH`
- MongoDB instance (local or MongoDB Atlas)

### Backend Setup
```bash
cd backend
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and Secret Key

# Run development server
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install

# Run frontend development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 📚 Academic Project Information

MockAI is a Final Year Project developed for the Bachelor of Science in Computer Science program at:

**COMSATS University Islamabad, Lahore Campus**  
Department of Computer Science

### Project Team
- **Syed Muhammad Asjad Abbas Zaidi** — Software Architecture, Backend & Full-Stack Integration
- **Syed Hassan Ali Kazmi** — AI / Machine Learning & Computer Vision

---

## 🤖 MockAI
### Practice. Analyze. Improve.
Built to help candidates understand **what** they answer, **how** they communicate, and **how** they present themselves during job interviews.
