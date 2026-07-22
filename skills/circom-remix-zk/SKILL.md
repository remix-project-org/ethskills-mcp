---
name: circom-remix-zk
description: Write, compile, and prove zero-knowledge circuits in circom 2 inside Remix IDE. Use this skill whenever the user wants to write a circom circuit, design signals/templates/constraints, run a Groth16 (or Plonk) trusted setup, generate a Remix "Run & Deploy" / scripts folder script for witness + proof generation, verify a zk-SNARK proof, or export a Solidity verifier contract. Trigger on mentions of circom, .circom files, zero-knowledge circuits, zk-SNARK/zk-STARK circuits, R1CS, witness generation, trusted setup, Powers of Tau, zkey, snarkjs, circomlibjs, Groth16/Plonk/Fflonk, or the Remix "circuit-compiler" plugin — even if the user just says "help me build a zk circuit in Remix" without naming these terms explicitly.
---

# Circom 2 + Remix IDE Zero-Knowledge Circuits

This skill covers the full loop of building zero-knowledge circuits with **circom 2**, entirely inside **Remix IDE** (remix.ethereum.org), using its bundled `circuit-compiler` plugin (backed by `circom_wasm`) and the Remix terminal's built-in Node-like script runner, which has `snarkjs`, `circomlibjs`, and `ethers` available via `require(...)`.

Do not assume a local Node/circom CLI environment unless the user says so — default to the Remix-native workflow described here, because `remix.call(...)` and the in-browser `circuit-compiler` plugin are how compilation and file I/O actually happen in Remix (there is no local filesystem or `child_process`).

## The four things this skill produces

1. **Circuits** — `.circom` files with correct signal/template/constraint syntax.
2. **Trusted setup scripts** — Remix scripts that run Groth16's circuit-specific setup (`snarkjs.zKey.*`) from a `.r1cs` and a Powers-of-Tau file, producing a `zkey` and `verification_key.json`.
3. **Proof generation scripts** — Remix scripts that compute a witness, generate a Groth16 proof, verify it off-chain, and export a Solidity verifier contract + calldata.
4. **Verification** — either the off-chain `snarkjs.groth16.verify` call, or the exported Solidity verifier deployed and called via `ethers` in a Remix script.

Read `references/circom-language.md` before writing or editing any `.circom` file — it has the exact assignment operator semantics (`<==` vs `<--`), public/private signal rules, and control-flow constraints that are easy to get subtly wrong and that silently produce insecure circuits (under-constrained signals) rather than compile errors.

Read `references/remix-workflow.md` before writing any Remix script (setup, witness, proof, or verifier deployment) — it covers the Remix project file layout, the exact `remix.call('circuit-compiler', ...)` and `remix.call('fileManager', ...)` calls available, where Powers-of-Tau files come from, and common failure modes specific to running snarkjs in the browser (memory limits, `type: "mem"` vs file-based keys, BigInt/JSON serialization of signals).

## Workflow

