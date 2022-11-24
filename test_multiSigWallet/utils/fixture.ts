import { ethers } from "hardhat";
import type { GnosisSafe, ERC20, CheckExecutor } from "../../typechain-types";
import type { Wallet } from "ethers";

export async function multiSigWalletFixture(
  multiSigWalletCreator: Wallet
): Promise<GnosisSafe> {
  let multiSigWallet: GnosisSafe;

  const MultiSigWallet = await ethers.getContractFactory(
    "GnosisSafe",
    multiSigWalletCreator
  );
  multiSigWallet = await MultiSigWallet.deploy();

  return multiSigWallet;
}

export async function erc20Fixture(creator: Wallet): Promise<ERC20> {
  let erc20: ERC20;

  const ERC20 = await ethers.getContractFactory("ERC20Token", creator);
  erc20 = await ERC20.deploy();

  return erc20;
}
export async function CheckExecutorFixture(
  creator: Wallet,
  multiSigWalletAddress: string
): Promise<CheckExecutor> {
  let checkExecutor: CheckExecutor;

  const checkExecutorContract = await ethers.getContractFactory(
    "CheckExecutor",
    creator
  );
  checkExecutor = await checkExecutorContract.deploy(multiSigWalletAddress);

  return checkExecutor;
}
