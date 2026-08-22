import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, Square, ArrowRight, ArrowLeft, PhoneOff, CheckCircle2 } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview, submitResponse, endInterview } from '../services/candidateApi';

// FR09 - Display Interview Questions (sequential, manual navigation)
// FR11 - Record Audio Responses, FR12 - Capture Facial Expressions
// FR33 - Controlled Data Capture (recording only while actively answering)
// FR10 - End Interview Session
//
// Recording uses the real MediaRecorder API. Nothing is uploaded or
// analyzed here — this only captures the response locally so the flow is
// authentic; speech-to-text / facial analysis (FR13-FR16) is future work.
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
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
        resolve({ durationSeconds: elapsed, sizeBytes: blob.size });
      };
      recorder.stop();
      setIsRecording(false);
    });
  };

  const handleStopAndSave = async () => {
    const result = await stopRecording();
    if (result) {
      setResponses((r) => ({ ...r, [question.id]: result }));
      await submitResponse(id, question.id, result);
    }
  };

  const goNext = () => {
    if (index < total - 1) setIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const handleEnd = async () => {
    setEnding(true);
    if (isRecording) await stopRecording();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    await endInterview(id);
    navigate(`/interview/${id}/complete`);
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
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-8 bg-indigo-500' : responses[q.id] ? 'w-4 bg-emerald-500' : 'w-4 bg-[var(--border-table)]'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Video */}
          <div className="md:col-span-2 glass-card rounded-2xl overflow-hidden aspect-video relative">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {isRecording && (
              <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/90 text-white text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> REC {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
              </span>
            )}
          </div>

          {/* Question + controls */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <div className="glass-card rounded-2xl p-6 flex-1">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">
                Question {index + 1} of {total} · {question.type}
              </p>
              <p className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-relaxed">
                {question.question_text}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!streamReady}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {!streamReady ? (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Mic className="w-4.5 h-4.5" />
                    )}
                    {!streamReady ? 'Preparing camera…' : answeredCurrent ? 'Re-record Answer' : 'Start Answering'}
                  </button>
                ) : (
                  <button
                    onClick={handleStopAndSave}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-500/20 transition-all active:scale-[0.98]"
                  >
                    <Square className="w-4 h-4" /> Stop & Save Answer
                  </button>
                )}
              </div>

              {answeredCurrent && !isRecording && (
                <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Response recorded ({responses[question.id].durationSeconds}s)
                </p>
              )}

              {streamError && (
                <p className="text-xs font-semibold text-rose-500">
                  Camera/microphone access was lost. Please check your browser permissions and refresh to continue.
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={goPrev}
                  disabled={index === 0 || isRecording}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-card-hover)] transition-all disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                {index < total - 1 ? (
                  <button
                    onClick={goNext}
                    disabled={isRecording}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-card-hover)] transition-all disabled:opacity-40"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmEnd(true)}
                    disabled={isRecording}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all disabled:opacity-40"
                  >
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
          <div className="theme-modal p-6 rounded-3xl w-full max-w-sm border">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">End this interview?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              {index < total - 1
                ? `You've answered ${Object.keys(responses).length} of ${total} questions. Ending now will submit what you've recorded so far.`
                : "This will submit your responses and take you to your evaluation."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-card-hover)] transition-all"
              >
                Keep Going
              </button>
              <button
                onClick={handleEnd}
                disabled={ending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all disabled:opacity-60"
              >
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
