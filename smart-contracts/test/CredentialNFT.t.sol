// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {CredentialNFT} from "../src/CredentialNFT.sol";

/**
 * @title CredentialNFTBasicTest
 * @notice Basic smoke tests for CredentialNFT contract
 * @dev For comprehensive tests, see test/unit/, test/integration/, test/fuzz/, test/invariant/
 */
contract CredentialNFTBasicTest is Test {
    CredentialNFT public credential;

    uint256 public verifierPrivateKey = 0xA11CE;
    address public verifier;
    address public user = address(0x1234);

    bytes32 constant MINT_TYPEHASH = keccak256("Mint(address user,uint8 tier,uint256 expiry,uint256 nonce)");

    function setUp() public {
        verifier = vm.addr(verifierPrivateKey);
        credential = new CredentialNFT(verifier);
    }

    function test_Deployment() public view {
        assertEq(credential.name(), "OnChain Rewards Credential");
        assertEq(credential.symbol(), "REWARD");
        assertEq(credential.verifier(), verifier);
    }

    function test_MintWithValidSignature() public {
        uint256 expiry = block.timestamp + 7 days;
        CredentialNFT.Tier tier = CredentialNFT.Tier.Verified;
        uint256 nonce = 0;

        bytes32 structHash = keccak256(abi.encode(MINT_TYPEHASH, user, uint8(tier), expiry, nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", credential.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifierPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        credential.mint(user, tier, expiry, signature);

        (CredentialNFT.Tier storedTier, uint256 storedExpiry,, bool exists, bool isValid) =
            credential.getCredential(user);

        assertEq(uint8(storedTier), uint8(tier));
        assertEq(storedExpiry, expiry);
        assertTrue(exists);
        assertTrue(isValid);
    }

    function test_IsValidWithCorrectTier() public {
        // Mint Elite credential
        uint256 expiry = block.timestamp + 7 days;
        CredentialNFT.Tier tier = CredentialNFT.Tier.Elite;
        uint256 nonce = 0;

        bytes32 structHash = keccak256(abi.encode(MINT_TYPEHASH, user, uint8(tier), expiry, nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", credential.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifierPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        credential.mint(user, tier, expiry, signature);

        // Elite should be valid for all tiers
        assertTrue(credential.isValid(user, CredentialNFT.Tier.Verified));
        assertTrue(credential.isValid(user, CredentialNFT.Tier.Trusted));
        assertTrue(credential.isValid(user, CredentialNFT.Tier.Elite));
    }

    function test_SoulboundTransferReverts() public {
        // First mint a credential
        uint256 expiry = block.timestamp + 7 days;
        CredentialNFT.Tier tier = CredentialNFT.Tier.Verified;
        uint256 nonce = 0;

        bytes32 structHash = keccak256(abi.encode(MINT_TYPEHASH, user, uint8(tier), expiry, nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", credential.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifierPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        credential.mint(user, tier, expiry, signature);

        // Try to transfer - should revert
        vm.prank(user);
        vm.expectRevert(CredentialNFT.CredentialNFT__TransferDisabled.selector);
        credential.transferFrom(user, address(0x5678), 1);
    }

    function test_ExpiredCredentialIsInvalid() public {
        // Use expiry of MIN_EXPIRY_DURATION to satisfy contract requirements
        uint256 expiry = block.timestamp + credential.MIN_EXPIRY_DURATION();
        CredentialNFT.Tier tier = CredentialNFT.Tier.Verified;
        uint256 nonce = 0;

        bytes32 structHash = keccak256(abi.encode(MINT_TYPEHASH, user, uint8(tier), expiry, nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", credential.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifierPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        credential.mint(user, tier, expiry, signature);

        // Warp past expiry
        vm.warp(expiry + 1);

        assertFalse(credential.isValid(user, CredentialNFT.Tier.Verified));
    }

    function test_InvalidSignatureReverts() public {
        uint256 expiry = block.timestamp + 7 days;
        CredentialNFT.Tier tier = CredentialNFT.Tier.Verified;

        // Sign with wrong key
        uint256 wrongKey = 0xB0B;
        bytes32 structHash = keccak256(abi.encode(MINT_TYPEHASH, user, uint8(tier), expiry, 0));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", credential.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(CredentialNFT.CredentialNFT__InvalidSignature.selector);
        credential.mint(user, tier, expiry, signature);
    }
}
