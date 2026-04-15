---
name: solidity-real-estate-eu
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for real estate, property tokenization, or mortgage lending targeting the European Union. Triggers
  include: EU AIFMD, EU Mortgage Credit Directive, EU Covered Bond Directive, ELTIF (European
  Long-Term Investment Fund), EU Prospectus Regulation for real estate, tokenized property in
  Germany/France/Netherlands/Spain, EU property crowdfunding (ECSP Regulation), energy performance
  certificates (EPC) on-chain, EU forced sale procedures, or any mention of "EU property token",
  "AIFMD real estate fund", "EU mortgage token", "ELTIF property", or "EU crowdfunding real estate".
  Always use this skill for EU-jurisdiction real estate Solidity.
---

# Solidity Real Estate — EU Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for real estate applications
operating under European Union law. Your contracts handle EU property rights, AIFMD-compliant
fund structures, mortgage credit directives, and EU crowdfunding regulations.

> ⚠️ **Critical Legal Caveat**: In most EU member states, property title transfer requires
> notarial deed and land registry registration. Smart contracts can manage **economic and
> beneficial rights** but cannot replace the civil law title transfer process. Member states
> with blockchain land registries (Sweden, Estonia, Georgia) have specific local rules.
>
> ⚠️ **Jurisdiction note**: For US rules use `solidity-real-estate`. For UK rules use
> `solidity-real-estate-uk`.

---

## Core EU Real Estate Frameworks

| Regulation | Scope | Key On-Chain Requirements |
|---|---|---|
| AIFMD 2011/61/EU + AIFMD II 2024 | Real estate AIFs (funds) | AIFM authorization, leverage limits, investor reporting |
| EU Mortgage Credit Directive 2014/17/EU | Residential mortgages | ESIS disclosure, APRC calculation, cooling-off |
| ECSP Regulation 2020/1503 | Property crowdfunding platforms | €5M limit per project, KIIS document, investor limits |
| EU Prospectus Regulation 2017/1129 | Public offerings >€8M | Prospectus approval by NCA |
| ELTIF Regulation 2023/606 (ELTIF 2.0) | Long-term investment funds incl. real estate | Retail access, leverage limits, liquidity rules |
| EU Energy Performance of Buildings Directive | EPC certificates | Energy class disclosure |
| EU Anti-Money Laundering (4AMLD/6AMLD) | Real estate transactions | Beneficial ownership, cash payment limits |
| GDPR | All data processing | No PII on-chain |

---

## EU Property Representation

```solidity
struct EUPropertyData {
    bytes32 propertyId;
    bytes2 memberState;             // ISO 3166-1 alpha-2 (e.g., "DE", "FR", "NL")
    bytes32 cadastralReference;     // Country-specific land registry reference
    bytes32 notarialDeedHash;       // IPFS CID of notarial deed (off-chain legal instrument)
    address notary;                 // Authorized notary's on-chain address
    bytes32 landRegistryEntryRef;   // Official land registry entry number
    bool titleRegistered;           // Confirmed registered in land registry
    EPCData energyPerformance;
    uint256 assessedValueEUR;
    PropertyLegalStatus legalStatus;
    bool hasPreemptionRight;        // Some EU jurisdictions have statutory preemption rights
}

struct EPCData {
    bytes1 energyClass;             // A+ to G
    uint256 primaryEnergyKWhM2;     // Primary energy demand kWh/m²/year
    uint256 co2EmissionsKgM2;       // CO2 emissions kg/m²/year
    uint256 certificateExpiry;      // EPC valid 10 years
    bytes32 certificateNumber;
}

enum PropertyLegalStatus { FREEHOLD, LEASEHOLD, COMMONHOLD, HERITABLE_BUILDING_RIGHT }
// Note: legal structures vary by member state
// Germany: Erbbaurecht (heritable building right)
// Netherlands: Erfpacht (ground lease)
// France: Emphytéose (long-term lease)
```

---

## AIFMD — Real Estate Alternative Investment Fund

