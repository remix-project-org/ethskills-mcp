# Hong Kong SFC & HKMA — Virtual Asset Regulatory Framework Reference

## Overview
Hong Kong operates a dual-regulator model for virtual assets:
- **SFC** (Securities and Futures Commission): security tokens + VASP licensing
- **HKMA** (Hong Kong Monetary Authority): stablecoins + banking/payment aspects

Hong Kong explicitly targets being a global virtual asset hub (Policy Statement 2022).

---

## SFC VASP Licensing (AMLO Amendment 2023)

```solidity
// Virtual Asset Service Providers must be licensed under AMLO from June 2023
// VASP licence covers: spot VA trading, VA exchanges

// SFC also regulates Security Token Offerings (STOs) under SFCO:
// Security tokens = "securities" under Securities and Futures Ordinance (SFO)
// Requires: Type 1 (dealing) + Type 7 (automated trading) SFC licence

enum SFCLicenceType {
    NONE,
    TYPE_1,     // Dealing in securities (includes security tokens)
    TYPE_4,     // Advising on securities
    TYPE_7,     // Providing automated trading services
    TYPE_9,     // Asset management
    VASP        // Virtual Asset Service Provider (AMLO, from 2023)
}

struct SFCVASPLicence {
    bytes32 licenceNumber;
    SFCLicenceType[] licenceTypes;
    bytes32 responsibleOfficer1;    // RO: approved person, must be based in HK
    bytes32 responsibleOfficer2;    // At least 2 ROs required for VASP
    bool retailAccessPermitted;     // Approved for retail (post-2023 policy change)
    uint256 licenceDate;
    uint256 licenceExpiry;          // Annual renewal
    bytes32[] approvedVirtualAssets; // SFC-approved VA list for retail access
}

interface ISFCRegistry {
    function isLicensed(address entity, SFCLicenceType licenceType) external view returns (bool);
    function isVASPApproved(address entity) external view returns (bool);
    function isVAApprovedForRetail(bytes32 assetId) external view returns (bool);
    function isProfessionalInvestor(address investor) external view returns (bool);
}

// HK professional investor threshold: portfolio ≥ HK$8M
uint256 constant HK_PI_THRESHOLD_HKD = 8_000_000e18;
```

---

## SFC Approved Virtual Assets for Retail

```solidity
// SFC circular (May 2023): VASPs can offer VA trading to retail investors
// But only for "eligible large-cap virtual assets"
// Criteria: included in ≥2 acceptable indices, liquid, not classified as security

// As of 2024: Bitcoin (BTC) and Ether (ETH) approved for retail
// Other tokens: professional investors only

mapping(bytes32 => bool) public isRetailApproved; // assetId → retail approval status
mapping(bytes32 => uint256) public retailApprovalDate;

bytes32 constant BTC = keccak256("BITCOIN");
bytes32 constant ETH = keccak256("ETHEREUM");

// Retail suitability assessment required for all VA products
struct HKRetailSuitability {
    address investor;
    uint256 assessmentDate;
    bool hasUnderstoodRisks;
    uint256 maxExposurePct;         // % of investable assets in VA (SFC recommends ≤10%)
    bool hasCooledOff;              // 1 cooling-off trade allowed to reverse
    bytes32 assessmentRef;
}

uint256 constant HK_VA_COOLING_OFF_DAYS = 1;    // 1 cooling-off trade for retail

// Platform rules for retail VA trading:
// 1. Token due diligence before listing
// 2. Real-time monitoring + circuit breakers
// 3. 98% cold storage of customer assets
// 4. Mandatory insurance or compensation arrangement

uint256 constant SFC_COLD_STORAGE_REQUIREMENT = 9800; // 98% in cold storage
```

---

## HKMA Stablecoin Licensing (Stablecoin Bill 2024)

