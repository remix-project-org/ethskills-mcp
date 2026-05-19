# Design pattern optimizations

Architectural choices dominate per-line micro-optimizations. The patterns below restructure *what* the contract does rather than tweak *how* it does it. The savings are often an order of magnitude larger than anything in the other reference files.

## 1. Use `multidelegatecall` to batch transactions

`multicall` (see `cross-contract.md` §5) lets a user pack many calls into one tx. `multidelegatecall` is the variant where each inner call is a `delegatecall` to `address(this)` — meaning `msg.sender` and `msg.value` are preserved across the batch.

Uniswap's implementation:
```solidity
function multicall(bytes[] calldata data) public payable returns (bytes[] memory results) {
    results = new bytes[](data.length);
    for (uint256 i = 0; i < data.length; i++) {
        (bool success, bytes memory result) = address(this).delegatecall(data[i]);
        if (!success) {
            if (result.length < 68) revert();
            assembly { result := add(result, 0x04) }
            revert(abi.decode(result, (string)));
        }
        results[i] = result;
    }
}
```

**Caveat:** because `msg.value` is the *same* value for every inner call (it's not consumed by the first call and then zero for the second), naively trusting `msg.value` in functions reachable through `multidelegatecall` is a known vulnerability class. If any function in the contract reads `msg.value` for accounting, audit the multidelegatecall integration carefully.

## 2. Use ECDSA signatures instead of Merkle trees for allowlists / airdrops

For an allowlist with N entries, a Merkle proof costs `log2(N)` × 32 bytes of calldata plus N hash operations on-chain. For 10,000 entries: ~14 hashes plus ~448 bytes of calldata, every claim.

With ECDSA, a backend signs each eligible address. The user provides one 65-byte signature; the contract does one `ecrecover` (~3,000 gas). No matter how large the allowlist, claim cost is constant.

Tradeoff: ECDSA requires a trusted signer (private key), which is an additional operational dependency. Merkle trees are trustless once the root is set. Pick based on whether you can run a backend signer reliably.

## 3. Use ERC20Permit (EIP-2612) to batch approve + transferFrom

Normally a user must (a) send an `approve` tx (21,000+ gas, a full tx) and then (b) send a tx to your contract that calls `transferFrom`. Two transactions, two base fees, two confirmation waits.

EIP-2612 adds a `permit(owner, spender, value, deadline, v, r, s)` function that accepts a signed message from the owner authorizing the approval — no on-chain tx from the owner needed. The contract that wants to receive the tokens calls `permit` and then `transferFrom` in the same transaction. The owner pays no gas, the recipient pays for one tx instead of two.

Most modern ERC20s (USDC, DAI, etc.) support this. For tokens that don't, libraries like Permit2 provide a wrapper.

## 4. Use L2 message passing for high-throughput / low-value apps

If your application processes many small transactions (games, social interactions, micro-payments), running it directly on L1 is wasteful — base fees alone exceed the value of each interaction. Bridging assets to an L2 (Optimism, Arbitrum, Polygon, Base) drops per-tx costs by 10–100×.

Etherorcs is a classic early example: NFTs lived on L1, but the gameplay (which involved frequent state changes) happened on Polygon, with periodic checkpointing back to L1. The L1 contract becomes a settlement layer; the L2 contract handles the activity.

This is an architectural decision, not a code-level tweak. Made early in design, it can be the difference between a viable app and an unaffordable one.

## 5. Use state channels if the interaction fits

State channels are the oldest scalability pattern in Ethereum and are still viable for specific use cases. Pattern:
1. Two (or more) participants lock assets in a smart contract.
2. They exchange signed state updates off-chain, freely.
3. When done, they submit the final signed state to the contract for settlement.
4. If anyone tries to submit a stale state or refuses to cooperate, the honest party submits the counterparty's latest signature to force settlement.

Best for: long-lived interactions between a fixed set of parties (payment channels, two-player games, recurring billing).

Worst for: open-ended apps with many participants who don't have an established relationship.

## 6. Use voting delegation as a gas-saving measure

The naive DAO design has every token holder vote individually. With N holders, that's N transactions per proposal. ERC20Votes (EIP-5805) introduces delegation: a holder can permanently delegate their voting weight to a representative. Now only the delegates vote — often fewer than 10 transactions even in a DAO with thousands of holders.

Holders pay no gas (delegation is a one-time setup). The DAO's total operational gas drops by orders of magnitude.

See `references/storage.md` and the related ERC20Votes tutorials for the implementation details, including how `checkpoints` are stored.

## 7. ERC1155 is a cheaper non-fungible token than ERC721

ERC721 maintains a `balanceOf(owner)` mapping that's updated on every transfer (one extra `SSTORE` per transfer). In practice, `balanceOf` is rarely needed — most apps just care about ownership of specific token IDs.

ERC1155 tracks `balanceOf(owner, id)`. If every `id` has a max supply of 1, the balance *is* the ownership flag — no separate tracking needed, no per-owner counter. Each transfer is one `SSTORE` instead of three (recipient balance up, sender balance down, sender balance count down).

Tradeoff: ERC1155 has weaker marketplace and tooling support than ERC721. The ecosystem assumption is "NFT = ERC721." If you control the marketplaces using your token, ERC1155 wins. If you need broad compatibility, the gas savings may not be worth it.

## 8. Use one ERC1155 (or ERC6909) instead of many ERC20s

The original motivation for ERC1155: if you have N fungible tokens (in-game currencies, vault shares, redemption tickets), deploying N ERC20 contracts is wasteful. One ERC1155 contract holds them all, identified by `id`.

Drawback: most DeFi primitives (Uniswap pools, lending markets) accept ERC20s only. Your tokens won't trade on standard venues.

**ERC6909** is a newer alternative that drops ERC1155's transfer callbacks (which add cost and reentrancy surface). If you don't need recipient hooks, ERC6909 is leaner.

## 9. The UUPS upgrade pattern is more gas-efficient than Transparent Upgradeable Proxy

Transparent Upgradeable Proxy checks `msg.sender == admin` on **every** call to decide whether to route to the upgrade function or the implementation. That's an `SLOAD` + comparison added to every user transaction.

UUPS (EIP-1822) puts the upgrade function on the *implementation* contract instead of the proxy. The proxy is dumb — every call goes straight to the implementation. The upgrade check happens only when `upgradeTo` is called.

Tradeoff: UUPS implementations must include the upgrade function and the authorization logic. Forgetting to include them in a new implementation bricks the contract (no path to upgrade). Use OpenZeppelin's `UUPSUpgradeable` to get the safety checks for free.

## 10. Consider alternatives to OpenZeppelin

OpenZeppelin is the default for good reasons: well-audited, broadly understood, conservative. But it prioritizes safety and clarity over gas efficiency. Two alternatives that prioritize gas:

- **Solmate** ([transmissions11/solmate](https://github.com/transmissions11/solmate)): minimal, gas-aware Solidity implementations of common standards. Drop-in replacements for OZ in many cases.
- **Solady** ([Vectorized/solady](https://github.com/Vectorized/solady)): even more aggressive — heavy use of assembly, fewer guardrails. Big wins on math, signatures, and proxy primitives.

These libraries are less battle-tested than OZ. For critical money-handling contracts, use the OZ version unless you have specific reason and budget to audit the alternative.
