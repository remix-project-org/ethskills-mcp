pragma circom 2.0.0;

include "poseidon.circom"; // from circomlib — hash template used below

// Proves knowledge of 4 private values whose Poseidon hash equals a public hash,
// without revealing the values. Mirrors the "Hash Checker" pattern used by the
// scripts in this skill (scripts/trusted_setup_groth16.js, scripts/generate_proof_groth16.js).
template CalculateHash() {
    signal input value1;
    signal input value2;
    signal input value3;
    signal input value4;
    signal input hash;      // public: the claimed Poseidon hash of the four values above

    component poseidon = Poseidon(4);
    poseidon.inputs[0] <== value1;
    poseidon.inputs[1] <== value2;
    poseidon.inputs[2] <== value3;
    poseidon.inputs[3] <== value4;

    // Constrains the claimed hash to equal the recomputed one.
    // This is the whole "proof": you know 4 values that hash to `hash`,
    // without revealing value1..value4 (they stay private).
    hash === poseidon.out;
}

// Only `hash` is public; value1..value4 remain private by default.
component main {public [hash]} = CalculateHash();
