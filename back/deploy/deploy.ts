import { Wallet } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

if (!PRIVATE_KEY)
  throw "⛔️ Private key not detected! Add it to the .env file!";

export default async function(hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script`);

  // Initialize the wallet using the private key.
  const wallet = new Wallet(PRIVATE_KEY);

  // Create deployer object and load the artifact of the contracts you want to deploy.
  const deployer = new Deployer(hre, wallet);

  // Load artifacts for the PermitTokenContract and SpenderContract.
  const PermitTokenArtifact = await deployer.loadArtifact("V1_Token");
  const permitTokenContract = await deployer.deploy(PermitTokenArtifact);
  console.log("PermitTokenContract deployed to:", permitTokenContract.address);

  // Deploy SpenderContract with the address of the previously deployed PermitTokenContract
  const SpenderArtifact = await deployer.loadArtifact("VotingContract");
  const spenderContract = await deployer.deploy(SpenderArtifact, [permitTokenContract.address]);
  console.log("SpenderContract deployed to:", spenderContract.address);

  // Add any additional steps or logging you need here.
}
