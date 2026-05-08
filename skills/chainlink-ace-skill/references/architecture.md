# ACE Architecture

## Trigger Conditions

Read this file when:
- The user asks how ACE components fit together
- The user asks how Policy Management and Cross-Chain Identity interact
- The user asks how a policy-protected function is evaluated
- The user asks for a high-level diagram or mental model

## System Overview

The public `chainlink-ace` repository presents ACE as a modular toolkit:

| Component | Description | Dependency |
| --- | --- | --- |
| Policy Management | Dynamic engine to create and enforce onchain rules | Standalone |
| Cross-Chain Identity | Portable identity system for EVM chains; attach credentials once, verify anywhere | Requires Policy Management |
| Token examples | ERC-20 and ERC-3643 examples showing full integrations | Policy Management, optionally Cross-Chain Identity |

Policy Management is the enforcement layer. Cross-Chain Identity is an optional identity/credential layer governed and consumed by Policy Management.

## Policy Management Components

| Component | Role |
| --- | --- |
| `PolicyProtected` / `PolicyProtectedUpgradeable` | Base contract inherited by applications. Provides `runPolicy` and context handling. |
| `IPolicyProtected` | Interface for custom/manual integration when inheriting the base contract is not suitable. |
| `PolicyEngine` | Central orchestrator that manages policies, extractors, and mappers for protected functions. |
| `Policy` | Modular contract implementing a single rule through `run()` and optional `postRun()`. |
| `Extractor` | Parses calldata into named parameters. |
| `Mapper` | Optionally transforms or selects parameters before policy evaluation. |

## Protected Transaction Flow

1. User calls a protected function on an application contract.
2. The `runPolicy` modifier or manual `_runPolicy()` call sends a payload to `PolicyEngine`.
3. `PolicyEngine` uses the configured extractor for the function selector to parse calldata.
4. Parameters are mapped to each policy.
5. Policies execute in the order they were added.
6. A policy can revert with `PolicyRejected`, return `Allowed`, or return `Continue`.
7. If a policy returns `Allowed`, later policies are skipped.
8. If every policy returns `Continue`, the engine applies its default behavior.
9. If the call is allowed, the protected function body runs.

## Cross-Chain Identity Components

| Component | Role |
| --- | --- |
| CCID | `bytes32` identifier representing an identity across EVM chains |
| Identity Registry | Maps local wallet addresses to CCIDs |
| Credential Registry | Stores credentials linked to CCIDs |
| Credential Issuer | Offchain trusted entity that verifies real-world information and writes resulting credentials onchain |
| Credential Source | Configuration telling validators which identity/credential registries to trust |
| Credential Registry Identity Validator Policy | Policy that checks credential requirements during protected function calls |

The identity registries are governed by Policy Management, so issuer authorization can be changed through policies rather than hardcoded ownership.

## Example: Tokenized Bond Trade

1. Investor calls a protected function on a tokenized bond application.
2. PolicyEngine runs an identity policy to check required credentials such as KYC or accreditation.
3. PolicyEngine runs a volume or rate policy to ensure the trade is within allowed limits.
4. If all checks pass, the application executes the trade.
5. If any policy rejects, the transaction reverts before the application logic proceeds.

## Design Guidance

1. Use Policy Management standalone for rules that depend only on calldata, sender, time, roles, limits, or external onchain data.
2. Add Cross-Chain Identity when rules depend on credentials tied to users across addresses or chains.
3. Keep administrative control over PolicyEngine highly restricted.
4. Treat policies, extractors, and mappers as trusted components. A bad extractor can feed false data to correct policies.
5. For production, review the BUSL license, audit configuration, and test policy chains end to end.
