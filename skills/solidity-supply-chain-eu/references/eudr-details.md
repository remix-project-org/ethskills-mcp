# EU Deforestation Regulation (EUDR) — Detailed Reference

## Overview
Regulation (EU) 2023/1115 — applies to companies placing 7 commodities (and derived products)
on the EU market or exporting from the EU. Aims to ensure products do not contribute to
deforestation or forest degradation after December 31, 2020.

**Deadlines**: Large operators — December 30, 2024 | SMEs — June 30, 2025

---

## Commodities & Derived Products in Scope

```solidity
// 7 forest-risk commodities:
bytes32 constant COMMODITY_CATTLE = keccak256("CATTLE");
bytes32 constant COMMODITY_COCOA = keccak256("COCOA");
bytes32 constant COMMODITY_COFFEE = keccak256("COFFEE");
bytes32 constant COMMODITY_PALM_OIL = keccak256("PALM_OIL");
bytes32 constant COMMODITY_SOY = keccak256("SOY");
bytes32 constant COMMODITY_WOOD = keccak256("WOOD");
bytes32 constant COMMODITY_RUBBER = keccak256("RUBBER");

// Key derived products (not exhaustive — see EUDR Annex I for full list):
// Cattle: beef, leather, live cattle, hides
// Cocoa: cocoa butter, powder, chocolate, preparations
// Coffee: roasted, decaffeinated, extracts
// Palm oil: crude/refined palm oil, palm kernel oil, margarine
// Soy: soy flour, pellets, meal, oil, tofu
// Wood: timber, plywood, paper, furniture, charcoal, printed books
// Rubber: tyres, gloves, condoms, erasers

mapping(bytes32 => bytes32[]) public derivedProducts; // commodity → derived product codes (CN codes)
```

---

## Risk Categorisation

```solidity
enum EUDRRiskLevel { LOW, STANDARD, HIGH }

// EU Commission will classify countries into 3 tiers:
// LOW: negligible deforestation risk (favourable treatment — simplified due diligence)
// STANDARD: most countries — full due diligence
// HIGH: significant deforestation risk — enhanced due diligence

// As of 2024: no country officially classified yet (classification expected Q1 2025)
// Until classification: all countries treated as STANDARD risk

interface IEUDRCountryClassification {
    function getRiskLevel(bytes2 country) external view returns (EUDRRiskLevel);
    function isClassified(bytes2 country) external view returns (bool);
    function getClassificationDate(bytes2 country) external view returns (uint256);
}
```

---

## Due Diligence System (DDS)

```solidity
// EUDR requires operators to maintain a "due diligence system" with 3 elements:
// 1. Information collection
// 2. Risk assessment
// 3. Risk mitigation

// ELEMENT 1: Information Collection

struct EUDRInformationSet {
    bytes32 commodityType;
    bytes32[] cnCodes;              // Combined Nomenclature product codes
    uint256 quantityKg;
    bytes2 countryOfProduction;     // ISO 3166-1 alpha-2
    string[] geolocationData;       // GPS coordinates or polygons of ALL plots
    // For cattle: location of ALL farms where cattle were kept
    uint256 productionDateStart;
    uint256 productionDateEnd;
    bool isComplexProduct;          // True if multiple commodities (e.g. chocolate)
    bytes32[] subComponentRefs;     // For complex products: references to each component's DDS
}

// GEOLOCATION REQUIREMENT:
// Must cover ALL plots where commodity was produced
// Polygons required for plots >4 hectares; single point for ≤4 hectares
// Coordinate system: WGS84 (standard GPS)

// Verification: operator must verify coordinates against satellite imagery
// showing no deforestation after Dec 31, 2020

// ELEMENT 2: Risk Assessment

struct EUDRRiskAssessment {
    bytes32 informationSetRef;
    EUDRRiskLevel countryRisk;
    bool hasIndigenousLandRisk;     // Production on indigenous peoples' land
    bool hasProtectedAreaRisk;      // Near/within protected areas
    bool hasCertificationCoverage;  // FSC, RSPO, RFA etc. certification obtained
    bytes32[] certificationRefs;
    string riskConclusion;          // LOW / STANDARD / HIGH with justification
    bytes32 satelliteVerifCID;      // Satellite imagery analysis CID
    uint256 assessmentDate;
    address assessor;
}

// ELEMENT 3: Risk Mitigation (for non-negligible risk)

struct EUDRMitigationMeasures {
    bytes32 assessmentRef;
    string[] measuresApplied;
    // Examples: third-party audits, satellite monitoring, contractual requirements,
    // supplier training, community engagement, certifications
    bytes32 mitigationReportCID;
    bool residualRiskAcceptable;    // After mitigation: is residual risk negligible?
    uint256 mitigationDate;
}
```

