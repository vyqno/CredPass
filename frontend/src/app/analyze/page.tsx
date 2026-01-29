"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client, sepolia, TIER_THRESHOLDS, TIER_INFO, TierName } from "@/lib/thirdweb";
import {
  Search,
  Calendar,
  Activity,
  Globe,
  Shield,
  Zap,
  Award,
  ArrowRight,
  Loader2,
  CheckCircle,
  Clock,
  Wallet,
  Sparkles,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";

interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
  category: string;
  timestamp: string;
  explorerUrl: string;
}

interface ChainMetrics {
  chainId: string;
  name: string;
  icon: string;
  color: string;
  explorer: string;
  transactionCount: number;
  uniqueAddresses: number;
  firstTxDate: string | null;
  lastTxDate: string | null;
  walletAgeDays: number;
  recentTransactions: Transaction[];
}

interface MultiChainMetrics {
  address: string;
  totalTransactions: number;
  totalUniqueAddresses: number;
  oldestWalletAgeDays: number;
  oldestChain: string | null;
  firstTxDate: string | null;
  chainsWithActivity: number;
  chains: ChainMetrics[];
}

interface EligibilityResult {
  isEligible: boolean;
  tier: TierName;
  meetsAge: boolean;
  meetsTxCount: boolean;
}

function calculateEligibility(
  walletAgeDays: number,
  transactionCount: number
): EligibilityResult {
  // Check Elite first (highest tier)
  if (
    walletAgeDays >= TIER_THRESHOLDS.elite.minAgeDays &&
    transactionCount >= TIER_THRESHOLDS.elite.minTxCount
  ) {
    return { isEligible: true, tier: "elite", meetsAge: true, meetsTxCount: true };
  }

  // Check Trusted
  if (
    walletAgeDays >= TIER_THRESHOLDS.trusted.minAgeDays &&
    transactionCount >= TIER_THRESHOLDS.trusted.minTxCount
  ) {
    return { isEligible: true, tier: "trusted", meetsAge: true, meetsTxCount: true };
  }

  // Check Verified
  if (
    walletAgeDays >= TIER_THRESHOLDS.verified.minAgeDays &&
    transactionCount >= TIER_THRESHOLDS.verified.minTxCount
  ) {
    return { isEligible: true, tier: "verified", meetsAge: true, meetsTxCount: true };
  }

  return {
    isEligible: false,
    tier: "none",
    meetsAge: walletAgeDays >= TIER_THRESHOLDS.verified.minAgeDays,
    meetsTxCount: transactionCount >= TIER_THRESHOLDS.verified.minTxCount,
  };
}

const tierIcons = {
  none: Shield,
  verified: Shield,
  trusted: Zap,
  elite: Award,
};

const tierColors = {
  none: "#6b7280",
  verified: "#c8ff00",
  trusted: "#a78bfa",
  elite: "#fbbf24",
};

const tierGradients = {
  none: "from-zinc-600 to-zinc-800",
  verified: "from-[#c8ff00] to-[#a3e635]",
  trusted: "from-violet-500 to-purple-600",
  elite: "from-amber-400 to-orange-500",
};

