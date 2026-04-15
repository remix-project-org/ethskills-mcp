# Japan J-REIT Structure — Reference

## Overview
J-REITs (不動産投資信託) are investment corporations (投資法人) regulated by the
Financial Instruments and Exchange Act (FIEA). Listed on the Tokyo Stock Exchange (TSE).
Japan has ~60 listed J-REITs with combined AUM of ~¥20 trillion (2024).

---

## Legal Structure: Investment Corporation (投資法人)

```solidity
// J-REIT is an "investment corporation" (not a company)
// Managed externally by an "asset management company" (資産運用会社)
// Asset management company must be registered under FIEA as Type II FIBO + Investment Management Business

struct JREITStructure {
    bytes32 investmentCorporationId;    // Legal registration number
    bytes32 assetManagerId;             // Asset management company FIBO registration
    bytes32 custodianBankId;            // Custodian bank (信託銀行) registration
    bytes32 generalAdministratorId;     // General administrator (一般事務受託者)
    bytes32 transferAgent;              // JASDEC (Japan Securities Depository Center)
    uint256 totalAssetValueJPY;         // Total asset value (運用資産)
    uint256 navPerUnit;                 // NAV per investment unit
    uint256 totalUnitsOutstanding;
    bool isListedTSE;                   // Listed on Tokyo Stock Exchange
    bytes32 tseTicker;                  // TSE ticker code (4-digit code + JP suffix)
}
```

---

## J-REIT Taxation & Distribution

```solidity
// J-REIT tax transparency: no corporate tax if ≥90% of distributable income distributed
// "Distributable income" = rental income + capital gains - expenses - depreciation

uint256 constant JREIT_DISTRIBUTION_FLOOR_BPS = 9000; // 90% of distributable profit

// Japan: distributions are taxable as "dividend income" for investors
// WHT: 20.315% for individual investors (15% national + 5.315% local including復興特別所得税)
// WHT: 20.315% for foreign investors (may be reduced by tax treaty)

uint256 constant JREIT_WHT_INDIVIDUAL = 2032;   // 20.32% (rounded)
uint256 constant JREIT_WHT_FOREIGN_DEFAULT = 2032; // Reduced by treaty: US 10%, UK 10%

struct JREITDistribution {
    uint256 distributionPerUnit;    // Per investment unit in JPY
    uint256 paymentDate;
    uint256 recordDate;             // Shareholders entitled on this date
    uint256 grossAmount;            // Total gross amount
    uint256 whtAmount;              // Withholding tax deducted
    bytes32 taxFilerRef;            // Tax office notification reference
}
```

---

## Asset Types & Allocation

```solidity
// J-REITs typically specialize in one or two property types:

enum JREITPropertySector {
    OFFICE,             // 事務所 — Tokyo CBD, Osaka, Nagoya prime office
    RESIDENTIAL,        // 住宅 — Apartments, condominiums
    RETAIL,             // 商業施設 — Shopping centers, high-street retail
    LOGISTICS,          // 物流施設 — Warehouses, distribution centers (fastest growing)
    HOTEL,              // ホテル — Hotels and hospitality
    HEALTHCARE,         // ヘルスケア — Nursing homes, medical facilities (newer sector)
    DIVERSIFIED,        // 複合型 — Mixed across sectors
    INFRASTRUCTURE      // インフラ — Data centers, airports (newer)
}

// J-REIT concentration limits (not statutory but standard):
// Single property: typically ≤15-20% of total portfolio value
// Single tenant: typically ≤20-30% of total rental revenue

uint256 constant JREIT_TYPICAL_MAX_SINGLE_PROPERTY = 2000; // 20%
uint256 constant JREIT_TYPICAL_MAX_SINGLE_TENANT = 3000;   // 30%
```

---

## Property Acquisition Process

