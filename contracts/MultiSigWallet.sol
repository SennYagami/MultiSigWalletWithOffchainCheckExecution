// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;
import "./GnosisSafe.sol";
import "./external/GnosisSafeMath.sol";
import "hardhat/console.sol";

contract MultiSigWallet is GnosisSafe {
    event ExecuteCheckSuccess(address checkOwner, address indexed to, uint256 value, bytes data, Enum.Operation operation);
    event ExecuteCheckFailure(address checkOwner, address indexed to, uint256 value, bytes data, Enum.Operation operation);

    using GnosisSafeMath for uint256;

    struct CheckInfo {
        // Transaction info
        address to;
        address checkOwner;
        uint256 value;
        bytes data;
        Enum.Operation operation;
        // Payment info
        uint256 safeTxGas;
        uint256 baseGas;
        uint256 gasPrice;
        address gasToken;
        address payable refundReceiver;
        // Signature info
        uint256 checkNonce;
        bytes signatures;
    }

    // keccak256(
    //     "SafeCheckExecution(address checkOwner,address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
    // );

    bytes32 private constant SAFE_CHECK_EXECUTION_TYPEHASH = 0xe862762e9cc423ab9325aacefda6c3feadcb9e6aa390fbbd3667781066ee5429;
    mapping(uint256 => bool) executedCheckNonceRegister;

    /**
     * @dev This function verifies check's validity, decodes contract address and params from totalMsg, and executes.
     *      Project managers can sign a multisig check, and the check owner can transfer specified amount of token from this wallet
     *      Every check has a nonce attached, before the check is executed, the nonce will be checked ensuring that it has not been used
     *      After check has been executed, the nonce will be registered into userClaimedTokenNonce, and this check can't be used anymore.
     */
    function executeCheck(bytes memory checkMsg) public returns (bool success) {
        bytes32 txHash;

        // decode checkMsg to get check info
        CheckInfo memory checkInfo = decodeCheckMsg(checkMsg);

        // console.logString("to");
        // console.logAddress(checkInfo.to);
        // console.logString("checkOwner");
        // console.logAddress(checkInfo.checkOwner);
        // console.logString("value");
        // console.logUint(checkInfo.value);
        // console.logString("data");
        // console.logBytes(checkInfo.data);
        // console.logString("operation comparation res");
        // if (checkInfo.operation == Enum.Operation.Call) {
        //     console.log(0);
        // } else {
        //     console.log(1);
        // }
        // console.logString("safeTxGas----------------------");
        // console.logUint(checkInfo.safeTxGas);
        // console.logString("baseGas----------------------");
        // console.logUint(checkInfo.baseGas);
        // console.logString("gasPrice----------------------");
        // console.logUint(checkInfo.gasPrice);
        // console.logString("gasToken----------------------");
        // console.logAddress(checkInfo.gasToken);
        // console.logString("refundReceiver----------------------");
        // console.logAddress(checkInfo.refundReceiver);
        // console.logString("checkNonce----------------------");
        // console.logUint(checkInfo.checkNonce);
        // console.logString("signature----------------------");
        // console.logBytes(checkInfo.signatures);

        // check whether this checkNoce has been used before
        require(executedCheckNonceRegister[checkInfo.checkNonce] == false, "used nonce");

        // if this checkNonce has not been used before, then it's valid, and we should mark it used.
        executedCheckNonceRegister[nonce] == true;
        // this is to protect checkOwner, only checkOwner can uses this check, so even if others has stolen the check, without checkOwner's private key, stealer can't user it.
        require(msg.sender == checkInfo.checkOwner, "check owner and msg sender don't match");

        // Use scope here to limit variable lifetime and prevent `stack too deep` errors
        {
            bytes memory txHashData = encodeCheckExecutionData(
                // Transaction info
                checkInfo.checkOwner,
                //
                checkInfo.to,
                checkInfo.value,
                checkInfo.data,
                checkInfo.operation,
                checkInfo.safeTxGas,
                // Payment info
                checkInfo.baseGas,
                checkInfo.gasPrice,
                checkInfo.gasToken,
                checkInfo.refundReceiver,
                // Signature info
                checkInfo.checkNonce
            );
            // Increase nonce and execute transaction.
            executedCheckNonceRegister[nonce] == true;
            txHash = keccak256(txHashData);

            checkSignatures(txHash, txHashData, checkInfo.signatures);
        }
        address guard = getGuard();
        {
            if (guard != address(0)) {
                Guard(guard).checkTransaction(
                    // Transaction info
                    checkInfo.to,
                    checkInfo.value,
                    checkInfo.data,
                    checkInfo.operation,
                    checkInfo.safeTxGas,
                    // Payment info
                    checkInfo.baseGas,
                    checkInfo.gasPrice,
                    checkInfo.gasToken,
                    checkInfo.refundReceiver,
                    // Signature info
                    checkInfo.signatures,
                    msg.sender
                );
            }
        }
        {
            uint256 gasUsed = gasleft();
            // If the gasPrice is 0 we assume that nearly all available gas can be used (it is always more than safeTxGas)
            // We only substract 2500 (compared to the 3000 before) to ensure that the amount passed is still higher than safeTxGas
            success = execute(
                checkInfo.to,
                checkInfo.value,
                checkInfo.data,
                checkInfo.operation,
                checkInfo.gasPrice == 0 ? (gasleft() - 2500) : checkInfo.safeTxGas
            );

            gasUsed = gasUsed.sub(gasleft());
            // If no safeTxGas and no gasPrice was set (e.g. both are 0), then the internal tx is required to be successful
            // This makes it possible to use `estimateGas` without issues, as it searches for the minimum gas where the tx doesn't revert
            require(success || checkInfo.safeTxGas != 0 || checkInfo.gasPrice != 0, "GS013");
            // We transfer the calculated tx costs to the tx.origin to avoid sending it to intermediate contracts that have made calls
            uint256 payment = 0;
            if (checkInfo.gasPrice > 0) {
                payment = handlePaymentOfCheckExecution(
                    gasUsed,
                    checkInfo.baseGas,
                    checkInfo.gasPrice,
                    checkInfo.gasToken,
                    checkInfo.refundReceiver
                );
            }

            if (success) emit ExecuteCheckSuccess(checkInfo.checkOwner, checkInfo.to, checkInfo.value, checkInfo.data, checkInfo.operation);
            else emit ExecuteCheckFailure(checkInfo.checkOwner, checkInfo.to, checkInfo.value, checkInfo.data, checkInfo.operation);
        }
        {
            if (guard != address(0)) {
                Guard(guard).checkAfterExecution(txHash, success);
            }
        }
    }

    function decodeCheckMsg(bytes memory checkMsg) private pure returns (CheckInfo memory checkInfo) {
        checkInfo = abi.decode(checkMsg, (CheckInfo));
    }

    /// @dev Returns the bytes that are hashed to be signed by owners.
    /// @param checkOwner the owner of the check.
    /// @param to Destination address.
    /// @param value Ether value.
    /// @param data Data payload.
    /// @param operation Operation type.
    /// @param safeTxGas Gas that should be used for the safe transaction.
    /// @param baseGas Gas costs for that are independent of the transaction execution(e.g. base transaction fee, signature check, payment of the refund)
    /// @param gasPrice Maximum gas price that should be used for this transaction.
    /// @param gasToken Token address (or 0 if ETH) that is used for the payment.
    /// @param refundReceiver Address of receiver of gas payment (or 0 if tx.origin).
    /// @param checkNonce Check nonce.
    /// @return Transaction hash bytes.
    function encodeCheckExecutionData(
        address checkOwner,
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        uint256 checkNonce
    ) public view returns (bytes memory) {
        bytes32 safeCheckExecutionHash = keccak256(
            abi.encode(
                SAFE_CHECK_EXECUTION_TYPEHASH,
                checkOwner,
                to,
                value,
                keccak256(data),
                operation,
                safeTxGas,
                baseGas,
                gasPrice,
                gasToken,
                refundReceiver,
                checkNonce
            )
        );

        return abi.encodePacked(bytes1(0x19), bytes1(0x01), domainSeparator(), safeCheckExecutionHash);
    }

    function handlePaymentOfCheckExecution(
        uint256 gasUsed,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver
    ) private returns (uint256 payment) {
        // solhint-disable-next-line avoid-tx-origin
        address payable receiver = refundReceiver == address(0) ? payable(tx.origin) : refundReceiver;
        if (gasToken == address(0)) {
            // For ETH we will only adjust the gas price to not be higher than the actual used gas price
            payment = gasUsed.add(baseGas).mul(gasPrice < tx.gasprice ? gasPrice : tx.gasprice);
            require(receiver.send(payment), "GS011");
        } else {
            payment = gasUsed.add(baseGas).mul(gasPrice);
            require(transferToken(gasToken, receiver, payment), "GS012");
        }
    }
}
