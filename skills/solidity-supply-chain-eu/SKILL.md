---
name: solidity-supply-chain-eu
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for supply chain, logistics, or product traceability targeting the European Union. Triggers
  include: EU Deforestation Regulation, Corporate Sustainability Due Diligence Directive (CSDDD),
  EU Battery Regulation, General Product Safety Regulation, EU Ecodesign, Digital Product Passport
  (DPP), EU forced labour regulation, food traceability under EU FIC, pharmaceutical serialization
  under EU FMD, or any mention of "EU supply chain compliance", "digital product passport",
  "EU deforestation proof", or "CSDDD due diligence on-chain". Always use this skill for
  EU-jurisdiction supply chain Solidity.
---

# Solidity Supply Chain — EU Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for supply chain and
traceability applications operating under European Union law. Your contracts implement
Digital Product Passports, CSDDD due diligence, and EU product safety requirements.

> ⚠️ **Jurisdiction note**: For US supply chain rules (FDA FSMA, DSCSA) use `solidity-supply-chain-us`.

---

## Core EU Supply Chain Frameworks

| Regulation | Scope | Key On-Chain Requirements |
|---|---|---|
| EUDR (EU Deforestation Regulation) 2023/1115 | 7 commodities + derived products | Geolocation polygons, deforestation-free attestation |
| CSDDD (Corporate Sustainability Due Diligence Directive) 2024/1760 | Large companies' supply chains | Human rights + environmental due diligence audit trail |
| EU Battery Regulation 2023/1542 | EV + industrial batteries | Digital Battery Passport, carbon footprint, recycled content |
| EU FMD (Falsified Medicines Directive) 2011/62 | Pharma serialization | 2D barcode, EMVS verification, unique identifier |
| GPSR (General Product Safety Regulation) 2023/988 | Consumer products | Traceability, recall capability, economic operator chain |
| EU Ecodesign for Sustainable Products Regulation 2024/1781 | Energy-related products | Digital Product Passport |
| EU Forced Labour Regulation (proposed) | All products | Supply chain forced labour audit |
| EU FIC 1169/2011 | Food labeling | Ingredient traceability, allergen tracking |

---

## Digital Product Passport (DPP)

The cornerstone of EU supply chain compliance — required for batteries (2027), textiles, electronics, and eventually all products:

```solidity
struct DigitalProductPassport {
    bytes32 productId;              // Unique product identifier (GS1 or EU standard)
    bytes32 productCategory;        // ESPR product category
    address manufacturer;
    bytes32 manufacturerEUID;       // EU company identifier (EUID)
    uint256 manufacturedDate;
    bytes32 countryOfOrigin;        // ISO 3166-1 alpha-2
    DPPEnvironmentalData envData;
    DPPMaterialData materialData;
    DPPRepairData repairData;
    bytes32 ipfsDocumentsCID;       // Full DPP data on IPFS
    bool isActive;                  // False if recalled/destroyed
}

struct DPPEnvironmentalData {
    uint256 carbonFootprintGCO2e;   // Grams CO2 equivalent per unit
    uint256 recycledContentPct;     // % recycled material (scaled 1e4 = 100%)
    uint256 recyclabilityPct;       // End-of-life recyclability
    bytes32 epdCertificateCID;      // Environmental Product Declaration
}

struct DPPMaterialData {
    bytes32[] substancesOfConcern;  // SVHC list items present (REACH)
    bytes32[] hazardousSubstances;  // Per SCIP database
    uint256 criticalRawMaterialPct; // Critical Raw Materials % by weight
}

struct DPPRepairData {
    uint256 repairabilityScore;     // EU repairability index (1-10)
    uint256 sparePartsAvailYears;   // Years spare parts available
    bytes32 repairManualCID;        // IPFS CID of repair manual
}

mapping(bytes32 => DigitalProductPassport) public passports;

// QR code on product links to this on-chain data
function getPassport(bytes32 productId)
    external view returns (DigitalProductPassport memory) {
    return passports[productId];
}
```

---

## EU Deforestation Regulation (EUDR)

