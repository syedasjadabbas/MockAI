# MockAI

## AI-Powered Career Interview Coach

MockAI is a multimodal AI-powered web application designed to help candidates practice interviews and receive structured, personalized performance feedback.

The system evaluates interview responses across three complementary modalities:

- NLP for answer content and semantic relevance
- Speech analysis for delivery, fluency, pacing, and hesitation
- Facial analysis for emotion and composure

The results are combined through a deterministic multimodal late-fusion scoring engine to produce an overall interview assessment.

---

## Features

### Candidate Platform

- Secure user authentication
- Personalized candidate dashboard
- Mock interview sessions
- Text-based interview responses
- Speech-based interview responses
- Video-based interview responses
- Dynamic interview questions
- Question difficulty levels
- Per-question evaluation
- Multimodal performance analysis
- Overall interview scoring
- Performance history
- Detailed feedback
- Strength identification
- Weakness identification
- Improvement suggestions
- Interview reports

### AI Evaluation

MockAI processes candidate responses through three analysis pipelines.

#### NLP Analysis

Evaluates the content of candidate answers using transformer-based semantic analysis.

- BERT / DistilBERT architecture
- Sentence-transformer embeddings
- Semantic similarity
- Answer relevance
- Content evaluation

#### Speech Analysis

Analyzes spoken responses for communication and delivery characteristics.

- Speech transcription
- Word count
- Speaking rate
- Words per minute
- Pause detection
- Hesitation signals
- Fluency analysis
- Delivery assessment

#### Facial Analysis

Analyzes facial expressions from interview video.

- Face detection
- Facial emotion recognition
- Emotion classification
- Composure analysis
- Behavioral indicators

#### Multimodal Fusion

The three modalities are combined using weighted late fusion:

```text
Final Score =
0.50 × NLP Content Score
+
0.30 × Speech Delivery Score
+
0.20 × Vision / Facial Score
