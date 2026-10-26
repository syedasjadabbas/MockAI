# Behavioural Evaluation: Known Limits and Validation Plan

## What the system measures today

| Signal | Measured (observation) | Interpreted (heuristic, uncalibrated) |
| :--- | :--- | :--- |
| Face | Per-frame probabilities for the model's 8 classes (neutral, happiness, surprise, sadness, anger, disgust, fear, contempt); how much they change between frames (`temporal_dynamics`); model certainty; camera presence; other faces in view | Composure index (expression consistency), observable tension (share of negative classes) |
| Voice | Words per minute, fillers, pauses, sound activity, intensity (dBFS), pitch median and variability (`acoustic_profile`) | Speech confidence and stress from fluency, hesitation and pauses |
| Words | Transcript, explicit uncertainty statements ("I don't know", "I can't answer"), hedges | Verbal-certainty component of confidence |

The expression models (DeepFace CNN + Emotion-FERPlus) **cannot recognise teasing, sarcasm, intent, confidence or nervousness**. They only output the 8 classes above, trained on posed, cropped faces. No accuracy figure for confidence or stress can be claimed until the system is compared against human labels.

Rules the pipeline enforces:

- Confidence and stress need at least 20 recognised words (about 8–10 s of speech). Otherwise they are **Not Assessed**.
- Facial indicators need ≥ 8 analysable frames, adequate model certainty, the face visible in ≥ 60% of frames, and a clearly attributable face. Otherwise they are **Not Assessed**.
- Camera presence is never reported as engagement. A neutral or happy face never adds confidence. A calm face never lowers stress.
- Staying in frame is part of a video interview. During the interview a still frame is checked every 2 s and the candidate is warned after about 4 s out of frame (frames are analysed in memory, never stored). In the evaluation, an answer whose measured in-frame share is below 55% scores the camera share (20%) on presence: 0 when never in frame, up to 30 at the threshold. Answers with no video (typed, audio-only) are not penalised.
- **Camera-presence calibration** (`backend/calibrate_camera_presence.py`, results in [`camera_presence_calibration.json`](camera_presence_calibration.json)): 12 real recordings with known stretches blacked out, 72 trials. The measured in-frame share was off by 1.2% on average (worst 8.7%) and never missed a visible face. The measured cutoff is 55%, one worst-case error below the 60% policy line, so a candidate truly in frame 60% of the time is not penalised (71/72 decisions correct, no off-camera answer missed). This validates the measurement, not human judgement of the policy.
- **Face movements** (MediaPipe Face Landmarker, `backend/services/face_movement.py`): the answer is flagged when the mouth is wide open while the candidate is not speaking (speech timing from the recording's audio), for exaggerated movements speech does not produce (puffed cheeks, sideways jaw, sneer; stretched or rolled-in lips only while silent), or when the head is turned more than 30° or tilted more than 25° for at least a quarter of the answer. A flag caps the camera score at 30. The results say what the face did, never why: the measurement cannot tell a tongue out from a yawn, or reading notes from looking around. MediaPipe has no reliable tongue score, so a tongue out is caught as "mouth open while not speaking".
- **Face-movement check on real answers** (`backend/calibrate_face_movement.py`, [`face_movement_calibration.json`](face_movement_calibration.json)): on 17 real answers, normal behaviour stayed well below every limit (mouth opening while silent at most 0.12 against 0.45; unusual movements at most 0.42 against 0.6). The calibration found puckered and funnelled lips firing at up to 0.96 when a hand covered the mouth or the room was dark, so those shapes are not used. Looking away was flagged on 5 answers recorded while the candidate sat turned to the side, confirmed on the video. **Not yet shown:** that deliberate pulled faces are caught. That needs labelled recordings (`--labelled` option).
- **Expression-flag thresholds are not calibrated.** Calibrating them needs answers labelled by people ("pulling faces: yes/no"); see the validation plan below.
- Expression flags: if the visible face is confidently read as anger, disgust or contempt in ≥ 25% of frames, or the expression keeps switching, the answer is flagged and its camera score is capped at 30. The flags describe the model's classes; they cannot tell teasing or mocking faces from other expressions, and say so in the results.
- Acoustic measurements (pitch, intensity variation) are reported but **not** used for scoring.

## Validation plan (FYP-II, Objective 7)

### 1. Collect recordings (2–3 weeks)

- **Participants:** 15–20, recruited with written consent covering recording and research use.
- **Sessions:** each participant does 2 interviews of 5 questions (about 150–200 answers in total).
- **Mix:** ask participants to vary their delivery across answers, including a prepared answer, an unprepared one, and some under time pressure. Natural variation matters more than acting.
- **Recording:** a laptop webcam and microphone, in ordinary rooms, so the conditions match real use.

### 2. Annotate (blind to MockAI's scores)

Two raters (for example, a supervisor and a trained peer) independently rate every answer:

| Label | Scale |
| :--- | :--- |
| Perceived confidence | 1–5 |
| Perceived stress / nervousness | 1–5 |
| Expression consistency (steady / some change / frequent change) | 3-point |
| Dominant visible expression | one of the model's 8 classes, or "other" |
| Answer usable? (audible speech, face visible) | yes / no |

Sheet: `python export_rating_sheet.py --out ../scratch/rating_sheet.csv` (from `backend/`) writes one row per evaluated answer with the question, transcript and recording path, and empty columns for these labels. MockAI's own scores are left out so raters stay blind. Columns match `docs/accuracy_ratings_template.csv`. The sheet holds candidate transcripts, so keep it out of git.

### 3. Measure

1. **Inter-rater agreement:** quadratic-weighted Cohen's kappa. Target ≥ 0.6 before using the labels; if lower, refine the rating guide and re-rate.
2. **System vs consensus label:**
   - For confidence and stress: Spearman correlation, mean absolute error after rescaling 1–5 to 0–100, and the share of answers within one rating step. `backend/evaluate_accuracy.py --ratings` computes these, plus quadratic-weighted kappa for answers rated by two raters (step 1).
   - For dominant expression: per-class precision and recall, plus a confusion matrix.
3. **Calibration:** only after steps 1–2, fit the thresholds in `services/confidence_stress_analyzer.py` and `services/facial_analyzer.py` on about 70% of the answers, and report results on the held-out 30%.
4. **Report honestly:** publish the agreement figures, sample size and failure cases in FYP-II, including where the models disagree with the raters.

### 4. Regression guard

`backend/test_evaluation_honesty.py` checks the logic rules above: evidence gating, missing signals never producing positive defaults, and that the API matches the stored record. It validates behaviour, not accuracy.
