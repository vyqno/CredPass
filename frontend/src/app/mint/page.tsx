"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useActiveAccount, ConnectButton, useSendTransaction, useReadContract } from "thirdweb/react";
import { prepareContractCall, toHex } from "thirdweb";
import { client, sepolia, TIER_INFO, TierName, TIER_THRESHOLDS } from "@/lib/thirdweb";
import { credentialContract } from "@/lib/contract";
import {
  Shield,
  Zap,
  Award,
  ArrowRight,
  Loader2,
  CheckCircle,
  ExternalLink,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const tierIcons = {
  none: Shield,
  verified: Shield,
  trusted: Zap,
  elite: Award,
};

const tierGradients = {
  none: "from-zinc-600 to-zinc-800",
  verified: "from-[#c8ff00] to-[#a3e635]",
  trusted: "from-violet-500 to-purple-600",
  elite: "from-amber-400 to-orange-500",
};

const tierNumbers: Record<TierName, number> = {
  none: 0,
  verified: 0,
  trusted: 1,
  elite: 2,
};

interface SignatureResponse {
  success: boolean;
  signature: string;
  tier: TierName;
  tierNumber: number;
  expiry: string;
  nonce: string;
  eligibleTier: TierName;
  walletAgeDays: number;
  totalTransactions: number;
  error?: string;
}

function MintPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();

  const [mintStatus, setMintStatus] = useState<
    "idle" | "checking" | "signing" | "minting" | "success" | "error" | "not-eligible"
  >("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligibleTier, setEligibleTier] = useState<TierName | null>(null);
  const [walletStats, setWalletStats] = useState<{
    walletAgeDays: number;
    totalTransactions: number;
  } | null>(null);

  // Check if user already has a credential
  const { data: credentialData, isLoading: isLoadingCredential } = useReadContract({
    contract: credentialContract,
    method: "getCredential",
    params: [account?.address || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!account?.address,
    },
  });

  const hasExistingCredential = credentialData?.[3] === true;
  const existingCredentialValid = credentialData?.[4] === true;
  const existingTier = credentialData?.[0];

  // Get tier from URL params
  const urlTier = searchParams.get("tier") as TierName | null;

  useEffect(() => {
    // Reset state when account changes
    setMintStatus("idle");
    setEligibleTier(null);
    setWalletStats(null);
    setError(null);
  }, [account?.address]);

  // Check eligibility when page loads
  const checkEligibility = async () => {
    if (!account?.address) return;

    setMintStatus("checking");
    setError(null);

    try {
      const response = await fetch("/api/mint-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account.address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setMintStatus("not-eligible");
          setWalletStats({
            walletAgeDays: data.walletAgeDays || 0,
            totalTransactions: data.totalTransactions || 0,
          });
          return;
        }
        throw new Error(data.error || "Failed to check eligibility");
      }

      setEligibleTier(data.eligibleTier);
      setWalletStats({
        walletAgeDays: data.walletAgeDays,
        totalTransactions: data.totalTransactions,
      });
      setMintStatus("idle");
    } catch (err) {
      console.error("Eligibility check failed:", err);
      setError(err instanceof Error ? err.message : "Failed to check eligibility");
      setMintStatus("error");
    }
  };

  // Auto-check eligibility when account connects
  useEffect(() => {
    if (account?.address && mintStatus === "idle" && !eligibleTier && !isLoadingCredential) {
      // Small delay to prevent double-checking
      const timer = setTimeout(checkEligibility, 500);
      return () => clearTimeout(timer);
    }
  }, [account?.address, isLoadingCredential]);

  const handleMint = async () => {
    if (!account?.address || !eligibleTier) return;

    setMintStatus("signing");
    setError(null);

    try {
      // Get signature from backend
      const response = await fetch("/api/mint-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account.address,
          requestedTier: eligibleTier,
        }),
      });

      const data: SignatureResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get signature");
      }

      setMintStatus("minting");

      // Prepare the mint transaction
      const transaction = prepareContractCall({
        contract: credentialContract,
        method: "mint",
        params: [
          account.address,
          data.tierNumber,
          BigInt(data.expiry),
          data.signature as `0x${string}`,
        ],
      });

      // Send transaction
      const result = await sendTransaction(transaction);
      setTxHash(result.transactionHash);
      setMintStatus("success");
    } catch (err: unknown) {
      console.error("Mint failed:", err);
      setMintStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to mint credential. Please try again."
      );
    }
  };

  const TierIcon = eligibleTier ? tierIcons[eligibleTier] : Shield;
  const displayTier = eligibleTier || "verified";

  // Show loading while checking credential status
  if (isLoadingCredential && account) {
    return (
      <div className="min-h-screen bg-black py-12 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#c8ff00] mx-auto mb-4" />
          <p className="text-[#9ca3af]">Checking credential status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-6 py-32">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="badge badge-primary mb-6 inline-flex">
            <span className="w-2 h-2 rounded-full bg-[#c8ff00] animate-pulse-dot" />
            Soulbound NFT
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight text-white">
            Mint Your Credential
          </h1>
          <p className="text-[#9ca3af] max-w-lg mx-auto">
            Mint your soulbound NFT credential to unlock access to AI-powered services based on
            your on-chain reputation.
          </p>
        </div>

        {/* Main Card */}
        <div className="card p-8">
          {!account ? (
            /* Not Connected State */
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-[#c8ff00]" />
              </div>
              <h2 className="text-2xl font-semibold mb-4 text-white">Connect Your Wallet</h2>
              <p className="text-[#9ca3af] mb-8 max-w-md mx-auto">
                Connect your wallet to check eligibility and mint your credential NFT.
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
          ) : hasExistingCredential && existingCredentialValid ? (
            /* Already Has Valid Credential */
            <div className="text-center py-12 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-[#c8ff00]" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-white">
                You Already Have a Credential
              </h2>
              <p className="text-[#9ca3af] mb-6">
                Your {["Verified", "Trusted", "Elite"][existingTier || 0]} credential is active.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard"
                  className="btn-primary inline-flex items-center justify-center gap-2"
                >
                  View Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/analyze"
                  className="btn-secondary inline-flex items-center justify-center gap-2"
                >
                  Re-analyze Wallet
                </Link>
              </div>
            </div>
          ) : mintStatus === "checking" ? (
            /* Checking Eligibility */
            <div className="text-center py-12 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-[#c8ff00] animate-spin" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-white">Checking Eligibility</h2>
              <p className="text-[#9ca3af]">
                Analyzing your wallet activity across all chains...
              </p>
            </div>
          ) : mintStatus === "not-eligible" ? (
            /* Not Eligible */
            <div className="text-center py-12 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-white">Not Yet Eligible</h2>
              <p className="text-[#9ca3af] mb-6 max-w-md mx-auto">
                Your wallet doesn&apos;t meet the minimum requirements yet. Keep building your
                on-chain reputation!
              </p>

              {walletStats && (
                <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto">
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-white">{walletStats.walletAgeDays}</p>
                    <p className="text-sm text-[#6b7280]">
                      days old (need {TIER_THRESHOLDS.verified.minAgeDays})
                    </p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-white">
                      {walletStats.totalTransactions}
                    </p>
                    <p className="text-sm text-[#6b7280]">
                      transactions (need {TIER_THRESHOLDS.verified.minTxCount})
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/analyze"
                  className="btn-primary inline-flex items-center justify-center gap-2"
                >
                  View Full Analysis
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={checkEligibility}
                  className="btn-secondary inline-flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Check Again
                </button>
              </div>
            </div>
          ) : mintStatus === "success" ? (
            /* Success State */
            <div className="text-center py-12 animate-fade-in">
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${tierGradients[eligibleTier || "verified"]} flex items-center justify-center mx-auto mb-6`}
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-white">Credential Minted!</h2>
              <p className="text-[#9ca3af] mb-6">
                Your {TIER_INFO[eligibleTier || "verified"].name} credential has been successfully
                minted.
              </p>

              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#c8ff00] hover:underline mb-8"
                >
                  View on Etherscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard"
                  className="btn-primary inline-flex items-center justify-center gap-2"
                >
                  View Services
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/analyze"
                  className="btn-secondary inline-flex items-center justify-center gap-2"
                >
                  Back to Analysis
                </Link>
              </div>
            </div>
          ) : eligibleTier ? (
            /* Minting Flow - Eligible */
            <div className="animate-fade-in">
              {/* Credential Preview */}
              <div
                className={`rounded-2xl p-6 mb-8 bg-gradient-to-r ${tierGradients[eligibleTier]} relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMjBtLTEgMGExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-30" />

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                        eligibleTier === "verified" ? "bg-black/20" : "bg-white/20"
                      }`}
                    >
                      <TierIcon
                        className={`w-8 h-8 ${
                          eligibleTier === "verified" ? "text-black" : "text-white"
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-sm ${
                          eligibleTier === "verified" ? "text-black/70" : "text-white/80"
                        }`}
                      >
                        Credential NFT
                      </p>
                      <h2
                        className={`text-2xl font-bold ${
                          eligibleTier === "verified" ? "text-black" : "text-white"
                        }`}
                      >
                        {TIER_INFO[eligibleTier].name}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <p
                        className={`text-xs uppercase tracking-wider ${
                          eligibleTier === "verified" ? "text-black/60" : "text-white/60"
                        }`}
                      >
                        Validity
                      </p>
                      <p
                        className={`font-semibold ${
                          eligibleTier === "verified" ? "text-black" : "text-white"
                        }`}
                      >
                        7 Days
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-xs uppercase tracking-wider ${
                          eligibleTier === "verified" ? "text-black/60" : "text-white/60"
                        }`}
                      >
                        Services
                      </p>
                      <p
                        className={`font-semibold ${
                          eligibleTier === "verified" ? "text-black" : "text-white"
                        }`}
                      >
                        {TIER_INFO[eligibleTier].services.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Stats */}
              {walletStats && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-white">{walletStats.walletAgeDays}</p>
                    <p className="text-sm text-[#6b7280]">days old</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-white">
                      {walletStats.totalTransactions}
                    </p>
                    <p className="text-sm text-[#6b7280]">transactions</p>
                  </div>
                </div>
              )}

              {/* Services Unlocked */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-white">
                  Services You&apos;ll Unlock
                </h3>
                <div className="space-y-3">
                  {TIER_INFO[eligibleTier].services.map((service) => (
                    <div
                      key={service}
                      className="flex items-center gap-3 p-4 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f]"
                    >
                      <CheckCircle
                        className="w-5 h-5"
                        style={{ color: TIER_INFO[eligibleTier].color }}
                      />
                      <span className="text-white">{service}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Mint Button */}
              <button
                onClick={handleMint}
                disabled={isPending || mintStatus === "signing" || mintStatus === "minting"}
                className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
              >
                {mintStatus === "signing" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Requesting Attestation...
                  </>
                ) : mintStatus === "minting" || isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Minting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Mint {TIER_INFO[eligibleTier].name} Credential
                  </>
                )}
              </button>

              <p className="text-center text-sm text-[#6b7280] mt-4">
                Minting requires a small gas fee on Sepolia testnet
              </p>
            </div>
          ) : (
            /* Initial State - Check Eligibility */
            <div className="text-center py-12 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-[#c8ff00]" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-white">Check Your Eligibility</h2>
              <p className="text-[#6b7280] mb-2 font-mono text-sm bg-[#1f1f1f] inline-block px-4 py-2 rounded-lg">
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </p>
              <p className="text-[#9ca3af] mb-8 max-w-md mx-auto mt-4">
                We&apos;ll analyze your on-chain activity to determine your eligible credential
                tier.
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md mx-auto">
                  {error}
                </div>
              )}

              <button
                onClick={checkEligibility}
                className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
              >
                <Sparkles className="w-5 h-5" />
                Check Eligibility
              </button>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/analyze"
            className="text-[#9ca3af] hover:text-[#c8ff00] transition-colors inline-flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Analysis
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#c8ff00]" />
        </div>
      }
    >
      <MintPageContent />
    </Suspense>
  );
}
