// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CredentialNFT} from "../../src/CredentialNFT.sol";

/**
 * @title CredentialNFTFuzzTest
 * @notice Fuzz tests for CredentialNFT contract
 * @dev Tests edge cases and random inputs
 */
contract CredentialNFTFuzzTest is Test {
    CredentialNFT public credential;

    address public owner;
    address public verifier;
    uint256 public verifierPrivateKey;

    function setUp() public {
        owner = makeAddr("owner");
        verifierPrivateKey = 0xA11CE;
        verifier = vm.addr(verifierPrivateKey);

        vm.prank(owner);
        credential = new CredentialNFT(verifier);
    }

    /*//////////////////////////////////////////////////////////////
                            FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Fuzz test for minting with random valid expiry times
    function testFuzz_Mint_WithValidExpiry(uint256 expiryOffset) public {
        // Bound expiry to valid range
        expiryOffset = bound(expiryOffset, credential.MIN_EXPIRY_DURATION(), credential.MAX_FUTURE_EXPIRY());

        address user = makeAddr("fuzzUser");
        uint256 expiry = block.timestamp + expiryOffset;
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, expiry, 0);

        credential.mint(user, CredentialNFT.Tier.Verified, expiry, signature);

        (,,, bool exists, bool isValid) = credential.getCredential(user);
        assertTrue(exists);
        assertTrue(isValid);
    }

    /// @notice Fuzz test for minting with invalid expiry (should revert)
    function testFuzz_Mint_RevertsWithInvalidExpiry(uint256 invalidExpiry) public {
        // Ensure expiry is invalid
        vm.assume(
            invalidExpiry <= block.timestamp || invalidExpiry > block.timestamp + credential.MAX_FUTURE_EXPIRY()
                || invalidExpiry < block.timestamp + credential.MIN_EXPIRY_DURATION()
        );

        address user = makeAddr("fuzzUser");
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, invalidExpiry, 0);

        vm.expectRevert();
        credential.mint(user, CredentialNFT.Tier.Verified, invalidExpiry, signature);
    }

    /// @notice Fuzz test for minting to random addresses
    function testFuzz_Mint_ToRandomAddress(address user) public {
        vm.assume(user != address(0));
        vm.assume(user.code.length == 0); // Not a contract

        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, expiry, 0);

        credential.mint(user, CredentialNFT.Tier.Verified, expiry, signature);

        assertEq(credential.balanceOf(user), 1);
        assertEq(credential.ownerOf(1), user);
    }

    /// @notice Fuzz test for all tier levels
    function testFuzz_Mint_AllTiers(uint8 tierValue) public {
        vm.assume(tierValue <= 2); // Valid tier range

        address user = makeAddr("fuzzUser");
        uint256 expiry = block.timestamp + 7 days;
        CredentialNFT.Tier tier = CredentialNFT.Tier(tierValue);
        bytes memory signature = _generateMintSignature(user, tier, expiry, 0);

        credential.mint(user, tier, expiry, signature);

        (CredentialNFT.Tier credTier,,,, bool isValid) = credential.getCredential(user);
        assertEq(uint8(credTier), tierValue);
        assertTrue(isValid);
    }

    /// @notice Fuzz test for renewing with random valid expiry
    function testFuzz_Renew_WithValidExpiry(uint256 newExpiryOffset) public {
        // Bound to valid range
        newExpiryOffset = bound(newExpiryOffset, 1, credential.MAX_FUTURE_EXPIRY());

        address user = makeAddr("fuzzUser");

        // First mint
        uint256 initialExpiry = block.timestamp + 7 days;
        bytes memory mintSig = _generateMintSignature(user, CredentialNFT.Tier.Verified, initialExpiry, 0);
        credential.mint(user, CredentialNFT.Tier.Verified, initialExpiry, mintSig);

        // Renew
        uint256 newExpiry = block.timestamp + newExpiryOffset;
        bytes memory renewSig = _generateRenewSignature(user, newExpiry, 1);
        credential.renew(user, newExpiry, renewSig);

        (, uint256 credExpiry,,,) = credential.getCredential(user);
        assertEq(credExpiry, newExpiry);
    }

    /// @notice Fuzz test for nonce increments
    function testFuzz_Nonce_IncrementsCorrectly(uint8 numMints) public {
        vm.assume(numMints > 0 && numMints <= 10); // Reasonable range

        address user = makeAddr("fuzzUser");
        uint256 initialNonce = credential.getNonce(user);

        for (uint256 i = 0; i < numMints; i++) {
            uint256 expiry = block.timestamp + 7 days + (i * 1 days);
            bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, expiry, i);
            credential.mint(user, CredentialNFT.Tier.Verified, expiry, signature);
        }

        uint256 finalNonce = credential.getNonce(user);
        assertEq(finalNonce, initialNonce + numMints);
    }

    /// @notice Fuzz test for batch validity checks
    function testFuzz_BatchIsValid_MultipleUsers(uint8 numUsers) public {
        vm.assume(numUsers > 0 && numUsers <= 20);

        address[] memory users = new address[](numUsers);
        uint256 expiry = block.timestamp + 7 days;

        // Mint credentials for all users
        for (uint256 i = 0; i < numUsers; i++) {
            users[i] = address(uint160(i + 1));
            bytes memory signature = _generateMintSignature(users[i], CredentialNFT.Tier.Verified, expiry, 0);
            credential.mint(users[i], CredentialNFT.Tier.Verified, expiry, signature);
        }

        // Batch check
        bool[] memory results = credential.batchIsValid(users, CredentialNFT.Tier.Verified);

        for (uint256 i = 0; i < numUsers; i++) {
            assertTrue(results[i]);
        }
    }

    /// @notice Fuzz test for time warping and expiry
    function testFuzz_Expiry_AfterTimeWarp(uint256 warpTime) public {
        address user = makeAddr("fuzzUser");
        uint256 expiry = block.timestamp + 7 days;
        bytes memory signature = _generateMintSignature(user, CredentialNFT.Tier.Verified, expiry, 0);
        credential.mint(user, CredentialNFT.Tier.Verified, expiry, signature);

        // Warp time
        warpTime = bound(warpTime, 0, 365 days);
        vm.warp(block.timestamp + warpTime);

        bool shouldBeValid = block.timestamp < expiry;
        bool isValid = credential.isValid(user, CredentialNFT.Tier.Verified);

        assertEq(isValid, shouldBeValid);
    }

    /// @notice Fuzz test for tier hierarchy validation
    function testFuzz_TierHierarchy(uint8 userTier, uint8 requiredTier) public {
        vm.assume(userTier <= 2 && requiredTier <= 2);

        address user = makeAddr("fuzzUser");
        uint256 expiry = block.timestamp + 7 days;
        CredentialNFT.Tier tier = CredentialNFT.Tier(userTier);
        bytes memory signature = _generateMintSignature(user, tier, expiry, 0);
        credential.mint(user, tier, expiry, signature);

        bool shouldBeValid = userTier >= requiredTier;
        bool isValid = credential.isValid(user, CredentialNFT.Tier(requiredTier));

        assertEq(isValid, shouldBeValid);
    }

    /// @notice Fuzz test for multiple credential updates
    function testFuzz_MultipleUpdates(uint8 numUpdates) public {
        vm.assume(numUpdates > 0 && numUpdates <= 5);

        address user = makeAddr("fuzzUser");

        for (uint256 i = 0; i < numUpdates; i++) {
            uint256 expiry = block.timestamp + 7 days + (i * 1 days);
            CredentialNFT.Tier tier = CredentialNFT.Tier(i % 3);
            bytes memory signature = _generateMintSignature(user, tier, expiry, i);
            credential.mint(user, tier, expiry, signature);
        }

        // Should still only have 1 NFT
        assertEq(credential.balanceOf(user), 1);

        // Nonce should match number of updates
        assertEq(credential.getNonce(user), numUpdates);
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
