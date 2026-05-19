# Inline assembly optimizations

Assembly (Yul) lets you bypass the safety checks the Solidity compiler inserts. Done well, it saves gas. Done poorly, it introduces vulnerabilities the compiler would have caught (uninitialized memory access, missing zero-address checks, free memory pointer corruption).

**Default position: don't reach for assembly.** Try Solidity-level techniques first. Apply assembly only where the savings are meaningful and you've benchmarked the alternatives.

## EVM memory layout primer (essential context)

Solidity reserves the first three regions of memory for specific purposes:

| Offset | Size | Purpose |
| --- | --- | --- |
| `0x00`–`0x40` | 64 bytes | **Scratch space.** Free for any short-lived operation. |
| `0x40`–`0x60` | 32 bytes | **Free memory pointer.** Solidity reads this to know where to put new data. |
| `0x60`–`0x80` | 32 bytes | **Zero slot.** Used as the data pointer for uninitialized dynamic memory variables; assumed to contain zero. |
| `0x80`+ | dynamic | Where Solidity allocates memory via the free memory pointer. |

Many assembly optimizations exploit the scratch space and zero slot — locations Solidity won't touch behind your back, so you can use them freely *if your code path doesn't return to Solidity expecting the FMP to be correct*. Anywhere control returns to Solidity, update `0x40` to reflect any new allocations.

## 1. Use assembly to revert with an error message

The Solidity revert path involves type-checking and memory expansion costs that aren't strictly necessary. Hand-rolled assembly can shave ~300 gas on a revert with a string message.

```solidity
// Solidity revert — 24,042 gas to call and revert
function restrictedAction(uint256 num) external {
    require(owner == msg.sender, "caller is not owner");
    specialNumber = num;
}

// Assembly revert — 23,734 gas (~308 gas savings)
function restrictedAction(uint256 num) external {
    assembly {
        if sub(caller(), sload(owner.slot)) {
            mstore(0x00, 0x20) // offset to length
            mstore(0x20, 0x13) // length 19
            mstore(0x40, 0x63616c6c6572206973206e6f74206f776e657200000000000000000000000000)
            revert(0x00, 0x60)
        }
    }
    specialNumber = num;
}
```

For custom errors, the assembly form just `mstore`s the 4-byte selector at offset 0 and reverts with that:
```solidity
assembly {
    mstore(0x00, 0x82b42900)  // selector of Unauthorized() shifted to high bits
    revert(0x1c, 0x04)
}
```

## 2. Use assembly for external calls to reuse memory

Calling an external function via interface (`B(addr).foo(x, y)`) makes Solidity allocate fresh memory for the calldata. Assembly lets you write the call data into the scratch space (for short calls) or reuse the same buffer across multiple calls.

```solidity
// Solidity: 30,570 gas
function call(address calledAddress) external {
    Called(calledAddress).setNum(num);
}

// Assembly: 30,350 gas — uses scratch space for the calldata
function call(address calledAddress) external {
    assembly {
        mstore(0x00, hex"cd16ecbf")  // selector of setNum(uint256)
        mstore(0x04, num)
        if iszero(extcodesize(calledAddress)) { revert(0, 0) }
        let success := call(gas(), calledAddress, 0, 0, 0x24, 0, 0)
        if iszero(success) { revert(0, 0) }
    }
}
```

**Always check `extcodesize(target) > 0` before calling.** Solidity does this implicitly; assembly doesn't. Calling an address with no code returns success unconditionally — silently breaking your logic.

## 3. Math operations have gas-efficient assembly forms

The ternary operator and other conditionals compile to `JUMPI`s, which are slower than pure arithmetic. Branchless math avoids them.

Standard `max`:
```solidity
function max(uint256 x, uint256 y) public pure returns (uint256 z) {
    z = x > y ? x : y;
}
```

Branchless `max` (from Solady):
```solidity
function max(uint256 x, uint256 y) public pure returns (uint256 z) {
    assembly {
        z := xor(x, mul(xor(x, y), gt(y, x)))
    }
}
```

The trick: `gt(y, x)` is 0 or 1. Multiplying `xor(x, y)` by 0 gives 0, so `z = x`. Multiplying by 1 gives `xor(x, y)`, so `z = xor(x, xor(x, y)) = y`. Same result, no jump.

Solady's `FixedPointMathLib` is a good reference for similar tricks (`min`, `abs`, `mulDiv`, etc.).

## 4. Use `SUB` or `XOR` instead of `ISZERO(EQ(...))` for inequality

To check that two values *differ* in assembly:

```solidity
// Idiomatic but slightly verbose
if iszero(eq(a, b)) { /* unequal */ }

// Sometimes cheaper — sub is 0 only when a == b
if sub(a, b) { /* unequal */ }

// Also works — xor is 0 only when a == b
if xor(a, b) { /* unequal */ }
```

**`XOR` has a subtle gotcha:** it's symmetric, so it can't be used in contexts that need ordering (`xor` does not distinguish `a > b` from `a < b`). It's fine for equality checks. Solidity may also already use this trick under the hood depending on version — benchmark both.

## 5. Use assembly to check for `address(0)`

```solidity
contract AddressZeroCheckAssembly {
    function checkOptimized(address _caller) public pure returns (bool) {
        assembly {
            if iszero(_caller) {
                mstore(0x00, 0x20)
                mstore(0x20, 0x0c)
                mstore(0x40, 0x5a65726f20416464726573730000000000000000000000000000000000000000)
                revert(0x00, 0x60)
            }
        }
        return true;
    }
}
```

