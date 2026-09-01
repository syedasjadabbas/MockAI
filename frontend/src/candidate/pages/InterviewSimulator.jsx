import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Mic, 
  Square, 
  ArrowRight, 
  ArrowLeft, 
  PhoneOff, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Video, 
  Check, 
  RefreshCw,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Radio
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview, submitResponse, endInterview } from '../services/candidateApi';

// FR09 - Display Interview Questions (sequential, manual navigation)
// FR11 - Record Audio Responses, FR12 - Capture Facial Expressions
// FR33 - Controlled Data Capture (recording only while actively answering)
// FR10 - End Interview Session
const InterviewSimulator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [responses, setResponses] = useState({});
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [endError, setEndError] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  // Holds the last recorded-but-not-yet-successfully-uploaded response so a
  // failed upload can be retried without forcing the candidate to re-record.
  const [pendingRecording, setPendingRecording] = useState(null);

  useEffect(() => {
    getActiveInterview(id)
      .then((data) => {
        if (!data) {
          navigate('/interview/goal');
          return;
        }
        setInterview(data);
        // Preload any already-submitted responses if revisiting
        if (data.responses && Array.isArray(data.responses)) {
          const loaded = {};
          data.responses.forEach((resp) => {
            if (resp.question_id) {
              loaded[resp.question_id] = resp;
            }
          });
          setResponses(loaded);
        }
      })
      .catch(() => {
        navigate('/interview/goal');
      })
      .finally(() => {
        setLoading(false);
      });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStreamReady(true);

        // Real-time audio analyzer for mic responsiveness in the studio viewfinder
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);

          const tick = () => {
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        } catch {
          // Audio analyzer is progressive enhancement
        }
      })
      .catch(() => {
        setStreamError(true);
      });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const question = interview?.questions?.[index];
  const total = interview?.questions?.length || 0;

  const startRecording = () => {
    if (!streamRef.current) return;
    setSaveError('');
    setPendingRecording(null);
    chunksRef.current = [];
    let recorder;
    try {
      recorder = new MediaRecorder(streamRef.current);
    } catch {
      setSaveError('Could not initialize recording on this device/browser. Please try again.');
      return;
    }
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onerror = () => {
      clearInterval(timerRef.current);
      setIsRecording(false);
      setSaveError('Recording was interrupted unexpectedly. Please start answering again.');
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) return resolve(null);
      recorder.onstop = () => {
        clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        resolve({ durationSeconds: elapsed, sizeBytes: blob.size, blob });
      };
      recorder.stop();
      setIsRecording(false);
    });
  };

  const uploadResponse = async (result) => {
    setSaveError('');
    setSaving(true);
    setPendingRecording(result);
    try {
      await submitResponse(id, question.id, result);
      setResponses((r) => ({ ...r, [question.id]: result }));
      setPendingRecording(null);
    } catch (err) {
      setSaveError(err.message || 'Failed to upload your response. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  const handleStopAndSave = async () => {
    const result = await stopRecording();
    if (!result) return;
    await uploadResponse(result);
  };

  const handleRetryUpload = () => {
    if (pendingRecording && !saving) uploadResponse(pendingRecording);
  };

  const goNext = () => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setSaveError('');
      setPendingRecording(null);
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setSaveError('');
      setPendingRecording(null);
    }
  };

  const jumpToQuestion = (targetIdx) => {
    if (isRecording || saving) return;
    if (targetIdx >= 0 && targetIdx < total) {
      setIndex(targetIdx);
      setSaveError('');
      setPendingRecording(null);
    }
  };

  const handleEnd = async () => {
    setEnding(true);
    setEndError('');
    try {
      if (isRecording) {
        const result = await stopRecording();
        if (result) {
          await submitResponse(id, question.id, result);
          setResponses((r) => ({ ...r, [question.id]: result }));
        }
      }
      await endInterview(id);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      navigate(`/interview/${id}/complete`);
    } catch (err) {
      setEndError(err.message || 'Failed to complete the interview session. Please try again.');
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <InterviewFlowLayout step="session" onExit={() => setConfirmEnd(true)}>
        <div className="max-w-5xl mx-auto py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--c-text-secondary)' }}>
            Initializing interview simulator studio…
          </p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (!interview || !question) return null;

  const answeredCurrent = !!responses[question.id];
  const answeredCount = Object.keys(responses).length;
  const isFinalQuestion = index === total - 1;
  const questionNumStr = String(index + 1).padStart(2, '0');
  const totalStr = String(total).padStart(2, '0');
  const formatTime = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <InterviewFlowLayout step="session" onExit={() => setConfirmEnd(true)}>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Studio Top Context & Segmented Tracker */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-3">
            <span className="c-eyebrow">
              {interview.role}
            </span>
            <span style={{ color: 'var(--c-border-strong)' }}>/</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)', background: 'var(--c-surface-muted)' }}>
              STAGE {questionNumStr} OF {totalStr}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
              Progress: <strong className="font-semibold c-serif-num" style={{ color: 'var(--c-text)' }}>{answeredCount}</strong> / {total} answered
            </div>
            <button
              onClick={() => setConfirmEnd(true)}
              className="c-btn c-btn-ghost text-xs px-2.5 py-1 flex items-center gap-1.5"
              style={{ color: 'var(--c-danger)' }}
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Conclude Session</span>
            </button>
          </div>
        </div>

        {/* High-Precision Progress Timeline Bar */}
        <div className="grid grid-cols-5 gap-2">
          {interview.questions.map((q, i) => {
            const isCurrent = i === index;
            const isAnswered = !!responses[q.id];
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => jumpToQuestion(i)}
                disabled={isRecording || saving}
                className="group text-left py-1 transition-all focus:outline-none"
              >
                <div 
                  className="h-1.5 rounded-full transition-all duration-200"
                  style={{
                    background: isCurrent 
                      ? 'var(--c-accent)' 
                      : isAnswered 
                      ? 'var(--c-success)' 
                      : 'var(--c-border)'
                  }}
                />
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span 
                    className="font-mono transition-colors"
                    style={{ 
                      color: isCurrent 
                        ? 'var(--c-accent)' 
                        : isAnswered 
                        ? 'var(--c-success)' 
                        : 'var(--c-text-muted)',
                      fontWeight: isCurrent ? '700' : '500'
                    }}
                  >
                    Q{i + 1}
                  </span>
                  {isAnswered && (
                    <Check className="w-2.5 h-2.5" style={{ color: 'var(--c-success)' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Stage Grid: Prompter Stage (Left) & Studio Feed (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Prompter Stage (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Prompter Canvas Card */}
            <div 
              className="c-card p-7 sm:p-9 space-y-6 relative overflow-hidden transition-all duration-300"
              style={{
                borderColor: isRecording ? 'var(--c-danger)' : 'var(--c-border)',
                boxShadow: isRecording ? '0 0 0 1px var(--c-danger), var(--c-shadow)' : 'var(--c-shadow-sm)'
              }}
            >
              {/* Question Metadata Header */}
              <div className="flex items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="c-serif-num text-2xl font-bold" style={{ color: 'var(--c-accent)' }}>
                    {questionNumStr}
                  </span>
                  <span className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--c-text-muted)' }}>
                    PROMPT
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="c-badge c-badge-muted text-[11px]">
                    {question.difficulty || 'Medium'}
                  </span>
                  <span className="c-badge c-badge-accent text-[11px]">
                    {question.type || 'Technical'}
                  </span>
                </div>
              </div>

              {/* Huge Editorial Question Typography */}
              <div className="min-h-[140px] flex items-center">
                <h1 className="c-heading text-2xl sm:text-3xl leading-snug tracking-tight font-normal sm:font-medium">
                  {question.question_text}
                </h1>
              </div>

              {/* Question Footer Guidance */}
              <div className="border-t pt-4 flex items-center justify-between gap-4 text-xs" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>
                <p>
                  Formulate your response, then click <strong className="font-semibold" style={{ color: 'var(--c-text)' }}>Start Answering</strong> to begin spoken recording.
                </p>
                {answeredCurrent && (
                  <span className="shrink-0 c-badge c-badge-success flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved ({responses[question.id]?.durationSeconds || 0}s)
                  </span>
                )}
              </div>
            </div>

            {/* Primary Response Interaction Bar */}
            <div className="c-card p-5 sm:p-6 space-y-4">
              
              {/* Active Recording State Bar */}
              {isRecording && (
                <div 
                  className="rounded-xl p-4 flex items-center justify-between gap-4 border"
                  style={{
                    background: 'var(--c-danger-soft)',
                    borderColor: 'var(--c-danger)',
                    color: 'var(--c-danger)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--c-danger)' }} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Recording in Progress</p>
                      <p className="font-mono text-xl font-bold">{formatTime(elapsed)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 h-5 w-28 px-2 rounded bg-black/10">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const threshold = (i + 1) * 8;
                      const active = micLevel >= threshold;
                      return (
                        <div 
                          key={i} 
                          className="flex-1 h-full rounded-sm transition-all duration-75"
                          style={{
                            background: active ? 'var(--c-danger)' : 'rgba(0,0,0,0.1)'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Uploading State Bar */}
              {!isRecording && saving && (
                <div 
                  className="rounded-xl p-4 flex items-center justify-between gap-4 border"
                  style={{
                    background: 'var(--c-accent-soft)',
                    borderColor: 'var(--c-accent)',
                    color: 'var(--c-accent)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Ingesting Response</p>
                      <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>Uploading audio-visual take to server…</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Notice & Retry */}
              {saveError && (
                <div className="c-badge-danger rounded-xl p-4 flex items-start justify-between gap-3 text-xs leading-relaxed">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Upload Failed</p>
                      <p>{saveError}</p>
                    </div>
                  </div>
                  {pendingRecording && !saving && (
                    <button 
                      onClick={handleRetryUpload}
                      className="c-btn shrink-0 px-3 py-1 text-xs"
                      style={{ background: 'var(--c-danger)', color: '#fff' }}
                    >
                      Retry Upload
                    </button>
                  )}
                </div>
              )}

              {streamError && (
                <div className="c-badge-danger rounded-xl p-4 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Hardware media stream disconnected. Please check camera/mic permissions and refresh.</p>
                </div>
              )}

              {endError && (
                <div className="c-badge-danger rounded-xl p-3 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{endError}</p>
                </div>
              )}

              {/* Main Primary Action Controls */}
              <div className="space-y-3">
                {isRecording ? (
                  <button
                    onClick={handleStopAndSave}
                    className="c-btn w-full py-4 text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg transition-transform active:scale-[0.99]"
                    style={{ background: 'var(--c-danger)', color: '#ffffff' }}
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop & Upload Response</span>
                  </button>
                ) : saving ? (
                  <button
                    disabled
                    className="c-btn c-btn-primary w-full py-4 text-sm flex items-center justify-center gap-2.5 opacity-80 cursor-not-allowed"
                  >
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Saving to Question Bank…</span>
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={!streamReady}
                    className="c-btn c-btn-primary w-full py-4 text-sm font-bold flex items-center justify-center gap-2.5 shadow-md"
                  >
                    {!streamReady ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Mic className="w-4.5 h-4.5" />
                    )}
                    <span>
                      {!streamReady 
                        ? 'Calibrating Camera…' 
                        : answeredCurrent 
                        ? 'Re-record Response' 
                        : 'Start Answering'}
                    </span>
                  </button>
                )}

                {/* Step Forward / Backward Navigation Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={goPrev}
                    disabled={index === 0 || isRecording || saving}
                    className="c-btn c-btn-secondary flex-1 py-3 text-xs flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  {!isFinalQuestion ? (
                    <button
                      onClick={goNext}
                      disabled={isRecording || saving}
                      className="c-btn c-btn-secondary flex-1 py-3 text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>Next Prompt</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmEnd(true)}
                      disabled={isRecording || saving}
                      className="c-btn flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5"
                      style={{ background: 'var(--c-success)', color: '#ffffff' }}
                    >
                      <span>Complete Interview</span>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Right Stage: Live Studio Camera Feed & Question Navigator (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Camera Viewfinder Monitor */}
            <div 
              className="c-card overflow-hidden relative flex flex-col justify-between"
              style={{
                aspectRatio: '16/10',
                background: 'var(--c-surface-muted)',
                borderColor: isRecording ? 'var(--c-danger)' : 'var(--c-border)'
              }}
            >
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover" 
              />

              {/* Viewfinder Top Bar Overlay */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2">
                  <span 
                    className="px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold border backdrop-blur-md"
                    style={{
                      background: isRecording 
                        ? 'rgba(162, 59, 46, 0.95)' 
                        : streamReady 
                        ? 'rgba(75, 107, 79, 0.9)' 
                        : 'rgba(33, 28, 23, 0.75)',
                      color: '#ffffff',
                      borderColor: 'rgba(255,255,255,0.2)'
                    }}
                  >
                    {isRecording ? `● REC ${formatTime(elapsed)}` : streamReady ? '● Live Monitor' : 'Offline'}
                  </span>
                </div>

                <div 
                  className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest border backdrop-blur-md"
                  style={{
                    background: 'rgba(33, 28, 23, 0.65)',
                    color: '#ffffff',
                    borderColor: 'rgba(255,255,255,0.1)'
                  }}
                >
                  HD 1080p
                </div>
              </div>

              {/* Viewfinder Bottom Audio Overlay */}
              <div className="absolute bottom-3 inset-x-3 pointer-events-none">
                <div 
                  className="px-3 py-1.5 rounded-lg backdrop-blur-md border flex items-center gap-2.5"
                  style={{
                    background: 'rgba(20, 16, 13, 0.75)',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff'
                  }}
                >
                  <Mic className="w-3 h-3 shrink-0" style={{ color: micLevel > 15 ? 'var(--c-success)' : 'rgba(255,255,255,0.4)' }} />
                  <div className="flex-1 flex items-center gap-1 h-2">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const threshold = (i + 1) * 6;
                      const active = micLevel >= threshold;
                      return (
                        <div 
                          key={i} 
                          className="flex-1 h-full rounded-sm transition-all duration-75"
                          style={{
                            background: active 
                              ? (i > 12 ? 'var(--c-danger)' : 'var(--c-success)')
                              : 'rgba(255, 255, 255, 0.18)'
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[9px] font-mono w-6 text-right opacity-80">
                    {micLevel}%
                  </span>
                </div>
              </div>
            </div>

            {/* Question Bank Navigator Ledger */}
            <div className="c-card p-5 space-y-4">
              <div className="border-b pb-3 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
                <div>
                  <p className="c-eyebrow">Sequence</p>
                  <h3 className="c-heading text-base mt-0.5">Session Questions</h3>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                  {answeredCount}/{total} Complete
                </span>
              </div>

              <div className="divide-y text-xs" style={{ borderColor: 'var(--c-border)' }}>
                {interview.questions.map((q, i) => {
                  const isCurrent = i === index;
                  const isSaved = !!responses[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(i)}
                      disabled={isRecording || saving}
                      className="w-full py-2.5 px-1.5 flex items-center justify-between text-left hover:bg-black/5 rounded-lg transition-colors group"
                      style={{
                        background: isCurrent ? 'var(--c-surface-muted)' : 'transparent'
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span 
                          className="font-mono text-xs font-bold w-5 shrink-0"
                          style={{ color: isCurrent ? 'var(--c-accent)' : 'var(--c-text-muted)' }}
                        >
                          {(i + 1).toString().padStart(2, '0')}
                        </span>
                        <p 
                          className="truncate text-xs font-medium transition-colors"
                          style={{ color: isCurrent ? 'var(--c-text)' : 'var(--c-text-secondary)' }}
                        >
                          {q.question_text}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isSaved ? (
                          <span className="c-badge c-badge-success text-[10px] py-0.5 px-2">
                            Saved
                          </span>
                        ) : isCurrent ? (
                          <span className="c-badge c-badge-accent text-[10px] py-0.5 px-2">
                            Active
                          </span>
                        ) : (
                          <span className="c-badge c-badge-muted text-[10px] py-0.5 px-2">
                            Pending
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controlled Data Capture Assurance */}
            <div className="c-card-flat p-4 space-y-1.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--c-accent)' }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text)' }}>
                  Controlled Capture Policy
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Recording stops immediately when you click Stop. Each take is packaged and uploaded directly for transcription.
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* Confirmation Modal to End Interview Session */}
      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="c-card p-6 sm:p-7 rounded-3xl w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="space-y-1">
              <p className="c-eyebrow">Confirmation</p>
              <h3 className="c-heading text-xl">Conclude Interview Session?</h3>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              {answeredCount < total
                ? `You have answered ${answeredCount} of ${total} questions. Concluding now will submit your current recorded takes and proceed to evaluation.`
                : 'All prompts have been recorded. Concluding will finalize your session and submit all responses for evaluation processing.'}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => setConfirmEnd(false)} 
                disabled={ending}
                className="c-btn c-btn-secondary flex-1 py-3 text-xs"
              >
                Return to Interview
              </button>
              <button 
                onClick={handleEnd} 
                disabled={ending} 
                className="c-btn flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5" 
                style={{ background: 'var(--c-accent)', color: '#ffffff' }}
              >
                {ending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Finalizing…</span>
                  </>
                ) : (
                  <>
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>Submit & Conclude</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </InterviewFlowLayout>
  );
};

export default InterviewSimulator;
