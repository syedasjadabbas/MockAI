import React, { useEffect, useRef } from 'react';

// NFR 2-02 - a live microphone level meter. Bar heights follow the real input
// level of the given MediaStream (Web Audio AnalyserNode), so silence shows
// flat bars and speech moves them; nothing here is decorative.
const AudioLevelMeter = ({ stream, bars = 12, height = 14, color = 'var(--c-accent)' }) => {
  const barRefs = useRef([]);

  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) return undefined;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return undefined;

    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf;

    const draw = () => {
      analyser.getByteFrequencyData(data);
      // Speech energy sits in the lower bins; spread them over the bars.
      const usable = Math.floor(data.length * 0.6);
      const per = Math.max(1, Math.floor(usable / bars));
      for (let i = 0; i < bars; i += 1) {
        let sum = 0;
        for (let j = 0; j < per; j += 1) sum += data[i * per + j] || 0;
        const level = Math.min(1, sum / per / 170);
        const el = barRefs.current[i];
        if (el) el.style.height = `${Math.max(2, Math.round(level * height))}px`;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [stream, bars, height]);

  return (
    <div className="flex items-center gap-[2px]" style={{ height }} role="meter" aria-label="Microphone level">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          ref={(el) => { barRefs.current[i] = el; }}
          className="w-[3px] rounded-sm transition-[height] duration-75"
          style={{ height: 2, background: color }}
        />
      ))}
    </div>
  );
};

export default AudioLevelMeter;
