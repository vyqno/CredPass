# CredPass Smart Contracts

Soulbound credential NFT system with tiered access control for AI services. Built with Foundry and designed for deployment via thirdweb CLI.

## Overview

CredPass provides a reputation-based access control system where users earn credential NFTs based on their on-chain activity. These soulbound (non-transferable) NFTs unlock access to tiered AI services.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SMART CONTRACTS                                  │
│                                                                          │
│  ┌───────────────────────────┐      ┌─────────────────────────────────┐│
│  │     CredentialNFT         │      │      AutomationConsumer         ││
│  │                           │      │                                 ││
│  │  ┌─────────────────────┐  │      │  ┌───────────────────────────┐ ││
│  │  │ Soulbound ERC721    │  │◄─────│  │ Chainlink Automation      │ ││
│  │  │ (Non-transferable)  │  │      │  │ Compatible Interface      │ ││
│  │  └─────────────────────┘  │      │  └───────────────────────────┘ ││
│  │                           │      │                                 ││
│  │  ┌─────────────────────┐  │      │  ┌───────────────────────────┐ ││
│  │  │ 3-Tier System       │  │      │  │ Watchlist Management      │ ││
│  │  │ Verified → Elite    │  │      │  │ (10,000 max addresses)    │ ││
│  │  └─────────────────────┘  │      │  └───────────────────────────┘ ││
│  │                           │      │                                 ││
│  │  ┌─────────────────────┐  │      │  ┌───────────────────────────┐ ││
│  │  │ EIP-712 Signatures  │  │      │  │ Batch Renewal Queue       │ ││
│  │  │ (Replay-protected)  │  │      │  │ (Gas-limited processing)  │ ││
│  │  └─────────────────────┘  │      │  └───────────────────────────┘ ││
│  │                           │      │                                 ││
│  │  ┌─────────────────────┐  │      │  ┌───────────────────────────┐ ││
│  │  │ Time-based Expiry   │  │      │  │ Configurable Thresholds   │ ││
│  │  │ (1 day - 2 years)   │  │      │  │ (Renewal timing)          │ ││
│  │  └─────────────────────┘  │      │  └───────────────────────────┘ ││
│  └───────────────────────────┘      └─────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Contracts

### CredentialNFT.sol

The core soulbound NFT contract for wallet reputation credentials.

**How it works:**
1. Backend analyzes user's wallet (age, transactions, balance)
2. Backend generates EIP-712 signed attestation with tier and expiry
3. User calls `mint()` with the signature to receive their credential
4. Credential can be renewed before expiry with new signature
5. Owner can revoke credentials if needed

**Features:**
- **Three tiers**: Verified (0), Trusted (1), Elite (2)
- **Soulbound**: Tokens cannot be transferred, only minted and burned
- **Time-bounded expiry**: Credentials expire after set duration (default: 7 days)
- **EIP-712 signatures**: Cryptographic proof from authorized verifier
- **Replay protection**: Incrementing nonces prevent signature reuse
- **Pausable**: Emergency pause capability for admin

**Key Functions:**

| Function | Description | Access |
|----------|-------------|--------|
| `mint(user, tier, expiry, signature)` | Mint new credential with verifier signature | Public |
| `renew(user, newExpiry, signature)` | Extend credential expiry | Public |
| `revoke(user)` | Burn user's credential | Owner |
| `isValid(user, requiredTier)` | Check if user meets tier requirement | View |
| `getCredential(user)` | Get full credential details | View |
| `pause()` / `unpause()` | Emergency controls | Owner |

### AutomationConsumer.sol

Chainlink Automation compatible contract for automated credential renewal.

**How it works:**
1. Owner adds addresses to watchlist for monitoring
2. Chainlink nodes call `checkUpkeep()` periodically
3. When credentials near expiry, backend is notified
4. Backend generates renewal signatures and queues them
5. `performUpkeep()` processes the renewal queue

**Features:**
- **Watchlist management**: Track up to 10,000 addresses
- **Batch processing**: Gas-efficient bulk renewals
- **Configurable thresholds**: When to trigger renewal (default: 2 days before expiry)
- **Rate limiting**: Minimum interval between upkeeps (default: 1 hour)
- **Pausable**: Emergency pause for automation

**Key Functions:**

| Function | Description | Access |
|----------|-------------|--------|
| `checkUpkeep(checkData)` | Chainlink calls to check if work needed | Public |
| `performUpkeep(performData)` | Process pending renewals | Public |
| `addToWatchlist(user)` | Add address to monitoring | Owner |
| `queueRenewals(renewals[])` | Queue signed renewals | Owner |
| `setConfig(threshold, checkSize, renewSize)` | Configure batch sizes | Owner |

## Test Coverage

```
┌─────────────────────────────────────┬──────────────────┬──────────────────┐
│ Contract                            │ Line Coverage    │ Branch Coverage  │
├─────────────────────────────────────┼──────────────────┼──────────────────┤
│ src/CredentialNFT.sol               │ 90.48%           │ 72.22%           │
├─────────────────────────────────────┼──────────────────┼──────────────────┤
│ src/AutomationConsumer.sol          │ 93.22%           │ 80.00%           │
└─────────────────────────────────────┴──────────────────┴──────────────────┘
```

## Test Summary

**123 tests across 8 test suites - All Passing**

