import { Wallet, ethers } from "ethers";
import {
  SAFE_CHECK_EXECUTION_TYPEHASH,
  DOMAIN_SEPARATOR_TYPEHASH,
} from "../constants";
import crypto from "crypto";
import hre from "hardhat";

export async function signERC20TransferCheck({
  callExternalContract,
  to,
  checkOwner,
  value,
  checkNonce,
  data,
  operation,
  safeTxGas,
  baseGas,
  gasPrice,
  gasToken,
  refundReceiver,
  transferEther,
  etherReceiver,
  etherAmount,
  multiSigWalletAddress,
  chainId,
}: {
  callExternalContract: boolean;
  to: string;
  checkOwner: string;
  value: number;
  checkNonce: string;
  data: string;
  operation: number;
  safeTxGas: number;
  baseGas: number;
  gasPrice: number;
  gasToken: string;
  refundReceiver: string;
  transferEther: boolean;
  etherReceiver: string;
  etherAmount: number;
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
        "bool",
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
        "bool",
        "address",
        "uint256",
        "uint256",
      ],
      [
        SAFE_CHECK_EXECUTION_TYPEHASH, // SAFE_CHECK_EXECUTION_TYPEHASH
        callExternalContract, //callExternalContract
        checkOwner, // checkOwner
        to, // to
        value, // value
        dataHash, //kaccak256(data)
        operation, //operation. 0:call; 1: delegate call
        safeTxGas, //safeTxGas
        baseGas, //baseGas
        gasPrice, //gasPrice
        gasToken, //gasToken
        refundReceiver, // refundReceiver
        transferEther, //transferEther
        etherReceiver, //etherReceiver
        etherAmount, //etherAmount
        checkNonce, //checkNonce
      ]
    )
  );


  const e2 = ethers.utils.defaultAbiCoder.encode(
    [

    //   "bool",
      "address",
      "uint256",
      "uint256",
    ],
    [


    //   transferEther, //transferEther
      etherReceiver, //etherReceiver
      etherAmount, //etherAmount
      checkNonce, //checkNonce
    ]
  )



  const domainSeparator = await getDomainSeparator(
    chainId,
    multiSigWalletAddress
  );
  const msgHash_2 = ethers.utils.arrayify(
    ethers.utils.keccak256(
      ethers.utils.solidityPack(
        ["bytes1", "bytes1", "bytes32", "bytes32"],
        ["0x19", "0x01", domainSeparator, msgHash_1]
      )
    )
  );

  return { msgHash: msgHash_2, data };
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
