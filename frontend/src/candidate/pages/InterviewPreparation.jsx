import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Mic, CheckCircle2, AlertCircle, ArrowRight, Lightbulb, Volume2, ShieldCheck } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview } from '../services/candidateApi';
import { CANDIDATE_IMAGES } from '../assets/images';

const StatusPill = ({ status }) => {
  if (status === 'granted') return <span className="c-badge c-badge-success">Ready</span>;
  if (status === 'denied') return <span className="c-badge c-badge-danger">Blocked</span>;
  return <span className="c-badge c-badge-muted">Not Enabled</span>;
};

// FR06 - Start Mock Interview (camera/mic permission), FR32 - Interview Environment Preparation
const InterviewPreparation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);

  const [interview, setInterview] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('idle'); // idle | granted | denied
  const [micStatus, setMicStatus] = useState('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    getActiveInterview(id).then((data) => {
      if (!data) {
        navigate('/interview/goal');
        return;
      }
      setInterview(data);
    });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const requestPermissions = async () => {
    setPermissionError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setCameraStatus('granted');
      setMicStatus('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Real-time mic level meter via Web Audio API (signal processing, not AI).
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      setCameraStatus('denied');
      setMicStatus('denied');
      setPermissionError('Camera and microphone access is required to begin. Please allow permissions in your browser and try again.');
    }
  };

  const readyToBegin = cameraStatus === 'granted' && micStatus === 'granted';

  const handleBegin = () => {
    // Stop the preview stream here; the Simulator screen requests its own
    // fresh stream so recording starts cleanly per FR33 (controlled capture).
    streamRef.current?.getTracks().forEach((t) => t.stop());
    navigate(`/interview/${id}/session`);
  };

  if (!interview) return null;

  return (
    <InterviewFlowLayout step="prepare">
      <div className="max-w-4xl mx-auto">
        {/* Header card: selected interview + a touch of visual storytelling */}
        <div className="c-card rounded-3xl overflow-hidden grid grid-cols-1 sm:grid-cols-5 mb-6">
          <div className="sm:col-span-3 p-7 flex flex-col justify-center gap-2">
            <p className="c-eyebrow">Let's get set up</p>
            <h1 className="c-heading text-2xl leading-snug">{interview.role}</h1>
            <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>
              {interview.questions.length} questions · {interview.type === 'behavioral' ? 'Behavioral' : 'Technical'} interview
            </p>
          </div>
          <div className="hidden sm:block sm:col-span-2 relative min-h-[140px]">
            <img src={CANDIDATE_IMAGES.preparationHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Camera preview */}
          <div className="c-card rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center">
            {cameraStatus === 'granted' ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2" style={{ color: 'var(--c-text-muted)' }}>
                <Camera className="w-9 h-9" />
                <span className="text-xs font-medium">Camera preview will appear here</span>
              </div>
            )}
            {cameraStatus === 'granted' && (
              <span className="absolute top-3 left-3 c-badge c-badge-success">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-success)' }} /> Live Preview
              </span>
            )}
          </div>

          {/* Checklist & controls */}
          <div className="flex flex-col gap-4">
            <div className="c-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
                  <span className="text-sm font-semibold">Camera</span>
                </div>
                <StatusPill status={cameraStatus} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
                  <span className="text-sm font-semibold">Microphone</span>
                </div>
                <StatusPill status={micStatus} />
              </div>

              {micStatus === 'granted' && (
                <div className="mt-3 flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--c-text-muted)' }} />
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-border)' }}>
                    <div className="h-full transition-all duration-100" style={{ width: `${micLevel}%`, background: 'var(--c-success)' }} />
                  </div>
                </div>
              )}
            </div>

            {!readyToBegin ? (
              <button onClick={requestPermissions} className="c-btn c-btn-primary w-full py-3">
                Enable Camera & Microphone
              </button>
            ) : (
              <button onClick={handleBegin} className="c-btn c-btn-primary w-full py-3">
                Begin Interview <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {permissionError && (
              <div className="c-badge-danger rounded-xl p-3.5 flex items-start gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {permissionError}
              </div>
            )}

            <div className="c-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2.5">
                <Lightbulb className="w-4 h-4" style={{ color: 'var(--c-warning)' }} />
                <span className="text-sm font-semibold">Before you begin</span>
              </div>
              <ul className="space-y-1.5 text-xs" style={{ color: 'var(--c-text-secondary)' }}>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--c-success)' }} /> Sit in a well-lit, quiet space</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--c-success)' }} /> Frame your face clearly in the camera</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--c-success)' }} /> You can navigate questions manually — take your time</li>
              </ul>
            </div>

            <div className="c-card-flat rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
                <span className="text-sm font-semibold">Your privacy</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Recording only happens while you're actively answering a question. It stops the moment you pause or finish,
                nothing is captured in the background, and each response is uploaded securely for review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewPreparation;
