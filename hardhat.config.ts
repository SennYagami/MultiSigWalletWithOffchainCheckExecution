import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.6.12" },
      { version: "0.5.17" },
      { version: "0.8.1" },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
    },
  },
  networks: {
    hardhat: { allowUnlimitedContractSize: true },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/Zf0Pex_0WB4BkhBQCA14wnt4u6PAi6UF`,
      accounts: [process.env.PRIVATE_KEY as any],
      allowUnlimitedContractSize: true,
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
