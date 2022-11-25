import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.6.12" },
      { version: "0.5.17" },
      { version: "0.7.6" },
      //   { version: "0.8.1" },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  networks: {
    hardhat: { allowUnlimitedContractSize: true },
    goerli: {
      chainId: 5,
      url: process.env.ALCHEMY_API,
      accounts: [
        process.env.DEPLOYER as string,
        process.env.MULTISIGWALLETOWNER1 as string,
        process.env.MULTISIGWALLETOWNER2 as string,
        process.env.MULTISIGWALLETOWNER3 as string,
        process.env.ACCEPTER as string,
      ],
      gas: 10000000,
      //   allowUnlimitedContractSize: true,
    },
  },
  //   gasReporter: {
  //     outputFile: "gas-report.txt",
  //     enabled: true,
  //     currency: "USD",
  //     noColors: true,
  //     coinmarketcap: process.env.COIN_MARKETCAP_API_KEY || "",
  //     token: "ETH",
  //   },
};
export default config;
