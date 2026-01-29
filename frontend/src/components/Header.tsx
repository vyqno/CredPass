"use client";

import Link from "next/link";
import { ConnectButton } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { client, sepolia } from "@/lib/thirdweb";

// EVM-only wallets with 0x addresses - excludes Solana wallets like Phantom, Backpack
const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("io.zerion.wallet"),
  createWallet("com.okex.wallet"),
  createWallet("embedded"),
];

export function Header() {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#111111] border border-[#222222] shadow-2xl shadow-black/50">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 pl-3 pr-4">
          <div className="w-6 h-6 rounded-md bg-[#c8ff00] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-base font-bold text-white">CredPass</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center">
          <Link href="/" className="px-3 py-1.5 text-sm text-[#888888] hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/dashboard" className="px-3 py-1.5 text-sm text-[#888888] hover:text-white transition-colors">
            Services
          </Link>
          <Link href="/analyze" className="px-3 py-1.5 text-sm text-[#888888] hover:text-white transition-colors">
            Analyze
          </Link>
        </nav>

        {/* Connect Button */}
        <div className="pl-2">
          <ConnectButton
            client={client}
            chain={sepolia}
            wallets={wallets}
            theme="dark"

            connectButton={{
              label: "Connect",
              style: {
                background: "#c8ff00",
                color: "#000000",
                border: "none",
                borderRadius: "9999px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              },
            }}
            detailsButton={{
              style: {
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "9999px",
                padding: "8px 14px",
                color: "#ffffff",
                fontSize: "13px",
              },
            }}
            connectModal={{
              showThirdwebBranding: false,
            }}
          />
        </div>
      </div>
    </header>
  );
}
