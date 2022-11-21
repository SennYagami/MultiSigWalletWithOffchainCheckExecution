import { ethers } from "hardhat";
import type { MultiSigWallet, ERC20 } from "../../typechain-types";
import type { Wallet } from "ethers";

export async function multiSigWalletFixture(
  multiSigWalletCreator: Wallet
): Promise<MultiSigWallet> {
  let multiSigWallet: MultiSigWallet;

  const MultiSigWallet = await ethers.getContractFactory(
    "MultiSigWallet",
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