Applies to: cattle, cocoa, coffee, palm oil, soya, wood, rubber + derived products.
Deadline: December 2024 (large companies), June 2025 (SMEs).

```solidity
struct EUDRDeclaration {
    bytes32 commodityType;          // e.g. keccak256("COCOA"), keccak256("PALM_OIL")
    bytes32[][] geolocationPolygons; // GPS coordinates of production plots
    bytes32 countryOfProduction;    // ISO 3166-1
    uint256 harvestStartDate;
    uint256 harvestEndDate;
    bool deforestationFreeAttestation; // Producer attestation
    bytes32 satelliteVerificationCID;  // IPFS CID of satellite imagery proof
    bytes32 dueDiligenceStatementRef;  // EU TRACES NT reference number
    address declarant;
    uint256 declarationDate;
    EUDRRiskLevel riskLevel;
}

enum EUDRRiskLevel { LOW, STANDARD, HIGH }
// Low risk: countries with negligible deforestation risk (EU whitelist)
// Standard risk: most countries (full due diligence)
// High risk: countries with significant deforestation (enhanced due diligence)

mapping(bytes32 => EUDRDeclaration) public eudrDeclarations; // productLotId → declaration
mapping(bytes32 => bool) public eudrVerified; // productLotId → verified by competent authority

function submitEUDRDeclaration(
    bytes32 productLotId,
    EUDRDeclaration calldata declaration
) external onlyRole(OPERATOR_ROLE) {
    require(declaration.deforestationFreeAttestation, "EUDR: deforestation-free attestation required");
    require(declaration.geolocationPolygons.length > 0, "EUDR: geolocation required");
    require(declaration.satelliteVerificationCID != bytes32(0), "EUDR: satellite verification required");

    eudrDeclarations[productLotId] = declaration;
    emit EUDRDeclarationSubmitted(productLotId, declaration.commodityType, declaration.riskLevel);
}

// Competent authority verification (EU member state customs / forestry authority)
function verifyEUDRCompliance(bytes32 productLotId)
    external onlyRole(COMPETENT_AUTHORITY_ROLE) {
    eudrVerified[productLotId] = true;
    emit EUDRVerified(productLotId, msg.sender, block.timestamp);
}

// Block shipment if EUDR not verified for standard/high risk
modifier eudrCompliant(bytes32 productLotId) {
    EUDRDeclaration storage d = eudrDeclarations[productLotId];
    if (d.riskLevel != EUDRRiskLevel.LOW) {
        require(eudrVerified[productLotId], "EUDR: compliance verification required");
    }
    _;
}
```

---

## EU Battery Regulation — Digital Battery Passport

Mandatory from February 2027 for EV batteries, industrial batteries >2kWh, LMT batteries:

```solidity
struct BatteryPassport {
    bytes32 batteryModelId;
    bytes32 batteryId;              // Unique identifier per physical battery
    address manufacturer;
    uint256 manufacturedDate;
    uint256 capacityWh;
    uint256 carbonFootprintKgCO2ePerKWh;  // Must be declared from Feb 2025
    uint256 recycledCobaltPct;      // % recycled cobalt (scaled 1e4)
    uint256 recycledLithiumPct;
    uint256 recycledNickelPct;
    uint256 recycledLeadPct;
    bytes32 supplyChainDueDiligenceCID; // OECD guidelines compliance
    BatteryState currentState;
    uint256 stateOfHealth;          // % of original capacity (scaled 1e4)
    address currentOwner;
}

enum BatteryState { NEW, IN_USE, SECOND_LIFE, END_OF_LIFE, RECYCLED }

// Battery Regulation Art. 77: responsible sourcing of critical raw materials
// Cobalt, lithium, nickel, natural graphite — OECD due diligence required
struct CriticalMaterialDueDiligence {
    bytes32 material;               // e.g. keccak256("COBALT")
    bytes32 mineId;                 // Mine identifier
    bytes32 countryOfOrigin;
    bool isConflictFree;
    bytes32 auditCertificateCID;    // Third-party audit certificate
    address auditor;
    uint256 auditDate;
    uint256 auditExpiry;
}
```

