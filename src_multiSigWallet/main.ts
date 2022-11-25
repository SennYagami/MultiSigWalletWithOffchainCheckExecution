import hre from "hardhat";
import type { Wallet, BigNumber } from "ethers";
import { ethers } from "ethers";
import * as deployConfig from "./deployConfig";
import { GnosisSafe, MultiSigWallet } from "../typechain-types";
import {
  multiSigWalletMsgHashGenerator,
  signMsgHash,
  checkNonceGenerator,
  executorMsgHashGenerator,
  generateCheckMsg,
} from "../utils/offChainMultiSign";
import { addressSorter } from "../utils/commen";

async function deployMultiSigWallet() {
  const [deployer] = await hre.ethers.getSigners();

  const multiSigWalletContract = await hre.ethers.getContractFactory(
    "GnosisSafe"
  );

  const multiSigWallet = await multiSigWalletContract
    .connect(deployer)
    .deploy();

  console.log({ MultiSigWalletAddress: multiSigWallet.address });
}

async function setMultiSigWalletOwners({
  multiSigWalletAddress,
  threshold,
}: {
  multiSigWalletAddress: string;
  threshold: number;
}) {
  const [deployer, owner1, owner2, owner3] = await hre.ethers.getSigners();

  const multiSigWalletContract = await hre.ethers.getContractAt(
    "GnosisSafe",
    multiSigWalletAddress
  );

  const res = await multiSigWalletContract
    .connect(deployer)
    .setup(
      [owner1.address, owner2.address, owner3.address],
      threshold,
      ethers.constants.AddressZero,
      ethers.utils.toUtf8Bytes(""),
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      0,
      ethers.constants.AddressZero
    );

  console.log({ setMultiSigWalletOwners: res });
}

async function deployCheckExecutor({ multiSigWalletAddress }) {
  const [deployer] = await hre.ethers.getSigners();

  const checkExecutorContract = await hre.ethers.getContractFactory(
    "CheckExecutor"
  );

  const checkExecutor = await checkExecutorContract
    .connect(deployer)
    .deploy(multiSigWalletAddress);

  console.log({ CheckExecutorAddress: checkExecutor.address });
}

async function deployErc20() {
  const [deployer] = await hre.ethers.getSigners();

  const erc20_1_contract = await hre.ethers.getContractFactory("ERC20Token");

  const erc20_1 = await erc20_1_contract.connect(deployer).deploy();

  console.log({ erc20_1_address: erc20_1.address });
}

async function sendEtherToMultiSigWallet({
  multiSigWalletAddress,
}: {
  multiSigWalletAddress: string;
}) {
  const [deployer] = await hre.ethers.getSigners();

  const res = await deployer.sendTransaction({
    to: multiSigWalletAddress,
    value: ethers.utils.parseEther("0.1"), // 1 ether
  });

  console.log({ sendEtherToMultiSigWallet: res });
}

async function sendErc20ToMultiSigWallet({
  erc20Address,
  multiSigWalletAddress,
  amount,
  decimal,
}: {
  erc20Address: string;
  multiSigWalletAddress: string;
  amount: string;
  decimal: number;
}) {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const erc20Contract = await hre.ethers.getContractAt(
    "ERC20Token",
    erc20Address
  );

  const res = await erc20Contract
    .connect(deployer)
    .transfer(multiSigWalletAddress, ethers.utils.parseUnits(amount, decimal));

  console.log({ res });
}

async function sendEtherFromMultiSigWalletToCheckExecutor({
  checkExecutorAddress,
  multiSigWalletAddress,
  valueString,
}: {
  checkExecutorAddress: string;
  multiSigWalletAddress: string;
  valueString: string;
}) {
  const [deployer, owner1, owner2, owner3, accepter] =
    await hre.ethers.getSigners();

  const to = checkExecutorAddress;
  const value = ethers.utils.parseEther(valueString);
  const data = "0x00";
  const operation = 0;
  const safeTxGas = 0;
  const baseGas = 0;
  const gasPrice = 0;
  const gasToken = ethers.constants.AddressZero;
  const refundReceiver = ethers.constants.AddressZero;

  const multiSigWallet: GnosisSafe = await hre.ethers.getContractAt(
    "GnosisSafe",
    multiSigWalletAddress
  );
  const currentNonce = await multiSigWallet.nonce();
  const nonce = currentNonce.toNumber();
  const chainId = hre.network.config.chainId;

  if (chainId == undefined) {
    console.log("wrong chainId");
    process.exit(0);
  }

  const params = {
    to,
    value,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce,
    data,
    chainId,
    multiSigWalletAddress,
  };

  const { msgHash } = await multiSigWalletMsgHashGenerator({ params });

  const signerLs = addressSorter([owner1, owner2, owner3]);
  const aggregatedSig = await signMsgHash({ msgHash, signerLs });

  const res = await multiSigWallet
    .connect(accepter)
    .execTransaction(
      params.to,
      params.value,
      params.data,
      params.operation,
      params.safeTxGas,
      params.baseGas,
      params.gasPrice,
      params.gasToken,
      params.refundReceiver,
      aggregatedSig
    );

  console.log({ sendEtherFromMultiSigWalletToCheckExecutor: res });
}

