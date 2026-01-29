"use client";

import React, { useEffect, useRef } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
}

export function GlitchText({ text, className = '' }: GlitchTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const loadAnime = async () => {
      const { animate, stagger } = await import('animejs');

      if (containerRef.current) {
        const chars = containerRef.current.querySelectorAll('.char');

        // Initial animation
        animate(chars, {
          opacity: [0, 1],
          translateY: [20, 0],
          delay: stagger(50),
          easing: 'outExpo',
          duration: 800,
        });

        // Glitch effect on random characters
        const glitchInterval = setInterval(() => {
          const randomChars = Array.from(chars)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

          animate(randomChars, {
            translateX: [
              { to: -3, duration: 50 },
              { to: 3, duration: 50 },
              { to: -2, duration: 50 },
              { to: 0, duration: 50 },
            ],
            color: [
              { to: '#10b981', duration: 50 },
              { to: '#f59e0b', duration: 50 },
              { to: '#8b5cf6', duration: 50 },
              { to: '#f5f5f5', duration: 50 },
            ],
            easing: 'linear',
          });
        }, 3000);

        return () => clearInterval(glitchInterval);
      }
    };

    loadAnime();
  }, [text]);

  return (
    <span ref={containerRef} className={`inline-block ${className}`}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="char inline-block"
          style={{ opacity: 0 }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
