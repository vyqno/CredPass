import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const VERIFIER_PRIVATE_KEY = process.env.PRIVATE_KEY;

// Contract address from deployment
const CREDENTIAL_NFT_ADDRESS = "0x09f9e2C32eC093C65d0E900DaA3d22da9af3d05F" as `0x${string}`;

// Tier thresholds
const TIER_THRESHOLDS = {
  verified: { minAgeDays: 7, minTxCount: 5 },
  trusted: { minAgeDays: 30, minTxCount: 20 },
  elite: { minAgeDays: 90, minTxCount: 50 },
} as const;

type TierName = "verified" | "trusted" | "elite";

// Minimal ABI for reading nonce
const credentialNftAbi = [
  {
    type: "function",
    name: "getNonce",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "domainSeparator",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
] as const;

// Chain configs for wallet analysis
const CHAINS = {
  ethereum: {
    name: "Ethereum",
    alchemyUrl: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  polygon: {
    name: "Polygon",
    alchemyUrl: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  arbitrum: {
    name: "Arbitrum",
    alchemyUrl: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  optimism: {
    name: "Optimism",
    alchemyUrl: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  base: {
    name: "Base",
    alchemyUrl: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  sepolia: {
    name: "Sepolia",
    alchemyUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
} as const;

interface AlchemyTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string | null;
  metadata: {
    blockTimestamp: string;
  };
}

interface AlchemyResponse {
  result?: {
    transfers: AlchemyTransfer[];
  };
  error?: {
    message: string;
  };
}

// Fetch transfers from a chain
async function fetchTransfers(
  alchemyUrl: string,
  address: string,
  direction: "from" | "to"
): Promise<AlchemyResponse> {
  const params = {
    [direction === "from" ? "fromAddress" : "toAddress"]: address,
    category: ["external", "erc20", "erc721", "erc1155"],
    withMetadata: true,
    maxCount: "0x1f4",
    order: "desc",
  };

  try {
    const response = await fetch(alchemyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [params],
      }),
    });

    if (!response.ok) {
      return { error: { message: `HTTP ${response.status}` } };
    }

    return response.json();
  } catch (error) {
    return { error: { message: String(error) } };
  }
}

// Get wallet metrics from a single chain
async function getChainMetrics(alchemyUrl: string, address: string) {
  const allTransfers: AlchemyTransfer[] = [];

  const outResponse = await fetchTransfers(alchemyUrl, address, "from");
  if (outResponse.result) {
    allTransfers.push(...outResponse.result.transfers);
  }

  const inResponse = await fetchTransfers(alchemyUrl, address, "to");
  if (inResponse.result) {
    allTransfers.push(...inResponse.result.transfers);
  }

  if (allTransfers.length === 0) {
    return { transactionCount: 0, walletAgeDays: 0 };
  }

  // Dedupe by hash
  const seenHashes = new Set<string>();
  const uniqueTransfers = allTransfers.filter((t) => {
    if (seenHashes.has(t.hash)) return false;
    seenHashes.add(t.hash);
    return true;
  });

  // Find oldest transaction
  let oldestTimestamp = Date.now();
  uniqueTransfers.forEach((t) => {
    const timestamp = new Date(t.metadata.blockTimestamp).getTime();
    if (timestamp < oldestTimestamp) {
      oldestTimestamp = timestamp;
    }
  });

  const walletAgeDays = Math.floor((Date.now() - oldestTimestamp) / (1000 * 60 * 60 * 24));

  return {
    transactionCount: uniqueTransfers.length,
    walletAgeDays,
  };
}

// Verify wallet eligibility
async function verifyEligibility(address: string): Promise<{
  eligible: boolean;
  tier: TierName | null;
  walletAgeDays: number;
  totalTransactions: number;
}> {
  const chainIds = Object.keys(CHAINS) as (keyof typeof CHAINS)[];

  // Fetch all chains in parallel
  const results = await Promise.all(
    chainIds.map((chainId) => getChainMetrics(CHAINS[chainId].alchemyUrl, address))
  );

  // Aggregate metrics
  let totalTransactions = 0;
  let oldestWalletAgeDays = 0;

  results.forEach((result) => {
    totalTransactions += result.transactionCount;
    if (result.walletAgeDays > oldestWalletAgeDays) {
      oldestWalletAgeDays = result.walletAgeDays;
    }
  });

  // Determine tier eligibility (check highest first)
  if (
    oldestWalletAgeDays >= TIER_THRESHOLDS.elite.minAgeDays &&
    totalTransactions >= TIER_THRESHOLDS.elite.minTxCount
  ) {
    return { eligible: true, tier: "elite", walletAgeDays: oldestWalletAgeDays, totalTransactions };
  }

  if (
    oldestWalletAgeDays >= TIER_THRESHOLDS.trusted.minAgeDays &&
    totalTransactions >= TIER_THRESHOLDS.trusted.minTxCount
  ) {
    return { eligible: true, tier: "trusted", walletAgeDays: oldestWalletAgeDays, totalTransactions };
  }

  if (
    oldestWalletAgeDays >= TIER_THRESHOLDS.verified.minAgeDays &&
    totalTransactions >= TIER_THRESHOLDS.verified.minTxCount
  ) {
    return { eligible: true, tier: "verified", walletAgeDays: oldestWalletAgeDays, totalTransactions };
  }

  return { eligible: false, tier: null, walletAgeDays: oldestWalletAgeDays, totalTransactions };
}

// EIP-712 domain
const domain = {
  name: "OnChainRewards",
  version: "1",
  chainId: 11155111, // Sepolia
  verifyingContract: CREDENTIAL_NFT_ADDRESS,
} as const;

// EIP-712 types for Mint
const mintTypes = {
  Mint: [
    { name: "user", type: "address" },
    { name: "tier", type: "uint8" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, requestedTier } = body;

    // Validate address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid address" },
        { status: 400 }
      );
    }

    // Check environment
    if (!ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: "Alchemy API key not configured" },
        { status: 500 }
      );
    }

    if (!VERIFIER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Verifier private key not configured" },
        { status: 500 }
      );
    }

    // Verify eligibility
    const eligibility = await verifyEligibility(address);

    if (!eligibility.eligible || !eligibility.tier) {
      return NextResponse.json(
        {
          error: "Not eligible for any tier",
          walletAgeDays: eligibility.walletAgeDays,
          totalTransactions: eligibility.totalTransactions,
        },
        { status: 403 }
      );
    }

    // If user requested a specific tier, validate they're eligible
    const tierToMint = requestedTier || eligibility.tier;
    const tierNumbers: Record<TierName, number> = {
      verified: 0,
      trusted: 1,
      elite: 2,
    };

    // Ensure requested tier <= eligible tier
    if (tierNumbers[tierToMint as TierName] > tierNumbers[eligibility.tier]) {
      return NextResponse.json(
        {
          error: `Not eligible for ${tierToMint} tier. Maximum eligible tier: ${eligibility.tier}`,
          eligibleTier: eligibility.tier,
        },
        { status: 403 }
      );
    }

    // Setup viem clients
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    });

    // Get user's current nonce from contract
    const nonce = await publicClient.readContract({
      address: CREDENTIAL_NFT_ADDRESS,
      abi: credentialNftAbi,
      functionName: "getNonce",
      args: [address as `0x${string}`],
    });

    // Calculate expiry (7 days from now)
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    // Create wallet client for signing
    const account = privateKeyToAccount(VERIFIER_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    });

    // Sign the typed data
    const signature = await walletClient.signTypedData({
      domain,
      types: mintTypes,
      primaryType: "Mint",
      message: {
        user: address as `0x${string}`,
        tier: tierNumbers[tierToMint as TierName],
        expiry,
        nonce,
      },
    });

    return NextResponse.json({
      success: true,
      signature,
      tier: tierToMint,
      tierNumber: tierNumbers[tierToMint as TierName],
      expiry: expiry.toString(),
      nonce: nonce.toString(),
      eligibleTier: eligibility.tier,
      walletAgeDays: eligibility.walletAgeDays,
      totalTransactions: eligibility.totalTransactions,
    });

  } catch (error) {
    console.error("Signature generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate signature. Please try again." },
      { status: 500 }
    );
  }
}
