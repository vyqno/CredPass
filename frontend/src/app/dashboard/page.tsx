"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useActiveAccount, ConnectButton, useReadContract } from "thirdweb/react";
import { client, sepolia, TIER_INFO, TierName } from "@/lib/thirdweb";
import { credentialContract, Tier } from "@/lib/contract";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import {
  FileText,
  Search,
  Code,
  Lock,
  ArrowRight,
  Shield,
  Zap,
  Award,
  Clock,
  Check,
  Wallet,
} from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  requiredTier: TierName;
  price: string;
  color: string;
}

const services: Service[] = [
  {
    id: "prd-generator",
    name: "PRD Generator",
    description: "Convert your ideas into detailed Product Requirements Documents using AI.",
    icon: FileText,
    requiredTier: "verified",
    price: "0.001 ETH",
    color: "#10b981",
  },
  {
    id: "research-agent",
    name: "Research Agent",
    description: "AI-powered research assistant that synthesizes findings with sources.",
    icon: Search,
    requiredTier: "trusted",
    price: "0.002 ETH",
    color: "#8b5cf6",
  },
  {
    id: "contract-creator",
    name: "Smart Contract Creator",
    description: "Generate Solidity smart contracts from natural language descriptions.",
    icon: Code,
    requiredTier: "elite",
    price: "0.005 ETH",
    color: "#f59e0b",
  },
];

const tierIcons = {
  none: Shield,
  verified: Shield,
  trusted: Zap,
  elite: Award,
};

const tierHierarchy: Record<TierName, number> = {
  none: -1,
  verified: 0,
  trusted: 1,
  elite: 2,
};