```solidity
// HKMA Stablecoin Bill 2024 (proposed, passed 2025):
// Licence required to issue HKD-pegged or HK-marketed stablecoins
// Applies to: fiat-referenced stablecoins (not algorithmic)

struct HKMAStablecoinLicence {
    bytes32 licenceRef;
    bytes32 referenceCurrency;      // e.g. keccak256("HKD"), keccak256("USD")
    address reserveCustodian;       // HKMA-approved bank
    uint256 reserveRatio;           // Must be ≥ 100%
    uint256 redemptionWindowDays;   // Within 1 business day for retail
    bool isWholesaleOnly;           // Wholesale vs retail designation
    uint256 minCapitalHKD;          // Minimum capital requirement (TBD — expected HK$25M)
}

// HK stablecoin reserve requirements:
// - 100% backed by HKD or equivalent high-quality liquid assets (HQLA)
// - Held with HKMA-licensed bank in segregated trust account
// - Mark-to-market daily
// - Independent audit: monthly

uint256 constant HKMA_MIN_CAPITAL_HKD = 25_000_000e18; // HK$25M (expected)
uint256 constant HKMA_RESERVE_RATIO = 1e18;              // 100%

// Redemption at par: ≤1 business day for retail, ≤2 business days for wholesale
uint256 constant HKMA_RETAIL_REDEMPTION = 1 days;
uint256 constant HKMA_WHOLESALE_REDEMPTION = 2 days;
```

---

## AMLO AML/CFT Requirements for VASPs

```solidity
// Anti-Money Laundering and Counter-Terrorist Financing Ordinance (AMLO)
// Schedule 2: VASPs are "financial institutions" for AML purposes

// HK CDD Requirements (AMLO + SFC/HKMA guidelines):

struct HKCDDRecord {
    address customer;
    bytes32 hkidOrPassportHash;     // HKID for HK residents; passport for non-residents
    bytes32 nameHash;
    bool isProfessionalInvestor;
    HKRiskLevel riskLevel;
    uint256 cddDate;
    uint256 cddRenewalDue;
    bool sanctionsScreened;         // OFAC + UN + HK sanctions lists
}

enum HKRiskLevel { LOW, MEDIUM, HIGH, PROHIBITED }

// HK sanctions: HKMA / SFC maintain their own sanctions lists
// UN Security Council sanctions are legally binding in HK
// OFAC compliance: many HK firms also screen OFAC (US dollar clearing dependency)
interface IHKSanctionsOracle {
    function isUNSanctioned(address party) external view returns (bool);
    function isHKTreasurySanctioned(address party) external view returns (bool);
    function isOFACSanctioned(address party) external view returns (bool); // Optional but common
}

// HK Travel Rule (AMLO s.20AB, effective Jan 2024):
// Threshold: HK$8,000 (≈ US$1,000 / FATF equivalent)
uint256 constant HK_TRAVEL_RULE_THRESHOLD_HKD = 8_000e18;
```

---

## SFC Code of Conduct for Virtual Asset Trading Platforms

```solidity
// SFC Guidelines for VA Trading Platforms (updated June 2023):

// 1. Insurance / Compensation Fund
// Mandatory insurance: at least 50% of cold wallet holdings
// OR compensation arrangement with SFC-approved terms

// 2. Client Assets Safeguarding
// Customer VA: held in segregated cold wallets
// Cold storage: ≥ 98% of customer assets
// Hot wallet: ≤ 2%, must be insured

uint256 constant VATP_HOT_WALLET_MAX_PCT = 200; // 2% maximum in hot wallet

// 3. Market Manipulation Prevention
// Circuit breakers: 10% price movement triggers halt
// Wash trading monitoring: real-time detection required

uint256 constant HK_CIRCUIT_BREAKER_PCT = 1000; // 10% price movement

// 4. Token Due Diligence (before listing)
// Legal analysis: confirm not a security (if listing on retail platform)
// Technical audit: smart contract audit required
// Liquidity assessment: minimum market cap, trading volume thresholds

struct HKTokenDueDiligence {
    bytes32 assetId;
    bool isNotASecurity;            // Legal opinion obtained
    bytes32 legalOpinionCID;
    bool smartContractAudited;
    bytes32 auditReportCID;
    address auditFirm;
    uint256 minimumMarketCapHKD;    // Must meet SFC minimum thresholds
    uint256 minimumDailyVolumeHKD;
    bool retailApprovalSought;      // Whether retail access requested
    bool sfcApproved;
}
```
