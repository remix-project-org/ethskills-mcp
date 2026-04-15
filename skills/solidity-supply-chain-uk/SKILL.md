---
name: solidity-supply-chain-uk
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for supply chain, logistics, or product traceability targeting the United Kingdom post-Brexit.
  Triggers include: UK Modern Slavery Act, UK CBAM, UK Plastic Packaging Tax, MHRA serialization
  (UK FMD equivalent), UK Conformity Assessment (UKCA), UK critical minerals strategy, UK
  Deforestation Due Diligence (Schedule 17 Environment Act), UK Sanctions (OFSI), or any mention
  of "UK supply chain compliance", "UK modern slavery on-chain", "UKCA marking", or "UK due
  diligence". Always use this skill for UK-jurisdiction supply chain Solidity — UK rules diverged
  from EU post-Brexit and have unique requirements.
---

# Solidity Supply Chain — UK Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for supply chain and
traceability applications operating under United Kingdom law post-Brexit.

> ⚠️ **Jurisdiction note**: UK supply chain law diverged from EU post-Brexit. Some EU rules
> (EUDR, CSDDD) do not apply in the UK. The UK has its own distinct frameworks below.
> For EU rules use `solidity-supply-chain-eu`. For US rules use `solidity-supply-chain-us`.

---

## Core UK Supply Chain Frameworks

| Regulation | Scope | Key On-Chain Requirements |
|---|---|---|
| Modern Slavery Act 2015 (s.54) | Revenue >£36M | Annual statement, supply chain due diligence |
| Environment Act 2021 (Sch.17) | Forest risk commodities | Due diligence, risk assessment, mitigation |
| UK Plastic Packaging Tax (PPT) | Plastic packaging <30% recycled | Weight, recycled content tracking |
| MHRA Falsified Medicines | Pharma (UK-specific post-Brexit) | UK-specific serial numbers, MHRA verification |
| UK CBAM (Carbon Border Adjustment) | Embedded carbon in imports | Carbon content declaration |
| UK Sanctions (OFSI) | All supply chains | Sanctions screening |
| Product Safety and Metrology Bill | Consumer products | UKCA conformity, economic operator chain |
| UK Critical Minerals Strategy | Battery supply chains | Provenance of lithium, cobalt, nickel |

---

## Modern Slavery Act — Supply Chain Transparency

```solidity
// MSA s.54: Commercial organizations with £36M+ turnover must publish annual statement
// On-chain: record due diligence actions, supplier attestations

struct ModernSlaveryAudit {
    bytes32 supplierId;
    bytes32 supplierName;           // Hashed — full name stored off-chain
    bytes32 countryOfOperation;
    uint256 auditDate;
    ModernSlaveryRisk riskLevel;
    bool forcedLabourFound;
    bool childLabourFound;
    bytes32[] remediationActions;
    bytes32 auditReportCID;         // IPFS CID
    address auditor;
    bool supplierSelfAttestationSigned;
    bytes32 selfAttestationHash;    // Hash of supplier-signed attestation
}

enum ModernSlaveryRisk { LOW, MEDIUM, HIGH, CRITICAL }

// High-risk sectors per Home Office guidance:
// agriculture, construction, hospitality, manufacturing, care sector
bytes32[] public highRiskSectors;

mapping(bytes32 => ModernSlaveryAudit) public supplierAudits;
mapping(uint256 => bytes32) public annualStatements; // year → IPFS CID of published statement

event AnnualStatementPublished(uint256 year, bytes32 ipfsCID, address signedBy);
event SupplierRiskEscalated(bytes32 supplierId, ModernSlaveryRisk newRisk, uint256 timestamp);

function publishAnnualStatement(uint256 year, bytes32 statementCID)
    external onlyRole(BOARD_DIRECTOR_ROLE) { // Must be signed by board director
    require(statementCID != bytes32(0), "MSA: statement CID required");
    annualStatements[year] = statementCID;
    emit AnnualStatementPublished(year, statementCID, msg.sender);
}

modifier modernSlaveryCompliant(bytes32 supplierId) {
    ModernSlaveryAudit storage audit = supplierAudits[supplierId];
    require(audit.auditDate > 0, "MSA: supplier not audited");
    require(!audit.forcedLabourFound || _remediationComplete(supplierId),
            "MSA: forced labour found — remediation required before procurement");
    _;
}
```

---

## Environment Act — Forest Risk Commodities

UK Schedule 17: Applies to: palm oil, soya, cocoa, cattle (beef/leather), coffee, maize, rubber, cocoa.
Regulated persons who use these commodities commercially must conduct due diligence.

```solidity
struct UKForestDueDiligence {
    bytes32 commodityType;
    bytes32 countryOfProduction;
    bytes32[] geolocationData;          // Plot coordinates or polygon reference
    bool producedOnLegallyOccupied;     // Land legally occupied per local law
    bool localLawsComplied;
    bytes32 legalComplianceEvidenceCID; // Documentary evidence
    bytes32 riskAssessmentCID;          // Written risk assessment
    bytes32[] mitigationMeasures;
    uint256 submissionDate;
    address submittedBy;
}

// Unlike EU EUDR, UK focuses on LEGALITY (local laws) not DEFORESTATION per se
// Must comply with local land use laws, customary rights etc.
mapping(bytes32 => UKForestDueDiligence) public forestDueDiligence;

// UK: due diligence must be maintained as records (available to enforcement authority)
function submitForestDueDiligence(
    bytes32 commodityLotId,
    UKForestDueDiligence calldata dd
) external onlyRole(COMPLIANCE_ROLE) {
    require(dd.producedOnLegallyOccupied, "EnvAct: legal land occupation required");
    require(dd.legalComplianceEvidenceCID != bytes32(0), "EnvAct: legal evidence required");
    forestDueDiligence[commodityLotId] = dd;
    emit ForestDueDiligenceSubmitted(commodityLotId, dd.commodityType, dd.countryOfProduction);
}
```

