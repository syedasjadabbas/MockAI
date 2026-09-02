import React, { useState, useEffect, useRef } from 'react';

/**
 * TypewriterCode
 * Progressively types out syntax-highlighted code lines when scrolled into view.
 *
 * @param {Array} lines - Array of lines, where each line is an array of tokens: [{ text: string, color: string }]
 * @param {number} duration - Total typing duration in milliseconds (default 2200ms)
 * @param {string} className - Additional container classes
 */
const TypewriterCode = ({
  lines = [],
  duration = 2200,
  className = '',
}) => {
  const containerRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [typedChars, setTypedChars] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Flatten all tokens to count total characters
  const totalChars = React.useMemo(() => {
    let count = 0;
    lines.forEach((line) => {
      line.forEach((token) => {
        count += token.text.length;
      });
      count += 1; // newline character
    });
    return count;
  }, [lines]);

  // Trigger animation on scroll into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.25 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  // Animate character typing
  useEffect(() => {
    if (!hasStarted || isComplete) return;

    const startTime = performance.now();

    const frame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Linear smooth typing
      const current = Math.floor(progress * totalChars);
      setTypedChars(current);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setTypedChars(totalChars);
        setIsComplete(true);
      }
    };

    const animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [hasStarted, isComplete, duration, totalChars]);

  // Render tokens up to typedChars
  let remainingChars = typedChars;

  return (
    <div ref={containerRef} className={`font-mono text-xs leading-relaxed ${className}`}>
      <div className="overflow-x-auto text-[11px] leading-relaxed font-mono">
        {lines.map((line, lineIdx) => {
          if (remainingChars <= 0) return null;

          return (
            <div key={lineIdx} className="whitespace-pre">
              {line.map((token, tokenIdx) => {
                if (remainingChars <= 0) return null;

                const tokenText = token.text;
                const charsToTake = Math.min(tokenText.length, remainingChars);
                remainingChars -= charsToTake;
                const visibleText = tokenText.slice(0, charsToTake);

                return (
                  <span
                    key={tokenIdx}
                    style={{ color: token.color || '#A3A3A3' }}
                  >
                    {visibleText}
                  </span>
                );
              })}
              {/* Account for newline */}
              {(() => {
                remainingChars -= 1;
                return null;
              })()}
            </div>
          );
        })}
        {/* Blinking Cursor while typing */}
        {!isComplete && hasStarted && (
          <span className="inline-block w-1.5 h-3.5 bg-[#FF6B35] animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
};

export default TypewriterCode;
