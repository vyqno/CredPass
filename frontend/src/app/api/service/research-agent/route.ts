/**
 * Research Agent Service Endpoint
 * Route: POST /api/service/research-agent
 * 
 * Conducts AI-powered research with cited sources using x402 payment
 * 
 * Pricing:
 * - Verified: $0.05
 * - Trusted: $0.03
 * - Elite: $0.01
 * 
 * API Used: Perplexity (fallback to Groq)
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
            service: "research-agent",
            description: "Conduct comprehensive research with cited sources",
          },
        },
        {
          status: 402,
          headers: {
            "X-Payment-Required": "true",
            "X-Price": price,
            "X-Service": "research-agent",
          },
        }
      );
    }

    if (paymentHeader) {
      console.log(`Payment received for research-agent: ${paymentHeader}`);
    }

    // Try Perplexity first, fallback to Groq
    let result = await tryPerplexityResearch(input);
    let apiUsed = "perplexity";

    if (!result) {
      result = await tryGroqResearch(input);
      apiUsed = "groq";
    }

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate research" },
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
          "X-Service-ID": "research-agent",
          "X-API-Used": apiUsed,
        },
      }
    );
  } catch (error) {
    console.error("Research Agent error:", error);
    return NextResponse.json(
      {
        error: "Service error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function tryPerplexityResearch(input: string): Promise<string | null> {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

  if (!perplexityApiKey) {
    console.log("Perplexity API key not configured, will use fallback");
    return null;
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${perplexityApiKey}`,
      },
      body: JSON.stringify({
        model: "pplx-7b-online",
        messages: [
          {
            role: "system",
            content: `You are a research assistant. Provide comprehensive research with cited sources.

Format your response with:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Sources and Citations

Always cite your sources clearly.`,
          },
          {
            role: "user",
            content: `Research and provide detailed information about: ${input}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Perplexity API error:", error);
      return null;
    }

    const data: any = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error("Perplexity API fetch failed:", error);
    return null;
  }
}

async function tryGroqResearch(input: string): Promise<string | null> {
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
            content: `You are a research assistant. Provide comprehensive research with detailed insights.

Format your response with:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Conclusions & Recommendations

Provide well-structured, detailed research.`,
          },
          {
            role: "user",
            content: `Research and provide detailed information about: ${input}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
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
