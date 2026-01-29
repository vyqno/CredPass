import { getContract } from "thirdweb";
import { client, sepolia, CREDENTIAL_NFT_ADDRESS } from "./thirdweb";

// Contract ABI for CredentialNFT
export const CREDENTIAL_NFT_ABI = [
  {
    type: "function",
    name: "getCredential",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      { name: "tier", type: "uint8", internalType: "enum CredentialNFT.Tier" },
      { name: "expiry", type: "uint256", internalType: "uint256" },
      { name: "mintedAt", type: "uint256", internalType: "uint256" },
      { name: "exists", type: "bool", internalType: "bool" },
      { name: "isCurrentlyValid", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isValid",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "requiredTier", type: "uint8", internalType: "enum CredentialNFT.Tier" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNonce",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "tier", type: "uint8", internalType: "enum CredentialNFT.Tier" },
      { name: "expiry", type: "uint256", internalType: "uint256" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "renew",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "newExpiry", type: "uint256", internalType: "uint256" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tierName",
    inputs: [{ name: "tier", type: "uint8", internalType: "enum CredentialNFT.Tier" }],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "pure",
  },
] as const;

export const credentialContract = getContract({
  client,
  chain: sepolia,
  address: CREDENTIAL_NFT_ADDRESS,
  abi: CREDENTIAL_NFT_ABI,
});

export type Tier = 0 | 1 | 2; // Verified = 0, Trusted = 1, Elite = 2

export interface CredentialData {
  tier: Tier;
  expiry: bigint;
  mintedAt: bigint;
  exists: boolean;
  isCurrentlyValid: boolean;
}
