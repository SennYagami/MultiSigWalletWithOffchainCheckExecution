import hre from "hardhat";
import type { Wallet } from "ethers";
import { ethers } from "ethers";
import { multiSigWalletFixture } from "../../test_multiSigWallet/utils/fixture";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const MultiSigContractWalletContract = await hre.ethers.getContractFactory(
    "GnosisSafe"
  );
  const multiSigWallet = await MultiSigContractWalletContract.deploy();

  console.log(multiSigWallet.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error({ errMessage: error.message });
    process.exit(1);
  });
