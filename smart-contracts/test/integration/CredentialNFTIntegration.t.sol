// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CredentialNFT} from "../../src/CredentialNFT.sol";

/**
 * @title CredentialNFTIntegrationTest
 * @notice Integration tests for complete user flows
 * @dev Tests realistic scenarios and user journeys
 */
contract CredentialNFTIntegrationTest is Test {
    CredentialNFT public credential;

    address public owner;
    address public verifier;
    uint256 public verifierPrivateKey;

    address public alice;
    address public bob;
    address public charlie;

    function setUp() public {
        owner = makeAddr("owner");
        verifierPrivateKey = 0xA11CE;
        verifier = vm.addr(verifierPrivateKey);

        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");

        vm.prank(owner);
        credential = new CredentialNFT(verifier);
    }

    /*//////////////////////////////////////////////////////////////
                        FULL USER FLOW TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Test complete flow: mint → validate → use → expire
    function test_Integration_CompleteUserFlow() public {
        console2.log("=== Complete User Flow Test ===");

        // Step 1: Alice mints Verified credential
        console2.log("Step 1: Alice mints Verified credential");
        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(alice, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(alice, CredentialNFT.Tier.Verified, expiry, signature);

        // Verify Alice has credential
        assertTrue(credential.isValid(alice, CredentialNFT.Tier.Verified));
        assertEq(credential.balanceOf(alice), 1);
        console2.log("[PASS] Alice has Verified credential");

        // Step 2: Alice tries to access Verified service (should succeed)
        console2.log("Step 2: Alice accesses Verified service");
        bool canAccessVerified = credential.isValid(alice, CredentialNFT.Tier.Verified);
        assertTrue(canAccessVerified);
        console2.log("[PASS] Alice can access Verified service");

        // Step 3: Alice tries to access Trusted service (should fail)
        console2.log("Step 3: Alice tries Trusted service");
        bool canAccessTrusted = credential.isValid(alice, CredentialNFT.Tier.Trusted);
        assertFalse(canAccessTrusted);
        console2.log("[PASS] Alice cannot access Trusted service");

        // Step 4: Time passes, credential expires
        console2.log("Step 4: Time passes (8 days)");
        vm.warp(block.timestamp + 8 days);
        bool isStillValid = credential.isValid(alice, CredentialNFT.Tier.Verified);
        assertFalse(isStillValid);
        console2.log("[PASS] Credential expired after 7 days");

        // Step 5: Alice renews credential
        console2.log("Step 5: Alice renews credential");
        uint256 newExpiry = block.timestamp + 7 days;
        bytes memory renewSig = _generateRenewSignature(alice, newExpiry, 1);
        credential.renew(alice, newExpiry, renewSig);
        assertTrue(credential.isValid(alice, CredentialNFT.Tier.Verified));
        console2.log("[PASS] Credential renewed successfully");
    }

    /// @notice Test tier progression flow
    function test_Integration_TierProgression() public {
        console2.log("=== Tier Progression Test ===");

        // Alice starts with Verified
        console2.log("Step 1: Alice gets Verified tier");
        uint256 expiry1 = block.timestamp + 7 days;
        bytes memory sig1 = _generateMintSignature(alice, CredentialNFT.Tier.Verified, expiry1, 0);
        credential.mint(alice, CredentialNFT.Tier.Verified, expiry1, sig1);

        (CredentialNFT.Tier tier1,,,,) = credential.getCredential(alice);
        assertEq(uint8(tier1), 0);
        console2.log("[PASS] Alice has Verified tier");

        // Alice upgrades to Trusted
        console2.log("Step 2: Alice upgrades to Trusted");
        uint256 expiry2 = block.timestamp + 30 days;
        bytes memory sig2 = _generateMintSignature(alice, CredentialNFT.Tier.Trusted, expiry2, 1);
        credential.mint(alice, CredentialNFT.Tier.Trusted, expiry2, sig2);

        (CredentialNFT.Tier tier2,,,,) = credential.getCredential(alice);
        assertEq(uint8(tier2), 1);
        assertEq(credential.balanceOf(alice), 1); // Still only 1 NFT
        console2.log("[PASS] Alice upgraded to Trusted (still 1 NFT)");

        // Alice upgrades to Elite
        console2.log("Step 3: Alice upgrades to Elite");
        uint256 expiry3 = block.timestamp + 90 days;
        bytes memory sig3 = _generateMintSignature(alice, CredentialNFT.Tier.Elite, expiry3, 2);
        credential.mint(alice, CredentialNFT.Tier.Elite, expiry3, sig3);

        (CredentialNFT.Tier tier3,,,,) = credential.getCredential(alice);
        assertEq(uint8(tier3), 2);
        assertEq(credential.balanceOf(alice), 1); // Still only 1 NFT
        console2.log("[PASS] Alice upgraded to Elite (still 1 NFT)");

        // Verify Elite can access all tiers
        assertTrue(credential.isValid(alice, CredentialNFT.Tier.Verified));
        assertTrue(credential.isValid(alice, CredentialNFT.Tier.Trusted));
        assertTrue(credential.isValid(alice, CredentialNFT.Tier.Elite));
        console2.log("[PASS] Elite tier can access all services");
    }

    /// @notice Test multiple users with different tiers
    function test_Integration_MultipleUsersMultipleTiers() public {
        console2.log("=== Multiple Users Test ===");

        // Alice: Verified
        console2.log("Alice gets Verified");
        uint256 expiryA = block.timestamp + 7 days;
        bytes memory sigA = _generateMintSignature(alice, CredentialNFT.Tier.Verified, expiryA, 0);
        credential.mint(alice, CredentialNFT.Tier.Verified, expiryA, sigA);

        // Bob: Trusted
        console2.log("Bob gets Trusted");
        uint256 expiryB = block.timestamp + 30 days;
        bytes memory sigB = _generateMintSignature(bob, CredentialNFT.Tier.Trusted, expiryB, 0);
        credential.mint(bob, CredentialNFT.Tier.Trusted, expiryB, sigB);

        // Charlie: Elite
        console2.log("Charlie gets Elite");
        uint256 expiryC = block.timestamp + 90 days;
        bytes memory sigC = _generateMintSignature(charlie, CredentialNFT.Tier.Elite, expiryC, 0);
        credential.mint(charlie, CredentialNFT.Tier.Elite, expiryC, sigC);

        // Verify access levels
        console2.log("Verifying access levels...");

        // Alice (Verified) - can only access Verified
        assertTrue(credential.isValid(alice, CredentialNFT.Tier.Verified));
        assertFalse(credential.isValid(alice, CredentialNFT.Tier.Trusted));
        assertFalse(credential.isValid(alice, CredentialNFT.Tier.Elite));
        console2.log("[PASS] Alice: Verified only");

        // Bob (Trusted) - can access Verified and Trusted
        assertTrue(credential.isValid(bob, CredentialNFT.Tier.Verified));
        assertTrue(credential.isValid(bob, CredentialNFT.Tier.Trusted));
        assertFalse(credential.isValid(bob, CredentialNFT.Tier.Elite));
        console2.log("[PASS] Bob: Verified + Trusted");

        // Charlie (Elite) - can access all
        assertTrue(credential.isValid(charlie, CredentialNFT.Tier.Verified));
        assertTrue(credential.isValid(charlie, CredentialNFT.Tier.Trusted));
        assertTrue(credential.isValid(charlie, CredentialNFT.Tier.Elite));
        console2.log("[PASS] Charlie: All tiers");

        // Batch check
        address[] memory users = new address[](3);
        users[0] = alice;
        users[1] = bob;
        users[2] = charlie;

        bool[] memory results = credential.batchIsValid(users, CredentialNFT.Tier.Verified);
        assertTrue(results[0] && results[1] && results[2]);
        console2.log("[PASS] Batch check: all can access Verified");

        results = credential.batchIsValid(users, CredentialNFT.Tier.Elite);
        assertFalse(results[0] || results[1]);
        assertTrue(results[2]);
        console2.log("[PASS] Batch check: only Charlie can access Elite");
    }

    /// @notice Test revocation flow
    function test_Integration_RevocationFlow() public {
        console2.log("=== Revocation Flow Test ===");

        // Alice mints credential
        console2.log("Step 1: Alice mints credential");
        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(alice, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(alice, CredentialNFT.Tier.Verified, expiry, signature);
        assertTrue(credential.isValid(alice, CredentialNFT.Tier.Verified));
        console2.log("[PASS] Alice has valid credential");

        // Owner revokes Alice's credential
        console2.log("Step 2: Owner revokes Alice's credential");
        vm.prank(owner);
        credential.revoke(alice);

        assertFalse(credential.isValid(alice, CredentialNFT.Tier.Verified));
        assertEq(credential.balanceOf(alice), 0);
        (,,, bool exists,) = credential.getCredential(alice);
        assertFalse(exists);
        console2.log("[PASS] Credential revoked, NFT burned");

        // Alice can mint again
        console2.log("Step 3: Alice mints new credential");
        uint256 newExpiry = block.timestamp + 7 days;
        bytes memory newSig = _generateMintSignature(alice, CredentialNFT.Tier.Verified, newExpiry, 1);
        credential.mint(alice, CredentialNFT.Tier.Verified, newExpiry, newSig);
        assertTrue(credential.isValid(alice, CredentialNFT.Tier.Verified));
        console2.log("[PASS] Alice can mint new credential after revocation");
    }

    /// @notice Test pause/unpause flow
    function test_Integration_PauseFlow() public {
        console2.log("=== Pause Flow Test ===");

        // Normal operation
        console2.log("Step 1: Normal minting works");
        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(alice, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(alice, CredentialNFT.Tier.Verified, expiry, signature);
        console2.log("[PASS] Minting successful");

        // Owner pauses contract
        console2.log("Step 2: Owner pauses contract");
        vm.prank(owner);
        credential.pause();
        assertTrue(credential.paused());
        console2.log("[PASS] Contract paused");

        // Minting fails when paused
        console2.log("Step 3: Minting fails when paused");
        uint256 expiry2 = block.timestamp + 7 days;
        bytes memory signature2 = _generateMintSignature(bob, CredentialNFT.Tier.Verified, expiry2, 0);
        vm.expectRevert();
        credential.mint(bob, CredentialNFT.Tier.Verified, expiry2, signature2);
        console2.log("[PASS] Minting blocked while paused");

        // Owner unpauses
        console2.log("Step 4: Owner unpauses contract");
        vm.prank(owner);
        credential.unpause();
        assertFalse(credential.paused());
        console2.log("[PASS] Contract unpaused");

        // Minting works again
        console2.log("Step 5: Minting works after unpause");
        credential.mint(bob, CredentialNFT.Tier.Verified, expiry2, signature2);
        assertTrue(credential.isValid(bob, CredentialNFT.Tier.Verified));
        console2.log("[PASS] Minting successful after unpause");
    }

    /// @notice Test verifier update flow
    function test_Integration_VerifierUpdateFlow() public {
        console2.log("=== Verifier Update Flow Test ===");

        // Mint with original verifier
        console2.log("Step 1: Mint with original verifier");
        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(alice, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(alice, CredentialNFT.Tier.Verified, expiry, signature);
        console2.log("[PASS] Minted with original verifier");

        // Update verifier
        console2.log("Step 2: Update verifier");
        uint256 newVerifierPK = 0xB0B;
        address newVerifier = vm.addr(newVerifierPK);
        vm.prank(owner);
        credential.setVerifier(newVerifier);
        assertEq(credential.verifier(), newVerifier);
        console2.log("[PASS] Verifier updated");

        // Old verifier signature fails
        console2.log("Step 3: Old verifier signature fails");
        uint256 expiry2 = block.timestamp + 7 days;
        bytes memory oldSig = _generateMintSignature(bob, CredentialNFT.Tier.Verified, expiry2, 0);
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(bob, CredentialNFT.Tier.Verified, expiry2, oldSig);
        console2.log("[PASS] Old verifier signature rejected");

        // New verifier signature works
        console2.log("Step 4: New verifier signature works");
        bytes memory newSig = _generateMintSignatureWithPK(bob, CredentialNFT.Tier.Verified, expiry2, 0, newVerifierPK);
        credential.mint(bob, CredentialNFT.Tier.Verified, expiry2, newSig);
        assertTrue(credential.isValid(bob, CredentialNFT.Tier.Verified));
        console2.log("[PASS] New verifier signature accepted");
    }

    /// @notice Test nonce replay protection
    function test_Integration_NonceReplayProtection() public {
        console2.log("=== Nonce Replay Protection Test ===");

        // Alice mints credential
        console2.log("Step 1: Alice mints credential");
        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(alice, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(alice, CredentialNFT.Tier.Verified, expiry, signature);
        console2.log("[PASS] First mint successful");

        // Try to replay same signature (should fail)
        console2.log("Step 2: Try to replay signature");
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(alice, CredentialNFT.Tier.Verified, expiry, signature);
        console2.log("[PASS] Replay attack prevented");

        // New signature with correct nonce works
        console2.log("Step 3: New signature with correct nonce");
        uint256 expiry2 = block.timestamp + 30 days;
        bytes memory signature2 = _generateMintSignature(alice, CredentialNFT.Tier.Trusted, expiry2, 1);
        credential.mint(alice, CredentialNFT.Tier.Trusted, expiry2, signature2);
        console2.log("[PASS] New signature with correct nonce works");
    }

    /*//////////////////////////////////////////////////////////////
                         HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _generateMintSignature(address user, CredentialNFT.Tier tier, uint256 expiry, uint256 nonce)
        internal
        view
        returns (bytes memory)
    {
        return _generateMintSignatureWithPK(user, tier, expiry, nonce, verifierPrivateKey);
    }

    function _generateMintSignatureWithPK(
        address user,
        CredentialNFT.Tier tier,
        uint256 expiry,
        uint256 nonce,
        uint256 privateKey
    ) internal view returns (bytes memory) {
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

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
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
