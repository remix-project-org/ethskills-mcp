# Dangerous techniques and outdated tricks

This file documents two categories of "optimization":

1. **Dangerous techniques** — measurably cheaper, but introduce real safety, correctness, or maintainability risks. Mostly useful for gas-optimization contests where the judging criterion is "lowest gas, code already audited." **Do not recommend for production code without an explicit warning** to the user about the specific risk involved.

2. **Outdated tricks** — were once gas wins, but later compiler versions either neutralized the difference or even reversed it. Listed so you don't repeat them as "well-known optimizations" without checking.

---

## Dangerous techniques (gas-contest grade)

### 1. Pass information via `gasprice()` or `msg.value`

Function arguments cost calldata gas — minimum 128 gas for a 32-byte argument (zero bytes are 4 gas each, non-zero 16). But `gasprice` (the gas price the user set for the tx) and `msg.value` (the wei sent) are read for free from the tx envelope.

A gas-contest contract can encode small parameters in these fields. The user submits the tx with `gasPrice = 42` to communicate the value `42`, or `value = 0x123...` to pass arbitrary data.

**Why it's dangerous:**
- `gasprice` produces a real fee for the user (they pay `gasPrice * gasUsed`). A high "encoded" value is a real cost.
- `msg.value` requires sending actual ETH. If the function logic doesn't refund it, the user loses funds.
- Tooling, wallets, and explorers can't decode this. The pattern is invisible from normal calling conventions.

Use only when judging is purely on gas-used and the user is the contest runner who knows exactly what to submit.

### 2. Manipulate environment variables (`coinbase()`, `block.number`, etc.) when tests allow

In a contest harness, the test framework controls the chain environment. Sometimes the test sets `coinbase` or `block.number` to fixed values; sometimes a contract can branch on them as a side channel for information.

This is purely a contest exploit — the production EVM exposes these but they're set by miners/validators, not callers.

### 3. Use `gasleft()` to make late-execution branching decisions

`gasleft()` returns gas remaining. It costs 2 gas to read — cheaper than most signals you could use. A contract can branch on the *remaining gas* to decide between code paths:

```solidity
if (gasleft() > 50_000) doExpensiveThing();
else doCheapThing();
```

In a contest, this acts as a "free" parameter. In production, it makes contract behavior dependent on the gas limit a caller chose — which is a footgun. Anything that depends on `gasleft()` is hard to reason about and a frequent source of bugs.

### 4. Use `send()` to move ether but ignore the return value

`transfer()` reverts on failure; `send()` returns a boolean. Both forward a 2,300-gas stipend (which is the famous reason both are dangerous post-Istanbul). But ignoring `send()`'s return is even more dangerous:

```solidity
// Compiler doesn't warn even though success is dropped
recipient.send(amount);
```

This silently swallows transfer failures. ETH that "should" have moved didn't, the contract continues as if it did, and the discrepancy may not surface until later — or may permanently lock funds.

In production: **always** use `call{value: x}("")` and check the return, or use OpenZeppelin's `Address.sendValue` (which reverts on failure). The gas saved from skipping the check is never worth the resulting bug class.

### 5. Make every function `payable`

Non-payable functions have an implicit `require(msg.value == 0)` (a few opcodes). Removing that check on *every* function shaves a few gas off each call and removes some bytecode.

For admin functions and constructors this is legitimate (see `deployment.md` §2 and §7). For user-facing functions it's a footgun — users routinely send ether to the wrong function. A "stake some tokens" function that's `payable` will accept and silently keep any ETH a user attaches.

If the contract has no way to recover stuck ETH, that ETH is permanently lost. Doing this universally trades a small consistent gas saving for a real loss-of-funds risk.

### 6. External library jumping (bypassing function selector dispatch)

The standard 4-byte selector dispatch is convenient but expensive — every call pays for the selector lookup. A contest-grade contract can require the caller to supply the *jump destination directly* in calldata, reducing the "selector" to one byte and eliminating the table lookup.

This breaks the ABI completely. Anyone calling the contract must know the bytecode layout. Useful only for benchmarks; suicidal for production.

See this [tweet](https://x.com/AmadiMichaels/status/1697405235948310627) for an example.

### 7. Append raw bytecode to the end of the contract for hot subroutines

Some inner-loop operations — hash functions, cryptographic primitives — are dramatically faster as raw bytecode than as Solidity or Yul. Calling a separate contract to run them costs at least 100 gas (warm `CALL` overhead) plus the call's gas budget.

Trick: append the hand-written bytecode at the end of the main contract and use `JUMP` (within the same contract) to reach it. The contract effectively contains an inlined assembly subroutine the Solidity compiler never sees.

Tornado Cash uses this to run MiMC hash entirely within one contract. A proof of concept in Huff: [tweet](https://x.com/AmadiMichaels/status/1696263027920634044).

**Why it's dangerous:** the Solidity compiler doesn't know about the appended code. Any compiler optimization that moves jump destinations, inserts metadata, or otherwise resizes the contract will corrupt the offsets. Maintenance requires regenerating the bytecode bridge every time anything else in the contract changes.

---

## Outdated tricks (don't bother)

### 1. `external` is cheaper than `public`

**Status: no longer true.** In current Solidity versions, the compiler emits equivalent bytecode for both. Still prefer `external` for clarity when the function should not be called internally — but don't claim it as a gas optimization.

### 2. `!= 0` is cheaper than `> 0`

**Status: no longer true** as of Solidity 0.8.12 (or thereabouts). For `uint`, both produce the same bytecode now. Still worth checking on very old compiler versions if you're forced to use them, but in any modern contract this is a non-optimization.

---

## How to use this file

When the user asks "is X a gas optimization?", check here first to see whether X is:
- Genuinely useful but risky (warn them and proceed).
- An outdated trick (tell them, suggest benchmarking).
- A contest-only technique (clarify which context they're working in).

When reviewing production code, never recommend the dangerous techniques without flagging the risk. When reviewing a contest entry, they're fair game — but still call them out so the user understands what they're trading away.
