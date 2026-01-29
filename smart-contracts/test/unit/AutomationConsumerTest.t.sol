// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {AutomationConsumer} from "../../src/AutomationConsumer.sol";
import {CredentialNFT} from "../../src/CredentialNFT.sol";

/**
 * @title AutomationConsumerTest
 * @notice Unit tests for AutomationConsumer contract
 * @dev Tests watchlist management, renewal queueing, and automation interface
 */
contract AutomationConsumerTest is Test {
    /*//////////////////////////////////////////////////////////////
                                SETUP
    //////////////////////////////////////////////////////////////*/

    AutomationConsumer public automation;
    CredentialNFT public credential;

    address public owner;
    address public verifier;
    address public user1;
    address public user2;
    address public user3;

    uint256 public verifierPrivateKey;

    event AddedToWatchlist(address indexed user);
    event RemovedFromWatchlist(address indexed user);
    event RenewalsQueued(uint256 count);
    event RenewalProcessed(address indexed user, uint256 newExpiry, bool success);
    event ConfigUpdated(uint256 renewalThreshold, uint256 maxCheckBatchSize, uint256 maxRenewalBatchSize);

    function setUp() public {
        owner = makeAddr("owner");
        verifierPrivateKey = 0xA11CE;
        verifier = vm.addr(verifierPrivateKey);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");

        vm.startPrank(owner);
        credential = new CredentialNFT(verifier);
        automation = new AutomationConsumer(address(credential));
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                          CONSTRUCTOR TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Constructor_SetsCredentialNFT() public view {
        assertEq(address(automation.credentialNFT()), address(credential));
    }

    function test_Constructor_SetsOwner() public view {
        assertEq(automation.owner(), owner);
    }

    function test_Constructor_SetsDefaultConfig() public view {
        assertEq(automation.renewalThreshold(), automation.DEFAULT_RENEWAL_THRESHOLD());
        assertEq(automation.maxCheckBatchSize(), automation.DEFAULT_CHECK_BATCH_SIZE());
        assertEq(automation.maxRenewalBatchSize(), automation.DEFAULT_RENEWAL_BATCH_SIZE());
        assertEq(automation.upkeepInterval(), automation.DEFAULT_UPKEEP_INTERVAL());
    }

    function test_Constructor_RevertsIfZeroAddress() public {
        vm.expectRevert(AutomationConsumer.AutomationConsumer__InvalidAddress.selector);
        vm.prank(owner);
        new AutomationConsumer(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                        WATCHLIST MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AddToWatchlist_AddsAddress() public {
        vm.expectEmit(true, true, true, true);
        emit AddedToWatchlist(user1);

        vm.prank(owner);
        automation.addToWatchlist(user1);

        assertTrue(automation.isInWatchlist(user1));
        assertEq(automation.getWatchlistSize(), 1);
    }

    function test_AddToWatchlist_RevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        automation.addToWatchlist(user1);
    }

    function test_AddToWatchlist_RevertsIfZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(AutomationConsumer.AutomationConsumer__InvalidAddress.selector);
        automation.addToWatchlist(address(0));
    }

    function test_AddToWatchlist_RevertsIfAlreadyInWatchlist() public {
        vm.startPrank(owner);
        automation.addToWatchlist(user1);

        vm.expectRevert(AutomationConsumer.AutomationConsumer__AlreadyInWatchlist.selector);
        automation.addToWatchlist(user1);
        vm.stopPrank();
    }

    function test_BatchAddToWatchlist_AddsMultipleAddresses() public {
        address[] memory users = new address[](3);
        users[0] = user1;
        users[1] = user2;
        users[2] = user3;

        vm.prank(owner);
        automation.batchAddToWatchlist(users);

        assertTrue(automation.isInWatchlist(user1));
        assertTrue(automation.isInWatchlist(user2));
        assertTrue(automation.isInWatchlist(user3));
        assertEq(automation.getWatchlistSize(), 3);
    }

    function test_BatchAddToWatchlist_SkipsZeroAddresses() public {
        address[] memory users = new address[](3);
        users[0] = user1;
        users[1] = address(0);
        users[2] = user2;

        vm.prank(owner);
        automation.batchAddToWatchlist(users);

        assertTrue(automation.isInWatchlist(user1));
        assertFalse(automation.isInWatchlist(address(0)));
        assertTrue(automation.isInWatchlist(user2));
        assertEq(automation.getWatchlistSize(), 2);
    }

    function test_RemoveFromWatchlist_RemovesAddress() public {
        vm.startPrank(owner);
        automation.addToWatchlist(user1);

        vm.expectEmit(true, true, true, true);
        emit RemovedFromWatchlist(user1);

        automation.removeFromWatchlist(user1);
        vm.stopPrank();

        assertFalse(automation.isInWatchlist(user1));
        assertEq(automation.getWatchlistSize(), 0);
    }

    function test_RemoveFromWatchlist_RevertsIfNotInWatchlist() public {
        vm.prank(owner);
        vm.expectRevert(AutomationConsumer.AutomationConsumer__NotInWatchlist.selector);
        automation.removeFromWatchlist(user1);
    }

    function test_RemoveFromWatchlist_MaintainsOtherAddresses() public {
        vm.startPrank(owner);
        automation.addToWatchlist(user1);
        automation.addToWatchlist(user2);
        automation.addToWatchlist(user3);

        automation.removeFromWatchlist(user2);
        vm.stopPrank();

        assertTrue(automation.isInWatchlist(user1));
        assertFalse(automation.isInWatchlist(user2));
        assertTrue(automation.isInWatchlist(user3));
        assertEq(automation.getWatchlistSize(), 2);
    }

    /*//////////////////////////////////////////////////////////////
                        RENEWAL QUEUE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_QueueRenewals_QueuesRenewals() public {
        AutomationConsumer.PendingRenewal[] memory renewals = new AutomationConsumer.PendingRenewal[](2);
        renewals[0] =
            AutomationConsumer.PendingRenewal({user: user1, newExpiry: block.timestamp + 7 days, signature: bytes("")});
        renewals[1] =
            AutomationConsumer.PendingRenewal({user: user2, newExpiry: block.timestamp + 7 days, signature: bytes("")});

        vm.expectEmit(true, true, true, true);
        emit RenewalsQueued(2);

        vm.prank(owner);
        automation.queueRenewals(renewals);

        assertEq(automation.getPendingRenewalsCount(), 2);
    }

    function test_ClearPendingRenewals_ClearsQueue() public {
        AutomationConsumer.PendingRenewal[] memory renewals = new AutomationConsumer.PendingRenewal[](1);
        renewals[0] =
            AutomationConsumer.PendingRenewal({user: user1, newExpiry: block.timestamp + 7 days, signature: bytes("")});

        vm.startPrank(owner);
        automation.queueRenewals(renewals);
        assertEq(automation.getPendingRenewalsCount(), 1);

        automation.clearPendingRenewals();
        assertEq(automation.getPendingRenewalsCount(), 0);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        CONFIGURATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetConfig_UpdatesConfiguration() public {
        uint256 newThreshold = 3 days;
        uint256 newCheckBatch = 50;
        uint256 newRenewalBatch = 5;

        vm.expectEmit(true, true, true, true);
        emit ConfigUpdated(newThreshold, newCheckBatch, newRenewalBatch);

        vm.prank(owner);
        automation.setConfig(newThreshold, newCheckBatch, newRenewalBatch);

        assertEq(automation.renewalThreshold(), newThreshold);
        assertEq(automation.maxCheckBatchSize(), newCheckBatch);
        assertEq(automation.maxRenewalBatchSize(), newRenewalBatch);
    }

    function test_SetConfig_RevertsIfZeroBatchSize() public {
        vm.prank(owner);
        vm.expectRevert(AutomationConsumer.AutomationConsumer__InvalidBatchSize.selector);
        automation.setConfig(2 days, 0, 10);
    }

    function test_SetUpkeepInterval_UpdatesInterval() public {
        uint256 newInterval = 2 hours;

        vm.prank(owner);
        automation.setUpkeepInterval(newInterval);

        assertEq(automation.upkeepInterval(), newInterval);
    }

    /*//////////////////////////////////////////////////////////////
                        PAUSE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Pause_PausesContract() public {
        vm.prank(owner);
        automation.pause();

        assertTrue(automation.paused());
    }

    function test_Unpause_UnpausesContract() public {
        vm.startPrank(owner);
        automation.pause();
        automation.unpause();
        vm.stopPrank();

        assertFalse(automation.paused());
    }

    /*//////////////////////////////////////////////////////////////
                        CHECK UPKEEP TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CheckUpkeep_ReturnsFalseWhenIntervalNotPassed() public {
        (bool upkeepNeeded,) = automation.checkUpkeep("");

        // First check should fail because lastUpkeepTimestamp is 0
        // and we need to wait for upkeepInterval
        assertFalse(upkeepNeeded);
    }

    function test_CheckUpkeep_ReturnsTrueWhenPendingRenewals() public {
        // Warp past interval
        vm.warp(block.timestamp + automation.upkeepInterval() + 1);

        // Queue a renewal
        AutomationConsumer.PendingRenewal[] memory renewals = new AutomationConsumer.PendingRenewal[](1);
        renewals[0] =
            AutomationConsumer.PendingRenewal({user: user1, newExpiry: block.timestamp + 7 days, signature: bytes("")});

        vm.prank(owner);
        automation.queueRenewals(renewals);

        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");

        assertTrue(upkeepNeeded);
        assertTrue(abi.decode(performData, (bool)));
    }

    /*//////////////////////////////////////////////////////////////
                        CHECK RENEWAL NEEDED TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CheckRenewalNeeded_ReturnsFalseForNonExistent() public view {
        (bool needsRenewal, uint256 expiry) = automation.checkRenewalNeeded(user1);

        assertFalse(needsRenewal);
        assertEq(expiry, 0);
    }

    function test_CheckRenewalNeeded_ReturnsTrueForExpiring() public {
        // Mint credential expiring soon
        uint256 expiry = block.timestamp + 1 days; // Within renewal threshold
        _mintCredential(user1, CredentialNFT.Tier.Verified, expiry);

        (bool needsRenewal, uint256 credExpiry) = automation.checkRenewalNeeded(user1);

        assertTrue(needsRenewal);
        assertEq(credExpiry, expiry);
    }

    function test_CheckRenewalNeeded_ReturnsFalseForNotExpiring() public {
        // Mint credential with long expiry
        uint256 expiry = block.timestamp + 30 days;
        _mintCredential(user1, CredentialNFT.Tier.Verified, expiry);

        (bool needsRenewal, uint256 credExpiry) = automation.checkRenewalNeeded(user1);

        assertFalse(needsRenewal);
        assertEq(credExpiry, expiry);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetWatchlist_ReturnsAllAddresses() public {
        vm.startPrank(owner);
        automation.addToWatchlist(user1);
        automation.addToWatchlist(user2);
        vm.stopPrank();

        address[] memory watchlist = automation.getWatchlist();

        assertEq(watchlist.length, 2);
        assertEq(watchlist[0], user1);
        assertEq(watchlist[1], user2);
    }

    function test_GetExpiringAddresses_ReturnsExpiringOnly() public {
        // Add users to watchlist
        vm.startPrank(owner);
        automation.addToWatchlist(user1);
        automation.addToWatchlist(user2);
        vm.stopPrank();

        // Mint credentials with different expiries
        _mintCredential(user1, CredentialNFT.Tier.Verified, block.timestamp + 1 days); // Expiring
        _mintCredential(user2, CredentialNFT.Tier.Verified, block.timestamp + 30 days); // Not expiring

        address[] memory expiring = automation.getExpiringAddresses();

        assertEq(expiring.length, 1);
        assertEq(expiring[0], user1);
    }

    /*//////////////////////////////////////////////////////////////
                         HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

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
}