function formatTimeRemaining(expiry: bigint): { days: number; hours: number; minutes: number; seconds: number; expired: boolean } {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(expiry) - now;

  if (remaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const days = Math.floor(remaining / (24 * 60 * 60));
  const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((remaining % (60 * 60)) / 60);
  const seconds = remaining % 60;

  return { days, hours, minutes, seconds, expired: false };
}

function CountdownTimer({ expiry }: { expiry: bigint }) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    setMounted(true);
    // Calculate immediately on mount
    setTimeLeft(formatTimeRemaining(expiry));

    const interval = setInterval(() => {
      setTimeLeft(formatTimeRemaining(expiry));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiry]);

  // Show loading state during hydration to avoid mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-1">
        <div className="bg-[#1a1a1a] rounded-lg px-2 py-1 min-w-[2.5rem] text-center animate-pulse">
          <span className="text-lg font-bold text-white">--</span>
          <span className="text-[10px] text-[#6b7280] block -mt-1">days</span>
        </div>
        <span className="text-[#6b7280]">:</span>
        <div className="bg-[#1a1a1a] rounded-lg px-2 py-1 min-w-[2.5rem] text-center animate-pulse">
          <span className="text-lg font-bold text-white">--</span>
          <span className="text-[10px] text-[#6b7280] block -mt-1">hrs</span>
        </div>
        <span className="text-[#6b7280]">:</span>
        <div className="bg-[#1a1a1a] rounded-lg px-2 py-1 min-w-[2.5rem] text-center animate-pulse">
          <span className="text-lg font-bold text-white">--</span>
          <span className="text-[10px] text-[#6b7280] block -mt-1">min</span>
        </div>
        <span className="text-[#6b7280]">:</span>
        <div className="bg-[#1a1a1a] rounded-lg px-2 py-1 min-w-[2.5rem] text-center animate-pulse">
          <span className="text-lg font-bold text-[#c8ff00]">--</span>
          <span className="text-[10px] text-[#6b7280] block -mt-1">sec</span>
        </div>
      </div>
    );
  }

  if (timeLeft.expired) {
    return (
      <span className="text-red-500 font-semibold">Expired</span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="bg-[#1a1a1a] rounded-lg px-2 py-1 min-w-[2.5rem] text-center">
        <span className="text-lg font-bold text-white">{timeLeft.days}</span>
        <span className="text-[10px] text-[#6b7280] block -mt-1">days</span>
      </div>
      <span className="text-[#6b7280]">:</span>
      <div className="bg-[#1a1a1a] rounded-lg px-2 py-1 min-w-[2.5rem] text-center">
        <span className="text-lg font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-[10px] text-[#6b7280] block -mt-1">hrs</span>
      </div>
      <span className="text-[#6b7280]">:</span>
      <div className="bg-[#1a1a1a] rounded-lg px-2 py-1 min-w-[2.5rem] text-center">
        <span className="text-lg font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-[10px] text-[#6b7280] block -mt-1">min</span>
      </div>
      <span className="text-[#6b7280]">:</span>
      <div className="bg-[#1a1a1a] rounded-lg px-2 py-1 min-w-[2.5rem] text-center">
        <span className="text-lg font-bold text-[#c8ff00]">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-[10px] text-[#6b7280] block -mt-1">sec</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const account = useActiveAccount();
  const [userTier, setUserTier] = useState<TierName>("none");
  const [expiry, setExpiry] = useState<bigint | null>(null);
  const [mintedAt, setMintedAt] = useState<bigint | null>(null);
  const [hasCredential, setHasCredential] = useState(false);

  const { data: credentialData, isLoading } = useReadContract({
    contract: credentialContract,
    method: "getCredential",
    params: [account?.address || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!account?.address,
    },
  });

  useEffect(() => {
    if (credentialData) {
      const [tier, exp, minted, exists, isValid] = credentialData;
      setHasCredential(exists && isValid);
      setExpiry(exp);
      setMintedAt(minted);

      if (exists && isValid) {
        const tierNames: TierName[] = ["verified", "trusted", "elite"];
        setUserTier(tierNames[tier as Tier] || "none");
      } else {
        setUserTier("none");
      }
    }
  }, [credentialData]);

  const canAccessService = (requiredTier: TierName): boolean => {
    return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
  };

  const TierIcon = tierIcons[userTier];

  return (
    <div className="min-h-screen bg-black">
      {/* Hero gradient */}
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Header Section */}
        <div className="mb-16">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="animate-fade-in">
              <div className="badge badge-primary mb-6">
                <span className="w-2 h-2 rounded-full bg-[#c8ff00] animate-pulse-dot" />
                AI Services Dashboard
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                Access powerful
                <br />
                <span className="text-[#9ca3af]">AI tools</span>
              </h1>
              <p className="text-lg text-[#9ca3af] max-w-lg">
                Use your credential NFT to unlock premium AI-powered services.
                Higher tiers unlock more capabilities.
              </p>
            </div>

            {/* Credential Card */}
            {account && hasCredential && (
              <div className="animate-fade-in animate-delay-200">
                <div className="relative rounded-2xl border border-[#1f1f1f] p-1">
                  <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={2}
                  />
                  <div className="bg-[#0a0a0a] rounded-xl p-6 min-w-[320px]">
                    <div className="flex items-center gap-4 mb-6">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${TIER_INFO[userTier].color}20` }}
                      >
                        <TierIcon className="w-7 h-7" style={{ color: TIER_INFO[userTier].color }} />
                      </div>
                      <div>
                        <p className="text-sm text-[#6b7280] mb-1">Your Credential</p>
                        <p className="text-xl font-bold" style={{ color: TIER_INFO[userTier].color }}>
                          {TIER_INFO[userTier].name}
                        </p>
                      </div>
                    </div>

                    {expiry && (
                      <div className="pt-4 border-t border-[#1f1f1f]">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-[#6b7280]" />
                          <span className="text-sm text-[#6b7280]">Time Remaining</span>
                        </div>
                        <CountdownTimer expiry={expiry} />
                      </div>
                    )}

                    {mintedAt && (
                      <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
                        <p className="text-xs text-[#6b7280]">
                          Minted on {new Date(Number(mintedAt) * 1000).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Not Connected State */}
        {!account && (
          <div className="mb-16">
            <div className="relative rounded-2xl border border-[#1f1f1f] p-1 max-w-2xl mx-auto">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={2}
              />
              <div className="bg-[#0a0a0a] rounded-xl p-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-[#c8ff00]/10 flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-10 h-10 text-[#c8ff00]" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-white">Connect Your Wallet</h2>
                <p className="text-[#9ca3af] mb-8 max-w-md mx-auto">
                  Connect your wallet to view available services and your credential status.
                </p>
                <ConnectButton
                  client={client}
                  chain={sepolia}
                  theme="dark"
                  connectButton={{
                    label: "Connect Wallet",
                    style: {
                      background: "#c8ff00",
                      color: "#000000",
                      border: "none",
                      borderRadius: "0.75rem",
                      padding: "0.875rem 2rem",
                      fontSize: "1rem",
                      fontWeight: "600",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* No Credential State */}
        {account && !hasCredential && !isLoading && (
          <div className="mb-16">
            <div className="relative rounded-2xl border border-[#1f1f1f] p-1 max-w-2xl mx-auto">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={2}
              />
              <div className="bg-[#0a0a0a] rounded-xl p-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-zinc-500/10 flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-10 h-10 text-[#6b7280]" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-white">No Credential Found</h2>
                <p className="text-[#9ca3af] mb-8 max-w-md mx-auto">
                  You need a credential NFT to access AI services. Analyze your wallet
                  to check your eligibility and mint one.
                </p>
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 bg-[#c8ff00] text-black font-semibold px-6 py-3 rounded-xl hover:bg-[#d9ff33] transition-all"
                >
                  Analyze Wallet
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Services Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <p className="text-[#c8ff00] text-sm font-medium mb-4 uppercase tracking-wider">Available Services</p>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Premium AI Tools
            </h2>
            <p className="text-[#9ca3af] max-w-xl mx-auto">
              Each service requires a specific tier level. Upgrade your credential to unlock more.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const isAccessible = canAccessService(service.requiredTier);
              const ServiceIcon = service.icon;

              return (
                <div
                  key={service.id}
                  className="relative rounded-[1.25rem] border border-[#1f1f1f] p-2 group"
                >
                  <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={3}
                  />
                  <div className={`relative flex flex-col h-full bg-[#0a0a0a] rounded-xl overflow-hidden ${!isAccessible ? "opacity-60" : ""}`}>
                    {/* Service Icon */}
                    <div className="h-32 flex items-center justify-center relative">
                      {!isAccessible && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-[#1a1a1a] text-xs text-[#6b7280]">
                          <Lock className="w-3 h-3" />
                          <span>{TIER_INFO[service.requiredTier].name}+</span>
                        </div>
                      )}
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${service.color}20` }}
                      >
                        <ServiceIcon className="w-8 h-8" style={{ color: service.color }} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 pt-0 flex flex-col flex-1">
                      <h3 className="text-xl font-semibold mb-2 text-white">{service.name}</h3>
                      <p className="text-sm text-[#9ca3af] mb-6 flex-1">{service.description}</p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-[#1f1f1f]">
                        <div>
                          <p className="text-xs text-[#6b7280] mb-1">Price per call</p>
                          <p className="font-semibold text-white">{service.price}</p>
                        </div>

                        {isAccessible ? (
                          <Link
                            href={`/service/${service.id}`}
                            className="inline-flex items-center gap-2 bg-[#c8ff00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#d9ff33] transition-all text-sm"
                          >
                            Use Service
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        ) : (
                          <Link
                            href="/analyze"
                            className="inline-flex items-center gap-2 border border-[#1f1f1f] text-white font-medium px-4 py-2 rounded-lg hover:border-[#333] hover:bg-[#111] transition-all text-sm"
                          >
                            Upgrade
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier Comparison */}
        {account && (
          <div>
            <div className="text-center mb-12">
              <p className="text-[#c8ff00] text-sm font-medium mb-4 uppercase tracking-wider">Tiers</p>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Credential Tiers
              </h2>
              <p className="text-[#9ca3af] max-w-xl mx-auto">
                Higher tiers unlock access to more powerful AI services
              </p>
            </div>

            <div className="card overflow-hidden bg-[#0a0a0a]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1f1f1f]">
                      <th className="p-6 text-left text-[#6b7280] font-medium">
                        Service
                      </th>
                      {(["verified", "trusted", "elite"] as TierName[]).map((tier) => {
                        const Icon = tierIcons[tier];
                        const isCurrentTier = tier === userTier;
                        return (
                          <th
                            key={tier}
                            className={`p-6 text-center ${isCurrentTier ? "bg-[#c8ff00]/10 border-x-2 border-t-2 border-[#c8ff00]/30" : ""}`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              {isCurrentTier && (
                                <span className="text-[10px] text-[#c8ff00] font-semibold uppercase tracking-wider mb-1">
                                  Your Tier
                                </span>
                              )}
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${TIER_INFO[tier].color}20` }}
                              >
                                <Icon className="w-5 h-5" style={{ color: TIER_INFO[tier].color }} />
                              </div>
                              <span className="font-semibold" style={{ color: TIER_INFO[tier].color }}>
                                {TIER_INFO[tier].name}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service, index) => (
                      <tr
                        key={service.id}
                        className={index !== services.length - 1 ? "border-b border-[#1f1f1f]" : ""}
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${service.color}20` }}
                            >
                              <service.icon className="w-4 h-4" style={{ color: service.color }} />
                            </div>
                            <span className="text-white font-medium">{service.name}</span>
                          </div>
                        </td>
                        {(["verified", "trusted", "elite"] as TierName[]).map((tier) => {
                          const isCurrentTier = tier === userTier;
                          const isLastRow = index === services.length - 1;
                          return (
                            <td
                              key={tier}
                              className={`p-6 text-center ${isCurrentTier ? `bg-[#c8ff00]/10 border-x-2 border-[#c8ff00]/30 ${isLastRow ? "border-b-2" : ""}` : ""}`}
                            >
                              {tierHierarchy[tier] >= tierHierarchy[service.requiredTier] ? (
                                <span
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                                  style={{ background: `${TIER_INFO[tier].color}20` }}
                                >
                                  <Check className="w-4 h-4" style={{ color: TIER_INFO[tier].color }} />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1a1a1a]">
                                  <Lock className="w-3 h-3 text-[#6b7280]" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
