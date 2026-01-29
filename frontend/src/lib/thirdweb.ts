import { createThirdwebClient, defineChain } from "thirdweb";

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "aa34b2f5424818effd05060375631b30",
});

export const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: "https://sepolia.drpc.org",
  blockExplorers: [
    {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
    },
  ],
  testnet: true,
});

// Contract addresses from deployment
export const CREDENTIAL_NFT_ADDRESS = "0x09f9e2C32eC093C65d0E900DaA3d22da9af3d05F";
export const AUTOMATION_CONSUMER_ADDRESS = "0x91c42Cc38904E5fB3Ee02626CC60352860E63F22";
export const VERIFIER_ADDRESS = "0xd3C102222707FE5c51d0c3845F4aEEd3185b9931";

// Tier thresholds
export const TIER_THRESHOLDS = {
  verified: { minAgeDays: 7, minTxCount: 5 },
  trusted: { minAgeDays: 30, minTxCount: 20 },
  elite: { minAgeDays: 90, minTxCount: 50 },
} as const;

export type TierName = "verified" | "trusted" | "elite" | "none";

export const TIER_INFO: Record<TierName, { name: string; color: string; services: string[] }> = {
  none: {
    name: "No Credential",
    color: "#71717a",
    services: [],
  },
  verified: {
    name: "Verified",
    color: "#10b981",
    services: ["PRD Generator"],
  },
  trusted: {
    name: "Trusted",
    color: "#8b5cf6",
    services: ["PRD Generator", "Research Agent"],
  },
  elite: {
    name: "Elite",
    color: "#f59e0b",
    services: ["PRD Generator", "Research Agent", "Smart Contract Creator"],
  },
};
