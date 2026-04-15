# Japan HACCP & JAS Certification — Reference

## Overview
Japan made HACCP mandatory for all food businesses under the Food Sanitation Act amendment
(effective June 2021). JAS (Japanese Agricultural Standards) is a voluntary certification
system covering quality, organic, and origin standards for food and agricultural products.

---

## HACCP in Japan — Food Sanitation Act (食品衛生法)

```solidity
// HACCP mandatory from June 1, 2021 for all food businesses in Japan
// Two tiers:
// HACCP with support: small operators (< ~50 employees) — simplified approach
// HACCP-based sanitation management: larger operators — full HACCP plan

enum JapanHACCPTier {
    HACCP_WITH_SUPPORT,         // 衛生管理計画 — simplified hygiene management plan
    HACCP_BASED_MANAGEMENT      // HACCPに基づく衛生管理 — full HACCP plan
}

struct JapanHACCPPlan {
    bytes32 businessId;
    JapanHACCPTier tier;
    bytes32[] hazardTypes;          // Biological, Chemical, Physical
    bytes32[] criticalControlPoints; // CCPs identified
    bytes32[] criticalLimits;       // Limits at each CCP
    bytes32[] monitoringProcedures;
    bytes32[] correctiveActions;
    bytes32[] verificationProcedures;
    bytes32[] recordKeepingProcedures;
    bytes32 planDocumentCID;        // IPFS CID of HACCP plan
    uint256 planAdoptionDate;
    uint256 lastReviewDate;
    address responsiblePerson;      // Hygiene management personnel (衛生管理者)
}

// Minimum CCP monitoring records (HACCP based):
// Temperature logs, cleaning records, pest control records
// Must be retained for 1 year minimum

uint256 constant JAPAN_HACCP_RECORD_RETENTION = 365 days;

// Verification: HACCP plan must be verified by food sanitation supervisor (食品衛生責任者)
// Food sanitation supervisor: nationally certified, required at each establishment
```

---

## JAS System — Japanese Agricultural Standards

```solidity
// JAS Law (JAS法 — Act for Standardization of Agricultural and Forestry Products)
// Administered by MAFF (Ministry of Agriculture, Forestry and Fisheries)
// JAS mark: voluntary quality certification

enum JASStandardType {
    QUALITY_JAS,            // General quality standards for processed foods
    ORGANIC_JAS,            // Organic certification (最も厳格)
    GRADED_TIMBER_JAS,      // Structural timber grading
    PROCESSED_FORESTRY_JAS, // Plywood, engineered wood
    FAIR_TRADE_JAS,         // Added 2017 — fair trade products
    SDGS_JAS                // Added 2020 — sustainability-focused standards
}

struct JASCertification {
    bytes32 jasStandardNumber;      // JAS standard number (e.g. JAS 0001)
    JASStandardType standardType;
    bytes32 certifiedEntityId;      // Certified business (registered with accredited body)
    bytes32 accreditedCertBodyId;   // MAFF-registered accredited certification body
    bytes32 certNumber;
    uint256 certificationDate;
    uint256 expiryDate;             // Typically 1 year, annual inspection required
    bytes32 productScope;           // What products/processes are certified
    bool allowsJASMark;             // Can affix JAS mark to certified products
    bytes32 certCID;
}

// MAFF-registered accredited certification bodies include:
// Japan Organic & Natural Foods Association (JONA), Organic Cert Japan (OCJ),
// Bureau Veritas Japan, SGS Japan, etc.
```

---

## Organic JAS — 有機JAS

```solidity
// Organic JAS: most stringent JAS standard
// Mandatory: "有機" (organic) or "オーガニック" labeling requires Organic JAS certification
// Using "organic" without JAS certification = Food Labeling Act violation

struct OrganicJASRecord {
    bytes32 productId;
    bytes32 jasOrgCertNumber;       // Organic JAS certificate number
    bytes32 certBodyId;             // MAFF-accredited certifier
    uint256 certificationDate;
    uint256 expiryDate;
    bool coversCrops;               // 有機農産物
    bool coversProcessedFood;       // 有機加工食品
    bool coversLivestock;           // 有機畜産物
    bool coversFeeds;               // 有機飼料
    bytes32 certCID;

    // Organic production requirements:
    bool noProhibitedPesticides;    // No prohibited pesticides for ≥3 years (crops)
    bool noProhibitedFertilizers;   // No chemical fertilizers
    bool noGMO;                     // No GMO seeds/feed
    bool noIrradiation;             // No food irradiation
}

// Equivalency agreements: Japan has organic equivalency with EU, US, Canada, Switzerland
// Products certified organic in EU can be sold as organic in Japan (and vice versa)
// Must use Japanese-recognized EU certification body

bytes2[] public organicEquivalencyCountries = [
    "EU", // EU collective
    "US", "CA", "CH"
];
```

---

## Food Labeling Act (食品表示法) Requirements

