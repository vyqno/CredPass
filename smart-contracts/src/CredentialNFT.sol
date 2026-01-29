// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CredentialNFT
 * @author CredPass Team
 * @notice Soulbound NFT credentials for wallet reputation-based access control
 * @dev Implements ERC721 with transfer restrictions (soulbound) and EIP-712 signature verification.
 *      Uses nonce-based replay protection and time-bounded expiry for credential lifecycle management.
 * @custom:security-contact security@credpass.xyz
 */
contract CredentialNFT is ERC721, EIP712, Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;

    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    /// @notice Credential tier levels
    /// @dev Verified (0) < Trusted (1) < Elite (2)
    enum Tier {
        Verified,
        Trusted,
        Elite
    }

    /// @notice Credential data structure
    /// @param tier The credential tier level
    /// @param expiry Unix timestamp when credential expires
    /// @param mintedAt Unix timestamp when credential was minted
    /// @param exists Whether the credential has been minted
    struct Credential {
        Tier tier;
        uint256 expiry;
        uint256 mintedAt;
        bool exists;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Mapping of user address to their credential
    mapping(address user => Credential credential) public credentials;

    /// @notice Mapping of user address to their current nonce (for replay protection)
    mapping(address user => uint256 nonce) public nonces;

    /// @notice Mapping of user address to their token ID
    mapping(address user => uint256 tokenId) private s_tokenIds;

    /// @notice Address authorized to sign mint/renew attestations
    address public verifier;

    /// @notice Counter for token IDs
    uint256 private s_tokenIdCounter;

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Minimum credential validity duration (1 day)
    uint256 public constant MIN_EXPIRY_DURATION = 1 days;

    /// @notice Maximum credential validity duration (365 days)
    uint256 public constant MAX_EXPIRY_DURATION = 365 days;

    /// @notice Maximum future expiry allowed (2 years)
    uint256 public constant MAX_FUTURE_EXPIRY = 730 days;

    /// @notice EIP-712 typehash for mint operations
    bytes32 private constant MINT_TYPEHASH =
        keccak256("Mint(address user,uint8 tier,uint256 expiry,uint256 nonce)");

    /// @notice EIP-712 typehash for renew operations
    bytes32 private constant RENEW_TYPEHASH =
        keccak256("Renew(address user,uint256 newExpiry,uint256 nonce)");

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a credential is minted
    /// @param user Address receiving the credential
    /// @param tier Tier level of the credential
    /// @param expiry Expiry timestamp
    /// @param tokenId Token ID minted
    event CredentialMinted(
        address indexed user,
        Tier tier,
        uint256 expiry,
        uint256 tokenId
    );

    /// @notice Emitted when a credential is renewed
    /// @param user Address whose credential was renewed
    /// @param newExpiry New expiry timestamp
    /// @param oldExpiry Previous expiry timestamp
    event CredentialRenewed(
        address indexed user,
        uint256 newExpiry,
        uint256 oldExpiry
    );

    /// @notice Emitted when a credential is revoked
    /// @param user Address whose credential was revoked
    /// @param tokenId Token ID that was burned
    event CredentialRevoked(address indexed user, uint256 tokenId);

    /// @notice Emitted when the verifier address is updated
    /// @param oldVerifier Previous verifier address
    /// @param newVerifier New verifier address
    event VerifierUpdated(
        address indexed oldVerifier,
        address indexed newVerifier
    );

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when signature verification fails
    error CredentialNFT__InvalidSignature();

    /// @notice Thrown when attempting to use an expired credential
    error CredentialNFT__ExpiredCredential();

    /// @notice Thrown when credential doesn't exist
    error CredentialNFT__NoCredential();

    /// @notice Thrown when expiry is not in the future
    error CredentialNFT__ExpiryMustBeFuture();

    /// @notice Thrown when expiry is too far in the future
    error CredentialNFT__ExpiryTooFarInFuture();

    /// @notice Thrown when expiry duration is too short
    error CredentialNFT__ExpiryDurationTooShort();

    /// @notice Thrown when attempting to transfer a soulbound token
    error CredentialNFT__TransferDisabled();

    /// @notice Thrown when zero address is provided
    error CredentialNFT__InvalidAddress();

    /// @notice Thrown when invalid tier is provided
    error CredentialNFT__InvalidTier();

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Validates that an address is not zero
    /// @param _address Address to validate
    modifier validAddress(address _address) {
        if (_address == address(0)) revert CredentialNFT__InvalidAddress();
        _;
    }

    /// @notice Validates that a tier is valid (0-2)
    /// @param _tier Tier to validate
    modifier validTier(Tier _tier) {
        if (uint8(_tier) > 2) revert CredentialNFT__InvalidTier();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the CredentialNFT contract
    /// @param _verifier Address authorized to sign attestations
    /// @dev Sets up ERC721 and EIP712 with domain separator
    constructor(
        address _verifier
    )
        ERC721("CredPass Credential", "CRED")
        EIP712("CredPass", "1")
        Ownable(msg.sender)
        validAddress(_verifier)
    {
        verifier = _verifier;
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mints a new credential NFT to a user
     * @param user Address to receive the credential
     * @param tier Tier level (0=Verified, 1=Trusted, 2=Elite)
     * @param expiry Unix timestamp when credential expires
     * @param signature EIP-712 signature from verifier
     * @dev Requires valid signature from verifier address
     * @dev Increments nonce to prevent replay attacks
     * @dev Reverts if expiry is invalid or signature is incorrect
     */
    function mint(
        address user,
        Tier tier,
        uint256 expiry,
        bytes calldata signature
    ) external nonReentrant whenNotPaused validAddress(user) validTier(tier) {
        // CEI: Checks
        if (expiry <= block.timestamp) {
            revert CredentialNFT__ExpiryMustBeFuture();
        }
        if (expiry > block.timestamp + MAX_FUTURE_EXPIRY) {
            revert CredentialNFT__ExpiryTooFarInFuture();
        }
        if (expiry < block.timestamp + MIN_EXPIRY_DURATION) {
            revert CredentialNFT__ExpiryDurationTooShort();
        }

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(MINT_TYPEHASH, user, uint8(tier), expiry, nonces[user])
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        if (signer != verifier) revert CredentialNFT__InvalidSignature();

        // CEI: Effects
        nonces[user]++;

        uint256 tokenId;
        if (!credentials[user].exists) {
            s_tokenIdCounter++;
            tokenId = s_tokenIdCounter;
            s_tokenIds[user] = tokenId;
        } else {
            tokenId = s_tokenIds[user];
        }

        credentials[user] = Credential({
            tier: tier,
            expiry: expiry,
            mintedAt: block.timestamp,
            exists: true
        });

        emit CredentialMinted(user, tier, expiry, tokenId);

        // CEI: Interactions
        if (balanceOf(user) == 0) {
            _safeMint(user, tokenId);
        }
    }

    /**
     * @notice Renews an existing credential with new expiry
     * @param user Address whose credential to renew
     * @param newExpiry New expiry timestamp
     * @param signature EIP-712 signature from verifier
     * @dev Requires credential to exist
     * @dev Increments nonce to prevent replay attacks
     */
    function renew(
        address user,
        uint256 newExpiry,
        bytes calldata signature
    ) external nonReentrant whenNotPaused validAddress(user) {
        // CEI: Checks
        if (!credentials[user].exists) revert CredentialNFT__NoCredential();
        if (newExpiry <= block.timestamp) {
            revert CredentialNFT__ExpiryMustBeFuture();
        }
        if (newExpiry > block.timestamp + MAX_FUTURE_EXPIRY) {
            revert CredentialNFT__ExpiryTooFarInFuture();
        }

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(RENEW_TYPEHASH, user, newExpiry, nonces[user])
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        if (signer != verifier) revert CredentialNFT__InvalidSignature();

        // CEI: Effects
        uint256 oldExpiry = credentials[user].expiry;
        nonces[user]++;
        credentials[user].expiry = newExpiry;

        emit CredentialRenewed(user, newExpiry, oldExpiry);
    }

    /**
     * @notice Revokes a user's credential (owner only)
     * @param user Address whose credential to revoke
     * @dev Burns the NFT and deletes credential data
     */
    function revoke(address user) external onlyOwner validAddress(user) {
        if (!credentials[user].exists) revert CredentialNFT__NoCredential();

        uint256 tokenId = s_tokenIds[user];

        // CEI: Effects
        delete credentials[user];
        delete s_tokenIds[user];

        emit CredentialRevoked(user, tokenId);

        // CEI: Interactions
        _burn(tokenId);
    }

    /**
     * @notice Updates the verifier address (owner only)
     * @param _verifier New verifier address
     */
    function setVerifier(
        address _verifier
    ) external onlyOwner validAddress(_verifier) {
        address oldVerifier = verifier;
        verifier = _verifier;
        emit VerifierUpdated(oldVerifier, _verifier);
    }

    /**
     * @notice Pauses the contract (owner only)
     * @dev Prevents minting and renewing while paused
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the contract (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if a user has a valid credential of required tier or higher
     * @param user Address to check
     * @param requiredTier Minimum tier required
     * @return bool True if user has valid credential of sufficient tier
     */
    function isValid(
        address user,
        Tier requiredTier
    ) external view returns (bool) {
        Credential memory cred = credentials[user];
        return
            cred.exists &&
            cred.expiry > block.timestamp &&
            uint8(cred.tier) >= uint8(requiredTier);
    }

    /**
     * @notice Gets complete credential details for a user
     * @param user Address to query
     * @return tier The credential tier
     * @return expiry The expiry timestamp
     * @return mintedAt When the credential was minted
     * @return exists Whether the credential exists
     * @return isCurrentlyValid Whether the credential is currently valid
     */
    function getCredential(
        address user
    )
        external
        view
        returns (
            Tier tier,
            uint256 expiry,
            uint256 mintedAt,
            bool exists,
            bool isCurrentlyValid
        )
    {
        Credential memory cred = credentials[user];
        return (
            cred.tier,
            cred.expiry,
            cred.mintedAt,
            cred.exists,
            cred.exists && cred.expiry > block.timestamp
        );
    }

    /**
     * @notice Gets the token ID for a user
     * @param user Address to query
     * @return tokenId The token ID (0 if no credential)
     */
    function getTokenId(address user) external view returns (uint256) {
        return s_tokenIds[user];
    }

    /**
     * @notice Gets the current nonce for a user
     * @param user Address to query
     * @return nonce Current nonce value
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    /**
     * @notice Batch checks validity for multiple users
     * @param users Array of addresses to check
     * @param requiredTier Minimum tier required
     * @return results Array of validity results
     */
    function batchIsValid(
        address[] calldata users,
        Tier requiredTier
    ) external view returns (bool[] memory results) {
        results = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            Credential memory cred = credentials[users[i]];
            results[i] =
                cred.exists &&
                cred.expiry > block.timestamp &&
                uint8(cred.tier) >= uint8(requiredTier);
        }
    }

    /**
     * @notice Gets the EIP-712 domain separator
     * @return bytes32 The domain separator
     */
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Converts tier enum to string
     * @param tier Tier enum value
     * @return string Tier name
     */
    function tierName(Tier tier) external pure returns (string memory) {
        if (tier == Tier.Verified) return "Verified";
        if (tier == Tier.Trusted) return "Trusted";
        if (tier == Tier.Elite) return "Elite";
        return "Unknown";
    }

    /**
     * @notice Gets total number of credentials minted
     * @return uint256 Total supply
     */
    function totalSupply() external view returns (uint256) {
        return s_tokenIdCounter;
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Overrides ERC721 _update to make tokens soulbound
     * @dev Prevents transfers but allows minting and burning
     * @param to Recipient address
     * @param tokenId Token ID
     * @param auth Authorized address
     * @return address Previous owner
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from == 0) and burning (to == 0), but not transfers
        if (from != address(0) && to != address(0)) {
            revert CredentialNFT__TransferDisabled();
        }
        return super._update(to, tokenId, auth);
    }
}