function ChainCard({
  chain,
  address,
  isExpanded,
  onToggle,
}: {
  chain: ChainMetrics;
  address: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (chain.transactionCount === 0) return null;

  return (
    <div className="card overflow-hidden">
      {/* Chain Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${chain.color}20` }}
          >
            {chain.icon}
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-white">{chain.name}</h4>
            <p className="text-sm text-[#6b7280]">
              {chain.transactionCount} transactions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-[#9ca3af]">Wallet Age</p>
            <p className="font-semibold text-white">{chain.walletAgeDays} days</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#6b7280]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#6b7280]" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#1f1f1f] p-5 animate-fade-in">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">Transactions</p>
              <p className="text-xl font-bold text-white">{chain.transactionCount}</p>
            </div>
            <div>
              <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">Addresses</p>
              <p className="text-xl font-bold text-white">{chain.uniqueAddresses}</p>
            </div>
            <div>
              <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">First Tx</p>
              <p className="text-sm font-medium text-white">{chain.firstTxDate}</p>
            </div>
            <div>
              <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">Last Tx</p>
              <p className="text-sm font-medium text-white">{chain.lastTxDate}</p>
            </div>
          </div>

          {/* Recent Transactions */}
          {chain.recentTransactions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-[#9ca3af]">Recent Transactions</h5>
                <a
                  href={`${chain.explorer}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#c8ff00] hover:underline flex items-center gap-1"
                >
                  View all on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-2">
                {chain.recentTransactions.slice(0, 5).map((tx) => (
                  <a
                    key={tx.hash}
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0a] hover:bg-[#141414] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          tx.from.toLowerCase() === address.toLowerCase()
                            ? "bg-red-500/10"
                            : "bg-green-500/10"
                        }`}
                      >
                        {tx.from.toLowerCase() === address.toLowerCase() ? (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white font-mono">
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                        </p>
                        <p className="text-xs text-[#6b7280]">
                          {tx.asset || tx.category} •{" "}
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#6b7280] group-hover:text-[#c8ff00] transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  const account = useActiveAccount();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<MultiChainMetrics | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  // Reset state when account changes
  useEffect(() => {
    setMetrics(null);
    setEligibility(null);
    setError(null);
    setExpandedChains(new Set());
  }, [account?.address]);

  const analyzeWallet = async () => {
    if (!account?.address) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/analyze-wallet?address=${account.address}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze wallet");
      }

      const data: MultiChainMetrics = await response.json();
      setMetrics(data);
      setEligibility(
        calculateEligibility(data.oldestWalletAgeDays, data.totalTransactions)
      );

      // Auto-expand the chain with most activity
      if (data.chains.length > 0) {
        const mostActiveChain = data.chains.find((c) => c.transactionCount > 0);
        if (mostActiveChain) {
          setExpandedChains(new Set([mostActiveChain.chainId]));
        }
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to analyze wallet. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleChain = (chainId: string) => {
    setExpandedChains((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chainId)) {
        newSet.delete(chainId);
      } else {
        newSet.add(chainId);
      }
      return newSet;
    });
  };

  const TierIcon = eligibility ? tierIcons[eligibility.tier] : Shield;

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="badge badge-primary mb-6 inline-flex">
              <span className="w-2 h-2 rounded-full bg-[#c8ff00] animate-pulse-dot" />
              Multi-Chain Analysis
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              Analyze Your Wallet
            </h1>
            <p className="text-[#9ca3af] max-w-lg mx-auto text-lg">
              Get comprehensive analytics across all major EVM chains.
              View your transaction history and discover your credential tier.
            </p>
          </div>

          {/* Main Card */}
          <div className="card p-8 mb-8 animate-fade-in animate-delay-100">
            {!account ? (
              /* Not Connected State */
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-2xl bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-10 h-10 text-[#c8ff00]" />
                </div>
                <h2 className="text-2xl font-semibold mb-4 text-white">
                  Connect Your Wallet
                </h2>
                <p className="text-[#9ca3af] mb-8 max-w-md mx-auto">
                  Connect your wallet to analyze activity across Ethereum, Polygon,
                  Arbitrum, Optimism, Base, and more.
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
            ) : !metrics ? (
              /* Connected but not analyzed */
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-2xl bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-[#c8ff00]" />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-white">
                  Ready to Analyze
                </h2>
                <p className="text-[#6b7280] mb-2 font-mono text-sm bg-[#1f1f1f] inline-block px-4 py-2 rounded-lg">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </p>
                <p className="text-[#9ca3af] mb-8 max-w-md mx-auto mt-4">
                  We&apos;ll scan Ethereum, Polygon, Arbitrum, Optimism, Base, and Sepolia
                  to build your complete on-chain profile.
                </p>

                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md mx-auto">
                    {error}
                  </div>
                )}

                <button
                  onClick={analyzeWallet}
                  disabled={isAnalyzing}
                  className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Scanning Chains...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Analyze All Chains
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Analysis Results */
              <div className="animate-fade-in">
                {/* Eligibility Banner */}
                <div
                  className={`rounded-2xl p-6 mb-8 bg-gradient-to-r ${tierGradients[eligibility?.tier || "none"]} relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMjBtLTEgMGExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-30" />

                  <div className="flex items-center justify-between relative flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                          eligibility?.tier === "verified" ? "bg-black/20" : "bg-white/20"
                        }`}
                      >
                        <TierIcon
                          className={`w-8 h-8 ${
                            eligibility?.tier === "verified" ? "text-black" : "text-white"
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`text-sm mb-1 ${
                            eligibility?.tier === "verified"
                              ? "text-black/70"
                              : "text-white/80"
                          }`}
                        >
                          {eligibility?.isEligible
                            ? "You are eligible for"
                            : "Not yet eligible"}
                        </p>
                        <h2
                          className={`text-2xl font-bold ${
                            eligibility?.tier === "verified" ? "text-black" : "text-white"
                          }`}
                        >
                          {eligibility?.isEligible
                            ? `${TIER_INFO[eligibility.tier].name} Tier`
                            : "Keep Building!"}
                        </h2>
                      </div>
                    </div>
                    {eligibility?.isEligible && (
                      <Link
                        href={`/mint?tier=${eligibility.tier}`}
                        className={`font-semibold px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 ${
                          eligibility?.tier === "verified"
                            ? "bg-black/20 hover:bg-black/30 text-black"
                            : "bg-white/20 hover:bg-white/30 text-white"
                        }`}
                      >
                        Mint Credential
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="card p-5 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#c8ff00]/10 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-5 h-5 text-[#c8ff00]" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {metrics.oldestWalletAgeDays}
                    </p>
                    <p className="text-sm text-[#6b7280]">days old</p>
                    {metrics.oldestChain && (
                      <p className="text-xs text-[#9ca3af] mt-1">on {metrics.oldestChain}</p>
                    )}
                  </div>

                  <div className="card p-5 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/10 flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-5 h-5 text-[#a78bfa]" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {metrics.totalTransactions}
                    </p>
                    <p className="text-sm text-[#6b7280]">total transactions</p>
                  </div>

                  <div className="card p-5 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/10 flex items-center justify-center mx-auto mb-3">
                      <Globe className="w-5 h-5 text-[#fbbf24]" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {metrics.totalUniqueAddresses}
                    </p>
                    <p className="text-sm text-[#6b7280]">unique addresses</p>
                  </div>

                  <div className="card p-5 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#34d399]/10 flex items-center justify-center mx-auto mb-3">
                      <Layers className="w-5 h-5 text-[#34d399]" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {metrics.chainsWithActivity}
                    </p>
                    <p className="text-sm text-[#6b7280]">active chains</p>
                  </div>
                </div>

                {/* Tier Requirements */}
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#c8ff00]" />
                  Tier Requirements
                </h3>
                <div className="grid md:grid-cols-3 gap-3 mb-8">
                  {(["verified", "trusted", "elite"] as const).map((tier) => {
                    const TierIconComponent = tierIcons[tier];
                    const isEligible =
                      metrics.oldestWalletAgeDays >= TIER_THRESHOLDS[tier].minAgeDays &&
                      metrics.totalTransactions >= TIER_THRESHOLDS[tier].minTxCount;

                    return (
                      <div
                        key={tier}
                        className={`card p-4 flex items-center gap-4 ${
                          isEligible ? "border-green-500/30" : ""
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${tierColors[tier]}15` }}
                        >
                          <TierIconComponent
                            className="w-5 h-5"
                            style={{ color: tierColors[tier] }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{TIER_INFO[tier].name}</p>
                          <p className="text-xs text-[#6b7280]">
                            {TIER_THRESHOLDS[tier].minAgeDays}d /{" "}
                            {TIER_THRESHOLDS[tier].minTxCount} tx
                          </p>
                        </div>
                        {isEligible ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-[#6b7280]" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Chain Breakdown */}
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#a78bfa]" />
                  Chain Breakdown
                </h3>
                <div className="space-y-3">
                  {metrics.chains
                    .filter((c) => c.transactionCount > 0)
                    .map((chain) => (
                      <ChainCard
                        key={chain.chainId}
                        chain={chain}
                        address={metrics.address}
                        isExpanded={expandedChains.has(chain.chainId)}
                        onToggle={() => toggleChain(chain.chainId)}
                      />
                    ))}

                  {metrics.chainsWithActivity === 0 && (
                    <div className="text-center py-8 text-[#6b7280]">
                      <p>No activity found on any chain.</p>
                      <p className="text-sm mt-2">
                        Start transacting to build your on-chain reputation!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-6 animate-fade-in animate-delay-200">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#c8ff00]/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#c8ff00]" />
                </div>
                <h3 className="font-semibold text-white">Soulbound NFTs</h3>
              </div>
              <p className="text-sm text-[#9ca3af] leading-relaxed">
                Your credential NFT is non-transferable and tied to your wallet. It
                proves your on-chain reputation without revealing your activity.
              </p>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#fbbf24]" />
                </div>
                <h3 className="font-semibold text-white">7-Day Validity</h3>
              </div>
              <p className="text-sm text-[#9ca3af] leading-relaxed">
                Credentials expire after 7 days and can be renewed. This ensures
                credentials reflect current wallet activity.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
