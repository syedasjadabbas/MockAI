"""
Facial & Behavioral Computer-Vision Analysis Service (Phase 5 / Task 1).

Implements real model-derived facial expression classification and non-verbal
behavioral composure analysis from candidate interview video recordings.

Architecture:
1. Video Ingestion: Reads actual recorded MP4/WebM candidate takes via OpenCV.
2. Temporal Frame Sampling: Samples 1 frame per second (capped at 30 frames)
   to ensure lightweight, non-blocking background evaluation without redundant frame compute.
3. Face Detection: OpenCV YuNet CNN face detector to accurately extract face coordinates.
4. Emotion Classification: CNN Emotion-FERPlus neural network running via ONNX Runtime
   to compute deterministic probability distributions across 8 facial expressions:
   [neutral, happiness, surprise, sadness, anger, disgust, fear, contempt].
5. Behavioral Indicators: Computes observable composure, engagement consistency,
   and non-verbal tension indices from expression distribution and facial presence.

Scientific Integrity:
- Real model outputs only; zero fabricated percentages or hardcoded scores.
- Expressly categorized as observable behavioral signals, NOT clinical or medical diagnoses.
- Handles edge cases cleanly: missing_media, corrupt_media, no_face_detected, insufficient_data.
"""
import os
import logging
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime

import cv2
import numpy as np
import onnxruntime as ort

from services.ai_profile import is_report_profile

logger = logging.getLogger("mockai.facial_analyzer")

# Share of the DeepFace CNN in the report-profile emotion ensemble (the rest
# is Emotion-FERPlus). See _classify_face_expression for the rationale.
DEEPFACE_ENSEMBLE_WEIGHT = 0.4

# DeepFace emotion model output order (deepface.models.demography Emotion).
DEEPFACE_LABELS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]

# DeepFace (report AI profile) emotion classes -> this module's label set.
# DeepFace's CNN predicts 7 classes; FERPlus's 8th class, contempt, stays 0.
DEEPFACE_LABEL_MAP = {
    "neutral": "neutral",
    "happy": "happiness",
    "surprise": "surprise",
    "sad": "sadness",
    "angry": "anger",
    "disgust": "disgust",
    "fear": "fear",
}

# Model Paths
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
YUNET_MODEL_PATH = MODELS_DIR / "face_detection_yunet_2023mar.onnx"
FER_MODEL_PATH = MODELS_DIR / "emotion-ferplus-8.onnx"

EMOTION_LABELS = [
    "neutral",
    "happiness",
    "surprise",
    "sadness",
    "anger",
    "disgust",
    "fear",
    "contempt",
]


