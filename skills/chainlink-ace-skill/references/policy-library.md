# Policy Library

## Trigger Conditions

Read this file when:
- The user asks which ACE policy to use
- The user asks how a specific policy behaves
- The user asks about policy configuration, runtime parameters, or setter/view functions
- The user wants to compose a policy chain for a compliance use case

## Policy Summary

The public repository's Policy Management package includes common policies for access control, limits, time windows, pause controls, and reserve-backed minting.

| Policy | Primary use | Runtime behavior |
| --- | --- | --- |
| AllowPolicy | Allowlist participants | Rejects if any checked address is not allowed |
| BypassPolicy | Privileged fast path | Returns `Allowed` if all checked addresses are listed; otherwise `Continue` |
| RejectPolicy | Denylist participants | Rejects if any checked address is denied |
| OnlyAuthorizedSenderPolicy | Sender allowlist | Rejects if `sender` is not authorized |
| OnlyOwnerPolicy | Policy owner access | Rejects if `sender` is not the policy owner |
| RoleBasedAccessControlPolicy | Role-based function access | Rejects if sender lacks a role allowed for the operation |
| MaxPolicy | Single upper bound | Rejects if an extracted amount exceeds max |
| VolumePolicy | Min/max per transaction | Rejects if amount is below min or above max |
| VolumeRatePolicy | Per-account volume over time | Rejects if account exceeds period cap; updates volume in `postRun()` |
| SecureMintPolicy | Reserve-backed minting | Rejects if minting would push total supply beyond reserve-backed limits |
| IntervalPolicy | Time-window enforcement | Rejects if current slot is outside allowed window |
| PausePolicy | Emergency stop | Rejects all calls when paused |

## Common Initialization Pattern

Policies follow a common initialization pattern:

1. Call `initialize(address policyEngine, address initialOwner, bytes configParams)`.
2. The base `Policy` initializes engine reference, ownership, and common modules.
3. The policy's `configure(bytes configParams)` decodes policy-specific parameters.

`configure(bytes)` is intended to run only once during initialization.

## Address List Policies

### AllowPolicy

Use for regulated access where all checked addresses must be approved.

- Inputs: variable number of address parameters.
- `run()`: rejects if any supplied address is not allowlisted; otherwise `Continue`.
- Owner functions: `allowSender(address)`, `disallowSender(address)`.
- View function: `senderAllowed(address)`.

### RejectPolicy

Use for sanctions, compromised wallets, blocklists, or malicious addresses.

- Inputs: variable number of address parameters.
- `run()`: rejects if any supplied address is denylisted; otherwise `Continue`.
- Owner functions: `rejectAddress(address)`, `unrejectAddress(address)`.
- View function: `addressRejected(address)`.

### BypassPolicy

Use only for deliberate privileged fast paths.

- Inputs: variable number of address parameters.
- `run()`: returns `Allowed` if all provided addresses are on the bypass list; otherwise `Continue`.
- Owner functions: `allowSender(address)`, `disallowSender(address)`.
- View function: `senderAllowed(address)`.
- Ordering warning: `Allowed` skips every later policy.

## Sender and Role Policies

### OnlyAuthorizedSenderPolicy

Use when the caller must be authorized regardless of function arguments.

- Inputs: none from extractor; checks `sender`.
- `run()`: rejects if sender is not authorized; otherwise `Continue`.
- Owner functions: `authorizeSender(address)`, `unauthorizeSender(address)`.
- View function: `senderAuthorized(address)`.

### OnlyOwnerPolicy

Use when only the policy owner should be able to call the protected method.

- Inputs: none from extractor; checks `sender`.
- `run()`: returns `Continue` if sender is the policy owner; reverts otherwise.

### RoleBasedAccessControlPolicy

Use for function-level team or operator permissions.

- Configuration: operation allowances map function selectors/operations to roles; role assignments map addresses to roles.
- `run()`: checks whether the sender holds a role allowed for the operation; rejects otherwise.
- Owner functions include `grantOperationAllowanceToRole(bytes4,bytes32)`, `removeOperationAllowanceFromRole(bytes4,bytes32)`, `grantRole(bytes32,address)`, `revokeRole(bytes32,address)`.
- View function: `hasAllowedRole(bytes4,address)`.

