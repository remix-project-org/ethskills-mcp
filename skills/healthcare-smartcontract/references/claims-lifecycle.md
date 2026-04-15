# Claims Lifecycle — Full State Machine

## States

```
Submitted → UnderReview → Approved → Paid
                       ↘ Denied → Appealed → Approved (after appeal)
                                           ↘ FinalDenied
```

Also:
- Any state → Cancelled (by provider, before adjudication)
- Approved → OnHold (fraud review trigger)

## Full Solidity State Machine

```solidity
enum ClaimStatus {
    Submitted,      // 0 - provider submitted
    UnderReview,    // 1 - insurer picked up for review
    Approved,       // 2 - insurer approved amount
    Denied,         // 3 - insurer denied
    Paid,           // 4 - payment settled on-chain
    Appealed,       // 5 - provider appealing denial
    FinalDenied,    // 6 - appeal exhausted
    Cancelled,      // 7 - provider withdrew
    OnHold          // 8 - fraud flag, manual review needed
}
```

## Transition Rules (enforce these in contract modifiers)

| From | To | Who Can Trigger | Condition |
|---|---|---|---|
| — | Submitted | Provider | Valid claim hash + coverage active |
| Submitted | UnderReview | Insurer | Within review SLA |
| UnderReview | Approved | Insurer | — |
| UnderReview | Denied | Insurer | Must include denial reason hash |
| UnderReview | OnHold | Insurer or Regulator | — |
| Approved | Paid | Contract (auto) | After payment settlement delay |
| Denied | Appealed | Provider | Within appeal window (e.g., 60 days) |
| Appealed | Approved | Insurer | — |
| Appealed | FinalDenied | Insurer | — |
| Any (pre-Paid) | Cancelled | Provider | — |
| OnHold | UnderReview | Regulator | Fraud cleared |

## Timing SLAs to Enforce

These mirror US regulatory requirements:

```solidity
uint256 public constant URGENT_REVIEW_SLA = 72 hours;    // prior auth urgent
uint256 public constant STANDARD_REVIEW_SLA = 30 days;   // standard claims
uint256 public constant APPEAL_WINDOW = 60 days;          // from denial date
uint256 public constant PAYMENT_DELAY = 3 days;           // settlement buffer
```

If insurer misses STANDARD_REVIEW_SLA → auto-escalate to OnHold or auto-approve
depending on jurisdiction. Encode the jurisdiction-specific rule in the contract
or via a governance parameter.

## Denial Reason Codes (store as bytes32)

```solidity
bytes32 public constant DENIAL_NOT_COVERED = keccak256("DENIAL:NOT_COVERED");
bytes32 public constant DENIAL_PRIOR_AUTH = keccak256("DENIAL:PRIOR_AUTH_REQUIRED");
bytes32 public constant DENIAL_DUPLICATE = keccak256("DENIAL:DUPLICATE_CLAIM");
bytes32 public constant DENIAL_INVALID_PROVIDER = keccak256("DENIAL:INVALID_PROVIDER");
bytes32 public constant DENIAL_BENEFIT_MAX = keccak256("DENIAL:BENEFIT_MAX_REACHED");
```

## Payment Settlement Pattern

```solidity
// Use a two-step commit-reveal to prevent front-running on large claims
function approveAndSchedulePayment(uint256 claimId, uint256 approvedAmountCents) 
    external onlyRole(INSURER_ROLE) 
{
    Claim storage claim = claims[claimId];
    require(claim.status == ClaimStatus.UnderReview, "Invalid state");
    
    claim.status = ClaimStatus.Approved;
    claim.amountApproved = approvedAmountCents;
    claim.paymentScheduledAt = block.timestamp + PAYMENT_DELAY;
    
    emit ClaimApproved(claimId, approvedAmountCents, claim.paymentScheduledAt);
}

function settlePayment(uint256 claimId) external {
    Claim storage claim = claims[claimId];
    require(claim.status == ClaimStatus.Approved, "Not approved");
    require(block.timestamp >= claim.paymentScheduledAt, "Payment delay not elapsed");
    
    claim.status = ClaimStatus.Paid;
    claim.resolvedAt = block.timestamp;
    
    // Transfer stablecoin (USDC preferred over ETH for healthcare billing)
    IERC20(stablecoin).safeTransfer(claim.provider, claim.amountApproved * 1e4); // cents to USDC
    
    emit ClaimPaid(claimId, claim.provider, claim.amountApproved);
}
```

**Always use stablecoins (USDC/USDT/DAI) for healthcare billing — never native ETH.**
Price volatility is unacceptable in medical payments.
