# 🤖 MockAI

## AI-Powered Career Interview Coach

MockAI is a multimodal AI-powered web application designed to help candidates practice job interviews and receive structured, personalized performance feedback.

The platform evaluates interview responses across three modalities:

- 🧠 NLP for semantic and content analysis
- 🎙️ Speech analysis for delivery and fluency
- 👤 Facial analysis for emotion and composure

The individual results are combined through a multimodal fusion and scoring pipeline to generate a comprehensive interview performance report.

---

## ✨ Features

### 👨‍💻 Candidate Platform

- Secure authentication
- Candidate dashboard
- Mock interview sessions
- Text-based responses
- Speech-based responses
- Video-based responses
- Dynamic interview questions
- Question difficulty levels
- Per-question evaluation
- Multimodal AI analysis
- Overall performance scoring
- Interview history
- Performance tracking
- Personalized feedback
- Detailed performance reports

### 🛠️ Admin Platform

- Admin authentication
- User management
- Question bank management
- Question category management
- Interview monitoring
- Performance statistics
- Interview record inspection
- Audit log monitoring
- Administrative analytics

---

# 🧠 AI Evaluation Pipeline

MockAI processes candidate responses through three primary analysis pipelines.

## 📝 NLP Analysis

The NLP pipeline evaluates the semantic quality and relevance of candidate answers.

```text
Candidate Answer
       ↓
Text Processing
       ↓
Transformer Embeddings
       ↓
Semantic Similarity
       ↓
NLP Content Score
```

The implementation uses transformer-based embeddings and semantic similarity against curated evaluation content.

---

## 🎙️ Speech Analysis

The speech pipeline evaluates communication and delivery characteristics.

```text
Candidate Audio
       ↓
Speech Transcription
       ↓
Transcript + Acoustic Signals
       ↓
Delivery Analysis
       ↓
Speech Score
```

Evaluated signals include:

- Speaking rate
- Words per minute
- Pauses
- Hesitation
- Fluency
- Delivery characteristics

---

## 👤 Facial Analysis

The vision pipeline analyzes facial expressions during video interviews.

```text
Candidate Video
       ↓
Frame Processing
       ↓
Face Detection
       ↓
Facial Emotion Recognition
       ↓
Emotion & Composure Features
       ↓
Vision Score
```

The implementation uses pre-trained facial analysis components rather than claiming custom foundation-model training.

---

# 🔀 Multimodal Fusion

MockAI combines the outputs from NLP, speech, and vision analysis using weighted late fusion.

```text
             NLP Score
                │
                │ 50%
                ▼
          ┌─────────────┐
Speech ──►│   Fusion    │◄── Vision
  30%     │    Engine   │     20%
          └──────┬──────┘
                 │
                 ▼
           Final Score
                 │
                 ▼
          Feedback Engine
                 │
                 ▼
          Performance Report
```

### Base Weights

| Modality | Weight |
|----------|-------:|
| 🧠 NLP / Content | 50% |
| 🎙️ Speech / Delivery | 30% |
| 👤 Vision / Facial | 20% |

The system also handles unavailable or low-quality modalities through dynamic weight redistribution.

---

# 📊 Difficulty-Weighted Scoring

Interview questions are assigned difficulty multipliers.

| Difficulty | Weight |
|------------|-------:|
| Easy | 1.0 |
| Medium | 1.25 |
| Hard | 1.5 |

The final interview score is calculated from the weighted scores of individual questions.

---

# 🏗️ System Architecture

```text
                         Candidate
                             │
                             ▼
                   React Web Application
                             │
                             ▼
                        REST API
                             │
                             ▼
                      FastAPI Backend
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   Authentication       Interview           Admin
       Module             Module             Module
                             │
                  ┌──────────┼──────────┐
                  │          │          │
                  ▼          ▼          ▼
                 Text      Speech      Video
                  │          │          │
                  │          ▼          ▼
                  │       Speech      Facial
                  │      Analysis     Analysis
                  │          │          │
                  ▼          ▼          ▼
                    Multimodal Fusion
                            │
                            ▼
                      Scoring Engine
                            │
                            ▼
                      Feedback Engine
                            │
                            ▼
                    Report Generation
                       │          │
                       ▼          ▼
                  MongoDB      Cloudinary
```

---

# 🛠️ Technology Stack

## Frontend

- React.js
- Tailwind CSS
- JavaScript

## Backend

- Python
- FastAPI
- REST APIs
- JWT Authentication

## Database

- MongoDB Atlas

## Artificial Intelligence

