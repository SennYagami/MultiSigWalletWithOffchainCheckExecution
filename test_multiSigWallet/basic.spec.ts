import { Wallet, BigNumber } from "ethers";
import hre from "hardhat";

require("dotenv").config();

import { expect } from "chai";
import { ethers } from "hardhat";
import { randomHex, toHex } from "./utils/encoding";
import { faucet } from "./utils/faucet";
import type { CheckExecutor, ERC20, MultiSigWallet } from "../typechain-types";
import {
  multiSigWalletFixture,
  erc20Fixture,
  CheckExecutorFixture,
} from "./utils/fixture";
import { addressSorter } from "./utils/commen";

import {
  checkNonceGenerator,
  signMsgHash,
  generateCheckMsg,
  executorMsgHashGenerator,
  multiSigWalletMsgHashGenerator,
} from "./utils/offChainMultiSign";
import { base, GnosisSafe } from "../typechain-types/contracts";
import { before } from "mocha";
import { multiSigWalletParams, params } from "../utils/sharedtype";

/**
 * Signs off chain check to transfer ether/ERC20 from multiSigWallet
 */
describe("platformWallet basic test", function () {
  var multiSigWallet: GnosisSafe;
  var checkExecutor: CheckExecutor;
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
    checkExecutor = await CheckExecutorFixture(
      multiSigWalletCreator,
      multiSigWallet.address
    );

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
    await faucet(multiSigWallet.address, provider);

    // create erc20 contract
    erc20_1 = await erc20Fixture(erc20Creator);

    await erc20_1.connect(erc20Creator).transfer(multiSigWallet.address, 10000);
  });

  describe("verify multiSigStatus ownerships ", async function () {
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

  describe("multiSigWallet interacts checkExecutor", async function () {
    describe("multiSigWallet transfer ether to checkExecutor", async function () {
      var params: multiSigWalletParams;
      var aggregatedSig;
      this.beforeAll(async function () {
        // transfer ether from multiSigWallet to checkExecutor
        const to = checkExecutor.address;
        const value = ethers.utils.parseEther("100");
        const data = "0x00";
        const operation = 0;
        const safeTxGas = 0;
        const baseGas = 0;
        const gasPrice = 0;
        const gasToken = ethers.constants.AddressZero;
        const refundReceiver = ethers.constants.AddressZero;
        const currentNonce = await multiSigWallet.nonce();
        const nonce = currentNonce.toNumber();
        const chainId = hre.network.config.chainId;
        const multiSigWalletAddress = multiSigWallet.address;

        if (chainId == undefined) {
          process.exit(0);
        }

        params = {
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
        aggregatedSig = await signMsgHash({ msgHash, signerLs });

        const res = await multiSigWallet
          .connect(owner1)
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

        // transfer erc20 from multiSigWallet to checkExecutor
      });
      it("check ether after check execution", async function () {
        const balanceOfCheckExectutorAfterCheckExecution =
          await ethers.provider.getBalance(checkExecutor.address);

        expect(balanceOfCheckExectutorAfterCheckExecution).to.equal(
          ethers.utils.parseEther("100")
        );
      });

      it("after check's execution, use check again, contract should revert ", async function () {
        expect(
          multiSigWallet
            .connect(owner1)
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
            )
        ).to.be.revertedWith("GS026");
        // });
      });

      describe("checkExecutor transfer ether to accepter", async function () {
        var checkMsg;
        this.beforeAll(async function () {
          const checkOwner = accepter.address;

          // external contract address to be called
          const to = accepter.address;

          // transfer ether no need data
          const data = "0x00";
          const value: BigNumber = ethers.utils.parseEther("1");
          const operation = 0;
          const safeTxGas = 0;
          const baseGas = 0;
          const gasPrice = 0;
          const gasToken = ethers.constants.AddressZero;
          const refundReceiver = ethers.constants.AddressZero;

          const chainId = hre.network.config.chainId;
          const multiSigWalletAddress = multiSigWallet.address;
          const checkExecutorAddress = checkExecutor.address;

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

          const res = await checkExecutor
            .connect(accepter)
            .executeCheck(checkMsg);
        });

        it("check ether after check execution", async function () {
          const balanceOfAccepterAfterCheckExecution =
            await ethers.provider.getBalance(accepter.address);
          const balanceOfCheckExecutorAfterCheckExecution =
            await ethers.provider.getBalance(checkExecutor.address);

          //   console.log({
          //     balanceOfAccepterAfterCheckExecution: ethers.utils.formatEther(
          //       balanceOfAccepterAfterCheckExecution
          //     ),
          //   });

          expect(balanceOfCheckExecutorAfterCheckExecution).to.equal(
            ethers.utils.parseEther("99")
          );
        });

        it("after checkExecution, check check's validity", async function () {
          expect(checkExecutor.checkValidity(checkMsg)).to.be.revertedWith(
            "C200"
          );
        });

        it("after check's execution, use check again, contract should revert ", async function () {
          expect(
            checkExecutor.connect(accepter).executeCheck(checkMsg)
          ).to.be.revertedWith("C200");
          // });
        });
      });
    });
    describe("multiSigWallet transfer erc20 to checkExecutor", async function () {
      var params: multiSigWalletParams;
      var aggregatedSig;
      this.beforeAll(async function () {
        // transfer ether from multiSigWallet to checkExecutor
        const to = erc20_1.address;
        const value = ethers.utils.parseEther("0");
        let ABI = ["function transfer(address to, uint256 amount)"];
        let iface = new ethers.utils.Interface(ABI);
        const data = iface.encodeFunctionData("transfer", [
          checkExecutor.address,
          4000,
        ]);

        const operation = 0;
        const safeTxGas = 0;
        const baseGas = 0;
        const gasPrice = 0;
        const gasToken = ethers.constants.AddressZero;
        const refundReceiver = ethers.constants.AddressZero;
        const currentNonce = await multiSigWallet.nonce();
        const nonce = currentNonce.toNumber();
        const chainId = hre.network.config.chainId;
        const multiSigWalletAddress = multiSigWallet.address;

        if (chainId == undefined) {
          process.exit(0);
        }

        params = {
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
        aggregatedSig = await signMsgHash({ msgHash, signerLs });

        const res = await multiSigWallet
          .connect(owner1)
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

        // transfer erc20 from multiSigWallet to checkExecutor
      });

      it("check erc20_1 balance after check execution", async function () {
        const balanceOfCheckExectutorAfterCheckExecution =
          await erc20_1.balanceOf(checkExecutor.address);

        expect(balanceOfCheckExectutorAfterCheckExecution).to.equal(4000);
      });

      it("after check's execution, use check again, contract should revert ", async function () {
        expect(
          multiSigWallet
            .connect(owner1)
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
            )
        ).to.be.revertedWith("GS026");
        // });
      });

      describe("checkExecutor transfer erc20_1 to accepter", async function () {
        var checkMsg;
        this.beforeAll(async function () {
          const checkOwner = accepter.address;

          // construct call data of inline assembly, this 'to' is not identical to 'to' in params. The former is external contract address, the latter is param in transfer function, the target to transfer ERC20
          let ABI = ["function transfer(address to, uint256 amount)"];
          let iface = new ethers.utils.Interface(ABI);
          const data = iface.encodeFunctionData("transfer", [
            accepter.address,
            3000,
          ]);

          const value: BigNumber = ethers.utils.parseEther("0");
          const to = erc20_1.address;
          const operation = 0;
          const safeTxGas = 0;
          const baseGas = 0;
          const gasPrice = 0;
          const gasToken = ethers.constants.AddressZero;
          const refundReceiver = ethers.constants.AddressZero;

          const chainId = hre.network.config.chainId;
          const multiSigWalletAddress = multiSigWallet.address;
          const checkExecutorAddress = checkExecutor.address;

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

          checkMsg = await generateCheckMsg({
            params,
            checkNonce,
            data,
            aggregatedSig,
          });

          const res = await checkExecutor
            .connect(accepter)
            .executeCheck(checkMsg);
        });

        it("check remain erc20_1 amount after transaction", async function () {
          const newBalanceOfTo = await erc20_1.balanceOf(accepter.address);
          const newBalanceOfCheckExecutor = await erc20_1.balanceOf(
            checkExecutor.address
          );

          expect(newBalanceOfTo).to.equal(3000);
          expect(newBalanceOfCheckExecutor).to.equal(1000);
        });

        it("after checkExecution, check check's validity", async function () {
          expect(checkExecutor.checkValidity(checkMsg)).to.be.revertedWith(
            "C200"
          );
        });

        it("after check's execution, use check again, contract should revert ", async function () {
          expect(
            checkExecutor.connect(accepter).executeCheck(checkMsg)
          ).to.be.revertedWith("C200");
        });
        it("after check's execution, checkExecutor's ether is not moved", async function () {
          const etherBalanceOfCheckExecutor = await ethers.provider.getBalance(
            checkExecutor.address
          );
          expect(etherBalanceOfCheckExecutor).to.equal(
            ethers.utils.parseEther("99")
          );
        });
      });
    });
  });
});
