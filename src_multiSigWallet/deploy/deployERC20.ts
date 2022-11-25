import hre from "hardhat";
import type { Wallet } from "ethers";
import { ethers } from "ethers";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // const MultiContractWalletContract = await hre.ethers.getContractFactory("MultiSigWallet");
  const erc20Contract = await hre.ethers.getContractFactory("ERC20Token");
  const erc20 = await erc20Contract.deploy();

  const res = await erc20
    .connect(deployer)
    .transfer("0xd7f416e52b259fa0e52d3f89fcccffb203ca799f", 1000);

  console.log({ res });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error({ errMessage: error.message });
    process.exit(1);
  });
