// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CredentialNFT} from "../../src/CredentialNFT.sol";
import {AutomationConsumer} from "../../src/AutomationConsumer.sol";

/**
 * @title EndToEndTest
 * @notice Complete end-to-end tests simulating full user journeys
 * @dev Tests the entire system flow from wallet analysis to service access
 *
 * Simulates the complete user journey:
 * 1. Wallet Analysis (simulated) → Eligibility Check
 * 2. Attestation Generation → Mint Transaction
 * 3. Service Access Validation
 * 4. Credential Expiry → Renewal
 * 5. Automated Renewal via Chainlink
 */
contract EndToEndTest is Test {
    CredentialNFT public credential;
    AutomationConsumer public automation;

    address public owner;
    address public verifier;
    uint256 public verifierPrivateKey;

    // Simulated users with different wallet metrics
    address public newUser; // <7 days, <5 tx - No tier
    address public verifiedUser; // ≥7 days, ≥5 tx - Verified
    address public trustedUser; // ≥30 days, ≥20 tx - Trusted
    address public eliteUser; // ≥90 days, ≥50 tx - Elite

    // Service tier requirements
    uint8 constant VERIFIED_TIER = 0;
    uint8 constant TRUSTED_TIER = 1;
    uint8 constant ELITE_TIER = 2;

    function setUp() public {
        owner = makeAddr("owner");
        verifierPrivateKey = 0xA11CE;
        verifier = vm.addr(verifierPrivateKey);

        newUser = makeAddr("newUser");
        verifiedUser = makeAddr("verifiedUser");
        trustedUser = makeAddr("trustedUser");
        eliteUser = makeAddr("eliteUser");

        vm.startPrank(owner);
        credential = new CredentialNFT(verifier);
        automation = new AutomationConsumer(address(credential));
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    COMPLETE USER JOURNEY TESTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Test complete journey for a new user achieving Elite status
     * @dev Simulates: Analysis → Mint → Upgrade → Services → Renewal
     */
    function test_E2E_CompleteEliteUserJourney() public {
        console2.log("=== COMPLETE ELITE USER JOURNEY ===");
        console2.log("");

        // ========== STEP 1: Initial Analysis & Eligibility ==========
        console2.log("STEP 1: Wallet Analysis");
        console2.log("  - Simulating Alchemy API call for wallet metrics");
        console2.log("  - Wallet: ", eliteUser);

        // Simulated metrics (would come from Alchemy in production)
        uint256 walletAgeDays = 120;
        uint256 txCount = 75;
        uint256 uniqueContracts = 30;

        console2.log("  - Wallet Age: ", walletAgeDays, " days");
        console2.log("  - Transaction Count: ", txCount);
        console2.log("  - Unique Contracts: ", uniqueContracts);

        // ========== STEP 2: Eligibility Determination ==========
        console2.log("");
        console2.log("STEP 2: Eligibility Check");

        CredentialNFT.Tier eligibleTier = _determineEligibility(walletAgeDays, txCount);
        assertEq(uint8(eligibleTier), ELITE_TIER, "Should be eligible for Elite");
        console2.log("  - Highest Eligible Tier: Elite");

        // ========== STEP 3: Backend Attestation ==========
        console2.log("");
        console2.log("STEP 3: Backend Attestation Generation");

        uint256 expiry = block.timestamp + 7 days;
        uint256 nonce = credential.getNonce(eliteUser);

        console2.log("  - Generating EIP-712 typed data");
        console2.log("  - User: ", eliteUser);
        console2.log("  - Tier: Elite (2)");
        console2.log("  - Expiry: ", expiry);
        console2.log("  - Nonce: ", nonce);

        bytes memory signature = _generateMintSignature(eliteUser, eligibleTier, expiry, nonce);
        console2.log("  - Signature generated successfully");

        // ========== STEP 4: Mint Transaction ==========
        console2.log("");
        console2.log("STEP 4: Mint Transaction");

        credential.mint(eliteUser, eligibleTier, expiry, signature);

        // Verify mint
        (CredentialNFT.Tier tier, uint256 credExpiry,, bool exists, bool isValid) = credential.getCredential(eliteUser);

        assertTrue(exists, "Credential should exist");
        assertTrue(isValid, "Credential should be valid");
        assertEq(uint8(tier), ELITE_TIER, "Tier should be Elite");
        assertEq(credExpiry, expiry, "Expiry should match");

        console2.log("  - Credential minted successfully");
        console2.log("  - Token ID: ", credential.getTokenId(eliteUser));

        // ========== STEP 5: Service Access Validation ==========
        console2.log("");
        console2.log("STEP 5: Service Access Check");

        // PRD Generator (Verified+) - Should have access
        bool canAccessPRD = credential.isValid(eliteUser, CredentialNFT.Tier.Verified);
        assertTrue(canAccessPRD, "Elite should access PRD Generator");
        console2.log("  - PRD Generator (Verified+): ACCESS GRANTED");

        // Research Agent (Trusted+) - Should have access
        bool canAccessResearch = credential.isValid(eliteUser, CredentialNFT.Tier.Trusted);
        assertTrue(canAccessResearch, "Elite should access Research Agent");
        console2.log("  - Research Agent (Trusted+): ACCESS GRANTED");

        // Contract Creator (Elite) - Should have access
        bool canAccessContract = credential.isValid(eliteUser, CredentialNFT.Tier.Elite);
        assertTrue(canAccessContract, "Elite should access Contract Creator");
        console2.log("  - Contract Creator (Elite): ACCESS GRANTED");

        // ========== STEP 6: Time Passes (Near Expiry) ==========
        console2.log("");
        console2.log("STEP 6: Time Passes (6 days)");

        vm.warp(block.timestamp + 6 days);

        // Still valid but approaching expiry
        assertTrue(credential.isValid(eliteUser, CredentialNFT.Tier.Elite));
        console2.log("  - Credential still valid");
        console2.log("  - Time until expiry: ~1 day");

        // ========== STEP 7: Manual Renewal ==========
        console2.log("");
        console2.log("STEP 7: Manual Renewal");

        uint256 newExpiry = block.timestamp + 7 days;
        uint256 newNonce = credential.getNonce(eliteUser);

        bytes memory renewSig = _generateRenewSignature(eliteUser, newExpiry, newNonce);
        credential.renew(eliteUser, newExpiry, renewSig);

        (, uint256 updatedExpiry,,, bool stillValid) = credential.getCredential(eliteUser);
        assertTrue(stillValid, "Should still be valid after renewal");
        assertEq(updatedExpiry, newExpiry, "Expiry should be updated");

        console2.log("  - Renewed successfully");
        console2.log("  - New expiry: ", newExpiry);

        console2.log("");
        console2.log("=== JOURNEY COMPLETE ===");
    }

    /**
     * @notice Test tier-based service access control
     * @dev Each tier should only access their authorized services
     */
    function test_E2E_TierBasedServiceAccess() public {
        console2.log("=== TIER-BASED SERVICE ACCESS TEST ===");

        // Mint credentials for each tier
        _mintCredential(verifiedUser, CredentialNFT.Tier.Verified, block.timestamp + 7 days);
        _mintCredential(trustedUser, CredentialNFT.Tier.Trusted, block.timestamp + 7 days);
        _mintCredential(eliteUser, CredentialNFT.Tier.Elite, block.timestamp + 7 days);

        // ===== VERIFIED USER =====
        console2.log("");
        console2.log("Verified User Access:");

        // Can access Verified services
        assertTrue(credential.isValid(verifiedUser, CredentialNFT.Tier.Verified));
        console2.log("  - PRD Generator: GRANTED");

        // Cannot access higher tier services
        assertFalse(credential.isValid(verifiedUser, CredentialNFT.Tier.Trusted));
        console2.log("  - Research Agent: DENIED");

        assertFalse(credential.isValid(verifiedUser, CredentialNFT.Tier.Elite));
        console2.log("  - Contract Creator: DENIED");

        // ===== TRUSTED USER =====
        console2.log("");
        console2.log("Trusted User Access:");

        // Can access Verified and Trusted services
        assertTrue(credential.isValid(trustedUser, CredentialNFT.Tier.Verified));
        console2.log("  - PRD Generator: GRANTED");

        assertTrue(credential.isValid(trustedUser, CredentialNFT.Tier.Trusted));
        console2.log("  - Research Agent: GRANTED");

        // Cannot access Elite services
        assertFalse(credential.isValid(trustedUser, CredentialNFT.Tier.Elite));
        console2.log("  - Contract Creator: DENIED");

        // ===== ELITE USER =====
        console2.log("");
        console2.log("Elite User Access:");

        // Can access all services
        assertTrue(credential.isValid(eliteUser, CredentialNFT.Tier.Verified));
        console2.log("  - PRD Generator: GRANTED");

        assertTrue(credential.isValid(eliteUser, CredentialNFT.Tier.Trusted));
        console2.log("  - Research Agent: GRANTED");

        assertTrue(credential.isValid(eliteUser, CredentialNFT.Tier.Elite));
        console2.log("  - Contract Creator: GRANTED");

        // ===== BATCH CHECK =====
        console2.log("");
        console2.log("Batch Validity Check:");

        address[] memory users = new address[](3);
        users[0] = verifiedUser;
        users[1] = trustedUser;
        users[2] = eliteUser;

        bool[] memory eliteAccess = credential.batchIsValid(users, CredentialNFT.Tier.Elite);
        assertFalse(eliteAccess[0]); // Verified
        assertFalse(eliteAccess[1]); // Trusted
        assertTrue(eliteAccess[2]); // Elite

        console2.log("  - Elite tier access: [false, false, true]");
    }

    /**
     * @notice Test automated renewal flow with Chainlink Automation
     * @dev Simulates the Chainlink keeper checking and processing renewals
     */
    function test_E2E_AutomatedRenewalFlow() public {
        console2.log("=== AUTOMATED RENEWAL FLOW ===");

        // ========== Setup: Mint credentials and add to watchlist ==========
        console2.log("");
        console2.log("Setup: Minting credentials and adding to watchlist");

        // Mint credential expiring in 1 day (within renewal threshold)
        uint256 shortExpiry = block.timestamp + 1 days;
        _mintCredential(verifiedUser, CredentialNFT.Tier.Verified, shortExpiry);

        // Mint credential expiring in 30 days (not in renewal threshold)
        uint256 longExpiry = block.timestamp + 30 days;
        _mintCredential(trustedUser, CredentialNFT.Tier.Trusted, longExpiry);

        // Add to watchlist
        vm.startPrank(owner);
        automation.addToWatchlist(verifiedUser);
        automation.addToWatchlist(trustedUser);
        vm.stopPrank();

        console2.log("  - Added ", verifiedUser, " (expiring soon)");
        console2.log("  - Added ", trustedUser, " (not expiring soon)");

        // ========== Step 1: Check which addresses need renewal ==========
        console2.log("");
        console2.log("Step 1: Checking renewal needs");

        (bool needsRenewal1,) = automation.checkRenewalNeeded(verifiedUser);
        (bool needsRenewal2,) = automation.checkRenewalNeeded(trustedUser);

        assertTrue(needsRenewal1, "Verified user should need renewal");
        assertFalse(needsRenewal2, "Trusted user should not need renewal yet");

        console2.log("  - Verified user needs renewal: true");
        console2.log("  - Trusted user needs renewal: false");

        // ========== Step 2: Get expiring addresses ==========
        console2.log("");
        console2.log("Step 2: Getting expiring addresses");

        address[] memory expiring = automation.getExpiringAddresses();
        assertEq(expiring.length, 1);
        assertEq(expiring[0], verifiedUser);

        console2.log("  - Expiring addresses: 1");
        console2.log("  - Address: ", expiring[0]);

        // ========== Step 3: Backend generates renewal attestations ==========
        console2.log("");
        console2.log("Step 3: Backend generates renewal attestations");

        uint256 newExpiry = block.timestamp + 7 days;
        bytes memory renewSig = _generateRenewSignature(verifiedUser, newExpiry, credential.getNonce(verifiedUser));

        AutomationConsumer.PendingRenewal[] memory renewals = new AutomationConsumer.PendingRenewal[](1);
        renewals[0] = AutomationConsumer.PendingRenewal({user: verifiedUser, newExpiry: newExpiry, signature: renewSig});

        vm.prank(owner);
        automation.queueRenewals(renewals);

        console2.log("  - Queued 1 renewal");
        assertEq(automation.getPendingRenewalsCount(), 1);

        // ========== Step 4: Warp past upkeep interval ==========
        console2.log("");
        console2.log("Step 4: Simulating Chainlink upkeep check");

        vm.warp(block.timestamp + automation.upkeepInterval() + 1);

        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        assertTrue(upkeepNeeded, "Upkeep should be needed");
        console2.log("  - Upkeep needed: true");

        // ========== Step 5: Perform upkeep (process renewals) ==========
        console2.log("");
        console2.log("Step 5: Performing upkeep");

        automation.performUpkeep(performData);

        // Verify renewal was processed
        assertEq(automation.getPendingRenewalsCount(), 0, "Pending should be cleared");

        (, uint256 updatedExpiry,,, bool isValid) = credential.getCredential(verifiedUser);
        assertTrue(isValid, "Should still be valid");
        assertEq(updatedExpiry, newExpiry, "Expiry should be updated");

        console2.log("  - Renewal processed successfully");
        console2.log("  - New expiry: ", newExpiry);

        console2.log("");
        console2.log("=== AUTOMATED RENEWAL COMPLETE ===");
    }

    /**
     * @notice Test credential expiry and re-qualification
     * @dev User's credential expires, they no longer have access, then re-mint
     */
    function test_E2E_ExpiryAndRequalification() public {
        console2.log("=== EXPIRY AND REQUALIFICATION ===");

        // ========== Step 1: Mint initial credential ==========
        console2.log("");
        console2.log("Step 1: Initial credential mint");

        uint256 expiry = block.timestamp + 7 days;
        _mintCredential(verifiedUser, CredentialNFT.Tier.Verified, expiry);

        assertTrue(credential.isValid(verifiedUser, CredentialNFT.Tier.Verified));
        console2.log("  - Minted Verified credential");
        console2.log("  - Service access: GRANTED");

        // ========== Step 2: Time passes, credential expires ==========
        console2.log("");
        console2.log("Step 2: Credential expires (8 days pass)");

        vm.warp(block.timestamp + 8 days);

        assertFalse(credential.isValid(verifiedUser, CredentialNFT.Tier.Verified));
        console2.log("  - Service access: DENIED (expired)");

        // ========== Step 3: User re-qualifies with higher tier ==========
        console2.log("");
        console2.log("Step 3: User re-qualifies (improved wallet metrics)");

        // Simulated: User now has better metrics, qualifies for Trusted
        uint256 newExpiry = block.timestamp + 30 days;
        uint256 currentNonce = credential.getNonce(verifiedUser);

        bytes memory sig = _generateMintSignature(verifiedUser, CredentialNFT.Tier.Trusted, newExpiry, currentNonce);

        credential.mint(verifiedUser, CredentialNFT.Tier.Trusted, newExpiry, sig);

        (CredentialNFT.Tier tier,,,, bool isValid) = credential.getCredential(verifiedUser);
        assertTrue(isValid);
        assertEq(uint8(tier), TRUSTED_TIER);

        console2.log("  - Upgraded to Trusted tier");
        console2.log("  - All Verified+ services: GRANTED");
        console2.log("  - All Trusted+ services: GRANTED");

        // Verify still only 1 NFT
        assertEq(credential.balanceOf(verifiedUser), 1);
        console2.log("  - Still only 1 NFT token");

        console2.log("");
        console2.log("=== REQUALIFICATION COMPLETE ===");
    }

    /*//////////////////////////////////////////////////////////////
                         HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _determineEligibility(uint256 walletAgeDays, uint256 txCount) internal pure returns (CredentialNFT.Tier) {
        // Elite: ≥90 days AND ≥50 tx
        if (walletAgeDays >= 90 && txCount >= 50) {
            return CredentialNFT.Tier.Elite;
        }
        // Trusted: ≥30 days AND ≥20 tx
        if (walletAgeDays >= 30 && txCount >= 20) {
            return CredentialNFT.Tier.Trusted;
        }
        // Verified: ≥7 days AND ≥5 tx
        if (walletAgeDays >= 7 && txCount >= 5) {
            return CredentialNFT.Tier.Verified;
        }
        // Not eligible
        revert("Not eligible for any tier");
    }

    function _mintCredential(address user, CredentialNFT.Tier tier, uint256 expiry) internal {
        bytes memory signature = _generateMintSignature(user, tier, expiry, credential.getNonce(user));
        credential.mint(user, tier, expiry, signature);
    }

    function _generateMintSignature(address user, CredentialNFT.Tier tier, uint256 expiry, uint256 nonce)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Mint(address user,uint8 tier,uint256 expiry,uint256 nonce)"),
                user,
                uint8(tier),
                expiry,
                nonce
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", credential.domainSeparator(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifierPrivateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _generateRenewSignature(address user, uint256 newExpiry, uint256 nonce)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(
            abi.encode(keccak256("Renew(address user,uint256 newExpiry,uint256 nonce)"), user, newExpiry, nonce)
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", credential.domainSeparator(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifierPrivateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