```solidity
// AIFMD: applies to AIFMs managing AIFs (including real estate funds)
// Authorization required from home member state NCA
// AIFMD II (2024): enhanced rules on delegation, liquidity, depositaries

struct AIFMData {
    bytes32 aifmId;
    bytes32 ncaAuthorizationRef;    // NCA authorization reference
    bytes2 homeState;               // Home member state
    bytes32 aifmLEI;               // Legal Entity Identifier
    bool isSmallAIFM;               // <€100M AUM (or <€500M if unleveraged/closed-ended) — lighter regime
    uint256 aum;                    // AUM in EUR
}

// AIFMD leverage limits for real estate AIFs
uint256 constant MAX_LEVERAGE_GROSS = 300e16;       // 300% (3x) gross method
uint256 constant MAX_LEVERAGE_COMMITMENT = 200e16;  // 200% (2x) commitment method

// AIFMD II: open-ended real estate funds must implement liquidity management tools
enum LiquidityManagementTool {
    NOTICE_PERIODS,
    REDEMPTION_GATES,
    SUSPENSIONS,
    SIDE_POCKETS,
    SWING_PRICING,
    ANTI_DILUTION_LEVY
}

struct RealEstateAIF {
    AIFMData manager;
    uint256 navEUR;                 // Net Asset Value
    uint256 leverage;               // Current leverage ratio (scaled 1e18)
    bool isOpenEnded;
    uint256 redemptionNoticeDays;   // Notice period for redemptions
    uint256 gatePct;                // Max % of NAV redeemable per period
    mapping(address => bool) eligibleInvestors; // Professional investors only unless ELTIF
}

modifier aifmdLeverageCheck(uint256 newLeverage) {
    require(newLeverage <= MAX_LEVERAGE_GROSS, "AIFMD: leverage limit exceeded");
    _;
}
```

---

## ECSP — European Crowdfunding Service Provider (Property Crowdfunding)

```solidity
// ECSP Regulation 2020/1503: pan-EU crowdfunding licence
// Property crowdfunding platforms need ECSP authorization
// Per-project limit: €5 million over 12 months

uint256 constant ECSP_PROJECT_LIMIT = 5_000_000e18; // €5M per project per 12 months
uint256 constant ECSP_NON_SOPHISTICATED_LIMIT = 1_000e18; // €1,000 per project for non-sophisticated
// OR 5% of net worth (whichever higher) for non-sophisticated investors

struct ECSPProject {
    bytes32 projectId;
    bytes32 propertyId;
    uint256 targetAmountEUR;
    uint256 raisedAmountEUR;
    uint256 projectStartDate;
    bytes32 kiisIPFSCID;            // Key Investment Information Sheet (mandatory)
    bool kiisApproved;
    uint256 offeringDeadline;
    ECSPProjectStatus status;
    address escrowAccount;          // Funds held in escrow until target met
}

enum ECSPProjectStatus { PENDING, OPEN, FUNDED, FAILED, CANCELLED }

// ECSP: non-sophisticated investors get 4-day pre-contractual reflection period
uint256 constant ECSP_REFLECTION_PERIOD = 4 days;
mapping(address => mapping(bytes32 => uint256)) public investmentTimestamp;

function invest(bytes32 projectId, uint256 amount) external {
    ECSPProject storage project = projects[projectId];
    require(project.status == ECSPProjectStatus.OPEN, "ECSP: project not open");
    require(project.raisedAmountEUR + amount <= ECSP_PROJECT_LIMIT, "ECSP: project limit reached");

    if (!kycRegistry.isSophisticatedInvestor(msg.sender)) {
        // Non-sophisticated: check €1,000 limit or 5% net worth
        uint256 netWorth = kycRegistry.getNetWorth(msg.sender);
        uint256 maxInvestment = netWorth * 5 / 100 > ECSP_NON_SOPHISTICATED_LIMIT
            ? netWorth * 5 / 100
            : ECSP_NON_SOPHISTICATED_LIMIT;
        require(amount <= maxInvestment, "ECSP: non-sophisticated investor limit");
    }

    investmentTimestamp[msg.sender][projectId] = block.timestamp;
    // Funds held in escrow during reflection period
    emit InvestmentPending(projectId, msg.sender, amount);
}

// Investor can withdraw during reflection period
function withdrawInvestment(bytes32 projectId) external {
    require(
        block.timestamp <= investmentTimestamp[msg.sender][projectId] + ECSP_REFLECTION_PERIOD,
        "ECSP: reflection period expired"
    );
    // ... refund logic
}
```

---

## EU Mortgage Credit Directive — ESIS & APRC

