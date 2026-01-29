"use client";

import React from 'react';

interface CarouselItem {
  name: string;
  logo?: string;
}

interface InfiniteCarouselProps {
  items: CarouselItem[];
  direction?: 'left' | 'right';
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
}

const speedMap = {
  slow: '60s',
  normal: '40s',
  fast: '25s',
};

export function InfiniteCarousel({
  items,
  direction = 'left',
  speed = 'normal',
  className = '',
}: InfiniteCarouselProps) {
  const duplicatedItems = [...items, ...items, ...items];

  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className="flex gap-8 items-center"
        style={{
          animation: `scroll-${direction} ${speedMap[speed]} linear infinite`,
        }}
      >
        {duplicatedItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm whitespace-nowrap hover:bg-white/10 transition-colors flex-shrink-0"
          >
            {item.logo ? (
              <img src={item.logo} alt={item.name} className="w-6 h-6 object-contain" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {item.name.charAt(0)}
              </div>
            )}
            <span className="text-sm font-medium text-white/80">{item.name}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100% / 3));
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translateX(calc(-100% / 3));
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
