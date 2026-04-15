# Mortgage Math — Reference

## Amortization Formula

Standard fixed-rate monthly payment:

```
M = P × [r(1+r)^n] / [(1+r)^n - 1]

Where:
  M = monthly payment
  P = principal loan amount
  r = monthly interest rate (annual rate / 12)
  n = total number of payments (term in months)
```

Solidity implementation (integer arithmetic, scaled to avoid overflow):

```solidity
/// @notice Calculate fixed monthly payment
/// @param principalWei  Loan principal in wei (e.g. USDC with 6 decimals: multiply by 1e6)
/// @param annualRateBPS Annual interest rate in basis points (e.g. 650 = 6.50%)
/// @param termMonths    Loan term in months (e.g. 360 for 30-year)
/// @return monthlyPayment in same units as principalWei
function calcMonthlyPayment(
    uint256 principalWei,
    uint256 annualRateBPS,
    uint256 termMonths
) public pure returns (uint256 monthlyPayment) {
    if (annualRateBPS == 0) {
        return principalWei / termMonths; // Zero-interest loan
    }

    // Monthly rate scaled by 1e18
    uint256 monthlyRate = annualRateBPS * 1e18 / (12 * 10_000);

    // (1 + r)^n using iterative multiplication — safe for n ≤ 360
    uint256 compoundFactor = 1e18;
    uint256 base = 1e18 + monthlyRate;
    for (uint256 i = 0; i < termMonths; i++) {
        compoundFactor = compoundFactor * base / 1e18;
    }

    // M = P * r * (1+r)^n / ((1+r)^n - 1)
    uint256 numerator = principalWei * monthlyRate / 1e18 * compoundFactor / 1e18;
    uint256 denominator = compoundFactor - 1e18;

    monthlyPayment = numerator * 1e18 / denominator;
}
```

> ⚠️ Gas note: the loop above costs ~360 iterations for a 30-year mortgage. For on-chain use,
> consider computing off-chain and storing the result, or using a lookup table for common rates.

---

## Amortization Schedule (Per-Payment Split)

For each payment, split into interest and principal:

```solidity
struct PaymentBreakdown {
    uint256 interestPaid;
    uint256 principalPaid;
    uint256 remainingBalance;
}

function calcPaymentBreakdown(
    uint256 remainingBalance,
    uint256 annualRateBPS,
    uint256 monthlyPayment
) public pure returns (PaymentBreakdown memory) {
    uint256 interestPaid = remainingBalance * annualRateBPS / (12 * 10_000);
    uint256 principalPaid = monthlyPayment > interestPaid
        ? monthlyPayment - interestPaid
        : 0;
    uint256 newBalance = remainingBalance > principalPaid
        ? remainingBalance - principalPaid
        : 0;

    return PaymentBreakdown(interestPaid, principalPaid, newBalance);
}
```

---

## Adjustable Rate Mortgage (ARM)

```solidity
struct ARMTerms {
    uint256 initialRateBPS;         // Teaser rate for initial fixed period
    uint256 initialFixedMonths;     // e.g. 60 for a 5/1 ARM
    uint256 adjustmentIntervalMonths; // e.g. 12 for annual adjustment
    uint256 periodicCapBPS;         // Max rate change per adjustment (e.g. 200 = 2%)
    uint256 lifetimeCapBPS;         // Max rate change over life of loan (e.g. 500 = 5%)
    uint256 floorRateBPS;           // Minimum rate (e.g. 250 = 2.5%)
    bytes32 indexType;              // e.g. keccak256("SOFR"), keccak256("CMT_1YR")
    uint256 marginBPS;              // Spread over index (e.g. 275 = 2.75%)
}

function calcNewARMRate(
    ARMTerms memory terms,
    uint256 currentRateBPS,
    uint256 indexRateBPS,      // Current index rate from oracle
    uint256 initialRateBPS
) public pure returns (uint256 newRateBPS) {
    uint256 unrestrictedRate = indexRateBPS + terms.marginBPS;

    // Apply periodic cap
    if (unrestrictedRate > currentRateBPS + terms.periodicCapBPS)
        unrestrictedRate = currentRateBPS + terms.periodicCapBPS;
    if (unrestrictedRate < currentRateBPS - terms.periodicCapBPS && currentRateBPS > terms.periodicCapBPS)
        unrestrictedRate = currentRateBPS - terms.periodicCapBPS;

    // Apply lifetime cap
    if (unrestrictedRate > initialRateBPS + terms.lifetimeCapBPS)
        unrestrictedRate = initialRateBPS + terms.lifetimeCapBPS;

    // Apply floor
    newRateBPS = unrestrictedRate < terms.floorRateBPS
        ? terms.floorRateBPS
        : unrestrictedRate;
}
```

