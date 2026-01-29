"use client";

import { Button } from "@/components/ui/button";
import React from "react";

// EVM Chain data with logos from reliable CDN sources
const EVM_CHAINS_ROW1 = [
  { name: "Ethereum", logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
  { name: "Polygon", logo: "https://assets.coingecko.com/coins/images/4713/small/polygon.png" },
  { name: "Arbitrum", logo: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg" },
  { name: "Optimism", logo: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png" },
  { name: "Avalanche", logo: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png" },
  { name: "BNB Chain", logo: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png" },
  { name: "Base", logo: "https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg" },
  { name: "Fantom", logo: "https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png" },
];

const EVM_CHAINS_ROW2 = [
  { name: "Gnosis", logo: "https://assets.coingecko.com/coins/images/662/small/logo_square_simple_300px.png" },
  { name: "Linea", logo: "https://assets.coingecko.com/asset_platforms/images/135/small/linea.jpeg" },
  { name: "Scroll", logo: "https://assets.coingecko.com/asset_platforms/images/153/small/scroll.jpeg" },
  { name: "Mantle", logo: "https://assets.coingecko.com/coins/images/30980/small/token-logo.png" },
  { name: "Cronos", logo: "https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png" },
  { name: "Moonbeam", logo: "https://assets.coingecko.com/coins/images/22459/small/glmr.png" },
  { name: "Metis", logo: "https://assets.coingecko.com/coins/images/15595/small/metis.png" },
  { name: "Aurora", logo: "https://assets.coingecko.com/coins/images/20582/small/aurora.jpeg" },
];

// Utility to repeat chains enough times for seamless scrolling
const repeatedChains = (chains: typeof EVM_CHAINS_ROW1, repeat = 4) =>
  Array.from({ length: repeat }).flatMap(() => chains);

interface ChainCarouselProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  showCta?: boolean;
}

export default function ChainCarousel({
  title = "Multi-Chain Analysis",
  subtitle = "We scan your wallet activity across 20+ EVM-compatible blockchains to build your on-chain reputation.",
  badgeText = "Supported Chains",
  ctaText = "Get Started",
  onCtaClick,
  showCta = true,
}: ChainCarouselProps) {
  return (
    <section className="relative py-24 overflow-hidden bg-background">
      {/* Subtle grid background */}
      <div className="absolute inset-0 grid-pattern opacity-50" />

      {/* Gradient overlay at top */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <span className="inline-block px-4 py-1.5 mb-6 text-sm rounded-full border border-border bg-background-card text-primary font-medium">
          {badgeText}
        </span>
        <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-text">
          {title}
        </h2>
        <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
          {subtitle}
        </p>
        {showCta && (
          <Button
            variant="default"
            onClick={onCtaClick}
            className="mt-8 px-8 py-3 rounded-xl font-semibold"
          >
            {ctaText}
          </Button>
        )}

        {/* Carousel */}
        <div className="mt-16 overflow-hidden relative">
          {/* Row 1 - scrolls left */}
          <div className="flex gap-8 whitespace-nowrap animate-scroll-left">
            {repeatedChains(EVM_CHAINS_ROW1, 4).map((chain, i) => (
              <ChainBadge key={`row1-${i}`} name={chain.name} logo={chain.logo} />
            ))}
          </div>

          {/* Row 2 - scrolls right */}
          <div className="flex gap-8 whitespace-nowrap mt-6 animate-scroll-right">
            {repeatedChains(EVM_CHAINS_ROW2, 4).map((chain, i) => (
              <ChainBadge key={`row2-${i}`} name={chain.name} logo={chain.logo} />
            ))}
          </div>

          {/* Fade overlays */}
          <div className="absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-scroll-left {
          animation: scroll-left 40s linear infinite;
        }
        .animate-scroll-right {
          animation: scroll-right 40s linear infinite;
        }
      `}</style>
    </section>
  );
}

// Chain badge component
function ChainBadge({ name, logo }: { name: string; logo: string }) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-background-card border border-border hover:border-border-hover transition-all duration-300 flex-shrink-0 group hover:bg-background-card-hover">
      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
        {!imgError ? (
          <img
            src={logo}
            alt={name}
            className="h-6 w-6 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-xs font-bold text-primary">
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-text-secondary group-hover:text-text transition-colors">
        {name}
      </span>
    </div>
  );
}

// Export a minimal version without the header content
export function ChainCarouselMinimal({
  speed = "normal",
}: {
  speed?: "slow" | "normal" | "fast";
}) {
  const speedMap = {
    slow: "60s",
    normal: "40s",
    fast: "25s",
  };

  return (
    <div className="overflow-hidden relative py-8">
      {/* Row 1 */}
      <div
        className="flex gap-8 whitespace-nowrap"
        style={{
          animation: `scroll-left ${speedMap[speed]} linear infinite`,
        }}
      >
        {repeatedChains(EVM_CHAINS_ROW1, 4).map((chain, i) => (
          <ChainBadge key={`row1-${i}`} name={chain.name} logo={chain.logo} />
        ))}
      </div>

      {/* Row 2 */}
      <div
        className="flex gap-8 whitespace-nowrap mt-6"
        style={{
          animation: `scroll-right ${speedMap[speed]} linear infinite`,
        }}
      >
        {repeatedChains(EVM_CHAINS_ROW2, 4).map((chain, i) => (
          <ChainBadge key={`row2-${i}`} name={chain.name} logo={chain.logo} />
        ))}
      </div>

      {/* Fade overlays */}
      <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
