// Groth16 trusted setup — run this once per circuit (or once per real ceremony).
//
// WHAT THIS DOES:
//   1. Generates the R1CS for <CIRCUIT_PATH>.
//   2. Derives a circuit-specific zkey from the R1CS + a public Powers-of-Tau file.
//   3. Adds ONE contribution + ONE public beacon (see warning below).
//   4. Double-checks the final zkey, then exports verification_key.json and the
//      serialized zkey so scripts/generate_proof_groth16.js can reuse it.
//
// >>> Edit the CONFIG block for your circuit/paths, nothing else should need to change. <<<
//
// IMPORTANT: contribute() + beacon() below is a SINGLE-PARTICIPANT setup, fine for
// development/testnets. A production trusted setup needs multiple independent
// contributors calling zKey.contribute() in sequence, each publishing their
// contribution hash, before the final beacon step. Do not present this script's
// output as production-ready without that multi-party ceremony.
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
const snarkjs = require('snarkjs');

const logger = {
  info: (...args) => console.log(...args),
  debug: (...args) => console.log(...args),
};

// ---- CONFIG ----
const CIRCUIT_PATH = 'circuits/calculate_hash.circom';
const R1CS_PATH = 'circuits/.bin/calculate_hash.r1cs';
// Public Powers-of-Tau file. Must support >= the circuit's constraint count
// (2^n >= #constraints). Swap for a larger/smaller published ptau as needed —
// don't run your own phase-1 ceremony unless that's explicitly what's wanted.
const PTAU_URL = 'https://ipfs-cluster.ethdevops.io/ipfs/QmTiT4eiYz5KF7gQrDsgfCSTRv3wBPYJ4bRN1MmTRshpnW';
const OUT_VKEY_PATH = 'zk/build/verification_key.json';
const OUT_ZKEY_PATH = 'zk/build/zk_setup.txt';
// ---- END CONFIG ----

(async () => {
  try {
    // @ts-ignore
    await remix.call('circuit-compiler', 'generateR1cs', CIRCUIT_PATH);

    // @ts-ignore
    const r1csBuffer = await remix.call('fileManager', 'readFile', R1CS_PATH, { encoding: null });
    const r1cs = new Uint8Array(r1csBuffer);

    const zkey_0 = { type: 'mem' };
    const zkey_1 = { type: 'mem' };
    const zkey_final = { type: 'mem' };

    console.log('newZKey');
    await snarkjs.zKey.newZKey(r1cs, PTAU_URL, zkey_0);

    console.log('contribute (single-participant — see warning at top of file)');
    await snarkjs.zKey.contribute(zkey_0, zkey_1, 'contributor-1', 'replace-with-real-entropy');

    console.log('beacon');
    await snarkjs.zKey.beacon(
      zkey_1,
      zkey_final,
      'final-beacon',
      '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
      10,
    );

    console.log('verifyFromR1cs');
    const verifyFromR1csResult = await snarkjs.zKey.verifyFromR1cs(r1cs, PTAU_URL, zkey_final);
    console.assert(verifyFromR1csResult, 'verifyFromR1cs failed');

    console.log('verifyFromInit');
    const verifyFromInit = await snarkjs.zKey.verifyFromInit(zkey_0, PTAU_URL, zkey_final);
    console.assert(verifyFromInit, 'verifyFromInit failed');

    console.log('exportVerificationKey');
    const vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
    // @ts-ignore
    await remix.call('fileManager', 'writeFile', OUT_VKEY_PATH, JSON.stringify(vKey, null, 2));

    console.log('save zkey_final');
    // @ts-ignore
    await remix.call(
      'fileManager',
      'writeFile',
      OUT_ZKEY_PATH,
      JSON.stringify(Array.from(zkey_final.data)),
    );

    console.log('setup done.');
  } catch (e) {
    console.error(e.message);
  }
})();