---

## UK Plastic Packaging Tax

```solidity
// PPT: £210.82/tonne (2024/25) on plastic packaging with <30% recycled content
// Liability: UK manufacturer or importer of >10 tonnes/year

struct PlasticPackagingRecord {
    bytes32 packagingId;
    uint256 totalWeightKg;          // Gross weight of plastic component
    uint256 recycledContentKg;      // Weight of recycled plastic
    uint256 recycledContentPct;     // = recycledContentKg * 10000 / totalWeightKg (basis points)
    bool pptExempt;                 // ≥30% recycled = exempt
    bool isExported;                // Exported within 12 months = credit
    bytes32 evidenceCID;            // Recycled content verification evidence
    address supplier;
    uint256 periodStart;            // Quarter start
    uint256 periodEnd;              // Quarter end
}

uint256 constant PPT_RECYCLED_THRESHOLD = 3000; // 30.00% in basis points
uint256 constant PPT_RATE_PER_TONNE = 210_82e16; // £210.82 per tonne (2024/25)

mapping(bytes32 => PlasticPackagingRecord) public packagingRecords;

function calculatePPTLiability(bytes32[] calldata packagingIds)
    external view returns (uint256 liabilityGBP) {
    for (uint i = 0; i < packagingIds.length; i++) {
        PlasticPackagingRecord storage r = packagingRecords[packagingIds[i]];
        if (!r.pptExempt && !r.isExported &&
            r.recycledContentPct < PPT_RECYCLED_THRESHOLD) {
            uint256 taxableTonnes = r.totalWeightKg / 1000;
            liabilityGBP += taxableTonnes * PPT_RATE_PER_TONNE / 1e18;
        }
    }
}
```

---

## MHRA — UK Pharmaceutical Serialization (Post-Brexit)

```solidity
// UK left the EU FMD system (EMVS) post-Brexit
// MHRA operates UK-specific system (NMVS — National Medicines Verification System)
// Distinct serial number format from EU

struct UKMHRApack {
    bytes32 ukProductCode;          // UK-specific GTIN (may differ from EU GTIN)
    bytes32 serialNumber;           // MHRA-format serial number
    bytes32 batchNumber;
    uint256 expiryDate;
    bytes32 ukMedicinesLicenceNum;  // UK MA/PL number (not EU MA)
    MHRAPackStatus status;
}

enum MHRAPackStatus { ACTIVE, DISPENSED, RECALLED, DESTROYED }

// Northern Ireland Protocol: NI continues to use EU FMD system (EMVS)
// Great Britain: uses UK NMVS
// Must track which system applies based on final destination
mapping(bytes32 => bool) public isNorthernIrelandDestination;
```

---

## OFSI Sanctions Screening

```solidity
// OFSI (Office of Financial Sanctions Implementation) — distinct from EU/OFAC
// UK has own sanctions regimes post-Brexit (Russia, Belarus, Myanmar, etc.)

interface IOFSIOracle {
    function isSanctioned(address party) external view returns (bool);
    function isDesignated(bytes32 entityNameHash) external view returns (bool);
    function getSanctionRegime(address party) external view returns (bytes32[] memory); // e.g. ["RUSSIA", "BELARUS"]
}

modifier ofsiCheck(address counterparty) {
    require(!ofsiOracle.isSanctioned(counterparty), "OFSI: sanctioned entity");
    _;
}

// UK: £1M penalty or 50% of breach value for OFSI violations (whichever higher)
// Criminal liability for senior management if breach with knowledge
event OFSISanctionHit(address indexed party, bytes32[] regimes, uint256 timestamp);
```

---

## UK CBAM (Carbon Border Adjustment Mechanism)

```solidity
// UK CBAM: announced for steel, aluminium, ceramics, cement, glass, hydrogen, fertilisers
// Expected from 2027 — importers must declare embedded carbon

struct UKCBAMDeclaration {
    bytes32 commodityCode;          // UK Trade Tariff commodity code
    bytes32 countryOfOrigin;
    uint256 embeddedCarbonTonneCO2e; // Embedded carbon in tCO2e
    uint256 carbonPricePaidOrigin;   // Carbon price already paid in origin country
    bytes32 thirdPartyVerifierCID;   // Independent verification of carbon content
    uint256 importDate;
    address importer;
}

mapping(bytes32 => UKCBAMDeclaration) public cbamDeclarations; // shipmentId → declaration
```

---

## Security & Compliance Checklist

- [ ] Modern Slavery annual statement published on-chain with board director signature
- [ ] Supplier audits cover high-risk sectors (agriculture, construction, manufacturing)
- [ ] Forest risk commodity due diligence focuses on LOCAL LEGALITY (not just deforestation)
- [ ] Plastic packaging recycled content verified by accredited third party
- [ ] MHRA serialization uses UK-specific (not EU) product codes
- [ ] NI vs GB distinction tracked for pharmaceutical pack verification system
- [ ] OFSI sanctions checked separately from EU/OFAC sanctions
- [ ] CBAM carbon content from verified third-party sources only

---

## Reference Files

- `references/msa-guidance.md` — Home Office guidance on MSA due diligence steps
- `references/ukca-marking.md` — UK Conformity Assessment marking requirements