async function sendErc20FromMultiSigWalletToCheckExecutor({
  erc20Address,
  checkExecutorAddress,
  multiSigWalletAddress,
  amountString,
  decimal,
}: {
  erc20Address: string;
  checkExecutorAddress: string;
  multiSigWalletAddress: string;
  amountString: string;
  decimal: number;
}) {
  const [deployer, owner1, owner2, owner3, accepter] =
    await hre.ethers.getSigners();

  // transfer ether from multiSigWallet to checkExecutor
  const to = erc20Address;
  const value = ethers.utils.parseEther("0");
  let ABI = ["function transfer(address to, uint256 amount)"];
  let iface = new ethers.utils.Interface(ABI);
  const data = iface.encodeFunctionData("transfer", [
    checkExecutorAddress,
    ethers.utils.parseUnits(amountString, decimal),
  ]);

  const operation = 0;
  const safeTxGas = 0;
  const baseGas = 0;
  const gasPrice = 0;
  const gasToken = ethers.constants.AddressZero;
  const refundReceiver = ethers.constants.AddressZero;

  const multiSigWallet: GnosisSafe = await hre.ethers.getContractAt(
    "GnosisSafe",
    multiSigWalletAddress
  );
  const currentNonce = await multiSigWallet.nonce();
  const nonce = currentNonce.toNumber();
  const chainId = hre.network.config.chainId;

  if (chainId == undefined) {
    process.exit(0);
  }

  const params = {
    to,
    value,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce,
    data,
    chainId,
    multiSigWalletAddress,
  };

  const { msgHash } = await multiSigWalletMsgHashGenerator({ params });

  const signerLs = addressSorter([owner1, owner2, owner3]);
  const aggregatedSig = await signMsgHash({ msgHash, signerLs });

  const res = await multiSigWallet
    .connect(accepter)
    .execTransaction(
      params.to,
      params.value,
      params.data,
      params.operation,
      params.safeTxGas,
      params.baseGas,
      params.gasPrice,
      params.gasToken,
      params.refundReceiver,
      aggregatedSig
    );

  console.log({ sendErc20FromMultiSigWalletToCheckExecutor: res });
}

async function sendEtherFromCheckExecutorToAccepter({
  checkExecutorAddress,
  multiSigWalletAddress,
  valueString,
}: {
  checkExecutorAddress: string;
  multiSigWalletAddress: string;
  valueString: string;
}) {
  const [deployer, owner1, owner2, owner3, accepter] =
    await hre.ethers.getSigners();

  const checkOwner = accepter.address;
  // external contract address to be called
  const to = accepter.address;

  // transfer ether no need data
  const data = "0x00";
  const value: BigNumber = ethers.utils.parseEther(valueString);
  0;
  const operation = 0;
  const safeTxGas = 0;
  const baseGas = 0;
  const gasPrice = 0;
  const gasToken = ethers.constants.AddressZero;
  const refundReceiver = ethers.constants.AddressZero;

  const chainId = hre.network.config.chainId;
  if (chainId == undefined) {
    throw "undefined chainId";
  }
  const params = {
    to,
    checkOwner,
    value,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    multiSigWalletAddress,
    chainId,
    checkExecutorAddress,
    data,
  };

  const checkNonce = await checkNonceGenerator({
    params,
  });

  const { msgHash } = await executorMsgHashGenerator({
    params, //not used here because data is ''
    checkNonce,
  });

  const signerLs = addressSorter([owner1, owner2, owner3]);
  const aggregatedSig = await signMsgHash({ msgHash, signerLs });

  const checkMsg = await generateCheckMsg({
    params,
    checkNonce,
    data,
    aggregatedSig,
  });

  const checkExecutor = await hre.ethers.getContractAt(
    "CheckExecutor",
    checkExecutorAddress
  );

  const res = await checkExecutor.connect(accepter).executeCheck(checkMsg);

  console.log({ sendEtherFromCheckExecutorToAccepter: res });
}

