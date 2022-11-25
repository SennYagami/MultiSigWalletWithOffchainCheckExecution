import hre from "hardhat";
import type { Wallet } from "ethers";
import { ethers } from "ethers";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const erc20ContractAddress = "";
  const erc20Contract = await hre.ethers.getContractAt(
    "ERC20Token",
    erc20ContractAddress
  );

  const multiSigWalletAddress = "";
  const res = await erc20Contract
    .connect(deployer)
    .transfer(multiSigWalletAddress, ethers.utils.parseEther("1000"));

  console.log({ res });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error({ errMessage: error.message });
    process.exit(1);
  });
