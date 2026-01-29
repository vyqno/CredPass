"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client, sepolia, TIER_INFO } from "@/lib/thirdweb";
import {
  getPriceForTier,
  getEthPriceForTier,
  PaymentHeaders,
  executePayment,
  retryWithPayment,
} from "@/lib/x402";
import {
  FileText,
  Search,
  Code,
  ArrowLeft,
  Send,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Wallet,
  AlertCircle,
  Bot,
  User,
} from "lucide-react";

interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  placeholder: string;
  gradient: string;
  tier: "verified" | "trusted" | "elite";
}

const serviceConfigs: Record<string, ServiceConfig> = {
  "prd-generator": {
    id: "prd-generator",
    name: "PRD Generator",
    description: "Transform your product ideas into comprehensive Product Requirements Documents.",
    icon: FileText,
    placeholder: "Describe your product idea... e.g., 'A mobile app that helps users track their daily water intake with reminders and progress visualization'",
    gradient: "from-emerald-500 to-emerald-700",
    tier: "verified",
  },
  "research-agent": {
    id: "research-agent",
    name: "Research Agent",
    description: "Get AI-powered research with synthesized findings and cited sources.",
    icon: Search,
    placeholder: "What would you like to research? e.g., 'The latest trends in DeFi lending protocols and their security considerations'",
    gradient: "from-violet-500 to-violet-700",
    tier: "trusted",
  },
  "contract-creator": {
    id: "contract-creator",
    name: "Smart Contract Creator",
    description: "Generate production-ready Solidity smart contracts from natural language.",
    icon: Code,
    placeholder: "Describe your smart contract... e.g., 'An ERC-20 token with a maximum supply of 1 million tokens, 2% transfer fee that goes to a treasury wallet'",
    gradient: "from-amber-500 to-amber-700",
    tier: "elite",
  },
};

/**
 * Generates AI-friendly prompt based on service type
 */
function generateAIPrompt(content: string, userInput: string, serviceId: string): string {
  switch (serviceId) {
    case "prd-generator":
      return generatePRDPrompt(content, userInput);
    case "research-agent":
      return generateResearchPrompt(content, userInput);
    case "contract-creator":
      return generateContractPrompt(content, userInput);
    default:
      return content;
  }
}

/**
 * PRD to project building prompt
 */
function generatePRDPrompt(prdContent: string, userInput: string): string {
  const sections = {
    features: extractSection(prdContent, "Key Features", "Technical Requirements"),
    technical: extractSection(prdContent, "Technical Requirements", "Success Metrics"),
  };

  return `# Project: ${userInput}

## Your Task
Build this project following the specifications below. Start with the MVP features first.

## Tech Stack (Recommended)
- Frontend: Next.js 15 + TypeScript + Tailwind CSS
- Backend: Next.js API Routes or separate Node.js server
- Database: PostgreSQL or MongoDB
- Auth: NextAuth.js or Clerk

## MVP Features to Implement
${sections.features || "See the PRD for detailed features."}

## Technical Requirements
${sections.technical || "Follow modern web development best practices."}

## Implementation Steps
1. Initialize the project with the recommended tech stack
2. Set up the database schema based on the features
3. Create the core API endpoints
4. Build the main UI components
5. Implement authentication if needed
6. Add the MVP features one by one
7. Test thoroughly before adding more features

## Code Quality Guidelines
- Use TypeScript for type safety
- Write clean, readable code with proper comments
- Follow the project's folder structure conventions
- Handle errors gracefully
- Make the UI responsive and accessible

Start building now. Ask me if you need clarification on any feature.`;
}

/**
 * Research to actionable insights prompt
 */
