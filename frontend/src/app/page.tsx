"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Wallet,
  Shield,
  Zap,
  FileText,
  Search,
  Code,
  Star,
  ChevronDown
} from "lucide-react";
import { SplineScene } from "@/components/SplineScene";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import ChainCarousel from "@/components/ui/chain-carousel";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

const howItWorks = [
  {
    step: "01",
    title: "Connect Your Wallet",
    description: "Link your Web3 wallet securely using Thirdweb. We analyze your on-chain activity to determine your reputation tier.",
  },
  {
    step: "02",
    title: "Get Your Credential",
    description: "Based on wallet age and transaction history, mint a soulbound NFT credential that represents your tier.",
  },
  {
    step: "03",
    title: "Access AI Services",
    description: "Use your credential to unlock premium AI tools including PRD Generator, Research Agent, and Smart Contract Creator.",
  },
];

const features = [
  {
    title: "Wallet Analysis",
    description: "Real-time on-chain analysis powered by Alchemy to evaluate wallet reputation.",
    icon: Search,
    color: "#c8ff00",
  },
  {
    title: "Soulbound NFTs",
    description: "Non-transferable credentials that prove your on-chain reputation forever.",
    icon: Shield,
    color: "#a78bfa",
  },
  {
    title: "PRD Generator",
    description: "Transform your ideas into detailed Product Requirements Documents with AI.",
    icon: FileText,
    color: "#c8ff00",
  },
  {
    title: "Research Agent",
    description: "AI-powered research assistant that provides cited sources and insights.",
    icon: Search,
    color: "#f472b6",
  },
  {
    title: "Smart Contract Creator",
    description: "Generate Solidity smart contracts from natural language descriptions.",
    icon: Code,
    color: "#fbbf24",
  },
  {
    title: "x402 Payments",
    description: "Seamless crypto payments for premium services using the x402 protocol.",
    icon: Wallet,
    color: "#34d399",
  },
];

const testimonials = [
  {
    name: "Alex Chen",
    role: "DeFi Developer",
    content: "CredPass transformed how I access AI tools. My wallet history finally means something beyond just holding tokens.",
    avatar: "AC",
  },
  {
    name: "Sarah Miller",
    role: "Product Manager",
    content: "The PRD Generator saved me hours of work. Getting Elite tier with my trading history was a nice bonus.",
    avatar: "SM",
  },
  {
    name: "Marcus Johnson",
    role: "Smart Contract Auditor",
    content: "Finally, a reputation system that's actually based on real on-chain activity. The soulbound NFTs are genius.",
    avatar: "MJ",
  },
];

const tiers = [
  {
    name: "Verified",
    description: "For newcomers to Web3",
    requirements: ["Wallet age 7+ days", "5+ transactions"],
    features: ["PRD Generator access", "Basic support", "Community Discord"],
    color: "#c8ff00",
  },
  {
    name: "Trusted",
    description: "For active DeFi users",
    requirements: ["Wallet age 30+ days", "20+ transactions"],
    features: ["Everything in Verified", "Research Agent access", "Priority support", "API access"],
    color: "#a78bfa",
  },
  {
    name: "Elite",
    description: "For power users",
    requirements: ["Wallet age 90+ days", "50+ transactions"],
    features: ["Everything in Trusted", "Smart Contract Creator", "Dedicated support", "Early access to features"],
    color: "#fbbf24",
  },
];

