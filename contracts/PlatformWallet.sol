// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.7.0 <0.9.0;
import "./GnosisSafe.sol";

contract Wallet is GnosisSafe {
    event ExecuteCheckSuccess(address checkOwner, address indexed to, uint256 value, bytes data, Enum.Operation operation);
    event ExecuteCheckFailure(address checkOwner, address indexed to, uint256 value, bytes data, Enum.Operation operation);

    // to avoid modifying safe-contract, redeclare SAFE_TX_TYPEHASH here
    bytes32 private constant SAFE_TX_TYPEHASH = 0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8;
    mapping(uint256 => bool) executedCheckNonceRegister;

    /**
     * @dev This function verifies check's validity, decodes contract address and params from totalMsg, and executes.
     *      Project managers can sign a multisig check, and the check owner can transfer specified amount of token from this wallet
     *      Every check has a nonce attached, before the check is executed, the nonce will be checked ensuring that it has not been used
     *      After check has been executed, the nonce will be registered into userClaimedTokenNonce, and this check can't be used anymore.
     * @param
     * @dev
     */
    function executeCheck(bytes memory checkMsg) public returns (bool) {
        address to;
        address checkOwner;
        uint256 value;
        bytes memory data;
        Enum.Operation operation;
        uint256 safeTxGas;
        uint256 baseGas;
        uint256 gasPrice;
        address gasToken;
        address payable refundReceiver;
        uint256 checkNonce;
        bytes memory signatures;
        bool success;

        (checkOwner, to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, checkNonce, signatures) = abi
            .decode(
                checkMsg,
                (address, address, uint256, bytes, Enum.Operation, uint256, uint256, uint256, address, address, uint256, bytes)
            );

        require(executedCheckNonceRegister[nonce] == true, "used nonce");
        executedCheckNonceRegister[nonce] == true;
        require(msg.sender == checkOwner, "check owner and msg sender don't match");

        bytes32 txHash;
        // Use scope here to limit variable lifetime and prevent `stack too deep` errors
        {
            bytes memory txHashData = encodeCheckExecutionData(
                // Transaction info
                checkOwner,
                to,
                value,
                data,
                operation,
                safeTxGas,
                // Payment info
                baseGas,
                gasPrice,
                gasToken,
                refundReceiver,
                // Signature info
                checkNonce
            );
            // Increase nonce and execute transaction.
            executedCheckNonceRegister[nonce] == true;
            txHash = keccak256(txHashData);
            checkSignatures(txHash, txHashData, signatures);
        }
        address guard = getGuard();
        {
            if (guard != address(0)) {
                Guard(guard).checkTransaction(
                    // Transaction info
                    to,
                    value,
                    data,
                    operation,
                    safeTxGas,
                    // Payment info
                    baseGas,
                    gasPrice,
                    gasToken,
                    refundReceiver,
                    // Signature info
                    signatures,
                    msg.sender
                );
            }
        }
        {
            success = execute(to, value, data, operation, gasleft() - 2500);

            if (success) emit ExecuteCheckSuccess(checkOwner, to, value, data, operation);
            else emit ExecuteCheckFailure(checkOwner, to, value, data, operation);
        }
        {
            if (guard != address(0)) {
                Guard(guard).checkAfterExecution(txHash, success);
            }
        }
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
    /// @param _nonce Transaction nonce.
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
        uint256 _nonce
    ) public view returns (bytes memory) {
        bytes32 safeTxHash = keccak256(
            abi.encode(
                SAFE_TX_TYPEHASH,
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
                _nonce
            )
        );
        return abi.encodePacked(bytes1(0x19), bytes1(0x01), domainSeparator(), safeTxHash);
    }
}
