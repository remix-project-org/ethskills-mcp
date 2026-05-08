# Cross-Chain Identity

## Trigger Conditions

Read this file when:
- The user asks about CCIDs, cross-chain identity, KYC, AML, accreditation, credentials, issuers, or registries
- The user asks how identities are represented across chains
- The user asks about credential data, privacy, expiration, or revocation
- The user asks how `CredentialRegistryIdentityValidatorPolicy` validates accounts

## Core Model

Cross-Chain Identity provides a unified identity and credential system for EVM-compatible blockchains. It links one or more addresses to a Cross-Chain Identifier (CCID), then attaches credentials to that CCID.

| Concept | Meaning |
| --- | --- |
| CCID | A `bytes32` identifier for one identity across EVM chains |
| IdentityRegistry | Maps local wallet addresses to CCIDs |
| CredentialRegistry | Stores credentials linked to CCIDs |
| Credential Issuer | Offchain trusted entity that verifies real-world information and writes credentials onchain |
| Credential Source | Configuration telling validators which identity and credential registries to trust |
| Identity Validator | Onchain contract that validates whether an account meets credential requirements |

Cross-Chain Identity is designed to be governed by Policy Management. Registry administration should be controlled by policies so issuers can be authorized dynamically.

## CCIDs

A CCID is a `bytes32` value representing a user's identity within an application domain. Each chain maintains local address-to-CCID mappings through IdentityRegistry.

One CCID can be linked to multiple addresses across multiple EVM chains. This lets credentials be portable across addresses without re-verification for every chain.

Privacy note: CCID-to-address mappings can create address correlation. For privacy-sensitive use cases, issue multiple CCIDs per actor and maintain correlations offchain.

## Registries

### IdentityRegistry

Maps wallet addresses to CCIDs. Each local address maps to exactly one CCID.

### CredentialRegistry

Stores credentials for CCIDs and manages credential lifecycle operations such as registration, removal, renewal, expiration, and validation.

### Credential Requirements

Applications can define which credentials are required, which sources are trusted, and whether additional credential data validation is needed.

## Credential Type Identifiers

Credential type IDs are `bytes32` values generated from namespaced strings:

```solidity
keccak256("namespace.requirement_name")
```

Common credential type strings include:

| Identifier string | Purpose |
| --- | --- |
| `common.kyc` | Identity has passed KYC |
| `common.kyb` | Business identity has passed KYB |
| `common.aml` | Identity is not flagged by AML requirements |
| `common.accredited` | Identity is an accredited investor |

Custom credential types must not use the `common.` prefix.

Example:

```solidity
keccak256("com.yourapp.level.gold")
```

## Credential Sources

A Credential Source tells a validator where to check a credential type:

- credential type ID
- IdentityRegistry address
- CredentialRegistry address
- optional Credential Data Validator

Different sources can be used for different credential types. Multiple sources can also be configured for the same type, allowing a requirement to demand one or more independent providers.

## Credential Data and Validators

Credential data should not contain PII. Store hashes, pointers, or minimal non-sensitive references.

Credential Data Validator contracts can validate credential data when a requirement needs more than binary credential existence. Validator implementations must be defensive and should not let failures in one source break the whole validation model unexpectedly.

Critical repo requirement: view functions in Cross-Chain Identity validation interfaces should not revert under normal failure conditions. They should return boolean results rather than propagating unexpected external-call failures.

## Credential Lifecycle

1. User requests verification from a Credential Issuer.
2. Credential Issuer performs offchain checks.
3. Issuer generates a CCID.
4. Issuer registers address-to-CCID mappings in IdentityRegistry.
5. Issuer registers credentials in CredentialRegistry.
6. Application protects functions with `CredentialRegistryIdentityValidatorPolicy`.
7. At runtime, the policy resolves caller/address parameters to CCIDs and validates required credentials.
8. Credentials can expire, be renewed, or be removed/revoked.

## Runtime Validation

When a protected function runs:

1. The extractor supplies address parameters to `CredentialRegistryIdentityValidatorPolicy`.
2. The policy resolves each address to a CCID through IdentityRegistry.
3. The policy checks required credential types across configured Credential Sources.
4. If a Credential Data Validator is configured, it validates the credential data.
5. If an address fails requirements, the policy rejects.
6. If all addresses pass, the policy returns `Continue`.

## Designing Requirements

For simple KYC-gated transfers:

| Requirement field | Example |
| --- | --- |
| credential type | `keccak256("common.kyc")` |
| source | trusted IdentityRegistry + CredentialRegistry pair |
| validation | existence, optionally data validator |

For sanctions screening, choose a clear model:
- positive attestation such as "not sanctioned"
- deny credential plus inverted/negative logic in a custom requirement
- external list policy if sanctions state lives in another onchain source

## Privacy Rules

1. Never store PII onchain.
2. Credential data should be a hash, pointer, minimal reference, or non-sensitive classification.
3. Explain CCID address correlation when privacy matters.
4. Keep real-world verification offchain.
5. Treat Credential Issuer trust and revocation processes as part of the security model.
