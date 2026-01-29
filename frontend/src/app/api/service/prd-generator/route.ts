/**
 * PRD Generator Service Endpoint
 * Route: POST /api/service/prd-generator
 * 
 * Generates Product Requirements Documents using x402 payment
 * 
 * Pricing:
 * - Verified: $0.05
 * - Trusted: $0.03
 * - Elite: $0.01
 * 
 * API Used: Groq (Llama 3.3 70B)
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
      // No payment provided - return 402 Payment Required
      return NextResponse.json(
        {
          error: "Payment required",
          payment: {
            price,
            tier: userTier,
            service: "prd-generator",
            description: "Generate a comprehensive Product Requirements Document",
          },
        },
        {
          status: 402,
          headers: {
            "X-Payment-Required": "true",
            "X-Price": price,
            "X-Service": "prd-generator",
          },
        }
      );
    }

    // Payment provided - log it (in production, verify tx on-chain)
    if (paymentHeader) {
      console.log(`Payment received for prd-generator: ${paymentHeader}`);
    }

    // Call Groq API to generate PRD
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "Groq API key not configured" },
        { status: 500 }
      );
    }

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
            content: `You are an expert product manager. Create a comprehensive Product Requirements Document (PRD) based on the user's idea. 
          
Format the PRD with these sections:
1. Executive Summary
2. Problem Statement
3. Goals & Objectives
4. Target Users & Personas
5. Key Features
   - MVP Features (Phase 1)
   - Future Features (Phase 2)
6. Technical Requirements
7. Success Metrics
8. Timeline & Milestones

Make it professional, detailed, and actionable.`,
          },
          {
            role: "user",
            content: `Create a detailed PRD for this product idea: ${input}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      return NextResponse.json(
        { error: "Failed to generate PRD", details: error },
        { status: 500 }
      );
    }

    const data: any = await response.json();
    const generatedPRD = data.choices[0]?.message?.content;

    if (!generatedPRD) {
      return NextResponse.json(
        { error: "No content generated" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: generatedPRD },
      {
        status: 200,
        headers: {
          "X-Payment-Amount": price,
          "X-Payment-Status": "settled",
          "X-User-Tier": userTier,
          "X-Service-ID": "prd-generator",
          "X-API-Used": "groq",
        },
      }
    );
  } catch (error) {
    console.error("PRD Generator error:", error);
    return NextResponse.json(
      {
        error: "Service error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
