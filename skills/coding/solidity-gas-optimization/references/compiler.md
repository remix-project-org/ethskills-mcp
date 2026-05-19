# Solidity compiler-related optimizations

These techniques exploit specific behavior of the Solidity compiler. The compiler changes between versions — what's a win in 0.8.20 may be a loss in 0.8.25, and `--via-ir` often inverts the result. **Benchmark every one.**

## 1. Prefer strict inequalities, but test both

The EVM has `LT` and `GT` opcodes but no `LTE`/`GTE`. The compiler implements `a <= b` as `!(a > b)` (one extra `ISZERO` opcode, 3 gas).

So `a < b` is *usually* one opcode cheaper than `a <= b`. But the surrounding context — what feeds into the comparison, what consumes the result — can flip the result. Always benchmark.

## 2. Split `require` statements with `&&`

`require(a && b)` evaluates both `a` and `b` before reverting (because `&&` in Solidity is short-circuit, but the require gets the combined boolean). Splitting:

```solidity
// Both conditions evaluated even when only one needs to fail
function go(uint256 x, uint256 y) external pure returns (uint256) {
    require(x > 0 && y > 0);
    return x * y;
}

// Cheaper revert path: if x == 0, y check never runs
function go(uint256 x, uint256 y) external pure returns (uint256) {
    require(x > 0);
    require(y > 0);
    return x * y;
}
```

When both checks pass, costs are roughly the same. When the first fails, the split version reverts before evaluating the second condition. Most useful when the second check is itself expensive (a storage read, an external call).

## 3. Split revert statements similarly

For `if (cond1 || cond2) revert Bad();`, splitting into two ifs lets you use different (more informative) errors for each path *and* avoids the OR evaluation when the first condition is true.

```solidity
contract Bool {
    error BadValue();
    function check(uint256 x) external pure {
        if (x < 10 || x > 20) revert BadValue();
    }
}

contract Split {
    error TooLow();
    error TooHigh();
    function check(uint256 x) external pure {
        if (x < 10) revert TooLow();
        if (x > 20) revert TooHigh();
    }
}
```

Bonus: callers get a specific error code, which is much easier to debug.

## 4. Always use named returns

```solidity
// Anonymous return — compiler often emits worse code
function myFunc1(uint256 x, uint256 y) external pure returns (uint256) {
    require(x > 0); require(y > 0);
    return x * y;
}

// Named return — typically cheaper
function myFunc2(uint256 x, uint256 y) external pure returns (uint256 z) {
    require(x > 0); require(y > 0);
    z = x * y;
}
```

The compiler can sometimes elide a stack manipulation when the return value is already in the named slot. Exceptions exist — benchmark if you're optimizing tight code.

## 5. Invert if-else statements that have a negation

```solidity
// Negation requires extra ISZERO opcode
if (!condition) { action1(); } else { action2(); }

// Often cheaper — branches swapped
if (condition)  { action2(); } else { action1(); }
```

But the compiler sometimes recognizes the pattern and optimizes it itself. Benchmark.

## 6. Use `++i` instead of `i++`

`i++` returns the *original* value of `i` and then increments. The compiler must keep the old value on the stack in case the expression is used. `++i` returns the new value, so the old value can be discarded immediately.

In contexts where the expression's value isn't used (like the increment slot of a for-loop), this is a small but reliable win.

```solidity
for (uint256 i; i < n; ++i) { ... }   // cheaper
for (uint256 i; i < n; i++)   { ... }   // slightly worse
```

## 7. Use `unchecked` math where overflow is impossible

Solidity 0.8+ inserts overflow checks on every arithmetic operation. Each check is a few opcodes. When you can *prove* the result can't overflow, wrap the operation in `unchecked { }`:

```solidity
for (uint256 i; i < arr.length; ) {
    // ... loop body
    unchecked { ++i; }  // i can't overflow because of the bound
}
```

