# Getting Started and Scope

## Trigger Conditions

Read this file when:
- The user asks what ACE is or whether it fits their use case
- The user asks how to start from the `chainlink-ace` repository
- The user asks about repository scope, package layout, production use, or licensing
- The user asks whether custom policies, custom extractors, custom mappers, or mainnet use are possible
- The user asks whether ACE Platform supports a feature and needs the answer separated from OSS self-deployment

## What ACE Is

Chainlink Automated Compliance Engine (ACE) core contracts provide a modular toolkit for EVM smart contracts that need onchain compliance rules and cross-chain identity.

ACE separates business logic from enforcement logic:
- Application contracts do their normal work.
- Policy Management enforces rules through `PolicyProtected`, `PolicyEngine`, policies, extractors, and mappers.
- Cross-Chain Identity links addresses to CCIDs and credentials so applications can validate KYC, AML, accreditation, or custom requirements onchain.

## Public Repository

Source of truth:

`https://github.com/smartcontractkit/chainlink-ace`

Package metadata:
- name: `@chainlink/ace`
- license: `BUSL-1.1`
- tooling: Foundry, pnpm, Solidity

Core directories:

| Path | Purpose |
| --- | --- |
| `getting_started/GETTING_STARTED.md` | Basic PolicyProtected + PolicyEngine integration |
| `getting_started/advanced/GETTING_STARTED_ADVANCED.md` | Advanced tokenized-fund example with identity/credentials |
| `UPGRADE_GUIDE.md` | Upgrade existing proxy contracts to use ACE |
| `packages/policy-management` | PolicyEngine, PolicyProtected, policies, extractors, mappers, docs, tests |
| `packages/cross-chain-identity` | CCIDs, identity registries, credential registries, validator policies, docs, tests |
| `packages/tokens` | ERC-20 and ERC-3643 compliance token examples |

## Component Selection

Use **Policy Management** when:
- The user needs dynamic onchain rules
- The user wants to add/remove/reorder policies without changing core business logic
- The user needs custom policies, extractors, mappers, access rules, pause controls, limits, or reserve checks

Use **Cross-Chain Identity** when:
- The user needs KYC, AML, accreditation, credential requirements, or cross-chain address-to-identity mapping
- The user needs credentials attached to a CCID instead of individual addresses
- The user needs multiple trusted credential issuers or custom credential types

Use **tokens examples** when:
- The user is building a regulated ERC-20
- The user is building an ERC-3643/T-REX-style security token
- The user wants a reference implementation rather than adding ACE to a custom app from scratch

## Product vs Self-Deploy Scope

When a user asks "can I use ACE for X?", first determine whether they mean:

| User intent | Answer from |
| --- | --- |
| Self-deploy audited contracts from the repository | Public repo references in this skill |
| Use the managed ACE Platform, UI, Coordinator API, Reporting API, or Beta access program | `platform-and-beta.md` and live `docs.chain.link/ace` docs |

Do not merge those surfaces. A repo capability such as custom policies or Credential Data Validators does not automatically mean the managed Platform Beta exposes that capability. A Platform Beta limitation such as testnet-only support does not automatically prevent a team from evaluating self-deployed OSS contracts under the license and security requirements.

## Fit Checklist

ACE core contracts are a good fit when:
- The protected contract is EVM-based
- The team can integrate `PolicyProtected`, `PolicyProtectedUpgradeable`, or `IPolicyProtected`
- The team can deploy and administer PolicyEngine infrastructure
- Compliance rules can be represented by pre-built or custom policies
- The team can audit custom policies, extractors, mappers, and policy chains
- The team can review BUSL/commercial licensing for production use

ACE may require extra design work when:
- The existing contract is non-upgradeable
- The contract is close to the 24KB bytecode limit
- The compliance rule depends on external systems, signatures, or complex context
- The protected function uses non-standard calldata and needs a custom extractor
- The protocol needs operational indexing, dashboards, or admin tooling around the raw contracts
- The team expects managed ACE Platform visibility for self-deployed contracts; registration/indexing is product-scoped and must be checked against current docs

## License Guidance

The repository is under BUSL-1.1. The license grants non-production use and has a configured change date/change license. For production use, users should contact Chainlink for a production/commercial license and have counsel review the terms.

Do not provide legal advice.

## Response Pattern

When answering "can I use ACE for X?", use:

1. Short fit verdict
2. Scope split: managed ACE Platform vs self-deployed OSS contracts, if relevant
3. Relevant package(s)
4. Required integration steps
5. Security/licensing caveats
6. Next repo doc/source or product doc to inspect

Example:

```text
Yes, ACE core contracts can support a custom EVM vault. Start with Policy Management: make the vault PolicyProtected, deploy a PolicyEngine, write or reuse an extractor for the vault function calldata, then attach policies to the relevant selector. For production, review the BUSL license with counsel and contact Chainlink for commercial licensing.
```
