// Calls a deployed Groth16 verifier contract (exported by
// scripts/generate_proof_groth16.js as zk/build/zk_verifier.sol) using ethers,
// from the Remix script runner.
//
// PREREQUISITE: compile zk/build/zk_verifier.sol in the Solidity Compiler plugin
// and deploy it (Deploy & Run, or programmatically) BEFORE running this script.
// Fill in VERIFIER_ADDRESS and VERIFIER_ABI below (copy the ABI from the
// Solidity Compiler's compilation artifacts panel after compiling zk_verifier.sol).
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ethers = require('ethers');

// ---- CONFIG ----
const INPUT_JSON_PATH = 'zk/build/input.json';
const VERIFIER_ADDRESS = '0xYOUR_DEPLOYED_VERIFIER_ADDRESS';
const VERIFIER_ABI = [
  // Groth16 verifiers exported by snarkjs expose this function signature by default:
  'function verifyProof(uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[] memory _pubSignals) public view returns (bool)',
];
// ---- END CONFIG ----

(async () => {
  try {
    // @ts-ignore — `web3Provider` is injected by Remix's script runner environment.
    const provider = new ethers.providers.Web3Provider(web3Provider);
    const signer = provider.getSigner();

    // @ts-ignore
    const input = JSON.parse(await remix.call('fileManager', 'readFile', INPUT_JSON_PATH));

    const verifier = new ethers.Contract(VERIFIER_ADDRESS, VERIFIER_ABI, signer);

    console.log('calling verifyProof on-chain...');
    const ok = await verifier.verifyProof(input._pA, input._pB, input._pC, input._pubSignals);
    console.log('on-chain verification result:', ok);
  } catch (e) {
    console.error(e.message);
  }
})();
