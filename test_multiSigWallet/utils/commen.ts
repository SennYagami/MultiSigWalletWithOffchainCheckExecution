import { BigNumber, Wallet } from "ethers";
import lodash from "lodash";

export function addressSorter(
  walletLs: Array<Wallet>,
  ascend: boolean = false
): Array<Wallet> {
  walletLs.sort((a: Wallet, b: Wallet) =>
    _compare(a.address, b.address, ascend)
  );

  return walletLs;
}

function _compare(a: string, b: string, ascend: boolean): number {
  if (BigNumber.from(a).gt(BigNumber.from(b))) {
    return ascend ? -1 : 1;
  } else if (BigNumber.from(a).lt(BigNumber.from(b))) {
    return ascend ? 1 : -1;
  } else {
    throw "same address";
  }
}
