import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mic,
  Square,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Clock,
  Video,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  PhoneOff,
  CheckCircle2,
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import {
  getActiveInterview,
  submitResponse,
  submitResponseMetadataOnly,
} from '../services/candidateApi';

// FR10/FR11/FR12/FR33/FR15 - Full multimodal audio/video prompt simulator
const InterviewSimulator = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Recording lifecycle: idle -> recording -> stopping -> saving
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saveError, setSaveError] = useState('');
  const [endError, setEndError] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  // Question response cache map: { [questionId]: { durationSeconds, timestamp } }
  const [responses, setResponses] = useState({});

  // Media states
  const [streamReady, setStreamReady] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [micLevel, setMicLevel] = useState(0);

  // References for live streams & hardware recording
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const [pendingRecording, setPendingRecording] = useState(null);

  // 1. Fetch active interview session on mount
  useEffect(() => {
    let mounted = true;
    getActiveInterview(id)
      .then((data) => {
        if (!mounted) return;
        if (!data || !data.questions?.length) {
          navigate('/interview/goal');
          return;
        }
        setInterview(data);

        // Pre-populate already recorded question response cache
        const map = {};
        (data.responses || []).forEach((r) => {
          const qId = r.question_id || r.questionId;
          if (qId) {
            map[qId] = {
              durationSeconds: r.duration_seconds || r.durationSeconds || 0,
              timestamp: r.created_at || r.createdAt,
            };
          }
        });
        setResponses(map);
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

  // 2. Initialize live media stream
  useEffect(() => {
    let active = true;

    async function initStream() {
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

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setStreamReady(true);
        setStreamError('');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Web Audio Analyser for live VU meter
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

          const measureVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const normalized = Math.min(100, Math.round((rms / 128) * 100));
            setMicLevel(normalized);

            animFrameRef.current = requestAnimationFrame(measureVolume);
          };

          measureVolume();
        } catch (audioErr) {
          console.warn('AudioContext volume metering disabled:', audioErr);
        }
      } catch (err) {
        console.error('Camera/Mic feed connection error:', err);
        if (active) {
          setStreamReady(false);
          setStreamError('Could not initialize camera/microphone devices.');
        }
      }
    }

    initStream();

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 3. Start Recording
  const startRecording = () => {
    if (!streamRef.current) return;
    setSaveError('');
    chunksRef.current = [];
    setPendingRecording(null);

    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }
    }

    try {
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(streamRef.current, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Emit chunk slices every 250ms
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (recErr) {
      console.error('Failed to initiate MediaRecorder:', recErr);
      setSaveError('Could not start recording engine. Please verify device permissions.');
    }
  };

  // 4. Stop Recording & Upload
  const stopRecordingAndUpload = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    clearInterval(timerRef.current);
    setIsRecording(false);
    setSaving(true);
    setSaveError('');

    const currentQuestion = interview.questions[index];
    const duration = elapsed;

    mediaRecorderRef.current.onstop = async () => {
      try {
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size === 0) {
          throw new Error('Recorded file slice is empty. Please check your microphone input.');
        }

        const payload = {
          blob,
          durationSeconds: duration,
        };

        setPendingRecording({ questionId: currentQuestion.id, payload });

        await submitResponse(id, currentQuestion.id, payload);

        setResponses((prev) => ({
          ...prev,
          [currentQuestion.id]: { durationSeconds: duration, timestamp: new Date().toISOString() },
        }));
        setPendingRecording(null);
      } catch (uploadErr) {
        console.error('Response submission error:', uploadErr);
        setSaveError(
          uploadErr.message || 'Could not upload response. Check your network connection and click retry.'
        );
      } finally {
        setSaving(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const handleRetryUpload = async () => {
    if (!pendingRecording || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await submitResponse(id, pendingRecording.questionId, pendingRecording.payload);
      setResponses((prev) => ({
        ...prev,
        [pendingRecording.questionId]: {
          durationSeconds: pendingRecording.payload.durationSeconds,
          timestamp: new Date().toISOString(),
        },
      }));
      setPendingRecording(null);
    } catch (err) {
      setSaveError(err.message || 'Retry failed. Please check connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleStopAndSave = () => {
    stopRecordingAndUpload();
  };

  const jumpToQuestion = (targetIdx) => {
    if (isRecording || saving) return;
    if (targetIdx >= 0 && targetIdx < interview.questions.length) {
      setIndex(targetIdx);
      setSaveError('');
    }
  };

  const goNext = () => {
    if (index < interview.questions.length - 1) {
      jumpToQuestion(index + 1);
    }
  };

  const goPrev = () => {
    if (index > 0) {
      jumpToQuestion(index - 1);
    }
  };

  const handleEnd = () => {
    setEnding(true);
    navigate(`/interview/${id}/complete`);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <InterviewFlowLayout step="session">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-muted)' }}>Loading simulation studio…</p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (!interview || !interview.questions?.length) return null;

  const question = interview.questions[index];
  const total = interview.questions.length;
  const answeredCount = Object.keys(responses).length;
  const answeredCurrent = !!responses[question?.id];
  const isFinalQuestion = index === total - 1;
  const questionNumStr = (index + 1).toString().padStart(2, '0');

  return (
    <InterviewFlowLayout step="session">
      <div className="max-w-5xl mx-auto space-y-6 py-2">
        
        {/* Step Progress Tracker Strip */}
        <div className="grid grid-cols-5 gap-2">
          {interview.questions.map((q, i) => {
            const isDone = !!responses[q.id];
            const isCurrent = i === index;
            return (
              <button
                key={q.id}
                onClick={() => jumpToQuestion(i)}
                disabled={isRecording || saving}
                className="h-1.5 rounded-sm transition-all"
                style={{
                  background: isCurrent
                    ? 'var(--c-accent)'
                    : isDone
                    ? 'var(--c-success)'
                    : 'var(--c-surface-muted)',
                }}
                title={`Question ${i + 1}: ${q.question_text.slice(0, 30)}...`}
              />
            );
          })}
        </div>

        {/* Main Stage Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Prompter Stage (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Unified Prompter Canvas & Response Stage */}
            <div 
              className="c-card p-6 sm:p-8 space-y-6 rounded-lg border shadow-sm"
              style={{
                background: 'var(--c-surface)',
                borderColor: isRecording ? 'var(--c-danger)' : 'var(--c-border)',
              }}
            >
              {/* Question Metadata Header */}
              <div className="flex items-center justify-between gap-3 border-b pb-3.5" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold" style={{ color: 'var(--c-text)' }}>
                    {questionNumStr}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--c-text-muted)' }}>
                    INTERVIEW PROMPT
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="c-badge c-badge-muted text-[10px]">
                    {question.difficulty || 'Medium'}
                  </span>
                  <span className="c-badge c-badge-accent text-[10px]">
                    {question.type || 'Technical'}
                  </span>
                </div>
              </div>

              {/* Dominant Question Typography */}
              <div className="min-h-[120px] flex items-center">
                <h1 className="c-heading text-xl sm:text-2xl font-bold leading-relaxed" style={{ color: 'var(--c-text)' }}>
                  {question.question_text}
                </h1>
              </div>

              {/* Status & Guidance Bar */}
              <div className="border-t pt-3 flex items-center justify-between gap-4 text-xs" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>
                <p className="text-[11px]">
                  Formulate your response, then click <strong className="font-semibold" style={{ color: 'var(--c-text)' }}>Start Answering</strong>.
                </p>
                {answeredCurrent && (
                  <span className="shrink-0 c-badge c-badge-success flex items-center gap-1 font-semibold text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Saved ({responses[question.id]?.durationSeconds || 0}s)
                  </span>
                )}
              </div>

              {/* Active Recording State Bar */}
              {isRecording && (
                <div 
                  className="rounded-md p-3.5 flex items-center justify-between gap-3 border"
                  style={{
                    background: 'var(--c-badge-danger-bg)',
                    borderColor: 'var(--c-badge-danger-border)',
                    color: 'var(--c-badge-danger-text)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Recording In Progress</p>
                      <p className="font-mono text-xl font-bold" style={{ color: 'var(--c-text)' }}>{formatTime(elapsed)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 h-4 w-24 px-2 rounded border" style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const threshold = (i + 1) * 8;
                      const active = micLevel >= threshold;
                      return (
                        <div 
                          key={i} 
                          className="flex-1 h-full rounded-xs transition-all duration-75"
                          style={{
                            background: active ? 'var(--c-danger)' : 'var(--c-border)'
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
                  className="rounded-md p-3.5 flex items-center justify-between gap-3 border"
                  style={{
                    background: 'var(--c-badge-accent-bg)',
                    borderColor: 'var(--c-badge-accent-border)',
                    color: 'var(--c-badge-accent-text)'
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text)' }}>Ingesting Response</p>
                      <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>Uploading for evaluation…</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Notice & Retry */}
              {saveError && (
                <div className="c-badge-danger rounded-md p-3 flex items-start justify-between gap-3 text-xs leading-relaxed">
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
                      className="c-btn shrink-0 px-2.5 py-1 text-xs rounded font-bold"
                      style={{ background: 'var(--c-danger)', color: '#fff' }}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {streamError && (
                <div className="c-badge-danger rounded-md p-3 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Hardware media stream disconnected. Please check camera/mic permissions and refresh.</p>
                </div>
              )}

              {endError && (
                <div className="c-badge-danger rounded-md p-2.5 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{endError}</p>
                </div>
              )}

              {/* Primary Action Controls */}
              <div className="space-y-3 pt-2">
                {isRecording ? (
                  <button
                    onClick={handleStopAndSave}
                    className="c-btn c-btn-danger w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 rounded-md"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop & Upload Response</span>
                  </button>
                ) : saving ? (
                  <button
                    disabled
                    className="c-btn c-btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 opacity-75 cursor-not-allowed rounded-md"
                  >
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Saving Response…</span>
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={!streamReady}
                    className="c-btn c-btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 rounded-md"
                  >
                    {!streamReady ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    <span>
                      {!streamReady 
                        ? 'Calibrating Sensors…' 
                        : answeredCurrent 
                        ? 'Re-record Take' 
                        : 'Start Answering'}
                    </span>
                  </button>
                )}

                {/* Step Forward / Backward Navigation Actions */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    onClick={goPrev}
                    disabled={index === 0 || isRecording || saving}
                    className="c-btn c-btn-secondary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5 rounded-md font-semibold"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Previous</span>
                  </button>

                  {!isFinalQuestion ? (
                    <button
                      onClick={goNext}
                      disabled={isRecording || saving}
                      className="c-btn c-btn-secondary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5 rounded-md font-semibold"
                    >
                      <span>Next Prompt</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmEnd(true)}
                      disabled={isRecording || saving}
                      className="c-btn flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 rounded-md text-white"
                      style={{ background: 'var(--c-success)' }}
                    >
                      <span>Complete Interview</span>
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Right Stage: Live Camera Feed & Question Navigator (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Camera Viewfinder Monitor */}
            <div 
              className="overflow-hidden relative flex flex-col justify-between rounded-lg border shadow-sm"
              style={{
                aspectRatio: '16/10',
                background: 'var(--c-surface-card)',
                borderColor: isRecording ? 'var(--c-danger)' : 'var(--c-border)',
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
              <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                  style={{
                    background: isRecording 
                      ? 'var(--c-danger)' 
                      : streamReady 
                      ? 'var(--c-badge-success-bg)' 
                      : 'var(--c-badge-muted-bg)',
                    color: isRecording ? '#FFFFFF' : streamReady ? 'var(--c-badge-success-text)' : 'var(--c-badge-muted-text)',
                    borderColor: 'var(--c-border)'
                  }}
                >
                  {isRecording ? `● REC ${formatTime(elapsed)}` : streamReady ? '● LIVE' : 'OFFLINE'}
                </span>

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

              {/* Viewfinder Bottom Audio Overlay */}
              <div className="absolute bottom-2.5 inset-x-2.5 pointer-events-none">
                <div 
                  className="px-2.5 py-1 rounded-md border flex items-center gap-2"
                  style={{
                    background: 'var(--c-surface-card)',
                    borderColor: 'var(--c-border)',
                    color: 'var(--c-text)'
                  }}
                >
                  <Mic className="w-3 h-3 shrink-0" style={{ color: micLevel > 15 ? 'var(--c-success)' : 'var(--c-text-muted)' }} />
                  <div className="flex-1 flex items-center gap-1 h-2">
                    {Array.from({ length: 18 }).map((_, i) => {
                      const threshold = (i + 1) * 5.5;
                      const active = micLevel >= threshold;
                      return (
                        <div 
                          key={i} 
                          className="flex-1 h-full rounded-xs transition-all duration-75"
                          style={{
                            background: active 
                              ? (i > 14 ? 'var(--c-danger)' : 'var(--c-success)')
                              : 'var(--c-surface-muted)'
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-mono font-bold w-6 text-right" style={{ color: 'var(--c-text-secondary)' }}>
                    {micLevel}%
                  </span>
                </div>
              </div>
            </div>

            {/* Question Bank Navigator Ledger */}
            <div className="space-y-2.5">
              <div className="border-b pb-2 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
                <div>
                  <p className="c-eyebrow mb-0.5">Sequence</p>
                  <h3 className="c-heading text-sm font-bold" style={{ color: 'var(--c-text)' }}>Prompt Bank</h3>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--c-text-secondary)' }}>
                  {answeredCount}/{total} Complete
                </span>
              </div>

              <div className="divide-y text-xs border-b" style={{ borderColor: 'var(--c-border)' }}>
                {interview.questions.map((q, i) => {
                  const isCurrent = i === index;
                  const isSaved = !!responses[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(i)}
                      disabled={isRecording || saving}
                      className="w-full py-2.5 px-2 flex items-center justify-between text-left rounded transition-colors group hover:bg-slate-500/[0.05]"
                      style={{
                        background: isCurrent ? 'var(--c-surface-muted)' : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span 
                          className="font-mono text-xs font-bold w-4 shrink-0"
                          style={{ color: isCurrent ? 'var(--c-text)' : 'var(--c-text-muted)' }}
                        >
                          {(i + 1).toString().padStart(2, '0')}
                        </span>
                        <p 
                          className="truncate text-xs font-medium"
                          style={{ color: isCurrent ? 'var(--c-text)' : 'var(--c-text-secondary)' }}
                        >
                          {q.question_text}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isSaved ? (
                          <span className="c-badge c-badge-success text-[10px] py-0.5 px-1.5 font-bold">
                            Saved
                          </span>
                        ) : isCurrent ? (
                          <span className="c-badge c-badge-accent text-[10px] py-0.5 px-1.5 font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="c-badge c-badge-muted text-[10px] py-0.5 px-1.5">
                            Pending
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controlled Data Capture Note */}
            <div className="pt-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-bold" style={{ color: 'var(--c-text)' }}>Controlled Capture</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Recording starts and stops strictly when initiated by you.
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* Confirmation Modal to End Interview Session */}
      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="c-card p-6 rounded-lg w-full max-w-md space-y-4 border shadow-xl"
            style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
          >
            <div className="space-y-1">
              <p className="c-eyebrow">Confirmation</p>
              <h3 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Conclude Interview Session?</h3>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              {answeredCount < total
                ? `You have answered ${answeredCount} of ${total} questions. Concluding now will submit your recorded takes and proceed to evaluation.`
                : 'All prompts have been recorded. Concluding will finalize your session and proceed to evaluation processing.'}
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button 
                onClick={() => setConfirmEnd(false)} 
                disabled={ending}
                className="c-btn c-btn-secondary flex-1 py-2 text-xs font-semibold rounded-md"
              >
                Return
              </button>
              <button 
                onClick={handleEnd} 
                disabled={ending} 
                className="c-btn c-btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-md"
              >
                {ending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
