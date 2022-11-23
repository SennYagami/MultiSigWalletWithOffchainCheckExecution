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
        bool callExternalContract;
        address checkOwner;
        address to;
        uint256 value;
        bytes data;
        Enum.Operation operation;
        // Payment info
        uint256 safeTxGas;
        uint256 baseGas;
        uint256 gasPrice;
        address gasToken;
        address payable refundReceiver;
        // transfer etherInfo
        bool transferEther;
        address payable etherReceiver;
        uint256 etherAmount;
        // Signature info
        uint256 checkNonce;
        bytes signatures;
    }

    // keccak256(
    //     "SafeCheckExecution(address checkOwner,address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
    // );

    bytes32 private constant SAFE_CHECK_EXECUTION_TYPEHASH = 0xe862762e9cc423ab9325aacefda6c3feadcb9e6aa390fbbd3667781066ee5429;
    mapping(uint256 => bool) private executedCheckNonceRegister;

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

        console.logString("callExternalContract");
        console.logBool(checkInfo.callExternalContract);
        console.logString("to");
        console.logAddress(checkInfo.to);
        console.logString("checkOwner");
        console.logAddress(checkInfo.checkOwner);
        console.logString("value");
        console.logUint(checkInfo.value);
        console.logString("data");
        console.logBytes(checkInfo.data);
        console.logString("operation comparation res");
        if (checkInfo.operation == Enum.Operation.Call) {
            console.log(0);
        } else {
            console.log(1);
        }
        console.logString("safeTxGas----------------------");
        console.logUint(checkInfo.safeTxGas);
        console.logString("baseGas----------------------");
        console.logUint(checkInfo.baseGas);
        console.logString("gasPrice----------------------");
        console.logUint(checkInfo.gasPrice);
        console.logString("gasToken----------------------");
        console.logAddress(checkInfo.gasToken);
        console.logString("refundReceiver----------------------");
        console.logAddress(checkInfo.refundReceiver);
        console.logString("transferEther----------------------");
        console.logBool(checkInfo.transferEther);
        console.logString("etherReceiver----------------------");
        console.logAddress(checkInfo.etherReceiver);
        console.logString("etherAmount----------------------");
        console.logUint(checkInfo.etherAmount);

        console.logString("checkNonce----------------------");
        console.logUint(checkInfo.checkNonce);
        console.logString("signature----------------------");
        console.logBytes(checkInfo.signatures);

        // check whether this checkNoce has been used before
        require(executedCheckNonceRegister[checkInfo.checkNonce] == false, "used checkNonce");

        // if this checkNonce has not been used before, then it's valid, and we should mark it used.
        executedCheckNonceRegister[checkInfo.checkNonce] = true;
        // this is to protect checkOwner, only checkOwner can uses this check, so even if others has stolen the check, without checkOwner's private key, stealer can't user it.

        require(msg.sender == checkInfo.checkOwner, "check owner and msg sender don't match");

        // Use scope here to limit variable lifetime and prevent `stack too deep` errors
        {
            bytes memory txHashData = encodeCheckExecutionData(checkInfo);
            // Increase nonce and execute transaction.
            executedCheckNonceRegister[nonce] == true;
            txHash = keccak256(txHashData);

            checkSignatures(txHash, txHashData, checkInfo.signatures);
        }

        {
            uint256 gasUsed = gasleft();
            if (checkInfo.callExternalContract) {
                // If the gasPrice is 0 we assume that nearly all available gas can be used (it is always more than safeTxGas)
                // We only substract 2500 (compared to the 3000 before) to ensure that the amount passed is still higher than safeTxGas
                success = execute(
                    checkInfo.to,
                    checkInfo.value,
                    checkInfo.data,
                    checkInfo.operation,
                    checkInfo.gasPrice == 0 ? (gasleft() - 2500) : checkInfo.safeTxGas
                );
            }

            if (checkInfo.transferEther) {
                require(checkInfo.etherReceiver != address(0));
                require((checkInfo.etherReceiver).send(checkInfo.etherAmount), "transfer ether failed");
                success = true;
            }

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
    }

    function decodeCheckMsg(bytes memory checkMsg) private pure returns (CheckInfo memory checkInfo) {
        checkInfo = abi.decode(checkMsg, (CheckInfo));
    }

    function concat(bytes memory a, bytes memory b) internal pure returns (bytes memory) {
        return abi.encodePacked(a, b);
    }

    /// @dev Returns the bytes that are hashed to be signed by owners.
    /// @param checkInfo checkInfo
    /// @return Transaction hash bytes.
    function encodeCheckExecutionData(CheckInfo memory checkInfo) public view returns (bytes memory) {
        bytes32 safeCheckExecutionHash = keccak256(concat(encodeCheckExecutionData_1(checkInfo), encodeCheckExecutionData_2(checkInfo)));

        return abi.encodePacked(bytes1(0x19), bytes1(0x01), domainSeparator(), safeCheckExecutionHash);
    }

    // too avoid stack too deep, encode twice and concat together
    function encodeCheckExecutionData_1(CheckInfo memory checkInfo) public pure returns (bytes memory) {
        bytes memory e1 = abi.encode(
            SAFE_CHECK_EXECUTION_TYPEHASH,
            checkInfo.callExternalContract,
            checkInfo.checkOwner,
            checkInfo.to,
            checkInfo.value,
            keccak256(checkInfo.data),
            checkInfo.operation,
            checkInfo.safeTxGas,
            checkInfo.baseGas
        );

        return e1;
    }

    // too avoid stack too deep, encode twice and concat together
    function encodeCheckExecutionData_2(CheckInfo memory checkInfo) public pure returns (bytes memory) {
        bytes memory e2 = abi.encode(
            checkInfo.gasPrice,
            checkInfo.gasToken,
            checkInfo.refundReceiver,
            checkInfo.transferEther,
            checkInfo.etherReceiver,
            checkInfo.etherAmount,
            checkInfo.checkNonce
        );

        return e2;
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

    function checkValidity(bytes memory checkMsg) public view returns (bool) {
        bytes32 txHash;

        // decode checkMsg to get check info
        CheckInfo memory checkInfo = decodeCheckMsg(checkMsg);

        // console.logString("to");
        // check whether this checkNoce has been used before
        require(executedCheckNonceRegister[checkInfo.checkNonce] == false, "used checkNonce");

        // Use scope here to limit variable lifetime and prevent `stack too deep` errors
        {
            bytes memory txHashData = encodeCheckExecutionData(checkInfo);
            // Increase nonce and execute transaction.
            executedCheckNonceRegister[nonce] == true;
            txHash = keccak256(txHashData);

            checkSignatures(txHash, txHashData, checkInfo.signatures);
        }

        return true;
    }
}
