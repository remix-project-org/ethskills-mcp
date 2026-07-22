# Circom 2 Language Reference

Condensed from the official docs (https://docs.circom.io). Read this before writing or editing any `.circom` file.

## File skeleton

```circom
pragma circom 2.0.0;          // compiler version guard — always include this
include "poseidon.circom";     // pull in circomlib templates, one per file (no .circom needed in older syntax, but current docs show it with extension optional depending on -l path setup)

template MyCircuit(N) {        // N is a compile-time parameter, not a signal
    signal input a;
    signal input b[N];
    signal output c;

    c <== a * b[0];             // constraint + assignment in one step
}

component main {public [a]} = MyCircuit(4);   // exactly one `main` per project
```

Only **one** `component main` may exist across the whole compiled program (including everything pulled in via `include`).

## Signals

- Declared with `signal input`, `signal output`, or plain `signal` (intermediate). All circuits operate over field elements in `Z/pZ` where `p = 21888242871839275222246405745257275088548364400416034343698204186575808495617`.
- Signals are **immutable** — assign each signal exactly once. Assigning twice is a compile error.
- Signal content is always treated as unknown at compile time, even if it "obviously" resolves to a constant — this is intentional, so don't rely on the compiler folding signal values into constants for control flow.

### Assignments — this is the most important section

| Operator | Direction | Adds an R1CS constraint? |
|---|---|---|
| `<==` | right value → left signal | **Yes** |
| `==>` | left value → right signal | **Yes** |
| `<--` | right value → left signal | **No** |
| `-->` | left value → right signal | **No** |

- **Always prefer `<==`/`==>`.** They're the only safe option because the assigned value becomes the unique solution enforced by the constraint system.
- `<--`/`-->` only assign a value for witness computation — they add **no constraint**. Using them without a follow-up `===` constraint is the single most common source of insecure circom code (an "under-constrained" circuit where a malicious prover can supply any value for that signal and still produce an accepted proof).
- Canonical safe pattern when the expression can't be written directly as an arithmetic constraint (e.g. bit decomposition, inverses, comparisons):
  ```circom
  signal inv;
  inv <-- in != 0 ? 1/in : 0;   // unconstrained computation
  out <== -in*inv + 1;
  in*out === 0;                 // explicit constraint recovering soundness
  ```
- `===` adds a constraint between two expressions without assigning anything — use it to constrain values that were set via `<--`.

### Public vs private signals

- All signals are private by default. Only the **main** component can expose signals as public, via `component main {public [sig1, sig2]} = Tmpl(...)`.
- All **output** signals of `main` are automatically public and can't be made private.
- Only public inputs and all outputs of `main` are visible outside the circuit — intermediate signals of subcomponents are never accessible from outside, even if you wanted to debug them from a script.

## Templates & components

- `template Name(param1, ..., paramN) { ... }` defines a parametric circuit shape. Parameters must be known constants at compile time (not signals).
- Templates cannot contain nested template or function definitions.
- Instantiate with `component c = Name(v1, ..., vN);`. Component instantiation is **lazy**: it only actually triggers once every input signal of that component has a concrete value assigned — code order in the file does not determine execution order, dataflow does.
- Access a component's input/output signals with dot notation: `c.a <== x; y <== c.out;`. No other signal of a subcomponent is visible.
- Arrays of components are allowed but every element must instantiate the same template.
- `template parallel Name(...) { ... }` (or `component c = parallel Name(...)`) hints the C++ witness generator to parallelize independent components — only matters for large circuits compiled to C++, not the wasm path Remix uses.
- **Custom templates** (`template custom Name() { ... }`, requires `pragma custom_templates;`) generate PLONK custom gates instead of R1CS constraints, and cannot contain sub-components or explicit constraints. Only reach for these if the user explicitly wants PLONK-level custom gates — Groth16 workflows in this skill use ordinary templates.

## Include

```circom
include "montgomery.circom";
include "poseidon.circom";
```

Pulls in templates from other `.circom` files (circomlib or user-authored). Since circom 2.0.8 the `-l` compiler flag sets include search paths; in Remix, `circomlib` is typically already resolvable by path/npm package without extra flags — check `references/remix-workflow.md`.

## Control flow

- `if (cond) { ... } else { ... }` — else is optional.
- `for (init; cond; step) { ... }` and `while (cond) { ... }` behave as in any imperative language.
- **Critical constraint-generation rule:** inside an `if`/`for`/`while` body, if a constraint (`<==`, `==>`, `===`) is generated, the branch condition must be resolvable at compile time (i.e., not dependent on an input signal's runtime value). A condition like `if (in > N1)` where `in` is a signal, combined with a constraint inside the branch, is a compile error ("constraints depending on the value of the condition... unknown"). Conditioning purely on template parameters (compile-time constants) is fine.
- A `var` whose value is set inside a branch/loop with an unknown (signal-dependent) condition cannot later be used inside a constraint — the compiler will reject it as a non-quadratic expression.

## Operators

- **Field elements**: all arithmetic is mod `p` (see constant above); the modulus is parametric via `GLOBAL_FIELD_P` but essentially never changed in practice.
- **Boolean**: `&&`, `||`, `!`.
- **Relational**: `<, >, <=, >=, ==, !=` — defined via a signed representative `val(z)` of `z mod p` (values above `p/2` wrap to negative), not raw unsigned integer comparison — keep this in mind when reasoning about comparator circuits near the field boundary.
- **Arithmetic**: `+ - * ** / \ %` (note `/` is multiplication by modular inverse, `\` is integer-division quotient), plus compound-assignment variants (`+=`, `-=`, etc.) and `++`/`--`.
- **Bitwise**: `& | ~ ^ >> <<`, all performed mod `p` — shifting has a two-sided wraparound definition around `p/2`; don't assume plain two's-complement semantics for edge-case shift amounts.
- The ternary `cond ? a : b` exists only at the top level of an expression — no nesting.

## Two canonical worked examples from the docs

**Multiplier** (simplest possible circuit):
```circom
pragma circom 2.0.0;
template Multiplier2 () {
   signal input a;
   signal input b;
   signal output c;
   c <== a * b;
}
component main = Multiplier2();
```

**IsZero** (safe use of `<--` + `===` to recover soundness):
```circom
pragma circom 2.0.0;
template IsZero() {
    signal input in;
    signal output out;
    signal inv;
    inv <-- in!=0 ? 1/in : 0;
    out <== -in*inv +1;
    in*out === 0;
}
component main {public [in]} = IsZero();
```

**Num2Bits** (bit decomposition pattern — unconstrained per-bit assignment, then a linear-combination constraint that ties it back together):
```circom
pragma circom 2.0.0;
template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;
    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;   // forces each out[i] to be boolean
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }
    lc1 === in;                          // ties the bits back to `in`
}
component main {public [in]}= Num2Bits(3);
```
Use this pattern whenever the user needs bit decomposition, range checks, or comparators — always pair the unconstrained per-element assignment with a constraint that reconstructs the original value.

## circomlib

`circomlib` ships hundreds of ready-made templates (comparators, hash functions like Poseidon/Pedersen/SHA256, EdDSA signature verification, binary/decimal converters, Merkle proofs, etc.). Prefer `include`-ing these over reimplementing primitives — reimplementing hash/signature circuits by hand is a common source of subtle soundness bugs. `circomlibjs` is the companion JS package used inside Remix scripts to compute the same primitives (e.g. `poseidon(...)`) for building witness inputs that match the circuit.
