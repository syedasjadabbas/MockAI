import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CANDIDATE_IMAGES } from '../assets/images';
import logo from '../../assets/logo.png';

function makeWaveform(count) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const env = Math.sin(t * Math.PI);
    const wave = 0.45 * Math.sin(t * 8 * Math.PI) + 
                 0.35 * Math.cos(t * 18 * Math.PI + 0.5) + 
                 0.20 * Math.sin(t * 28 * Math.PI);
    const h = 15 + 70 * Math.abs(wave) * env;
    bars.push(Math.min(85, Math.max(15, Math.round(h))));
  }
  return bars;
}

const BARS = makeWaveform(48);

const AuthVisualPanel = () => {
  const bars = useMemo(() => BARS, []);

  return (
    <div
      className="relative hidden lg:flex lg:flex-col lg:justify-between h-full overflow-hidden p-10 xl:p-14 select-none bg-cover bg-center border-r"
      style={{
        backgroundImage: `url(${CANDIDATE_IMAGES.authHero})`,
        borderColor: 'var(--c-border)',
        backgroundColor: '#070B16',
      }}
    >
      <div className="absolute inset-0 bg-[#070B16]/80 pointer-events-none" />

      {/* Brand logo */}
      <Link 
        to="/" 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
        className="relative z-10 shrink-0 select-none block"
      >
        <img src={logo} alt="MockAI Logo" className="c-brand-logo" />
      </Link>

      {/* Center Composition */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md py-10">
        <p className="c-eyebrow mb-2">Practice Platform</p>
        
        <h1 className="c-heading text-3xl xl:text-4xl font-bold leading-tight mb-4 text-white">
          Practice before it matters.
        </h1>
        
        {/* Waveform indicator */}
        <div 
          className="h-12 flex items-end gap-[3px] my-5 pointer-events-none"
          aria-hidden="true"
        >
          {bars.map((h, i) => {
            const t = i / (bars.length - 1);
            const env = Math.sin(t * Math.PI);
            const opacity = 0.4 + 0.6 * env;
            
            return (
              <div
                key={i}
                className="flex-1 rounded-xs origin-bottom"
                style={{
                  height: `${h}%`,
                  background: 'var(--c-accent)',
                  opacity: opacity,
                  animation: 'waveform-shimmer 4s ease-in-out infinite',
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-slate-300">
          Simulate realistic interviews with timed prompts, speech recording, and structured evaluation scoring.
        </p>
      </div>

      <div className="h-4 shrink-0 relative z-10" />
    </div>
  );
};

export default AuthVisualPanel;
