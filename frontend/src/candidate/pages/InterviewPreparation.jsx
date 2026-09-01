import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Camera, 
  Mic, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Check, 
  RefreshCw 
} from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [cameraStatus, setCameraStatus] = useState('idle'); // idle | granted | denied
  const [micStatus, setMicStatus] = useState('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    getActiveInterview(id)
      .then((data) => {
        if (!data) {
          navigate('/interview/goal');
          return;
        }
        setInterview(data);
      })
      .catch(() => {
        navigate('/interview/goal');
      })
      .finally(() => {
        setLoading(false);
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

      // Real-time mic level meter via Web Audio API (signal processing)
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
      setPermissionError('Camera and microphone access is required to proceed. Please grant permissions in your browser bar and try again.');
    }
  };

  const readyToBegin = cameraStatus === 'granted' && micStatus === 'granted';

  const handleBegin = () => {
    // Stop preview stream before entering the simulator
    streamRef.current?.getTracks().forEach((t) => t.stop());
    navigate(`/interview/${id}/session`);
  };

  const handleChangeGoal = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    navigate('/interview/goal');
  };

  if (loading) {
    return (
      <InterviewFlowLayout step="prepare">
        <div className="max-w-5xl mx-auto py-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--c-text-secondary)' }}>
            Retrieving interview configuration…
          </p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (!interview) return null;

  const questionCount = interview.questions?.length || 0;
  const isBehavioral = interview.type === 'behavioral';
  const minDuration = Math.max(5, questionCount * 2);
  const maxDuration = Math.max(10, questionCount * 3);

  return (
    <InterviewFlowLayout step="prepare">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Editorial Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={handleChangeGoal}
              className="c-btn c-btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Target Goal</span>
            </button>
            <span style={{ color: 'var(--c-border-strong)' }}>/</span>
            <span className="c-eyebrow">Session Setup</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)', background: 'var(--c-surface-muted)' }}>
              REF: {id.slice(-6).toUpperCase()}
            </span>
            <span className={`c-badge ${isBehavioral ? 'c-badge-warning' : 'c-badge-accent'}`}>
              {isBehavioral ? 'Behavioral & Leadership' : 'Technical & Engineering'}
            </span>
          </div>
        </div>

        {/* Hero Title & Context Section */}
        <div className="space-y-3">
          <p className="c-eyebrow">Readiness & Calibration</p>
          <h1 className="c-heading text-3xl sm:text-4xl md:text-5xl leading-tight">
            {interview.role}
          </h1>
          <p className="text-base sm:text-lg max-w-3xl leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
            Review your session configuration, verify your camera and microphone audio levels, and begin when you are positioned in a quiet environment.
          </p>
        </div>

        {/* Main Two-Column Studio Calibration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Live Audio/Video Monitor & Device Calibration (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Camera Viewfinder */}
            <div 
              className="c-card overflow-hidden relative flex flex-col justify-between"
              style={{ 
                aspectRatio: '16/10',
                background: 'var(--c-surface-muted)',
                borderColor: cameraStatus === 'granted' ? 'var(--c-border-strong)' : 'var(--c-border)'
              }}
            >
              {cameraStatus === 'granted' ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                    style={{ 
                      background: 'var(--c-surface)', 
                      borderColor: 'var(--c-border)',
                      color: 'var(--c-accent)'
                    }}
                  >
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                      Visual Sensor Inactive
                    </p>
                    <p className="text-xs max-w-xs" style={{ color: 'var(--c-text-secondary)' }}>
                      Authorize camera access below to verify your lighting, framing, and posture.
                    </p>
                  </div>
                </div>
              )}

              {/* Viewfinder Top Bar Overlay */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2">
                  <span 
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider font-semibold border backdrop-blur-md"
                    style={{
                      background: cameraStatus === 'granted' ? 'rgba(75, 107, 79, 0.9)' : 'rgba(33, 28, 23, 0.75)',
                      color: '#ffffff',
                      borderColor: 'rgba(255,255,255,0.15)'
                    }}
                  >
                    {cameraStatus === 'granted' ? '● Live Feed' : 'Offline'}
                  </span>
                </div>

                <div 
                  className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest border backdrop-blur-md"
                  style={{
                    background: 'rgba(33, 28, 23, 0.6)',
                    color: '#ffffff',
                    borderColor: 'rgba(255,255,255,0.1)'
                  }}
                >
                  HD 1080p
                </div>
              </div>

              {/* Viewfinder Bottom Audio Overlay when live */}
              {cameraStatus === 'granted' && (
                <div className="absolute bottom-3 inset-x-3 pointer-events-none">
                  <div 
                    className="px-3 py-2 rounded-lg backdrop-blur-md border flex items-center gap-3"
                    style={{
                      background: 'rgba(20, 16, 13, 0.75)',
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      color: '#ffffff'
                    }}
                  >
                    <Mic className="w-3.5 h-3.5 shrink-0" style={{ color: micLevel > 15 ? 'var(--c-success)' : 'var(--c-text-muted)' }} />
                    <div className="flex-1 flex items-center gap-1 h-3">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const threshold = (i + 1) * 5;
                        const active = micLevel >= threshold;
                        return (
                          <div 
                            key={i} 
                            className="flex-1 h-full rounded-sm transition-all duration-75"
                            style={{
                              background: active 
                                ? (i > 15 ? 'var(--c-danger)' : 'var(--c-success)')
                                : 'rgba(255, 255, 255, 0.15)'
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-mono w-7 text-right">
                      {micLevel}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Hardware Checklist & Authorization Status */}
            <div className="c-card p-5 sm:p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                Equipment Verification
              </h3>

              <div className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
                {/* Camera Row */}
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ 
                        background: cameraStatus === 'granted' ? 'var(--c-success-soft)' : 'var(--c-surface-muted)',
                        color: cameraStatus === 'granted' ? 'var(--c-success)' : 'var(--c-text)'
                      }}
                    >
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Camera</p>
                      <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>
                        Required for response video recording
                      </p>
                    </div>
                  </div>

                  <div>
                    {cameraStatus === 'granted' ? (
                      <span className="c-badge c-badge-success flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : cameraStatus === 'denied' ? (
                      <span className="c-badge c-badge-danger flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Blocked
                      </span>
                    ) : (
                      <span className="c-badge c-badge-muted">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Microphone Row */}
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ 
                        background: micStatus === 'granted' ? 'var(--c-success-soft)' : 'var(--c-surface-muted)',
                        color: micStatus === 'granted' ? 'var(--c-success)' : 'var(--c-text)'
                      }}
                    >
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Microphone</p>
                      <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>
                        Required for spoken speech transcription
                      </p>
                    </div>
                  </div>

                  <div>
                    {micStatus === 'granted' ? (
                      <span className="c-badge c-badge-success flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : micStatus === 'denied' ? (
                      <span className="c-badge c-badge-danger flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Blocked
                      </span>
                    ) : (
                      <span className="c-badge c-badge-muted">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Permission Error Banner if Denied */}
              {permissionError && (
                <div className="c-badge-danger rounded-xl p-4 flex items-start gap-3 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Hardware Access Denied</p>
                    <p>{permissionError}</p>
                  </div>
                </div>
              )}

              {/* Action Button: Authorize vs Begin */}
              <div className="pt-2">
                {!readyToBegin ? (
                  <button 
                    onClick={requestPermissions}
                    className="c-btn c-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Authorize Camera & Microphone</span>
                  </button>
                ) : (
                  <button 
                    onClick={handleBegin}
                    className="c-btn c-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
                  >
                    <span>Begin Interview Session</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Session Specification Ledger & Protocol (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Session Specifications Ledger Card */}
            <div className="c-card p-6 space-y-5">
              <div className="border-b pb-3" style={{ borderColor: 'var(--c-border)' }}>
                <p className="c-eyebrow">Specifications</p>
                <h2 className="c-heading text-lg mt-0.5">Session Ledger</h2>
              </div>

              <dl className="divide-y text-xs sm:text-sm" style={{ borderColor: 'var(--c-border)' }}>
                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Target Discipline</dt>
                  <dd className="font-semibold text-right" style={{ color: 'var(--c-text)' }}>
                    {interview.role}
                  </dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Interview Track</dt>
                  <dd className="font-semibold text-right capitalize" style={{ color: 'var(--c-text)' }}>
                    {interview.type || 'Technical'}
                  </dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Question Volume</dt>
                  <dd className="font-semibold text-right c-serif-num text-sm" style={{ color: 'var(--c-text)' }}>
                    {questionCount} Prompts
                  </dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Estimated Runtime</dt>
                  <dd className="font-semibold text-right c-serif-num text-sm" style={{ color: 'var(--c-text)' }}>
                    ~{minDuration}–{maxDuration} Minutes
                  </dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Response Modality</dt>
                  <dd className="font-semibold text-right" style={{ color: 'var(--c-text)' }}>
                    Spoken Video & Audio
                  </dd>
                </div>
              </dl>
            </div>

            {/* Structured Protocol (What Happens During the Interview) */}
            <div className="c-card p-6 space-y-4">
              <div className="border-b pb-3" style={{ borderColor: 'var(--c-border)' }}>
                <p className="c-eyebrow">Conduct</p>
                <h2 className="c-heading text-lg mt-0.5">Interview Protocol</h2>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5" style={{ borderColor: 'var(--c-border-strong)', color: 'var(--c-accent)' }}>
                    01
                  </span>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--c-text)' }}>Prompt Presentation</p>
                    <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
                      Questions are displayed sequentially. Take a moment to formulate your thoughts before starting your recording.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5" style={{ borderColor: 'var(--c-border-strong)', color: 'var(--c-accent)' }}>
                    02
                  </span>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--c-text)' }}>Controlled Capture</p>
                    <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
                      Recording is active only while answering. You have full manual control to begin and complete each response.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5" style={{ borderColor: 'var(--c-accent)', color: 'var(--c-accent)' }}>
                    03
                  </span>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--c-text)' }}>Automated Ingestion</p>
                    <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
                      Upon stopping a take, your spoken response is stored and processed by the transcription engine.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy and Integrity Ledger */}
            <div className="c-card-flat p-5 space-y-2 rounded-2xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text)' }}>
                  Candidate Privacy Guarantee
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Media streams are only recorded when you explicitly press "Start Answering". No passive or background recording takes place during preparation or between questions.
              </p>
            </div>

          </div>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewPreparation;