---

## EU FMD — Pharmaceutical Serialization

```solidity
// EU FMD: unique identifier on each medicine pack
// Verification against EMVS (European Medicines Verification System)

struct EUFMDpack {
    bytes32 productCode;        // GTIN-14
    bytes32 serialNumber;       // Up to 20 alphanumeric characters
    bytes32 batchNumber;
    uint256 expiryDate;
    bytes32 nationalMedicineCode; // Country-specific reimbursement code
    FMDPackStatus status;
}

enum FMDPackStatus { ACTIVE, DISPENSED, WITHDRAWN, RECALLED, EXPORTED, DESTROYED }

// On-chain mirror of EMVS verification events
event PackVerified(bytes32 indexed serialNumber, address verifier, uint256 timestamp);
event PackDispensed(bytes32 indexed serialNumber, bytes32 pharmacyId, uint256 timestamp);
event PackWithdrawn(bytes32 indexed serialNumber, string reason);

function dispensepack(bytes32 serialNumber, bytes32 pharmacyId)
    external onlyRole(DISPENSER_ROLE) {
    EUFMDpack storage pack = packs[serialNumber];
    require(pack.status == FMDPackStatus.ACTIVE, "FMD: pack not active");
    require(block.timestamp < pack.expiryDate, "FMD: pack expired");

    pack.status = FMDPackStatus.DISPENSED;
    emit PackDispensed(serialNumber, pharmacyId, block.timestamp);
}
```

---

## CSDDD — Human Rights & Environmental Due Diligence

```solidity
// CSDDD applies to: EU companies >1000 employees + >€450M turnover
// + non-EU companies with >€450M EU net turnover
// Requires identification, prevention, mitigation of adverse human rights + environmental impacts

struct CSDDDAudit {
    bytes32 supplierId;
    bytes32 supplierName;           // Hashed
    bytes32 countryOfOperation;
    uint256 auditDate;
    uint256 nextAuditDue;
    bool humanRightsCompliant;
    bool environmentallyCompliant;
    bytes32[] identifiedRisks;      // e.g. keccak256("CHILD_LABOUR"), keccak256("FORCED_LABOUR")
    bytes32[] mitigationMeasures;
    bytes32 auditReportCID;
    address auditor;
    CSDDDRiskLevel riskLevel;
}

enum CSDDDRiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

mapping(bytes32 => CSDDDAudit) public supplierAudits;
mapping(bytes32 => bool) public supplierApproved;

// Block procurement from non-audited or non-compliant suppliers
modifier csdddCompliant(bytes32 supplierId) {
    CSDDDAudit storage audit = supplierAudits[supplierId];
    require(audit.auditDate > 0, "CSDDD: supplier not audited");
    require(block.timestamp < audit.nextAuditDue, "CSDDD: audit expired");
    require(audit.humanRightsCompliant, "CSDDD: human rights violation identified");
    require(audit.riskLevel != CSDDDRiskLevel.CRITICAL, "CSDDD: critical risk supplier blocked");
    _;
}
```

---

## Security & Compliance Checklist

- [ ] DPP data structure includes all mandatory ESPR data fields
- [ ] EUDR geolocation polygons stored/referenced for applicable commodities
- [ ] EUDR: risk level determined before allowing customs clearance
- [ ] Battery passport: recycled content % declared for all 4 critical materials
- [ ] FMD: pack status transitions are irreversible (DISPENSED cannot go back to ACTIVE)
- [ ] CSDDD: supplier audit expiry checked on every procurement event
- [ ] REACH SVHC substances declared in DPP material data
- [ ] Recall capability: all products traceable to economic operator chain
- [ ] GPSR: economic operator (importer/distributor) addresses stored for recall notices

---

## Reference Files

- `references/eudr-details.md` — EUDR commodity list, risk categorization, due diligence steps
- `references/battery-passport.md` — Full EU Battery Regulation Annex data requirements
- `references/csddd-risk-framework.md` — CSDDD risk identification and remediation patterns
