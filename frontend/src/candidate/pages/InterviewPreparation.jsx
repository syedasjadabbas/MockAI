import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Camera,
  Mic,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import CandidateEmptyState from '../components/CandidateEmptyState';
import { getActiveInterview } from '../services/candidateApi';
import {
  CornerReticles,
  OpticalLensReticle,
  LiveAudioWaveform,
  TechnicalHUDTag,
} from '../components/TechnicalDoodles';

const InterviewPreparation = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hardware states: 'idle' | 'prompting' | 'granted' | 'denied'
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [micStatus, setMicStatus] = useState('idle');
  const [permissionError, setPermissionError] = useState('');

  // Audio stream & analysis
  const [micLevel, setMicLevel] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Load interview metadata
  useEffect(() => {
    let mounted = true;
    getActiveInterview(id)
      .then((data) => {
        if (!mounted) return;
        if (!data) {
          navigate('/interview/goal');
          return;
        }
        setInterview(data);
      })
      .catch(() => {
        if (mounted) navigate('/interview/goal');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  // Request real Camera & Microphone access via Web APIs
  const requestPermissions = async () => {
    setPermissionError('');
    setCameraStatus('prompting');
    setMicStatus('prompting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setCameraStatus('granted');
      setMicStatus('granted');

      // Attach video stream to live viewfinder
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize Web Audio API Analyser for real-time mic volume level
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateMicLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate RMS volume level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const normalized = Math.min(100, Math.round((rms / 128) * 100));
          setMicLevel(normalized);

          animFrameRef.current = requestAnimationFrame(updateMicLevel);
        };

        updateMicLevel();
      } catch (audioErr) {
        console.warn('AudioContext analyser could not be initialized:', audioErr);
      }
    } catch (err) {
      console.error('Media permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setMicStatus('denied');
        setPermissionError(
          'Camera and microphone permissions were blocked. Please allow device access in your browser address bar to proceed.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('denied');
        setMicStatus('denied');
        setPermissionError('No camera or microphone devices were detected on your system.');
      } else {
        setCameraStatus('denied');
        setMicStatus('denied');
        setPermissionError(err.message || 'Could not connect to media devices.');
      }
    }
  };

  // Clean up media streams and audio context on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleBegin = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigate(`/interview/${id}/session`);
  };

  if (loading) {
    return (
      <InterviewFlowLayout step="prepare">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-muted)' }}>Preparing studio…</p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (!interview) return null;

  const questionCount = interview.questions?.length || 5;
  const minDuration = Math.round(questionCount * 1.5);
  const maxDuration = Math.round(questionCount * 2.5);
  const readyToBegin = cameraStatus === 'granted' && micStatus === 'granted';

  return (
    <InterviewFlowLayout step="prepare">
      <div className="max-w-5xl mx-auto space-y-8 py-4 sm:py-6">
        
        {/* Header directly on page */}
        <div className="border-b pb-6" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2 text-xs mb-1.5" style={{ color: 'var(--c-text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--c-text)' }}>Practice Studio</span>
            <span>/</span>
            <span className="capitalize">{interview.type || 'Technical'} Track</span>
          </div>
          <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
            {interview.role}
          </h1>
          <p className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
            Calibrate your audio and video sensors, verify background lighting, and enter the studio when you are ready.
          </p>
        </div>

        {/* Two-Column Studio Calibration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Live Video Monitor & Sensor Auth (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* LEVEL 3 — Camera Viewfinder (Standalone interactive video monitor) */}
            <div 
              className="overflow-hidden relative flex flex-col justify-between rounded-lg border shadow-sm group"
              style={{ 
                aspectRatio: '16/10',
                background: 'var(--c-surface-card)',
                borderColor: cameraStatus === 'granted' ? 'var(--c-accent)' : 'var(--c-border)',
              }}
            >
              <CornerReticles size={12} color={cameraStatus === 'granted' ? 'var(--c-accent)' : 'var(--c-border)'} />

              {cameraStatus === 'granted' ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 relative">
                  <div className="text-slate-400 dark:text-slate-600 opacity-60 mb-1">
                    <OpticalLensReticle size={56} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold" style={{ color: 'var(--c-text)' }}>
                      Camera & Microphone Inactive
                    </p>
                    <p className="text-[11px] max-w-xs" style={{ color: 'var(--c-text-muted)' }}>
                      Authorize hardware access below to verify audio clarity and framing.
                    </p>
                  </div>
                </div>
              )}

              {/* Viewfinder Top Bar Overlay */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                  style={{
                    background: cameraStatus === 'granted' ? 'var(--c-badge-success-bg)' : 'var(--c-badge-muted-bg)',
                    color: cameraStatus === 'granted' ? 'var(--c-badge-success-text)' : 'var(--c-badge-muted-text)',
                    borderColor: 'var(--c-border)'
                  }}
                >
                  {cameraStatus === 'granted' ? '● SENSOR ACTIVE' : 'OFFLINE'}
                </span>

                <div className="flex items-center gap-2">
                  {cameraStatus === 'granted' && micStatus === 'granted' && (
                    <LiveAudioWaveform bars={8} height={14} color="var(--c-accent)" />
                  )}
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-mono border"
                    style={{
                      background: 'var(--c-surface-card)',
                      borderColor: 'var(--c-border)',
                      color: 'var(--c-text)'
                    }}
                  >
                    1080p
                  </span>
                </div>
              </div>

              {/* Audio Overlay on Live Viewfinder */}
              {cameraStatus === 'granted' && (
                <div className="absolute bottom-3 inset-x-3 pointer-events-none">
                  <div 
                    className="px-3 py-1.5 rounded-md border flex items-center justify-between gap-2.5"
                    style={{
                      background: 'var(--c-surface-card)',
                      borderColor: 'var(--c-border)',
                      color: 'var(--c-text)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="text-[10px] font-mono">INPUT LEVEL</span>
                    </div>
                    <LiveAudioWaveform bars={12} height={12} color="var(--c-accent)" />
                  </div>
                </div>
              )}
            </div>

            {/* LEVEL 2 — Equipment Verification Rows (No nested box container) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                Equipment Status
              </h3>

              <div className="divide-y text-xs border-t border-b" style={{ borderColor: 'var(--c-border)' }}>
                {/* Camera Row */}
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-7 h-7 rounded flex items-center justify-center border"
                      style={{ 
                        background: 'var(--c-surface-muted)', 
                        borderColor: 'var(--c-border)',
                        color: cameraStatus === 'granted' ? 'var(--c-success)' : 'var(--c-text-muted)'
                      }}
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--c-text)' }}>Camera Sensor</p>
                      <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
                        Response video recording
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
                      <span className="c-badge c-badge-muted">Pending</span>
                    )}
                  </div>
                </div>

                {/* Microphone Row */}
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-7 h-7 rounded flex items-center justify-center border"
                      style={{ 
                        background: 'var(--c-surface-muted)', 
                        borderColor: 'var(--c-border)',
                        color: micStatus === 'granted' ? 'var(--c-success)' : 'var(--c-text-muted)'
                      }}
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--c-text)' }}>Microphone Input</p>
                      <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
                        Spoken speech transcription
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
                      <span className="c-badge c-badge-muted">Pending</span>
                    )}
                  </div>
                </div>
              </div>

              {permissionError && (
                <div className="c-badge-danger rounded-md p-3 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{permissionError}</p>
                </div>
              )}

              <div className="pt-2">
                {!readyToBegin ? (
                  <button 
                    onClick={requestPermissions}
                    className="c-btn c-btn-primary w-full py-3 text-xs font-bold rounded-md flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Authorize Camera & Microphone</span>
                  </button>
                ) : (
                  <button 
                    onClick={handleBegin}
                    className="c-btn c-btn-primary w-full py-3 text-xs font-bold rounded-md flex items-center justify-center gap-2"
                  >
                    <span>Begin Interview Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Session Ledger & Protocol (5 cols) — Open editorial layout */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Session Specifications Ledger */}
            <div className="space-y-3">
              <div className="border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                <p className="c-eyebrow mb-0.5">Specifications</p>
                <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>Session Overview</h2>
              </div>

              <dl className="divide-y text-xs" style={{ borderColor: 'var(--c-border)' }}>
                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Target Role</dt>
                  <dd className="font-bold text-right" style={{ color: 'var(--c-text)' }}>{interview.role}</dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Track</dt>
                  <dd className="font-bold text-right capitalize" style={{ color: 'var(--c-text)' }}>{interview.type || 'Technical'}</dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Question Volume</dt>
                  <dd className="font-bold text-right font-mono" style={{ color: 'var(--c-text)' }}>{questionCount} Prompts</dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Estimated Runtime</dt>
                  <dd className="font-bold text-right font-mono" style={{ color: 'var(--c-text)' }}>~{minDuration}–{maxDuration} Min</dd>
                </div>
              </dl>
            </div>

            {/* Structured Protocol */}
            <div className="space-y-3">
              <div className="border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                <p className="c-eyebrow mb-0.5">Instructions</p>
                <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>Protocol & Rules</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0"
                    style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)', background: 'var(--c-surface-muted)' }}
                  >
                    01
                  </span>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--c-text)' }}>Sequential Questions</p>
                    <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
                      Formulate your response before initiating recording.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0"
                    style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)', background: 'var(--c-surface-muted)' }}
                  >
                    02
                  </span>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--c-text)' }}>Manual Capture</p>
                    <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
                      Recording is active only while answering each take.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--c-border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-[11px]" style={{ color: 'var(--c-text)' }}>Privacy Guarantee</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Sensors are only recorded during active answering takes. Video slices are safely transmitted for evaluation processing.
              </p>
            </div>

          </div>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewPreparation;
