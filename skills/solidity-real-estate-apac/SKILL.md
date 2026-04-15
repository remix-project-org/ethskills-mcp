---
name: solidity-real-estate-apac
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for real estate, property tokenization, or mortgage lending targeting Asia-Pacific markets.
  Triggers include: Singapore property tokenization (MAS), Hong Kong real estate (HKEX, SFC),
  Japan J-REIT tokenization, South Korea property tokens (FSC), Australian property crowdfunding
  (ASIC), MAS property fund rules, ABSD (Additional Buyer Stamp Duty) tracking, foreign ownership
  restrictions in APAC, or any mention of "Singapore property token", "J-REIT on-chain", "HK real
  estate STO", "Korea real estate token", or "Australian property crowdfunding". Always use this
  skill for APAC-jurisdiction real estate Solidity — each market has unique foreign ownership
  and investment restrictions that must be strictly enforced on-chain.
---

# Solidity Real Estate — APAC Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for real estate applications
across Asia-Pacific markets: Singapore, Hong Kong, Japan, South Korea, and Australia.

> ⚠️ **Critical Legal Caveat**: In all APAC jurisdictions, legal property title transfer requires
> government land registry registration. Smart contracts manage **beneficial ownership** and
> **economic rights**. Foreign ownership restrictions in this region are strict and must be
> enforced on-chain.
>
> ⚠️ **Multi-jurisdiction note**: APAC real estate regulations are highly fragmented. Identify
> target jurisdiction(s) first. For US rules use `solidity-real-estate-us`. For EU rules use
> `solidity-real-estate-eu`. For UK rules use `solidity-real-estate-uk`.

---

## Jurisdiction Overview

| Market | Key Regulator | Key Framework | Foreign Ownership Restriction |
|---|---|---|---|
| Singapore | URA, MAS, IRAS | Residential Property Act, Property Funds Guidelines | Strict — foreigners cannot buy landed residential |
| Hong Kong | LandsD, SFC, IRD | Stamp Duty Ordinance, REIT Code | No ownership restriction, but stamp duty surcharges |
| Japan | MLIT, FSA | Building Lots and Buildings Transaction Business Act, J-REIT | Open, but agent requirement |
| South Korea | MOLIT, FSC | Real Estate Transaction Reporting Act, K-REIT | Restricted in certain zones, reporting required |
| Australia | FIRB, ASIC | Foreign Acquisitions and Takeovers Act, MIS Act | Restricted — FIRB approval required |

---

## Singapore — MAS Property Fund Guidelines & ABSD

```solidity
// Singapore: foreign ownership strictly restricted under Residential Property Act
// Foreigners cannot buy: landed residential property (houses, bungalows, terraces)
// Foreigners can buy: HDB resale (with restrictions), condominiums, commercial

enum SGPropertyType {
    HDB_FLAT,               // Public housing — Singapore citizens/PRs only
    PRIVATE_CONDOMINIUM,    // Open to foreigners
    LANDED_RESIDENTIAL,     // Singapore citizens only (generally)
    COMMERCIAL,             // Open to all
    INDUSTRIAL              // Open to all
}

enum SGBuyerType { SINGAPORE_CITIZEN, SINGAPORE_PR, FOREIGNER, ENTITY }

// ABSD (Additional Buyer Stamp Duty) — 2023 rates
struct ABSDRates {
    // Singapore Citizens
    uint256 sc_firstProperty;       // 0%
    uint256 sc_secondProperty;      // 20%
    uint256 sc_thirdAndAbove;       // 30%
    // Singapore PRs
    uint256 pr_firstProperty;       // 5%
    uint256 pr_secondProperty;      // 30%
    uint256 pr_thirdAndAbove;       // 35%
    // Foreigners
    uint256 foreigner_any;          // 60%
    // Entities
    uint256 entity_any;             // 65%
}

function calculateABSD(
    SGBuyerType buyerType,
    uint256 existingPropertyCount,
    uint256 propertyValueSGD
) public pure returns (uint256 absdSGD) {
    uint256 rateBPS;
    if (buyerType == SGBuyerType.SINGAPORE_CITIZEN) {
        if (existingPropertyCount == 0) rateBPS = 0;
        else if (existingPropertyCount == 1) rateBPS = 2000;   // 20%
        else rateBPS = 3000;                                    // 30%
    } else if (buyerType == SGBuyerType.SINGAPORE_PR) {
        if (existingPropertyCount == 0) rateBPS = 500;         // 5%
        else if (existingPropertyCount == 1) rateBPS = 3000;   // 30%
        else rateBPS = 3500;                                    // 35%
    } else if (buyerType == SGBuyerType.FOREIGNER) {
        rateBPS = 6000;                                         // 60%
    } else {
        rateBPS = 6500;                                         // 65% entities
    }
    absdSGD = propertyValueSGD * rateBPS / 10_000;
}

// MAS Property Fund Guidelines: real estate funds must be MAS-approved
// Leverage limit: 60% LTV for property funds under MAS guidelines
uint256 constant MAS_PROPERTY_FUND_MAX_LTV = 6000; // 60% in basis points

modifier sgForeignOwnershipCheck(SGPropertyType propType, SGBuyerType buyerType) {
    if (propType == SGPropertyType.HDB_FLAT) {
        require(
            buyerType == SGBuyerType.SINGAPORE_CITIZEN || buyerType == SGBuyerType.SINGAPORE_PR,
            "RPA: HDB not available to foreigners"
        );
    }
    if (propType == SGPropertyType.LANDED_RESIDENTIAL) {
        require(buyerType == SGBuyerType.SINGAPORE_CITIZEN, "RPA: landed residential for SC only");
    }
    _;
}
```

