import { randomBytes as nodeRandomBytes } from "crypto";
import { BigNumber, constants, utils } from "ethers";
import { getAddress, keccak256, toUtf8Bytes } from "ethers/lib/utils";

import type { BigNumberish, ContractTransaction } from "ethers";

const SeededRNG = require("./seeded-rng");

const GAS_REPORT_MODE = process.env.REPORT_GAS;

let randomBytes: (n: number) => string;
if (GAS_REPORT_MODE) {
  const srng = SeededRNG.create("gas-report");
  randomBytes = srng.randomBytes;
} else {
  randomBytes = (n: number) => nodeRandomBytes(n).toString("hex");
}

const hexRegex = /[A-Fa-fx]/g;

export const randomHex = (bytes = 32) => `0x${randomBytes(bytes)}`;

export const toHex = (n: BigNumberish, numBytes: number = 0) => {
  const asHexString = BigNumber.isBigNumber(n)
    ? n.toHexString().slice(2)
    : typeof n === "string"
    ? hexRegex.test(n)
      ? n.replace(/0x/, "")
      : Number(n).toString(16)
    : Number(n).toString(16);
  return `0x${asHexString.padStart(numBytes * 2, "0")}`;
};

export const toBN = (n: BigNumberish) => BigNumber.from(toHex(n));

export const hex2bin = (hex: string) => {
  hex = hex.replace("0x", "").toLowerCase();
  var out = "";
  for (var c of hex) {
    switch (c) {
      case "0":
        out += "0000";
        break;
      case "1":
        out += "0001";
        break;
      case "2":
        out += "0010";
        break;
      case "3":
        out += "0011";
        break;
      case "4":
        out += "0100";
        break;
      case "5":
        out += "0101";
        break;
      case "6":
        out += "0110";
        break;
      case "7":
        out += "0111";
        break;
      case "8":
        out += "1000";
        break;
      case "9":
        out += "1001";
        break;
      case "a":
        out += "1010";
        break;
      case "b":
        out += "1011";
        break;
      case "c":
        out += "1100";
        break;
      case "d":
        out += "1101";
        break;
      case "e":
        out += "1110";
        break;
      case "f":
        out += "1111";
        break;
      default:
        return "";
    }
  }

  return out;
};
