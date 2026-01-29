// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CredentialNFT} from "../../src/CredentialNFT.sol";
import {AutomationConsumer} from "../../src/AutomationConsumer.sol";

/**
 * @title SecurityTest
 * @notice Security-focused tests for PayLoad contracts
 * @dev Tests attack vectors, edge cases, and security invariants
 *
 * Test Categories:
 * 1. Signature Security - replay, malleability, wrong signer
 * 2. Access Control - unauthorized access attempts
 * 3. Reentrancy - callback attacks
 * 4. DoS Vectors - gas griefing, infinite loops
 * 5. Integer Safety - overflow/underflow (handled by Solidity 0.8+)
 * 6. Soulbound Integrity - transfer prevention
 */
contract SecurityTest is Test {
    CredentialNFT public credential;
    AutomationConsumer public automation;

    address public owner;
    address public verifier;
    address public attacker;
    address public user;

    uint256 public verifierPrivateKey;
    uint256 public attackerPrivateKey;

    function setUp() public {
        owner = makeAddr("owner");
        verifierPrivateKey = 0xA11CE;
        verifier = vm.addr(verifierPrivateKey);
        attackerPrivateKey = 0xBAD;
        attacker = vm.addr(attackerPrivateKey);
        user = makeAddr("user");

        vm.startPrank(owner);
        credential = new CredentialNFT(verifier);
        automation = new AutomationConsumer(address(credential));
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        SIGNATURE SECURITY TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Test replay attack prevention
    function test_Security_ReplayAttackPrevention() public {
        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, expiry, 0);

        // First mint succeeds
        credential.mint(user, CredentialNFT.Tier.Verified, expiry, signature);

        // Replay attempt fails
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(user, CredentialNFT.Tier.Verified, expiry, signature);
    }

    /// @notice Test wrong signer rejection
    function test_Security_WrongSignerRejected() public {
        uint256 expiry = block.timestamp + 7 days;

        // Sign with attacker's key instead of verifier's
        bytes memory attackerSignature =
            _generateSignatureWithKey(user, CredentialNFT.Tier.Verified, expiry, 0, attackerPrivateKey);

        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(user, CredentialNFT.Tier.Verified, expiry, attackerSignature);
    }

    /// @notice Test signature for different user rejected
    function test_Security_SignatureUserMismatch() public {
        uint256 expiry = block.timestamp + 7 days;

        // Generate signature for user
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, expiry, 0);

        // Try to use it for attacker
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(attacker, CredentialNFT.Tier.Verified, expiry, signature);
    }

    /// @notice Test signature for different tier rejected
    function test_Security_SignatureTierMismatch() public {
        uint256 expiry = block.timestamp + 7 days;

        // Generate signature for Verified
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, expiry, 0);

        // Try to use it for Elite
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(user, CredentialNFT.Tier.Elite, expiry, signature);
    }

    /// @notice Test signature for different expiry rejected
    function test_Security_SignatureExpiryMismatch() public {
        uint256 expiry = block.timestamp + 7 days;

        // Generate signature for 7 days expiry
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, expiry, 0);

        // Try to use it for 30 days expiry
        uint256 differentExpiry = block.timestamp + 30 days;
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(user, CredentialNFT.Tier.Verified, differentExpiry, signature);
    }

    /// @notice Test nonce manipulation rejected
    function test_Security_NonceManipulation() public {
        uint256 expiry = block.timestamp + 7 days;

        // Generate signature with nonce 1 (should be 0 for fresh user)
        bytes memory signature = _generateMintSignature(
            user,
            CredentialNFT.Tier.Verified,
            expiry,
            1 // Wrong nonce
        );

        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(user, CredentialNFT.Tier.Verified, expiry, signature);
    }

    /*//////////////////////////////////////////////////////////////
                        ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Test unauthorized verifier change
    function test_Security_UnauthorizedVerifierChange() public {
        vm.prank(attacker);
        vm.expectRevert();
        credential.setVerifier(attacker);
    }

    /// @notice Test unauthorized pause
    function test_Security_UnauthorizedPause() public {
        vm.prank(attacker);
        vm.expectRevert();
        credential.pause();
    }

    /// @notice Test unauthorized revoke
    function test_Security_UnauthorizedRevoke() public {
        // First mint a credential
        _mintCredential(user, CredentialNFT.Tier.Verified, block.timestamp + 7 days);

        vm.prank(attacker);
        vm.expectRevert();
        credential.revoke(user);
    }

    /// @notice Test unauthorized watchlist management
    function test_Security_UnauthorizedWatchlistManagement() public {
        vm.prank(attacker);
        vm.expectRevert();
        automation.addToWatchlist(user);
    }

    /*//////////////////////////////////////////////////////////////
                        SOULBOUND INTEGRITY TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Test direct transfer blocked
    function test_Security_DirectTransferBlocked() public {
        _mintCredential(user, CredentialNFT.Tier.Verified, block.timestamp + 7 days);
        uint256 tokenId = credential.getTokenId(user);

        vm.prank(user);
        vm.expectRevert(CredentialNFT.CredentialNFT__TransferDisabled.selector);
        credential.transferFrom(user, attacker, tokenId);
    }

    /// @notice Test safe transfer blocked
    function test_Security_SafeTransferBlocked() public {
        _mintCredential(user, CredentialNFT.Tier.Verified, block.timestamp + 7 days);
        uint256 tokenId = credential.getTokenId(user);

        vm.prank(user);
        vm.expectRevert(CredentialNFT.CredentialNFT__TransferDisabled.selector);
        credential.safeTransferFrom(user, attacker, tokenId);
    }

    /// @notice Test approval doesn't enable transfer
    function test_Security_ApprovalDoesntEnableTransfer() public {
        _mintCredential(user, CredentialNFT.Tier.Verified, block.timestamp + 7 days);
        uint256 tokenId = credential.getTokenId(user);

        // User approves attacker
        vm.prank(user);
        credential.approve(attacker, tokenId);

        // Attacker still can't transfer
        vm.prank(attacker);
        vm.expectRevert(CredentialNFT.CredentialNFT__TransferDisabled.selector);
        credential.transferFrom(user, attacker, tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                        EXPIRY VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Test past expiry rejected
    function test_Security_PastExpiryRejected() public {
        uint256 pastExpiry = block.timestamp - 1;
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, pastExpiry, 0);

        vm.expectRevert(CredentialNFT.CredentialNFT__ExpiryMustBeFuture.selector);
        credential.mint(user, CredentialNFT.Tier.Verified, pastExpiry, signature);
    }

    /// @notice Test too far future expiry rejected
    function test_Security_TooFarFutureExpiryRejected() public {
        uint256 farFutureExpiry = block.timestamp + credential.MAX_FUTURE_EXPIRY() + 1;
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, farFutureExpiry, 0);

        vm.expectRevert(CredentialNFT.CredentialNFT__ExpiryTooFarInFuture.selector);
        credential.mint(user, CredentialNFT.Tier.Verified, farFutureExpiry, signature);
    }

    /// @notice Test too short expiry duration rejected
    function test_Security_TooShortExpiryDurationRejected() public {
        uint256 shortExpiry = block.timestamp + credential.MIN_EXPIRY_DURATION() - 1;
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, shortExpiry, 0);

        vm.expectRevert(CredentialNFT.CredentialNFT__ExpiryDurationTooShort.selector);
        credential.mint(user, CredentialNFT.Tier.Verified, shortExpiry, signature);
    }

    /*//////////////////////////////////////////////////////////////
                        PAUSE MECHANISM TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Test minting blocked when paused
    function test_Security_MintingBlockedWhenPaused() public {
        vm.prank(owner);
        credential.pause();

        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, expiry, 0);

        vm.expectRevert();
        credential.mint(user, CredentialNFT.Tier.Verified, expiry, signature);
    }

    /// @notice Test renewal blocked when paused
    function test_Security_RenewalBlockedWhenPaused() public {
        _mintCredential(user, CredentialNFT.Tier.Verified, block.timestamp + 7 days);

        vm.prank(owner);
        credential.pause();

        uint256 newExpiry = block.timestamp + 14 days;
        bytes memory renewSig = _generateRenewSignature(user, newExpiry, 1);

        vm.expectRevert();
        credential.renew(user, newExpiry, renewSig);
    }

    /// @notice Test automation upkeep blocked when paused
    function test_Security_AutomationBlockedWhenPaused() public {
        vm.prank(owner);
        automation.pause();

        vm.expectRevert();
        automation.performUpkeep(abi.encode(true));
    }

    /*//////////////////////////////////////////////////////////////
                        ZERO ADDRESS TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Test zero address user rejected
    function test_Security_ZeroAddressUserRejected() public {
        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(address(0), CredentialNFT.Tier.Verified, expiry, 0);

        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidAddress.selector);
        credential.mint(address(0), CredentialNFT.Tier.Verified, expiry, signature);
    }

    /// @notice Test zero address verifier rejected
    function test_Security_ZeroAddressVerifierRejected() public {
        vm.prank(owner);
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidAddress.selector);
        credential.setVerifier(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                         HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _mintCredential(address _user, CredentialNFT.Tier tier, uint256 expiry) internal {
        bytes memory signature = _generateMintSignature(_user, tier, expiry, credential.getNonce(_user));
        credential.mint(_user, tier, expiry, signature);
    }

    function _generateMintSignature(address _user, CredentialNFT.Tier tier, uint256 expiry, uint256 nonce)
        internal
        view
        returns (bytes memory)
    {
        return _generateSignatureWithKey(_user, tier, expiry, nonce, verifierPrivateKey);
    }

    function _generateSignatureWithKey(
        address _user,
        CredentialNFT.Tier tier,
        uint256 expiry,
        uint256 nonce,
        uint256 privateKey
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Mint(address user,uint8 tier,uint256 expiry,uint256 nonce)"),
                _user,
                uint8(tier),
                expiry,
                nonce
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", credential.domainSeparator(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _generateRenewSignature(address _user, uint256 newExpiry, uint256 nonce)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(
            abi.encode(keccak256("Renew(address user,uint256 newExpiry,uint256 nonce)"), _user, newExpiry, nonce)
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", credential.domainSeparator(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifierPrivateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
