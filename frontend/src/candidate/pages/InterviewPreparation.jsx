import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Mic, CheckCircle2, AlertCircle, ArrowRight, Lightbulb, Volume2 } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview } from '../services/candidateApi';

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
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Let's get set up</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {interview.role} · {interview.questions.length} questions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Camera preview */}
          <div className="glass-card rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center">
            {cameraStatus === 'granted' ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                <Camera className="w-10 h-10" />
                <span className="text-xs font-medium">Camera preview will appear here</span>
              </div>
            )}
            {cameraStatus === 'granted' && (
              <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE PREVIEW
              </span>
            )}
          </div>

          {/* Checklist & controls */}
          <div className="flex flex-col gap-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Camera</span>
                </div>
                <StatusPill status={cameraStatus} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Microphone</span>
                </div>
                <StatusPill status={micStatus} />
              </div>

              {micStatus === 'granted' && (
                <div className="mt-3 flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--border-table)] overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-100" style={{ width: `${micLevel}%` }} />
                  </div>
                </div>
              )}
            </div>

            {!readyToBegin ? (
              <button
                onClick={requestPermissions}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
              >
                Enable Camera & Microphone
              </button>
            ) : (
              <button
                onClick={handleBegin}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Begin Interview <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {permissionError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {permissionError}
              </div>
            )}

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Before you begin</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> Sit in a well-lit, quiet space</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> Frame your face clearly in the camera</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> You can navigate questions manually — take your time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

const StatusPill = ({ status }) => {
  if (status === 'granted') {
    return <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Ready</span>;
  }
  if (status === 'denied') {
    return <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">Blocked</span>;
  }
  return <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">Not Enabled</span>;
};

export default InterviewPreparation;