About 90 gas saved vs `require(_caller != address(0), "Zero address")`. Same logic applies to any cheap-to-check guard at the top of a function.

## 6. `selfbalance()` is cheaper than `address(this).balance`

`address(this).balance` may compile to `address` (2 gas) + `balance` (700 gas warm, 2,600 cold). `selfbalance` is a dedicated opcode that costs 5 gas. Solidity's optimizer often does this substitution automatically — check the output bytecode before adding inline assembly.

## 7. Use assembly for operations on data ≤96 bytes (hashing, events)

Solidity's normal `keccak256` and event-emission paths expand memory. If the data you want to hash or log fits in 96 bytes (the scratch space + zero slot region: `0x00`–`0x80`), assembly can do the operation without expanding memory at all.

### Logging up to 96 bytes of unindexed data

```solidity
event BlockData(uint256 blockTimestamp, uint256 blockNumber, uint256 blockGasLimit);

// Solidity: 26,145 gas
function returnBlockData() external {
    emit BlockData(block.timestamp, block.number, block.gaslimit);
}

// Assembly: 22,790 gas — uses scratch space
function returnBlockData() external {
    assembly {
        mstore(0x00, timestamp())
        mstore(0x20, number())
        mstore(0x40, gaslimit())
        log1(0x00, 0x60,
            0x9ae98f1999f57fc58c1850d34a78f15d31bee81788521909bea49d7f53ed270b)
    }
}
```

Note: control doesn't return to Solidity after this, so we don't need to restore the free memory pointer (`0x40` is temporarily clobbered with `gaslimit()`).

### Hashing up to 96 bytes

```solidity
// Solidity: 113,155 gas
function setOnchainHash(Values calldata _values) external {
    hash = keccak256(abi.encode(_values));
    values = _values;
}

// Assembly: 112,107 gas
function setOnchainHash(Values calldata _values) external {
    assembly {
        let fmp := mload(0x40)             // cache FMP — we'll restore it
        calldatacopy(0x00, 0x04, 0x60)
        sstore(hash.slot, keccak256(0x00, 0x60))
        mstore(0x40, fmp)                  // restore FMP for Solidity
    }
    values = _values;
}
```

Because we return to Solidity afterwards, we *must* save and restore the free memory pointer.

## 8. Reuse memory across multiple external calls

When making two or more external calls in one function, the Solidity compiler typically allocates fresh memory for each call's arguments. Assembly lets you reuse the same buffer.

```solidity
// Solidity: 7,262 gas — separate memory regions per call
function call(address calledAddress) external pure returns(uint256) {
    Called called = Called(calledAddress);
    uint256 res1 = called.add(1, 2);
    uint256 res2 = called.add(3, 4);
    return res1 + res2;
}

// Assembly: 5,281 gas — scratch space + zero slot reused
function call(address calledAddress) external view returns(uint256) {
    assembly {
        if iszero(extcodesize(calledAddress)) { revert(0, 0) }

        mstore(0x00, hex"771602f7")
        mstore(0x04, 0x01)
        mstore(0x24, 0x02)
        let success := staticcall(gas(), calledAddress, 0, 0x44, 0x60, 0x20)
        if iszero(success) { revert(0, 0) }
        let res1 := mload(0x60)

        mstore(0x04, 0x03)         // selector stays at 0x00, only update args
        mstore(0x24, 0x04)
        success := staticcall(gas(), calledAddress, 0, 0x44, 0x60, 0x20)
        if iszero(success) { revert(0, 0) }
        let res2 := mload(0x60)

        mstore(0x60, add(res1, res2))
        return(0x60, 0x20)
    }
}
```

**If the function returns to Solidity after the assembly block**, update the FMP and avoid leaving the zero slot (`0x60`) corrupted (it must be zero for uninitialized dynamic memory variables to behave correctly).

## 9. Reuse memory across multiple contract creations

`CREATE` returns the new contract address (32 bytes), which Solidity stores in fresh memory. For multiple deployments, use scratch space.

```solidity
// Solidity: 261,032 gas
function call() external returns (Called, Called) {
    return (new Called(), new Called());
}

// Assembly: 260,210 gas
function call() external returns(Called, Called) {
    bytes memory creationCode = type(Called).creationCode;
    assembly {
        let called1 := create(0, add(0x20, creationCode), mload(creationCode))
        let called2 := create(0, add(0x20, creationCode), mload(creationCode))
        if iszero(and(called1, called2)) { revert(0, 0) }
        mstore(0x00, called1)
        mstore(0x20, called2)
        return(0x00, 0x40)
    }
}
```

When deploying two *different* contracts, the second contract's creation code can't be hoisted into a Solidity variable (that would re-trigger memory expansion) — write it into memory by hand inside the assembly block.

## 10. Test even/odd with bitwise AND, not modulo

```solidity
x % 2 == 0    // uses MOD opcode (5 gas)
x & 1 == 0    // uses AND opcode (3 gas)
```

The last bit of any integer is 1 for odd numbers, 0 for even. `AND` with 1 isolates that bit. Modulo by a power of 2 always equals AND with `(power - 1)`, and AND is the cheaper opcode. (For non-power-of-2 divisors, you can't make this substitution.)

The Solidity optimizer does this automatically in many cases — verify it's needed before reaching for assembly.
