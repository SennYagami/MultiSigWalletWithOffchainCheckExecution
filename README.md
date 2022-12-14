## New functionality

### Offchain check

* Wallet owners can sign offchain checks authorizing check owner to execute specific transaction. For example, wallet owners can authorize check owners to execute transactions on behalf of the multi-signature wallet, for example, transferring ether, ERC20 or NFT from multi-signature wallet.
* The implementation of safe-contract restricts execution order because each signed msg has a nonce which should correspond to onchain nonce. In our implementation, each signed check also includes nonce, but the execution of check is order irrelevant. There is a mapping in contract called  `executedCheckNonceRegister` . Before check execution, the contract first checks whether the nonce included in the check is registered in the mapping , only check with unregistered nonce is valid. When check has been executed, the nonce will be registered in this mapping.
* Check execution also supports gas compensation

## Test

```JavaScript
npm i
```

```JavaScript
npx hardhat test test_multiSigWallet/basic.spec.ts
```

## Deploy

* In src_multiSigWallet/main.ts
