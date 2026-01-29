// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CredentialNFT.sol";

contract DeployScript is Script {
    function run() external {
        // Get verifier address from environment
        address verifier = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast();

        CredentialNFT credential = new CredentialNFT(verifier);

        console.log("CredentialNFT deployed to:", address(credential));
        console.log("Verifier set to:", verifier);

        vm.stopBroadcast();
    }
}
