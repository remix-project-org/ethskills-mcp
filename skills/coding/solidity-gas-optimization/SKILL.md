---
name: solidity-gas-optimization
description: Comprehensive techniques for reducing gas consumption in Solidity smart contracts on the EVM. Use this skill whenever the user wants to optimize, audit, review, or reduce gas costs in Solidity code; asks about gas usage, gas-efficient patterns, or storage costs; mentions a gas optimization contest or Code4rena / Sherlock / Cantina audit; wants to refactor contracts for cheaper deployment or runtime; or asks "why is this so expensive" / "how do I make this cheaper" about EVM bytecode, storage, calldata, memory, structs, loops, or external calls. Trigger even when the user doesn't say "gas" — if they're tuning Solidity for cost, this skill applies.
---

# Solidity Gas Optimization

A reference toolkit of 80+ techniques for reducing gas consumption in Solidity contracts. Use it as a checklist when reviewing or refactoring code, and as an explainer when the user asks why a particular pattern is cheaper.

## Core mindset

Before applying any technique, internalize these principles. They matter more than memorizing tricks.

### Gas optimizations are not universal

Many "tricks" are context-dependent. The Solidity compiler is unpredictable — a transformation that looks like it should save gas can cost more in practice because of how the optimizer or stack scheduler reacts. The classic example: inverting an if/else to avoid a negation seems cheaper, but often isn't. **Always benchmark both versions** of any optimization rather than applying it on faith. Use Foundry's `forge test --gas-report` or similar tooling.

Some techniques behave differently under the `--via-ir` compiler flag than under the legacy pipeline. If the project uses via-ir, retest accordingly.

### Readability vs. savings is a tradeoff

Most gas optimizations make code harder to read, harder to audit, and easier to break during future edits. A subjective judgment is always required: is saving 200 gas worth obscuring the intent? For one-shot admin functions called rarely, almost never. For a hot inner loop in an AMM, often yes. Mention this tradeoff to the user when suggesting aggressive optimizations.

### Some areas are out of scope here

Application-specific tricks (gas-efficient primality tests, gas-efficient Tornado-Cash-like protocols, etc.) are not covered. Neither are full treatments of L2 architectures or state channels — those need their own deep dives. This skill covers general-purpose techniques applicable across most contracts.

### The biggest wins, ranked

When time is limited, look first at the techniques with the largest payoff:

1. **Avoiding zero-to-one storage writes** (saves up to 17,100 gas per occurrence). See `references/storage.md`.
2. **Caching storage reads/writes** (saves ~100 gas per redundant read, more for writes). See `references/storage.md`.
3. **Packing storage slots** (saves 20,000+ gas every time a second slot would have been written). See `references/storage.md`.
4. **Using `constant` / `immutable` for never-updated values** (eliminates storage reads entirely). See `references/storage.md`.
5. **Using custom errors instead of require strings** (smaller deploy + cheaper revert). See `references/deployment.md`.
6. **Batching with multicall / multidelegatecall / ERC-2612 permit** (one tx instead of many). See `references/design-patterns.md`.

## How to use this skill

The techniques are grouped into topical reference files. Load the file that matches the user's question — don't load all of them upfront.

| If the user is asking about… | Read this reference |
| --- | --- |
| Storage variables, slot packing, structs, strings, mappings vs arrays, bitmaps, SSTORE2/3, storage pointers, refunds | `references/storage.md` |
| Constructor cost, contract size, metadata hash, clones / minimal proxies, custom errors vs require, CREATE2 factories | `references/deployment.md` |
| Calling other contracts, transfer hooks, access lists (EIP-2930), caching oracle reads, multicall routers, monolithic vs modular | `references/cross-contract.md` |
| ERC standards choices, merkle trees vs ECDSA, ERC20 permit, L2s, state channels, voting delegation, ERC1155/6909 vs many ERC20s, UUPS vs Transparent proxy, library alternatives (Solady/Solmate) | `references/design-patterns.md` |
| Vanity addresses, signed integers in calldata, calldata vs memory, packed calldata on L2 | `references/calldata.md` |
| Inline assembly for reverts, external calls, math (min/max), `address(0)` checks, `selfbalance`, memory reuse, hashing, branchless tricks | `references/assembly.md` |
| `++i` vs `i++`, `unchecked`, do-while vs for, named returns, strict vs non-strict inequality, splitting requires, `uint256` vs smaller ints, short-circuiting, public vs private, optimizer runs, function selector ordering, bitshifting, named returns, lookup tables, precompiles | `references/compiler.md` |
| Gas optimization contests, environment variable abuse, ignoring `send()` return, payable everywhere, bytecode appendices, outdated tricks like `external > public` or `!= 0 > > 0` | `references/dangerous-and-outdated.md` |

For a comprehensive review, you may need to consult several references. Work through them in roughly the order above — storage savings usually dominate, calldata and compiler micro-optimizations come last.

## Workflow for a gas-optimization review

When the user hands you a contract and asks for an optimization pass:

1. **Skim for the highest-value patterns first.** Open `references/storage.md` and check for: zero-to-one writes that could be avoided, multiple reads of the same storage variable in one function, struct layouts where reordering would pack slots, state variables that are never reassigned (should be `immutable`/`constant`).
2. **Look at function-level patterns.** Loops, requires, returns — see `references/compiler.md`.
3. **Look at cross-contract surface.** Every `external` call or `delegatecall` is a candidate for `references/cross-contract.md`.
4. **Consider the deployment side.** If the contract is deployed many times (factories, clones), open `references/deployment.md`.
5. **Mention design-level alternatives.** If the architecture itself is wasteful (e.g., using ERC721 where ERC1155 fits, or pushing data on-chain that could live in a merkle root or signature), point to `references/design-patterns.md`.
6. **Only suggest assembly last,** and only where the win is meaningful. See `references/assembly.md`. Assembly removes safety checks the compiler adds — flag this to the user.
7. **Never recommend "dangerous techniques"** (in `references/dangerous-and-outdated.md`) for production code without an explicit warning. They're useful context for gas contests only.

## When the user is in a gas-optimization contest

Different rules apply. The reviewer doesn't care about readability — only the final gas number. In that context:

- Aggressive assembly is on the table everywhere.
- The techniques in `references/dangerous-and-outdated.md` become viable: encoding data in `msg.value` or `gasprice`, dropping return-value checks on `send()`, making everything `payable`, etc.
- Vanity addresses for contracts (`references/calldata.md`) become worthwhile.
- Read `references/dangerous-and-outdated.md` explicitly when contests come up.

## Output format

When reviewing code, present findings in a prioritized list: estimated gas savings (when knowable), location in the code, the change to make, and the tradeoff (readability cost, audit risk, version-dependence). When explaining a single technique, give the cheap version, the expensive version, and the underlying EVM reason — the "why" matters because users will need to judge whether the trick applies in their context.

Always remind the user to benchmark. Gas numbers in this skill come from specific compiler versions and may differ in theirs.
