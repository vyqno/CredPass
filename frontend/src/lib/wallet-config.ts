/**
 * Wallet configuration and filtering utilities
 * 
 * Only supports EVM-compatible wallets with 0x addresses.
 * Filters out Solana, Cosmos, and other non-EVM chains.
 */

import { createWallet } from "thirdweb/wallets";
import type { Wallet } from "thirdweb/wallets";

/**
 * EVM-only wallet IDs
 * These are all Ethereum/EVM-compatible wallets
 */
export const EVM_WALLET_IDS = [
  "io.metamask",           // MetaMask
  "com.coinbase.wallet",   // Coinbase Wallet
  "me.rainbow",            // Rainbow
  "io.rabby",              // Rabby
  "com.trustwallet.app",   // Trust Wallet
  "io.zerion.wallet",      // Zerion
  "com.okex.wallet",       // OKEx Wallet
  "embedded",              // Thirdweb Embedded Wallet (supports Google sign-in)
] as const;

/**
 * Wallets to exclude (non-EVM, multichain without 0x)
 */
export const EXCLUDED_WALLET_IDS = [
  "io.phantom",            // Solana/Cosmos
  "com.backpackapp",       // Solana
  "io.brave.wallet",       // Multichain (may not default to EVM)
];

export type EVMWalletId = (typeof EVM_WALLET_IDS)[number];

/**
 * Creates a list of EVM-only wallets
 * 
 * @returns Array of wallet instances configured for EVM
 */
export function getEVMWallets(): Wallet[] {
  return EVM_WALLET_IDS.map((walletId) => {
    const wallet = createWallet(walletId);
    
    // Add metadata for EVM filtering
    (wallet as any).__evm_only = true;
    
    return wallet;
  });
}

/**
 * Checks if a wallet address is a valid EVM address (0x format)
 * 
 * @param address - Wallet address to validate
 * @returns true if address is EVM format (0x...)
 */
export function isEVMAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Filters wallet list to only EVM-compatible wallets
 * 
 * @param wallets - Array of wallets to filter
 * @param walletAddress - Current wallet address to validate
 * @returns Filtered array of EVM-only wallets
 */
export function filterToEVMWallets(wallets: Wallet[], walletAddress?: string): Wallet[] {
  // If we have an address, validate it's EVM format
  if (walletAddress && !isEVMAddress(walletAddress)) {
    console.warn("Non-EVM wallet address detected:", walletAddress);
    return [];
  }

  return wallets.filter((wallet) => {
    const walletId = (wallet as any).id || (wallet as any).__id;
    return EVM_WALLET_IDS.includes(walletId as EVMWalletId);
  });
}

/**
 * Validates wallet configuration for payment system
 * 
 * Required for x402 payments:
 * - Must be EVM-compatible
 * - Must have 0x address format
 * - Must be on supported chain (Sepolia, Arbitrum, etc)
 * 
 * @param address - Wallet address
 * @returns Validation result with details
 */
export function validateWalletForPayments(address: string | null | undefined) {
  const isValid = isEVMAddress(address);

  return {
    isValid,
    address: address || "Not connected",
    isEVM: isValid,
    chainRequired: "Sepolia or Arbitrum",
    format: isValid ? "0x format ✓" : "Invalid format",
  };
}
