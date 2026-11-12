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
  Keyboard,
  VideoOff,
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import CandidateEmptyState from '../components/CandidateEmptyState';
import { getActiveInterview, recordConsent } from '../services/candidateApi';
import { CANDIDATE_IMAGES } from '../assets/images';
import { CornerReticles, OpticalLensReticle } from '../components/TechnicalDoodles';
import AudioLevelMeter from '../components/AudioLevelMeter';

const InterviewPreparation = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hardware states: 'idle' | 'prompting' | 'granted' | 'denied'
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [micStatus, setMicStatus] = useState('idle');
  const [permissionError, setPermissionError] = useState('');
  // NFR 10 - explicit, separate consent for each device before it is
  // activated. The microphone is needed for spoken answers; the camera is
  // optional (without it the interview is voice-only).
  const [micConsent, setMicConsent] = useState(false);
  const [cameraConsent, setCameraConsent] = useState(false);
  // NFR 11 - optional, separate permission to reuse recordings to improve
  // MockAI's accuracy. Off by default; assessment works without it.
  const [researchConsent, setResearchConsent] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [continuingTextOnly, setContinuingTextOnly] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
    if (!micConsent) {
      setPermissionError('Please confirm microphone consent before enabling your devices.');
      return;
    }
    setPermissionError('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setCameraStatus(cameraConsent ? 'prompting' : 'idle');
    setMicStatus('prompting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraConsent
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setMediaStream(stream);
      setCameraStatus(cameraConsent ? 'granted' : 'idle');
      setMicStatus('granted');

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

  // The <video> element only exists once the camera is granted, so the
  // stream is attached after that render (attaching it inside
  // requestPermissions found no element and left the preview blank).
  useEffect(() => {
    if (cameraStatus === 'granted' && videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [cameraStatus, mediaStream]);

  // Clean up media streams on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // NFR 10 - the backend refuses recordings without a stored consent
  // record, so save it before entering the session.
  const handleBegin = async () => {
    setSavingConsent(true);
    setPermissionError('');
    try {
      await recordConsent(id, { microphone: true, camera: cameraConsent, researchUse: researchConsent });
    } catch (e) {
      setPermissionError(e.message || 'Could not save your recording consent. Please try again.');
      setSavingConsent(false);
      return;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigate(`/interview/${id}/session`, { state: { voiceOnly: !cameraConsent } });
  };

  // Objective 1 - answer by typing instead of speaking. No camera or
  // microphone is activated in this mode; declining is recorded too.
  const handleTextOnly = async () => {
    setContinuingTextOnly(true);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      await recordConsent(id, { microphone: false, camera: false, researchUse: researchConsent });
    } catch (e) {
      console.warn('Consent record notice:', e);
    }
    navigate(`/interview/${id}/session`, { state: { textOnly: true } });
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
  const readyToBegin = micStatus === 'granted' && (!cameraConsent || cameraStatus === 'granted');

  return (
    <InterviewFlowLayout step="prepare">
      <div className="space-y-8 py-4 sm:py-6">
        
        {/* Header directly on page */}
        <div className="border-b pb-6" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2 text-xs mb-1.5" style={{ color: 'var(--c-text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--c-text)' }}>Practice interview</span>
            <span>/</span>
            <span className="capitalize">{interview.type || 'Technical'} Track</span>
          </div>
          <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
            {interview.role}
          </h1>
          <p className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
Check that your camera and microphone work and that your face is well lit, then start when you're ready.
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
                  <div className="absolute inset-0 overflow-hidden rounded-lg">
                    <img
                      src={CANDIDATE_IMAGES.studioMic}
                      alt=""
                      className="w-full h-full object-cover opacity-25"
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--c-surface-card) 20%, transparent 80%)' }} />
                  </div>
                  <div className="relative z-10 text-slate-400 dark:text-slate-600 opacity-60 mb-1">
                    <OpticalLensReticle size={56} />
                  </div>
                  <div className="relative z-10 space-y-0.5">
                    <p className="text-xs font-bold" style={{ color: 'var(--c-text)' }}>
                      {micStatus === 'granted' ? 'Voice-only interview' : 'Camera and microphone are off'}
                    </p>
                    <p className="text-[11px] max-w-xs" style={{ color: 'var(--c-text-muted)' }}>
                      {micStatus === 'granted'
                        ? 'Your microphone is on. The camera stays off, so no video is recorded and facial analysis is skipped.'
                        : 'Turn them on below to check your framing and sound.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Viewfinder Top Bar Overlay */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                <span 
                  className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                  style={{
                    background: cameraStatus === 'granted' ? 'var(--c-badge-success-bg)' : 'var(--c-badge-muted-bg)',
                    color: cameraStatus === 'granted' ? 'var(--c-badge-success-text)' : 'var(--c-badge-muted-text)',
                    borderColor: 'var(--c-border)'
                  }}
                >
                  {cameraStatus === 'granted' ? 'Camera on' : 'Camera off'}
                </span>
                {micStatus === 'granted' && (
                  <AudioLevelMeter stream={mediaStream} bars={8} height={14} color="var(--c-accent)" />
                )}
              </div>

              {cameraStatus === 'granted' && (
                <div className="absolute bottom-3 inset-x-3 pointer-events-none" aria-hidden="true">
                  <div
                    className="px-3 py-1.5 rounded-md border flex items-center justify-between gap-2.5"
                    style={{ background: 'var(--c-surface-card)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                  >
                    <Mic className="w-3.5 h-3.5 text-[var(--c-text-muted)] shrink-0" />
                    <AudioLevelMeter stream={mediaStream} bars={12} height={12} color="var(--c-accent)" />
                  </div>
                </div>
              )}

            </div>

            {/* LEVEL 2 — Equipment Verification Rows (No nested box container) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                Your devices
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
                      <p className="font-bold" style={{ color: 'var(--c-text)' }}>Camera</p>
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
                    ) : micStatus === 'granted' && !cameraConsent ? (
                      <span className="c-badge c-badge-muted">Off (voice only)</span>
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

              {/* NFR 10 - Consent-Based Recording: separate consent per device */}
              {!readyToBegin && (
                <div className="space-y-2">
                  {[
                    {
                      key: 'mic', checked: micConsent, onChange: setMicConsent, required: true,
                      title: 'Microphone consent (required to speak your answers).',
                      text: 'MockAI may record my microphone audio while I am answering a question, to transcribe and assess my answer.',
                    },
                    {
                      key: 'camera', checked: cameraConsent, onChange: setCameraConsent, required: false,
                      title: 'Camera consent (optional).',
                      text: 'MockAI may record my webcam video while I am answering, to give feedback on facial expression and camera presence. Leave this unticked for a voice-only interview.',
                    },
                    {
                      key: 'research', checked: researchConsent, onChange: setResearchConsent, required: false,
                      title: 'Help improve MockAI (optional).',
                      text: 'My recordings and transcripts may also be used, without my name, to check and improve the accuracy of MockAI. Without this, they are used only to assess this interview.',
                    },
                  ].map((c) => (
                    <label
                      key={c.key}
                      className="flex items-start gap-3 rounded-md border p-3 text-xs cursor-pointer"
                      style={{ borderColor: c.checked ? 'var(--c-accent)' : 'var(--c-border)', background: 'var(--c-surface-muted)' }}
                    >
                      <input
                        type="checkbox"
                        checked={c.checked}
                        onChange={(e) => { c.onChange(e.target.checked); if (e.target.checked) setPermissionError(''); }}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
                        aria-required={c.required}
                      />
                      <span className="leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                        <strong style={{ color: 'var(--c-text)' }}>{c.title}</strong>{' '}{c.text}
                      </span>
                    </label>
                  ))}
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
                    A red REC indicator is shown whenever recording is active. Your results are practice feedback, never a hiring decision.
                  </p>
                </div>
              )}

              <div className="pt-2 space-y-2">
                {!readyToBegin ? (
                  <>
                    <button 
                      onClick={requestPermissions}
                      disabled={!micConsent}
                      className="c-btn c-btn-primary w-full py-3 text-xs font-bold rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{cameraConsent ? 'Turn on camera and microphone' : 'Turn on microphone (voice only)'}</span>
                    </button>
                    <button
                      onClick={handleTextOnly}
                      disabled={continuingTextOnly}
                      className="c-btn c-btn-secondary w-full py-2.5 text-xs font-semibold rounded-md flex items-center justify-center gap-2 !whitespace-normal text-center"
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>Continue with typed answers only (no camera or mic)</span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleBegin}
                    disabled={savingConsent}
                    className="c-btn c-btn-primary w-full py-3 text-xs font-bold rounded-md flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <span>{savingConsent ? 'Saving consent…' : 'Begin Interview Session'}</span>
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
                <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>Session Overview</h2>
              </div>

              <dl className="divide-y text-xs" style={{ borderColor: 'var(--c-border)' }}>
                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Role</dt>
                  <dd className="font-bold text-right" style={{ color: 'var(--c-text)' }}>{interview.role}</dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Track</dt>
                  <dd className="font-bold text-right capitalize" style={{ color: 'var(--c-text)' }}>{interview.type || 'Technical'}</dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Questions</dt>
                  <dd className="font-bold text-right font-mono" style={{ color: 'var(--c-text)' }}>{questionCount} questions</dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Estimated time</dt>
                  <dd className="font-bold text-right font-mono" style={{ color: 'var(--c-text)' }}>~{minDuration}–{maxDuration} min</dd>
                </div>
              </dl>
            </div>

            {/* Structured Protocol */}
            <div className="space-y-3">
              <div className="border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>Before you start</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0"
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
                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0"
                    style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)', background: 'var(--c-surface-muted)' }}
                  >
                    02
                  </span>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--c-text)' }}>Manual Capture</p>
                    <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
                      Audio and video are recorded only while you answer, for up to 3 minutes per answer.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--c-border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-[11px]" style={{ color: 'var(--c-text)' }}>Your privacy</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Audio and video are recorded only while you answer a question. If your camera is on, the preview stays on between answers so we can warn you when you leave the frame; those still frames are checked instantly and never stored. Recordings are used only to evaluate this interview unless you tick the optional improvement box, and you can delete them from your results page at any time.
              </p>
            </div>

          </div>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewPreparation;


