import hre from "hardhat";
import type { Wallet } from "ethers";
import { ethers } from "ethers";

async function main() {
  const [signer] = await hre.ethers.getSigners();

  const multiSigWalletAddress = "";

  const res = await signer.sendTransaction({
    to: multiSigWalletAddress,
    value: ethers.utils.parseEther("0.1"), // 1 ether
  });

  console.log({ res });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error({ errMessage: error.message });
    process.exit(1);
  });
