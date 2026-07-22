# Circom in Remix IDE — Workflow Reference

Remix IDE ships a **Circom Compiler** plugin (browser-only, backed by `circom_wasm`) plus a script runner (in the Remix terminal) that has `snarkjs`, `circomlibjs`, and `ethers` importable via `require(...)`. There's no local filesystem or CLI — everything happens through `remix.call(...)` calls from a `.ts`/`.js` script inside the workspace, or through the plugin's own GUI buttons. Design every script around this.

## How it works, end to end

1. **Build the circuit** — write `.circom`, compile to `.wasm`, generate the `.r1cs`.
2. **Execute the circuit** — supply private inputs, compute the witness (`.wtn`).
3. **Set up keys, prove, verify** — one-time trusted setup produces circuit-specific keys; combine with the witness to produce a proof; verify off-chain (verification key) or on-chain (generated Solidity verifier).

## Loading a template / starting a workspace

Remix has a built-in "Circom ZKP" workspace template (e.g. **Hash Checker**), which scaffolds `circuits/calculate_hash.circom` plus ready-made scripts under `scripts/groth16/` and `scripts/plonk/`. When a user is starting from scratch, either point them at this template or scaffold an equivalent structure yourself:

```
circuits/
  <name>.circom
  .bin/                          <- compiler output lands here (r1cs, wasm, wtn)
scripts/
  groth16/
    groth16_trusted_setup.ts     <- runs Groth16-specific setup (this skill's scripts/trusted_setup_groth16.js)
    run_verification.ts          <- proves + verifies (this skill's scripts/generate_proof_groth16.js)
  plonk/                          <- analogous scripts if using Plonk instead
zk/
  build/
    verification_key.json        <- off-chain verification key
    zk_verifier.sol               <- exported Solidity verifier
    zk_setup.txt                  <- serialized zkey_final reference
```

Older/custom workspaces (and the scripts a user may already have) sometimes use a different but equivalent layout, e.g. `scripts/groth16/zk/keys/verification_key.json` and `scripts/groth16/zk/build/zk_verifier.sol`. **Match whatever layout is already in the user's workspace** rather than forcing the newer official naming — the plugin doesn't require a specific path, scripts just need to agree with each other on where they read/write files.

## Compilation

- Compilation and R1CS generation are plugin-panel actions, but scripts can trigger them too via `remix.call('circuit-compiler', 'compile', path)` and `remix.call('circuit-compiler', 'generateR1cs', path)`.
- The **Compile** button (or `Ctrl+S` while a `.circom` file is active) is only enabled when a `.circom` file is the active editor tab. It produces `<name>.wasm` inside `circuits/.bin/<name>_js/`.
- Generating the R1CS is also where you pick the proving scheme (**Groth16** or **Plonk**) — the R1CS itself is scheme-agnostic, but the keys derived from it later are tied to whichever scheme is chosen here. Running the Groth16 setup script (or clicking **Run Setup** with Groth16 selected) produces `<name>.r1cs` in `circuits/.bin/`.
- Reading generated binary files from a script always needs `{ encoding: null }` so you get a Buffer, then wrap it: `new Uint8Array(await remix.call('fileManager', 'readFile', path, { encoding: null }))`.

## Computing the witness

- Either use the plugin's **Compute Witness** panel (paste a JSON object of private/public input values, click Compute → produces `<name>.wtn` in `circuits/.bin/`), or do it from a script with `snarkjs.wtns.calculate(signals, wasm, wtns)` where `signals` is a plain JS object keyed by the circuit's public input signal names, and `wasm`/`wtns` follow the `{ type: "mem" }` or `Uint8Array` conventions below.
- Input values that are hash/signature outputs (Poseidon, EdDSA, etc.) must be computed with the matching `circomlibjs` function so they exactly match what the circuit will recompute — e.g. `poseidon([value1, value2, value3, value4])` for a circuit that uses circomlib's Poseidon template. Pass field elements as strings or BigInts, never as floating-point-unsafe JS numbers.
- `snarkjs.wtns.check(r1cs, wtns, logger)` is worth calling before proving — it validates the witness against the R1CS and prints `WITNESS IS CORRECT` on success, catching input/circuit mismatches early with a much clearer error than a failed proof would give.

## In-memory vs file-based snarkjs objects

snarkjs functions that take a "file" argument (`r1cs`, `zkey`, `wtns`, etc.) accept either:
- a `Uint8Array` of the raw bytes (works well for `r1cs`, which you already have from `fileManager.readFile`), or
- `{ type: "mem" }` (or `{ type: "mem", data: <Uint8Array> }` when providing existing bytes) to have snarkjs keep the artifact entirely in browser memory rather than writing to a real path — necessary in Remix since there's no Node `fs`.