const faqs = [
  {
    question: "What is a soulbound NFT?",
    answer: "A soulbound NFT is a non-transferable token that's permanently linked to your wallet. It serves as proof of your on-chain reputation and cannot be sold or transferred.",
  },
  {
    question: "How is my tier calculated?",
    answer: "Your tier is determined by your wallet's age (when it made its first transaction) and total transaction count. Higher activity over longer periods earns higher tiers.",
  },
  {
    question: "Do I need to pay for credentials?",
    answer: "Credentials are free to mint! You only pay the gas fee on Sepolia testnet. AI services may have usage-based fees via x402 payments.",
  },
  {
    question: "Can I upgrade my tier?",
    answer: "Yes! As your wallet activity increases over time, you can mint a new credential at a higher tier. Your previous credential remains as a record of your journey.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative overflow-x-clip overflow-y-visible">
        {/* Background gradient */}
        <div className="absolute inset-0 hero-gradient pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full pt-24 pb-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[500px]">
            {/* Left: Content */}
            <div className="animate-fade-in py-8">
              <div className="badge badge-primary mb-6">
                <span className="w-2 h-2 rounded-full bg-[#c8ff00] animate-pulse-dot" />
                Live on Sepolia Testnet
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 tracking-tight">
                Unlock AI services
                <br />
                <span className="text-[#9ca3af]">with your wallet</span>
              </h1>

              <p className="text-lg text-[#9ca3af] mb-8 max-w-lg leading-relaxed">
                CredPass analyzes your on-chain activity and issues soulbound NFT credentials
                that gate access to powerful AI-powered services. No KYC required.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 bg-[#c8ff00] text-black font-semibold px-6 py-3 rounded-xl hover:bg-[#d9ff33] transition-all"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 border border-[#1f1f1f] text-white font-medium px-6 py-3 rounded-xl hover:border-[#333] hover:bg-[#111] transition-all"
                >
                  View Services
                </Link>
              </div>

              <div className="flex items-center gap-8 text-sm text-[#6b7280]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#c8ff00]/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#c8ff00]" />
                  </div>
                  <span>No gas to analyze</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#c8ff00]/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#c8ff00]" />
                  </div>
                  <span>Soulbound NFTs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#c8ff00]/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#c8ff00]" />
                  </div>
                  <span>x402 Payments</span>
                </div>
              </div>
            </div>

            {/* Right: 3D Spline Scene */}
            <div className="relative h-[400px] lg:h-[450px] w-full lg:w-[115%] animate-fade-in animate-delay-200">
              <SplineScene
                scene="/scene.splinecode"
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Chain Carousel Section */}
      <ChainCarousel
        title="Multi-Chain Analysis"
        subtitle="We scan your wallet activity across 20+ EVM-compatible blockchains to build your complete on-chain reputation."
        badgeText="Supported Chains"
        showCta={false}
      />

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 border-t border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#c8ff00] text-sm font-medium mb-4 uppercase tracking-wider">How it works</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Three steps to unlock
            </h2>
            <p className="text-[#9ca3af] max-w-xl mx-auto">
              From wallet connection to AI service access in under 2 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="card p-8 relative group">
                <span className="absolute top-6 right-6 text-6xl font-bold text-[#1f1f1f] group-hover:text-[#2a2a2a] transition-colors">
                  {item.step}
                </span>
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#c8ff00]/10 flex items-center justify-center mb-6">
                    {index === 0 && <Wallet className="w-6 h-6 text-[#c8ff00]" />}
                    {index === 1 && <Shield className="w-6 h-6 text-[#c8ff00]" />}
                    {index === 2 && <Zap className="w-6 h-6 text-[#c8ff00]" />}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">{item.title}</h3>
                  <p className="text-[#9ca3af] leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 border-t border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#c8ff00] text-sm font-medium mb-4 uppercase tracking-wider">Features</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Everything you need
            </h2>
            <p className="text-[#9ca3af] max-w-xl mx-auto">
              Powerful tools to leverage your on-chain reputation
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="relative rounded-[1.25rem] border border-[#1f1f1f] p-2 group">
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={3}
                />
                <div className="relative flex flex-col h-full bg-[#0a0a0a] rounded-xl overflow-hidden">
                  {/* Feature icon */}
                  <div className="h-40 flex items-center justify-center">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${feature.color}20` }}
                    >
                      <feature.icon className="w-8 h-8" style={{ color: feature.color }} />
                    </div>
                  </div>
                  <div className="p-4 pt-0">
                    <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                    <p className="text-sm text-[#9ca3af]">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Designed For Section */}
      <section className="py-24 border-t border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#c8ff00] text-sm font-medium mb-4 uppercase tracking-wider">Why CredPass</p>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Designed for
                <br />
                Web3 natives
              </h2>
              <p className="text-[#9ca3af] text-lg mb-8 leading-relaxed">
                Your wallet history tells a story. CredPass reads that story and converts it into
                verifiable credentials that unlock premium AI services. No identity verification,
                no credit checks just pure on-chain reputation.
              </p>

              <div className="space-y-4">
                {[
                  "Fully decentralized credential system",
                  "Non-transferable soulbound NFTs",
                  "Privacy-preserving wallet analysis",
                  "Instant tier calculation",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#c8ff00]/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-[#c8ff00]" />
                    </div>
                    <span className="text-white">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="card p-6 bg-[#0d0d0d] hover:bg-[#141414] transition-colors">
                <Wallet className="w-8 h-8 text-[#c8ff00] mb-4" />
                <h3 className="font-semibold text-white mb-2">Wallet-First</h3>
                <p className="text-sm text-[#9ca3af]">Your wallet is your identity. No email or password needed.</p>
              </div>
              <div className="card p-6 bg-[#0d0d0d] hover:bg-[#141414] transition-colors">
                <Shield className="w-8 h-8 text-[#a78bfa] mb-4" />
                <h3 className="font-semibold text-white mb-2">Soulbound</h3>
                <p className="text-sm text-[#9ca3af]">Credentials are permanently linked to your wallet.</p>
              </div>
              <div className="card p-6 bg-[#0d0d0d] hover:bg-[#141414] transition-colors">
                <Zap className="w-8 h-8 text-[#fbbf24] mb-4" />
                <h3 className="font-semibold text-white mb-2">Instant Access</h3>
                <p className="text-sm text-[#9ca3af]">Mint and access services in under 2 minutes.</p>
              </div>
              <div className="card p-6 bg-[#0d0d0d] hover:bg-[#141414] transition-colors">
                <Star className="w-8 h-8 text-[#f472b6] mb-4" />
                <h3 className="font-semibold text-white mb-2">Upgradeable</h3>
                <p className="text-sm text-[#9ca3af]">Your tier grows with your on-chain activity.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 border-t border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#c8ff00] text-sm font-medium mb-4 uppercase tracking-wider">Testimonials</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Loved by builders
            </h2>
            <p className="text-[#9ca3af] max-w-xl mx-auto">
              See what developers and product managers are saying about CredPass
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="testimonial-card">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#fbbf24] text-[#fbbf24]" />
                  ))}
                </div>
                <p className="text-white mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="avatar">{testimonial.avatar}</div>
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-[#6b7280]">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers Section with Scroll Animation */}
      <section id="tiers" className="border-t border-[#1f1f1f]">
        <ContainerScroll
          titleComponent={
            <div className="text-center mb-8">
              <p className="text-[#c8ff00] text-sm font-medium mb-4 uppercase tracking-wider">Tiers</p>
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">
                Credential tiers
              </h2>
              <p className="text-[#9ca3af] max-w-xl mx-auto">
                Your tier is determined by your wallet activity. Higher tiers unlock more services.
              </p>
            </div>
          }
        >
          <div className="grid md:grid-cols-3 gap-6 h-full p-4 md:p-6 bg-black rounded-2xl">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="card p-6 md:p-8 flex flex-col h-full"
              >
                <h3 className="text-2xl font-bold mb-2" style={{ color: tier.color }}>{tier.name}</h3>
                <p className="text-[#6b7280] text-sm mb-6">{tier.description}</p>

                <div className="mb-6 pb-6 border-b border-[#1f1f1f]">
                  <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-3">Requirements</p>
                  {tier.requirements.map((req) => (
                    <div key={req} className="flex items-center gap-2 text-sm text-[#9ca3af] mb-2">
                      <Check className="w-4 h-4 text-[#6b7280]" />
                      {req}
                    </div>
                  ))}
                </div>

                <div className="space-y-3 flex-1">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-white">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tier.color}15` }}>
                        <Check className="w-3 h-3" style={{ color: tier.color }} />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

                <Link
                  href="/analyze"
                  className="block text-center py-3 mt-6 rounded-xl font-semibold transition-all border border-[#1f1f1f] text-white hover:border-[#333] hover:bg-[#111]"
                >
                  Check Eligibility
                </Link>
              </div>
            ))}
          </div>
        </ContainerScroll>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 border-t border-[#1f1f1f]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#c8ff00] text-sm font-medium mb-4 uppercase tracking-wider">FAQ</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Common questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group card p-6 cursor-pointer">
                <summary className="flex items-center justify-between list-none">
                  <span className="font-semibold text-white pr-4">{faq.question}</span>
                  <ChevronDown className="w-5 h-5 text-[#6b7280] group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <p className="text-[#9ca3af] mt-4 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-[#1f1f1f]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="card p-12 text-center relative overflow-hidden bg-[#0d0d0d]">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#c8ff00]/5 to-transparent pointer-events-none" />

            <div className="relative">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to unlock your potential?
              </h2>
              <p className="text-[#9ca3af] mb-8 max-w-lg mx-auto">
                Connect your wallet and discover your eligible tier.
                The entire process takes less than 2 minutes.
              </p>
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 bg-[#c8ff00] text-black font-semibold px-8 py-4 rounded-xl hover:bg-[#d9ff33] transition-all"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#c8ff00] flex items-center justify-center">
                  <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">CredPass</span>
              </div>
              <p className="text-[#6b7280] max-w-sm">
                Unlock AI services with your on-chain reputation. Built for Web3 natives.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-[#6b7280]">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#tiers" className="hover:text-white transition-colors">Tiers</Link></li>
                <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-[#6b7280]">
                <li><a href="https://portal.thirdweb.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Thirdweb Docs</a></li>
                <li><a href="https://book.getfoundry.sh/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Foundry Book</a></li>
                <li><a href="https://docs.alchemy.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Alchemy Docs</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#1f1f1f] gap-4">
            <p className="text-sm text-[#6b7280]">
              Deployed on Sepolia Testnet.
            </p>
            <p className="text-sm text-[#6b7280]">
              &copy; 2024 CredPass. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
