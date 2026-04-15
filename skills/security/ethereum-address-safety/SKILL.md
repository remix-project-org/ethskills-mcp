---
name: ethereum-address-safety
description: This describes the safety measure you MUST follow when dealing with Ethereum addresses, load this skill as soon as you have to write solidtiy code, typescript code, answering questions, etc...
---

# Core Principles
1. **Immutable Address Handling**:
   - NEVER truncate, alter, or reformat Ethereum addresses (or any blockchain addresses).
   - Always **preserve the full 42-character string** (including `0x` prefix).
   - If an address is provided by the user, **echo it back verbatim** before acting on it.

2. **Validation Requirements**:
   - For **every address** mentioned in responses or actions:
     - Validate it matches the **EIP-55 checksum format** (case-sensitive).
     - If the address is a contract, verify it has **non-empty bytecode** on-chain.
     - Cross-check against **official sources** (e.g., Etherscan, block explorers, protocol docs).
   - If validation fails, **refuse to proceed** and alert the user.

3. **User Confirmation for Critical Actions**:
   - Before executing transactions, deployments, or interactions with addresses, **require explicit user confirmation**:
     - Example: *"You’re about to interact with `0x360E68FaCCa8cA495C1b759fD9eEe466Db9FB32`. Is this correct? (Yes/No)"*

4. **Transparency**:
   - Clearly label addresses as **user-provided**, **verified**, or **unverified**.
   - If an address is fetched from an external source (e.g., Etherscan), **cite the source** and provide a link.
   - For proxy contracts, **warn users** and disclose the implementation address.

5. **Error Handling**:
   - If an address is **truncated, malformed, or invalid**, **halt all actions** and respond with:
     *"Error: Invalid address `[address]`. Expected format: 42-character hex string with `0x` prefix. Please verify and retry."*
   - Never "guess" or auto-correct addresses unless explicitly asked.

6. **Contextual Awareness**:
   - Recognize that **addresses are chain-specific**. Always clarify the network (e.g., Ethereum Mainnet, Arbitrum, Polygon).
   - For **CREATE2-deployed contracts**, verify the deployer and salt if provided.

7. **Security Warnings**:
   - Flag **high-risk patterns**:
     - Addresses with **no transaction history** (potential scams).
     - **Proxy contracts** (warn about upgrade risks).
     - **Similar-looking addresses** (e.g., `0x360...32` vs. `0x360...33`).
   - For **token addresses**, check if they’re **bridged, native, or fake** (e.g., "USDC" on Arbitrum vs. Ethereum).

8. **Code Generation Rules**:
   - When generating code (e.g., Solidity, TypeScript), **hardcode addresses as constants** with:
     - A **descriptive name** (e.g., `UNISWAP_V4_POOL_MANAGER`).
     - A **comment citing the source** (e.g., `// Verified on Arbiscan: [link]`).
     - Example:
       ```solidity
       address public constant UNISWAP_V4_POOL_MANAGER =
           0x360E68FaCCa8cA495C1b759fD9eEe466Db9FB32; // Arbiscan: [link]
       ```

9. **User Education**:
    - Teach users how to **independently verify addresses** (e.g., using Etherscan, `getAddress` in ethers.js).
    - Provide **examples of common scams** (e.g., fake token addresses, phishing contracts).
