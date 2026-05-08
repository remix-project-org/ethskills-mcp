# Policy Management

## Trigger Conditions

Read this file when:
- The user asks about PolicyEngine, PolicyProtected, policy chains, extractors, mappers, context, or default behavior
- The user wants to compose compliance rules
- The user asks why policy ordering matters
- The user asks how to protect a function
- The user asks about custom policies, custom extractors, or custom mappers

## Why Policy Management Exists

Hardcoding enforcement logic into application contracts makes them rigid and difficult to audit. Policy Management separates business logic from enforcement logic:

- Application contracts inherit `PolicyProtected` or implement `IPolicyProtected`.
- Protected functions use `runPolicy` or `runPolicyWithContext`.
- `PolicyEngine` executes policies attached to the target contract and function selector.
- Policies, extractors, and mappers can be changed without changing the protected contract logic.

## Runtime Flow

1. A user calls a protected function.
2. The `runPolicy` modifier or manual `_runPolicy()` call invokes `PolicyEngine.run()`.
3. `PolicyEngine` calls the configured extractor for the function selector.
4. The extractor decodes calldata into named parameters such as `to`, `amount`, or `account`.
5. The configured mapper or default parameter mapping supplies each policy with the parameters it expects.
6. Policies run in the order they were added.
7. Each policy returns `Continue` or `Allowed`, or reverts with `PolicyRejected`.
8. Optional `postRun()` hooks execute after a check passes.
9. If execution is allowed, the protected function body proceeds.

## Policy Outcomes

| Outcome | Effect |
| --- | --- |
| `PolicyRejected(reason)` | Reverts immediately and skips remaining policies |
| `Allowed` | Allows immediately and skips remaining policies |
| `Continue` | Proceeds to the next policy or engine default behavior |

Policy ordering is critical because both rejection and `Allowed` are terminal.

## Extractors and Mappers

Extractors parse calldata. Mappers transform or select extracted parameters for a policy.

Default flow:
1. Register an extractor for a target contract and function selector.
2. The extractor returns all relevant named parameters.
3. When a policy is added, configure the parameters it receives.
4. The PolicyEngine supplies those parameters when executing the policy.

Custom extractors and mappers are part of the public contract model. Use them when standard parsing or name-based mapping does not fit the protected function.

## Context Parameter

The `context` parameter is a `bytes` value passed to policy execution. It can carry arbitrary authorization or compliance data, such as:
- offchain signatures
- Merkle proofs
- approval metadata
- policy-specific evidence

Context handling must be atomic when stored per sender. If context is set but not consumed immediately, stale context can be reused by a later call.

## Ordering Rules

Policies execute in the exact order they were added.

PolicyEngine supports:
- `addPolicy()` to append
- `addPolicyAt()` to insert at a position
- `removePolicy()` to remove
- `getPolicies()` to inspect current order

To reorder an existing policy, remove it and add it back at the desired position.

Recommended default ordering:

1. Hard security restrictions: pause, denylist, sanctions, credential checks
2. Business limits: max amount, volume windows, time windows, reserve checks
3. Permissive bypasses: only when intentionally skipping later checks

## Integration Pattern

For a new contract:

```solidity
import {PolicyProtected} from "@chainlink/policy-management/core/PolicyProtected.sol";

contract MyContract is PolicyProtected {
    function sensitiveAction(uint256 amount) public runPolicy {
        // business logic
    }
}
```

Then deploy and connect:
1. `PolicyEngine` behind a proxy.
2. The protected contract behind a proxy.
3. Policy contracts behind proxies where required.
4. Add policies to selectors with `policyEngine.addPolicy(...)`.

For existing upgradeable contracts, prefer `PolicyProtectedUpgradeable` and a `migrateToACE(address policyEngine)` reinitializer unless bytecode constraints or custom needs require direct `IPolicyProtected` implementation.

## Security Notes

1. Policy administration is a critical control. Restrict `addPolicy`, `removePolicy`, `setExtractor`, `setPolicyMapper`, and default behavior changes.
2. Timelocks are recommended for administrative changes in production systems.
3. Treat policies, extractors, and mappers as trusted code.
4. A malicious extractor can lie about calldata and bypass otherwise correct policies.
5. `postRun()` can mutate state; audit it carefully.
6. External calls inside policies can introduce denial-of-service, gas, and consistency risks.
7. Direct `IPolicyProtected` implementations must handle storage, context clearing, attach/detach, and ERC-165 correctly.
