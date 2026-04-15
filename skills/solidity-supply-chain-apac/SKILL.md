---
name: solidity-supply-chain-apac
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for supply chain, logistics, or product traceability targeting Asia-Pacific markets. Triggers
  include: Singapore food safety traceability (SFA), Japan food labeling (JAS), Australian
  food traceability (FSANZ), Korea food safety (MFDS), Hong Kong food safety, Singapore
  GST on imports, Japan pharmaceutical serialization (PMDA), Australia illegal logging
  prohibition, Modern Slavery Act Australia, Korea ESG disclosure, or any mention of
  "APAC supply chain compliance", "Singapore food traceability", "Japan JAS compliance",
  "Australian modern slavery supply chain", or "APAC pharma serialization". Always use
  this skill for APAC-jurisdiction supply chain Solidity.
---

# Solidity Supply Chain — APAC Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for supply chain and
traceability applications across Asia-Pacific markets: Singapore, Hong Kong, Japan,
South Korea, and Australia.

> ⚠️ **Multi-jurisdiction note**: APAC supply chain regulations vary significantly by country.
> Identify target jurisdiction(s) first. For US rules use `solidity-supply-chain`.
> For EU rules use `solidity-supply-chain-eu`. For UK rules use `solidity-supply-chain-uk`.

---

## Jurisdiction Overview

| Market | Key Body | Primary Frameworks |
|---|---|---|
| Singapore | SFA, ESG, HSA | SFA Food Safety, HSA (pharma), Greenmark |
| Hong Kong | FEHD, DH, Customs | Food safety regulations, pharma import/export |
| Japan | MHLW, MAFF, PMDA | JAS, HACCP, pharmaceutical track-and-trace |
| South Korea | MFDS, KEA | MFDS food/pharma safety, K-ESG disclosure |
| Australia | FSANZ, DAFF, TGA | FSANZ food standards, illegal logging, TGA (pharma) |

---

## Singapore — Food Safety (SFA)

```solidity
// Singapore Food Agency: Licence required for food importers, manufacturers
// Food Safety & Security Act (FSSA) 2023 — enhanced traceability powers

struct SGFoodTraceRecord {
    bytes32 lotCode;
    bytes32 productCode;            // SFA product registration number
    bytes32 sfaImportPermitNo;      // Required for all imported food
    bytes32 countryOfOrigin;
    address licensedImporter;       // SFA-licensed importer
    bytes32 sfaLicenceNo;           // Importer's SFA licence
    uint256 importDate;
    uint256 expiryDate;
    bytes32 healthCertificateCID;   // Exporting country health certificate
    bool hasHACCPCertification;
    FoodSafetyStatus status;
}

enum FoodSafetyStatus { CLEARED, HELD_PENDING_INSPECTION, RELEASED, REJECTED, RECALLED }

// SFA: all food businesses must maintain traceability records for 3 years
// Recall response: within 24 hours of SFA notification

interface ISFARegistry {
    function isLicensed(address entity) external view returns (bool);
    function getLicenceType(address entity) external view returns (bytes32);
    function isProductRegistered(bytes32 productCode) external view returns (bool);
}

mapping(bytes32 => SGFoodTraceRecord) public sgFoodRecords;

function importFood(bytes32 lotCode, SGFoodTraceRecord calldata record)
    external {
    require(sfaRegistry.isLicensed(msg.sender), "SFA: importer not licensed");
    require(sfaRegistry.isProductRegistered(record.productCode), "SFA: product not registered");
    require(record.sfaImportPermitNo != bytes32(0), "SFA: import permit required");
    sgFoodRecords[lotCode] = record;
    emit FoodImported(lotCode, record.productCode, record.countryOfOrigin);
}
```

---

## Japan — Food Labeling & JAS

