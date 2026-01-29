/**
 * X402 Payment Client Utilities
 *
 * This module provides client-side utilities for handling x402 payment flows.
 * Uses thirdweb for actual payment processing.
 */

import { prepareTransaction, sendTransaction, toWei } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { client } from "./thirdweb";

/**
 * Payment information from a 402 response
 */
export interface PaymentInfo {
  error: string;
  payment: {
    price: string;
    tier: string;
    service: string;
    description: string;
  };
}

/**
 * Service request configuration
 */
export interface ServiceRequestConfig extends RequestInit {
  body?: string;
}

/**
 * Tier-based pricing information (in USD, converted to ETH at runtime)
 */
export const TIER_PRICES: Record<string, string> = {
  verified: "$0.05",
  trusted: "$0.03",
  elite: "$0.01",
};

/**
 * Tier-based pricing in ETH (approximate, for Sepolia testnet)
 * These are small amounts for testing
 */
export const TIER_PRICES_ETH: Record<string, string> = {
  verified: "0.00002", // ~$0.05 worth
  trusted: "0.00001", // ~$0.03 worth
  elite: "0.000005", // ~$0.01 worth
};

/**
 * Service configuration with tier requirements
 */
export const SERVICE_CONFIG: Record<
  string,
  { name: string; tier: "verified" | "trusted" | "elite"; price: string }
> = {
  "prd-generator": {
    name: "PRD Generator",
    tier: "verified",
    price: "$0.05",
  },
  "research-agent": {
    name: "Research Agent",
    tier: "trusted",
    price: "$0.03",
  },
  "contract-creator": {
    name: "Smart Contract Creator",
    tier: "elite",
    price: "$0.01",
  },
};

/**
 * Server wallet address to receive payments
 */
export const SERVER_WALLET = process.env.NEXT_PUBLIC_SERVER_WALLET || "0xd3C102222707FE5c51d0c3845F4aEEd3185b9931";

/**
 * Gets the price for a specific tier
 */
export function getPriceForTier(tier: "verified" | "trusted" | "elite"): string {
  return TIER_PRICES[tier] || "$0.05";
}

/**
 * Gets the ETH price for a specific tier
 */
export function getEthPriceForTier(tier: "verified" | "trusted" | "elite"): string {
  return TIER_PRICES_ETH[tier] || "0.00002";
}

/**
 * Gets the minimum tier required for a service
 */
export function getMinimumTierForService(
  serviceId: string
): "verified" | "trusted" | "elite" {
  const service = SERVICE_CONFIG[serviceId];
  return service?.tier || "verified";
}

/**
 * Checks if a user's tier allows access to a service
 */
export function canAccessService(
  userTier: "verified" | "trusted" | "elite",
  serviceId: string
): boolean {
  const tierHierarchy = { verified: 1, trusted: 2, elite: 3 };
  const requiredTier = getMinimumTierForService(serviceId);
  return (tierHierarchy[userTier] || 0) >= (tierHierarchy[requiredTier] || 0);
}

/**
 * Executes x402 payment using thirdweb
 * Sends ETH to server wallet and returns transaction hash
 */
export async function executePayment(
  account: any,
  tier: "verified" | "trusted" | "elite"
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const ethAmount = getEthPriceForTier(tier);

    // Prepare the payment transaction
    const transaction = prepareTransaction({
      client,
      chain: sepolia,
      to: SERVER_WALLET as `0x${string}`,
      value: toWei(ethAmount),
    });

    // Send the transaction
    const result = await sendTransaction({
      transaction,
      account,
    });

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    console.error("Payment failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment failed",
    };
  }
}

/**
 * Creates a fetch wrapper that handles x402 payments automatically
 */
export function createPaymentFetch(account: any) {
  return async (url: string, config?: ServiceRequestConfig) => {
    // First attempt - basic request
    let response = await fetch(url, config);

    // If payment required (402), handle payment flow
    if (response.status === 402) {
      const paymentInfo: PaymentInfo = await response.json();

      // Execute payment
      const tier = paymentInfo.payment.tier as "verified" | "trusted" | "elite";
      const paymentResult = await executePayment(account, tier);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Payment failed");
      }

      // Retry with payment authorization
      response = await fetch(url, {
        ...config,
        headers: {
          ...config?.headers,
          "X-Payment-Authorization": paymentResult.txHash!,
        },
      });
    }

    return response;
  };
}

/**
 * Handles a 402 Payment Required response with user confirmation
 */
export async function handlePaymentRequired(
  response: Response,
  account: any,
  onConfirm: () => Promise<boolean>
): Promise<{ paid: boolean; txHash?: string; error?: string }> {
  if (response.status !== 402) {
    return { paid: false, error: "Not a 402 response" };
  }

  const paymentInfo: PaymentInfo = await response.clone().json();

  // Ask user for confirmation
  const confirmed = await onConfirm();
  if (!confirmed) {
    return { paid: false, error: "Payment cancelled by user" };
  }

  // Execute payment
  const tier = paymentInfo.payment.tier as "verified" | "trusted" | "elite";
  const result = await executePayment(account, tier);

  return {
    paid: result.success,
    txHash: result.txHash,
    error: result.error,
  };
}

/**
 * Retries a failed request with payment signature
 */
export async function retryWithPayment(
  url: string,
  config: ServiceRequestConfig,
  paymentTxHash: string
): Promise<Response> {
  const headers = {
    ...config.headers,
    "X-Payment-Authorization": paymentTxHash,
  } as Record<string, string>;

  return fetch(url, {
    ...config,
    headers,
  });
}

/**
 * Formats price for display
 */
export function formatPrice(price: string): string {
  return price.startsWith("$") ? price : `$${price}`;
}

/**
 * Gets readable service name
 */
export function getServiceName(serviceId: string): string {
  return SERVICE_CONFIG[serviceId]?.name || "Unknown Service";
}

/**
 * Calculates total cost for multiple requests
 */
export function calculateTotalCost(
  serviceId: string,
  count: number,
  userTier: "verified" | "trusted" | "elite"
): number {
  const priceStr = getPriceForTier(userTier);
  const price = parseFloat(priceStr.replace("$", ""));
  return parseFloat((price * count).toFixed(2));
}

/**
 * Payment response headers helpers
 */
export const PaymentHeaders = {
  getAmount(headers: Headers): string | null {
    return headers.get("X-Payment-Amount");
  },
  getStatus(headers: Headers): string | null {
    return headers.get("X-Payment-Status");
  },
  getUserTier(headers: Headers): string | null {
    return headers.get("X-User-Tier");
  },
  getServiceId(headers: Headers): string | null {
    return headers.get("X-Service-ID");
  },
  getApiUsed(headers: Headers): string | null {
    return headers.get("X-API-Used");
  },
};
