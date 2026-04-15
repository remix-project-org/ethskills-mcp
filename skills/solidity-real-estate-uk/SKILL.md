---
name: solidity-real-estate-uk
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for real estate, property tokenization, or mortgage lending targeting the United Kingdom. Triggers
  include: HMLR (HM Land Registry) digital title, UK property tokenization, FCA-regulated property
  funds, UK REIT, UK mortgage (FCA MCOB rules), UK property crowdfunding (FCA P2P rules), SDLT
  (Stamp Duty Land Tax) tracking, UK leasehold reform, UK social housing, or any mention of "UK
  property token", "UK REIT on-chain", "HMLR blockchain", "UK mortgage smart contract", or
  "UK property crowdfunding". Always use this skill for UK-jurisdiction real estate Solidity.
---

# Solidity Real Estate — UK Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for real estate applications
operating under United Kingdom law post-Brexit. Your contracts handle HM Land Registry integration,
FCA-regulated property funds, UK mortgage rules, and UK REIT structures.

> ⚠️ **Critical Legal Caveat**: Legal title to UK property transfers only upon registration at
> HM Land Registry. Smart contracts can manage **beneficial ownership** and **economic rights**
> but cannot substitute for Land Registry registration. HM Land Registry is exploring blockchain
> integration but no live digital title system exists as of 2025.
>
> ⚠️ **Jurisdiction note**: For EU rules use `solidity-real-estate-eu`. For US rules use
> `solidity-real-estate`. Scotland and Northern Ireland have different land law systems
> — flag jurisdiction within UK carefully.

---

## Core UK Real Estate Frameworks

| Regulation / Body | Key On-Chain Requirements |
|---|---|
| Land Registration Act 2002 + HMLR | Title registration, charges, restrictions |
| FCA COLL / FUND Sourcebook | Authorized property funds (AUTs, OEICs) |
| FCA MCOB | Mortgage conduct of business — responsible lending |
| UK REIT (CTA 2010) | 90% distribution, 75% property income test |
| SDLT / LBTT / LTT | Stamp duty tracking (England/Scotland/Wales) |
| Consumer Credit Act 1974 | Second charge mortgages, regulated agreements |
| FCA IFPRU / BIPRU | Capital requirements for lenders |
| UK AML Regulations 2017 | Estate agents, conveyancers as obliged entities |
| Leasehold Reform (Ground Rent) Act 2022 | Zero ground rent for new leases |
| Building Safety Act 2022 | Accountable persons, resident engagement |

---

## HMLR — Land Registry Integration

```solidity
// HM Land Registry: each registered title has a unique Title Number
// Register comprises: Property Register, Proprietorship Register, Charges Register

struct HMLRTitle {
    bytes32 titleNumber;            // UK Land Registry title number (e.g. "TGL12345")
    bytes2 ukJurisdiction;          // "EN" England, "WL" Wales, "SC" Scotland, "NI" N.Ireland
    address registeredProprietor;   // Current legal owner
    bytes32 titlePlanCID;           // IPFS CID of title plan (map)
    bytes32 officialCopyCID;        // IPFS CID of official copy of register
    TitleClass titleClass;
    bool hasRestriction;            // Restriction preventing disposal without consent
    bytes32 restrictionDetails;
    bool hasCharge;                 // Registered charge (mortgage)
    Charge[] charges;               // Charges register entries
    uint256 lastUpdated;
}

enum TitleClass {
    ABSOLUTE,           // Best class — guaranteed title
    GOOD_LEASEHOLD,     // Leasehold where freehold not investigated
    QUALIFIED,          // Minor defect in title
    POSSESSORY          // Based on adverse possession
}

struct Charge {
    address chargee;               // Lender
    bytes32 chargeDate;
    uint256 amountSecuredGBP;
    bool isSatisfied;
    bytes32 chargeDocCID;          // IPFS CID of charge document (Form CH1)
}

// Only HMLR-authorized conveyancers can update title on-chain
modifier onlyConveyancer() {
    require(conveyancerRegistry.isAuthorized(msg.sender), "HMLR: not authorized conveyancer");
    _;
}
```

---

## UK REIT Structure (CTA 2010)

```solidity
// UK REIT: tax-exempt if meets conditions
// Key tests: property rental business income ≥75%, property assets ≥75%, distribute ≥90%

contract UKREITToken is ERC20 {
    // UK REIT: minimum 3 shareholders; no single shareholder >10% of ordinary shares
    uint256 public constant MAX_SINGLE_SHAREHOLDER_PCT = 1000; // 10% in basis points
    uint256 public constant MIN_SHAREHOLDER_COUNT = 3;
    uint256 public constant DISTRIBUTION_REQUIREMENT_BPS = 9000; // 90%
    uint256 public constant PROPERTY_INCOME_TEST_BPS = 7500;     // 75%
    uint256 public constant PROPERTY_ASSETS_TEST_BPS = 7500;     // 75%

    uint256 public totalShareholderCount;
    uint256 public totalDistributedThisPeriod;
    uint256 public totalPropertyIncome;
    uint256 public totalIncome;

    // UK REIT: distributions treated as UK property income for tax (not dividends)
    // Must withhold 20% basic rate tax for non-exempt shareholders
    mapping(address => bool) public isTaxExempt;     // Pension funds, ISAs, etc.
    uint256 constant UK_BASIC_RATE_TAX_BPS = 2000;   // 20%

    function distributePropertyIncome(uint256 grossAmount)
        external onlyRole(MANAGER_ROLE) {
        require(
            totalDistributedThisPeriod + grossAmount >=
            totalPropertyIncome * DISTRIBUTION_REQUIREMENT_BPS / 10_000,
            "UKRFIT: 90% distribution test not met"
        );

        uint256 taxAmount = grossAmount * UK_BASIC_RATE_TAX_BPS / 10_000;

        for (uint i = 0; i < shareholders.length; i++) {
            address sh = shareholders[i];
            uint256 shGross = grossAmount * balanceOf(sh) / totalSupply();
            uint256 shNet = isTaxExempt[sh]
                ? shGross
                : shGross * (10_000 - UK_BASIC_RATE_TAX_BPS) / 10_000;
            // ... transfer net amount, withhold tax amount
        }

        totalDistributedThisPeriod += grossAmount;
    }

    // UK REIT: close company rule — cannot be "close company" (broadly: <5 independent shareholders holding >50%)
    function checkCloseCompanyStatus() public view returns (bool isClose) {
        // Check if 5 or fewer participators control >50%
        // ... implementation
    }
}
```

---

## FCA MCOB — Mortgage Conduct of Business

```solidity
// MCOB: FCA rules for mortgage lenders and intermediaries
// Responsible lending: affordability assessment mandatory
// ESIS: European Standardised Information Sheet (retained post-Brexit with minor changes)

struct UKMortgage {
    address borrower;
    address lender;                 // Must be FCA-authorized
    uint256 principalGBP;
    uint256 aprcBPS;                // Annual Percentage Rate of Charge (basis points)
    uint256 termMonths;
    uint256 monthlyPaymentGBP;
    bytes32 esisIPFSCID;
    uint256 esiIssuedDate;
    uint256 mortgageOfferDate;
    uint256 offerValidUntil;        // Typically 6 months
    bool isFirstCharge;
    bool isResidential;             // Regulated by MCOB if residential
    bool isHelptoBuy;               // Help to Buy equity loan component
    UKMortgageStatus status;
    HMLRTitle securedTitle;
}

enum UKMortgageStatus { OFFERED, ACCEPTED, COMPLETED, IN_ARREARS, DEFAULTED, REPAID }

// MCOB 11: Responsible lending — affordability must be assessed
// Cannot be assessed purely algorithmically — must involve human oversight
// On-chain: store affordability assessment reference
bytes32 public affordabilityAssessmentRef; // Reference to off-chain assessment record

// MCOB 13: Arrears — lender must treat borrowers fairly before repossession
// Minimum 3 months arrears before possession proceedings
uint256 constant MIN_ARREARS_MONTHS_BEFORE_POSSESSION = 3;

function initiateDefaultProcess(uint256 mortgageId) external {
    UKMortgage storage m = mortgages[mortgageId];
    require(m.status == UKMortgageStatus.IN_ARREARS, "MCOB: not in arrears");
    require(
        missedPayments[mortgageId] >= MIN_ARREARS_MONTHS_BEFORE_POSSESSION,
        "MCOB: minimum arrears period not met"
    );
    // Off-chain: must also have made contact attempts, considered alternatives to repossession
    m.status = UKMortgageStatus.DEFAULTED;
    emit DefaultInitiated(mortgageId, block.timestamp);
}
```

---

## SDLT — Stamp Duty Land Tax Tracking

```solidity
// SDLT: England + NI | LBTT: Scotland | LTT: Wales
// Rates vary: residential, non-residential, first-time buyer relief, additional dwelling surcharge

enum SDLTJurisdiction { ENGLAND_NI, SCOTLAND, WALES }

struct SDLTRecord {
    uint256 propertyValueGBP;
    SDLTJurisdiction jurisdiction;
    bool isResidential;
    bool isBuyerFirstTimeBuyer;     // First-time buyer relief (up to £425k SDLT-free in England)
    bool isAdditionalDwelling;      // 3% surcharge for additional residential properties
    bool isCorporateBuyer;          // 15% flat rate for residential >£500k by company
    bool isForeignBuyer;            // +2% surcharge (from April 2021)
    uint256 sdltLiabilityGBP;      // Calculated liability
    bytes32 sdltReturnRef;          // HMRC SDLT return reference number
    bool sdltPaid;
}

// England residential SDLT rates 2024/25:
// £0-£250k: 0% | £250k-£925k: 5% | £925k-£1.5M: 10% | >£1.5M: 12%
// First-time buyer: 0% on first £425k, 5% on £425k-£625k (no relief if >£625k)
// Additional dwelling: +3% on all bands

function calculateSDLT(
    uint256 valueGBP,
    bool isFirstTimeBuyer,
    bool isAdditional,
    bool isForeign
) public pure returns (uint256 sdlt) {
    if (isAdditional) {
        // Additional dwelling: standard rates + 3% surcharge on all bands
        if (valueGBP <= 250_000e18) sdlt = valueGBP * 3 / 100;
        else if (valueGBP <= 925_000e18) sdlt = 250_000e18 * 3/100 + (valueGBP - 250_000e18) * 8/100;
        else if (valueGBP <= 1_500_000e18) sdlt = 250_000e18*3/100 + 675_000e18*8/100 + (valueGBP-925_000e18)*13/100;
        else sdlt = 250_000e18*3/100 + 675_000e18*8/100 + 575_000e18*13/100 + (valueGBP-1_500_000e18)*15/100;
    } else if (isFirstTimeBuyer && valueGBP <= 625_000e18) {
        if (valueGBP <= 425_000e18) sdlt = 0;
        else sdlt = (valueGBP - 425_000e18) * 5 / 100;
    } else {
        if (valueGBP <= 250_000e18) sdlt = 0;
        else if (valueGBP <= 925_000e18) sdlt = (valueGBP - 250_000e18) * 5 / 100;
        else if (valueGBP <= 1_500_000e18) sdlt = 675_000e18*5/100 + (valueGBP-925_000e18)*10/100;
        else sdlt = 675_000e18*5/100 + 575_000e18*10/100 + (valueGBP-1_500_000e18)*12/100;
    }
    if (isForeign) sdlt += valueGBP * 2 / 100; // +2% surcharge
}
```

---

## UK Leasehold Reform

```solidity
// Leasehold Reform (Ground Rent) Act 2022: ground rent = peppercorn (£0) for new leases
// Leasehold and Freehold Reform Act 2024: extended right to extend lease, buy freehold

struct UKLease {
    bytes32 titleNumber;
    address leaseholder;
    address freeholder;
    uint256 leaseStartDate;
    uint256 leaseTermYears;
    uint256 groundRentGBP;          // Must be 0 for leases granted after 30 June 2022
    uint256 serviceChargeEstimateGBP; // Annual estimate
    bool hasRightToManage;          // Leaseholders' RTM rights (≥50% participation)
    bool hasEnfranchisementRight;   // Right to buy freehold
    uint256 yearsRemaining;
}

// Leasehold Reform Act 2022: peppercorn rent enforcement
modifier validGroundRent(uint256 leaseStartDate, uint256 groundRentGBP) {
    if (leaseStartDate >= 1656547200) { // 30 June 2022 Unix timestamp
        require(groundRentGBP == 0, "LRA2022: ground rent must be zero (peppercorn) for new leases");
    }
    _;
}
```

---

## Security & Compliance Checklist

- [ ] Title Number stored and HMLR official copy CID referenced
- [ ] Charges register updated on-chain when mortgage registered at HMLR
- [ ] UK REIT: close company check, 90% distribution, 75% income/asset tests
- [ ] MCOB: FCA-authorized lender verified; affordability assessment reference stored
- [ ] SDLT calculated correctly including surcharges (additional dwelling, foreign buyer)
- [ ] Scotland (LBTT) and Wales (LTT) handled separately from England SDLT
- [ ] Leasehold: zero ground rent enforced for leases post-30 June 2022
- [ ] AML: estate agents / conveyancers KYC'd under MLR17; UBO identified
- [ ] Building Safety Act: accountable person recorded for high-rise buildings
- [ ] OFSI sanctions checked separately from EU sanctions post-Brexit

---

## Reference Files

- `references/hmlr-digital-integration.md` — HMLR blockchain initiatives, digital mortgage deed
- `references/uk-reit-tests.md` — Full UK REIT qualification tests and calculations
- `references/sdlt-lbtt-ltt.md` — Full rate tables for all three UK land taxes