```solidity
// JAS (Japanese Agricultural Standard) + Food Labeling Act
// HACCP mandatory since June 2021 for all food businesses
// Japan: origin labeling required for all food products

struct JapanFoodRecord {
    bytes32 lotCode;
    bytes32 jasStandardCode;        // JAS certification number (if certified)
    bytes32 countryOfOrigin;        // For processed foods: country where substantially transformed
    bytes32 primaryIngredientOrigin; // For blended foods: top ingredient's origin
    bool hasHACCPPlan;
    bytes32 haccpPlanCID;
    bool isOrganicJAS;              // JAS organic certification
    bytes32 organicCertNo;
    uint256 bestBeforeDate;
    uint256 useByDate;
    bytes32 allergenFlags;          // Bit-packed: soy, wheat, eggs, milk, peanuts, shrimp, crab + 20 more
}

// Japan 7 specified allergens (mandatory declaration):
// Eggs, milk, wheat, shrimp, crab, peanuts, buckwheat (soba)
// + 20 "recommended" allergens
uint256 constant ALLERGEN_EGGS = 1 << 0;
uint256 constant ALLERGEN_MILK = 1 << 1;
uint256 constant ALLERGEN_WHEAT = 1 << 2;
uint256 constant ALLERGEN_SHRIMP = 1 << 3;
uint256 constant ALLERGEN_CRAB = 1 << 4;
uint256 constant ALLERGEN_PEANUTS = 1 << 5;
uint256 constant ALLERGEN_BUCKWHEAT = 1 << 6;

// Japan PMDA: pharmaceutical serialization
struct JapanPharmaPack {
    bytes32 gjpCode;                // GS1 Japan product code
    bytes32 lotNumber;
    uint256 expiryDate;
    bytes32 pmdaApprovalNo;         // PMDA manufacturing/import approval number
    bytes32 yakujiLicenceNo;        // Pharmaceutical Affairs Act licence
    bool isRequiringPrescription;
    JapanPackStatus status;
}

enum JapanPackStatus { ACTIVE, DISPENSED, RECALLED, DESTROYED }
```

---

## South Korea — MFDS Food & Pharma Safety

```solidity
// Korea MFDS: Ministry of Food and Drug Safety
// HACCP mandatory for certain food categories
// K-GAHS: Korean Good Agricultural Harvesting Standards for fresh produce

struct KoreaFoodRecord {
    bytes32 lotCode;
    bytes32 mfdsProductCode;        // MFDS registration number
    bool hasHACCPCertification;
    bytes32 haccpCertNo;
    bytes32 kGAHSCertNo;            // For fresh produce
    bytes32 countryOfOrigin;
    bool isImported;
    bytes32 kfccApprovalNo;         // Korea Food & Drug Administration clearance for imports
    uint256 importDeclarationNo;    // Korea Customs clearance number
}

// Korea: mandatory origin labeling with strict rules
// "Product of Korea" only if substantially transformed in Korea
// Blended products: must list all origin countries by % if >3 countries

// Korea ESG Supply Chain Disclosure (K-ESG 2022):
struct KoreaESGSupplyChainRecord {
    bytes32 supplierId;
    uint256 disclosureYear;
    uint256 scope1EmissionsTCO2e;
    uint256 scope2EmissionsTCO2e;
    uint256 scope3EmissionsTCO2e;   // Supply chain (Scope 3 Cat 1)
    bool hasEnvironmentalViolations;
    bool hasLaborViolations;
    bytes32 kEsgReportCID;
    uint256 kEsgScore;              // 0-100
}

// Korea Pharmaceutical Serialization (GS1 based)
struct KoreaPharmaPack {
    bytes32 gtin;
    bytes32 serialNumber;
    bytes32 lotNumber;
    uint256 expiryDate;
    bytes32 mfdsApprovalNo;
    KoreaPackStatus status;
}

enum KoreaPackStatus { ACTIVE, DISPENSED, RECALLED, EXPORTED, DESTROYED }
```

---

## Australia — FSANZ, Illegal Logging & Modern Slavery

```solidity
// Australia: Food Standards Australia New Zealand (FSANZ) — shared with NZ
// Country of Origin labeling: mandatory since 2018 (COOL requirements)
// Illegal Logging Prohibition Act 2012
// Modern Slavery Act 2018 (revenue > A$100M)

struct AustralianFoodRecord {
    bytes32 lotCode;
    bytes32 fsanzProductCategory;   // FSANZ food category
    bytes2 countryOfOrigin;         // ISO 3166 — must be displayed on pack
    uint256 australianContentPct;   // % Australian ingredients (for COOL labeling)
    bool isMadeInAustralia;         // ≥ significant transformation in AUS
    bool isGrownInAustralia;        // 100% Australian grown
    bytes32 primaryProductionRegion; // State/territory (e.g. keccak256("QUEENSLAND"))
    bool hasAustralianOrganicCert;
    bytes32 organicCertNo;
}

// Illegal Logging Prohibition Act 2012
struct AustralianTimberRecord {
    bytes32 shipmentId;
    bytes32 woodSpecies;            // Scientific name hash
    bytes32 countryOfHarvest;
    bytes32 harvestRegion;
    bool hasLegalHarvestPermit;
    bytes32 permitNumber;
    bytes32 chainOfCustodyCertNo;   // FSC or PEFC certification
    bytes32 dueDiligenceReportCID;
    address importer;
    bool dueDiligenceCompleted;
}

// Australian Modern Slavery Act 2018
struct AustralianModernSlaveryStatement {
    uint256 reportingYear;
    bytes32 entityName;             // Reporting entity name hash
    uint256 consolidatedRevenue;    // Must be > A$100M to be required to report
    bytes32[] supplyChainRisks;
    bytes32[] actionsTaken;
    bytes32[] assessmentMethods;
    bytes32 statementIPFSCID;
    address responsibleMember;      // Responsible member / director who approved
    uint256 approvalDate;
}

mapping(uint256 => AustralianModernSlaveryStatement) public modernSlaveryStatements; // year → statement
```

