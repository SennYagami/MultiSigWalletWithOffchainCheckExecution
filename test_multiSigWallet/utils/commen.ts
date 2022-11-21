import { BigNumber, Wallet } from "ethers";
import lodash from "lodash";

export function addressSorter(
  addressLs: Array<Wallet>,
  ascend: boolean = true
): Array<Wallet> {
  addressLs.sort((a: Wallet, b: Wallet) =>
    _compare(a.address, b.address, ascend)
  );
  return addressLs;
}

function _compare(a: string, b: string, ascend: boolean): number {
  if (BigNumber.from(a) > BigNumber.from(b)) {
    return ascend ? 0 : 1;
  } else if (BigNumber.from(a) < BigNumber.from(b)) {
    return ascend ? 1 : 0;
  } else {
    throw new Error("Required");
  }
}