---

## Due Diligence Statement (DDS) — Submission to EU TRACES NT

```solidity
// Operators must submit DDS via EU TRACES NT system before placing on market
// Each DDS assigned a reference number by EU system

struct EUDRDueDiligenceStatement {
    bytes32 tracesNTRef;            // TRACES NT reference number
    address operator;               // EU operator (legal entity)
    bytes32 operatorEUID;           // EU company identifier
    EUDRInformationSet information;
    EUDRRiskAssessment riskAssessment;
    EUDRMitigationMeasures mitigation;
    bool isNegligibleRisk;          // Conclusion: negligible deforestation risk
    bytes32 declarationCID;         // Full signed declaration IPFS CID
    uint256 submissionDate;
    uint256 validityPeriod;         // DDS valid for subsequent operators in same chain
}

// For LOW-risk countries: simplified DDS (no risk assessment required)
// For STANDARD risk: full DDS
// For HIGH risk: enhanced DDS + additional supporting information

// Downstream operators: can rely on upstream DDS if product unchanged
// Must verify DDS reference and that product matches

mapping(bytes32 => EUDRDueDiligenceStatement) public ddsRegistry; // tracesNTRef → DDS
```

---

## Enforcement & Penalties

```solidity
// EUDR Art. 24: penalties must be "effective, proportionate, dissuasive"
// Member states must set: minimum fine = 4% of annual EU turnover
// Confiscation of products + revenues
// Temporary exclusion from public procurement

// Serious or repeat violations:
// - Immediate ban from placing products on EU market
// - Confiscation of all relevant revenue

uint256 constant EUDR_MIN_FINE_PCT = 400; // 4% of EU turnover (basis points)

// Market surveillance: competent authorities conduct checks
// Risk-based approach: HIGH-risk operators checked more frequently
// Minimum annual checks: 9% (HIGH risk) | 3% (STANDARD) | 1% (LOW)

uint256 constant EUDR_CHECK_RATE_HIGH = 900;     // 9%
uint256 constant EUDR_CHECK_RATE_STANDARD = 300; // 3%
uint256 constant EUDR_CHECK_RATE_LOW = 100;       // 1%
```

---

## Certification Schemes

```solidity
// EUDR does NOT require certification — but certifications can support risk assessment
// Recognised schemes (can reduce residual risk but don't replace DDS):

bytes32 constant CERT_FSC = keccak256("FSC");                     // Forest Stewardship Council
bytes32 constant CERT_PEFC = keccak256("PEFC");                   // Programme for Endorsement of Forest Certification
bytes32 constant CERT_RSPO = keccak256("RSPO");                   // Roundtable on Sustainable Palm Oil
bytes32 constant CERT_RFA = keccak256("RAINFOREST_ALLIANCE");     // Rainforest Alliance
bytes32 constant CERT_UTZ = keccak256("UTZ");                     // UTZ (now part of Rainforest Alliance)
bytes32 constant CERT_RTRS = keccak256("RTRS");                   // Round Table on Responsible Soy

struct CertificationRecord {
    bytes32 scheme;
    bytes32 certificateNumber;
    address certifiedEntity;
    uint256 certificationDate;
    uint256 expiryDate;
    bytes32 scope;                  // What is covered by certification
    bytes32 certCID;                // Certificate IPFS CID
    bool isCurrentlyValid;
}

mapping(address => CertificationRecord[]) public supplierCertifications;

// Important: even FSC-certified wood requires geolocation under EUDR
// Certification SUPPORTS but does NOT REPLACE the information requirement
```
