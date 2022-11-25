// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Token is ERC20 {
    constructor() public ERC20("TestToken", "TT1") {
        _mint(msg.sender, 100000000000000000000000000);
    }
}