---

## Hong Kong — Stamp Duty & SFC REIT Code

```solidity
// HK: no foreign ownership restriction on property
// BUT: stamp duty surcharges apply
// SFC REIT Code: governs listed real estate investment trusts on HKEX

// HK Stamp Duty 2024:
// BSD (Buyer's Stamp Duty): 15% for non-HKPR buyers
// AVD (Ad Valorem Duty): up to 4.25% of property value (Scale 1) or 8.5% (non-residential)
// SSD (Special Stamp Duty): on resale within 24 months (10-20%)

struct HKStampDutyRecord {
    uint256 propertyValueHKD;
    bool isBuyerHKPR;               // HK Permanent Resident
    bool isCompanyBuyer;
    uint256 holdingPeriodDays;      // For SSD calculation
    uint256 avdHKD;                 // Ad Valorem Duty
    uint256 bsdHKD;                 // Buyer's Stamp Duty (if non-HKPR)
    uint256 ssdHKD;                 // Special Stamp Duty (if resale within 24 months)
    bytes32 stampDutyReceiptRef;    // IRD receipt reference
}

uint256 constant HK_BSD_RATE = 1500; // 15% for non-HKPR buyers (basis points)

function calculateHKStampDuty(
    uint256 valueHKD,
    bool isHKPR,
    uint256 holdingDays
) public pure returns (uint256 avd, uint256 bsd, uint256 ssd) {
    // AVD (Scale 2 for first-time HKPR buyer, else Scale 1)
    // Simplified Scale 2 rates:
    if (valueHKD <= 3_000_000e18) avd = valueHKD * 100 / 10_000;      // 1%
    else if (valueHKD <= 4_500_000e18) avd = valueHKD * 150 / 10_000;  // 1.5%
    else avd = valueHKD * 425 / 10_000;                                  // 4.25% Scale 1

    bsd = isHKPR ? 0 : valueHKD * HK_BSD_RATE / 10_000;

    // SSD: sold within 6 months = 20%, 6-12 months = 15%, 12-24 months = 10%
    if (holdingDays < 180) ssd = valueHKD * 2000 / 10_000;
    else if (holdingDays < 365) ssd = valueHKD * 1500 / 10_000;
    else if (holdingDays < 730) ssd = valueHKD * 1000 / 10_000;
    else ssd = 0;
}

// SFC REIT Code: HK REITs must distribute ≥90% of distributable income
uint256 constant HKRFIT_DISTRIBUTION_REQUIREMENT_BPS = 9000;
// Leverage limit: 50% of gross asset value
uint256 constant HKREIT_MAX_LEVERAGE = 5000; // 50%
```