Safe candidates:
- Loop counters bounded by an array length or fixed limit.
- Math on values already range-checked by `require` earlier in the function.
- Counters that grow by 1 per tx (won't overflow in the lifetime of the universe).

Unsafe candidates: anything where untrusted input could push the operation past the type's max/min. When in doubt, leave the check in.

## 8. Write gas-optimal for-loops

> **As of Solidity 0.8.22, the compiler does this automatically.** On older versions:

```solidity
for (uint256 i; i < limit; ) {
    // body
    unchecked { ++i; }
}
```

This combines:
- Default initialization (`i = 0` is implicit, no explicit `= 0`).
- `++i` instead of `i++`.
- `unchecked` increment (safe because `i < limit` guarantees no overflow on the increment).

## 9. Do-while loops are cheaper than for loops

If you don't mind the slightly unusual style:
```solidity
function loop(uint256 times) public pure {
    if (times == 0) return;
    uint256 i;
    do {
        unchecked { ++i; }
    } while (i < times);
}
```

A do-while saves the initial iteration's condition check. The added `if (times == 0) return` covers the empty case. Net savings are small per loop but compound for hot inner loops.

## 10. Don't use small integer types unless they pack

`uint8`, `uint16`, etc. don't save gas on operations — the EVM works in 32-byte words, and the compiler inserts masking operations to maintain the smaller type's invariants. Each mask is extra gas per use.

Small types only save gas when **two or more of them share a storage slot** (see `storage.md` §3). If a variable lives alone in a slot or in memory, declare it `uint256`.

```solidity
// Wasteful: extra masking on every increment, AND uses a full slot
contract Bad {
    uint8 public num;
    function inc() public { num += 1; }
}

// Cheaper: no masking
contract Good {
    uint256 public num;
    function inc() public { num += 1; }
}
```

Same logic for `bool` (becomes `uint8` under the hood) and `address` (160 bits, but lives alone unless packed).

## 11. Short-circuit booleans by ordering for likelihood

`A || B`: B is skipped if A is true. Put the *more-likely-to-be-true* condition first.

`A && B`: B is skipped if A is false. Put the *more-likely-to-be-false* condition first.

```solidity
// If most callers are the owner, this is right:
require(msg.sender == owner || msg.sender == manager);

// If most txs should reject the second case quickly:
require(msg.sender != bannedAddress && tx.origin != bannedAddress);
```

Also order by *cost*: if A is cheap to check (e.g., `msg.sender` comparison) and B is expensive (e.g., a storage read), prefer A first regardless of likelihood — the cheap check filters most cases before paying for the expensive one.

## 12. Don't make variables public unless necessary

A `public` storage variable auto-generates a getter function. That getter adds bytecode and an entry in the jump table, increasing deploy cost and very slightly increasing per-call dispatch cost for *every* function.

Use `private` or `internal` for variables that don't need an external getter. (And remember — `private` doesn't hide the value from anyone reading chain state, only from solidity callers.)

`constant` variables especially: they live in bytecode anyway, but `public constant` still generates a tiny getter. If only humans need to read it, omit the `public`.

## 13. Prefer large `--optimizer-runs` for frequently called contracts

`runs` is the optimizer's hint about how often the deployed code will execute. Low `runs` (e.g., 1) → optimize for small creation code, accept worse runtime code. High `runs` (e.g., 10,000+) → bigger creation code, faster runtime.

If your contract runs millions of times, the runtime savings dwarf the one-time deployment cost. Use 10,000+ runs. If you're deploying many short-lived contracts (like factories that produce throwaway escrows), use low runs.

## 14. Heavily-used functions should have low function selectors

Function selectors (the first 4 bytes of `keccak256(signature)`) determine dispatch order. For contracts with ≤4 functions, the EVM does a linear search; with more, a binary search.

A function whose selector sorts earlier gets checked earlier in linear search — saving comparisons. With selectors that start with zero bytes, you also save calldata gas on the selector itself (zero bytes are 4 gas, non-zero are 16).

```solidity
// selector = 0xa0712d68 — no leading zeros, normal sort position
function mint(uint256 amount) public { ... }

// selector = 0x000071c3 — cheaper to call, sorts earlier
function mint_184E17(uint256 amount) public { ... }
```

