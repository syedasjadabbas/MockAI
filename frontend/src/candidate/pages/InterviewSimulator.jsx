import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, Square, ArrowRight, ArrowLeft, PhoneOff, CheckCircle2, AlertCircle } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview, submitResponse, endInterview } from '../services/candidateApi';

// FR09 - Display Interview Questions (sequential, manual navigation)
// FR11 - Record Audio Responses, FR12 - Capture Facial Expressions
// FR33 - Controlled Data Capture (recording only while actively answering)
// FR10 - End Interview Session
//
// Recording uses the real MediaRecorder API. As soon as recording stops the
// captured Blob is uploaded to the backend (POST
// .../responses/{questionId}/media), which stores the file and runs real
// speech-to-text (FR15) against it server-side. A question is only ever
// marked "saved" once the backend confirms the upload - this screen never
// pretends a recording was saved/processed before that. Facial/vision
// analysis and full evaluation scoring (FR16-FR27) remain future work.
const InterviewSimulator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [interview, setInterview] = useState(null);
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
  // Holds the last recorded-but-not-yet-successfully-uploaded response so a
  // failed upload can be retried without forcing the candidate to re-record.
  const [pendingRecording, setPendingRecording] = useState(null);

  useEffect(() => {
    getActiveInterview(id).then((data) => {
      if (!data) {
        navigate('/interview/goal');
        return;
      }
      setInterview(data);
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStreamReady(true);
    }).catch(() => {
      // Permission was already confirmed on the Preparation screen; if it's
      // revoked mid-flow we surface that instead of leaving the record
      // button silently non-functional.
      setStreamError(true);
    });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const question = interview?.questions?.[index];
  const total = interview?.questions?.length || 0;

  const startRecording = () => {
    if (!streamRef.current) return;
    // A fresh attempt supersedes whatever failed/pending state the previous
    // take for this question left behind.
    setSaveError('');
    setPendingRecording(null);
    chunksRef.current = [];
    let recorder;
    try {
      recorder = new MediaRecorder(streamRef.current);
    } catch (err) {
      setSaveError('Could not start recording on this device/browser. Please try again.');
      return;
    }
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onerror = () => {
      // A real MediaRecorder failure mid-take - stop cleanly and surface it
      // rather than leaving the UI stuck showing "recording".
      clearInterval(timerRef.current);
      setIsRecording(false);
      setSaveError('Recording failed unexpectedly. Please start answering again.');
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

  // Uploads a captured recording to the backend. Shared by the normal
  // stop-and-save path and the retry path so a failed upload can be resent
  // without re-recording.
  const uploadResponse = async (result) => {
    setSaveError('');
    setSaving(true);
    setPendingRecording(result);
    try {
      await submitResponse(id, question.id, result);
      // Only marked as answered once the backend confirms the save, so the
      // UI never claims a response is saved when it wasn't.
      setResponses((r) => ({ ...r, [question.id]: result }));
      setPendingRecording(null);
    } catch (err) {
      // Network failure or backend rejection both land here - the recording
      // itself is preserved in pendingRecording so "Retry Upload" can resend
      // the same Blob without asking the candidate to answer again.
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

  const handleEnd = async () => {
    setEnding(true);
    setEndError('');
    try {
      if (isRecording) {
        // Ending mid-take must not silently discard the recording - upload
        // it first, same as the normal stop-and-save path, and only end the
        // interview once that succeeds.
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
      setEndError(err.message || 'Failed to end the interview. Please try again.');
      setEnding(false);
    }
  };

  if (!interview || !question) return null;

  const answeredCurrent = !!responses[question.id];

  return (
    <InterviewFlowLayout step="session" onExit={() => setConfirmEnd(true)}>
      <div className="max-w-4xl mx-auto">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {interview.questions.map((q, i) => (
            <div
              key={q.id}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? '2rem' : '1rem',
                background: i === index ? 'var(--c-accent)' : responses[q.id] ? 'var(--c-success)' : 'var(--c-border)',
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Video */}
          <div className="md:col-span-2 c-card rounded-2xl overflow-hidden aspect-video relative">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {isRecording && (
              <span
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'var(--c-danger)', color: '#fff' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> REC {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
              </span>
            )}
          </div>

          {/* Question + controls */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <div className="c-card rounded-2xl p-6 flex-1">
              <p className="c-eyebrow mb-2">
                Question {index + 1} of {total} · {question.type}
              </p>
              <p className="text-base sm:text-lg font-semibold leading-relaxed">
                {question.question_text}
              </p>
            </div>

            <div className="c-card rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {isRecording ? (
                  <button onClick={handleStopAndSave} className="c-btn flex-1 py-3" style={{ background: 'var(--c-danger)', color: '#fff' }}>
                    <Square className="w-4 h-4" />
                    Stop & Upload Answer
                  </button>
                ) : saving ? (
                  <button disabled className="c-btn c-btn-primary flex-1 py-3">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Uploading response…
                  </button>
                ) : (
                  <button onClick={startRecording} disabled={!streamReady} className="c-btn c-btn-primary flex-1 py-3">
                    {!streamReady ? (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Mic className="w-4.5 h-4.5" />
                    )}
                    {!streamReady ? 'Preparing camera…' : answeredCurrent ? 'Re-record Answer' : 'Start Answering'}
                  </button>
                )}
              </div>

              {/* Recording / uploading / saved are shown as distinct, mutually
                  exclusive states - the UI never claims a later stage happened
                  before the backend actually confirms it. */}
              {isRecording && (
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--c-danger)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-danger)' }} /> Recording locally…
                </p>
              )}

              {!isRecording && saving && (
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--c-accent)' }}>
                  <span className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent-soft-strong)', borderTopColor: 'var(--c-accent)' }} /> Uploading response…
                </p>
              )}

              {!isRecording && !saving && answeredCurrent && !saveError && (
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--c-success)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Response saved ({responses[question.id].durationSeconds}s)
                </p>
              )}

              {saveError && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--c-danger)' }}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {saveError}
                  </p>
                  {pendingRecording && !saving && (
                    <button onClick={handleRetryUpload} className="c-btn shrink-0 px-3 py-1.5 text-xs" style={{ background: 'var(--c-danger)', color: '#fff' }}>
                      Retry Upload
                    </button>
                  )}
                </div>
              )}

              {endError && (
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--c-danger)' }}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {endError}
                </p>
              )}

              {streamError && (
                <p className="text-xs font-semibold" style={{ color: 'var(--c-danger)' }}>
                  Camera/microphone access was lost. Please check your browser permissions and refresh to continue.
                </p>
              )}

              <div className="flex items-center gap-3">
                <button onClick={goPrev} disabled={index === 0 || isRecording || saving} className="c-btn c-btn-secondary flex-1 py-2.5">
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                {index < total - 1 ? (
                  <button onClick={goNext} disabled={isRecording || saving} className="c-btn c-btn-secondary flex-1 py-2.5">
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => setConfirmEnd(true)} disabled={isRecording || saving} className="c-btn flex-1 py-2.5" style={{ background: 'var(--c-success)', color: '#fff' }}>
                    Finish Interview
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="c-card p-6 rounded-3xl w-full max-w-sm">
            <h3 className="c-heading text-lg mb-2">End this interview?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--c-text-secondary)' }}>
              {index < total - 1
                ? `You've answered ${Object.keys(responses).length} of ${total} questions. Ending now will submit what you've recorded so far.`
                : "This will submit your responses and take you to your evaluation."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEnd(false)} className="c-btn c-btn-secondary flex-1 py-2.5">
                Keep Going
              </button>
              <button onClick={handleEnd} disabled={ending} className="c-btn flex-1 py-2.5" style={{ background: 'var(--c-danger)', color: '#fff' }}>
                <PhoneOff className="w-4 h-4" /> {ending ? 'Ending…' : 'End Interview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </InterviewFlowLayout>
  );
};

export default InterviewSimulator;
