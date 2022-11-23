import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const MultiContractWalletContract = await hre.ethers.getContractFactory("MultiSigWallet");
    const multiContractWallet = await MultiContractWalletContract.deploy({gasPrice: 50000000000});
  
    console.log("multiContractWallet address:", multiContractWallet.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });