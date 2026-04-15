# Australia FIRB — Foreign Investment Review Board Reference

## Overview
The Foreign Acquisitions and Takeovers Act 1975 (FATA) requires foreign investors to
seek FIRB approval before acquiring certain Australian assets including real estate.
The FIRB reviews applications and advises the Treasurer.

---

## Who Is a "Foreign Person"?

```solidity
// Foreign person: person not ordinarily resident in Australia
// Includes: foreign nationals, temporary visa holders, foreign corporations

enum AUResidencyStatus {
    AUSTRALIAN_CITIZEN,             // No FIRB required
    PERMANENT_RESIDENT,             // No FIRB required
    TEMPORARY_VISA_HOLDER,          // FIRB required; limited to one established dwelling
    NZ_CITIZEN,                     // Treated as Australian for FIRB residential purposes
    FOREIGN_NON_RESIDENT,           // FIRB required; new dwellings only
    FOREIGN_CORPORATION,            // FIRB required; subject to thresholds
    FOREIGN_GOVERNMENT_INVESTOR     // FIRB required; zero threshold (all acquisitions)
}

// "Significant foreign government investor": SWF, central bank, or government owns ≥15%
bool public isForeignGovernmentInvestor;
```

---

## Residential Real Estate Rules

```solidity
// FIRB thresholds for residential real estate (2024-25):
// ALL residential acquisitions by foreign non-residents require FIRB approval (no threshold)
// Application fee: A$14,100 for property ≤ A$1M (increases with property value)

struct FIRBResidentialRules {
    // New dwellings (off-the-plan or newly constructed):
    // Foreign non-residents: CAN buy, require FIRB approval
    // Temporary residents: CAN buy, require FIRB approval

    // Established dwellings (existing homes):
    // Foreign non-residents: CANNOT buy (prohibited)
    // Temporary residents: CAN buy ONE as primary residence; must sell on visa expiry

    // Vacant land for residential development:
    // Foreign non-residents: CAN buy with FIRB approval; must build within 4 years
    // Temporary residents: CAN buy with FIRB approval
}

uint256 constant FIRB_RESIDENTIAL_BUILD_OBLIGATION = 4 * 365 days; // 4-year build requirement

struct FIRBApproval {
    bytes32 applicationRef;         // FIRB application reference number
    AUResidencyStatus buyerStatus;
    bool isNewDwelling;
    uint256 propertyValueAUD;
    uint256 approvalDate;
    uint256 approvalExpiry;         // Typically 2 years for new dwellings
    bytes32[] conditions;           // e.g. ["NO_RENTAL", "MUST_SELL_ON_VISA_EXPIRY"]
    bool isGranted;
    bytes32 treasurerDecisionRef;   // If escalated to Treasurer
}

mapping(address => FIRBApproval[]) public firbApprovals;

function hasValidFIRBApproval(address buyer, uint256 propertyValueAUD) public view returns (bool) {
    FIRBApproval[] storage approvals = firbApprovals[buyer];
    for (uint i = 0; i < approvals.length; i++) {
        if (approvals[i].isGranted &&
            approvals[i].propertyValueAUD >= propertyValueAUD &&
            block.timestamp <= approvals[i].approvalExpiry) {
            return true;
        }
    }
    return false;
}
```

---

## Commercial Real Estate Thresholds

```solidity
// Commercial real estate thresholds (2024-25) — indexed annually to CPI:
// Private foreign investors: A$330 million (≈USD 220M)
// FTA country investors (US, UK, NZ, Singapore, etc.): A$1.347 billion
// Foreign government investors: A$0 (all acquisitions screened)
// Sensitive sectors (media, telecoms, defence): lower thresholds apply

uint256 constant FIRB_COMMERCIAL_PRIVATE = 330_000_000e18;           // A$330M
uint256 constant FIRB_COMMERCIAL_FTA_PARTNER = 1_347_000_000e18;     // A$1.347B
uint256 constant FIRB_AGRICULTURAL_THRESHOLD = 65_000_000e18;        // A$65M (agricultural land)
uint256 constant FIRB_AGRIBUSINESS_THRESHOLD = 65_000_000e18;        // A$65M (agribusiness)

// FTA partner countries (reduced threshold):
bytes2[] public ftaPartnerCountries = [
    "US", "GB", "NZ", "SG", "JP", "KR", "CN", "TH", "MY", "ID", "PE", "CL"
];

mapping(bytes2 => bool) public isFTAPartner;
```

---

## FIRB Application Process & Fees

```solidity
// Application fees (residential, 2024-25):
// ≤ A$1M: A$14,100 | A$1M-A$2M: A$28,200 | A$2M-A$3M: A$56,400
// >A$3M: scales up — check current ATO fee schedule

// Review period: 30 days (extendable to 90 days or longer)
// Government may impose conditions: minimum spend on development, no-rent conditions

struct FIRBFeeSchedule {
    uint256 maxValueAUD;
    uint256 feeAUD;
}

// On-chain: store FIRB fee paid as evidence of application
mapping(bytes32 => uint256) public firbFeesPaid; // applicationRef → AUD amount

// ATO administers FIRB since 2015 (not separate FIRB agency)
// Applications submitted via ATO foreign investment portal
bytes32 public constant ATO_FIRB_PORTAL = keccak256("ATO_FOREIGN_INVESTMENT_PORTAL");
```

---

## Penalties for Non-Compliance

```solidity
// Criminal: up to 3 years imprisonment + A$168,000 fine (individual) or A$840,000 (company)
// Civil: divestiture order — forced sale within specified period + penalty up to A$168,000
// ATO can also impose "vacancy fee" for foreign-owned properties left vacant

// Divestiture orders: FIRB can force sale within 12 months if no approval
// On-chain: flag properties subject to divestiture order
mapping(uint256 => bool) public subjectToDivestitureOrder;
mapping(uint256 => uint256) public divestitureDeadline;

event DivestitureOrderIssued(uint256 propertyTokenId, uint256 deadline, address issuedBy);

// Vacancy fee: foreign owners of residential property must pay annual vacancy fee
// if property not occupied or genuinely available for rent for ≥183 days per year
// Fee = FIRB application fee for that property
bool public isVacant;
uint256 public vacancyFeeAUD;
```

---

## Managed Investment Schemes (MIS) — Property

```solidity
// Pooled property investment with >20 investors = likely MIS under Corps Act s.9
// Requires AFSL (Australian Financial Services Licence) to operate or advise on MIS
// Responsible Entity (RE): licensed, must be Australian company

// Exceptions to MIS classification:
// 1. <20 investors with <A$2M total capital raised
// 2. Investor-directed portfolio service (IDPS)
// 3. Timeshare schemes (separate regulation)

uint256 constant MIS_INVESTOR_THRESHOLD = 20;
uint256 constant MIS_CAPITAL_THRESHOLD = 2_000_000e18; // A$2M

function requiresMISRegistration(
    uint256 investorCount,
    uint256 totalCapitalAUD
) public pure returns (bool) {
    return investorCount > MIS_INVESTOR_THRESHOLD || totalCapitalAUD > MIS_CAPITAL_THRESHOLD;
}

// Wholesale vs Retail investors:
// Wholesale: A$2.5M net assets OR A$250k gross income in each of last 2 years
// Retail: everyone else — full MIS disclosure obligations apply
uint256 constant WHOLESALE_NET_ASSETS = 2_500_000e18;
uint256 constant WHOLESALE_GROSS_INCOME = 250_000e18;
```
