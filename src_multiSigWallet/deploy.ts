import hre from "hardhat";
import type { Wallet } from "ethers";
import { ethers } from "ethers";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  //   const MultiSigContractWalletContract = await hre.ethers.getContractFactory(
  //     "GnosisSafe"
  //   );
  //   const multiSigContractWallet = await MultiSigContractWalletContract.deploy();

  //   const checkExecutorContract = await hre.ethers.getContractFactory(
  //     "CheckExecutor"
  //   );
  //   //   create and initialize checkExecutor using multiContractWallet.address
  //   const checkExecutor = await checkExecutorContract.deploy(
  //     // multiContractWallet.address
  //     "0xd7f416e52b259fa0e52d3f89fcccffb203ca799f"
  //   );

  //   console.log(checkExecutor.address);

  //   const owners: string[] = [
  //     "0xBCB97D08DEaCE92B11E7E48A825A655cA5493060",
  //     "0x520fEe6dac10736b124E97b9aB8F2d0093721B45",
  //     "0x9f26241b38FA0dB5445499F120DC7aE6865F2107",
  //   ];
  //   const threshold: number = 2;
  //   if (threshold > owners.length || threshold <= 0) {
  //     process.exit(0);
  //   }
  //   const to = ethers.constants.AddressZero;
  //   const data = ethers.utils.toUtf8Bytes("");
  //   const fallbackHandler = ethers.constants.AddressZero;
  //   const paymentToken = ethers.constants.AddressZero;
  //   const payment = 0;
  //   const paymentReceiver = ethers.constants.AddressZero;

  //   const multiContractWallet = await hre.ethers.getContractAt(
  //     "GnosisSafe",
  //     "0xd7f416e52b259fa0e52d3f89fcccffb203ca799f"
  //   );

  //   const res = await multiContractWallet
  //     .connect(deployer)
  //     .setup(
  //       owners,
  //       2,
  //       to,
  //       data,
  //       fallbackHandler,
  //       paymentToken,
  //       payment,
  //       paymentReceiver
  //     );

  //   console.log(123, { res });

  // const MultiContractWalletContract = await hre.ethers.getContractFactory("MultiSigWallet");
  const erc20Contract = await hre.ethers.getContractFactory("ERC20Token");
  const erc20 = await erc20Contract.deploy();

  const res = await erc20
    .connect(deployer)
    .transfer("0xd7f416e52b259fa0e52d3f89fcccffb203ca799f", 1000);

  console.log({ res });

  //   console.log("multiContractWallet address:", multiContractWallet.address);
  //   console.log("checkExecutor address:", checkExecutor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error({ errMessage: error.message });
    process.exit(1);
  });
