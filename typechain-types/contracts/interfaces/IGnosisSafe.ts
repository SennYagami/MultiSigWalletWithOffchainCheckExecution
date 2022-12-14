/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BytesLike,
  CallOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../common";

export interface IGnosisSafeInterface extends utils.Interface {
  functions: {
    "checkSignatures(bytes32,bytes,bytes)": FunctionFragment;
  };

  getFunction(nameOrSignatureOrTopic: "checkSignatures"): FunctionFragment;

  encodeFunctionData(
    functionFragment: "checkSignatures",
    values: [
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BytesLike>
    ]
  ): string;

  decodeFunctionResult(
    functionFragment: "checkSignatures",
    data: BytesLike
  ): Result;

  events: {};
}

export interface IGnosisSafe extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IGnosisSafeInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    checkSignatures(
      dataHash: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BytesLike>,
      signatures: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[void]>;
  };

  checkSignatures(
    dataHash: PromiseOrValue<BytesLike>,
    data: PromiseOrValue<BytesLike>,
    signatures: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<void>;

  callStatic: {
    checkSignatures(
      dataHash: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BytesLike>,
      signatures: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {};

  estimateGas: {
    checkSignatures(
      dataHash: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BytesLike>,
      signatures: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    checkSignatures(
      dataHash: PromiseOrValue<BytesLike>,
      data: PromiseOrValue<BytesLike>,
      signatures: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