function generateResearchPrompt(researchContent: string, userInput: string): string {
  const sections = {
    summary: extractSection(researchContent, "Executive Summary", "Key Findings"),
    findings: extractSection(researchContent, "Key Findings", "Detailed Analysis"),
    analysis: extractSection(researchContent, "Detailed Analysis", "Conclusions"),
  };

  return `# Research Brief: ${userInput}

## Summary
${sections.summary || "See full research below."}

## Key Insights
${sections.findings || "Review the detailed findings."}

## Action Items Based on Research

### If Building a Product:
1. Identify the core problem from the research findings
2. List the key features that address user needs
3. Note any technical considerations mentioned
4. Consider the competitive landscape
5. Plan your differentiation strategy

### If Making a Decision:
1. Review the pros and cons identified
2. Consider the risks mentioned in the analysis
3. Evaluate against your specific criteria
4. Note any gaps that need further investigation

### If Learning a Topic:
1. Start with the executive summary for overview
2. Deep dive into specific findings relevant to you
3. Follow up on sources for more detail
4. Identify related topics to explore

## Next Steps
Based on this research, here's what you should do:
1. Validate the key findings with your own data/experience
2. Prioritize action items by impact and effort
3. Create a timeline for implementation
4. Set measurable goals to track progress

## Full Research
\`\`\`
${researchContent.slice(0, 2000)}${researchContent.length > 2000 ? '...' : ''}
\`\`\`

Use this research to inform your decisions and next steps.`;
}

/**
 * Smart contract to deployment guide prompt
 */
function generateContractPrompt(contractContent: string, userInput: string): string {
  // Extract the Solidity code block if present
  const codeMatch = contractContent.match(/```solidity([\s\S]*?)```/) ||
                    contractContent.match(/```([\s\S]*?)```/);
  const solidityCode = codeMatch ? codeMatch[1].trim() : contractContent;

  return `# Smart Contract: ${userInput}

## Your Task
Deploy and integrate this smart contract into your project.

## Contract Code
\`\`\`solidity
${solidityCode}
\`\`\`

## Deployment Steps

### 1. Set Up Development Environment
\`\`\`bash
# Using Foundry (Recommended)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Create new project
forge init my-contract
cd my-contract
\`\`\`

### 2. Install Dependencies
\`\`\`bash
# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts
\`\`\`

### 3. Configure Foundry
Add to \`foundry.toml\`:
\`\`\`toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"

[rpc_endpoints]
sepolia = "\${SEPOLIA_RPC_URL}"
mainnet = "\${MAINNET_RPC_URL}"
\`\`\`

### 4. Create Deployment Script
Create \`script/Deploy.s.sol\`:
\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/YourContract.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy your contract here
        // YourContract contract = new YourContract();

        vm.stopBroadcast();
    }
}
\`\`\`

### 5. Deploy to Testnet
\`\`\`bash
# Set environment variables
export PRIVATE_KEY=your_private_key
export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key

# Deploy
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
\`\`\`

### 6. Verify on Etherscan
\`\`\`bash
forge verify-contract <CONTRACT_ADDRESS> src/YourContract.sol:YourContract --chain sepolia
\`\`\`

## Frontend Integration (thirdweb)
\`\`\`typescript
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { sepolia } from "thirdweb/chains";

const contract = getContract({
  client,
  chain: sepolia,
  address: "YOUR_CONTRACT_ADDRESS",
});

// Read from contract
const data = await readContract({
  contract,
  method: "yourReadMethod",
  params: [],
});

// Write to contract
const transaction = prepareContractCall({
  contract,
  method: "yourWriteMethod",
  params: [arg1, arg2],
});
await sendTransaction({ transaction, account });
\`\`\`

## Security Checklist
- [ ] Run \`slither .\` for static analysis
- [ ] Run \`forge test\` for unit tests
- [ ] Check for reentrancy vulnerabilities
- [ ] Verify access controls are correct
- [ ] Test on testnet before mainnet
- [ ] Consider a professional audit for mainnet

## Gas Optimization Tips
- Use \`calldata\` instead of \`memory\` for external function params
- Pack storage variables to save slots
- Use \`unchecked\` for safe math operations
- Avoid redundant storage reads

Deploy and test thoroughly before going to mainnet!`;
}

/**
 * Extract a section from the PRD content
 */
function extractSection(content: string, startMarker: string, endMarker: string): string {
  const startIndex = content.toLowerCase().indexOf(startMarker.toLowerCase());
  if (startIndex === -1) return "";

  const endIndex = content.toLowerCase().indexOf(endMarker.toLowerCase(), startIndex);
  if (endIndex === -1) {
    return content.slice(startIndex).slice(0, 500) + "...";
  }

  return content.slice(startIndex, endIndex).trim();
}

