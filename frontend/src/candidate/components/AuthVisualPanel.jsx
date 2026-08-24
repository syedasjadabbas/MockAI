import React, { useMemo } from 'react';

// Shared visual identity panel for Login / Register / Forgot Password.
//
// Deliberately NOT a stock photograph. After two rounds of feedback that
// authentication photography kept reading as generic stock art (both
// here and on the Admin auth screens), this uses a bespoke, on-brand
// composition instead: MockAI's own type system (Fraunces) plus a
// restrained waveform motif that's actually connected to the product -
// MockAI records and reviews spoken interview answers, so a calm audio
// waveform is a real metaphor, not decoration for its own sake. Zero
// external image dependency means zero risk of it ever looking like
// "stock photography" again.
//
// Shown identically across all three auth states so the product identity
// stays consistent while only the form beside it changes.

function makeWaveform(count) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const h = 18 + 30 * Math.abs(Math.sin(t * 8.5)) + 22 * Math.abs(Math.sin(t * 3.1 + 1.4));
    bars.push(Math.min(78, Math.round(h)));
  }
  return bars;
}

const BARS = makeWaveform(56);

const AuthVisualPanel = () => {
  const bars = useMemo(() => BARS, []);

  return (
    <div
      className="relative hidden lg:flex lg:flex-col lg:justify-between h-full overflow-hidden p-12 xl:p-16"
      style={{
        background: 'linear-gradient(165deg, var(--c-bg-soft) 0%, var(--c-surface-muted) 100%)',
        borderRight: '1px solid var(--c-border)',
      }}
    >
      {/* Restrained decorative geometry - a single thin ring, not a motif overload */}
      <div
        className="absolute -right-24 -top-24 w-72 h-72 rounded-full"
        style={{ border: '1px solid var(--c-border-strong)', opacity: 0.6 }}
      />

      {/* Waveform texture - low-opacity, sits behind the copy like a watermark */}
      <div className="absolute inset-x-12 xl:inset-x-16 bottom-28 top-1/2 flex items-end gap-[3px] opacity-[0.16] pointer-events-none">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{ height: `${h}%`, background: 'var(--c-accent)' }}
          />
        ))}
      </div>

      <span className="relative flex items-baseline gap-0.5">
        <span className="c-heading text-xl tracking-tight">Mock</span>
        <span className="c-heading text-xl tracking-tight" style={{ color: 'var(--c-accent)' }}>AI</span>
      </span>

      <div className="relative max-w-md">
        <p className="c-eyebrow mb-4">Interview Practice</p>
        <h1 className="c-heading text-4xl xl:text-[2.75rem] leading-[1.1]">
          Prepare with purpose.
        </h1>
        <p className="text-sm mt-5 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
          Practice real interview questions, understand your performance, and improve with every session.
        </p>
      </div>
    </div>
  );
};

export default AuthVisualPanel;