---

## Japan — J-REIT & Real Estate Transaction Act

```solidity
// Japan J-REIT: investment corporation structure (not company)
// FSA regulated; listed on TSE (Tokyo Stock Exchange)
// Building Lots and Buildings Transaction Business Act: licensed agents required

struct JapanPropertyRecord {
    bytes32 chibanNumber;           // Japan cadastral lot number (地番)
    bytes32 householdNumber;        // Building number (家屋番号) if building
    address licensedAgent;          // Must use MLIT-licensed takken agent
    bytes32 agentLicenceNo;         // Real estate agent licence number (宅建業免許)
    uint256 transactionValueJPY;
    bytes32 registryDocCID;         // IPFS CID of 登記簿謄本 (certified registry copy)
    bool isCondominium;             // マンション — strata title
    bool hasJikenRestriction;       // Urban planning zone restriction
    JapanLandZone landZone;
}

enum JapanLandZone {
    CATEGORY_1_EXCLUSIVE_RESIDENTIAL,  // 第一種低層住居専用地域
    CATEGORY_2_EXCLUSIVE_RESIDENTIAL,
    CATEGORY_1_RESIDENTIAL,
    CATEGORY_2_RESIDENTIAL,
    QUASI_RESIDENTIAL,
    NEIGHBORHOOD_COMMERCIAL,
    COMMERCIAL,
    QUASI_INDUSTRIAL,
    INDUSTRIAL,
    EXCLUSIVE_INDUSTRIAL
}

// J-REIT: must distribute ≥90% of distributable profit to maintain pass-through taxation
uint256 constant JREIT_DISTRIBUTION_REQUIREMENT_BPS = 9000;

// Japan: foreign buyers must report to BoJ if property value >¥100M
uint256 constant BOJ_REPORTING_THRESHOLD_JPY = 100_000_000e18;

modifier japanForeignBuyerCheck(address buyer, uint256 valueJPY) {
    if (investorRegistry.isForeignBuyer(buyer) && valueJPY >= BOJ_REPORTING_THRESHOLD_JPY) {
        require(
            bojReportingRegistry.hasReported(buyer, block.timestamp / 30 days),
            "Japan: BoJ foreign investment report required"
        );
    }
    _;
}
```

---

## South Korea — Property Reporting & K-REIT

```solidity
// Korea: Real Estate Transaction Reporting Act — all transactions must be reported to MOLIT
// Foreign buyers: Foreign Investment Promotion Act — additional reporting

struct KoreaPropertyRecord {
    bytes32 pnu;                    // Property Number Unit (고유번호) — 19 digits
    bytes32 jibunAddress;           // Land lot address (지번주소)
    bytes32 doroAddress;            // Road name address (도로명주소)
    bool isRegulatedZone;           // 규제지역 — speculative area, overheated area
    bool isAdjustedZone;            // 조정대상지역 — loan restrictions apply
    uint256 transactionValueKRW;
    uint256 reportingDeadlineDays;  // Must report within 30 days
    bytes32 irtReportRef;           // MOLIT reporting reference
    bool isForeignBuyer;
    bytes32 mofReportRef;           // Ministry of Finance report for foreign buyers
}

// Korea: mortgage LTV restrictions in regulated zones
// Regulated area: LTV 50% for first home, 40% for multi-home holders
uint256 constant KOREA_REGULATED_LTV_FIRST_HOME = 5000;  // 50%
uint256 constant KOREA_REGULATED_LTV_MULTI_HOME = 4000;  // 40%

// K-REIT: must distribute ≥90% of earnings; listed on Korea Exchange (KRX)
uint256 constant KREIT_DISTRIBUTION_REQUIREMENT_BPS = 9000;

// Korea: real estate transactions in regulated zones require actual residency proof
// (anti-speculation measure for Seoul metropolitan area)
```

---

## Australia — FIRB & Property Crowdfunding

