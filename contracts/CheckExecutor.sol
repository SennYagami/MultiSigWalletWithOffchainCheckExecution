// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.7.0 <0.9.0;
pragma abicoder v2;
import "./external/GnosisSafeMath.sol";
import "./interfaces/IGnosisSafe.sol";
import "hardhat/console.sol";
import "./common/Enum.sol";
import "./common/SecuredTokenTransfer.sol";
import "./base/Executor.sol";
import "hardhat/console.sol";

contract CheckExecutor is Executor, SecuredTokenTransfer {
    event ExecuteCheckSuccess(address checkOwner, address indexed to, uint256 value, bytes data, Enum.Operation operation);
    event ExecuteCheckFailure(address checkOwner, address indexed to, uint256 value, bytes data, Enum.Operation operation);
    address private immutable multiSigWalletAddress;

    using GnosisSafeMath for uint256;

    struct CheckInfo {
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
        // Signature info
        uint256 checkNonce;
        bytes signatures;
    }

    // keccak256(
    //     "EIP712Domain(uint256 chainId,address verifyingContract)"
    // );
    bytes32 private constant DOMAIN_SEPARATOR_TYPEHASH = 0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218;

    // keccak256(
    //     "SafeCheckExecution(address checkOwner,address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
    // );
    bytes32 private constant SAFE_CHECK_EXECUTION_TYPEHASH = 0xe862762e9cc423ab9325aacefda6c3feadcb9e6aa390fbbd3667781066ee5429;
    mapping(uint256 => bool) private executedCheckNonceRegister;

    constructor(address a) {
        multiSigWalletAddress = a;
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_SEPARATOR_TYPEHASH, getChainId(), this));
    }

    /// @dev Returns the chain id used by this contract.
    function getChainId() public pure returns (uint256) {
        uint256 id;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            id := chainid()
        }
        return id;
    }

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

        // console.logString("callExternalContract");
        // console.logBool(checkInfo.callExternalContract);
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
        // console.logString("transferEther----------------------");
        // console.logBool(checkInfo.transferEther);
        // console.logString("etherReceiver----------------------");
        // console.logAddress(checkInfo.etherReceiver);
        // console.logString("etherAmount----------------------");
        // console.logUint(checkInfo.etherAmount);

        // console.logString("checkNonce----------------------");
        // console.logUint(checkInfo.checkNonce);
        // console.logString("signature----------------------");
        // console.logBytes(checkInfo.signatures);

        // check whether this checkNoce has been used before
        require(executedCheckNonceRegister[checkInfo.checkNonce] == false, "C200");

        // if this checkNonce has not been used before, then it's valid, and we should mark it used.
        executedCheckNonceRegister[checkInfo.checkNonce] = true;
        // this is to protect checkOwner, only checkOwner can uses this check, so even if others has stolen the check, without checkOwner's private key, stealer can't user it.

        require(msg.sender == checkInfo.checkOwner, "C201");

        // Use scope here to limit variable lifetime and prevent `stack too deep` errors
        {
            bytes memory txHashData = encodeCheckExecutionData(checkInfo);

            txHash = keccak256(txHashData);

            // if check failed, then revert
            IGnosisSafe(multiSigWalletAddress).checkSignatures(txHash, txHashData, checkInfo.signatures);
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
    }

    function decodeCheckMsg(bytes memory checkMsg) private pure returns (CheckInfo memory checkInfo) {
        checkInfo = abi.decode(checkMsg, (CheckInfo));
    }

    /// @dev Returns the bytes that are hashed to be signed by owners.
    /// @param checkInfo checkInfo
    /// @return Transaction hash bytes.
    function encodeCheckExecutionData(CheckInfo memory checkInfo) public view returns (bytes memory) {
        // bytes32 safeCheckExecutionHash = keccak256(concat(encodeCheckExecutionData_1(checkInfo), encodeCheckExecutionData_2(checkInfo)));
        bytes32 safeCheckExecutionHash = keccak256(
            abi.encode(
                SAFE_CHECK_EXECUTION_TYPEHASH,
                checkInfo.checkOwner,
                checkInfo.to,
                checkInfo.value,
                keccak256(checkInfo.data),
                checkInfo.operation,
                checkInfo.safeTxGas,
                checkInfo.baseGas,
                checkInfo.gasPrice,
                checkInfo.gasToken,
                checkInfo.refundReceiver,
                checkInfo.checkNonce
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

    function checkValidity(bytes memory checkMsg) public view returns (bool) {
        bytes32 txHash;

        // decode checkMsg to get check info
        CheckInfo memory checkInfo = decodeCheckMsg(checkMsg);

        // console.logString("to");
        // check whether this checkNoce has been used before
        require(executedCheckNonceRegister[checkInfo.checkNonce] == false, "C200");

        // Use scope here to limit variable lifetime and prevent `stack too deep` errors
        {
            bytes memory txHashData = encodeCheckExecutionData(checkInfo);
            // Increase nonce and execute transaction.
            executedCheckNonceRegister[checkInfo.checkNonce] == true;
            txHash = keccak256(txHashData);

            IGnosisSafe(multiSigWalletAddress).checkSignatures(txHash, txHashData, checkInfo.signatures);
        }

        return true;
    }

    receive() external payable {}

    fallback() external payable {}
}
