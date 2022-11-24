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
  amount: number;
  checkExecutorAddress: string;
  accepterAddress: string;
}
