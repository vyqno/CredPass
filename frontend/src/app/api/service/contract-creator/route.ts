/**
 * Smart Contract Creator Service Endpoint
 * Route: POST /api/service/contract-creator
 * 
 * Generates production-ready Solidity smart contracts using x402 payment
 * 
 * Pricing:
 * - Verified: $0.05
 * - Trusted: $0.03
 * - Elite: $0.01
 * 
 * API Used: ChainGPT (fallback to Groq)
 */

import { NextRequest, NextResponse } from "next/server";

const TIER_PRICING: Record<string, string> = {
  verified: "$0.05",
  trusted: "$0.03",
  elite: "$0.01",
};

function getPriceForTier(tier: string): string {
  return TIER_PRICING[tier] || "$0.05";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, userTier = "verified" } = body;

    if (!input || input.trim().length === 0) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const price = getPriceForTier(userTier);

    // x402 Payment verification
    const paymentHeader = req.headers.get("X-Payment-Authorization");

    if (process.env.SKIP_PAYMENT_CHECK !== "true" && !paymentHeader) {
      return NextResponse.json(
        {
          error: "Payment required",
          payment: {
            price,
            tier: userTier,
            service: "contract-creator",
            description: "Generate production-ready Solidity smart contracts",
          },
        },
        {
          status: 402,
          headers: {
            "X-Payment-Required": "true",
            "X-Price": price,
            "X-Service": "contract-creator",
          },
        }
      );
    }

    if (paymentHeader) {
      console.log(`Payment received for contract-creator: ${paymentHeader}`);
    }

    // Try ChainGPT first, fallback to Groq
    let result = await tryChainGPTContract(input);
    let apiUsed = "chaingpt";

    if (!result) {
      result = await tryGroqContract(input);
      apiUsed = "groq";
    }

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate contract" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: result },
      {
        status: 200,
        headers: {
          "X-Payment-Amount": price,
          "X-Payment-Status": "settled",
          "X-User-Tier": userTier,
          "X-Service-ID": "contract-creator",
          "X-API-Used": apiUsed,
        },
      }
    );
  } catch (error) {
    console.error("Contract Creator error:", error);
    return NextResponse.json(
      {
        error: "Service error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function tryChainGPTContract(input: string): Promise<string | null> {
  const chainGptApiKey = process.env.CHAINGPT_API_KEY;

  if (!chainGptApiKey) {
    console.log("ChainGPT API key not configured, will use fallback");
    return null;
  }

  try {
    const response = await fetch("https://api.chaingpt.org/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chainGptApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert Solidity smart contract developer. Generate production-ready Solidity contracts.

Requirements:
- Use Solidity 0.8.24 or compatible version
- Include proper security checks (checks-effects-interactions pattern)
- Add OpenZeppelin imports where appropriate (ERC20, ERC721, Ownable, etc.)
- Include comprehensive natspec documentation
- Add event logging for all state changes
- Include error handling with custom errors
- Add access control where needed
- Include tests considerations in comments

Output ONLY the Solidity code, no explanations.`,
          },
          {
            role: "user",
            content: `Generate a production-ready Solidity smart contract for: ${input}

Requirements:
- Modern Solidity 0.8.24+
- Security best practices
- Clear documentation
- Efficient gas usage`,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("ChainGPT API error:", error);
      return null;
    }

    const data: any = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error("ChainGPT API fetch failed:", error);
    return null;
  }
}

async function tryGroqContract(input: string): Promise<string | null> {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    console.error("Groq API key not configured");
    return null;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert Solidity smart contract developer. Generate production-ready Solidity contracts.

Requirements:
- Use Solidity 0.8.24 or compatible version
- Include proper security checks
- Add OpenZeppelin imports where appropriate
- Include natspec documentation
- Add event logging
- Include error handling

Output ONLY the Solidity code with no explanations.`,
          },
          {
            role: "user",
            content: `Generate a production-ready Solidity smart contract for: ${input}

Use best practices for security and efficiency.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      return null;
    }

    const data: any = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error("Groq API fetch failed:", error);
    return null;
  }
}
