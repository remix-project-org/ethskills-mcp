# Calldata optimizations

Calldata bytes cost 4 gas (zero byte) or 16 gas (non-zero byte) just to include them in a tx. For L2s that post calldata to L1, this dominates the user's fee. Optimizing calldata = either fewer bytes, or more zero bytes.

(Update: post-Dencun, most L2s use blobs instead of calldata for DA, so the L2 savings are smaller than before — but still real.)

## 1. Use vanity addresses (safely!)

Every leading zero byte in an address saves 12 gas (16 - 4) when that address appears in calldata. An address with many leading zeros — e.g., OpenSea's Seaport at `0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC` — saves significant calldata gas across millions of transactions.

When does this help?
- **Calling the contract directly:** no savings. The `to` field of the tx is not encoded in calldata.
- **Passing the address as a function argument** (e.g., a router calling into the contract): savings on every call.
- **Storing the address as a constant in other contracts:** smaller bytecode, smaller calldata when used.

For EOAs, the same logic applies: a wallet address used heavily as an argument benefits from leading zeros.

**The safety caveat is critical for EOAs.** Some early "vanity address generators" had insufficiently random key generation (the [Profanity tool](https://www.halborn.com/blog/post/explained-the-profanity-address-generator-hack-september-2022) was exploited for millions of dollars). Only use modern, audited generators with proper entropy. For **smart contract** vanity addresses (mined via CREATE2 salt search), there's no private key involved, so this risk doesn't apply.

## 2. Avoid signed integers in calldata if possible

Solidity uses two's complement for signed integers. A small *positive* `int256` like `5` is `0x00...0005` — 31 zero bytes, very cheap. A small *negative* `int256` like `-1` is `0xff...fff` — zero zero bytes, maximally expensive.

If you have a magnitude-and-direction pair (e.g., a tick delta in an AMM), consider passing an unsigned magnitude plus a boolean direction flag, or biasing the value so it's always non-negative. The encoding savings can be substantial in calldata-heavy systems.

This doesn't apply to values that are routinely large in magnitude either way — at large absolute values the byte count for positive and negative is similar.

## 3. `calldata` is (usually) cheaper than `memory`

For external function parameters of reference types (`bytes`, `string`, arrays, structs), declaring them `calldata` instead of `memory` avoids a copy:

```solidity
// Cheaper: function reads directly from the tx's calldata
function getDataFromCalldata(bytes calldata data) public pure returns (bytes memory) {
    return data;
}

// More expensive: the entire payload is copied into memory first
function getDataFromMemory(bytes memory data) public pure returns (bytes memory) {
    return data;
}
```

Use `memory` only when you need to mutate the parameter — `calldata` is immutable. This is a free optimization for the common read-only case.

For internal/private functions, the parameter must be `memory` if the function might be called from another `memory`-sourced context; `calldata` parameters can only originate at the external boundary.

## 4. Consider packing calldata (especially on L2)

Solidity automatically packs *storage* variables based on type (a `uint64` and a `uint192` share a slot). It does **not** pack ABI-encoded calldata — every parameter occupies a 32-byte slot regardless of declared type. Three `uint64` parameters = 96 bytes of calldata, even though they'd fit in 24.

If a function takes many small parameters and is called heavily, you can:
1. Pack the values manually into a single `bytes` or `uint256` argument client-side.
2. Decode in the function using assembly or shifts.

Example: instead of `function trade(uint64 amount, uint32 minOut, uint16 fee, address recipient)` (128 bytes), encode as one `bytes32 packed` parameter (32 bytes). 75% calldata reduction.

The tradeoff is severe: this destroys ABI tooling. Block explorers can't decode the call, type safety vanishes, and callers must reconstruct the encoding correctly. Only justified when:
- The function is called very frequently.
- You control the callers (a custom router, not arbitrary external integrations).
- You're targeting an L2 where calldata cost is the dominant tx cost.

For most contracts on most chains, this is over-optimization. See the [RareSkills L2 calldata article](https://www.rareskills.io/post/l2-calldata) for a deeper treatment.

**Dencun note:** Most L2s now use blobs (EIP-4844) for data availability, so calldata posted to L1 is no longer the bottleneck it once was. The savings from calldata packing still exist but are smaller than they were pre-Dencun.