async function sendErc20FromCheckExecutorToAccepter({
  erc20Address,
  multiSigWalletAddress,
  checkExecutorAddress,
  amount,
  decimal,
}: {
  erc20Address: string;
  multiSigWalletAddress: string;
  checkExecutorAddress: string;
  amount: string;
  decimal: number;
}) {
  const [deployer, owner1, owner2, owner3, accepter] =
    await hre.ethers.getSigners();

  const checkOwner = accepter.address;

  // construct call data of inline assembly, this 'to' is not identical to 'to' in params. The former is external contract address, the latter is param in transfer function, the target to transfer ERC20
  let ABI = ["function transfer(address to, uint256 amount)"];
  let iface = new ethers.utils.Interface(ABI);
  const data = iface.encodeFunctionData("transfer", [
    accepter.address,
    ethers.utils.parseUnits(amount, decimal),
  ]);

  const value: BigNumber = ethers.utils.parseEther("0");
  const to = erc20Address;
  const operation = 0;
  const safeTxGas = 0;
  const baseGas = 0;
  const gasPrice = 0;
  const gasToken = ethers.constants.AddressZero;
  const refundReceiver = ethers.constants.AddressZero;

  const chainId = hre.network.config.chainId;

  if (chainId == undefined) {
    throw "undefined chainId";
  }
  const params = {
    to,
    checkOwner,
    value,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    multiSigWalletAddress,
    chainId,
    checkExecutorAddress,
    data,
  };

  const checkNonce = await checkNonceGenerator({
    params,
  });

  const { msgHash } = await executorMsgHashGenerator({
    params, //not used here because data is ''
    checkNonce,
  });

  const signerLs = addressSorter([owner1, owner2, owner3]);
  const aggregatedSig = await signMsgHash({ msgHash, signerLs });

  const checkMsg = await generateCheckMsg({
    params,
    checkNonce,
    data,
    aggregatedSig,
  });

  const checkExecutor = await hre.ethers.getContractAt(
    "CheckExecutor",
    checkExecutorAddress
  );
  const res = await checkExecutor.connect(accepter).executeCheck(checkMsg);

  console.log({ sendErc20FromCheckExecutorToAccepter: res });
}

// const f = async () =>
//   setMultiSigWalletOwners({
//     multiSigWalletAddress: deployConfig.multiSigWalletAddress,
//     threshold: 2,
//   });

// const f = async () =>
//   deployCheckExecutor({
//     multiSigWalletAddress: deployConfig.multiSigWalletAddress,
//   });

// const f = async () => deployErc20();

// const f = async () =>
//   sendEtherToMultiSigWallet({
//     multiSigWalletAddress: deployConfig.multiSigWalletAddress,
//   });

// const f = async () =>
//   sendErc20ToMultiSigWallet({
//     multiSigWalletAddress: deployConfig.multiSigWalletAddress,
//     erc20Address: deployConfig.erc20ContractAddress,
//     amount: "10000",
//     decimal: 18,
//   });

// const f = async () =>
//   sendEtherFromMultiSigWalletToCheckExecutor({
//     multiSigWalletAddress: deployConfig.multiSigWalletAddress,
//     checkExecutorAddress: deployConfig.checkExecutorAddress,
//     valueString: "0.03",
//   });

// const f = async () =>
//   sendErc20FromMultiSigWalletToCheckExecutor({
//     multiSigWalletAddress: deployConfig.multiSigWalletAddress,
//     checkExecutorAddress: deployConfig.checkExecutorAddress,
//     erc20Address: deployConfig.erc20ContractAddress,
//     amountString: "4000",
//     decimal: 18,
//   });

const f = async () =>
  sendErc20FromCheckExecutorToAccepter({
    multiSigWalletAddress: deployConfig.multiSigWalletAddress,
    checkExecutorAddress: deployConfig.checkExecutorAddress,
    erc20Address: deployConfig.erc20ContractAddress,
    amount: "3000",
    decimal: 18,
  });

f()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error({ errMessage: error.message });
    process.exit(1);
  });
