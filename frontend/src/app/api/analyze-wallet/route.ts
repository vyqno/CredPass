import { NextRequest, NextResponse } from "next/server";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

// All major EVM chains supported by Alchemy
const CHAINS = {
  ethereum: {
    name: "Ethereum",
    alchemyUrl: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    explorer: "https://etherscan.io",
    icon: "⟠",
    color: "#627EEA",
  },
  polygon: {
    name: "Polygon",
    alchemyUrl: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    explorer: "https://polygonscan.com",
    icon: "⬡",
    color: "#8247E5",
  },
  arbitrum: {
    name: "Arbitrum",
    alchemyUrl: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    explorer: "https://arbiscan.io",
    icon: "🔵",
    color: "#28A0F0",
  },
  optimism: {
    name: "Optimism",
    alchemyUrl: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    explorer: "https://optimistic.etherscan.io",
    icon: "🔴",
    color: "#FF0420",
  },
  base: {
    name: "Base",
    alchemyUrl: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    explorer: "https://basescan.org",
    icon: "🔵",
    color: "#0052FF",
  },
  sepolia: {
    name: "Sepolia",
    alchemyUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    explorer: "https://sepolia.etherscan.io",
    icon: "🧪",
    color: "#CFB5F0",
  },
} as const;

type ChainId = keyof typeof CHAINS;

interface AlchemyTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
  category: string;
  metadata: {
    blockTimestamp: string;
  };
}

interface AlchemyResponse {
  result?: {
    transfers: AlchemyTransfer[];
    pageKey?: string;
  };
  error?: {
    message: string;
  };
}

export interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
  category: string;
  timestamp: string;
  explorerUrl: string;
}

export interface ChainMetrics {
  chainId: ChainId;
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

export interface MultiChainMetrics {
  address: string;
  totalTransactions: number;
  totalUniqueAddresses: number;
  oldestWalletAgeDays: number;
  oldestChain: string | null;
  firstTxDate: string | null;
  chainsWithActivity: number;
  chains: ChainMetrics[];
}

async function fetchTransfers(
  alchemyUrl: string,
  address: string,
  direction: "from" | "to",
  pageKey?: string
): Promise<AlchemyResponse> {
  const params: Record<string, unknown> = {
    [direction === "from" ? "fromAddress" : "toAddress"]: address,
    category: ["external", "erc20", "erc721", "erc1155"],
    withMetadata: true,
    maxCount: "0x1f4", // 500 per request
    order: "desc", // Get most recent first
  };

  if (pageKey) {
    params.pageKey = pageKey;
  }

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

async function getChainMetrics(
  chainId: ChainId,
  address: string
): Promise<ChainMetrics> {
  const chain = CHAINS[chainId];
  const allTransfers: AlchemyTransfer[] = [];

  // Fetch outgoing transfers (1 page)
  const outResponse = await fetchTransfers(chain.alchemyUrl, address, "from");
  if (outResponse.result) {
    allTransfers.push(...outResponse.result.transfers);
  }

  // Fetch incoming transfers (1 page)
  const inResponse = await fetchTransfers(chain.alchemyUrl, address, "to");
  if (inResponse.result) {
    allTransfers.push(...inResponse.result.transfers);
  }

  if (allTransfers.length === 0) {
    return {
      chainId,
      name: chain.name,
      icon: chain.icon,
      color: chain.color,
      explorer: chain.explorer,
      transactionCount: 0,
      uniqueAddresses: 0,
      firstTxDate: null,
      lastTxDate: null,
      walletAgeDays: 0,
      recentTransactions: [],
    };
  }

  // Sort by timestamp
  const sortedTransfers = allTransfers.sort((a, b) => {
    const timeA = new Date(a.metadata.blockTimestamp).getTime();
    const timeB = new Date(b.metadata.blockTimestamp).getTime();
    return timeB - timeA; // Most recent first
  });

  // Dedupe by hash
  const seenHashes = new Set<string>();
  const uniqueTransfers = sortedTransfers.filter((t) => {
    if (seenHashes.has(t.hash)) return false;
    seenHashes.add(t.hash);
    return true;
  });

  const firstTx = uniqueTransfers[uniqueTransfers.length - 1];
  const lastTx = uniqueTransfers[0];

  const firstTxDate = new Date(firstTx.metadata.blockTimestamp);
  const lastTxDate = new Date(lastTx.metadata.blockTimestamp);
  const now = new Date();
  const walletAgeDays = Math.floor(
    (now.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Count unique addresses
  const uniqueAddresses = new Set<string>();
  uniqueTransfers.forEach((t) => {
    if (t.from.toLowerCase() !== address.toLowerCase()) {
      uniqueAddresses.add(t.from.toLowerCase());
    }
    if (t.to && t.to.toLowerCase() !== address.toLowerCase()) {
      uniqueAddresses.add(t.to.toLowerCase());
    }
  });

  // Get recent transactions (top 10)
  const recentTransactions: Transaction[] = uniqueTransfers.slice(0, 10).map((t) => ({
    hash: t.hash,
    from: t.from,
    to: t.to,
    value: t.value,
    asset: t.asset,
    category: t.category,
    timestamp: t.metadata.blockTimestamp,
    explorerUrl: `${chain.explorer}/tx/${t.hash}`,
  }));

  return {
    chainId,
    name: chain.name,
    icon: chain.icon,
    color: chain.color,
    explorer: chain.explorer,
    transactionCount: uniqueTransfers.length,
    uniqueAddresses: uniqueAddresses.size,
    firstTxDate: firstTxDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    lastTxDate: lastTxDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    walletAgeDays,
    recentTransactions,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    if (!ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: "Alchemy API key not configured" },
        { status: 500 }
      );
    }

    // Fetch metrics from all chains in parallel
    const chainIds = Object.keys(CHAINS) as ChainId[];
    const chainMetricsPromises = chainIds.map((chainId) =>
      getChainMetrics(chainId, address)
    );

    const chainMetrics = await Promise.all(chainMetricsPromises);

    // Filter chains with activity and calculate totals
    const chainsWithActivity = chainMetrics.filter((c) => c.transactionCount > 0);

    const totalTransactions = chainMetrics.reduce(
      (sum, c) => sum + c.transactionCount,
      0
    );

    const totalUniqueAddresses = chainMetrics.reduce(
      (sum, c) => sum + c.uniqueAddresses,
      0
    );

    // Find oldest wallet age
    let oldestWalletAgeDays = 0;
    let oldestChain: string | null = null;
    let firstTxDate: string | null = null;

    chainMetrics.forEach((c) => {
      if (c.walletAgeDays > oldestWalletAgeDays) {
        oldestWalletAgeDays = c.walletAgeDays;
        oldestChain = c.name;
        firstTxDate = c.firstTxDate;
      }
    });

    // Sort chains by transaction count (most active first)
    const sortedChains = [...chainMetrics].sort(
      (a, b) => b.transactionCount - a.transactionCount
    );

    const result: MultiChainMetrics = {
      address: address.toLowerCase(),
      totalTransactions,
      totalUniqueAddresses,
      oldestWalletAgeDays,
      oldestChain,
      firstTxDate,
      chainsWithActivity: chainsWithActivity.length,
      chains: sortedChains,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Wallet analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze wallet. Please try again." },
      { status: 500 }
    );
  }
}
