// Groth16 proof generation + verification + Solidity verifier export.
// Run this AFTER scripts/trusted_setup_groth16.js has produced
// zk/build/verification_key.json and zk/build/zk_setup.txt.
//
// WHAT THIS DOES:
//   1. Recompiles the circuit to get a fresh .wasm (always recompile after any circuit edit).
//   2. Loads the zkey + verification key saved by the setup script.
//   3. Builds the `signals` input object — EDIT THIS to match your circuit's actual
//      input signals. Any hash/signature signal must be computed with the matching
//      circomlibjs function so it exactly matches what the circuit recomputes.
//   4. Computes + sanity-checks the witness, generates the proof, verifies it off-chain.
//   5. Exports a Solidity verifier + ready-to-paste calldata (input.json).
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
const snarkjs = require('snarkjs');
import { poseidon } from 'circomlibjs'; // swap/add circomlibjs primitives as your circuit needs

const logger = {
  info: (...args) => console.log(...args),
  debug: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
};

// ---- CONFIG ----
const CIRCUIT_PATH = 'circuits/calculate_hash.circom';
const R1CS_PATH = 'circuits/.bin/calculate_hash.r1cs';
const WASM_PATH = 'circuits/.bin/calculate_hash_js/calculate_hash.wasm';
const ZKEY_PATH = 'zk/build/zk_setup.txt';
const VKEY_PATH = 'zk/build/verification_key.json';
const VERIFIER_TEMPLATE_PATH = 'templates/groth16_verifier.sol.ejs';
const OUT_VERIFIER_SOL = 'zk/build/zk_verifier.sol';
const OUT_INPUT_JSON = 'zk/build/input.json';
// ---- END CONFIG ----

(async () => {
  try {
    // @ts-ignore
    const r1csBuffer = await remix.call('fileManager', 'readFile', R1CS_PATH, { encoding: null });
    const r1cs = new Uint8Array(r1csBuffer);

    // @ts-ignore
    await remix.call('circuit-compiler', 'compile', CIRCUIT_PATH);

    // @ts-ignore
    const wasmBuffer = await remix.call('fileManager', 'readFile', WASM_PATH, { encoding: null });
    const wasm = new Uint8Array(wasmBuffer);

    const zkey_final = {
      type: 'mem',
      // @ts-ignore
      data: new Uint8Array(JSON.parse(await remix.call('fileManager', 'readFile', ZKEY_PATH))),
    };
    const wtns = { type: 'mem' };

    // @ts-ignore
    const vKey = JSON.parse(await remix.call('fileManager', 'readFile', VKEY_PATH));

    // ---- INPUT SIGNALS — edit to match your circuit ----
    const value1 = '1234';
    const value2 = '2';
    const value3 = '3';
    const value4 = '4';

    const signals = {
      value1,
      value2,
      value3,
      value4,
      hash: poseidon([value1, value2, value3, value4]),
    };
    // ---- END INPUT SIGNALS ----

    console.log('hash: ', signals.hash);

    console.log('calculate');
    await snarkjs.wtns.calculate(signals, wasm, wtns);

    console.log('check');
    await snarkjs.wtns.check(r1cs, wtns, logger);

    console.log('prove');
    const { proof, publicSignals } = await snarkjs.groth16.prove(zkey_final, wtns);

    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof, logger);
    console.log('zk proof validity', verified);

    const templates = {
      // @ts-ignore
      groth16: await remix.call('fileManager', 'readFile', VERIFIER_TEMPLATE_PATH),
    };
    const solidityContract = await snarkjs.zKey.exportSolidityVerifier(zkey_final, templates);

    // @ts-ignore
    await remix.call('fileManager', 'writeFile', OUT_VERIFIER_SOL, solidityContract);

    // NOTE the _pB coordinate swap below — required because snarkjs's G2 point
    // ordering differs from the Solidity verifier's expected ordering. Omitting
    // this is the most common cause of a deployed verifier rejecting a valid proof.
    await remix.call(
      'fileManager',
      'writeFile',
      OUT_INPUT_JSON,
      JSON.stringify(
        {
          _pA: [proof.pi_a[0], proof.pi_a[1]],
          _pB: [
            [proof.pi_b[0][1], proof.pi_b[0][0]],
            [proof.pi_b[1][1], proof.pi_b[1][0]],
          ],
          _pC: [proof.pi_c[0], proof.pi_c[1]],
          _pubSignals: publicSignals,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error(e.message);
  }
})();
