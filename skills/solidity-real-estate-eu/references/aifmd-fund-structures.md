# AIFMD II — Real Estate Fund Structures Reference

## Fund Vehicle Types in EU

| Vehicle | Jurisdiction | Notes |
|---|---|---|
| FCP (Fonds Commun de Placement) | France / Luxembourg | No legal personality; managed by ManCo |
| SICAV (Société d'Investissement à Capital Variable) | Luxembourg / France | Self-managed or external AIFM |
| SCPI (Société Civile de Placement Immobilier) | France | Retail real estate fund |
| OPCI (Organisme de Placement Collectif Immobilier) | France | Hybrid liquid/illiquid RE fund |
| AIF-GmbH / KVG | Germany | German investment fund |
| FIA (Fondo de Inversión Alternativo) | Spain | Spanish AIF |

---

## AIFMD II Key Changes (Directive 2024/927/EU)

```solidity
// AIFMD II (effective 2024): key changes for real estate AIFs:
// 1. Liquidity management tools (LMTs) — mandatory for open-ended funds
// 2. Loan origination: new regime for credit-granting AIFs
// 3. Delegation: enhanced oversight of delegates (e.g., portfolio managers)
// 4. Depositary: passport possible for AIFs below certain threshold

// Open-ended real estate AIF must implement at least one LMT from Annex V
enum LMT {
    SUSPENSION_OF_REDEMPTIONS,
    REDEMPTION_GATES,
    NOTICE_PERIODS,
    REDEMPTION_IN_KIND,
    SIDE_POCKETS,
    SWING_PRICING,
    ANTI_DILUTION_LEVY,
    REDEMPTION_FEES
}

struct OpenEndedREAIF {
    LMT[] activeLMTs;               // Must have at least 1 activated LMT
    uint256 redemptionGatePct;      // Max % of NAV redeemable per period (e.g. 10%)
    uint256 noticePeriodDays;       // e.g. 90 days notice required
    uint256 swingPricingFactorBPS;  // Anti-dilution swing factor
    uint256 liquidityBuffer;        // % of NAV in liquid assets (EU regulation recommends ≥10%)
}
```

---

## Leverage Calculation Methods

AIFMD requires reporting leverage under two methods:

```solidity
// Gross Method: sum of absolute values of all positions
// Commitment Method: netting allowed for hedging + portfolio management arrangements

struct LeverageMetrics {
    uint256 totalAssets;           // Gross asset value
    uint256 equity;                // Net Asset Value
    uint256 grossLeverage;         // = totalAssets / equity (scaled 1e18)
    uint256 commitmentLeverage;    // After netting (typically lower)
    uint256 regulatoryLimit;       // Set by NCA (often 300% gross for RE AIFs)
}

function calcGrossLeverage(
    uint256 totalAssets,
    uint256 nav
) public pure returns (uint256) {
    return totalAssets * 1e18 / nav;
}

// AIFMD Art. 25: NCAs can impose leverage limits
// Typical limits for real estate AIFs: 300% gross, 200% commitment
uint256 constant DEFAULT_MAX_GROSS_LEVERAGE = 3e18;       // 3x = 300%
uint256 constant DEFAULT_MAX_COMMITMENT_LEVERAGE = 2e18;  // 2x = 200%

modifier leverageCompliant(uint256 grossLeverage, uint256 commitmentLeverage) {
    require(grossLeverage <= DEFAULT_MAX_GROSS_LEVERAGE, "AIFMD: gross leverage limit exceeded");
    require(commitmentLeverage <= DEFAULT_MAX_COMMITMENT_LEVERAGE, "AIFMD: commitment leverage limit exceeded");
    _;
}
```

---

## Depositary Obligations

```solidity
// AIFMD Art. 21: Depositary mandatory for all AIFs
// For real estate AIFs: depositary verifies ownership and maintains records
// Post-AIFMD II: depositary passport available for sub-threshold AIFs

interface IDepositary {
    // Cash monitoring
    function monitorCashFlows(bytes32 fundId) external view returns (bool compliant);

    // Asset safekeeping — for real estate: verification of ownership
    function verifyPropertyOwnership(
        bytes32 fundId,
        uint256 propertyTokenId,
        address claimedOwner
    ) external view returns (bool verified);

    // Oversight duties
    function validateSubscription(bytes32 fundId, address investor, uint256 amount)
        external returns (bool);
    function validateRedemption(bytes32 fundId, address investor, uint256 amount)
        external returns (bool);
    function validateNAVCalculation(bytes32 fundId, uint256 proposedNAV)
        external returns (bool);
}

// On-chain: log depositary verifications for regulatory audit trail
event DepositaryVerification(
    bytes32 indexed fundId,
    string verificationType,
    bool result,
    address depositary,
    uint256 timestamp
);
```

---

## AIFMD Reporting Requirements

AIFMs must report to NCAs (Annex IV reporting):

```solidity
// Quarterly/annual Annex IV reporting data — stored on-chain for audit
struct AnnexIVReport {
    bytes32 fundId;
    bytes32 aifmId;
    uint256 reportingPeriodEnd;
    uint256 navEUR;
    uint256 grossLeverage;
    uint256 commitmentLeverage;
    uint256 portfolioConcentration;    // Top 5 holdings % of GAV
    uint256 geographicConcentration;   // Top jurisdiction % of GAV
    uint256 liquidPortfolioPercent;    // % liquidatable within 1 week
    uint256 redemptionsPending;        // Queued redemptions as % of NAV
    bytes32 ipfsReportCID;             // Full Annex IV XML/report
}

mapping(uint256 => AnnexIVReport) public annexIVReports; // quarter → report
```