class FacialAnalyzer:
    """
    Singleton computer-vision engine for facial expression & behavioral indicator analysis.
    """
    _instance: Optional["FacialAnalyzer"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FacialAnalyzer, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self.ort_session: Optional[ort.InferenceSession] = None
        self._deepface = None
        self._deepface_failed = False
        self._init_models()
        if is_report_profile():
            self._init_deepface()
        self._initialized = True

    # ------------------------------------------------------------------
    # Report profile: DeepFace CNN emotion classifier (FYP-I report 5.3,
    # "DeepFace / CNN Models"). Faces are still located with OpenCV YuNet;
    # DeepFace classifies the cropped face (detector_backend="skip"), so
    # detection is not run twice.
    # ------------------------------------------------------------------
    def _init_deepface(self):
        try:
            # DeepFace prints download progress with non-ASCII characters; on
            # a Windows cp1252 console that raises UnicodeEncodeError, so make
            # the console streams tolerant before importing it.
            import sys
            for stream in (sys.stdout, sys.stderr):
                try:
                    if stream and (getattr(stream, "encoding", "") or "").lower() not in ("utf-8", "utf8"):
                        stream.reconfigure(errors="replace")
                except Exception:
                    pass
            from deepface.modules import modeling
            # Use DeepFace's emotion CNN directly rather than DeepFace.analyze():
            # with current OpenCV/Keras versions analyze()'s own preprocessing
            # skews neutral faces to "angry" (verified on real interview
            # frames), while the model fed a 0-1 scaled face crop matches the
            # visible expression. Building it also downloads its weights once.
            model = modeling.build_model(task="facial_attribute", model_name="Emotion")
            model.predict(np.zeros((48, 48, 3), dtype=np.float32))  # warm-up
            self._deepface = model
            logger.info("DeepFace emotion CNN loaded (report AI profile).")
        except Exception as e:
            self._deepface_failed = True
            logger.warning("DeepFace unavailable, using Emotion-FERPlus instead: %s", e)

    @property
    def using_deepface(self) -> bool:
        return self._deepface is not None

    @property
    def classifier_label(self) -> str:
        return "deepface+ferplus-cnn-ensemble" if self.using_deepface else "fer-cnn-onnx-v1"

    @property
    def pipeline_label(self) -> str:
        return "opencv-yunet + deepface/ferplus cnn ensemble" if self.using_deepface else "yunet-onnx + emotion-ferplus-8"

    def _classify_with_deepface(self, face_crop: np.ndarray) -> Optional[np.ndarray]:
        try:
            probs = np.asarray(self._deepface.predict(face_crop.astype(np.float32) / 255.0), dtype=np.float32).reshape(-1)
            vec = np.zeros(len(EMOTION_LABELS), dtype=np.float32)
            for df_label, p in zip(DEEPFACE_LABELS, probs):
                vec[EMOTION_LABELS.index(DEEPFACE_LABEL_MAP[df_label])] = float(p)
            total = float(vec.sum())
            return vec / total if total > 0 else None
        except Exception as e:
            logger.debug(f"DeepFace inference notice: {e}")
            return None

    def _init_models(self):
        """Initializes ONNX inference session and ensures model files are available."""
        import urllib.request
        try:
            os.makedirs(MODELS_DIR, exist_ok=True)
            if not YUNET_MODEL_PATH.is_file():
                logger.info(f"Downloading YuNet face detector to {YUNET_MODEL_PATH}...")
                yunet_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
                urllib.request.urlretrieve(yunet_url, str(YUNET_MODEL_PATH))

            if not FER_MODEL_PATH.is_file():
                logger.info(f"Downloading Emotion-FERPlus model to {FER_MODEL_PATH}...")
                fer_url = "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/emotion_ferplus/model/emotion-ferplus-8.onnx"
                urllib.request.urlretrieve(fer_url, str(FER_MODEL_PATH))

            if FER_MODEL_PATH.is_file():
                so = ort.SessionOptions()
                so.intra_op_num_threads = min(4, os.cpu_count() or 1)
                so.inter_op_num_threads = 1
                so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self.ort_session = ort.InferenceSession(str(FER_MODEL_PATH), so)
                self._fer_input_name = self.ort_session.get_inputs()[0].name
                logger.info("Emotion-FERPlus ONNX model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize facial analysis models: {e}", exc_info=True)
            self.ort_session = None

    def analyze_video(
        self,
        video_path: Optional[str],
        duration_seconds: Optional[float] = None,
        max_samples: int = 30,
        fps_sample_rate: float = 1.0,
    ) -> Dict:
        """
        Analyzes facial expressions and non-verbal behavioral composure from recorded video.

        Returns structured dictionary complying with the FYP report schema.
        """
        # 1. Missing media validation
        if not video_path or not os.path.exists(video_path):
            return {
                "status": "missing_media",
                "face_detected": False,
                "face_presence_ratio": 0.0,
                "total_frames_sampled": 0,
                "frames_with_face": 0,
                "frames_with_multiple_faces": 0,
                "detection_coverage": 0.0,
                "dominant_expression": "Not Observed",
                "baseline_expression": "Not Observed",
                "secondary_expression": "Not Observed",
                "expressive_ratio": 0.0,
                "peak_moment": None,
                "expression_distribution": {},
                "behavioral_indicators": {
                    "engagement_level": "Not Assessed",
                    "composure_index": "Not Assessed",
                    "observable_tension": "Not Assessed",
                },
                "quality_metadata": {
                    "valid_frames_processed": 0,
                    "frames_with_detected_faces": 0,
                    "frames_with_multiple_faces": 0,
                    "detection_coverage_ratio": 0.0,
                    "resolution": "0x0",
                    "fps": 0.0,
                    "duration_seconds": 0.0,
                    "inference_errors": 0,
                    "model": self.pipeline_label,
                    "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                },
                "model": self.classifier_label,
                "error": "Media recording not found on disk",
            }

        # Check for empty / zero-byte file
        if os.path.getsize(video_path) == 0:
            return {
                "status": "corrupt_media",
                "face_detected": False,
                "face_presence_ratio": 0.0,
                "total_frames_sampled": 0,
                "frames_with_face": 0,
                "frames_with_multiple_faces": 0,
                "detection_coverage": 0.0,
                "dominant_expression": "Not Observed",
                "baseline_expression": "Not Observed",
                "secondary_expression": "Not Observed",
                "expressive_ratio": 0.0,
                "peak_moment": None,
                "expression_distribution": {},
                "behavioral_indicators": {
                    "engagement_level": "Not Assessed",
                    "composure_index": "Not Assessed",
                    "observable_tension": "Not Assessed",
                },
                "quality_metadata": {
                    "valid_frames_processed": 0,
                    "frames_with_detected_faces": 0,
                    "frames_with_multiple_faces": 0,
                    "detection_coverage_ratio": 0.0,
                    "resolution": "0x0",
                    "fps": 0.0,
                    "duration_seconds": 0.0,
                    "inference_errors": 1,
                    "model": self.pipeline_label,
                    "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                },
                "model": self.classifier_label,
                "error": "Media recording is empty (0 bytes)",
            }

        # 2. Normalize/convert streaming WebM or unindexed container via FFmpeg before OpenCV capture
        temp_normalized_path: Optional[str] = None
        target_video_path = str(video_path)
        cap = None

        from services.media_conversion import is_ffmpeg_available, normalize_video_to_mp4, has_video_stream
        if is_ffmpeg_available() and not has_video_stream(Path(video_path)):
            return {
                "status": "insufficient_data",
                "face_detected": False,
                "face_presence_ratio": 0.0,
                "total_frames_sampled": 0,
                "frames_with_face": 0,
                "frames_with_multiple_faces": 0,
                "detection_coverage": 0.0,
                "dominant_expression": "Not Observed",
                "baseline_expression": "Not Observed",
                "secondary_expression": "Not Observed",
                "expressive_ratio": 0.0,
                "peak_moment": None,
                "expression_distribution": {},
                "behavioral_indicators": {
                    "engagement_level": "Not Assessed",
                    "composure_index": "Not Assessed",
                    "observable_tension": "Not Assessed",
                },
                "quality_metadata": {
                    "valid_frames_processed": 0,
                    "frames_with_detected_faces": 0,
                    "frames_with_multiple_faces": 0,
                    "detection_coverage_ratio": 0.0,
                    "resolution": "0x0",
                    "fps": 0.0,
                    "duration_seconds": 0.0,
                    "inference_errors": 0,
                    "model": self.pipeline_label,
                    "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                },
                "model": self.classifier_label,
                "error": "Media recording contains no video stream (audio-only)",
            }

        # Check for persistent normalized sibling file before transcode
        video_p = Path(video_path)
        candidate_norm_mp4 = video_p.parent / f"{video_p.stem}_normalized.mp4"
        candidate_mp4 = video_p.with_suffix(".mp4")
        if candidate_norm_mp4.is_file() and candidate_norm_mp4.stat().st_size > 0:
            target_video_path = str(candidate_norm_mp4)
            temp_normalized_path = None
        elif candidate_mp4.is_file() and candidate_mp4.stat().st_size > 0 and candidate_mp4 != video_p:
            target_video_path = str(candidate_mp4)
            temp_normalized_path = None
        elif is_ffmpeg_available() and target_video_path.lower().endswith(".webm"):
            import tempfile
            try:
                temp_fd, temp_normalized_path = tempfile.mkstemp(suffix=".mp4", prefix="mockai_norm_")
                os.close(temp_fd)
                normalize_video_to_mp4(Path(video_path), Path(temp_normalized_path))
                target_video_path = temp_normalized_path
                logger.info(f"Normalized WebM to frame-readable MP4: {video_path} -> {temp_normalized_path}")
            except Exception as conv_err:
                logger.warning(f"Video normalization notice ({conv_err}); attempting direct capture from {video_path}")
                if temp_normalized_path and os.path.exists(temp_normalized_path):
                    try:
                        os.unlink(temp_normalized_path)
                    except OSError:
                        pass
                temp_normalized_path = None
                target_video_path = str(video_path)

        # 3. Open video capture
        cap = cv2.VideoCapture(target_video_path)
        if not cap.isOpened():
            # If direct opening failed and we haven't tried FFmpeg normalization yet, attempt normalization
            if temp_normalized_path is None and is_ffmpeg_available():
                import tempfile
                try:
                    temp_fd, temp_normalized_path = tempfile.mkstemp(suffix=".mp4", prefix="mockai_norm_")
                    os.close(temp_fd)
                    normalize_video_to_mp4(Path(video_path), Path(temp_normalized_path))
                    target_video_path = temp_normalized_path
                    cap = cv2.VideoCapture(target_video_path)
                except Exception:
                    if temp_normalized_path and os.path.exists(temp_normalized_path):
                        try:
                            os.unlink(temp_normalized_path)
                        except OSError:
                            pass
                    temp_normalized_path = None

        if not cap.isOpened():
            if temp_normalized_path and os.path.exists(temp_normalized_path):
                try:
                    os.unlink(temp_normalized_path)
                except OSError:
                    pass
            return {
                "status": "corrupt_media",
                "face_detected": False,
                "face_presence_ratio": 0.0,
                "total_frames_sampled": 0,
                "frames_with_face": 0,
                "frames_with_multiple_faces": 0,
                "detection_coverage": 0.0,
                "dominant_expression": "Not Observed",
                "baseline_expression": "Not Observed",
                "secondary_expression": "Not Observed",
                "expressive_ratio": 0.0,
                "peak_moment": None,
                "expression_distribution": {},
                "behavioral_indicators": {
                    "engagement_level": "Not Assessed",
                    "composure_index": "Not Assessed",
                    "observable_tension": "Not Assessed",
                },
                "quality_metadata": {
                    "valid_frames_processed": 0,
                    "frames_with_detected_faces": 0,
                    "frames_with_multiple_faces": 0,
                    "detection_coverage_ratio": 0.0,
                    "resolution": "0x0",
                    "fps": 0.0,
                    "duration_seconds": 0.0,
                    "inference_errors": 1,
                    "model": self.pipeline_label,
                    "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                },
                "model": self.classifier_label,
                "error": "Unable to decode video streams",
            }

        yunet_detector = None
        try:
            total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            first_frame = None
            if width <= 0 or height <= 0 or total_video_frames <= 0:
                # Try reading at least one frame to confirm
                ret, frame = cap.read()
                if not ret or frame is None:
                    return {
                        "status": "insufficient_data",
                        "face_detected": False,
                        "face_presence_ratio": 0.0,
                        "total_frames_sampled": 0,
                        "frames_with_face": 0,
                        "frames_with_multiple_faces": 0,
                        "detection_coverage": 0.0,
                        "dominant_expression": "Not Observed",
                        "baseline_expression": "Not Observed",
                        "secondary_expression": "Not Observed",
                        "expressive_ratio": 0.0,
                        "peak_moment": None,
                        "expression_distribution": {},
                        "behavioral_indicators": {
                            "engagement_level": "Not Assessed",
                            "composure_index": "Not Assessed",
                            "observable_tension": "Not Assessed",
                        },
                        "quality_metadata": {
                            "valid_frames_processed": 0,
                            "frames_with_detected_faces": 0,
                            "frames_with_multiple_faces": 0,
                            "detection_coverage_ratio": 0.0,
                            "resolution": "0x0",
                            "fps": 0.0,
                            "duration_seconds": 0.0,
                            "inference_errors": 1,
                            "model": self.pipeline_label,
                            "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                        },
                        "model": self.classifier_label,
                        "error": "Video contains no readable frames",
                    }
                else:
                    height, width, _ = frame.shape
                    total_video_frames = 1
                    first_frame = frame

            # Determine temporal duration
            if duration_seconds and duration_seconds > 0:
                inferred_duration = duration_seconds
            elif total_video_frames > 0 and video_fps > 0:
                inferred_duration = total_video_frames / video_fps
            else:
                inferred_duration = 30.0

            # Scale detector dimensions if resolution exceeds standard 480p
            det_w, det_h = width, height
            if width > 640 or height > 480:
                scale = min(640.0 / width, 480.0 / height)
                det_w, det_h = int(width * scale), int(height * scale)

            # Initialize YuNet Face Detector for resolution
            yunet_detector = None
            if YUNET_MODEL_PATH.is_file():
                try:
                    yunet_detector = cv2.FaceDetectorYN.create(
                        str(YUNET_MODEL_PATH),
                        "",
                        (det_w, det_h),
                        score_threshold=0.55,
                        nms_threshold=0.3,
                        top_k=5000,
                    )
                except Exception as e:
                    logger.warning(f"YuNet creation failed: {e}")

            # Efficient frame stepping using cap.grab() for intermediate frames
            frame_step = max(1, round(video_fps / fps_sample_rate)) if (video_fps > 0 and fps_sample_rate > 0) else 30
            sampled_emotions: List[np.ndarray] = []
            sampled_timestamps: List[float] = []
            face_detected_count = 0
            total_sampled_count = 0
            multi_face_count = 0
            inference_errors = 0
            face_centers_x: List[float] = []

            frame_idx = 0
            while total_sampled_count < max_samples:
                is_sample_frame = (frame_idx % frame_step == 0)
                if first_frame is not None:
                    frame = first_frame
                    ret = True
                    first_frame = None
                elif is_sample_frame:
                    ret, frame = cap.read()
                else:
                    ret = cap.grab()
                    frame = None

                if not ret:
                    break

                if is_sample_frame and frame is not None:
                    total_sampled_count += 1
                    pos_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
                    sample_sec = max(0.0, float(pos_ms / 1000.0)) if pos_ms >= 0 else float(frame_idx / (video_fps or 25.0))

                    face_crop, face_bbox, f_count = self._extract_face(frame, yunet_detector, width, height, return_count=True)
                    if f_count > 1:
                        multi_face_count += 1

                    if face_crop is not None:
                        face_detected_count += 1
                        x, y, w_box, h_box = face_bbox
                        face_centers_x.append((x + w_box / 2.0) / width if width > 0 else 0.5)

                        # Classify facial expression
                        try:
                            probs = self._classify_face_expression(face_crop)
                            if probs is not None:
                                sampled_emotions.append(probs)
                                sampled_timestamps.append(sample_sec)
                        except Exception as e:
                            logger.debug(f"Emotion classification error on frame {frame_idx}: {e}")
                            inference_errors += 1

                frame_idx += 1

            if total_sampled_count == 0:
                return {
                    "status": "insufficient_data",
                    "face_detected": False,
                    "face_presence_ratio": 0.0,
                    "total_frames_sampled": 0,
                    "frames_with_face": 0,
                    "frames_with_multiple_faces": 0,
                    "detection_coverage": 0.0,
                    "dominant_expression": "Not Observed",
                    "baseline_expression": "Not Observed",
                    "secondary_expression": "Not Observed",
                    "expressive_ratio": 0.0,
                    "peak_moment": None,
                    "expression_distribution": {},
                    "behavioral_indicators": {
                        "engagement_level": "Not Assessed",
                        "composure_index": "Not Assessed",
                        "observable_tension": "Not Assessed",
                    },
                    "quality_metadata": {
                        "valid_frames_processed": 0,
                        "frames_with_detected_faces": 0,
                        "frames_with_multiple_faces": 0,
                        "detection_coverage_ratio": 0.0,
                        "resolution": f"{width}x{height}",
                        "fps": round(video_fps, 2),
                        "duration_seconds": round(inferred_duration, 2),
                        "inference_errors": inference_errors,
                        "model": self.pipeline_label,
                        "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                    },
                    "model": self.classifier_label,
                    "error": "No frames could be extracted from recording",
                }

            presence_ratio = round(face_detected_count / total_sampled_count, 3)

            # If no face was ever detected
            if face_detected_count == 0 or len(sampled_emotions) == 0:
                return {
                    "status": "no_face_detected",
                    "face_detected": False,
                    "face_presence_ratio": 0.0,
                    "total_frames_sampled": total_sampled_count,
                    "frames_with_face": 0,
                    "frames_with_multiple_faces": multi_face_count,
                    "detection_coverage": 0.0,
                    "dominant_expression": "Not Observed",
                    "baseline_expression": "Not Observed",
                    "secondary_expression": "Not Observed",
                    "expressive_ratio": 0.0,
                    "peak_moment": None,
                    "expression_distribution": {},
                    "behavioral_indicators": {
                        "engagement_level": "Low (No Face Detected)",
                        "composure_index": "Not Assessed",
                        "observable_tension": "Not Assessed",
                    },
                    "quality_metadata": {
                        "valid_frames_processed": total_sampled_count,
                        "frames_with_detected_faces": 0,
                        "frames_with_multiple_faces": multi_face_count,
                        "detection_coverage_ratio": 0.0,
                        "resolution": f"{width}x{height}",
                        "fps": round(video_fps, 2),
                        "duration_seconds": round(inferred_duration, 2),
                        "inference_errors": inference_errors,
                        "model": self.pipeline_label,
                        "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                    },
                    "model": self.classifier_label,
                    "error": None,
                }

            # -------------------------------------------------------------------
            # Sophisticated multi-moment facial expression analysis:
            # 1. Temporal probability distribution across all valid sampled frames
            # 2. Baseline/resting facial state determination
            # 3. Peak/salient expressive moments (smiles, surprise, agitation) with timestamps
            # 4. Secondary active expression detection
            # -------------------------------------------------------------------
            avg_probs = np.mean(sampled_emotions, axis=0)
            max_overall_conf = float(np.max(avg_probs))

            # If maximum probability is negligible or model output is degenerate/insufficient
            if max_overall_conf < 0.20:
                return {
                    "status": "insufficient_data",
                    "face_detected": True,
                    "face_presence_ratio": presence_ratio,
                    "total_frames_sampled": total_sampled_count,
                    "frames_with_face": face_detected_count,
                    "frames_with_multiple_faces": multi_face_count,
                    "detection_coverage": presence_ratio,
                    "dominant_expression": "Not Observed",
                    "baseline_expression": "Not Observed",
                    "secondary_expression": "None Observed",
                    "expressive_ratio": 0.0,
                    "peak_moment": None,
                    "expression_distribution": {},
                    "behavioral_indicators": {
                        "engagement_level": "Moderate",
                        "composure_index": "Not Assessed",
                        "observable_tension": "Not Assessed",
                    },
                    "quality_metadata": {
                        "valid_frames_processed": total_sampled_count,
                        "frames_with_detected_faces": face_detected_count,
                        "frames_with_multiple_faces": multi_face_count,
                        "detection_coverage_ratio": presence_ratio,
                        "resolution": f"{width}x{height}",
                        "fps": round(video_fps, 2),
                        "duration_seconds": round(inferred_duration, 2),
                        "inference_errors": inference_errors,
                        "model": self.pipeline_label,
                        "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                    },
                    "model": self.classifier_label,
                    "error": "Facial expression confidence below classification threshold",
                }

            agg = self._aggregate_expression_sequence(
                sampled_emotions=sampled_emotions,
                sampled_timestamps=sampled_timestamps,
            )

            # Derive report-aligned behavioral indicators
            engagement_level, composure_index, observable_tension = self._derive_indicators(
                presence_ratio=presence_ratio,
                distribution=agg["expression_distribution"],
                face_centers_x=face_centers_x,
            )

            return {
                "status": "completed",
                "face_detected": True,
                "face_presence_ratio": presence_ratio,
                "total_frames_sampled": total_sampled_count,
                "frames_with_face": face_detected_count,
                "frames_with_multiple_faces": multi_face_count,
                "detection_coverage": presence_ratio,
                "dominant_expression": agg["dominant_expression"],
                "baseline_expression": agg["baseline_expression"],
                "secondary_expression": agg["secondary_expression"],
                "expressive_ratio": agg["expressive_ratio"],
                "peak_moment": agg["peak_moment"],
                "expression_distribution": agg["expression_distribution"],
                "behavioral_indicators": {
                    "engagement_level": engagement_level,
                    "composure_index": composure_index,
                    "observable_tension": observable_tension,
                },
                "quality_metadata": {
                    "valid_frames_processed": total_sampled_count,
                    "frames_with_detected_faces": face_detected_count,
                    "frames_with_multiple_faces": multi_face_count,
                    "detection_coverage_ratio": presence_ratio,
                    "resolution": f"{width}x{height}",
                    "fps": round(video_fps, 2),
                    "duration_seconds": round(inferred_duration, 2),
                    "inference_errors": inference_errors,
                    "model": self.pipeline_label,
                    "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                },
                "model": self.classifier_label,
                "analyzed_at": datetime.utcnow().isoformat(),
                "error": None,
            }

        except Exception as e:
            logger.error(f"Error during facial video analysis: {e}", exc_info=True)
            return {
                "status": "analysis_failed",
                "face_detected": False,
                "face_presence_ratio": 0.0,
                "total_frames_sampled": 0,
                "frames_with_face": 0,
                "frames_with_multiple_faces": 0,
                "detection_coverage": 0.0,
                "dominant_expression": "Not Observed",
                "baseline_expression": "Not Observed",
                "secondary_expression": "Not Observed",
                "expressive_ratio": 0.0,
                "peak_moment": None,
                "expression_distribution": {},
                "behavioral_indicators": {
                    "engagement_level": "Not Assessed",
                    "composure_index": "Not Assessed",
                    "observable_tension": "Not Assessed",
                },
                "quality_metadata": {
                    "valid_frames_processed": 0,
                    "frames_with_detected_faces": 0,
                    "frames_with_multiple_faces": 0,
                    "detection_coverage_ratio": 0.0,
                    "resolution": "0x0",
                    "fps": 0.0,
                    "duration_seconds": 0.0,
                    "inference_errors": 1,
                    "model": self.pipeline_label,
                    "model_notes": "Predictions reflect observable facial movements and expression classifications, not candidate internal emotional state, competence, or psychological truth.",
                },
                "model": self.classifier_label,
                "error": str(e),
            }
        finally:
            if cap is not None:
                cap.release()
            if yunet_detector is not None:
                del yunet_detector
            if temp_normalized_path and os.path.exists(temp_normalized_path):
                try:
                    os.unlink(temp_normalized_path)
                except OSError:
                    pass

    def _aggregate_expression_sequence(
        self,
        sampled_emotions: List[Any],
        sampled_timestamps: Optional[List[float]] = None,
    ) -> Dict:
        """
        Aggregates frame-by-frame expression distributions across time:
        - Computes baseline resting state
        - Identifies active secondary expression
        - Detects peak expressive moment with timestamp
        - Determines dominant expression
        """
        from collections import Counter

        if not sampled_emotions:
            return {
                "dominant_expression": "Not Observed",
                "baseline_expression": "Not Observed",
                "secondary_expression": "None Observed",
                "expressive_ratio": 0.0,
                "peak_moment": None,
                "expression_distribution": {},
            }

        # Normalize elements to np.ndarray of shape (8,)
        normalized_emotions = []
        for item in sampled_emotions:
            if isinstance(item, dict):
                vec = np.array([float(item.get(lbl, 0.0)) for lbl in EMOTION_LABELS], dtype=np.float32)
                s = float(np.sum(vec))
                if s > 0:
                    vec = vec / s
                normalized_emotions.append(vec)
            elif isinstance(item, (list, tuple, np.ndarray)):
                vec = np.array(item, dtype=np.float32)
                s = float(np.sum(vec))
                if s > 0:
                    vec = vec / s
                normalized_emotions.append(vec)

        if not normalized_emotions:
            return {
                "dominant_expression": "Not Observed",
                "baseline_expression": "Not Observed",
                "secondary_expression": "None Observed",
                "expressive_ratio": 0.0,
                "peak_moment": None,
                "expression_distribution": {},
            }

        timestamps = sampled_timestamps or [float(i) for i in range(len(normalized_emotions))]

        avg_probs = np.mean(normalized_emotions, axis=0)
        distribution = {
            EMOTION_LABELS[i]: round(float(avg_probs[i]) * 100, 1)
            for i in range(len(EMOTION_LABELS))
        }

        baseline_idx = int(np.argmax(avg_probs))
        baseline_expression = EMOTION_LABELS[baseline_idx].capitalize()

        frame_top_indices = [int(np.argmax(p)) for p in normalized_emotions]
        non_neutral_indices = [idx for idx in frame_top_indices if EMOTION_LABELS[idx] != "neutral"]

        secondary_expression = "None Observed"
        peak_moment = None

        best_active_idx = None
        best_active_conf = 0.0
        best_active_frame_idx = -1

        for f_idx, probs in enumerate(normalized_emotions):
            for e_idx in range(1, len(EMOTION_LABELS)):
                c = float(probs[e_idx])
                if c > best_active_conf:
                    best_active_conf = c
                    best_active_idx = e_idx
                    best_active_frame_idx = f_idx

        if non_neutral_indices:
            nn_counts = Counter(non_neutral_indices)
            top_nn_idx, top_nn_count = nn_counts.most_common(1)[0]
            top_nn_label = EMOTION_LABELS[top_nn_idx].capitalize()
            max_conf_top = max(float(p[top_nn_idx]) for p in normalized_emotions)
            freq_ratio = top_nn_count / len(normalized_emotions)

            if freq_ratio >= 0.10 or max_conf_top >= 0.30:
                secondary_expression = top_nn_label
                peak_frame = max(range(len(normalized_emotions)), key=lambda k: float(normalized_emotions[k][top_nn_idx]))
                peak_moment = {
                    "expression": top_nn_label,
                    "confidence": round(max_conf_top * 100, 1),
                    "timestamp_seconds": round(timestamps[peak_frame], 1) if peak_frame < len(timestamps) else None,
                    "frame_frequency_ratio": round(freq_ratio, 2),
                }
        elif best_active_idx is not None and best_active_conf >= 0.35:
            active_label = EMOTION_LABELS[best_active_idx].capitalize()
            secondary_expression = active_label
            peak_moment = {
                "expression": active_label,
                "confidence": round(best_active_conf * 100, 1),
                "timestamp_seconds": round(timestamps[best_active_frame_idx], 1) if best_active_frame_idx < len(timestamps) else None,
                "frame_frequency_ratio": round(1.0 / len(normalized_emotions), 2),
            }

        expressive_ratio = round(len(non_neutral_indices) / max(1, len(normalized_emotions)), 3)

        if non_neutral_indices and (len(non_neutral_indices) / len(normalized_emotions)) >= 0.30:
            dominant_name = secondary_expression
        else:
            dominant_name = baseline_expression

        return {
            "dominant_expression": dominant_name,
            "baseline_expression": baseline_expression,
            "secondary_expression": secondary_expression,
            "expressive_ratio": expressive_ratio,
            "peak_moment": peak_moment,
            "expression_distribution": distribution,
        }

    def _extract_face(
        self,
        frame: np.ndarray,
        detector,
        frame_width: int,
        frame_height: int,
        return_count: bool = False,
    ):
        """
        Detects and crops the primary face from a frame with padding.
        Returns (face_crop, bounding_box) or (face_crop, bounding_box, face_count) if return_count=True.
        """
        if detector is not None:
            try:
                # If frame is large (e.g. > 640x480), scale down for fast YuNet detection
                if frame_width > 640 or frame_height > 480:
                    scale = min(640.0 / frame_width, 480.0 / frame_height)
                    det_w, det_h = int(frame_width * scale), int(frame_height * scale)
                    det_frame = cv2.resize(frame, (det_w, det_h), interpolation=cv2.INTER_AREA)
                    detector.setInputSize((det_w, det_h))
                    _, faces = detector.detect(det_frame)
                    face_count = len(faces) if faces is not None else 0
                    if faces is not None and len(faces) > 0:
                        largest = max(faces, key=lambda f: f[2] * f[3])
                        x = int(largest[0] / scale)
                        y = int(largest[1] / scale)
                        w = int(largest[2] / scale)
                        h = int(largest[3] / scale)
                        pad_w, pad_h = int(w * 0.1), int(h * 0.1)
                        x1 = max(0, x - pad_w)
                        y1 = max(0, y - pad_h)
                        x2 = min(frame_width, x + w + pad_w)
                        y2 = min(frame_height, y + h + pad_h)
                        face_crop = frame[y1:y2, x1:x2]
                        if face_crop.shape[0] >= 20 and face_crop.shape[1] >= 20:
                            return (face_crop, (x, y, w, h), face_count) if return_count else (face_crop, (x, y, w, h))
                else:
                    _, faces = detector.detect(frame)
                    face_count = len(faces) if faces is not None else 0
                    if faces is not None and len(faces) > 0:
                        largest_face = max(faces, key=lambda f: f[2] * f[3])
                        x, y, w, h = [int(v) for v in largest_face[:4]]
                        pad_w, pad_h = int(w * 0.1), int(h * 0.1)
                        x1 = max(0, x - pad_w)
                        y1 = max(0, y - pad_h)
                        x2 = min(frame_width, x + w + pad_w)
                        y2 = min(frame_height, y + h + pad_h)
                        face_crop = frame[y1:y2, x1:x2]
                        if face_crop.shape[0] >= 20 and face_crop.shape[1] >= 20:
                            return (face_crop, (x, y, w, h), face_count) if return_count else (face_crop, (x, y, w, h))
            except Exception as e:
                logger.debug(f"YuNet detection error: {e}")

        # Fallback: Haar Cascade only if supported and present on system
        if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades"):
            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
                if os.path.exists(cascade_path):
                    face_cascade = cv2.CascadeClassifier(cascade_path)
                    if not face_cascade.empty():
                        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
                        face_count = len(faces) if faces is not None else 0
                        if len(faces) > 0:
                            largest = max(faces, key=lambda b: b[2] * b[3])
                            x, y, w, h = largest
                            return (frame[y:y+h, x:x+w], (x, y, w, h), face_count) if return_count else (frame[y:y+h, x:x+w], (x, y, w, h))
            except Exception:
                pass

        return (None, (0, 0, 0, 0), 0) if return_count else (None, (0, 0, 0, 0))

    def _classify_face_expression(self, face_crop: np.ndarray) -> Optional[np.ndarray]:
        """Classifies probabilities across 8 emotions.

        Report profile: weighted per-frame ensemble of the DeepFace CNN and the
        Emotion-FERPlus CNN (DEEPFACE_ENSEMBLE_WEIGHT). Both are trained on the
        FER-2013 faces, but FERPlus uses labels re-annotated by 10 raters per
        image, which are known to be cleaner than the original single labels
        DeepFace learned from. On real interview webcam footage DeepFace alone
        over-read neutral faces as angry (bright, glasses, low camera angle)
        or happy (dark, blue-lit room) when the visible expression was
        neutral; the weighted ensemble tracked the visible expression while
        still using DeepFace as the report specifies ("DeepFace / CNN Models").
        Lite profile: Emotion-FERPlus only.
        """
        if self.using_deepface:
            df_probs = self._classify_with_deepface(face_crop)
            fer_probs = self._classify_with_ferplus(face_crop)
            if df_probs is not None and fer_probs is not None:
                w = DEEPFACE_ENSEMBLE_WEIGHT
                avg = w * df_probs + (1.0 - w) * fer_probs
                return (avg / avg.sum()).astype(np.float32)
            return df_probs if df_probs is not None else fer_probs
        return self._classify_with_ferplus(face_crop)

    def _classify_with_ferplus(self, face_crop: np.ndarray) -> Optional[np.ndarray]:
        if self.ort_session is None:
            logger.warning("Emotion-FERPlus model session is uninitialized; facial expression analysis unavailable.")
            return None

        try:
            # Preprocess to 1x1x64x64 float32 grayscale
            gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
            resized = cv2.resize(gray, (64, 64), interpolation=cv2.INTER_AREA).astype(np.float32)
            tensor = np.expand_dims(np.expand_dims(resized, axis=0), axis=0)

            # ONNX Inference using cached input tensor name
            input_name = getattr(self, "_fer_input_name", None)
            if not input_name:
                input_name = self.ort_session.get_inputs()[0].name
                self._fer_input_name = input_name
            logits = self.ort_session.run(None, {input_name: tensor})[0][0]

            # Softmax
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)
            return probs.astype(np.float32)
        except Exception as e:
            logger.debug(f"Emotion classification inference notice: {e}")
            return None

    def _derive_indicators(
        self,
        presence_ratio: float,
        distribution: Dict[str, float],
        face_centers_x: List[float],
    ) -> Tuple[str, str, str]:
        """
        Derives report-aligned behavioral indicators:
        - Engagement Level: Based on continuous eye/face presence and horizontal framing stability.
        - Composure Index: Reflects emotional stability vs rapid agitated expression shifts.
        - Observable Tension: Reflects elevated fear/anger/sadness expression signals.
        """
        # 1. Engagement Level
        center_variance = float(np.var(face_centers_x)) if len(face_centers_x) > 1 else 0.0
        if presence_ratio >= 0.85 and center_variance < 0.04:
            engagement_level = "High"
        elif presence_ratio >= 0.60:
            engagement_level = "Moderate"
        else:
            engagement_level = "Low (Gaze Disengaged)"

        # 2. Composure Index
        positive_stable = distribution.get("neutral", 0.0) + distribution.get("happiness", 0.0)
        negative_agitated = distribution.get("anger", 0.0) + distribution.get("fear", 0.0) + distribution.get("disgust", 0.0)

        if positive_stable >= 70.0 and negative_agitated < 15.0:
            composure_index = "Composed & Stable"
        elif positive_stable >= 50.0:
            composure_index = "Moderate Composure"
        else:
            composure_index = "Fluctuating Composure"

        # 3. Observable Tension
        if negative_agitated >= 25.0:
            observable_tension = "Elevated"
        elif negative_agitated >= 12.0:
            observable_tension = "Moderate"
        else:
            observable_tension = "Low"

        return engagement_level, composure_index, observable_tension