---

## Hong Kong — Food Safety & Trade

```solidity
// Hong Kong: Food Safety Ordinance (Cap. 612)
// All food importers must register with FEHD
// Import control orders for specific high-risk foods

struct HKFoodRecord {
    bytes32 lotCode;
    bytes32 fehd_registrationNo;    // FEHD food importer registration
    bytes32 countryOfOrigin;
    bool subjectToImportControl;    // e.g. Japanese food post-Fukushima restrictions
    bytes32 importLicenceNo;        // For controlled foods
    bytes32 radiationCertCID;       // For Japan origin food (Fukushima response)
    uint256 importDate;
    FoodClearanceStatus status;
}

enum FoodClearanceStatus { PENDING, CLEARED, HELD, REJECTED }

// HK: Japan food import restrictions (ongoing since 2011 Fukushima)
// Restricted prefectures: Fukushima, Ibaraki, Tochigi, Gunma, Chiba + others
bytes32[] public restrictedJapanPrefectures;

modifier hkJapanFoodCheck(bytes32 lotCode) {
    HKFoodRecord storage r = hkFoodRecords[lotCode];
    if (r.countryOfOrigin == keccak256("JP")) {
        require(!_isRestrictedPrefecture(r), "FEHD: Japan restricted prefecture");
        require(r.radiationCertCID != bytes32(0), "FEHD: radiation certificate required for Japan origin");
    }
    _;
}
```

---

## Cross-APAC Common Patterns

```solidity
// Cold chain requirements by jurisdiction
struct APACColdChainSpec {
    bytes2 jurisdiction;
    int256 minTempCelsius;  // × 100 (e.g. 200 = 2.00°C)
    int256 maxTempCelsius;
    uint256 maxExcursionMinutes;   // Allowed excursion duration
    bool requiresContinuousLog;
    uint256 logIntervalSeconds;
}

// Halal certification — cross-APAC relevance (especially SG, MY, ID, HK)
struct HalalCertification {
    bytes32 certBodyId;             // e.g. MUIS (Singapore), JAKIM (Malaysia)
    bytes32 certNumber;
    uint256 certExpiry;
    bool isValid;
    bytes32 certCID;
}

// Country of Origin — APAC labeling rules summary:
// SG: Must display country of origin for meat, fresh produce, eggs
// JP: Mandatory for fresh food; substantial transformation rule for processed
// KR: Strict origin rules — penalty for mislabeling up to KRW 100M
// AU: Bar chart + text required (Made in/Grown in/Product of + % Australian content)
// HK: Substantial transformation rule applies
```

---

## Security & Compliance Checklist

- [ ] Identify target APAC jurisdiction(s) before writing compliance logic
- [ ] Singapore: SFA import permit number required for all food imports
- [ ] Japan: allergen bit-flags set correctly for all 7 mandatory + 20 recommended
- [ ] Japan: PMDA approval number verified for pharmaceutical packs
- [ ] Korea: MFDS registration number validated; HACCP cert stored
- [ ] Australia: COOL compliance — A$100M threshold for modern slavery reporting
- [ ] Australia: Illegal logging — chain-of-custody cert required for timber imports
- [ ] Hong Kong: Japan-origin food screened for restricted prefectures
- [ ] Cross-APAC: halal certification stored where required
- [ ] Cold chain excursion logs maintained per jurisdiction-specific tolerances

---

## Reference Files

- `references/sfa-licensing.md` — Singapore SFA licence types, import permit requirements
- `references/japan-haccp-jas.md` — Japan HACCP implementation, JAS certification standards
- `references/australia-cool.md` — Australian Country of Origin Labeling requirements
