import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Mic,
  Square,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Clock,
  ShieldCheck,
  Lightbulb,
  CheckCircle2,
  Keyboard,
  Save,
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import AudioLevelMeter from '../components/AudioLevelMeter';
import {
  getActiveInterview,
  submitResponse,
  submitResponseMetadataOnly,
  submitTextResponse,
  endInterview,
  checkCameraPresence,
} from '../services/candidateApi';

// Live presence check: one frame every 2 s; warn after 2 misses in a row
// (about 4 s out of frame) so a brief glance away does not trigger it.
const PRESENCE_CHECK_MS = 2000;
const PRESENCE_MISSES_TO_WARN = 2;

// FR 12-03 / NFR 5-02 - a recording stops on its own after 3 minutes, so an
// answer always fits the upload limit; a countdown shows in the last 15 s.
const MAX_ANSWER_SECONDS = 180;
const ANSWER_WARNING_SECONDS = 165;
const VIDEO_BITS_PER_SECOND = 1_000_000;

// Chrome, Edge and Firefox record WebM; Safari records MP4 (NFR 14).
function pickRecorderType(audioOnly) {
  const candidates = audioOnly
    ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    : ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

// FR10/FR11/FR12/FR33/FR15 - Full multimodal audio/video prompt simulator
const InterviewSimulator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Objective 1 - "text, voice or video". textOnly is set when the candidate
  // declined camera/mic on the Preparation screen (navigation state, or the
  // stored consent record after a page refresh); no media is ever opened.
  // NFR 10 - the camera/mic are only opened once the interview's stored
  // consent covers both (consentChecked); otherwise the candidate is sent
  // back to Preparation to give it.
  const [consentDeclined, setConsentDeclined] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const textOnly = !!location.state?.textOnly || consentDeclined;
  // Objective 1 "voice" - microphone consented, camera not: audio-only answers.
  const [voiceOnly, setVoiceOnly] = useState(!!location.state?.voiceOnly);
  const [mediaStream, setMediaStream] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [answerMode, setAnswerMode] = useState(location.state?.textOnly ? 'text' : 'spoken');
  const [typedDrafts, setTypedDrafts] = useState({});
  const typingStartRef = useRef({});

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

  // References for live streams & hardware recording
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [pendingRecording, setPendingRecording] = useState(null);

  // Live camera presence: 'ok' | 'away' | 'multiple'
  const [presence, setPresence] = useState('ok');
  const presenceMissesRef = useRef(0);
  const presenceInFlightRef = useRef(false);
  const presenceCanvasRef = useRef(null);

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
        const consent = data.recordingConsent;
        if (!location.state?.textOnly) {
          if (consent && consent.microphone === false) {
            setConsentDeclined(true);
            setAnswerMode('text');
          } else if (!consent?.microphone) {
            navigate(`/interview/${id}/prepare`, { replace: true });
            return;
          } else if (!consent.camera) {
            setVoiceOnly(true);
          }
        }
        setConsentChecked(true);
        setInterview(data);

        // Pre-populate already recorded question response cache
        const map = {};
        const drafts = {};
        (data.responses || []).forEach((r) => {
          const qId = r.question_id || r.questionId;
          if (qId) {
            map[qId] = {
              durationSeconds: r.duration_seconds || r.durationSeconds || 0,
              timestamp: r.created_at || r.createdAt,
              mode: r.response_mode || 'spoken',
            };
            if (r.response_mode === 'text' && r.text_response) {
              drafts[qId] = r.text_response;
            }
          }
        });
        setResponses(map);
        setTypedDrafts(drafts);
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
    if (textOnly || !consentChecked) return undefined;

    async function initStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: voiceOnly
            ? false
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
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

        // NFR 5-03 - tell the candidate if a device is unplugged or blocked
        // mid-session instead of failing silently on the next recording.
        stream.getTracks().forEach((track) => {
          track.addEventListener('ended', () => {
            if (!active) return;
            setStreamReady(false);
            setStreamError(`Your ${track.kind === 'video' ? 'camera' : 'microphone'} was disconnected. Reconnect it and refresh the page; your saved answers are kept.`);
          });
        });

        streamRef.current = stream;
        setMediaStream(stream);
        setStreamReady(true);
        setStreamError('');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [textOnly, consentChecked, voiceOnly]);

  // 2b. Live camera presence check - warns the candidate while they can still
  // fix it. Stops quietly if the server refuses (e.g. no camera consent).
  useEffect(() => {
    if (textOnly || voiceOnly || !streamReady || !interview?.id) return undefined;
    let stopped = false;

    const tick = async () => {
      const video = videoRef.current;
      if (stopped || presenceInFlightRef.current || !video || !video.videoWidth) return;
      const canvas = presenceCanvasRef.current || (presenceCanvasRef.current = document.createElement('canvas'));
      const w = 320;
      const h = Math.round((video.videoHeight / video.videoWidth) * w);
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(video, 0, 0, w, h);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7));
      if (!blob || stopped) return;
      presenceInFlightRef.current = true;
      try {
        const res = await checkCameraPresence(interview.id, blob);
        if (stopped) return;
        if (!res.face_detected) {
          presenceMissesRef.current += 1;
          if (presenceMissesRef.current >= PRESENCE_MISSES_TO_WARN) setPresence('away');
        } else {
          presenceMissesRef.current = 0;
          setPresence(res.face_count > 1 ? 'multiple' : 'ok');
        }
      } catch (err) {
        if (err?.status === 403 || err?.status === 400 || err?.status === 404) stopped = true;
      } finally {
        presenceInFlightRef.current = false;
      }
    };

    const timer = setInterval(tick, PRESENCE_CHECK_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [textOnly, voiceOnly, streamReady, interview?.id]);

  // NFR 6-02 / 7-03 - warn before the tab is closed or reloaded while an
  // answer is being recorded or uploaded (it would be lost).
  useEffect(() => {
    if (!isRecording && !saving) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isRecording, saving]);

  // 3. Start Recording
  const startRecording = () => {
    if (!streamRef.current) return;
    setSaveError('');
    chunksRef.current = [];
    setPendingRecording(null);

    const mimeType = pickRecorderType(voiceOnly);

    try {
      const options = { audioBitsPerSecond: 128000 };
      if (mimeType) options.mimeType = mimeType;
      if (!voiceOnly) options.videoBitsPerSecond = VIDEO_BITS_PER_SECOND;
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
        const mimeType = mediaRecorderRef.current?.mimeType || (voiceOnly ? 'audio/webm' : 'video/webm');
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
          [currentQuestion.id]: { durationSeconds: duration, timestamp: new Date().toISOString(), mode: 'spoken' },
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

    if (mediaRecorderRef.current.state === 'recording' && typeof mediaRecorderRef.current.requestData === 'function') {
      try {
        mediaRecorderRef.current.requestData();
      } catch (e) {
        // ignore
      }
    }
    mediaRecorderRef.current.stop();
  };

  // FR 12-03 - stop and save automatically at the time limit.
  useEffect(() => {
    if (isRecording && elapsed >= MAX_ANSWER_SECONDS) {
      stopRecordingAndUpload();
    }
  }, [isRecording, elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Typed answer save (Objective 1)
  const handleTypedChange = (questionId, value) => {
    if (!typingStartRef.current[questionId]) {
      typingStartRef.current[questionId] = Date.now();
    }
    setTypedDrafts((prev) => ({ ...prev, [questionId]: value }));
  };

  const saveTypedAnswer = async () => {
    const currentQuestion = interview.questions[index];
    const text = (typedDrafts[currentQuestion.id] || '').trim();
    if (text.length < 2) {
      setSaveError('Please type your answer before saving.');
      return;
    }
    const startedAt = typingStartRef.current[currentQuestion.id];
    const durationSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
    setSaving(true);
    setSaveError('');
    try {
      await submitTextResponse(id, currentQuestion.id, { text, durationSeconds });
      setResponses((prev) => ({
        ...prev,
        [currentQuestion.id]: { durationSeconds: durationSeconds || 0, timestamp: new Date().toISOString(), mode: 'text' },
      }));
    } catch (err) {
      setSaveError(err.message || 'Could not save your typed answer. Please try again.');
    } finally {
      setSaving(false);
    }
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

  // FR 10 - the interview can be ended from any question. A failed request
  // is shown instead of moving on as if it had worked.
  const handleEnd = async () => {
    setEnding(true);
    setEndError('');
    try {
      await endInterview(id);
    } catch (err) {
      const alreadyDone = err?.status === 400 && /already been completed/i.test(err?.message || '');
      if (!alreadyDone) {
        setEnding(false);
        setConfirmEnd(false);
        setEndError(err?.message || 'Could not end the interview. Check your connection and try again.');
        return;
      }
    }
    navigate(`/interview/${id}/complete`);
  };

  // Leaving with the top-bar close button keeps the saved answers; the
  // interview can be resumed from History or ended now.
  const handleLeave = () => {
    if (isRecording || saving) return;
    setConfirmLeave(true);
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
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-muted)' }}>Loading your interview…</p>
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
  const isTextMode = answerMode === 'text';
  const currentDraft = typedDrafts[question?.id] || '';
  const draftWordCount = currentDraft.trim() ? currentDraft.trim().split(/\s+/).length : 0;
  const savedMode = responses[question?.id]?.mode;

  return (
    <InterviewFlowLayout step="session" onExit={handleLeave}>
      <div className="space-y-6 py-2">

        {/* Question header: where am I, and a step bar to move between questions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
              {answeredCount} of {total} answered
            </p>
            <h2 className="c-heading text-lg sm:text-xl font-bold" style={{ color: 'var(--c-text)' }}>
              Question {index + 1} of {total}
            </h2>
          </div>

          <ol className="flex items-center gap-2" aria-label="Questions">
            {interview.questions.map((q, i) => {
              const isDone = !!responses[q.id];
              const isCurrent = i === index;
              return (
                <li key={q.id} className="flex items-center gap-2">
                  {i > 0 && (
                    <span
                      className="w-6 sm:w-10 h-0.5 rounded"
                      style={{ background: responses[interview.questions[i - 1].id] ? 'var(--c-success)' : 'var(--c-border)' }}
                    />
                  )}
                  <button
                    onClick={() => jumpToQuestion(i)}
                    disabled={isRecording || saving}
                    aria-label={`Question ${i + 1}${isDone ? ', answered' : ''}${isCurrent ? ', current' : ''}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    title={q.question_text}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors disabled:cursor-not-allowed"
                    style={{
                      background: isDone ? 'var(--c-success)' : isCurrent ? 'var(--c-accent)' : 'transparent',
                      borderColor: isDone ? 'var(--c-success)' : isCurrent ? 'var(--c-accent)' : 'var(--c-border)',
                      color: isDone || isCurrent ? '#FFFFFF' : 'var(--c-text-muted)',
                    }}
                  >
                    {isDone && !isCurrent ? <Check className="w-4 h-4" /> : i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* Question and answer */}
          <div className="lg:col-span-7">
            <div
              className="c-card p-6 sm:p-8 space-y-6 rounded-xl border shadow-sm"
              style={{
                background: 'var(--c-surface)',
                borderColor: isRecording ? 'var(--c-danger)' : 'var(--c-border)',
              }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="c-badge c-badge-accent text-[11px]">{question.type || 'Technical'}</span>
                <span className="c-badge c-badge-muted text-[11px]">{question.difficulty || 'Medium'}</span>
              </div>

              <h1 className="c-heading text-xl sm:text-2xl font-bold leading-snug" style={{ color: 'var(--c-text)' }}>
                {question.question_text}
              </h1>

              {!answeredCurrent && !isRecording && !saving && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  {isTextMode
                    ? 'Type your answer as you would say it, then save it.'
                    : 'Take a few seconds to think, then press Start answering. Aim for about 30 to 90 seconds.'}
                </p>
              )}

              {/* Answer by speaking (audio + video) or by typing (Objective 1) */}
              {!textOnly && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>Answer by</span>
                  <div className="flex items-center gap-1 p-1 rounded-md border" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-muted)' }}>
                    {[
                      { id: 'spoken', label: 'Speaking', Icon: Mic },
                      { id: 'text', label: 'Typing', Icon: Keyboard },
                    ].map(({ id: modeId, label, Icon }) => (
                      <button
                        key={modeId}
                        onClick={() => { setAnswerMode(modeId); setSaveError(''); }}
                        disabled={isRecording || saving}
                        aria-pressed={answerMode === modeId}
                        className="px-3 py-2 sm:py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        style={{
                          background: answerMode === modeId ? 'var(--c-surface)' : 'transparent',
                          color: answerMode === modeId ? 'var(--c-text)' : 'var(--c-text-muted)',
                          boxShadow: answerMode === modeId ? '0 1px 2px rgba(0,0,0,0.25)' : 'none',
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isTextMode && (
                <div className="space-y-1.5">
                  <textarea
                    value={currentDraft}
                    onChange={(e) => handleTypedChange(question.id, e.target.value)}
                    disabled={saving}
                    rows={6}
                    maxLength={5000}
                    aria-label="Your answer"
                    placeholder="Type your answer here."
                    className="w-full rounded-md border p-3 text-sm leading-relaxed resize-y focus:outline-none"
                    style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                  />
                  <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
                    <span>Typed answers are scored on content, grammar and tone only.</span>
                    <span className="font-mono shrink-0 pl-2">{draftWordCount} words</span>
                  </div>
                </div>
              )}

              {/* Recording in progress */}
              {isRecording && (
                <div
                  className="rounded-lg p-4 flex items-center justify-between gap-3 border"
                  style={{ background: 'var(--c-badge-danger-bg)', borderColor: 'var(--c-badge-danger-border)' }}
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-500">
                        {elapsed >= ANSWER_WARNING_SECONDS
                          ? `Recording stops by itself in ${Math.max(0, MAX_ANSWER_SECONDS - elapsed)}s`
                          : 'Recording your answer'}
                      </p>
                      <p className="font-mono text-2xl font-bold" style={{ color: 'var(--c-text)' }}>
                        {formatTime(elapsed)} <span className="text-xs font-medium" style={{ color: 'var(--c-text-muted)' }}>/ {formatTime(MAX_ANSWER_SECONDS)}</span>
                      </p>
                    </div>
                  </div>
                  <AudioLevelMeter stream={mediaStream} bars={16} height={22} color="var(--c-danger)" />
                </div>
              )}

              {/* Saving */}
              {!isRecording && saving && (
                <div
                  className="rounded-lg p-4 flex items-center gap-3 border"
                  style={{ background: 'var(--c-badge-accent-bg)', borderColor: 'var(--c-badge-accent-border)' }}
                  role="status"
                >
                  <div className="w-4 h-4 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>Saving your answer…</p>
                </div>
              )}

              {/* Saved */}
              {answeredCurrent && !isRecording && !saving && (
                <div
                  className="rounded-lg p-4 flex items-center gap-3 border"
                  style={{ background: 'var(--c-badge-success-bg)', borderColor: 'var(--c-badge-success-border, var(--c-border))' }}
                  role="status"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--c-success)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                      {savedMode === 'text' ? 'Typed answer saved' : `Answer saved (${responses[question.id]?.durationSeconds || 0} seconds)`}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>
                      {isFinalQuestion ? 'That was the last question. Finish when you are ready.' : 'Move on to the next question, or answer this one again.'}
                    </p>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="c-badge-danger rounded-md p-3 flex items-start justify-between gap-3 text-xs leading-relaxed" role="alert">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Your answer was not saved</p>
                      <p>{saveError}</p>
                    </div>
                  </div>
                  {pendingRecording && !saving && (
                    <button
                      onClick={handleRetryUpload}
                      className="c-btn shrink-0 px-2.5 py-1 text-xs rounded font-bold"
                      style={{ background: 'var(--c-danger)', color: '#fff' }}
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}

              {!isTextMode && !textOnly && !voiceOnly && presence === 'away' && (
                <div className="c-badge-warning rounded-md p-3 flex items-start gap-2 text-xs" role="status" aria-live="polite">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    <strong>We can't see your face.</strong> Move back in front of the camera.
                    {isRecording ? ' Time out of frame lowers the score for this answer.' : ''}
                  </p>
                </div>
              )}

              {!isTextMode && !textOnly && !voiceOnly && presence === 'multiple' && (
                <div className="c-badge-warning rounded-md p-3 flex items-start gap-2 text-xs" role="status" aria-live="polite">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Another person is in view. Answer on your own, with only your face in frame.</p>
                </div>
              )}

              {streamError && !isTextMode && (
                <div className="c-badge-danger rounded-md p-3 flex items-start gap-2 text-xs" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{streamError}</p>
                </div>
              )}

              {endError && (
                <div className="c-badge-danger rounded-md p-2.5 flex items-start gap-2 text-xs" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{endError}</p>
                </div>
              )}

              {/* Main action: one clear next step at a time */}
              <div className="space-y-2.5 pt-1">
                {isRecording ? (
                  <button
                    onClick={handleStopAndSave}
                    className="c-btn c-btn-danger w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop and save answer</span>
                  </button>
                ) : saving ? (
                  <button disabled className="c-btn c-btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 opacity-75 cursor-not-allowed rounded-md">
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Saving…</span>
                  </button>
                ) : answeredCurrent ? (
                  <>
                    {isFinalQuestion ? (
                      <button
                        onClick={() => setConfirmEnd(true)}
                        className="c-btn w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md text-white"
                        style={{ background: 'var(--c-success)' }}
                      >
                        <Check className="w-4 h-4" />
                        <span>Finish interview</span>
                      </button>
                    ) : (
                      <button
                        onClick={goNext}
                        className="c-btn c-btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md"
                      >
                        <span>Next question</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {isTextMode ? (
                      <button
                        onClick={saveTypedAnswer}
                        disabled={draftWordCount === 0}
                        className="c-btn c-btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save changes to my answer</span>
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        disabled={!streamReady}
                        className="c-btn c-btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Answer again</span>
                      </button>
                    )}
                  </>
                ) : isTextMode ? (
                  <button
                    onClick={saveTypedAnswer}
                    disabled={draftWordCount === 0}
                    className="c-btn c-btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save answer</span>
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={!streamReady}
                    className="c-btn c-btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md"
                  >
                    {!streamReady ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    <span>{!streamReady ? (voiceOnly ? 'Connecting microphone…' : 'Connecting camera…') : 'Start answering'}</span>
                  </button>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={goPrev}
                    disabled={index === 0 || isRecording || saving}
                    className="text-xs font-semibold flex items-center gap-1 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: 'var(--c-text-secondary)' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Previous question
                  </button>
                  {!answeredCurrent && !isFinalQuestion && (
                    <button
                      onClick={goNext}
                      disabled={isRecording || saving}
                      className="text-xs font-semibold flex items-center gap-1 py-2 disabled:opacity-40"
                      style={{ color: 'var(--c-text-secondary)' }}
                    >
                      Skip for now
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(answeredCurrent || isFinalQuestion) && !(answeredCurrent && isFinalQuestion) && (
                    <button
                      onClick={() => setConfirmEnd(true)}
                      disabled={isRecording || saving}
                      className="text-xs font-semibold py-2 hover:underline underline-offset-2 disabled:opacity-40"
                      style={{ color: 'var(--c-text-muted)' }}
                    >
                      Finish interview
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Camera and tips */}
          <div className="lg:col-span-5 space-y-5">
            <div
              className="overflow-hidden relative rounded-xl border shadow-sm"
              style={{
                aspectRatio: '4/3',
                background: 'var(--c-surface-card)',
                borderColor: isRecording ? 'var(--c-danger)' : 'var(--c-border)',
              }}
            >
              {textOnly ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6">
                  <Keyboard className="w-8 h-8" style={{ color: 'var(--c-text-muted)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Typed answers</p>
                  <p className="text-xs max-w-xs" style={{ color: 'var(--c-text-muted)' }}>
                    Camera and microphone are off. Nothing is recorded.
                  </p>
                </div>
              ) : voiceOnly ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6">
                  <Mic className="w-8 h-8" style={{ color: isRecording ? 'var(--c-danger)' : 'var(--c-accent)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Voice-only interview</p>
                  <p className="text-xs max-w-xs" style={{ color: 'var(--c-text-muted)' }}>
                    Only your voice is recorded while you answer. The camera is off.
                  </p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              )}

              {!textOnly && !voiceOnly && presence === 'away' && (
                <div
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-4 px-3 py-2 rounded-md border text-center text-xs font-bold pointer-events-none"
                  style={{ background: 'rgba(10, 16, 32, 0.85)', borderColor: 'var(--c-warning)', color: 'var(--c-warning)' }}
                >
                  Face not in frame
                </div>
              )}

              <div className="absolute top-3 left-3 pointer-events-none">
                <span
                  className="px-2 py-1 rounded-md text-[11px] font-semibold"
                  style={{
                    background: isRecording ? 'var(--c-danger)' : 'rgba(10, 16, 32, 0.75)',
                    color: '#FFFFFF',
                  }}
                >
                  {isRecording
                    ? `● Recording ${formatTime(elapsed)}`
                    : textOnly
                    ? 'Camera off'
                    : voiceOnly
                    ? (streamReady ? 'Microphone on' : 'Connecting microphone…')
                    : streamReady
                    ? 'Camera on'
                    : 'Connecting camera…'}
                </span>
              </div>

              {!textOnly && (
                <div className="absolute bottom-3 left-3 pointer-events-none" aria-hidden="true">
                  <div className="px-2.5 py-1 rounded-md flex items-center gap-2" style={{ background: 'rgba(10, 16, 32, 0.75)' }}>
                    <Mic className="w-3 h-3 shrink-0" style={{ color: isRecording ? 'var(--c-danger)' : '#FFFFFF' }} />
                    <AudioLevelMeter stream={mediaStream} bars={10} height={12} color={isRecording ? 'var(--c-danger)' : 'var(--c-accent)'} />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Tips for a good answer</h3>
              </div>
              <ul className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                <li className="flex gap-2"><span style={{ color: 'var(--c-accent)' }}>•</span>Start with a direct answer, then give one example.</li>
                {!textOnly && !voiceOnly && <li className="flex gap-2"><span style={{ color: 'var(--c-accent)' }}>•</span>Look at the camera and keep your face in the frame.</li>}
                {!textOnly && <li className="flex gap-2"><span style={{ color: 'var(--c-accent)' }}>•</span>Speak clearly and at a steady pace. Short pauses are fine.</li>}
                <li className="flex gap-2"><span style={{ color: 'var(--c-accent)' }}>•</span>You can answer a question again before you finish.</li>
              </ul>
              {!textOnly && (
                <p className="flex items-start gap-1.5 text-[11px] pt-2 border-t" style={{ color: 'var(--c-text-muted)', borderColor: 'var(--c-border)' }}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px" style={{ color: 'var(--c-success)' }} />
                  Recording runs only while you answer and stops by itself after 3 minutes.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leave dialog (top-bar close button) */}
      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="c-card p-6 rounded-lg w-full max-w-md space-y-4 border shadow-xl"
            style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
          >
            <h3 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Leave the interview?</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              Your {answeredCount} saved answer{answeredCount === 1 ? '' : 's'} {answeredCount === 1 ? 'is' : 'are'} kept. You can come back and
              finish it from Interview History, or end it now and get your results.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button onClick={() => setConfirmLeave(false)} className="c-btn c-btn-secondary flex-1 py-2 text-xs font-semibold rounded-md">
                Stay
              </button>
              <button onClick={() => navigate('/history')} className="c-btn c-btn-secondary flex-1 py-2 text-xs font-semibold rounded-md">
                Finish later
              </button>
              <button
                onClick={() => { setConfirmLeave(false); setConfirmEnd(true); }}
                className="c-btn c-btn-primary flex-1 py-2 text-xs font-bold rounded-md"
              >
                End now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to End Interview Session */}
      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="c-card p-6 rounded-lg w-full max-w-md space-y-4 border shadow-xl max-h-[90dvh] overflow-y-auto"
            style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
          >
            <div className="space-y-1">
              <h3 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Finish the interview?</h3>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              {answeredCount < total
                ? `You have answered ${answeredCount} of ${total} questions. Questions you skip score zero. Your saved answers will be analysed and you will see your results.`
                : 'All questions are answered. Your answers will be analysed and you will see your results.'}
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button 
                onClick={() => setConfirmEnd(false)} 
                disabled={ending}
                className="c-btn c-btn-secondary flex-1 py-2 text-xs font-semibold rounded-md"
              >
                Keep answering
              </button>
              <button 
                onClick={handleEnd} 
                disabled={ending} 
                className="c-btn c-btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-md"
              >
                {ending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Finishing…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Finish and see results</span>
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
