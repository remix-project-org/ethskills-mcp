# Storage gas optimizations

Storage is the single most expensive resource in the EVM. A cold `SSTORE` that turns a zero into a non-zero costs **22,100 gas** (20,000 for the zero→non-zero write plus 2,100 for cold access). A non-zero→non-zero write costs 5,000 gas. A cold `SLOAD` costs 2,100; warm, 100. Almost every storage technique below exists to avoid, batch, or amortize these costs.

## 1. Avoid zero-to-one storage writes where possible

This is the most impactful storage trick. Initializing a previously-untouched storage slot is the most expensive single operation a contract performs.

The OpenZeppelin reentrancy guard demonstrates the canonical workaround: it stores `1` (unlocked) and `2` (locked) instead of `0` and `1`. The slot is never zero after the constructor runs, so every subsequent lock/unlock cost is only 5,000 gas (non-zero → non-zero) instead of 22,100.

Apply this anywhere you have a flag, counter, or status field that gets toggled. Initialize it in the constructor to a non-zero sentinel.

## 2. Cache storage variables: write and read storage exactly once per function

Solidity does **not** cache storage reads. Every `myVar` reference compiles to a separate `SLOAD`. Read into a local once, work with the local, write back at the end.

**Bad — two `SLOAD`s, one `SSTORE`:**
```solidity
contract Counter1 {
    uint256 public number;

    function increment() public {
        require(number < 10);        // SLOAD #1
        number = number + 1;         // SLOAD #2 + SSTORE
    }
}
```

**Good — one `SLOAD`, one `SSTORE`:**
```solidity
contract Counter2 {
    uint256 public number;

    function increment() public {
        uint256 _number = number;    // single SLOAD
        require(_number < 10);
        number = _number + 1;        // single SSTORE
    }
}
```

This pattern shows up everywhere in efficient Solidity. Whenever you see a state variable referenced more than once in a function, cache it.

## 3. Pack related variables into the same slot

Storage slots are 32 bytes. Variables smaller than 32 bytes that are declared consecutively get packed into the same slot — but only if they fit. Reordering declarations to enable packing turns two `SSTORE`s into one.

There are three levels of packing, ordered by efficiency:

### Manual packing (most efficient)

Combine values into a single wider integer using bit shifts. Two `uint80`s become one `uint160` stored in one slot:

```solidity
contract GasSavingExample {
    uint160 public packedVariables;

    function packVariables(uint80 x, uint80 y) external {
        packedVariables = uint160(x) << 80 | uint160(y);
    }

    function unpackVariables() external view returns (uint80, uint80) {
        uint80 x = uint80(packedVariables >> 80);
        uint80 y = uint80(packedVariables);
        return (x, y);
    }
}
```

### Compiler-level packing (slightly less efficient)

Let the compiler pack two adjacent small variables. Same single slot, but the EVM does the masking and shifting itself, which is marginally more expensive when both are read/written in one tx:

```solidity
contract GasSavingExample2 {
    uint80 public var1;
    uint80 public var2;
    // both fit in slot 0
}
```

### No packing (least efficient)

Two `uint256`s take two slots. Avoid when smaller types suffice:

```solidity
contract NonGasSavingExample {
    uint256 public var1;
    uint256 public var2;
    // slot 0 and slot 1
}
```

## 4. Pack structs

Struct fields are stored sequentially starting at the struct's first slot. Reordering fields to allow packing turns N slots into N-1 (or fewer).

**Unpacked — 3 slots:**
```solidity
struct unpackedStruct {
    uint64 time;     // slot 0 (only 8 of 32 bytes used)
    uint256 money;   // slot 1 (needs full slot, can't pack with uint64)
    address person;  // slot 2 (20 bytes)
}
```

**Packed — 2 slots:**
```solidity
struct packedStruct {
    uint64 time;     // slot 0 (8 bytes)
    address person;  // slot 0 (20 bytes) — fits with time (8 + 20 = 28 ≤ 32)
    uint256 money;   // slot 1
}
```

Rule of thumb: order struct fields from smallest to largest within each "slot's worth" of data.

## 5. Keep strings smaller than 32 bytes

Solidity stores strings differently based on length:

- **< 32 bytes:** The string data is stored in the most significant bytes of the slot, with `length * 2` stored in the least significant byte. **One slot total.**
- **≥ 32 bytes:** The slot stores `length * 2 + 1`; the actual data lives starting at `keccak256(slot)` and spans as many slots as needed. **Two or more slots.**

For configurable strings that fit, design them to stay under 32 bytes. For fixed short strings, store them in a `bytes32` and use assembly to convert when needed — fully under your control, no length-encoding overhead.

Example reading a `bytes32`-encoded short string back into a `string`:
```solidity
contract EfficientString {
    bytes32 shortString;

    function getShortString() external view returns(string memory value) {
        assembly {
            let slot0Value := sload(shortString.slot)
            let len := div(and(slot0Value, 0xff), 2)
            let str := and(slot0Value, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00)
            mstore(0x80, len)
            mstore(0xa0, str)
            value := 0x80
            mstore(0x40, 0xc0)
        }
    }

    function storeShortString(string calldata value) external {
        assembly {
            if gt(value.length, 31) { revert(0, 0) }
            let length := mul(value.length, 2)
            let str := calldataload(value.offset)
            sstore(shortString.slot, or(str, length))
        }
    }
}
```

## 6. Variables that are never updated should be `immutable` or `constant`

`constant` values are embedded directly into the bytecode at the point of use — no storage, no `SLOAD`. `immutable` values are set once at construction and also live in bytecode (with a small lookup overhead). Both are dramatically cheaper than a regular storage variable.