```
┌──────────────────────────────┬────────┬────────┬─────────┐
│ Test Suite                   │ Passed │ Failed │ Skipped │
├──────────────────────────────┼────────┼────────┼─────────┤
│ CredentialNFTBasicTest       │ 6      │ 0      │ 0       │
│ CredentialNFTTest            │ 36     │ 0      │ 0       │
│ CredentialNFTIntegrationTest │ 7      │ 0      │ 0       │
│ CredentialNFTFuzzTest        │ 10     │ 0      │ 0       │
│ CredentialNFTInvariantTest   │ 12     │ 0      │ 0       │
│ AutomationConsumerTest       │ 27     │ 0      │ 0       │
│ SecurityTest                 │ 21     │ 0      │ 0       │
│ EndToEndTest                 │ 4      │ 0      │ 0       │
├──────────────────────────────┼────────┼────────┼─────────┤
│ Total                        │ 123    │ 0      │ 0       │
└──────────────────────────────┴────────┴────────┴─────────┘
```

### Test Categories

| Category | Purpose | Tests |
|----------|---------|-------|
| **Unit** | Individual function behavior | 36 |
| **Integration** | Multi-step user flows | 7 |
| **Fuzz** | Randomized property testing | 10 |
| **Invariant** | Protocol guarantees that always hold | 12 |
| **Security** | Attack vectors and edge cases | 21 |
| **E2E** | Complete user journeys | 4 |

## Development

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Clone and install dependencies
cd smart-contracts
forge install
```

### Build

```bash
forge build
```

### Test

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test file
forge test --match-path test/unit/CredentialNFTTest.t.sol

# Run specific test
forge test --match-test test_Mint_SuccessfullyMintsCredential

# Gas report
forge test --gas-report

# Coverage report
forge coverage
```

### Test Structure

```
test/
├── CredentialNFT.t.sol              # Basic smoke tests
├── unit/
│   ├── CredentialNFTTest.t.sol      # 36 unit tests
│   └── AutomationConsumerTest.t.sol # 27 unit tests
├── integration/
│   └── CredentialNFTIntegration.t.sol  # 7 integration tests
├── fuzz/
│   └── CredentialNFTFuzz.t.sol      # 10 fuzz tests
├── invariant/
│   └── CredentialNFTInvariant.t.sol # 12 invariant tests
├── security/
│   └── SecurityTest.t.sol           # 21 security tests
└── e2e/
    └── EndToEndTest.t.sol           # 4 E2E tests
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Sepolia

```bash
# Set environment variables
export AGENT_WALLET_ADDRESS=0x...
export PRIVATE_KEY=0x...
export SEPOLIA_RPC_URL=https://...

# Deploy with Forge
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Or deploy with thirdweb
npx thirdweb deploy -c CredentialNFT
```

## EIP-712 Signature Format

### Mint Signature

```javascript
const domain = {
  name: "CredPass",
  version: "1",
  chainId: 11155111,  // Sepolia
  verifyingContract: CREDENTIAL_NFT_ADDRESS
};

const types = {
  Mint: [
    { name: "user", type: "address" },
    { name: "tier", type: "uint8" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ]
};

const value = {
  user: userAddress,
  tier: 0,  // 0=Verified, 1=Trusted, 2=Elite
  expiry: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,  // 7 days
  nonce: await credential.getNonce(userAddress)
};

const signature = await signer._signTypedData(domain, types, value);
```

### Renew Signature

```javascript
const types = {
  Renew: [
    { name: "user", type: "address" },
    { name: "newExpiry", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ]
};
```

## Tier Requirements

| Tier | Wallet Age | Transactions | Services Unlocked |
|------|------------|--------------|-------------------|
| Verified | ≥7 days | ≥5 | PRD Generator |
| Trusted | ≥30 days | ≥20 | + Research Agent |
| Elite | ≥90 days | ≥50 | + Contract Creator |

## Security Features

| Feature | Implementation | Protection Against |
|---------|---------------|-------------------|
| **Soulbound** | Override `_update()` to block transfers | Credential trading/theft |
| **Replay Protection** | Incrementing nonces per user | Signature reuse attacks |
| **EIP-712 Signatures** | Typed data with domain separator | Phishing, cross-chain replay |
| **Access Control** | OpenZeppelin Ownable | Unauthorized admin actions |
| **Pausable** | OpenZeppelin Pausable | Emergency response |
| **ReentrancyGuard** | OpenZeppelin ReentrancyGuard | Reentrancy attacks |
| **CEI Pattern** | Checks-Effects-Interactions | State manipulation |
| **Expiry Bounds** | Min 1 day, max 2 years | Invalid credential lifetimes |

## Security Tests Covered

- Replay attack prevention
- Wrong signer rejection
- Signature/user mismatch
- Signature/tier mismatch
- Signature/expiry mismatch
- Nonce manipulation
- Unauthorized verifier change
- Unauthorized pause/unpause
- Unauthorized revoke
- Direct transfer blocked
- Safe transfer blocked
- Approval doesn't enable transfer
- Past expiry rejected
- Too far future expiry rejected
- Too short expiry rejected
- Minting blocked when paused
- Renewal blocked when paused
- Zero address validation

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_EXPIRY_DURATION` | 1 day | Minimum credential validity |
| `MAX_EXPIRY_DURATION` | 365 days | Maximum credential validity |
| `MAX_FUTURE_EXPIRY` | 730 days | Maximum allowed expiry timestamp |
| `DEFAULT_RENEWAL_THRESHOLD` | 2 days | When to trigger renewal |
| `MAX_WATCHLIST_SIZE` | 10,000 | Maximum tracked addresses |

## Gas Optimization

| Operation | Gas Cost (approx) |
|-----------|-------------------|
| `mint` (new user) | ~225,000 |
| `mint` (update existing) | ~170,000 |
| `renew` | ~50,000 |
| `revoke` | ~70,000 |
| `isValid` | ~5,000 |

## License

MIT

## Connect

Built by [@vyqno](https://github.com/vyqno)

Follow on X: [@vyqno](https://x.com/vyqno)