## Amount and Rate Policies

### MaxPolicy

Use for a simple per-transaction ceiling.

- Configuration: one maximum `uint256`.
- Inputs: one `uint256 amount`.
- `run()`: rejects if `amount > max`; otherwise `Continue`.
- Owner function: `setMax(uint256)`.
- View function: `getMax()`.

### VolumePolicy

Use for per-transaction min/max ranges.

- Configuration: min and max. A max of `0` indicates no upper limit.
- Inputs: one `uint256 amount`.
- `run()`: rejects if amount is below min or above max when max is set; otherwise `Continue`.
- Owner functions: `setMin(uint256)`, `setMax(uint256)`.
- View functions: `getMin()`, `getMax()`.

### VolumeRatePolicy

Use for cumulative per-account transfer limits over a period.

- Configuration: max amount per period and time period duration in seconds.
- Inputs: `uint256 amount`, `address account`.
- `run()`: rejects if account's current-period volume plus amount exceeds max.
- `postRun()`: updates the account volume for the current period.
- Owner functions: `setMaxAmount(uint256)`, `setTimePeriod(uint256)`.
- View functions: `getMaxAmount()`, `getTimePeriod()`.

## Time and Pause Policies

### IntervalPolicy

Use for business hours, weekdays, maintenance windows, or repeated schedules.

- Configuration: start slot, end slot, slot duration, cycle size, cycle offset.
- Inputs: none.
- Slot formula: `((block.timestamp / slotDuration) % cycleSize + cycleOffset) % cycleSize`.
- Allows only slots in `[startSlot, endSlot)`.
- Owner functions: `setStartSlot(uint256)`, `setEndSlot(uint256)`, `setCycleParameters(uint256,uint256,uint256)`.

### PausePolicy

Use for emergency stop or launch gating.

- Configuration: boolean paused state.
- Inputs: none.
- `run()`: rejects if paused; otherwise `Continue`.
- Owner functions: `pause()`, `unpause()`.
- Deploy or initialize paused if other policies must be configured before launch.

## Reserve Policy

### SecureMintPolicy

Use for collateralized or reserve-backed token minting.

- Configuration: reserve feed, reserve margin, and max staleness.
- Inputs: mint amount.
- `run()`: reads reserve data, rejects stale data when staleness is set, calculates reserve-backed supply, and rejects if minting would exceed backed supply.
- Owner functions include `setReservesFeed(address)`, `setReserveMargin(...)`, and `setMaxStalenessSeconds(uint256)`.

Safety notes:
- Verify token decimals and reserve feed decimals.
- Fetch or verify reserve feed heartbeat before choosing staleness.
- Setting max staleness to `0` accepts infinite staleness and should be called out explicitly.
- If the user asks for product-documented SecureMint behavior, check the current docs.chain.link SecureMintPolicy page before discussing negative margin modes, multiple reserve feeds, or multi-feed composition. Do not invent multi-feed behavior from the repo summary alone.

## Selection Guide

| Requirement | Recommended policy |
| --- | --- |
| Require participants to be approved | AllowPolicy |
| Block specific addresses | RejectPolicy |
| Let selected privileged addresses skip checks | BypassPolicy |
| Restrict callers | OnlyAuthorizedSenderPolicy |
| Restrict callers to owner | OnlyOwnerPolicy |
| Restrict callers by role and function | RoleBasedAccessControlPolicy |
| Cap individual transaction amount | MaxPolicy |
| Enforce per-transaction min and max | VolumePolicy |
| Enforce per-account daily/hourly volume | VolumeRatePolicy |
| Enforce operating windows | IntervalPolicy |
| Emergency halt | PausePolicy |
| Prevent minting beyond reserves | SecureMintPolicy |

## Custom Policies

For custom compliance logic, route to the Policy Management custom policies tutorial in the repo. Custom policies must be audited and tested because policies can reject, allow, skip later policies, or mutate state in `postRun()`.
