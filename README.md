<div align="center">

# CredPass
### On-Chain Reputation for the AI Era

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Network](https://img.shields.io/badge/Network-Sepolia-blue)](https://sepolia.etherscan.io/)
[![Framework](https://img.shields.io/badge/Framework-Next.js%2015-black)](https://nextjs.org/)
[![Smart Contract](https://img.shields.io/badge/Solidity-0.8.24-363636)](https://soliditylang.org/)

<br />

<!-- REPLACE WITH YOUR PROJECT DEMO GIF -->
<!-- <img src="public/demo.gif" alt="CredPass Demo" width="800" style="border-radius: 10px; box-shadow: 0 0 20px rgba(200, 255, 0, 0.2);" /> -->

<p align="center">
  <b>Wallet Analysis</b> • <b>Soulbound Credentials</b> • <b>AI Services</b>
</p>

</div>

---

## ⚡ Overview

**CredPass** transforms on-chain activity into utility. We analyze wallet history across 20+ EVM chains to issue **Soulbound NFT Credentials** that gate access to premium AI tools.

From **Connection** to **Credential** to **Service** in under 2 minutes. No KYC. Just Code.

<table>
  <tr>
    <td width="33%" align="center">
      <h3>🔍 Analyze</h3>
      <p>Multi-chain scan via Alchemy</p>
    </td>
    <td width="33%" align="center">
      <h3>🛡️ Mint</h3>
      <p>Receive Soulbound NFT</p>
    </td>
    <td width="33%" align="center">
      <h3>🔓 Access</h3>
      <p>Unlock AI Agents</p>
    </td>
  </tr>
</table>

## 💎 Credential Tiers

Your reputation level is determined by wallet age and transaction volume.

| Tier | Badge | Requirements | Unlocked Services | Price |
| :--- | :---: | :--- | :--- | :--- |
| **Verified** | 🟢 | 7+ days, 5+ txs | **PRD Generator** | $0.05 / req |
| **Trusted** | 🟣 | 30+ days, 20+ txs | + **Research Agent** | $0.03 / req |
| **Elite** | 🟡 | 90+ days, 50+ txs | + **Contract Creator** | $0.01 / req |

## 🛠 Tech Stack

### Frontend & App
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Visuals**: [Spline 3D](https://spline.design/), [Lucide Icons](https://lucide.dev/)
- **Web3**: [Thirdweb SDK v5](https://thirdweb.com/), [viem](https://viem.sh/)

### Blockchain & AI
- **Contracts**: Solidity 0.8.24, Foundry, OpenZeppelin
- **Security**: EIP-712 Signatures, Soulbound (Non-transferable) logic
- **Payments**: x402 Protocol Implementation
- **Data**: Alchemy Multi-Chain APIs
- **AI Models**: Groq (Llama 3.3), Perplexity, ChainGPT

### 1. Clone & Install
```bash
git clone https://github.com/vyqno/CredPass.git
cd CredPass

# Frontend
cd frontend
pnpm install
```

## 📂 Project Structure

```bash
CredPass/
├── 📱 frontend/              # Next.js 15 Application
│   ├── src/
│   │   ├── app/             # App Router & API Routes
│   │   ├── components/      # UI, 3D Scenes, & Providers
│   │   └── lib/             # Web3 Config & Utilities
│   └── public/              # Static Assets & Animations
│
└── ⛓️ smart-contracts/       # Foundry Development Environment
    ├── src/                 # Solidity Contracts (CredentialNFT.sol)
    ├── script/              # Deployment & Verification Scripts
    ├── test/                # Unit, Fuzz, & Integration Tests
    └── foundry.toml         # Framework Configuration
```

## 🧠 Smart Contracts

The heart of CredPass is the `CredentialNFT` contract, designed for security and automation.

> **See full details in [smart-contracts/README.md](./smart-contracts/README.md)**

- **Soulbound Architecture**: Credentials are non-transferable, ensuring reputation stays with the original wallet.
- **EIP-712 Verification**: Uses typed data signing for secure, gas-efficient minting and renewal.
- **Tiered Access**:
  - `Verified` (Level 0): Basic access
  - `Trusted` (Level 1): Intermediate tools
  - `Elite` (Level 2): Advanced AI capabilities
- **Automation Ready**: Compatible with Chainlink Automation for batch expiry checks and renewals.

## 🧪 Testing & Security

We maintain rigorous testing standards with **100% passing tests** across all suites.

| Category | Tests | Description |
| :--- | :---: | :--- |
| **Unit** | 63 | Individual function behavior & edge cases |
| **Integration** | 7 | Multi-step user flows (Mint → Renew → Access) |
| **Fuzzing** | 10 | Randomized inputs to catch boundary errors |
| **Invariant** | 12 | Protocol guarantees that must always hold true |
| **Security** | 21 | Attack vectors, reentrancy, and permission checks |
| **Total** | **123** | **All Passing** |

### 2. Environment Setup

Create `frontend/.env.local` and paste the following configuration:

```ini
# ------------------------------
# THIRDWEB CONFIGURATION
# ------------------------------
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here

# ------------------------------
# DATA & AI PROVIDERS
# ------------------------------
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
GROQ_API_KEY=your_groq_key

# ------------------------------
# CREDENTIALS CONTRACT (SEPOLIA)
# ------------------------------
NEXT_PUBLIC_CREDENTIAL_NFT_ADDRESS=0x09f9e2C32eC093C65d0E900DaA3d22da9af3d05F
NEXT_PUBLIC_CHAIN_ID=11155111
```

### 3. Run Locally
```bash
pnpm dev
```
Visit `http://localhost:3000` to start building your reputation.

## 📜 Smart Contracts

Deployed on **Sepolia Testnet**:

| Contract | Address |
| :--- | :--- |
| **CredentialNFT** | [`0x09f9e2C32eC093C65d0E900DaA3d22da9af3d05F`](https://sepolia.etherscan.io/address/0x09f9e2C32eC093C65d0E900DaA3d22da9af3d05F) |
| **Automation** | [`0x91c42Cc38904E5fB3Ee02626CC60352860E63F22`](https://sepolia.etherscan.io/address/0x91c42Cc38904E5fB3Ee02626CC60352860E63F22) |

### Key Features
- **Soulbound**: Overrides `_update` to prevent transfers.
- **EIP-712**: Verifies off-chain data (tier/expiry) via typed signatures.
- **Renewable**: Credentials have expiry dates (default 7 days) and must be renewed based on continued activity.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingChains`)
3. Commit your changes (`git commit -m 'Add some AmazingChains'`)
4. Push to the branch (`git push origin feature/AmazingChains`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <br />
  <p>Built with ❤️ by <b>vyqno</b></p>
  <p>
    <a href="https://x.com/vyqno">X (Twitter)</a> •
    <a href="https://www.linkedin.com/in/0xhitesh/">LinkedIn</a> •
    <a href="https://github.com/vyqno">GitHub</a>
  </p>
</div>
