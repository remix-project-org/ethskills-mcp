# Deployment gas optimizations

Deployment cost = init code execution + 200 gas per byte of runtime bytecode + cold storage writes for any state initialized in the constructor. Reducing any of those reduces deploy cost. For contracts deployed many times (factories, per-user vaults), even small per-deploy savings compound enormously.

## 1. Predict addresses with the deployer nonce — avoid setter functions for interdependent contracts

When contract A needs to know contract B's address and vice versa, the naive approach is: deploy both, then call a `setX` function on each. That setter writes to storage (zero→non-zero, 22,100 gas) and adds a function to every call's runtime checks.

A better approach: addresses created by a deployer are deterministic — `address = keccak256(rlp([deployer, nonce]))[12:]`. If your deployer is a one-shot contract or a script, you can pre-compute the address each contract will be deployed to and pass it into the constructor. Both contracts get the right reference as an `immutable`, no storage, no setter.

```solidity
import {LibRLP} from "solady/utils/LibRLP.sol";

contract StorageContract {
    address immutable public writer;
    uint256 public x;
    constructor(address _writer) { writer = _writer; }
    function setX(uint256 x_) external {
        require(msg.sender == writer, "only writer can set");
        x = x_;
    }
}

contract Writer {
    StorageContract immutable public storageContract;
    constructor(StorageContract _sc) { storageContract = _sc; }
    function set(uint256 x_) external { storageContract.setX(x_); }
}

contract BurnerDeployer {
    using LibRLP for address;
    function deploy() public returns (StorageContract sc, address writer) {
        // Contract nonces start at 1 and increment on each CREATE
        StorageContract predicted = StorageContract(address(this).computeAddress(2));
        writer = address(new Writer(predicted));        // nonce 1
        sc = new StorageContract(writer);                // nonce 2
        require(sc == predicted, "address mismatch");    // sanity check
    }
}
```

Savings: ~2,000+ gas per `setX` call (no `SLOAD` for the writer address), plus the elimination of the deployment-time setter calls.

The same logic works in a deployment **script** — no need for a dedicated burner contract. Just compute the predicted address client-side using the deployer's known nonce.

## 2. Make constructors `payable`

Non-payable functions get an implicit `require(msg.value == 0)` inserted by the compiler. That's a few extra opcodes (CALLVALUE, ISZERO, etc.) — 200 gas saved on deployment, plus a slightly smaller creation bytecode.

The risk is essentially nil: the deployer is typically a trusted EOA or script that knows not to send ether unintentionally. There are good reasons to keep regular functions non-payable, but the constructor is almost always safe to mark `payable`.

## 3. Reduce metadata bytes (IPFS hash / `--no-cbor-metadata`)

The Solidity compiler appends ~51 bytes of CBOR-encoded metadata (containing the IPFS hash of the source) to deployed bytecode. At 200 gas per byte, that's >10,000 gas added to every deployment.

Two options:
- **`--no-cbor-metadata` compiler flag:** strips it entirely. Cost: source verification on Etherscan becomes harder (no automatic IPFS lookup), but contracts can still be verified manually.
- **Mine for a "vanity" metadata hash with leading zeros:** zero bytes in deployed code still take 200 gas each, but the deploy *calldata* costs less per zero byte (4 gas vs 16 for non-zero). Mining accomplishes this by adjusting a comment in the source until the IPFS hash has the desired prefix.

For high-frequency deployment (factory + many clones), this matters. For one-off contracts, the trouble usually isn't worth it.

## 4. `selfdestruct` in the constructor if the contract is one-time-use

Some patterns use a "deployer contract" whose only job is to deploy several real contracts atomically. Once it's done, it serves no purpose and its runtime bytecode is dead weight. Calling `selfdestruct(refundAddr)` at the end of the constructor means no runtime code is stored at all — pure init-code execution, no per-byte deployment fee for the runtime portion.

**Note:** post-Cancun, `selfdestruct` no longer clears contract code in most contexts (per EIP-6780). However, the exception explicitly preserved is: **`selfdestruct` called in the same transaction the contract is created** — which is exactly this pattern. So one-shot deployers still benefit.

## 5. Internal functions vs modifiers — understand the tradeoff

A modifier's body is inlined into every function that uses it. An internal function lives once and is called via `JUMP`.

- **Modifiers** → larger runtime bytecode (higher deploy cost), slightly cheaper to call (no jump overhead) but less flexible — they can only execute at the start or end of a function.
- **Internal functions** → smaller bytecode (cheaper to deploy), slightly more expensive per call (~24 gas for the jump), but can be called anywhere in a function body.

Rule of thumb: many call sites and you care about runtime → modifier. Many call sites and you care about deployment → internal function. Few call sites → either is fine.

Worked example: deploying a contract with three functions guarded by `onlyOwner` costs ~36,000 more gas with the modifier than with an internal function, while each call to a guarded function is ~24 gas cheaper with the modifier.

## 6. Use clones or metaproxies for repeated deployment of similar contracts

EIP-1167 minimal proxies ("clones") are tiny (45 bytes) and `DELEGATECALL` to a single implementation contract. Deploying 1,000 clones costs ~1,000 × (small) instead of 1,000 × (full implementation).

Tradeoff: every call to a clone pays the `DELEGATECALL` overhead (~2,600 cold / 100 warm) and an extra return-data copy. So clones are right when deploys are frequent and per-call activity is light. Gnosis Safe is the canonical example — each user deploys a clone once, then transactions through it are infrequent enough that the proxy overhead doesn't dominate.

EIP-3448 metaproxies extend the idea: the clone bytecode can encode a small amount of immutable per-instance data (e.g., the owner address) without storage. This eliminates a storage write on every clone deploy.

## 7. Admin functions can be `payable`

Same logic as `payable` constructors. Admin functions (only callable by `owner` / a trusted role) don't need the implicit `msg.value == 0` check. Marking them `payable` removes a few opcodes from each one — smaller deploy bytecode, slightly cheaper calls.

The risk is again low: admins are presumed competent. Make this a deliberate choice and document it.

## 8. Custom errors are (usually) smaller than `require` strings

`require(cond, "error message")` stores the message in bytecode and revert data — typically 64+ bytes after ABI-encoding (`Error(string)` selector + offset + length + padded string).

Custom errors store only their 4-byte selector + ABI-encoded arguments:
```solidity
error InvalidAmount();
if (_amount > 10 ether) revert InvalidAmount();
```

The revert path memory operations are smaller, and parameterized errors (`error InvalidAmount(uint256 supplied, uint256 max)`) carry runtime context for far less gas than a long string.

Exception: very short require strings (≤32 bytes total) may produce comparable bytecode. Test if you're shaving bytes at the margin, but as a default, prefer custom errors.

## 9. Use existing CREATE2 factories instead of deploying your own

If you just need deterministic addresses, a CREATE2 factory has already been deployed to many chains (e.g., the Arachnid deterministic deployment proxy at `0x4e59b44847b379578588920cA78FbF26c0B4956C`). Reusing it costs zero gas — you didn't deploy it. Writing and deploying your own factory is pure waste unless you need custom behavior.