### 1. Circuit design
- Clarify the statement being proven (what's public, what's private, what relation must hold) before writing signal declarations. If the user hasn't said which values are public, ask, since it directly changes `component main {public [...]}`.
- Prefer composing from `circomlib` templates (`include "circomlib/circuits/poseidon.circom";` etc.) over reimplementing primitives like hashes, comparators, or bit decomposition.
- Every signal that isn't fully determined by a `<==`-constrained expression is a potential soundness bug. If you must use `<--` (unconstrained assignment, e.g. bit decomposition, division, comparisons), always follow it with explicit `===` constraints — see `references/circom-language.md#assignments`.
- Put the circuit in `circuits/<name>.circom` (Remix's default convention used by `circuit-compiler`) and end it with a single `component main { public [...] } = TemplateName(params);`.

### 2. Compilation (Remix)
- Circuits compile via the `circuit-compiler` plugin, not a CLI. Two relevant calls, both via `remix.call('circuit-compiler', ...)`:
  - `generateR1cs(path)` — produces `circuits/.bin/<name>.r1cs` (needed for trusted setup).
  - `compile(path)` — produces the full `.bin` output including `<name>_js/<name>.wasm` (needed for witness generation).
- See `references/remix-workflow.md#compilation` for the exact plugin activation steps and file paths.

### 3. Trusted setup (Groth16)
- Use `scripts/trusted_setup_groth16.js` as the template. It: reads the `.r1cs`, does `snarkjs.zKey.newZKey` against a Powers-of-Tau file, adds a contributor phase with `zKey.contribute`, finalizes with a public random beacon via `zKey.beacon`, double-verifies with `verifyFromR1cs`/`verifyFromInit`, then exports `verification_key.json` and a serialized `zkey_final`.
- **Never skip the contribute/beacon steps and call this production-ready without telling the user this is a single-participant, non-adversarial setup** — a real production trusted setup needs multiple independent contributors. Say this explicitly when generating the script for anything beyond a demo/testnet.
- Powers of Tau files must be large enough for the circuit's constraint count; point the user at Hermez/iden3's published `ptau` files (see references/remix-workflow.md) rather than generating phase-1 from scratch unless they explicitly ask to run their own powers-of-tau ceremony.

### 4. Proof generation & verification
- Use `scripts/generate_proof_groth16.js` as the template. It: recompiles to get the `.wasm`, loads the `zkey_final` and `verification_key.json` saved by the setup script, builds the `signals` input object (private + public inputs — using `circomlibjs`'s `poseidon`/`eddsa`/etc. where the circuit needs them), computes the witness with `snarkjs.wtns.calculate`, sanity-checks it with `snarkjs.wtns.check`, produces `{ proof, publicSignals }` with `snarkjs.groth16.prove`, verifies off-chain with `snarkjs.groth16.verify`, then exports a Solidity verifier with `snarkjs.zKey.exportSolidityVerifier` plus ready-to-paste `input.json` calldata (`_pA`, `_pB`, `_pC`, `_pubSignals`) for calling the verifier contract's `verifyProof`.
- If the user wants on-chain verification, use `scripts/verify_onchain_ethers.js` as the template to deploy/call the exported verifier via `ethers` from the Remix script runner.
- Note the `_pB` coordinate swap (`proof.pi_b[i][1], proof.pi_b[i][0]`) in the exported calldata — this is required because `snarkjs`'s G2 point ordering differs from the Solidity verifier's expected ordering. Keep this in generated scripts; it's a common source of "invalid proof" bugs when people write this by hand.

### 5. Iterate
- If `wtns.check` or `groth16.verify` fails, the most common causes are (in order): a public/private signal mismatch between the circuit's `main` component and the script's `signals` object, a stale `.wasm`/`.r1cs` pair (recompile after any circuit edit), or Poseidon/hash inputs passed as JS numbers instead of strings/BigInts (circomlibjs expects string or BigInt field elements, not floating-point-unsafe JS numbers).

## Quick reference

| Task | Read | Template |
|---|---|---|
| Circuit syntax, signals, templates, constraints | `references/circom-language.md` | `assets/example_circuit.circom` |
| Remix plugin calls, file layout, ptau sources | `references/remix-workflow.md` | — |
| Groth16 trusted setup | `references/remix-workflow.md#trusted-setup` | `scripts/trusted_setup_groth16.js` |
| Proof generation + verifier export | `references/remix-workflow.md#proof-generation` | `scripts/generate_proof_groth16.js` |
| On-chain verification via ethers | `references/remix-workflow.md#on-chain-verification` | `scripts/verify_onchain_ethers.js` |

Always adapt the file paths inside the templates (`circuits/<name>.circom`, `scripts/groth16/zk/keys/...`) to match the actual circuit name and folder structure the user is using in their Remix workspace — don't leave the placeholder `calculate_hash` name in place unless that's genuinely their circuit.
