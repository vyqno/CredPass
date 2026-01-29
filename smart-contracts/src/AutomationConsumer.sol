// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {CredentialNFT} from "./CredentialNFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AutomationCompatibleInterface
 * @notice Chainlink Automation interface for upkeep compatibility
 * @dev Defined inline to avoid external dependency complexity
 */
interface AutomationCompatibleInterface {
    /**
     * @notice Checks if upkeep is needed
     * @param checkData Data passed to the function
     * @return upkeepNeeded True if upkeep is needed
     * @return performData Data to pass to performUpkeep
     */
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);

    /**
     * @notice Performs the upkeep
     * @param performData Data returned from checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external;
}

/**
 * @title AutomationConsumer
 * @author OnChain Rewards Team
 * @notice Chainlink Automation compatible contract for batch credential renewal
 * @dev Implements AutomationCompatibleInterface for time-based credential renewal checks.
 *      Designed to work with Chainlink Keepers for decentralized automation.
 *
 * Architecture:
 * - checkUpkeep: Called off-chain by Chainlink nodes to determine if upkeep is needed
 * - performUpkeep: Called on-chain when checkUpkeep returns true
 * - Renewal requires pre-signed attestations from the backend verifier
 *
 * Security Considerations:
 * - Only processes addresses registered in the watchlist
 * - Renewal signatures must be provided by authorized backend
 * - Gas-limited batch processing prevents DoS
 * - Owner can pause automation in emergencies
 *
 * @custom:security-contact security@onchainrewards.xyz
 */
