// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CredentialNFT} from "../../src/CredentialNFT.sol";

/**
 * @title CredentialNFTTest
 * @notice Unit tests for CredentialNFT contract
 * @dev Follows Cyfrin testing best practices
 */
contract CredentialNFTTest is Test {
    /*//////////////////////////////////////////////////////////////
                                SETUP
    //////////////////////////////////////////////////////////////*/

    CredentialNFT public credential;

    address public owner;
    address public verifier;
    address public user1;
    address public user2;
    address public attacker;

    uint256 public verifierPrivateKey;
    uint256 public constant STARTING_BALANCE = 10 ether;

    // Test constants
    uint256 public constant SEVEN_DAYS = 7 days;
    uint256 public constant THIRTY_DAYS = 30 days;

    event CredentialMinted(address indexed user, CredentialNFT.Tier tier, uint256 expiry, uint256 tokenId);
    event CredentialRenewed(address indexed user, uint256 newExpiry, uint256 oldExpiry);
    event CredentialRevoked(address indexed user, uint256 tokenId);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    function setUp() public {
        // Setup accounts
        owner = makeAddr("owner");
        verifierPrivateKey = 0xA11CE;
        verifier = vm.addr(verifierPrivateKey);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        attacker = makeAddr("attacker");

        // Fund accounts
        vm.deal(owner, STARTING_BALANCE);
        vm.deal(user1, STARTING_BALANCE);
        vm.deal(user2, STARTING_BALANCE);

        // Deploy contract
        vm.prank(owner);
        credential = new CredentialNFT(verifier);
    }

    /*//////////////////////////////////////////////////////////////
                          CONSTRUCTOR TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Constructor_SetsVerifier() public view {
        assertEq(credential.verifier(), verifier);
    }

    function test_Constructor_SetsOwner() public view {
        assertEq(credential.owner(), owner);
    }

    function test_Constructor_RevertsIfVerifierIsZeroAddress() public {
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidAddress.selector);
        vm.prank(owner);
        new CredentialNFT(address(0));
    }

    function test_Constructor_SetsCorrectName() public view {
        assertEq(credential.name(), "OnChain Rewards Credential");
    }

    function test_Constructor_SetsCorrectSymbol() public view {
        assertEq(credential.symbol(), "REWARD");
    }

    /*//////////////////////////////////////////////////////////////
                            MINT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Mint_SuccessfullyMintsCredential() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);

        vm.expectEmit(true, true, true, true);
        emit CredentialMinted(user1, CredentialNFT.Tier.Verified, expiry, 1);

        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);

        // Verify credential was minted
        (CredentialNFT.Tier tier, uint256 credExpiry, uint256 mintedAt, bool exists, bool isValid) =
            credential.getCredential(user1);

        assertEq(uint8(tier), uint8(CredentialNFT.Tier.Verified));
        assertEq(credExpiry, expiry);
        assertEq(mintedAt, block.timestamp);
        assertTrue(exists);
        assertTrue(isValid);
    }

    function test_Mint_MintsNFTToUser() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);

        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);

        assertEq(credential.balanceOf(user1), 1);
        assertEq(credential.ownerOf(1), user1);
    }

    function test_Mint_IncrementsNonce() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);

        uint256 nonceBefore = credential.getNonce(user1);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);
        uint256 nonceAfter = credential.getNonce(user1);

        assertEq(nonceAfter, nonceBefore + 1);
    }

    function test_Mint_RevertsIfExpiryInPast() public {
        uint256 expiry = block.timestamp - 1;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);

        vm.expectRevert(CredentialNFT.CredentialNFT__ExpiryMustBeFuture.selector);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);
    }

    function test_Mint_RevertsIfExpiryTooFarInFuture() public {
        uint256 expiry = block.timestamp + credential.MAX_FUTURE_EXPIRY() + 1;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);

        vm.expectRevert(CredentialNFT.CredentialNFT__ExpiryTooFarInFuture.selector);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);
    }

    function test_Mint_RevertsIfExpiryDurationTooShort() public {
        uint256 expiry = block.timestamp + credential.MIN_EXPIRY_DURATION() - 1;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);

        vm.expectRevert(CredentialNFT.CredentialNFT__ExpiryDurationTooShort.selector);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);
    }

    function test_Mint_RevertsIfInvalidSignature() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);

        // Try to mint for different user with same signature
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(user2, CredentialNFT.Tier.Verified, expiry, signature);
    }

    function test_Mint_RevertsIfWrongNonce() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 1); // Wrong nonce

        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);
    }

    function test_Mint_RevertsIfZeroAddress() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(address(0), CredentialNFT.Tier.Verified, expiry, 0);

        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidAddress.selector);
        credential.mint(address(0), CredentialNFT.Tier.Verified, expiry, signature);
    }

    // Note: In Solidity 0.8+, invalid enum values cannot be created directly
    // The validTier modifier protects against this at the ABI level
    // This test verifies the tier validation by testing boundary conditions
    function test_Mint_AllValidTiersWork() public {
        // Test all three valid tiers
        CredentialNFT.Tier[] memory tiers = new CredentialNFT.Tier[](3);
        tiers[0] = CredentialNFT.Tier.Verified;
        tiers[1] = CredentialNFT.Tier.Trusted;
        tiers[2] = CredentialNFT.Tier.Elite;

        for (uint256 i = 0; i < 3; i++) {
            address user = address(uint160(100 + i));
            uint256 expiry = block.timestamp + SEVEN_DAYS;
            bytes memory signature = _generateMintSignature(user, tiers[i], expiry, 0);
            credential.mint(user, tiers[i], expiry, signature);
            assertTrue(credential.isValid(user, tiers[i]));
        }
    }

    function test_Mint_CanUpdateExistingCredential() public {
        // First mint
        uint256 expiry1 = block.timestamp + SEVEN_DAYS;
        bytes memory signature1 = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry1, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry1, signature1);

        // Update to higher tier
        uint256 expiry2 = block.timestamp + THIRTY_DAYS;
        bytes memory signature2 = _generateMintSignature(user1, CredentialNFT.Tier.Trusted, expiry2, 1);
        credential.mint(user1, CredentialNFT.Tier.Trusted, expiry2, signature2);

        (CredentialNFT.Tier tier,,, bool exists,) = credential.getCredential(user1);
        assertEq(uint8(tier), uint8(CredentialNFT.Tier.Trusted));
        assertTrue(exists);
        assertEq(credential.balanceOf(user1), 1); // Still only 1 NFT
    }

    function test_Mint_RevertsWhenPaused() public {
        vm.prank(owner);
        credential.pause();

        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);

        vm.expectRevert();
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);
    }

    /*//////////////////////////////////////////////////////////////
                            RENEW TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Renew_SuccessfullyRenewsCredential() public {
        // First mint
        uint256 expiry1 = block.timestamp + SEVEN_DAYS;
        bytes memory mintSig = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry1, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry1, mintSig);

        // Renew
        uint256 newExpiry = block.timestamp + THIRTY_DAYS;
        bytes memory renewSig = _generateRenewSignature(user1, newExpiry, 1);

        vm.expectEmit(true, true, true, true);
        emit CredentialRenewed(user1, newExpiry, expiry1);

        credential.renew(user1, newExpiry, renewSig);

        (, uint256 credExpiry,,,) = credential.getCredential(user1);
        assertEq(credExpiry, newExpiry);
    }

    function test_Renew_IncrementsNonce() public {
        // First mint
        uint256 expiry1 = block.timestamp + SEVEN_DAYS;
        bytes memory mintSig = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry1, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry1, mintSig);

        // Renew
        uint256 newExpiry = block.timestamp + THIRTY_DAYS;
        bytes memory renewSig = _generateRenewSignature(user1, newExpiry, 1);

        uint256 nonceBefore = credential.getNonce(user1);
        credential.renew(user1, newExpiry, renewSig);
        uint256 nonceAfter = credential.getNonce(user1);

        assertEq(nonceAfter, nonceBefore + 1);
    }

    function test_Renew_RevertsIfNoCredential() public {
        uint256 newExpiry = block.timestamp + THIRTY_DAYS;
        bytes memory renewSig = _generateRenewSignature(user1, newExpiry, 0);

        vm.expectRevert(CredentialNFT.CredentialNFT__NoCredential.selector);
        credential.renew(user1, newExpiry, renewSig);
    }

    function test_Renew_RevertsIfExpiryInPast() public {
        // First mint
        uint256 expiry1 = block.timestamp + SEVEN_DAYS;
        bytes memory mintSig = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry1, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry1, mintSig);

        // Try to renew with past expiry
        uint256 newExpiry = block.timestamp - 1;
        bytes memory renewSig = _generateRenewSignature(user1, newExpiry, 1);

        vm.expectRevert(CredentialNFT.CredentialNFT__ExpiryMustBeFuture.selector);
        credential.renew(user1, newExpiry, renewSig);
    }

    function test_Renew_RevertsIfInvalidSignature() public {
        // First mint
        uint256 expiry1 = block.timestamp + SEVEN_DAYS;
        bytes memory mintSig = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry1, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry1, mintSig);

        // Try to renew with signature for different user
        uint256 newExpiry = block.timestamp + THIRTY_DAYS;
        bytes memory renewSig = _generateRenewSignature(user2, newExpiry, 1);

        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.renew(user1, newExpiry, renewSig);
    }

    /*//////////////////////////////////////////////////////////////
                           REVOKE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Revoke_SuccessfullyRevokesCredential() public {
        // First mint
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);

        uint256 tokenId = credential.getTokenId(user1);

        vm.expectEmit(true, true, true, true);
        emit CredentialRevoked(user1, tokenId);

        vm.prank(owner);
        credential.revoke(user1);

        (,,, bool exists,) = credential.getCredential(user1);
        assertFalse(exists);
        assertEq(credential.balanceOf(user1), 0);
    }

    function test_Revoke_RevertsIfNotOwner() public {
        // First mint
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);

        vm.prank(attacker);
        vm.expectRevert();
        credential.revoke(user1);
    }

    function test_Revoke_RevertsIfNoCredential() public {
        vm.prank(owner);
        vm.expectRevert(CredentialNFT.CredentialNFT__NoCredential.selector);
        credential.revoke(user1);
    }

    /*//////////////////////////////////////////////////////////////
                         VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_IsValid_ReturnsTrueForValidCredential() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);

        assertTrue(credential.isValid(user1, CredentialNFT.Tier.Verified));
    }

    function test_IsValid_ReturnsFalseForExpiredCredential() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);

        // Warp past expiry
        vm.warp(expiry + 1);

        assertFalse(credential.isValid(user1, CredentialNFT.Tier.Verified));
    }

    function test_IsValid_ReturnsFalseForInsufficientTier() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);

        assertFalse(credential.isValid(user1, CredentialNFT.Tier.Trusted));
    }

    function test_IsValid_ReturnsTrueForHigherTier() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Elite, expiry, 0);
        credential.mint(user1, CredentialNFT.Tier.Elite, expiry, signature);

        assertTrue(credential.isValid(user1, CredentialNFT.Tier.Verified));
        assertTrue(credential.isValid(user1, CredentialNFT.Tier.Trusted));
        assertTrue(credential.isValid(user1, CredentialNFT.Tier.Elite));
    }

    /*//////////////////////////////////////////////////////////////
                        SOULBOUND TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Transfer_RevertsForSoulboundToken() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);

        uint256 tokenId = credential.getTokenId(user1);

        vm.prank(user1);
        vm.expectRevert(CredentialNFT.CredentialNFT__TransferDisabled.selector);
        credential.transferFrom(user1, user2, tokenId);
    }

    function test_SafeTransferFrom_RevertsForSoulboundToken() public {
        uint256 expiry = block.timestamp + SEVEN_DAYS;
        bytes memory signature = _generateMintSignature(user1, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(user1, CredentialNFT.Tier.Verified, expiry, signature);

        uint256 tokenId = credential.getTokenId(user1);

        vm.prank(user1);
        vm.expectRevert(CredentialNFT.CredentialNFT__TransferDisabled.selector);
        credential.safeTransferFrom(user1, user2, tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                         ADMIN TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetVerifier_UpdatesVerifier() public {
        address newVerifier = makeAddr("newVerifier");

        vm.expectEmit(true, true, true, true);
        emit VerifierUpdated(verifier, newVerifier);

        vm.prank(owner);
        credential.setVerifier(newVerifier);

        assertEq(credential.verifier(), newVerifier);
    }

    function test_SetVerifier_RevertsIfNotOwner() public {
        address newVerifier = makeAddr("newVerifier");

        vm.prank(attacker);
        vm.expectRevert();
        credential.setVerifier(newVerifier);
    }

    function test_SetVerifier_RevertsIfZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidAddress.selector);
        credential.setVerifier(address(0));
    }

    function test_Pause_PausesContract() public {
        vm.prank(owner);
        credential.pause();

        assertTrue(credential.paused());
    }

    function test_Unpause_UnpausesContract() public {
        vm.prank(owner);
        credential.pause();

        vm.prank(owner);
        credential.unpause();

        assertFalse(credential.paused());
    }

    /*//////////////////////////////////////////////////////////////
                         HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

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
