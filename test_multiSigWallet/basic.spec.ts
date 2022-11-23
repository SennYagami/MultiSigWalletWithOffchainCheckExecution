import { Wallet, BigNumber } from "ethers";
import hre from "hardhat";

require("dotenv").config();

import { expect } from "chai";
import { ethers } from "hardhat";
import { randomHex, toHex } from "./utils/encoding";
import { faucet } from "./utils/faucet";
import type { ERC20, MultiSigWallet } from "../typechain-types";
import { multiSigWalletFixture, erc20Fixture } from "./utils/fixture";
import { addressSorter } from "./utils/commen";

import {
  signERC20TransferCheck,
  checkNonceGenerator,
} from "./utils/offChainMultiSign";
import { base } from "../typechain-types/contracts";
import { before } from "mocha";

/**
 * Signs off chain check to transfer ether/ERC20 from multiSigWallet
 */
describe("platformWallet basic test", function () {
  var multiSigWallet: MultiSigWallet;
  let erc20_1: ERC20;

  const { provider } = ethers;
  const owner1: Wallet = new ethers.Wallet(randomHex(32), provider);
  const owner2: Wallet = new ethers.Wallet(randomHex(32), provider);
  const owner3: Wallet = new ethers.Wallet(randomHex(32), provider);
  const accepter: Wallet = new ethers.Wallet(randomHex(32), provider);
  const erc20Creator: Wallet = new ethers.Wallet(randomHex(32), provider);
  const multiSigWalletCreator: Wallet = new ethers.Wallet(
    randomHex(32),
    provider
  );

  before(async () => {
    await faucet(owner1.address, provider);
    await faucet(owner2.address, provider);
    await faucet(owner3.address, provider);
    await faucet(multiSigWalletCreator.address, provider);
    await faucet(erc20Creator.address, provider);
    await faucet(accepter.address, provider);

    // create multiSigWallet and register owners
    multiSigWallet = await multiSigWalletFixture(multiSigWalletCreator);
    await multiSigWallet
      .connect(multiSigWalletCreator)
      .setup(
        [owner1.address, owner2.address, owner3.address],
        2,
        ethers.constants.AddressZero,
        ethers.utils.toUtf8Bytes(""),
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero
      );

    // create erc20 contract
    erc20_1 = await erc20Fixture(erc20Creator);
  });

  describe("verify multiSigStatus ownerships ", function () {
    it("verify ownerships", async function () {
      const owner1_isOwner = await multiSigWallet.isOwner(owner1.address);
      const owner2_isOwner = await multiSigWallet.isOwner(owner2.address);
      const owner3_isOwner = await multiSigWallet.isOwner(owner3.address);

      // check owners's validity
      expect(
        owner1_isOwner == true &&
          owner2_isOwner == true &&
          owner3_isOwner == true
      ).to.equal(true);
    });
  });

  describe("sign off chain check to transfer ether", function () {
    var checkNonce;
    var checkMsg;
    this.beforeAll(async function () {
      // transfer 10k erc20_1 to multiSigWallet
      await erc20_1
        .connect(erc20Creator)
        .transfer(multiSigWallet.address, 10000);

      const callExternalContract = false;
      const checkOwner = accepter.address;

      // external contract address to be called
      const to = ethers.constants.AddressZero;
      const value = 0;
      const operation = 0;
      const safeTxGas = 0;
      const baseGas = 0;
      const gasPrice = 0;
      const gasToken = ethers.constants.AddressZero;
      const refundReceiver = ethers.constants.AddressZero;

      const transferEther = true;
      const etherReceiver = accepter.address;
      const etherAmount = 1;

      const amount = 0;

      //   construct call data of inline assembly
      let ABI = ["function transfer(address to, uint256 amount)"];
      let iface = new ethers.utils.Interface(ABI);
      const data = iface.encodeFunctionData("transfer", [
        ethers.constants.AddressZero,
        amount,
      ]);

      checkNonce = await checkNonceGenerator({
        checkOwner: checkOwner,
        to: to,
        erc20Address: erc20_1.address,
        amount: amount,
      });

      // construct msgHash which is to be signed by owners of multiSigWallet

      const { msgHash } = await signERC20TransferCheck({
        callExternalContract: callExternalContract,
        to: to,
        checkOwner: checkOwner,
        value: value,
        checkNonce: checkNonce,
        data: data,
        operation: operation,
        safeTxGas: safeTxGas,
        baseGas: baseGas,
        gasPrice: gasPrice,
        gasToken: gasToken,
        refundReceiver: refundReceiver,
        transferEther: transferEther,
        etherReceiver: etherReceiver,
        etherAmount: etherAmount,
        multiSigWalletAddress: multiSigWallet.address,
        chainId: hre.network.config.chainId,
      });

      var signerLs: Array<Wallet> = [owner1, owner2, owner3];
      signerLs = addressSorter(signerLs);

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

      // construct checkInfo
      checkMsg = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(bool callExternalContract, address checkOwner, address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, uint256 gasToken, address payable refundReceiver, bool transferEther, address payable etherReceiver, uint256 etherAmount, uint256 checkNonce, bytes signatures)",
        ],
        [
          {
            callExternalContract: callExternalContract,
            to: to,
            checkOwner: checkOwner,
            value: value,
            data: data,
            operation: operation,
            safeTxGas: safeTxGas,
            baseGas: baseGas,
            gasPrice: gasPrice,
            gasToken: gasToken,
            refundReceiver: refundReceiver,
            transferEther: false,
            etherReceiver: etherReceiver,
            etherAmount: etherAmount,
            checkNonce: checkNonce,
            signatures: aggregatedSig,
          },
        ]
      );

      console.log({
        callExternalContract: callExternalContract,
        to: to,
        checkOwner: checkOwner,
        value: value,
        data: data,
        operation: operation,
        safeTxGas: safeTxGas,
        baseGas: baseGas,
        gasPrice: gasPrice,
        gasToken: gasToken,
        refundReceiver: refundReceiver,
        transferEther: false,
        etherReceiver: etherReceiver,
        etherAmount: etherAmount,
        checkNonce: BigNumber.from(checkNonce),
        signatures: aggregatedSig,
      });

      const res = await multiSigWallet.connect(accepter).executeCheck(checkMsg);
    });

    it("check remain erc20_1 amount after transaction", async function () {
      const newBalanceOfTo = await erc20_1.balanceOf(accepter.address);
      const newBalanceOfMultiSigWallet = await erc20_1.balanceOf(
        multiSigWallet.address
      );

      expect(newBalanceOfTo).to.equal(4000);
      expect(newBalanceOfMultiSigWallet).to.equal(6000);
    });

    it("after checkExecution, check check's validity", async function () {
      expect(multiSigWallet.checkValidity(checkMsg)).to.be.revertedWith(
        "used checkNonce"
      );
    });

    it("check ether after check execution", async function () {
      const balanceOfAccepterAfterCheckExecution =
        await ethers.provider.getBalance(accepter.address);
      const balanceOfMultiSigWalletAfterCheckExecution =
        await ethers.provider.getBalance(multiSigWallet.address);

      expect(balanceOfMultiSigWalletAfterCheckExecution).to.equal(9999);
    });

    it("after check's execution, use check again, contract should revert ", async function () {
      expect(
        multiSigWallet.connect(accepter).executeCheck(checkMsg)
      ).to.be.revertedWith("used checkNonce");
    });
  });

  //   describe("sign off chain check to transfer erc20_1", function () {
  //     var checkNonce;
  //     var checkMsg;
  //     var balanceOfAccepterBeforeCheckExecution;
  //     var balanceOfMultiSigWalletBeforeCheckExecution;
  //     this.beforeAll(async function () {
  //       // transfer 10k erc20_1 to multiSigWallet
  //       await erc20_1
  //         .connect(erc20Creator)
  //         .transfer(multiSigWallet.address, 10000);

  //       const callExternalContract = true;
  //       const checkOwner = accepter.address;
  //       const accepterAddress = accepter.address;
  //       // external contract address to be called
  //       const to = erc20_1.address;
  //       const value = 0;
  //       const operation = 0;
  //       const safeTxGas = 0;
  //       const baseGas = 0;
  //       const gasPrice = 0;
  //       const gasToken = ethers.constants.AddressZero;
  //       const refundReceiver = ethers.constants.AddressZero;

  //       const transferEther = false;
  //       const etherReceiver = ethers.constants.AddressZero;
  //       const etherAmount = 0;

  //       const amount = 4000;

  //       //   construct call data of inline assembly
  //       let ABI = ["function transfer(address to, uint256 amount)"];
  //       let iface = new ethers.utils.Interface(ABI);
  //       const data = iface.encodeFunctionData("transfer", [
  //         accepterAddress,
  //         amount,
  //       ]);

  //       checkNonce = await checkNonceGenerator({
  //         checkOwner: checkOwner,
  //         to: to,
  //         erc20Address: erc20_1.address,
  //         amount: amount,
  //       });

  //       // construct msgHash which is to be signed by owners of multiSigWallet

  //       const { msgHash } = await signERC20TransferCheck({
  //         callExternalContract: callExternalContract,
  //         to: erc20_1.address,
  //         checkOwner: checkOwner,
  //         value: value,
  //         checkNonce: checkNonce,
  //         data: data,
  //         operation: operation,
  //         safeTxGas: safeTxGas,
  //         baseGas: baseGas,
  //         gasPrice: gasPrice,
  //         gasToken: gasToken,
  //         refundReceiver: refundReceiver,
  //         transferEther: transferEther,
  //         etherReceiver: etherReceiver,
  //         etherAmount: etherAmount,
  //         multiSigWalletAddress: multiSigWallet.address,
  //         chainId: hre.network.config.chainId,
  //       });

  //       var signerLs: Array<Wallet> = [owner1, owner2, owner3];
  //       signerLs = addressSorter(signerLs);

  //       var compactSigLs: Array<string> = [];
  //       for (const signer of signerLs) {
  //         // The signature format is a compact form of:
  //         // {bytes32 r}{bytes32 s}{uint8 v}
  //         // Compact means, uint8 is not padded to 32 bytes.
  //         var compactSig = await signer.signMessage(msgHash);

  //         compactSig =
  //           compactSig.slice(0, compactSig.length - 2) +
  //           (compactSig.slice(compactSig.length - 2, compactSig.length) == "1b"
  //             ? "1f"
  //             : "20");
  //         compactSigLs.push(compactSig);
  //       }

  //       // aggregate signers' sig
  //       const aggregatedSig = await compactSigLs.reduce(
  //         (accumulator, currentValue) => accumulator + currentValue.slice(2)
  //       );

  //       // construct checkInfo
  //       checkMsg = ethers.utils.defaultAbiCoder.encode(
  //         [
  //           "tuple(bool callExternalContract, address checkOwner, address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, uint256 gasToken, address payable refundReceiver, bool transferEther, address payable etherReceiver, uint256 etherAmount, uint256 checkNonce, bytes signatures)",
  //         ],
  //         [
  //           {
  //             callExternalContract: true,
  //             to: erc20_1.address,
  //             checkOwner: checkOwner,
  //             value: value,
  //             data: data,
  //             operation: operation,
  //             safeTxGas: safeTxGas,
  //             baseGas: baseGas,
  //             gasPrice: gasPrice,
  //             gasToken: gasToken,
  //             refundReceiver: refundReceiver,
  //             transferEther: false,
  //             etherReceiver: etherReceiver,
  //             etherAmount: etherAmount,
  //             checkNonce: checkNonce,
  //             signatures: aggregatedSig,
  //           },
  //         ]
  //       );

  //       balanceOfAccepterBeforeCheckExecution = ethers.provider.getBalance(
  //         accepter.address
  //       );
  //       balanceOfMultiSigWalletBeforeCheckExecution = ethers.provider.getBalance(
  //         multiSigWallet.address
  //       );
  //       const res = await multiSigWallet.connect(accepter).executeCheck(checkMsg);
  //     });

  //     it("check remain erc20_1 amount after transaction", async function () {
  //       const newBalanceOfTo = await erc20_1.balanceOf(accepter.address);
  //       const newBalanceOfMultiSigWallet = await erc20_1.balanceOf(
  //         multiSigWallet.address
  //       );

  //       expect(newBalanceOfTo).to.equal(4000);
  //       expect(newBalanceOfMultiSigWallet).to.equal(6000);
  //     });

  //     it("after checkExecution, check check's validity", async function () {
  //       expect(multiSigWallet.checkValidity(checkMsg)).to.be.revertedWith(
  //         "used checkNonce"
  //       );
  //     });

  //     it("after check's execution, use check again, contract should revert ", async function () {
  //       expect(
  //         multiSigWallet.connect(accepter).executeCheck(checkMsg)
  //       ).to.be.revertedWith("used checkNonce");
  //     });
  //   });
});
