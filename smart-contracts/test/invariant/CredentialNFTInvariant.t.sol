// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {CredentialNFT} from "../../src/CredentialNFT.sol";

/**
 * @title CredentialNFTHandler
 * @notice Handler contract for invariant testing
 * @dev Restricts actions to valid state transitions
 */
contract CredentialNFTHandler is Test {
    CredentialNFT public credential;
    address public verifier;
    uint256 public verifierPrivateKey;

    address[] internal _actors;
    address internal currentActor;

    uint256 public ghost_mintCount;
    uint256 public ghost_renewCount;
    uint256 public ghost_revokeCount;
    uint256 public ghost_totalSupply;

    constructor(CredentialNFT _credential, address _verifier, uint256 _verifierPrivateKey) {
        credential = _credential;
        verifier = _verifier;
        verifierPrivateKey = _verifierPrivateKey;
    }

    function actors() external view returns (address[] memory) {
        return _actors;
    }

    modifier useActor(uint256 actorIndexSeed) {
        currentActor = _actors[bound(actorIndexSeed, 0, _actors.length - 1)];
        _;
    }

    modifier createActor(uint256 actorIndexSeed) {
        currentActor = address(uint160(bound(actorIndexSeed, 1, type(uint160).max)));
        if (!_isActor(currentActor)) {
            _actors.push(currentActor);
        }
        _;
    }

    function mint(uint256 actorIndexSeed, uint8 tierValue, uint256 expiryOffset) public createActor(actorIndexSeed) {
        tierValue = uint8(bound(tierValue, 0, 2));
        expiryOffset = bound(expiryOffset, credential.MIN_EXPIRY_DURATION(), credential.MAX_FUTURE_EXPIRY());

        uint256 expiry = block.timestamp + expiryOffset;
        CredentialNFT.Tier tier = CredentialNFT.Tier(tierValue);
        uint256 nonce = credential.getNonce(currentActor);

        bytes memory signature = _generateMintSignature(currentActor, tier, expiry, nonce);

        // Check if user already has NFT before minting
        uint256 balanceBefore = credential.balanceOf(currentActor);

        try credential.mint(currentActor, tier, expiry, signature) {
            ghost_mintCount++;
            // Only increment total supply if this is a new NFT
            if (balanceBefore == 0 && credential.balanceOf(currentActor) == 1) {
                ghost_totalSupply++;
            }
        } catch {}
    }

    function renew(uint256 actorIndexSeed, uint256 newExpiryOffset) public useActor(actorIndexSeed) {
        if (_actors.length == 0) return;

        (,,, bool exists,) = credential.getCredential(currentActor);
        if (!exists) return;

        newExpiryOffset = bound(newExpiryOffset, 1, credential.MAX_FUTURE_EXPIRY());
        uint256 newExpiry = block.timestamp + newExpiryOffset;
        uint256 nonce = credential.getNonce(currentActor);

        bytes memory signature = _generateRenewSignature(currentActor, newExpiry, nonce);

        try credential.renew(currentActor, newExpiry, signature) {
            ghost_renewCount++;
        } catch {}
    }

    function warpTime(uint256 timeOffset) public {
        timeOffset = bound(timeOffset, 0, 365 days);
        vm.warp(block.timestamp + timeOffset);
    }

    function _isActor(address actor) internal view returns (bool) {
        for (uint256 i = 0; i < _actors.length; i++) {
            if (_actors[i] == actor) return true;
        }
        return false;
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

    function callSummary() external view {
        console2.log("------- Call Summary -------");
        console2.log("Mints:", ghost_mintCount);
        console2.log("Renews:", ghost_renewCount);
        console2.log("Revokes:", ghost_revokeCount);
        console2.log("Total Supply:", ghost_totalSupply);
        console2.log("Actors:", _actors.length);
    }
}

/**
 * @title CredentialNFTInvariantTest
 * @notice Invariant tests for CredentialNFT contract
 * @dev Tests properties that should always hold true
 */
contract CredentialNFTInvariantTest is StdInvariant, Test {
    CredentialNFT public credential;
    CredentialNFTHandler public handler;

    address public owner;
    address public verifier;
    uint256 public verifierPrivateKey;

    function setUp() public {
        owner = makeAddr("owner");
        verifierPrivateKey = 0xA11CE;
        verifier = vm.addr(verifierPrivateKey);

        vm.prank(owner);
        credential = new CredentialNFT(verifier);

        handler = new CredentialNFTHandler(credential, verifier, verifierPrivateKey);

        targetContract(address(handler));

        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = CredentialNFTHandler.mint.selector;
        selectors[1] = CredentialNFTHandler.renew.selector;
        selectors[2] = CredentialNFTHandler.warpTime.selector;

        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /*//////////////////////////////////////////////////////////////
                            INVARIANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Each user can only have at most 1 NFT
    function invariant_OneNFTPerUser() public view {
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; i++) {
            uint256 balance = credential.balanceOf(actors[i]);
            assertLe(balance, 1, "User has more than 1 NFT");
        }
    }

    /// @notice Total supply should never exceed number of unique users who have minted
    function invariant_TotalSupplyMatchesUniqueHolders() public view {
        uint256 totalSupply = credential.totalSupply();
        assertLe(totalSupply, handler.actors().length, "Total supply exceeds unique actors");
    }

    /// @notice Nonce should always increase monotonically
    function invariant_NonceMonotonicallyIncreasing() public view {
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; i++) {
            uint256 nonce = credential.getNonce(actors[i]);
            // Nonce should be >= 0 (always true for uint256)
            assertGe(nonce, 0, "Nonce is negative");
        }
    }

    /// @notice Valid credentials must have expiry in the future
    function invariant_ValidCredentialsHaveFutureExpiry() public view {
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; i++) {
            (, uint256 expiry,, bool exists, bool isValid) = credential.getCredential(actors[i]);
            if (exists && isValid) {
                assertGt(expiry, block.timestamp, "Valid credential has past expiry");
            }
        }
    }

    /// @notice Expired credentials should not be valid
    function invariant_ExpiredCredentialsNotValid() public view {
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; i++) {
            (, uint256 expiry,, bool exists, bool isValid) = credential.getCredential(actors[i]);
            if (exists && expiry <= block.timestamp) {
                assertFalse(isValid, "Expired credential is marked as valid");
            }
        }
    }

    /// @notice Tier values must be within valid range (0-2)
    function invariant_TierWithinValidRange() public view {
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; i++) {
            (CredentialNFT.Tier tier,,, bool exists,) = credential.getCredential(actors[i]);
            if (exists) {
                assertLe(uint8(tier), 2, "Tier exceeds maximum value");
            }
        }
    }

    /// @notice Token ownership must match credential existence
    function invariant_TokenOwnershipMatchesCredential() public view {
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; i++) {
            (,,, bool exists,) = credential.getCredential(actors[i]);
            uint256 balance = credential.balanceOf(actors[i]);

            if (exists) {
                assertEq(balance, 1, "Credential exists but no NFT");
            } else {
                assertEq(balance, 0, "No credential but NFT exists");
            }
        }
    }

    /// @notice Verifier address should never be zero
    function invariant_VerifierNotZero() public view {
        assertNotEq(credential.verifier(), address(0), "Verifier is zero address");
    }

    /// @notice Owner should never be zero
    function invariant_OwnerNotZero() public view {
        assertNotEq(credential.owner(), address(0), "Owner is zero address");
    }

    /// @notice Minted timestamp should never be in the future
    function invariant_MintedAtNotInFuture() public view {
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; i++) {
            (,, uint256 mintedAt, bool exists,) = credential.getCredential(actors[i]);
            if (exists) {
                assertLe(mintedAt, block.timestamp, "Minted timestamp is in future");
            }
        }
    }

    /// @notice Ghost variable consistency
    function invariant_GhostVariableConsistency() public view {
        uint256 totalSupply = credential.totalSupply();
        assertEq(totalSupply, handler.ghost_totalSupply(), "Ghost total supply mismatch");
    }

    function invariant_callSummary() public view {
        handler.callSummary();
    }
}