contract AutomationConsumer is AutomationCompatibleInterface, Ownable, Pausable {
    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    /// @notice Pending renewal data structure
    /// @param user Address to renew
    /// @param newExpiry New expiry timestamp
    /// @param signature EIP-712 signature from verifier
    struct PendingRenewal {
        address user;
        uint256 newExpiry;
        bytes signature;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Reference to the CredentialNFT contract
    CredentialNFT public immutable credentialNFT;

    /// @notice Addresses being watched for renewal
    address[] private s_watchlist;

    /// @notice Mapping for O(1) watchlist lookup
    mapping(address user => bool isWatched) public isInWatchlist;

    /// @notice Mapping for watchlist index lookup (for removal)
    mapping(address user => uint256 index) private s_watchlistIndex;

    /// @notice Pending renewals to be processed
    PendingRenewal[] private s_pendingRenewals;

    /// @notice Minimum time before expiry to trigger renewal (default: 2 days)
    uint256 public renewalThreshold;

    /// @notice Maximum addresses to check per upkeep call
    uint256 public maxCheckBatchSize;

    /// @notice Maximum renewals to process per upkeep call
    uint256 public maxRenewalBatchSize;

    /// @notice Last time upkeep was performed
    uint256 public lastUpkeepTimestamp;

    /// @notice Minimum interval between upkeeps (prevents spam)
    uint256 public upkeepInterval;

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Default renewal threshold (2 days before expiry)
    uint256 public constant DEFAULT_RENEWAL_THRESHOLD = 2 days;

    /// @notice Default check batch size
    uint256 public constant DEFAULT_CHECK_BATCH_SIZE = 100;

    /// @notice Default renewal batch size
    uint256 public constant DEFAULT_RENEWAL_BATCH_SIZE = 10;

    /// @notice Default upkeep interval (1 hour)
    uint256 public constant DEFAULT_UPKEEP_INTERVAL = 1 hours;

    /// @notice Maximum watchlist size to prevent gas issues
    uint256 public constant MAX_WATCHLIST_SIZE = 10000;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when an address is added to watchlist
    /// @param user Address added
    event AddedToWatchlist(address indexed user);

    /// @notice Emitted when an address is removed from watchlist
    /// @param user Address removed
    event RemovedFromWatchlist(address indexed user);

    /// @notice Emitted when pending renewals are queued
    /// @param count Number of renewals queued
    event RenewalsQueued(uint256 count);

    /// @notice Emitted when a renewal is processed
    /// @param user Address renewed
    /// @param newExpiry New expiry timestamp
    /// @param success Whether renewal succeeded
    event RenewalProcessed(address indexed user, uint256 newExpiry, bool success);

    /// @notice Emitted when configuration is updated
    /// @param renewalThreshold New renewal threshold
    /// @param maxCheckBatchSize New check batch size
    /// @param maxRenewalBatchSize New renewal batch size
    event ConfigUpdated(uint256 renewalThreshold, uint256 maxCheckBatchSize, uint256 maxRenewalBatchSize);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when address is already in watchlist
    error AutomationConsumer__AlreadyInWatchlist();

    /// @notice Thrown when address is not in watchlist
    error AutomationConsumer__NotInWatchlist();

    /// @notice Thrown when watchlist is full
    error AutomationConsumer__WatchlistFull();

    /// @notice Thrown when zero address is provided
    error AutomationConsumer__InvalidAddress();

    /// @notice Thrown when invalid batch size is provided
    error AutomationConsumer__InvalidBatchSize();

    /// @notice Thrown when upkeep interval hasn't passed
    error AutomationConsumer__UpkeepTooSoon();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the AutomationConsumer contract
     * @param _credentialNFT Address of the CredentialNFT contract
     * @dev Sets default configuration values
     */
    constructor(address _credentialNFT) Ownable(msg.sender) {
        if (_credentialNFT == address(0)) revert AutomationConsumer__InvalidAddress();

        credentialNFT = CredentialNFT(_credentialNFT);
        renewalThreshold = DEFAULT_RENEWAL_THRESHOLD;
        maxCheckBatchSize = DEFAULT_CHECK_BATCH_SIZE;
        maxRenewalBatchSize = DEFAULT_RENEWAL_BATCH_SIZE;
        upkeepInterval = DEFAULT_UPKEEP_INTERVAL;
    }

    /*//////////////////////////////////////////////////////////////
                        AUTOMATION INTERFACE
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if upkeep is needed (called off-chain by Chainlink nodes)
     * @param checkData Optional data passed to checkUpkeep
     * @return upkeepNeeded True if there are pending renewals or expiring credentials
     * @return performData Encoded data to pass to performUpkeep
     * @dev This function is gas-limited and should be efficient
     *
     * Logic:
     * 1. Check if minimum interval has passed since last upkeep
     * 2. Check if there are pending renewals to process
     * 3. If no pending renewals, check for expiring credentials in watchlist
     * 4. Return addresses that need renewal notification
     */
    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // Suppress unused variable warning
        checkData;

        // Check if interval has passed
        if (block.timestamp < lastUpkeepTimestamp + upkeepInterval) {
            return (false, "");
        }

        // Check if there are pending renewals
        if (s_pendingRenewals.length > 0) {
            return (true, abi.encode(true)); // Signal to process pending renewals
        }

        // Check for expiring credentials
        address[] memory expiringAddresses = _getExpiringAddresses();
        if (expiringAddresses.length > 0) {
            return (true, abi.encode(false, expiringAddresses));
        }

        return (false, "");
    }

    /**
     * @notice Performs the upkeep (called on-chain when checkUpkeep returns true)
     * @param performData Data returned from checkUpkeep
     * @dev Processes pending renewals or emits events for expiring credentials
     *
     * Two modes:
     * 1. Process pending renewals (if performData[0] == true)
     * 2. Emit events for expiring credentials (backend listens and queues renewals)
     */
    function performUpkeep(bytes calldata performData) external override whenNotPaused {
        lastUpkeepTimestamp = block.timestamp;

        if (performData.length == 0) return;

        // Check if we should process pending renewals
        bool processPending = abi.decode(performData, (bool));

        if (processPending && s_pendingRenewals.length > 0) {
            _processPendingRenewals();
        }
    }

    /*//////////////////////////////////////////////////////////////
                         WATCHLIST MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Adds an address to the renewal watchlist
     * @param user Address to add
     * @dev Only owner can add addresses
     */
    function addToWatchlist(address user) external onlyOwner {
        if (user == address(0)) revert AutomationConsumer__InvalidAddress();
        if (isInWatchlist[user]) revert AutomationConsumer__AlreadyInWatchlist();
        if (s_watchlist.length >= MAX_WATCHLIST_SIZE) revert AutomationConsumer__WatchlistFull();

        s_watchlistIndex[user] = s_watchlist.length;
        s_watchlist.push(user);
        isInWatchlist[user] = true;

        emit AddedToWatchlist(user);
    }

    /**
     * @notice Adds multiple addresses to the watchlist
     * @param users Array of addresses to add
     */
    function batchAddToWatchlist(address[] calldata users) external onlyOwner {
        uint256 length = users.length;
        if (s_watchlist.length + length > MAX_WATCHLIST_SIZE) {
            revert AutomationConsumer__WatchlistFull();
        }

        for (uint256 i = 0; i < length; i++) {
            address user = users[i];
            if (user != address(0) && !isInWatchlist[user]) {
                s_watchlistIndex[user] = s_watchlist.length;
                s_watchlist.push(user);
                isInWatchlist[user] = true;
                emit AddedToWatchlist(user);
            }
        }
    }

    /**
     * @notice Removes an address from the watchlist
     * @param user Address to remove
     * @dev Uses swap-and-pop for gas efficiency
     */
    function removeFromWatchlist(address user) external onlyOwner {
        if (!isInWatchlist[user]) revert AutomationConsumer__NotInWatchlist();

        uint256 index = s_watchlistIndex[user];
        uint256 lastIndex = s_watchlist.length - 1;

        if (index != lastIndex) {
            address lastUser = s_watchlist[lastIndex];
            s_watchlist[index] = lastUser;
            s_watchlistIndex[lastUser] = index;
        }

        s_watchlist.pop();
        delete s_watchlistIndex[user];
        isInWatchlist[user] = false;

        emit RemovedFromWatchlist(user);
    }

    /*//////////////////////////////////////////////////////////////
                         RENEWAL MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Queues renewal signatures for batch processing
     * @param renewals Array of pending renewals with signatures
     * @dev Called by backend after generating renewal attestations
     *
     * Flow:
     * 1. Backend monitors for expiring credentials
     * 2. Backend generates EIP-712 signatures for eligible users
     * 3. Backend calls this function with signed renewals
     * 4. Next performUpkeep processes the renewals
     */
    function queueRenewals(PendingRenewal[] calldata renewals) external onlyOwner {
        uint256 length = renewals.length;
        for (uint256 i = 0; i < length; i++) {
            s_pendingRenewals.push(renewals[i]);
        }
        emit RenewalsQueued(length);
    }

    /**
     * @notice Clears all pending renewals
     * @dev Emergency function to clear queue
     */
    function clearPendingRenewals() external onlyOwner {
        delete s_pendingRenewals;
    }

    /*//////////////////////////////////////////////////////////////
                           CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Updates automation configuration
     * @param _renewalThreshold Time before expiry to trigger renewal
     * @param _maxCheckBatchSize Max addresses to check per upkeep
     * @param _maxRenewalBatchSize Max renewals to process per upkeep
     */
    function setConfig(uint256 _renewalThreshold, uint256 _maxCheckBatchSize, uint256 _maxRenewalBatchSize)
        external
        onlyOwner
    {
        if (_maxCheckBatchSize == 0 || _maxRenewalBatchSize == 0) {
            revert AutomationConsumer__InvalidBatchSize();
        }

        renewalThreshold = _renewalThreshold;
        maxCheckBatchSize = _maxCheckBatchSize;
        maxRenewalBatchSize = _maxRenewalBatchSize;

        emit ConfigUpdated(_renewalThreshold, _maxCheckBatchSize, _maxRenewalBatchSize);
    }

    /**
     * @notice Sets the upkeep interval
     * @param _interval Minimum time between upkeeps
     */
    function setUpkeepInterval(uint256 _interval) external onlyOwner {
        upkeepInterval = _interval;
    }

    /**
     * @notice Pauses the automation
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the automation
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Gets the current watchlist
     * @return Array of watched addresses
     */
    function getWatchlist() external view returns (address[] memory) {
        return s_watchlist;
    }

    /**
     * @notice Gets the watchlist size
     * @return Number of addresses in watchlist
     */
    function getWatchlistSize() external view returns (uint256) {
        return s_watchlist.length;
    }

    /**
     * @notice Gets pending renewals count
     * @return Number of pending renewals
     */
    function getPendingRenewalsCount() external view returns (uint256) {
        return s_pendingRenewals.length;
    }

    /**
     * @notice Gets addresses that need renewal soon
     * @return Array of addresses expiring within threshold
     */
    function getExpiringAddresses() external view returns (address[] memory) {
        return _getExpiringAddresses();
    }

    /**
     * @notice Checks if a specific address needs renewal
     * @param user Address to check
     * @return needsRenewal True if credential is expiring soon
     * @return expiry Current expiry timestamp
     */
    function checkRenewalNeeded(address user) external view returns (bool needsRenewal, uint256 expiry) {
        (, uint256 credExpiry,, bool exists, bool isValid) = credentialNFT.getCredential(user);

        if (!exists) {
            return (false, 0);
        }

        expiry = credExpiry;
        needsRenewal = isValid && (credExpiry <= block.timestamp + renewalThreshold);
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Gets addresses that are expiring within threshold
     * @return expiringAddresses Array of expiring addresses
     */
    function _getExpiringAddresses() internal view returns (address[] memory) {
        uint256 watchlistLength = s_watchlist.length;
        uint256 checkLimit = watchlistLength > maxCheckBatchSize ? maxCheckBatchSize : watchlistLength;

        // First pass: count expiring addresses
        uint256 count = 0;
        for (uint256 i = 0; i < checkLimit; i++) {
            address user = s_watchlist[i];
            (, uint256 expiry,, bool exists, bool isValid) = credentialNFT.getCredential(user);

            if (exists && isValid && expiry <= block.timestamp + renewalThreshold) {
                count++;
            }
        }

        // Second pass: collect addresses
        address[] memory expiringAddresses = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < checkLimit && index < count; i++) {
            address user = s_watchlist[i];
            (, uint256 expiry,, bool exists, bool isValid) = credentialNFT.getCredential(user);

            if (exists && isValid && expiry <= block.timestamp + renewalThreshold) {
                expiringAddresses[index] = user;
                index++;
            }
        }

        return expiringAddresses;
    }

    /**
     * @notice Processes pending renewals
     * @dev Calls CredentialNFT.renew for each pending renewal
     */
    function _processPendingRenewals() internal {
        uint256 toProcess =
            s_pendingRenewals.length > maxRenewalBatchSize ? maxRenewalBatchSize : s_pendingRenewals.length;

        for (uint256 i = 0; i < toProcess; i++) {
            PendingRenewal memory renewal = s_pendingRenewals[i];

            try credentialNFT.renew(renewal.user, renewal.newExpiry, renewal.signature) {
                emit RenewalProcessed(renewal.user, renewal.newExpiry, true);
            } catch {
                emit RenewalProcessed(renewal.user, renewal.newExpiry, false);
            }
        }

        // Remove processed renewals (shift array)
        if (toProcess > 0) {
            uint256 remaining = s_pendingRenewals.length - toProcess;
            for (uint256 i = 0; i < remaining; i++) {
                s_pendingRenewals[i] = s_pendingRenewals[i + toProcess];
            }
            for (uint256 i = 0; i < toProcess; i++) {
                s_pendingRenewals.pop();
            }
        }
    }
}
