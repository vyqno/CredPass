# CredPass Smart Contract Deployment Guide

## Overview

This guide covers deploying CredPass smart contracts to Sepolia testnet using either Forge scripts or thirdweb CLI.

## Contracts

| Contract | Description |
|----------|-------------|
| `CredentialNFT` | Soulbound NFT with tiered credentials (Verified, Trusted, Elite) |
| `AutomationConsumer` | Chainlink Automation compatible contract for batch renewals |

## Prerequisites

1. **Environment Setup**
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
cd smart-contracts
forge install
```

2. **Environment Variables**
Create `.env` file:
```env
# Required
AGENT_WALLET_ADDRESS=0xd3C102222707FE5c51d0c3845F4aEEd3185b9931
PRIVATE_KEY=0x...your_deployer_private_key...

# For Verification (optional)
ETHERSCAN_API_KEY=your_etherscan_api_key

# RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
```

## Deployment Options

### Option 1: Forge Scripts (Recommended)

#### Deploy All Contracts
```bash
# Load environment variables
source .env

# Deploy to Sepolia
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

#### Deploy Only CredentialNFT
```bash
forge script script/DeployAll.s.sol:DeployCredentialOnly \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

#### Deploy Only AutomationConsumer
```bash
# Set CREDENTIAL_NFT_ADDRESS first
export CREDENTIAL_NFT_ADDRESS=0x...deployed_credential_address...

forge script script/DeployAll.s.sol:DeployAutomationOnly \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

### Option 2: Thirdweb CLI

#### Install thirdweb CLI
```bash
npm install -g @thirdweb-dev/cli
```

#### Deploy via thirdweb
```bash
cd smart-contracts

# Deploy CredentialNFT
npx thirdweb deploy -c CredentialNFT

# Deploy AutomationConsumer
npx thirdweb deploy -c AutomationConsumer
```

This will open a browser UI where you can:
1. Connect your wallet
2. Set constructor parameters
3. Deploy to Sepolia
4. Get verified contract automatically

### Option 3: Local Testing (Anvil)

```bash
# Terminal 1: Start local node
anvil

# Terminal 2: Deploy
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url http://localhost:8545 \
  --broadcast
```

## Post-Deployment

### 1. Verify Contracts (if not using thirdweb)
```bash
forge verify-contract \
  --chain-id 11155111 \
  --compiler-version v0.8.24 \
  <CONTRACT_ADDRESS> \
  src/CredentialNFT.sol:CredentialNFT \
  --constructor-args $(cast abi-encode "constructor(address)" $AGENT_WALLET_ADDRESS)
```

### 2. Configure Frontend
Update `frontend/.env.local`:
```env
NEXT_PUBLIC_CREDENTIAL_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_AUTOMATION_CONTRACT_ADDRESS=0x...
```

### 3. Configure Convex Backend
Add to Convex environment variables:
```
CREDENTIAL_CONTRACT_ADDRESS=0x...
AGENT_WALLET_PRIVATE_KEY=0x...
```

### 4. Setup Chainlink Automation

1. Go to [Chainlink Automation](https://automation.chain.link/)
2. Register new Upkeep
3. Select "Custom Logic" trigger
4. Enter AutomationConsumer address
5. Fund with LINK tokens
6. Set check interval (recommended: 3600 seconds = 1 hour)

## Testing

### Run All Tests
```bash
forge test -vv
```

### Run Specific Test Suite
```bash
# Unit tests
forge test --match-path test/unit/*.sol -vv

# Integration tests
forge test --match-path test/integration/*.sol -vv

# Security tests
forge test --match-path test/security/*.sol -vv

# E2E tests
forge test --match-path test/e2e/*.sol -vv

# Fuzz tests
forge test --match-path test/fuzz/*.sol -vv

# Invariant tests
forge test --match-path test/invariant/*.sol -vv
```

### Gas Report
```bash
forge test --gas-report
```

### Test Coverage
```bash
forge coverage
```

## Contract Addresses (Update After Deployment)

| Network | CredentialNFT | AutomationConsumer |
|---------|---------------|-------------------|
| Sepolia | `TBD` | `TBD` |
| Mainnet | `TBD` | `TBD` |

## Security Notes

1. **Verifier Key Security**: The `AGENT_WALLET_PRIVATE_KEY` should be stored securely (e.g., AWS Secrets Manager, Convex environment variables)

2. **Owner Privileges**: The contract owner can:
   - Update verifier address
   - Pause/unpause the contract
   - Revoke credentials

3. **Signature Replay Protection**: Each mint/renew uses incrementing nonces

4. **Soulbound**: NFTs cannot be transferred, only minted and burned

## Troubleshooting

### "Invalid signature" Error
- Ensure verifier address matches the signer
- Check nonce is current (call `getNonce(address)`)
- Verify EIP-712 domain matches contract

### "Expiry must be future" Error
- Expiry must be > `block.timestamp`
- Expiry must be >= `block.timestamp + MIN_EXPIRY_DURATION` (1 day)
- Expiry must be <= `block.timestamp + MAX_FUTURE_EXPIRY` (730 days)

### Deployment Fails
- Check RPC URL is correct
- Ensure sufficient ETH for gas
- Verify private key has correct format (with 0x prefix)

---
*Last updated: 2026-01-26*
