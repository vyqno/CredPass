// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {CredentialNFT} from "../src/CredentialNFT.sol";
import {AutomationConsumer} from "../src/AutomationConsumer.sol";

/**
 * @title DeployAll
 * @author OnChain Rewards Team
 * @notice Comprehensive deployment script for all OnChain Rewards contracts
 * @dev Deploys CredentialNFT and AutomationConsumer to Sepolia testnet or local Anvil
 *
 * Usage:
 *   # Deploy to Sepolia
 *   forge script script/DeployAll.s.sol:DeployAll --rpc-url sepolia --broadcast --verify
 *
 *   # Deploy to local anvil
 *   forge script script/DeployAll.s.sol:DeployAll --rpc-url http://localhost:8545 --broadcast
 *
 * Required Environment Variables:
 *   - AGENT_WALLET_ADDRESS: Address authorized to sign attestations
 *   - PRIVATE_KEY: Deployer's private key (for broadcast)
 *   - ETHERSCAN_API_KEY: For verification (optional)
 */
contract DeployAll is Script {
    /*//////////////////////////////////////////////////////////////
                            CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Sepolia chain ID
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;

    /// @notice Local anvil chain ID
    uint256 public constant ANVIL_CHAIN_ID = 31337;

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT
    //////////////////////////////////////////////////////////////*/

    function run() external returns (CredentialNFT credential, AutomationConsumer automation) {
        // Get configuration from environment
        address verifier = vm.envAddress("AGENT_WALLET_ADDRESS");
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("===========================================");
        console2.log("OnChain Rewards Contract Deployment");
        console2.log("===========================================");
        console2.log("Deployer:", deployer);
        console2.log("Verifier:", verifier);
        console2.log("Chain ID:", block.chainid);
        console2.log("-------------------------------------------");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy CredentialNFT
        credential = new CredentialNFT(verifier);
        console2.log("CredentialNFT deployed to:", address(credential));

        // Deploy AutomationConsumer
        automation = new AutomationConsumer(address(credential));
        console2.log("AutomationConsumer deployed to:", address(automation));

        vm.stopBroadcast();

        // Log deployment summary
        console2.log("-------------------------------------------");
        console2.log("DEPLOYMENT SUMMARY");
        console2.log("-------------------------------------------");
        console2.log("CredentialNFT:", address(credential));
        console2.log("  - Name:", credential.name());
        console2.log("  - Symbol:", credential.symbol());
        console2.log("  - Verifier:", credential.verifier());
        console2.log("  - Owner:", credential.owner());
        console2.log("");
        console2.log("AutomationConsumer:", address(automation));
        console2.log("  - CredentialNFT:", address(automation.credentialNFT()));
        console2.log("  - Renewal Threshold:", automation.renewalThreshold());
        console2.log("  - Owner:", automation.owner());
        console2.log("===========================================");

        // Generate deployment artifacts
        _writeDeploymentArtifacts(address(credential), address(automation), verifier);

        return (credential, automation);
    }

    /*//////////////////////////////////////////////////////////////
                            HELPERS
    //////////////////////////////////////////////////////////////*/

    function _writeDeploymentArtifacts(address credentialAddr, address automationAddr, address verifier) internal {
        string memory json = string.concat(
            '{"network":"',
            _getNetworkName(),
            '","chainId":',
            vm.toString(block.chainid),
            ',"contracts":{"CredentialNFT":"',
            vm.toString(credentialAddr),
            '","AutomationConsumer":"',
            vm.toString(automationAddr),
            '"},"verifier":"',
            vm.toString(verifier),
            '","deployedAt":',
            vm.toString(block.timestamp),
            "}"
        );

        string memory path = string.concat("deployments/", _getNetworkName(), ".json");

        vm.writeFile(path, json);
        console2.log("Deployment artifacts written to:", path);
    }

    function _getNetworkName() internal view returns (string memory) {
        if (block.chainid == SEPOLIA_CHAIN_ID) return "sepolia";
        if (block.chainid == ANVIL_CHAIN_ID) return "anvil";
        return vm.toString(block.chainid);
    }
}

/**
 * @title DeployCredentialOnly
 * @notice Deploy only the CredentialNFT contract
 */
contract DeployCredentialOnly is Script {
    function run() external returns (CredentialNFT credential) {
        address verifier = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast();
        credential = new CredentialNFT(verifier);
        vm.stopBroadcast();

        console2.log("CredentialNFT deployed to:", address(credential));
        console2.log("Verifier:", verifier);

        return credential;
    }
}

/**
 * @title DeployAutomationOnly
 * @notice Deploy only the AutomationConsumer contract (requires existing CredentialNFT)
 */
contract DeployAutomationOnly is Script {
    function run() external returns (AutomationConsumer automation) {
        address credentialNFT = vm.envAddress("CREDENTIAL_NFT_ADDRESS");

        vm.startBroadcast();
        automation = new AutomationConsumer(credentialNFT);
        vm.stopBroadcast();

        console2.log("AutomationConsumer deployed to:", address(automation));
        console2.log("CredentialNFT:", credentialNFT);

        return automation;
    }
}
