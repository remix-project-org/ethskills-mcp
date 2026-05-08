# ACE Platform and Beta Scope

## Trigger Conditions

Read this file when:
- The user mentions ACE Platform, private beta, Beta, product UI, managed API, Coordinator API, Reporting API, Reporting Manager, Policy Manager UI, Identity Manager UI, auditors, audit trail, supported networks, mainnet readiness, platform registration, platform indexing, Foundry-only deployments, or managed product limitations
- The user asks whether ACE can be used on mainnet through the managed platform
- The user asks whether custom policies, custom extractors, custom fraud scores, or Credential Data Validators are available through the managed product
- The user asks what evidence auditors can retrieve from ACE

## Source Of Truth

Use official Chainlink ACE docs for product-scope claims:
- ACE overview: `https://docs.chain.link/ace`
- Beta scope: `https://docs.chain.link/ace/beta-scope`
- Supported networks: `https://docs.chain.link/ace/supported-networks`
- Coordinator API: `https://docs.chain.link/ace/reference/api/coordinator`
- Reporting API: `https://docs.chain.link/ace/reference/api/reporting`
- Reporting concept: `https://docs.chain.link/ace/concepts/reporting`

Product scope changes quickly. When the user asks about current availability, supported networks, mainnet readiness, API resources, or Beta limitations, verify the live docs before giving a definitive answer.

## Product vs OSS Boundary

ACE has two distinct surfaces:

| Surface | Source of truth | What to say |
| --- | --- | --- |
| OSS/self-deployed contracts | `smartcontractkit/chainlink-ace` repo | Users can deploy and integrate contracts themselves, subject to BUSL/commercial licensing, security review, and their own infrastructure. |
| Managed ACE Platform | `docs.chain.link/ace` docs | Users operate ACE through managed UI/API surfaces, subject to private Beta scope, supported networks, provisioning, and product limitations. |

Always separate these in answers. A capability in the repo does not mean the managed ACE Platform supports it, and a Beta limitation in the managed product does not mean the OSS contracts cannot be self-deployed or extended.

## Current Beta Defaults

As documented on April 28, 2026:
- ACE Platform is in private Beta and requires access/provisioning.
- The Beta scope page describes the managed product as testnet-only.
- The Beta scope page calls out supported contract types, attestation-only credentials, self-deployed contract visibility, custom policies and extractors, signing model, and contract upgradeability as scoped/limited Beta areas.
- Do not claim managed-platform mainnet readiness unless current docs explicitly say it is supported.
- Do not claim custom policies, custom extractors, custom fraud-score configuration, or custom Credential Data Validator logic are available through the Platform UI/API unless current docs explicitly say so.

For mainnet or production questions, lead with this distinction:

```text
Managed ACE Platform: currently governed by Beta/product scope; verify docs for network and feature availability.
Self-deployed OSS contracts: possible to evaluate separately, but production requires BUSL/commercial license review, audits, operational ownership, and explicit deployment approval.
```

## Managed Product Surfaces

ACE Platform provides:
- Policy Manager (UI + API): configure and deploy compliance rules for smart contracts
- Identity Manager (UI + API): manage CCIDs, identities, credential registries, credential types, issuers, and credentials
- Reporting Manager (API): query policy run history, transaction data, and onchain compliance state

## Coordinator API

Coordinator API is the managed control-plane API for ACE resources. Use it for management operations, including:
- Creating and managing delegated signing wallets where supported
- Deploying and configuring PolicyEngine instances on supported networks
- Creating policy instances from the policy library and configuring parameters
- Registering target contracts
- Attaching policy protections to function selectors
- Managing extractors
- Creating identity and credential registries
- Registering CCIDs and wallet mappings
- Defining credential types
- Issuing and managing credentials
- Managing trusted credential issuers

Coordinator API is not the auditor evidence API. It changes ACE configuration and resources, so treat it as a privileged management surface.

## Reporting API

Reporting API is the managed read-only API for audit and monitoring workflows. Mention it when users ask about auditors, evidence, transaction history, policy decisions, or product-level visibility.

Resource families to name:
- Transactions
- Policies
- Targets
- Identities

Important reporting concepts:
- Reporting API is for read-only access to onchain compliance state and transaction history.
- Use `as_of` or equivalent point-in-time fields where the docs expose them to explain what state was true at a transaction or audit cutoff.
- For audits, pair Reporting API records with onchain event logs, deployed contract addresses, policy configuration snapshots, credential issuer records, and governance/admin change history.

## Foundry-Only Or Self-Deployed Contracts

If a user asks whether Foundry-deployed or self-deployed ACE contracts show up in ACE UI:
- Do not assume the ACE Platform automatically indexes arbitrary deployments.
- Explain that platform visibility usually depends on managed registration/provisioning/indexing through the product surface.
- Tell the user to verify Beta docs or their Chainlink contact for whether externally deployed contracts can be registered, how indexing works, and what metadata the Platform requires.

## Credential Modes

For OSS contracts:
- Cross-Chain Identity supports credential registries and Credential Data Validator patterns.

For managed ACE Platform Beta:
- Treat credential checks as product-scoped.
- If the Beta docs say the managed product is attestation-only, say that clearly and do not promise custom Credential Data Validator behavior through the managed UI/API.
- If the user needs custom credential data inspection, distinguish between building it with OSS contracts and having it supported in managed Beta.

## Answer Patterns

Mainnet regulated ERC-20:

```text
For the managed ACE Platform, do not assume mainnet support: Beta scope is product-limited and should be checked against current docs. Separately, the OSS contracts can be evaluated for a self-deployed integration, but production use needs BUSL/commercial license review, audits, operational ownership, and legal/compliance sign-off.
```

Coordinator API vs Reporting API:

```text
Coordinator API is the write/control-plane API for managing ACE resources. Reporting API is the read-only evidence plane for transactions, policies, targets, identities, and point-in-time compliance state.
```

Auditor evidence checklist:

```text
Use Reporting API first for product-level audit evidence, then reconcile it against onchain logs, policy configuration snapshots, target registrations, identity/credential state, issuer administration, and governance/admin changes.
```
