import hre from "hardhat";
import type { Wallet } from "ethers";
import { ethers } from "ethers";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const checkExecutorContract = await hre.ethers.getContractFactory(
    "CheckExecutor"
  );

  const multiSigWalletADdress = "";
  //   create and initialize checkExecutor using multiContractWallet.address
  const checkExecutor = await checkExecutorContract.deploy(
    // multiContractWallet.address
    multiSigWalletADdress
  );

  console.log(checkExecutor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error({ errMessage: error.message });
    process.exit(1);
  });