- Transformer-based NLP
- BERT / DistilBERT architecture
- Sentence Transformers
- Facial emotion recognition
- OpenCV
- FERPlus CNN
- Speech recognition

## Storage

- Cloudinary

## Development Tools

- Git
- GitHub
- Postman
- Docker
- Vercel
- Python Virtual Environment

---

# 📁 Project Structure

```text
MockAI/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── ...
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── utils/
│   ├── tests/
│   └── ...
│
├── README.md
└── ...
```

---

# 🔐 Security

MockAI implements several application-level security mechanisms:

- JWT-based authentication
- Role-based administrative access
- Protected API routes
- Candidate ownership validation
- User-level data isolation
- Secure database access
- Controlled media storage
- Upload validation

---

# 📈 Analytics & Reporting

MockAI provides performance insights at both candidate and administrative levels.

### Candidate

- Overall interview score
- Per-question scores
- NLP performance
- Speech performance
- Facial analysis
- Confidence indicators
- Stress indicators
- Historical performance
- Personalized improvement guidance

### Administrator

- User statistics
- Interview participation
- Average performance
- Score distributions
- Interview records
- Question bank statistics
- System activity logs

---

# 🧪 Testing

MockAI includes testing across the major AI and application components.

Tested areas include:

- Speech delivery analysis
- Empty audio handling
- Empty transcript handling
- Extreme speaking-rate handling
- Multimodal fusion
- Candidate ownership isolation
- Background evaluation
- Facial analysis
- NLP evaluation
- End-to-end evaluation

### Current Verification

```text
Functional Requirements     36 / 36
Sub-Requirements           108 / 108
Passed                     108
Partial                      0
Missing                      0
```

---

# 🔄 Processing Flow

A typical multimodal interview follows this flow:

```text
1. Candidate starts an interview
             ↓
2. Interview questions are presented
             ↓
3. Candidate responds through text,
   speech, or video
             ↓
4. Response data is processed
             ↓
5. NLP analyzes answer content
             ↓
6. Speech analysis evaluates delivery
             ↓
7. Vision analysis evaluates facial signals
             ↓
8. Multimodal fusion combines results
             ↓
9. Scoring engine calculates performance
             ↓
10. Feedback engine generates guidance
             ↓
11. Report is generated
             ↓
12. Results are stored and displayed
```

---

# 🎯 Project Objectives

MockAI aims to:

- Provide an accessible interview practice platform
- Simulate realistic interview sessions
- Evaluate multiple communication modalities
- Provide structured AI-based feedback
- Help candidates identify performance weaknesses
- Track performance across multiple interviews
- Improve interview preparation through personalized evaluation

The project focuses on English text, speech, and video interview experiences.

---

# 🚀 Future Scalability

The current application uses an integrated backend architecture.

For larger workloads, the AI processing pipeline could be separated into dedicated workers and services.

```text
                    Users
                      │
                      ▼
                Load Balancer
                      │
                      ▼
                 API Gateway
                      │
              Interview Service
                      │
                      ▼
                 Task Queue
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    NLP Worker    Speech Worker  Vision Worker
        │             │             │
        └─────────────┼─────────────┘
                      ▼
                Fusion Worker
                      │
                      ▼
                Report Service
                      │
              ┌───────┴───────┐
              ▼               ▼
          MongoDB         Object Storage
```

Potential future infrastructure includes:

- Redis
- Message queues
- Background workers
- Load balancing
- Horizontal scaling
- Centralized logging
- Monitoring
- Service isolation

---

# 📚 Academic Project

MockAI is a Final Year Project developed for the BS Computer Science program at:

**COMSATS University Islamabad, Lahore Campus**

### Areas

- Artificial Intelligence
- Natural Language Processing
- Computer Vision
- Data Science
- Web Development
- Software Engineering

---

# 👥 Project Team

### Syed Muhammad Asjad Abbas Zaidi
Software Development & System Integration

### Syed Hassan Ali Kazmi
AI / Machine Learning

---

# 📌 Project Status

```text
Frontend                 ✅
Backend                  ✅
Authentication           ✅
Candidate Platform       ✅
Admin Platform           ✅
NLP Evaluation           ✅
Speech Evaluation        ✅
Facial Analysis          ✅
Multimodal Fusion        ✅
Scoring Engine           ✅
Feedback Engine          ✅
Report Generation        ✅
MongoDB Integration      ✅
Security                 ✅
Testing                  ✅
```

---

# 🤖 MockAI

### Practice. Analyze. Improve.

Built to help candidates understand what they answer, how they communicate, and how they present themselves during an interview.
