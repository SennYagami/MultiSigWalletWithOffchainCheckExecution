import { BigNumber } from "ethers";

export interface params {
  to: string;
  checkOwner: string;
  value: BigNumber;
  operation: number;
  safeTxGas: number;
  baseGas: number;
  gasPrice: number;
  gasToken: string;
  refundReceiver: string;
  multiSigWalletAddress: string;
  chainId: number;
  checkExecutorAddress: string;

  data: string;
}
export interface multiSigWalletParams {
  to: string;
  value: BigNumber;
  operation: number;
  safeTxGas: number;
  baseGas: number;
  gasPrice: number;
  gasToken: string;
  refundReceiver: string;
  data: string;
  nonce: number;
  chainId: number;
  multiSigWalletAddress: string;
}