---

## Prepayment Penalty

```solidity
// Prepayment penalties — common types:
// 1. Hard prepayment: penalty applies regardless of source
// 2. Soft prepayment: only applies to refinance, not sale

enum PrepaymentPenaltyType { NONE, FIXED_PERCENT, STEP_DOWN, YIELD_MAINTENANCE }

struct PrepaymentTerms {
    PrepaymentPenaltyType penaltyType;
    uint256 penaltyWindowMonths;    // e.g. 36 = 3-year prepayment penalty
    uint256 fixedPenaltyBPS;        // For FIXED_PERCENT type (e.g. 300 = 3%)
    uint256[] stepDownRates;        // For STEP_DOWN: rates per year [500, 400, 300, 200, 100]
}

function calcPrepaymentPenalty(
    PrepaymentTerms memory terms,
    uint256 remainingBalance,
    uint256 monthsElapsed
) public pure returns (uint256 penalty) {
    if (monthsElapsed >= terms.penaltyWindowMonths) return 0;

    if (terms.penaltyType == PrepaymentPenaltyType.FIXED_PERCENT) {
        penalty = remainingBalance * terms.fixedPenaltyBPS / 10_000;
    } else if (terms.penaltyType == PrepaymentPenaltyType.STEP_DOWN) {
        uint256 yearElapsed = monthsElapsed / 12;
        if (yearElapsed < terms.stepDownRates.length) {
            penalty = remainingBalance * terms.stepDownRates[yearElapsed] / 10_000;
        }
    }
    // YIELD_MAINTENANCE: complex — requires treasury rate oracle, computed off-chain
}
```

---

## TILA / Regulation Z — APRC Calculation

```solidity
// TILA requires disclosure of APR (Annual Percentage Rate)
// APR includes: interest + fees + points + mortgage insurance
// Must be within 1/8% (12.5 bps) of actual rate or redisclosure required

/// @notice Approximate APR including fees (for disclosure purposes)
/// @param principalWei     Loan amount
/// @param totalFeesWei     All financed fees (origination, points, PMI, etc.)
/// @param monthlyPayment   Monthly payment amount
/// @param termMonths       Loan term
/// @return aprBPS          Approximate APR in basis points
function estimateAPR(
    uint256 principalWei,
    uint256 totalFeesWei,
    uint256 monthlyPayment,
    uint256 termMonths
) public pure returns (uint256 aprBPS) {
    // Net proceeds = principal - fees (fees reduce effective loan amount)
    uint256 netProceeds = principalWei - totalFeesWei;

    // Binary search for rate that makes PV of payments = netProceeds
    uint256 low = 0;
    uint256 high = 5000; // 50% as upper bound (500 bps / month)
    for (uint i = 0; i < 50; i++) { // 50 iterations for precision
        uint256 mid = (low + high) / 2;
        uint256 pv = _presentValue(monthlyPayment, mid, termMonths);
        if (pv > netProceeds) low = mid;
        else high = mid;
    }
    aprBPS = (low + high) / 2 * 12; // Monthly rate → annual
}

function _presentValue(uint256 payment, uint256 monthlyRateBPS, uint256 n)
    internal pure returns (uint256 pv) {
    // PV = payment × [1 - (1+r)^-n] / r
    // Approximated via sum for simplicity
    uint256 discountFactor = 1e18;
    uint256 divisor = 1e18 + monthlyRateBPS * 1e14; // Scale bps to 1e18
    uint256 sum = 0;
    for (uint i = 0; i < n; i++) {
        discountFactor = discountFactor * 1e18 / divisor;
        sum += payment * discountFactor / 1e18;
    }
    pv = sum;
}
```