```solidity
// Food Labeling Act (2015, amended): consolidated food labeling rules
// Applies to: all food sold in Japan (domestic + imported)

struct JapanFoodLabel {
    bytes32 productName;

    // Origin labeling (country of origin / 原料原産地)
    bytes2 countryOfOrigin;             // For imported products: single country required
    bytes2 primaryIngredientOrigin;     // For processed food: origin of top ingredient (≥50% by weight)

    // Allergen declaration (特定原材料等)
    uint256 allergenFlags;              // Bit-packed (see below)

    // Nutrition facts (栄養成分表示) — mandatory
    uint256 caloriesKcal;
    uint256 proteinG;                   // Scaled 1e1 (e.g. 52 = 5.2g)
    uint256 fatG;
    uint256 carbohydrateG;
    uint256 saltEquivalentG;            // 食塩相当量 = sodium × 2.54

    // Date marking
    uint256 bestBeforeDate;             // 賞味期限 (best-before)
    uint256 useByDate;                  // 消費期限 (use-by — for perishables)

    // Storage instructions
    bytes32 storageConditions;

    // Manufacturer/importer
    bytes32 manufacturerHash;
    bytes32 importerHash;               // For imported products
}

// Japan allergen system (特定原材料):
// 8 MANDATORY (特定原材料): shrimp, crab, wheat, buckwheat, eggs, milk, peanuts, walnuts*
// *Walnuts added as mandatory from 2023
// 20 RECOMMENDED (特定原材料に準ずるもの): salmon, mackerel, squid, etc.

uint256 constant JP_ALLERG_SHRIMP = 1 << 0;
uint256 constant JP_ALLERG_CRAB = 1 << 1;
uint256 constant JP_ALLERG_WHEAT = 1 << 2;
uint256 constant JP_ALLERG_BUCKWHEAT = 1 << 3;
uint256 constant JP_ALLERG_EGGS = 1 << 4;
uint256 constant JP_ALLERG_MILK = 1 << 5;
uint256 constant JP_ALLERG_PEANUTS = 1 << 6;
uint256 constant JP_ALLERG_WALNUTS = 1 << 7; // Mandatory from 2023
// Bits 8-27: recommended allergens (almond, cashew, salmon, mackerel, etc.)
```

---

## Food Sanitation Act — Import Inspection

```solidity
// All food imports: notification to health centre (保健所) / quarantine station (検疫所)
// High-risk foods: inspected at quarantine station before clearance
// MHLW maintains negative list + monitoring plan

struct JapanImportNotification {
    bytes32 notificationRef;        // 届出番号
    bytes32 productDescription;
    bytes32 countryOfOrigin;
    bytes32 exportingCountryExamination; // Export certificate from origin country authority
    uint256 quantityKg;
    bytes32 importerRef;            // Importer registration number
    JapanInspectionResult inspectionResult;
    bytes32 inspectionInstitutionRef;
    uint256 notificationDate;
    uint256 clearanceDate;
}

enum JapanInspectionResult { PENDING, PASSED, FAILED, REQUIRES_ADDITIONAL_TESTING }

// MHLW monitoring plan: random testing of imported foods
// Violation history: countries/establishments with violations face enhanced monitoring
// Enhancement levels: monitoring → orders examination → import suspension

enum JapanMonitoringLevel { STANDARD, ENHANCED_MONITORING, ORDERS_EXAMINATION, IMPORT_SUSPENDED }

mapping(bytes2 => mapping(bytes32 => JapanMonitoringLevel)) public importMonitoringLevel;
// country → productCategory → monitoring level
```

---

## PMDA — Pharmaceutical Serialization (Japan)

```solidity
// PMDA (Pharmaceuticals and Medical Devices Agency)
// GS1-based serialization mandatory for pharmaceuticals in Japan

struct JapanPharmaceuticalSerialization {
    bytes32 gjpCode;                // GS1 Japan Product Code (GTIN-14 equivalent)
    bytes32 serialNumber;           // Up to 20 alphanumeric
    bytes32 lotNumber;
    uint256 expiryDate;
    bytes32 yakujiApprovalNumber;   // 薬事承認番号 — PMDA approval number
    bytes32 manufacturingBusinessLicence; // 製造業許可番号
    bytes32 marketingBusinessLicence;     // 販売業許可番号
    bool isControlledSubstance;     // 向精神薬 / 麻薬 — narcotics registration required
    bytes32 narcoticsLicenceRef;    // If controlled substance
    JapanPackStatus status;
}

enum JapanPackStatus { ACTIVE, DISPENSED, RECALLED, EXPIRED, DESTROYED }

// 2D DataMatrix barcode: mandatory on all pharmaceutical products since 2021
// Contains: GTIN + serial + expiry + lot (GS1-128 or DataMatrix)

// eAMT (electronic Alert Management and Traceability): PMDA traceability system
// Manufacturers + wholesalers + pharmacies must use eAMT-compliant systems
bytes32 public eamtSystemRef;       // eAMT registration reference
```
