import { Wallet, ethers, BigNumber } from "ethers";
import type { params } from "./sharedtype";
import {
  SAFE_CHECK_EXECUTION_TYPEHASH,
  DOMAIN_SEPARATOR_TYPEHASH,
} from "./constants";
import crypto from "crypto";
import hre from "hardhat";
import { addressSorter } from "../test_multiSigWallet/utils/commen";

export async function checkNonceGenerator({
  params,
}: {
  params: params;
}): Promise<string> {
  var entropy = "";
  await crypto.randomBytes(48, function (err, buffer) {
    entropy = buffer.toString("hex");
  });

  const t = new Date().getTime().toString();
  return ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(
      SAFE_CHECK_EXECUTION_TYPEHASH +
        params.callExternalContract.toString() +
        params.to +
        params.checkOwner +
        params.value.toString() +
        params.operation.toString() +
        params.safeTxGas.toString() +
        params.baseGas.toString() +
        params.gasPrice.toString() +
        params.gasToken +
        params.refundReceiver +
        params.transferEther.toString() +
        params.etherReceiver +
        params.etherAmount +
        params.multiSigWalletAddress +
        params.chainId +
        params.amount.toString() +
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

export async function msgHashGenerator({
  params, //not used here because data is ''
  checkNonce,
}: {
  params: params;
  checkNonce: string;
}) {
  // transfer ether, so no need to specify data
  //   const data = ethers.utils.toUtf8Bytes("");

  //   construct call data of inline assembly, this 'to' is not identical to 'to' in params. The former is external contract address, the latter is param in transfer function, the target to transfer ERC20
  let ABI = ["function transfer(address to, uint256 amount)"];
  let iface = new ethers.utils.Interface(ABI);
  const data = iface.encodeFunctionData("transfer", [
    params.accepterAddress,
    params.amount,
  ]);

  const dataHash = ethers.utils.keccak256(data);

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
        params.callExternalContract, //callExternalContract
        params.checkOwner, // checkOwner
        params.to, // to
        params.value.toString(), // value
        dataHash, //kaccak256(data)
        params.operation, //operation. 0:call; 1: delegate call
        params.safeTxGas, //safeTxGas
        params.baseGas, //baseGas
        params.gasPrice, //gasPrice
        params.gasToken, //gasToken
        params.refundReceiver, // refundReceiver
        params.transferEther, //transferEther
        params.etherReceiver, //etherReceiver
        params.etherAmount.toString(), //etherAmount
        checkNonce, //checkNonce
      ]
    )
  );

  const domainSeparator = await getDomainSeparator(
    params.chainId,
    params.checkExecutorAddress
  );

  const msgHash_2 = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      ["0x19", "0x01", domainSeparator, msgHash_1]
    )
  );

  return { msgHash: ethers.utils.arrayify(msgHash_2), data: data };
}

export async function signMsgHash({
  msgHash,
  signerLs,
}: {
  msgHash: Uint8Array;
  signerLs: Wallet[];
}) {
  var compactSigLs: Array<string> = [];
  for (const signer of signerLs) {
    // The signature format is a compact form of:
    // {bytes32 r}{bytes32 s}{uint8 v}
    // Compact means, uint8 is not padded to 32 bytes.
    var compactSig = await signer.signMessage(msgHash);

    compactSig =
      compactSig.slice(0, compactSig.length - 2) +
      (compactSig.slice(compactSig.length - 2, compactSig.length) == "1b"
        ? "1f"
        : "20");
    compactSigLs.push(compactSig);
  }
  // aggregate signers' sig
  const aggregatedSig = await compactSigLs.reduce(
    (accumulator, currentValue) => accumulator + currentValue.slice(2)
  );

  return aggregatedSig;
}

export async function generateCheckMsg({
  params,
  checkNonce,
  data,
  aggregatedSig,
}: {
  params: params;
  checkNonce: string;
  data: string;
  aggregatedSig: string;
}) {
  // construct checkInfo
  const checkMsg = ethers.utils.defaultAbiCoder.encode(
    [
      "tuple(bool callExternalContract, address checkOwner, address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, uint256 gasToken, address payable refundReceiver, bool transferEther, address payable etherReceiver, uint256 etherAmount, uint256 checkNonce, bytes signatures)",
    ],
    [
      {
        callExternalContract: params.callExternalContract,
        to: params.to,
        checkOwner: params.checkOwner,
        value: params.value.toString(),
        data: data,
        operation: params.operation,
        safeTxGas: params.safeTxGas,
        baseGas: params.baseGas,
        gasPrice: params.gasPrice,
        gasToken: params.gasToken,
        refundReceiver: params.refundReceiver,
        transferEther: params.transferEther,
        etherReceiver: params.etherReceiver,
        etherAmount: params.etherAmount.toString(),
        checkNonce: checkNonce,
        signatures: aggregatedSig,
      },
    ]
  );

  return checkMsg;
}
