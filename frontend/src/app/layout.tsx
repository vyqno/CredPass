import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "CredPass - Credential NFTs for AI Services",
  description:
    "A wallet-based credibility system that analyzes on-chain activity and issues soulbound NFT credentials to gate access to AI-powered services.",
  keywords: ["Web3", "NFT", "Credentials", "Ethereum", "AI Services", "DeFi", "Soulbound"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
