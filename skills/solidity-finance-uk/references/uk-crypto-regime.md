# UK Crypto Regulatory Regime — Reference

## Overview
Post-Brexit, the UK is developing its own crypto regulatory framework distinct from EU MiCA.
Key legislative milestones:
- **Financial Services and Markets Act 2023 (FSMA 2023)**: brought crypto-assets into UK regulatory perimeter
- **HM Treasury consultations (2023)**: proposed framework for crypto trading, issuance, lending, staking
- **FCA CP24/10 (2024)**: consultation on cryptoasset admissions, disclosures, market abuse
- **FCA PS23/6**: financial promotion rules for cryptoassets (live from October 2023)

---

## Regulatory Perimeter — Activity-Based Approach

```solidity
// UK: activity-based regulation (not asset-class based like MiCA)
// Specified investment: "cryptoasset" added to Regulated Activities Order (RAO)

enum UKCryptoActivity {
    EXCHANGE_CRYPTOASSET_FOR_MONEY,     // Regulated under FSMA 2000
    EXCHANGE_CRYPTOASSET_FOR_CRYPTOASSET,
    OPERATING_CRYPTOASSET_TRADING_VENUE,
    MAKING_ARRANGEMENTS_FOR_CRYPTO_TRANSACTIONS,
    SAFEGUARDING_AND_ADMINISTERING_CRYPTOASSETS,
    ISSUING_STABLECOINS,                // Fiat-backed — PS23/4
    LENDING_CRYPTOASSETS,               // HMT consultation 2023
    STAKING_AS_SERVICE                  // Proposed
}

interface IFCAAuthorization {
    function isAuthorized(address firm, UKCryptoActivity activity) external view returns (bool);
    function getFirmReferenceNumber(address firm) external view returns (uint256 frn);
    function isRegistered(address firm) external view returns (bool); // MLR17 registration (lighter)
}

// Key distinction:
// FCA Authorized: full FSMA authorization — complex regulated activities
// FCA Registered: MLR17 crypto registration — AML/KYC compliance only (exchanges, custodians)
enum UKAuthorizationLevel { NONE, MLR17_REGISTERED, FSMA_AUTHORIZED }
```

---

## Financial Promotion Rules (FCA PS23/6 — October 2023)

```solidity
// All UK crypto financial promotions must be:
// (a) communicated by FCA-authorized person, OR
// (b) approved by FCA-authorized person (s.21 FSMA), OR
// (c) exempted (e.g. high-net-worth, sophisticated investors)

// FCA PS23/6 requirements for crypto promotions:
// 1. Clear risk warning: "Don't invest unless you're prepared to lose all the money you invest."
// 2. Personalization: "This is a high-risk investment and you are unlikely to be protected if something goes wrong."
// 3. 24-hour cooling-off for first-time investors
// 4. Ban on "refer a friend" and similar incentives for retail

bytes32 constant REQUIRED_RISK_WARNING = keccak256(
    "Don't invest unless you're prepared to lose all the money you invest. "
    "This is a high-risk investment and you are unlikely to be protected "
    "if something goes wrong. Take 2 minutes to learn more."
);

struct FCAApprovedPromotion {
    bytes32 contentHash;
    bytes32 approvedByFRN;          // FCA Firm Reference Number of approver
    uint256 approvalDate;
    uint256 expiryDate;             // Max 12 months typically
    bool includesRiskWarning;
    bool hasCoolingOffForNewInvestors;
    bool hasReferFriendIncentive;   // Must be FALSE
}

modifier promotionCompliant(bytes32 promotionId) {
    FCAApprovedPromotion storage p = fcaPromotions[promotionId];
    require(p.approvedByFRN != bytes32(0), "FCA: promotion not approved");
    require(block.timestamp <= p.expiryDate, "FCA: promotion approval expired");
    require(p.includesRiskWarning, "FCA: risk warning required");
    require(!p.hasReferFriendIncentive, "FCA: refer-a-friend incentives prohibited");
    _;
}

// 24-hour cooling off for first-time crypto investors
mapping(address => bool) public isFirstTimeCryptoInvestor;
mapping(address => uint256) public coolingOffExpiry;

function onboardNewInvestor(address investor) external {
    if (isFirstTimeCryptoInvestor[investor]) {
        coolingOffExpiry[investor] = block.timestamp + 24 hours;
        emit CoolingOffStarted(investor, coolingOffExpiry[investor]);
    }
}

modifier coolingOffRespected(address investor) {
    require(
        block.timestamp > coolingOffExpiry[investor],
        "FCA: 24-hour cooling-off period active for new investor"
    );
    _;
}
```