```solidity
// Japan: Building Lots and Buildings Transaction Business Act
// All real estate transactions must go through licensed 宅地建物取引業者 (takken agent)
// 重要事項説明書 (Important Matters Explanation): must be provided before contract

struct JapanPropertyAcquisition {
    bytes32 propertyId;
    bytes32 chibanNumber;               // 地番 (cadastral number)
    bytes32 takkenLicenceNo;            // Agent licence number (宅建業免許)
    bytes32 juusetsushoIPFSCID;         // 重要事項説明書 IPFS CID
    uint256 acquisitionPriceJPY;
    uint256 appraisalValueJPY;          // Independent appraisal required for J-REITs
    bytes32 appraisalFirmId;            // Licensed real estate appraiser (不動産鑑定士)
    bool independentAppraisalObtained;  // Mandatory for J-REIT acquisitions
    uint256 registrationTaxJPY;         // 登録免許税 (2% of appraisal value for land)
    uint256 realEstateAcqTaxJPY;        // 不動産取得税 (3-4% of appraisal value)
    bytes32 toukiRecordCID;             // 登記 (registry) records IPFS CID
}

// J-REITs must obtain independent appraisal for ALL acquisitions and disposals
modifier requiresIndependentAppraisal(bytes32 appraisalRef) {
    require(appraisalRef != bytes32(0), "JREIT: independent appraisal required");
    require(appraisalRegistry.isLicensedAppraiser(msg.sender) ||
            hasRole(ASSET_MANAGER_ROLE, msg.sender), "JREIT: unauthorized");
    _;
}
```

---

## J-REIT Borrowing & LTV

```solidity
// No statutory LTV limit for J-REITs, but:
// LTV typically maintained ≤45-55% of total asset value (market convention)
// TSE rules: investment corporations must disclose LTV quarterly

uint256 constant JREIT_TARGET_LTV_BPS = 4500;     // 45% (typical target)
uint256 constant JREIT_MAX_LTV_BPS = 6000;         // 60% (typical covenants from lenders)

// Borrowing sources: Japanese bank loans + J-REIT bonds (投資法人債)
// Short-term: commercial paper (CP), unsecured bank lines
// Long-term: term loans, J-REIT bonds (public bonds listed on TSE)

struct JREITDebtProfile {
    uint256 totalDebtJPY;
    uint256 shortTermDebtJPY;       // Due within 1 year
    uint256 longTermDebtJPY;
    uint256 averageInterestRateBPS;
    uint256 averageRemainingTermMonths;
    uint256 nextMajorRefinancingDate;
    bool hasCovenantBreachRisk;     // LTV approaching covenant limit
}
```

---

## TSE Listing Requirements for J-REIT

```solidity
// TSE J-REIT listing requirements (key items):
// - Minimum net assets: ¥1 billion
// - Minimum number of unitholders: 1,000 (at listing)
// - Minimum investment unit price: varies (often ¥50,000–¥200,000)
// - Quarterly financial disclosure required
// - Material facts disclosure (重要事実): immediate disclosure required

uint256 constant TSE_MIN_NET_ASSETS_JPY = 1_000_000_000e18; // ¥1 billion
uint256 constant TSE_MIN_UNITHOLDERS = 1_000;

// Continuous disclosure: J-REIT must disclose "material facts" immediately
// Material facts include: large acquisition/disposal, major tenant departure, natural disasters

enum JREITMaterialFact {
    LARGE_ACQUISITION,          // >15% of NAV
    LARGE_DISPOSAL,             // >15% of NAV
    MAJOR_TENANT_DEPARTURE,     // Tenant accounting for >10% of total rent
    NATURAL_DISASTER_DAMAGE,
    MAJOR_LITIGATION,
    CHANGE_OF_ASSET_MANAGER,
    MERGER_OR_ABSORPTION
}

event MaterialFactDisclosed(
    JREITMaterialFact factType,
    string description,
    uint256 disclosureTimestamp,
    bytes32 tdnetSubmissionRef     // Tokyo Stock Exchange TDnet reference
);
```

---

## Tax Treaties — Reduced WHT for Foreign Investors

```solidity
// Reduced withholding tax rates under Japan's tax treaties:
// Standard J-REIT distribution WHT: 20.315%
// USA: 10% (Japan-US Tax Treaty)
// UK: 10% (Japan-UK Tax Treaty)
// Netherlands: 10%
// Australia: 15%
// Singapore: 15% (under Japan-Singapore EPA)
// China: 10%
// South Korea: 15%

mapping(bytes2 => uint256) public treatyWHTRates; // ISO country code → reduced rate BPS

function getApplicableWHTRate(address investor) public view returns (uint256 rateBPS) {
    bytes2 country = investorRegistry.getCountryOfResidence(investor);
    uint256 treatyRate = treatyWHTRates[country];
    return treatyRate > 0 ? treatyRate : JREIT_WHT_FOREIGN_DEFAULT;
}
```
