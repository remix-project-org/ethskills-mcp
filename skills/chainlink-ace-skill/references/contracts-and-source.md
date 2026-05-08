# Contracts and Source References

## Trigger Conditions

Read this file when:
- The user asks for contract interfaces or source code links
- The user asks about Policy Management contracts or Cross-Chain Identity contracts
- The user wants reference token implementations
- The user needs exact repository paths

For end-to-end direct contract usage, read [onchain-contracts.md](onchain-contracts.md) first. Use this file as the source map for exact packages, interfaces, and repository docs.

## Repository

ACE source code is in:

`https://github.com/smartcontractkit/chainlink-ace`

Package metadata identifies it as `@chainlink/ace` with license `BUSL-1.1`.

## Policy Management Package

Package:

`https://github.com/smartcontractkit/chainlink-ace/tree/main/packages/policy-management`

Core source areas:

| Path | Purpose |
| --- | --- |
| `src/core` | `PolicyEngine`, `PolicyProtected`, `PolicyProtectedUpgradeable`, base `Policy` |
| `src/interfaces` | Interfaces such as `IPolicyEngine`, `IPolicyProtected`, `IPolicy`, `IExtractor`, `IMapper` |
| `src/policies` | Pre-built policies |
| `src/extractors` | Calldata extractors |
| `src/libraries` | Shared libraries |
| `docs` | Concepts, API guide/reference, custom policies tutorial, policy ordering, security |
| `test` | Foundry tests |

Docs:
- `packages/policy-management/README.md`
- `packages/policy-management/docs/CONCEPTS.md`
- `packages/policy-management/docs/API_GUIDE.md`
- `packages/policy-management/docs/API_REFERENCE.md`
- `packages/policy-management/docs/CUSTOM_POLICIES_TUTORIAL.md`
- `packages/policy-management/docs/POLICY_ORDERING_GUIDE.md`
- `packages/policy-management/docs/SECURITY.md`
- `packages/policy-management/src/policies/README.md`

## Cross-Chain Identity Package

Package:

`https://github.com/smartcontractkit/chainlink-ace/tree/main/packages/cross-chain-identity`

Core source areas:

| Path | Purpose |
| --- | --- |
| `src` | Identity registries, credential registries, validator policy, validator implementation |
| `src/interfaces` | Identity and credential interfaces |
| `docs` | Concepts, API guide/reference, credential flow, security |
| `test` | Foundry tests |

Docs:
- `packages/cross-chain-identity/README.md`
- `packages/cross-chain-identity/docs/CONCEPTS.md`
- `packages/cross-chain-identity/docs/API_GUIDE.md`
- `packages/cross-chain-identity/docs/API_REFERENCE.md`
- `packages/cross-chain-identity/docs/CREDENTIAL_FLOW.md`
- `packages/cross-chain-identity/docs/SECURITY.md`

Core interfaces include:
- `IIdentityRegistry`
- `ICredentialRegistry`
- `ICredentialRequirements`
- `IIdentityValidator`
- `ICredentialValidator`
- `ICredentialDataValidator`
- `ITrustedIssuerRegistry`

## Reference Token Implementations

The repository includes ACE-integrated token examples:

| Token | Link | Notes |
| --- | --- | --- |
| ERC-20 Compliance Token | `https://github.com/smartcontractkit/chainlink-ace/tree/main/packages/tokens/erc-20` | Policy-protected ERC-20 with frozen-token handling |
| ERC-3643 Compliance Token | `https://github.com/smartcontractkit/chainlink-ace/tree/main/packages/tokens/erc-3643` | ERC-3643/T-REX-style token using ACE identity and compliance |

Frozen token behavior differs:
- ERC-20 example keeps frozen tokens frozen during burns/forced transfers and checks unfrozen balances.
- ERC-3643 example automatically unfreezes as needed during burns/forced transfers.

## Deployment and Scripts

Useful repo scripts from `package.json` include:
- `pnpm build` -> `forge build --sizes`
- `pnpm test` -> `forge test`
- `pnpm lint` -> `solhint packages/**/*.sol`
- `pnpm fmt` -> `forge fmt`
- `pnpm deploy:token:erc20`
- `pnpm deploy:token:erc3643`
- `pnpm deploy:token:simple`

## When to Fetch Source

Fetch source before:
- Providing exact function signatures or event schemas
- Debugging compilation or ABI mismatches
- Writing production-grade contract code
- Explaining custom policy implementation details
- Answering license questions
- Reviewing a specific ACE interface