```solidity
// MCD: applies to residential mortgage credit in EU
// ESIS: European Standardised Information Sheet — must be provided before binding offer
// APRC: Annual Percentage Rate of Charge — standardized calculation

struct EUMortgage {
    address borrower;
    address lender;                 // Must be licensed credit institution or intermediary
    uint256 principalEUR;
    uint256 aprcBPS;                // APRC in basis points (e.g., 350 = 3.50%)
    uint256 termMonths;
    uint256 monthlyPaymentEUR;
    uint256 totalRepayableEUR;      // Principal + all costs — must be disclosed in ESIS
    bytes32 esisIPFSCID;            // ESIS document hash
    uint256 esiIssuedDate;
    uint256 bindingOfferDate;       // Minimum 7 days after ESIS issued
    uint256 reflectionPeriodEnd;    // 7-day reflection period (some states: 14 days)
    bool borrowerHasAccepted;
    MortgageStatus status;
    bytes2 memberState;             // Governs applicable consumer protection rules
}

// MCD Art. 14: ESIS must be provided at least 7 days before binding offer
// MCD Art. 14(6): Borrower has right to reflect for at least 7 days
uint256 constant MCD_ESIS_LEAD_TIME = 7 days;
uint256 constant MCD_REFLECTION_PERIOD = 7 days;

function acceptMortgageOffer(uint256 mortgageId) external {
    EUMortgage storage m = mortgages[mortgageId];
    require(msg.sender == m.borrower, "MCD: not borrower");
    require(block.timestamp >= m.reflectionPeriodEnd, "MCD: reflection period active");
    require(block.timestamp >= m.bindingOfferDate + MCD_REFLECTION_PERIOD,
            "MCD: minimum reflection period not elapsed");
    m.borrowerHasAccepted = true;
    emit MortgageAccepted(mortgageId, block.timestamp);
}
```

---

## EU AML — Real Estate Specific Rules

```solidity
// 4AMLD/6AMLD: Real estate transactions are obliged entities
// Cash purchase limit varies by member state (Italy €1,000, France €1,000 for residents)
// Beneficial ownership: must identify UBO (≥25% ownership)

struct BeneficialOwner {
    bytes32 nameHash;               // Hashed — not stored plaintext (GDPR)
    bytes32 nationalityHash;
    uint256 ownershipPct;           // Scaled 1e4 (e.g., 2500 = 25.00%)
    bool isPEP;                     // Politically Exposed Person
    bytes32 sourceOfFundsHash;      // Source of funds explanation hash
    bytes32 verificationDocCID;     // IPFS CID of verification document
    uint256 verificationDate;
}

uint256 constant UBO_THRESHOLD = 2500; // 25.00% in basis points

// Must identify all UBOs before property transaction
mapping(uint256 => BeneficialOwner[]) public uboRegistry; // escrowId → UBOs

function addUBO(uint256 escrowId, BeneficialOwner calldata ubo)
    external onlyRole(AML_OFFICER_ROLE) {
    require(ubo.ownershipPct >= UBO_THRESHOLD, "AML: below UBO threshold");
    require(ubo.verificationDocCID != bytes32(0), "AML: verification document required");
    uboRegistry[escrowId].push(ubo);
}

// EU: some jurisdictions require notary to check sanctions before deed
modifier euSanctionsCheck(address buyer, address seller) {
    require(!sanctionsOracle.isSanctionedEU(buyer), "AML: EU sanctioned buyer");
    require(!sanctionsOracle.isSanctionedEU(seller), "AML: EU sanctioned seller");
    _;
}
```

---

## Security & Compliance Checklist

- [ ] Notarial deed reference stored before any title-dependent operations
- [ ] Land registry confirmation received before token represents full title
- [ ] AIFMD: AIFM authorization verified; leverage limits enforced
- [ ] ECSP: KIIS document stored; per-project €5M cap enforced
- [ ] ECSP: 4-day reflection period enforced for non-sophisticated investors
- [ ] MCD: 7-day ESIS lead time and reflection period enforced
- [ ] AML: UBOs ≥25% identified and verified before closing
- [ ] Preemption rights (Vorkaufsrecht etc.) checked by jurisdiction before transfer
- [ ] EPC energy class stored — may affect mortgage terms (green mortgages)
- [ ] GDPR: no PII on-chain; only hashes and document CIDs

---

## Reference Files

- `references/aifmd-fund-structures.md` — AIFMD II fund structures, depositary, leverage calculation
- `references/member-state-variations.md` — Key differences: Germany, France, Netherlands, Spain, Italy
- `references/eltif-retail-real-estate.md` — ELTIF 2.0 retail real estate fund requirements
