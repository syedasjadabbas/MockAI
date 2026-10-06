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
- **Trimodal AI Evaluation**: Automated per-question analysis combining DistilBERT semantics, speech delivery metrics, and FERPlus facial composure.
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
| **NLP Semantics** | DistilBERT (`all-MiniLM-L6-v2`) | Dense transformer embeddings & rubric cosine similarity |
| **Face Detection** | OpenCV YuNet ONNX | Real-time bounding box and 5-landmark face localization |
| **Emotion Classifier**| Emotion-FERPlus ONNX | 8-class facial expression probability distribution |

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

The MockAI platform has been exhaustively tested and verified across 12 primary regression and compliance suites (out of 23 automated test modules in `backend/`):

```text
======================================================================
MOCKAI COMPREHENSIVE VERIFICATION AUDIT
======================================================================
Functional Requirements (FR01–FR36)    36 / 36 PASSED (100%)
Sub-Requirements (108 Points)        108 / 108 PASSED (100%)
Multimodal Scenarios A through H        8 / 8  PASSED (100%)
Automated Test Suites (12 Suites)      12 / 12 PASSED (100%)
Frontend Production Build             1643 Modules Clean (0 Errors)
Production Acceptance Gate             35 / 35 PASSED (100%)
======================================================================
```

### Verified Test Suites:
1. `test_final_compliance_gate.py` — Complete lifecycle validation across FR01–FR36 & 18 edge cases.
2. `test_system_integration_fr30_fr36.py` — Database persistence, history, progress, and admin governance.
3. `test_phase2_comprehensive.py` — Verbal primacy, temporal facial aggregation, mentor backend, and statistics.
4. `test_multimodal_fusion.py` — Trimodal late fusion weights and graceful degradation matrices.
5. `test_facial_analysis.py` — YuNet face localization and Emotion-FERPlus ONNX inference.
6. `test_speech_delivery.py` — WPM calculation, acoustic pauses, and filler detection.
7. `test_nlp_semantic.py` — DistilBERT embeddings and rubric concept coverage.
8. `test_confidence_stress.py` — Acoustic + visual confidence and stress categorization.
9. `test_insights_service.py` — Mathematical rationales, strengths, weaknesses, and STAR coaching.
10. `test_aggregate_evaluation.py` — Difficulty weighting (1.0x, 1.25x, 1.5x) and whole-interview aggregation.
11. `test_summary_visuals.py` — Radar chart contracts and dimension breakdown serialization.
12. `test_final_production_acceptance.py` — Production gating on Render Cloud and MongoDB Atlas.

---

## 🚀 Getting Started

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
