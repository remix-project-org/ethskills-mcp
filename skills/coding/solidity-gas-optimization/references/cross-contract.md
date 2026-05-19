# Cross-contract call optimizations

Every cross-contract call is expensive. A cold `CALL` is 2,600 gas just to reach the target; arguments and return data need to be encoded in memory (expanding it); and any storage the target touches is cold on first access. Optimizations here aim to (a) eliminate calls, (b) prepare the EVM to make calls cheaper, or (c) batch many calls into one.

## 1. Use transfer hooks instead of pull-style transfers

Naive pattern (3 calls, multiple cold accesses):
1. User approves contract A on token B.
2. User calls contract A's `deposit`.
3. Contract A calls `transferFrom` on token B.
4. Token B does the transfer and (for hooked tokens) calls back into A.

Better pattern: have the user call **token B** to transfer directly to contract A, with A implementing the receive hook. The transfer and the deposit-side logic happen in a single tx with no separate approval.

Standards that support this:
- **ERC1155:** all transfers include a `onERC1155Received` callback.
- **ERC721 `safeTransferFrom` / `safeMint`:** call `onERC721Received` on the recipient.
- **ERC1363:** `transferAndCall` triggers `onTransferReceived` on the recipient (the "fungible" version of the pattern).
- **ERC777:** has hooks but is deprecated due to reentrancy issues. Prefer ERC1363 or ERC1155.

Pass auxiliary arguments through the hook's `data` parameter, decoded with `abi.decode` on the receiving side.

## 2. Use `fallback` or `receive` instead of `deposit()` for ETH

When users send ETH to a contract and you want side effects (mint shares, deposit into a downstream protocol, etc.), it's cheaper to handle them in `receive()` than to require a `deposit()` call. Plain ETH sends have minimal calldata; a `deposit()` call adds at least 4 bytes of selector plus encoding overhead.

```solidity
contract AddLiquidity {
    receive() external payable {
        IWETH(weth).deposit{value: msg.value}();
        AAVE.deposit(weth, msg.value, msg.sender, REFERRAL_CODE);
    }
}
```

`fallback(bytes calldata data) external payable returns (bytes memory)` can receive ETH **and** arbitrary calldata in a single call, parsed via `abi.decode`. This serves as a cheaper alternative to a typed `deposit(uint256, address, ...)` function when the encoding is under your control.

## 3. Use EIP-2930 access list transactions

A transaction can include an "access list" — a list of addresses and storage slots the tx intends to touch. Slots on the list get **pre-warmed**: first access becomes warm-priced (100 gas) instead of cold-priced (2,100 gas), at a cost of 1,900 gas/slot + 2,400 gas/address paid upfront. The math works out to a discount of ~200 gas per pre-warmed slot.

When to use:
- Any transaction that calls another contract (the call itself touches the target address — pre-warm it).
- Any tx that goes through a proxy or clone (`DELEGATECALL` to the implementation — pre-warm the implementation address).
- Any tx that touches several specific storage slots you know in advance.

This is one of the few "free" optimizations: no code changes, just include the access list in the tx submission. Tools like Foundry can compute the optimal access list automatically.

## 4. Cache external call results (e.g., Chainlink oracle reads)

A Chainlink price feed read involves a `CALL` (~2,600 cold), an `SLOAD` on the feed contract for the price, decoding the return value, etc. — often 3,000–10,000 gas per read.

If you need the same value multiple times in one transaction, fetch it once into a local variable:

```solidity
// Wasteful: 3 external calls for one logical value
require(price() > minA, "below A");
require(price() > minB, "below B");
uint256 owed = baseAmount * price() / 1e8;

// Better: 1 external call
uint256 cachedPrice = price();
require(cachedPrice > minA, "below A");
require(cachedPrice > minB, "below B");
uint256 owed = baseAmount * cachedPrice / 1e8;
```

Same principle as storage caching (see `storage.md` §2), but the savings per call are larger because the underlying operation is more expensive.

## 5. Implement multicall in router-like contracts

When users routinely make a sequence of related calls (approve + swap + add liquidity), provide a `multicall(bytes[] calldata data)` that delegatecalls each entry to `address(this)`. Per-call overhead drops because:
- Only one transaction (21,000 base + once-paid calldata costs).
- `msg.sender` and `msg.value` are preserved across the inner delegatecalls.
- Storage slots warmed by the first call are warm for the rest.

Uniswap V3's `Multicall` and Compound's `Bulker` are good references. See `design-patterns.md` for the broader `multidelegatecall` pattern.

## 6. Avoid contract calls entirely by going monolithic

Every cross-contract call is gas. If a contract calls into one helper contract on every action and that helper's code is small, inlining the helper into the main contract removes the call overhead.

The tradeoff is real: separate contracts give modularity, upgrade flexibility, smaller individual deployment artifacts, and clearer audit boundaries. A 200-line monolith is sometimes worse for the overall system than two 100-line contracts that communicate.

Apply this judgment per-architecture, not as a blanket rule. The right question: how many cross-contract calls happen on the hot path, and what does removing them save vs. what does the modularity cost?