Tools exist (e.g., [Solidity Zero Finder](https://github.com/jeffreyscholz/solidity-zero-finder-rust)) that find a numeric suffix making the resulting selector low-value. Hot path functions in routers and AMMs sometimes use this. Cosmetic ugliness vs. real savings — judgment call.

## 15. Bitshift instead of multiplying/dividing by powers of 2

| Operation | Equivalent shift | Gas comparison |
| --- | --- | --- |
| `x * 2` | `x << 1` | MUL is 5 gas, SHL is 3 gas |
| `x / 8` | `x >> 3` | DIV is 5 gas, SHR is 3 gas |

Shifts also **skip overflow/underflow checks** that 0.8+ inserts on `*` and `/`. This makes them faster but means *you* must reason about overflow. For values you know are bounded, shifts are safe.

## 16. Sometimes cheaper to cache calldata

`CALLDATALOAD` is 3 gas, but the surrounding code (decoded offsets, length checks for dynamic types) can be repeated. Caching `arr.length` into a local before a loop is a frequent win:

```solidity
function sumArr(uint256[] calldata arr) public pure returns (uint256 sum) {
    uint256 len = arr.length;          // cache
    for (uint256 i; i < len; ) {
        sum += arr[i];
        unchecked { ++i; }
    }
}
```

The savings vary with compiler version — sometimes the optimizer caches it for you anyway. Benchmark.

## 17. Use branchless algorithms for conditionals and short loops

Conditionals compile to `JUMPI`, which is more expensive than arithmetic opcodes. Loops contain implicit branches. For tight hot paths:

- Replace `if (cond) x = a; else x = b;` with branchless math (`x = a + cond * (b - a)` or similar).
- Unroll short, fixed-count loops.

This is extreme-end optimization. The code becomes hard to read and the savings are usually small. Justified for very hot inner loops.

## 18. Inline internal functions used only once

Every internal function call is a `JUMP` to the function's offset and a `JUMP` back at the end. That overhead is wasted if the function only has one caller. Inline the body manually.

This works against modularity, so apply only when:
- The function has a single caller.
- The caller is on a hot path.
- The function body is small enough that inlining doesn't hurt readability much.

## 19. Compare long arrays/strings by hashing

For arrays or strings longer than 32 bytes, comparing element-by-element costs O(n) ops + branches. Hashing both and comparing the hashes is O(n) hashes but no branches and a single 32-byte comparison at the end.

```solidity
keccak256(a) == keccak256(b)   // for bytes a, bytes b longer than 32 bytes
```

Hash precompile cost: 30 + 6 per word. For short data the loop wins; for long data the hash wins. Crossover is around 32–64 bytes depending on the loop overhead.

## 20. Use lookup tables for powers and logarithms

Computing `log` or `exp` of arbitrary values requires iterative algorithms (Newton-Raphson, Taylor series) costing thousands of gas. For fixed-base or fixed-exponent operations, a precomputed lookup table reduces the operation to a few `SLOAD`s or a bytecode constant access.

Examples in the wild: Bancor's bonding curve uses precomputed log tables. Uniswap V3's `TickMath` precomputes powers of `1.0001` for tick-to-price conversion.

## 21. Precompiles can be useful for big-int multiplication and memory copies

Ethereum has precompiled contracts at addresses 0x01–0x09 (and beyond on some chains). Two are relevant for general gas optimization:

- **0x05 (`modexp`):** big-integer modular exponentiation. Cheaper than implementing it in Solidity for large numbers.
- **0x04 (`identity`):** copies its input to output. Useful as a memory-to-memory copy primitive — sometimes faster than a Solidity loop.

Caveat: not all L2s and EVM-equivalent chains support every precompile. Check chain compatibility before relying on them.

## 22. `n * n * n` may be cheaper than `n ** 3`

The `EXP` opcode costs 10 + 50 × (size of exponent in bytes). For small fixed exponents, two or three `MUL`s (5 gas each) win:

| Expression | Gas |
| --- | --- |
| `n ** 2` | 10 + 50 (the `2` is 1 byte) = ~60 |
| `n * n` | 5 |
| `n ** 3` | 10 + 50 = ~60 |
| `n * n * n` | 10 |

Only matters for small *constant* exponents. For runtime-variable exponents, you need `EXP`.
