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
  // Objective 1 - text, voice or video: 'camera' | 'voice' | 'text'
  const [mode, setMode] = useState('camera');
  const [mediaStream, setMediaStream] = useState(null);
  const [continuingTextOnly, setContinuingTextOnly] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const startStepRef = useRef(null);

  // Once the devices work, bring the last step (and its Start button) into view.
  const devicesReady = micStatus === 'granted' && (mode !== 'camera' || cameraStatus === 'granted');
  useEffect(() => {
    if (devicesReady) startStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [devicesReady]);

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
    const useCamera = mode === 'camera';
    if (!micConsent || (useCamera && !cameraConsent)) {
      setPermissionError('Please tick the consent for each device before turning it on.');
      return;
    }
    setPermissionError('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setCameraStatus(useCamera ? 'prompting' : 'idle');
    setMicStatus('prompting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: useCamera
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
      setCameraStatus(useCamera ? 'granted' : 'idle');
      setMicStatus('granted');

    } catch (err) {
      console.error('Media permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setMicStatus('denied');
        setPermissionError(
          'Your browser blocked the camera or microphone.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('denied');
        setMicStatus('denied');
        setPermissionError(useCamera ? 'No camera or microphone was found. Connect one, or choose another way to answer.' : 'No microphone was found. Connect one, or choose to type your answers.');
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
      await recordConsent(id, { microphone: true, camera: mode === 'camera' && cameraConsent, researchUse: researchConsent });
    } catch (e) {
      setPermissionError(e.message || 'Could not save your recording consent. Please try again.');
      setSavingConsent(false);
      return;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigate(`/interview/${id}/session`, { state: { voiceOnly: mode !== 'camera' } });
  };

  // Changing the answer mode turns off any devices already switched on, so
  // only the devices the new mode needs (and has consent for) are used.
  const chooseMode = (next) => {
    if (next === mode) return;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setMediaStream(null);
    setCameraStatus('idle');
    setMicStatus('idle');
    setPermissionError('');
    if (next !== 'camera') setCameraConsent(false);
    setMode(next);
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
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-muted)' }}>Loading…</p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (!interview) return null;

  const questionCount = interview.questions?.length || 3;
  const minDuration = Math.max(3, Math.round(questionCount * 1.5));
  const maxDuration = Math.round(questionCount * 2.5);
  const wantsCamera = mode === 'camera';
  const consentGiven = mode === 'text' || (micConsent && (!wantsCamera || cameraConsent));
  const devicesOn = micStatus === 'granted' && (!wantsCamera || cameraStatus === 'granted');
  const blocked = micStatus === 'denied' || cameraStatus === 'denied';
  const typeName = { technical: 'Technical', behavioral: 'HR & Behavioral', situational: 'Situational' }[interview.type] || 'Technical';

  const MODES = [
    { id: 'camera', Icon: Camera, title: 'Camera and microphone', text: 'Recommended. Feedback on what you say, how you say it and how you come across.' },
    { id: 'voice', Icon: Mic, title: 'Microphone only', text: 'Voice-only. Feedback on what you say and how you say it.' },
    { id: 'text', Icon: Keyboard, title: 'Type my answers', text: 'No camera or microphone. Feedback on what you write.' },
  ];

  const consents = [
    {
      key: 'mic', show: mode !== 'text', checked: micConsent, onChange: setMicConsent,
      title: 'Record my microphone',
      text: 'MockAI may record my voice while I answer a question, to transcribe and assess my answer.',
    },
    {
      key: 'camera', show: wantsCamera, checked: cameraConsent, onChange: setCameraConsent,
      title: 'Record my camera',
      text: 'MockAI may record my webcam while I answer, to give feedback on facial expression and camera presence.',
    },
  ];

  const StepTitle = ({ n, done, children }) => (
    <div className="flex items-center gap-2.5">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          background: done ? 'var(--c-success)' : 'var(--c-accent)',
          color: '#fff',
        }}
      >
        {done ? <Check className="w-3.5 h-3.5" /> : n}
      </span>
      <h2 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>{children}</h2>
    </div>
  );

  const DeviceStatus = ({ Icon, label, status, off }) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--c-text)' }}>
        <Icon className="w-4 h-4" style={{ color: status === 'granted' ? 'var(--c-success)' : 'var(--c-text-muted)' }} />
        {label}
      </span>
      {off ? (
        <span className="c-badge c-badge-muted text-[11px]">Not used</span>
      ) : status === 'granted' ? (
        <span className="c-badge c-badge-success text-[11px] flex items-center gap-1"><Check className="w-3 h-3" /> Working</span>
      ) : status === 'denied' ? (
        <span className="c-badge c-badge-danger text-[11px] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Blocked</span>
      ) : status === 'prompting' ? (
        <span className="c-badge c-badge-muted text-[11px]">Waiting for permission…</span>
      ) : (
        <span className="c-badge c-badge-muted text-[11px]">Off</span>
      )}
    </div>
  );

  return (
    <InterviewFlowLayout step="prepare">
      <div className="py-6 sm:py-8 space-y-6">

        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Get ready</p>
          <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>{interview.role}</h1>
          <div className="flex flex-wrap gap-2">
            {[typeName + ' interview', `${questionCount} easy questions`, `About ${minDuration}–${maxDuration} minutes`].map((t) => (
              <span key={t} className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)', background: 'var(--c-surface)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* Live preview */}
          <div className="lg:col-span-6 space-y-3 lg:sticky lg:top-6">
            <div
              className="overflow-hidden relative rounded-xl border"
              style={{ aspectRatio: '4/3', background: 'var(--c-surface-card)', borderColor: cameraStatus === 'granted' ? 'var(--c-success)' : 'var(--c-border)' }}
            >
              {cameraStatus === 'granted' ? (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--c-badge-accent-bg)', color: 'var(--c-accent)' }}>
                    {mode === 'text' ? <Keyboard className="w-6 h-6" /> : micStatus === 'granted' ? <Mic className="w-6 h-6" /> : wantsCamera ? <VideoOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                      {mode === 'text'
                        ? 'Typed answers'
                        : micStatus === 'granted'
                        ? 'Microphone is on'
                        : wantsCamera ? 'Your camera preview appears here' : 'Voice-only interview'}
                    </p>
                    <p className="text-xs max-w-xs" style={{ color: 'var(--c-text-muted)' }}>
                      {mode === 'text'
                        ? 'Nothing is recorded. You type each answer.'
                        : micStatus === 'granted'
                        ? 'Say a few words. The bars below should move.'
                        : 'Turn on your devices to check how you look and sound.'}
                    </p>
                  </div>
                </div>
              )}

              {cameraStatus === 'granted' && (
                <>
                  {/* Framing guide: keep your face inside the oval */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                    <div className="rounded-[50%] border-2 border-dashed" style={{ width: '38%', height: '62%', borderColor: 'rgba(255,255,255,0.45)' }} />
                  </div>
                  <span className="absolute top-3 left-3 px-2 py-1 rounded-md text-[11px] font-semibold pointer-events-none" style={{ background: 'rgba(10,16,32,0.75)', color: '#fff' }}>
                    Keep your face inside the oval
                  </span>
                </>
              )}

              {micStatus === 'granted' && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 px-3 py-1.5 rounded-md pointer-events-none" style={{ background: 'rgba(10,16,32,0.75)' }}>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white"><Mic className="w-3.5 h-3.5" /> Microphone level</span>
                  <AudioLevelMeter stream={mediaStream} bars={14} height={14} color="var(--c-accent)" />
                </div>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px" style={{ color: 'var(--c-success)' }} />
              Recording happens only while you answer a question, with a red REC sign on screen. You can delete your recordings from the results page.
              Your results are practice feedback, never a hiring decision.
            </p>
          </div>

          {/* Setup steps */}
          <div className="lg:col-span-6 space-y-4">

            {/* 1. How will you answer? */}
            <section className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
              <StepTitle n={1} done={consentGiven}>How will you answer?</StepTitle>

              <div className="grid gap-2" role="radiogroup" aria-label="Answer mode">
                {MODES.map(({ id: modeId, Icon, title, text }) => {
                  const active = mode === modeId;
                  return (
                    <button
                      key={modeId}
                      role="radio"
                      aria-checked={active}
                      onClick={() => chooseMode(modeId)}
                      disabled={savingConsent || continuingTextOnly}
                      className="rounded-lg border p-3 text-left flex items-start gap-3 transition-colors"
                      style={{ background: active ? 'var(--c-badge-accent-bg)' : 'var(--c-surface-muted)', borderColor: active ? 'var(--c-accent)' : 'var(--c-border)' }}
                    >
                      <span className="w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: active ? 'var(--c-accent)' : 'var(--c-text-muted)' }}>
                        {active && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--c-accent)' }} />}
                      </span>
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: active ? 'var(--c-accent)' : 'var(--c-text-muted)' }} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold" style={{ color: 'var(--c-text)' }}>{title}</span>
                        <span className="block text-xs leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>{text}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* NFR 10 - a separate consent for each device that will be used */}
              {mode !== 'text' && (
                <div className="space-y-2">
                  {consents.filter((c) => c.show).map((c) => (
                    <label key={c.key} className="flex items-start gap-3 rounded-lg border p-3 text-xs cursor-pointer"
                      style={{ borderColor: c.checked ? 'var(--c-success)' : 'var(--c-border)', background: 'var(--c-surface-muted)' }}>
                      <input
                        type="checkbox"
                        checked={c.checked}
                        onChange={(e) => { c.onChange(e.target.checked); if (e.target.checked) setPermissionError(''); }}
                        disabled={devicesOn}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
                        aria-required="true"
                      />
                      <span className="leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                        <strong style={{ color: 'var(--c-text)' }}>{c.title}.</strong> {c.text}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* NFR 11 - optional research use, off by default */}
              <label className="flex items-start gap-3 text-xs cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={researchConsent}
                  onChange={(e) => setResearchConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
                />
                <span className="leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
                  <strong style={{ color: 'var(--c-text-secondary)' }}>Optional: help improve MockAI.</strong> My answers may also be used, without my name, to check and improve MockAI's accuracy.
                </span>
              </label>
            </section>

            {mode === 'text' ? (
              <section className="rounded-xl border p-5 space-y-3" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <StepTitle n={2} done={false}>Start when you are ready</StepTitle>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Write each answer as you would say it. Aim for a few clear sentences with one example.
                </p>
                <button
                  onClick={handleTextOnly}
                  disabled={continuingTextOnly}
                  className="c-btn c-btn-primary w-full py-3.5 text-sm font-bold rounded-md flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>{continuingTextOnly ? 'Starting…' : 'Start interview'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </section>
            ) : (
              <>
                {/* 2. Turn on devices */}
                <section className="rounded-xl border p-5 space-y-3" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', opacity: consentGiven ? 1 : 0.55 }}>
                  <StepTitle n={2} done={devicesOn}>Turn on your {wantsCamera ? 'camera and microphone' : 'microphone'}</StepTitle>
                  <div className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
                    <DeviceStatus Icon={Camera} label="Camera" status={cameraStatus} off={!wantsCamera} />
                    <DeviceStatus Icon={Mic} label="Microphone" status={micStatus} />
                  </div>

                  {permissionError && (
                    <div className="c-badge-danger rounded-md p-3 flex items-start gap-2 text-xs" role="alert">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p>{permissionError}</p>
                        {blocked && <p>Click the camera icon in your browser's address bar, choose Allow, then press the button again.</p>}
                      </div>
                    </div>
                  )}

                  {!devicesOn && (
                    <button
                      onClick={requestPermissions}
                      disabled={!consentGiven || micStatus === 'prompting'}
                      className="c-btn c-btn-primary w-full py-3 text-sm font-bold rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {blocked ? <RefreshCw className="w-4 h-4" /> : wantsCamera ? <Camera className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>
                        {!consentGiven
                          ? 'Tick the consent above first'
                          : blocked ? 'Try again' : wantsCamera ? 'Turn on camera and microphone' : 'Turn on microphone'}
                      </span>
                    </button>
                  )}
                </section>

                {/* 3. Quick check and start */}
                <section ref={startStepRef} className="rounded-xl border p-5 space-y-3" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', opacity: devicesOn ? 1 : 0.55 }}>
                  <StepTitle n={3} done={false}>Quick check, then start</StepTitle>
                  <ul className="space-y-1.5 text-xs" style={{ color: 'var(--c-text-secondary)' }}>
                    {[
                      wantsCamera && 'Your face is inside the oval and well lit.',
                      'You are in a quiet place.',
                      'The microphone bars move when you speak.',
                    ].filter(Boolean).map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: devicesOn ? 'var(--c-success)' : 'var(--c-text-muted)' }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleBegin}
                    disabled={!devicesOn || savingConsent}
                    className="c-btn c-btn-primary w-full py-3.5 text-sm font-bold rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{savingConsent ? 'Starting…' : 'Start interview'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewPreparation;
