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
      url: process.env.ALCHEMY_API,
      accounts: [process.env.PRIVATE_KEY as any],
<<<<<<< HEAD
      gas: 10000000,
      allowUnlimitedContractSize: true,
    },
  },
    // gasReporter: {
    //   outputFile: "gas-report.txt",
    //   enabled: true,
    //   currency: "USD",
    //   noColors: true,
    //   coinmarketcap: process.env.COIN_MARKETCAP_API_KEY || "",
    //   token: "ETH",
    // },
=======
      //   gas: 1000000
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
>>>>>>> 220311866f7e1a420e10f33c21e7c4632ac3d24f
};
export default config;