```solidity
// Australia: Foreign Acquisitions and Takeovers Act 1975
// Foreign investors must seek FIRB approval for residential property
// Temporary residents: can buy one established dwelling (must sell on departure)
// Foreign non-residents: cannot buy established dwellings (new dwellings only)

enum AUBuyerStatus {
    AUSTRALIAN_CITIZEN,
    PERMANENT_RESIDENT,
    TEMPORARY_RESIDENT,         // Can buy one established dwelling
    FOREIGN_NON_RESIDENT,       // New dwellings only
    FOREIGN_ENTITY
}

// FIRB thresholds 2024-25
uint256 constant FIRB_RESIDENTIAL_THRESHOLD_AUD = 0;        // All residential requires approval for non-PR
uint256 constant FIRB_COMMERCIAL_THRESHOLD_AUD = 330_000_000e18; // A$330M for commercial (non-sensitive)
uint256 constant FIRB_AGRICULTURAL_THRESHOLD_AUD = 65_000_000e18; // A$65M for agricultural

struct AUFIRBRecord {
    bytes32 firbApplicationRef;
    AUBuyerStatus buyerStatus;
    bool approvalGranted;
    uint256 approvalDate;
    uint256 approvalExpiry;
    bytes32[] conditions;           // Any conditions attached to approval
    bool isNewDwelling;             // Foreign non-residents: new only
}

modifier firbCheck(AUBuyerStatus buyerStatus, bool isNewDwelling, uint256 valueAUD) {
    if (buyerStatus == AUBuyerStatus.FOREIGN_NON_RESIDENT) {
        require(isNewDwelling, "FIRB: foreign non-residents can only buy new dwellings");
        require(firbRegistry.hasApproval(msg.sender), "FIRB: approval required");
    }
    if (buyerStatus == AUBuyerStatus.TEMPORARY_RESIDENT) {
        require(
            !temporaryResidentHoldings[msg.sender],
            "FIRB: temporary residents limited to one established dwelling"
        );
    }
    _;
}

// Australian property crowdfunding: managed investment scheme (MIS) if pooled
// Requires AFSL (Australian Financial Services Licence) if MIS
// ASIC RG 176: property syndicate disclosure obligations
uint256 constant AU_MIS_INVESTOR_THRESHOLD = 20; // >20 investors = must register as MIS
```

---

## Cross-APAC Common Patterns

```solidity
// Distribution requirements by jurisdiction REIT type
mapping(bytes32 => uint256) public reitDistributionRequirements;
// SG S-REIT: 90% | HK REIT: 90% | J-REIT: 90% | K-REIT: 90% | AU AREIT: 100% (trust distribution)

// Foreign ownership percentage tracking (critical in all APAC markets)
mapping(uint256 => mapping(bytes2 => uint256)) public foreignOwnershipPct; // propertyId → jurisdiction → pct
// SG: track for RPA compliance | KR: track for regulated zone rules | AU: FIRB tracking

// Withholding tax on property disposals (varies by jurisdiction)
// SG: 15% for non-residents | HK: 0% | JP: 10.21% | KR: 10-20% | AU: 12.5% FRCGW
mapping(bytes2 => uint256) public withholdingTaxBPS; // jurisdiction → rate
```

---

## Security & Compliance Checklist

- [ ] Identify target APAC jurisdiction(s) before implementing ownership/transfer logic
- [ ] Singapore: SGBuyerType enforced; ABSD calculated and verified; CSSD + HDB restrictions
- [ ] Singapore: MAS property fund guidelines — leverage ≤60% LTV
- [ ] Hong Kong: BSD (15%) applied to non-HKPR buyers; SSD on short-term resale
- [ ] Japan: MLIT-licensed agent address required; BoJ report for foreign >¥100M
- [ ] South Korea: MOLIT reporting reference stored; LTV caps in regulated zones
- [ ] Australia: FIRB approval verified for all foreign buyers; new-dwelling-only restriction enforced
- [ ] Australia: MIS registration check if >20 pooled investors
- [ ] All REITs: ≥90% distribution requirement enforced
- [ ] Withholding tax rates applied correctly per jurisdiction for non-resident sellers

---

## Reference Files

- `references/sg-property-restrictions.md` — Singapore RPA foreign ownership rules, EC eligibility, HDB rules
- `references/firb-guidance.md` — Australia FIRB application process, conditions, exemptions
- `references/jreit-structure.md` — Japan investment corporation structure, TSE listing requirements