---

## UK Stablecoin Regulation (FCA PS23/4 + BoE)

```solidity
// UK fiat-backed stablecoin framework (effective 2024/2025):
// Two regulators: FCA (issuer authorization) + BoE (systemic designation)

// FCA authorization required for:
// - Issuance of fiat-backed stablecoins (used as means of payment in UK)
// - Custody of stablecoins
// - Facilitating stablecoin payments

// BoE systemic designation criteria:
// - Widely used for retail payments in UK
// - Systemic designation → BoE has additional oversight powers

struct UKStablecoinIssuer {
    bytes32 fcaAuthorizationRef;
    bool isBoESystemic;
    bytes32 boESystemicDesignationRef;
    address reserveCustodian;           // Must be UK-authorized bank or building society
    uint256 reserveRatio;               // Must be 100% at all times
    uint256 redemptionWindowHours;      // 24h retail, 48h wholesale
    bytes32 auditFrequency;             // Monthly independent audit required
}

// Reserve requirements (PS23/4):
// - 100% backed by GBP cash or near-cash equivalents
// - Held with UK-authorized deposit taker
// - Segregated from issuer's own assets
// - Daily reconciliation

event ReserveDeficiency(uint256 currentReserve, uint256 totalSupply, uint256 shortfall, uint256 timestamp);

function checkReserveSolvency() public {
    if (reserveBalance < totalSupply()) {
        emit ReserveDeficiency(reserveBalance, totalSupply(), totalSupply() - reserveBalance, block.timestamp);
        // Issuer must remedy within 1 business day
    }
}
```

---

## Market Abuse — Crypto (FCA CP24/10)

```solidity
// FCA CP24/10 (2024): extending market abuse regime to crypto
// Proposed rules mirror UK MAR for traditional securities:
// - Insider dealing prohibition
// - Market manipulation prohibition
// - Unlawful disclosure of inside information

// Inside information for crypto: precise information not publicly available
// that would have a significant effect on price if made public

struct InsiderTradingPrevention {
    mapping(address => bool) isInsider;         // People with access to inside info
    mapping(address => uint256) tradingBlacklist; // Insider → blackout period end
}

modifier noInsiderTrading(address trader) {
    if (isInsider[trader]) {
        require(
            block.timestamp > tradingBlacklist[trader],
            "UK MAR: trading prohibited during blackout period"
        );
    }
    _;
}

// Market manipulation patterns to detect and report:
// Wash trading, spoofing, layering, pump-and-dump, ramping
event SuspectedManipulation(address indexed party, string manipulationType, uint256 timestamp);
```

---

## UK Sandbox Regimes

```solidity
// FCA Innovation Sandbox: test regulated activities with modified rules
// FCA Digital Securities Sandbox (DSS): test tokenised securities (2024)
// DRCF (Digital Regulation Cooperation Forum): cross-regulator coordination

enum SandboxStatus { NOT_IN_SANDBOX, FCA_SANDBOX, DSS_PARTICIPANT, DRCF_PARTICIPANT }

struct SandboxParticipant {
    SandboxStatus status;
    bytes32 sandboxRef;
    uint256 sandboxStartDate;
    uint256 sandboxEndDate;
    bytes32[] modifiedRules;        // Which rules have been modified for testing
    uint256 maxUsersAllowed;        // Cap on participants during testing
    uint256 maxValueAtRisk;         // Financial limits during testing
}

// DSS (Digital Securities Sandbox) — specific to tokenised securities:
// Allows FMIs (trading venues, CCPs, CSDs) to operate with modified rules
// Enables DLT-based settlement without full CSD requirements (CSDR)
bool public isDSSParticipant;
bytes32 public dssAuthorizationRef;

modifier dssRulesApply() {
    if (isDSSParticipant) {
        // Modified CSDR rules apply — not full traditional CSD requirements
        _;
    } else {
        // Full CSDR/standard rules apply
        require(csdrRegistry.isCSDRegistered(address(this)), "CSDR: CSD registration required");
        _;
    }
}
```