To persist a `{ type: "mem" }` result across scripts (e.g. save a `zkey_final` from the setup script so the proof script can reuse it later), serialize its `.data` field and write it with `fileManager.writeFile`:
```js
await remix.call('fileManager', 'writeFile', 'zk/build/zk_setup.txt',
  JSON.stringify(Array.from(zkey_final.data)));
```
and rehydrate it later with:
```js
const zkey_final = { type: "mem", data: new Uint8Array(JSON.parse(await remix.call('fileManager', 'readFile', 'zk/build/zk_setup.txt'))) };
```

## Trusted setup (Groth16) {#trusted-setup}

Groth16 needs a circuit-specific setup layered on top of a universal Powers-of-Tau ("ptau") file:

1. `snarkjs.zKey.newZKey(r1cs, ptauUrlOrPath, zkey_0)` — derives the initial zkey from the r1cs + ptau.
2. `snarkjs.zKey.contribute(zkey_0, zkey_1, name, entropy)` — adds a contributor's randomness. Real production setups need **multiple independent contributors** doing this sequentially and publishing their contribution hashes; a single contribution (as in demo scripts) is not a secure trusted setup.
3. `snarkjs.zKey.beacon(zkey_1, zkey_final, name, beaconHash, numIterationsExp)` — finalizes with a public, delay-based random beacon so no single party controls the final randomness.
4. `snarkjs.zKey.verifyFromR1cs(r1cs, ptau, zkey_final)` and `snarkjs.zKey.verifyFromInit(zkey_0, ptau, zkey_final)` — sanity-check the final zkey two different ways before trusting it.
5. `snarkjs.zKey.exportVerificationKey(zkey_final)` → save as `verification_key.json`.

**Always tell the user explicitly when a generated script only does a single contribution** — call it a demo/test setup, not production-grade, unless they've explicitly set up a real multi-party ceremony.

### Where to get a Powers-of-Tau file
- Don't generate phase-1 (the universal/circuit-agnostic part) from scratch unless the user explicitly wants to run their own ceremony — it's slow and pointless to redo work that's already been publicly, verifiably contributed to.
- Use one of the well-known public `ptau` files (e.g. Hermez/iden3's published Powers-of-Tau, referenced directly by URL — `snarkjs.zKey.newZKey` accepts a URL/path or an already-fetched buffer). The chosen ptau must support at least as many constraints as the circuit has (`2^n >= number of constraints`); too small fails setup, unnecessarily large just wastes time/memory in the browser.

## Proof generation & verification {#proof-generation}

Core snarkjs calls, in order:
```js
const { proof, publicSignals } = await snarkjs.groth16.prove(zkey_final, wtns);
const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof, logger);
```
A successful witness check prints something like:
```
Checking witness correctness
WITNESS IS CORRECT
WITNESS CHECKING FINISHED SUCCESSFULLY
```

To also produce an on-chain verifier:
```js
const solidityContract = await snarkjs.zKey.exportSolidityVerifier(zkey_final, templates);
```
`templates` is an object mapping scheme name (`groth16`) to the `.ejs` template text — in Remix this is typically read from a bundled `templates/groth16_verifier.sol.ejs` file via `fileManager.readFile`.

### Calldata shape for the exported verifier

The exported Solidity verifier's `verifyProof` expects calldata built like this — **note the coordinate swap on `_pB`**, required because snarkjs's G2 point ordering differs from the Solidity verifier's expected ordering:
```js
{
  _pA: [proof.pi_a[0], proof.pi_a[1]],
  _pB: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
  _pC: [proof.pi_c[0], proof.pi_c[1]],
  _pubSignals: publicSignals,
}
```
Forgetting this swap is the most common cause of a verifier contract rejecting an otherwise-valid proof.

## On-chain verification {#on-chain-verification}

After deploying the exported `zk_verifier.sol` (via Remix's normal Solidity compile + Deploy & Run flow, or programmatically), call it from a script using `ethers` (already available in the Remix script runner via `require('ethers')`):
```js
const ethers = require('ethers');
const provider = new ethers.providers.Web3Provider(web3Provider); // or whatever provider Remix exposes
const verifier = new ethers.Contract(verifierAddress, verifierAbi, signer);
const ok = await verifier.verifyProof(input._pA, input._pB, input._pC, input._pubSignals);
```
Read the exported `input.json` (written by the proof-generation script) for the exact calldata shape rather than reconstructing it by hand.

## Common failure modes

| Symptom | Likely cause |
|---|---|
| `wtns.check` fails / witness checking errors | `signals` object doesn't match the circuit's actual public/private input names, or a hash input was computed with plain JS math instead of `circomlibjs`'s field-safe functions |
| Setup fails immediately on `newZKey` | ptau file too small for the circuit's constraint count — pick a larger one |
| `groth16.verify` returns false despite a "successful" proof | stale `.wasm`/`.r1cs` from before a circuit edit — recompile and regenerate R1CS after every circuit change |
| Deployed verifier contract reverts/rejects a valid proof | missing the `_pB` coordinate swap described above |
| `remix.call(...)` throws "plugin not activated" | the Circom Compiler plugin hasn't been activated in this workspace yet — load a Circom ZKP workspace template or activate it from the Plugin Manager first |
