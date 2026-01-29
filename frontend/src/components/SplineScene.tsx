"use client";

import { useEffect, useState } from "react";

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const [Spline, setSpline] = useState<React.ComponentType<{ scene: string }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@splinetool/react-spline")
      .then((mod) => {
        setSpline(() => mod.default);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Spline:", err);
        setError("Failed to load 3D scene");
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="w-16 h-16 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !Spline) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-emerald-900/20 to-emerald-600/10 rounded-2xl`}>
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-[var(--color-text-secondary)]">3D Visualization</p>
        </div>
      </div>
    );
  }

  // Contained box - no fixed positioning, no interaction
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'visible',
        pointerEvents: 'none', // Disable all interaction
      }}
    >
      <div
        style={{
          width: '140%',
          height: '140%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.7)',
        }}
        className="[&_canvas]:!bg-transparent"
      >
        <Spline scene={scene} />
      </div>
    </div>
  );
}