/**
 * Simple markdown-like formatting for display
 */
function formatMarkdown(content: string): string {
  return content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-[var(--color-primary)] mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-[var(--color-border)] pb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc text-[var(--color-text-secondary)]">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-[var(--color-text-secondary)]">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-[var(--color-text-secondary)]">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

export default function ServicePage() {
  const params = useParams();
  const account = useActiveAccount();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [copied, setCopied] = useState<"human" | "ai" | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"human" | "ai">("human");
  const [paymentInfo, setPaymentInfo] = useState<{
    price: string;
    tier: string;
    description: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serviceId = params.id as string;
  const service = serviceConfigs[serviceId];

  if (!service) {
    return (
      <div className="min-h-screen grid-pattern py-12 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Service Not Found</h1>
          <Link href="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!input.trim()) return;
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    setIsGenerating(true);
    setOutput(null);
    setError(null);
    setPaymentPending(false);

    try {
      const userTier = "verified";

      const response = await fetch(`/api/service/${service.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: input.trim(),
          userTier,
        }),
      });

      if (response.status === 402) {
        const data = await response.json();
        setPaymentInfo({
          price: data.payment.price,
          tier: data.payment.tier,
          description: data.payment.description,
        });
        setPaymentPending(true);
        setIsGenerating(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content");
      }

      const result = await response.json();
      setOutput(result.data);
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePayAndGenerate = async () => {
    if (!account || !paymentInfo) return;

    setIsPaying(true);
    setError(null);

    try {
      const tier = paymentInfo.tier as "verified" | "trusted" | "elite";
      const paymentResult = await executePayment(account, tier);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Payment failed");
      }

      setIsPaying(false);
      setIsGenerating(true);
      setPaymentPending(false);

      const response = await retryWithPayment(
        `/api/service/${service.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: input.trim(),
            userTier: paymentInfo.tier,
          }),
        },
        paymentResult.txHash!
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content after payment");
      }

      const result = await response.json();
      console.log(`Payment successful! Tx: ${paymentResult.txHash}`);
      setOutput(result.data);
      setPaymentInfo(null);
    } catch (err) {
      console.error("Payment or generation failed:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsPaying(false);
      setIsGenerating(false);
    }
  };

  const handleCancelPayment = () => {
    setPaymentPending(false);
    setPaymentInfo(null);
    setError(null);
  };

  const handleCopy = async (type: "human" | "ai") => {
    if (!output) return;

    const textToCopy = type === "human" ? output : generateAIPrompt(output, input, serviceId);
    await navigator.clipboard.writeText(textToCopy);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const ServiceIcon = service.icon;

  return (
    <div className="min-h-screen grid-pattern py-12">
      <div className="max-w-5xl mx-auto px-6">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Services
        </Link>

        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          <div
            className={`w-16 h-16 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center flex-shrink-0`}
          >
            <ServiceIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{service.name}</h1>
            <p className="text-[var(--color-text-secondary)]">{service.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="px-2 py-1 text-xs rounded-full"
                style={{
                  background: TIER_INFO[service.tier].color + "20",
                  color: TIER_INFO[service.tier].color,
                }}
              >
                {TIER_INFO[service.tier].name}+ Required
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">
                Price: {getPriceForTier("verified")} ({getEthPriceForTier("verified")} ETH)
              </span>
            </div>
          </div>
        </div>

        {!account ? (
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto">
              Connect your wallet to use this service and pay with crypto.
            </p>
            <ConnectButton
              client={client}
              chain={sepolia}
              theme="dark"
              connectButton={{
                label: "Connect Wallet",
                style: {
                  background: "var(--gradient-primary)",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "0.875rem 2rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                },
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="glass-card p-4 border-red-500/50 bg-red-500/10">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Payment Required Modal */}
            {paymentPending && paymentInfo && (
              <div className="glass-card p-6 border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-6 h-6 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Payment Required</h3>
                    <p className="text-[var(--color-text-secondary)] mb-4">
                      {paymentInfo.description}
                    </p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-[var(--color-background-secondary)] rounded-lg px-4 py-2">
                        <span className="text-sm text-[var(--color-text-muted)]">Price</span>
                        <p className="text-lg font-bold text-[var(--color-primary)]">
                          {paymentInfo.price}
                        </p>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          ≈ {getEthPriceForTier(paymentInfo.tier as any)} ETH
                        </span>
                      </div>
                      <div className="bg-[var(--color-background-secondary)] rounded-lg px-4 py-2">
                        <span className="text-sm text-[var(--color-text-muted)]">Network</span>
                        <p className="text-lg font-bold">Sepolia</p>
                        <span className="text-xs text-[var(--color-text-muted)]">Testnet</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handlePayAndGenerate}
                        disabled={isPaying}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        {isPaying ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing Payment...
                          </>
                        ) : (
                          <>
                            <Wallet className="w-5 h-5" />
                            Pay & Generate
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelPayment}
                        disabled={isPaying}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Input Section */}
            <div className="glass-card p-6">
              <label className="block text-sm font-medium mb-3">Your Input</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={service.placeholder}
                rows={5}
                disabled={paymentPending}
                className="w-full bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg p-4 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none disabled:opacity-50"
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-[var(--color-text-muted)]">
                  {input.length} characters
                </span>
                {!paymentPending && (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !input.trim()}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Generate
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Output Section */}
            {(output || isGenerating) && (
              <div className="glass-card p-6 animate-fade-in">
                {isGenerating ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)] mx-auto mb-4" />
                      <p className="text-[var(--color-text-secondary)]">
                        Generating your content...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Tab Headers */}
                    <div className="flex items-center gap-1 mb-4 bg-[var(--color-background-secondary)] rounded-lg p-1">
                      <button
                        onClick={() => setActiveTab("human")}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                          activeTab === "human"
                            ? "bg-[var(--color-primary)] text-white"
                            : "text-[var(--color-text-secondary)] hover:text-white"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        For You
                      </button>
                      <button
                        onClick={() => setActiveTab("ai")}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                          activeTab === "ai"
                            ? "bg-[var(--color-primary)] text-white"
                            : "text-[var(--color-text-secondary)] hover:text-white"
                        }`}
                      >
                        <Bot className="w-4 h-4" />
                        For Your AI
                      </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === "human" ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">Readable Document</h3>
                            <p className="text-sm text-[var(--color-text-muted)]">
                              Formatted for easy reading
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopy("human")}
                            className="btn-secondary text-sm py-1.5 px-3 inline-flex items-center gap-2"
                          >
                            {copied === "human" ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <div
                          className="bg-[var(--color-background-secondary)] rounded-lg p-6 max-h-[600px] overflow-y-auto prose prose-invert prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: formatMarkdown(output || "") }}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">
                              {serviceId === "prd-generator" && "Build Prompt"}
                              {serviceId === "research-agent" && "Action Plan"}
                              {serviceId === "contract-creator" && "Deployment Guide"}
                            </h3>
                            <p className="text-sm text-[var(--color-text-muted)]">
                              {serviceId === "prd-generator" && "Copy & paste into Claude Code, Cursor, or any AI assistant"}
                              {serviceId === "research-agent" && "Actionable insights and next steps from your research"}
                              {serviceId === "contract-creator" && "Step-by-step guide to deploy and integrate your contract"}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopy("ai")}
                            className="btn-secondary text-sm py-1.5 px-3 inline-flex items-center gap-2"
                          >
                            {copied === "ai" ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy Prompt
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-6 max-h-[600px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm text-[var(--color-text)] font-mono leading-relaxed">
                            {generateAIPrompt(output || "", input, serviceId)}
                          </pre>
                        </div>
                        <div className="mt-4 p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            <strong className="text-[var(--color-primary)]">💡 Tip:</strong>{" "}
                            {serviceId === "prd-generator" && "Paste this into Claude Code, Cursor, or Windsurf to start building your project instantly."}
                            {serviceId === "research-agent" && "Use these insights to inform your decisions. Paste into any AI assistant for follow-up questions."}
                            {serviceId === "contract-creator" && "Follow the deployment steps to get your contract live. Use Foundry or Hardhat for best results."}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
