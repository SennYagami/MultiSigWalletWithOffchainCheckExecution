import { Wallet, ethers } from "ethers";
import {
  SAFE_CHECK_EXECUTION_TYPEHASH,
  DOMAIN_SEPARATOR_TYPEHASH,
} from "../constants";
import crypto from "crypto";
import hre from "hardhat";

export async function signERC20TransferCheck({
  to,
  checkOwner,
  checkNonce,
  data,
  multiSigWalletAddress,
  chainId,
}: {
  to: string;
  checkOwner: string;
  checkNonce: string;
  data: string;
  multiSigWalletAddress: string;
  chainId: number | undefined;
}) {
  if (chainId == undefined) {
    throw "invalid chain id";
  }
  const dataHash = ethers.utils.keccak256(data);

  //   console.log({
  //     SAFE_CHECK_EXECUTION_TYPEHASH: SAFE_CHECK_EXECUTION_TYPEHASH, // SAFE_CHECK_EXECUTION_TYPEHASH
  //     checkOwner: checkOwner, // checkOwner
  //     to: to, // to
  //     value: 0, // value
  //     dataHash: dataHash, //kaccak256(data)
  //     operation: 0, //operation. 0:call; 1: delegate call
  //     safeTxGas: 0, //safeTxGas
  //     baseGas: 0, //baseGas
  //     gasPrice: 0, //gasPrice
  //     gasToken: ethers.constants.AddressZero, //gasToken
  //     refundReceiver: ethers.constants.AddressZero, // refundReceiver
  //     checkNonce: checkNonce,
  //   }); //checkNonce)

  var msgHash_1 = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      [
        "bytes32",
        "address",
        "address",
        "uint256",
        "bytes32",
        "uint8",
        "uint256",
        "uint256",
        "uint256",
        "address",
        "address",
        "uint256",
      ],
      [
        SAFE_CHECK_EXECUTION_TYPEHASH, // SAFE_CHECK_EXECUTION_TYPEHASH
        checkOwner, // checkOwner
        to, // to
        0, // value
        dataHash, //kaccak256(data)
        0, //operation. 0:call; 1: delegate call
        0, //safeTxGas
        0, //baseGas
        0, //gasPrice
        ethers.constants.AddressZero, //gasToken
        ethers.constants.AddressZero, // refundReceiver
        checkNonce, //checkNonce
      ]
    )
  );

  const domainSeparator = await getDomainSeparator(
    chainId,
    multiSigWalletAddress
  );
  const msgHash_2 = ethers.utils.arrayify(ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      ["0x19", "0x01", domainSeparator, msgHash_1]
    )
  ));

  return { msgHash:msgHash_2, data };
}

export async function checkNonceGenerator({
  checkOwner,
  to,
  erc20Address,
  amount,
}: {
  checkOwner: string;
  to: string;
  erc20Address: string;
  amount: number;
}): Promise<string> {
  var entropy = "";
  await crypto.randomBytes(48, function (err, buffer) {
    entropy = buffer.toString("hex");
  });

  const t = new Date().getTime().toString();
  return ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(
      SAFE_CHECK_EXECUTION_TYPEHASH +
        checkOwner +
        to +
        erc20Address +
        amount.toString() +
        entropy +
        t
    )
  );
}

export async function getDomainSeparator(
  chainId: number,
  contractAddress: string
): Promise<string> {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "uint256", "address"],
      [DOMAIN_SEPARATOR_TYPEHASH, chainId, contractAddress]
    )
  );
}