```solidity
contract Constants {
    uint256 constant MAX_UINT256 = type(uint256).max;  // baked into bytecode
    function get_max_value() external pure returns (uint256) { return MAX_UINT256; }
}

contract NoConstants {
    uint256 MAX_UINT256 = type(uint256).max;  // still does SLOAD
    function get_max_value() external view returns (uint256) { return MAX_UINT256; }
}
```

If a value can be known at compile time → `constant`. If it can be known at deploy time → `immutable`. Only use storage if it actually needs to change.

## 7. Use mappings instead of arrays to avoid length checks

Solidity inserts a runtime bounds check on every array read. It compiles to extra bytecode that compares the index against the array length and panics on overflow. Mappings have no length, so no check.

```solidity
// get(0) gas cost: 4860 — includes a bounds check
contract Array {
    uint256[] a;
    constructor() { a.push() = 1; a.push() = 2; a.push() = 3; }
    function get(uint256 index) external view returns(uint256) { return a[index]; }
}

// get(0) gas cost: 2758 — no bounds check
contract Mapping {
    mapping(uint256 => uint256) a;
    constructor() { a[0] = 1; a[1] = 2; a[2] = 3; }
    function get(uint256 index) external view returns(uint256) { return a[index]; }
}
```

**Caveat:** without the bounds check, reading out-of-range keys silently returns zero. Only use this swap when your code already guarantees indices are valid (e.g., you track length separately).

## 8. Use `unsafeAccess` on arrays to skip length checks

If you need array semantics but want to skip the bounds check at a specific call site, OpenZeppelin's `Arrays.sol` provides `unsafeAccess`. Same caveat as the mapping trick: the caller must guarantee the index is in range.

## 9. Use bitmaps instead of bools for many boolean flags

A `bool` in storage takes a full slot (or shares one if packed). 256 bools = 256 slots in the worst case. But you only need **one bit** to store a bool. A single `uint256` can hold 256 flags.

This is the standard pattern for airdrop "already claimed" tracking, NFT presale lists, etc. Set the nth bit when address index n claims:
```solidity
function isClaimed(uint256 index) public view returns (bool) {
    uint256 wordIndex = index / 256;
    uint256 bitIndex = index % 256;
    return (claimedBitMap[wordIndex] >> bitIndex) & 1 == 1;
}
function setClaimed(uint256 index) internal {
    claimedBitMap[index / 256] |= (1 << (index % 256));
}
```

## 10. Use SSTORE2 or SSTORE3 to store large amounts of data

`SSTORE` costs 22,100 gas for 32 bytes of new data — ~690 gas/byte. Deploying contract bytecode costs **200 gas/byte**. So for large, write-once data, encoding it as a contract's bytecode is dramatically cheaper.

**SSTORE2** writes data once by deploying a tiny contract whose runtime bytecode *is* the data (prepended with a `STOP` opcode so it can't accidentally execute). Reads use `EXTCODECOPY` instead of `SLOAD`. The "pointer" is the deployed contract's address (20 bytes).

**SSTORE3** decouples the pointer from the data: it uses a deterministic `CREATE2` salt, so the address is derived from a salt you choose (which can be <14 bytes and packable with other data). The data itself is briefly written to storage then loaded by the init code at deploy time.

Tradeoff summary:
- **SSTORE2:** writes are very cheap, reads via `EXTCODECOPY` are cheaper than `SLOAD` for large data, pointer is 20 bytes.
- **SSTORE3:** writes are slightly more expensive than SSTORE2, but the pointer can be <14 bytes (more packable). Best when reads are frequent and the pointer needs to live alongside other variables.

See Solady's [`SSTORE2.sol`](https://github.com/Vectorized/solady/blob/main/src/utils/SSTORE2.sol) for production implementations.

## 11. Use storage pointers instead of memory where appropriate

Copying a struct from storage into memory (`MyStruct memory s = storageStruct;`) loads **every** field, even if you only use one. A storage pointer (`MyStruct storage s = storageStruct;`) loads nothing up front — each field access becomes its own targeted `SLOAD`.

If you read one field, the pointer wins. If you read all fields, memory may win.

```solidity
// Wasteful: loads id, name, AND lastSeen — three SLOADs for one field
function returnLastSeenSecondsAgo(uint256 _id) public view returns (uint256) {
    User memory _user = users[_id];
    return block.timestamp - _user.lastSeen;
}

// ~5,000 gas cheaper: one targeted SLOAD
function returnLastSeenSecondsAgoOptimized(uint256 _id) public view returns (uint256) {
    User storage _user = users[_id];
    return block.timestamp - _user.lastSeen;
}
```

**Caution:** storage pointers can become "dangling references" if the underlying storage is resized (e.g., array `pop()` or struct deletion while the pointer is held). Don't hold storage pointers across operations that mutate the parent.

## 12. Avoid letting ERC20 balances go to zero — keep dust

Repeatedly emptying and refilling an address's balance triggers zero→non-zero writes every refill. For accounts with frequent activity, keeping a tiny non-zero balance (a few wei) eliminates that 17,100-gas surcharge each time.

This is a subtle optimization specific to ERC20 (and similar) state. Combine with technique #1 — same idea, different context.

## 13. Count from n down to zero instead of from zero up to n

Setting a storage variable to zero refunds gas. If a counter's final state is zero (e.g., a depletion meter), counting downward means the last write is a non-zero→zero write that refunds, rather than the first being a zero→non-zero write that pays full freight.

## 14. Timestamps and block numbers don't need `uint256`

A `uint48` timestamp covers nearly 9 million years past 1970. A `uint32` covers until 2106. Block numbers grow by ~1 every 12 seconds — `uint48` is enormous overkill and still allows packing alongside an address in one slot.

Use just enough width to be safe, and pack with whatever else lives in the same struct or storage region.
