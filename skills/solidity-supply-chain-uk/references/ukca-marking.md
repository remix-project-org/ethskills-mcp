# UKCA Marking — UK Conformity Assessment Requirements Reference

## Overview
UKCA (UK Conformity Assessed) marking replaced CE marking for products placed on the
Great Britain market (England, Scotland, Wales) after January 1, 2021.
Northern Ireland continues to use CE marking under the Windsor Framework.

**Key deadline**: From January 1, 2025, UKCA marking is fully mandatory for GB market
(CE marking no longer accepted in most categories for GB).

---

## UKCA vs CE vs UKNI

```solidity
enum ConformityMark {
    UKCA,   // Great Britain (England, Scotland, Wales) — mandatory from 2025
    CE,     // EU + Northern Ireland (UKNI) — not accepted in GB for most products from 2025
    UKNI,   // Northern Ireland only — products from EU/using EU conformity
    BOTH    // Some products: UKCA for GB + CE for EU/NI
}

// UKCA scope: same product categories as CE marking (from EU directives, now UK retained law)
// Key UK regulations replacing EU directives:

bytes32 constant REG_MACHINERY = keccak256("UK_SUPPLY_MACHINERY_REGS_2008");
bytes32 constant REG_ELECTRICAL = keccak256("UK_ELECTRICAL_EQUIPMENT_REGS_2016");
bytes32 constant REG_EMC = keccak256("UK_EMC_REGS_2016");
bytes32 constant REG_PPE = keccak256("UK_PPE_REGS_2002");
bytes32 constant REG_PRESSURE = keccak256("UK_PRESSURE_EQUIPMENT_REGS_2016");
bytes32 constant REG_MEDICAL_DEVICES = keccak256("UK_MDR_2002"); // MHRA regulated
bytes32 constant REG_CONSTRUCTION = keccak256("UK_CONSTRUCTION_PRODUCTS_REGS_2013");
bytes32 constant REG_TOYS = keccak256("UK_TOYS_SAFETY_REGS_2011");
bytes32 constant REG_RADIO = keccak256("UK_RADIO_EQUIPMENT_REGS_2017");
```

---

## UKCA Declaration of Conformity (DoC)

```solidity
struct UKCADeclarationOfConformity {
    bytes32 productName;
    bytes32 productModelRef;
    bytes32 manufacturerName;           // Hashed
    bytes32 manufacturerAddressHash;
    bytes32 ukResponsiblePersonName;    // Required for non-UK manufacturers
    bytes32 ukResponsiblePersonAddress;

    // Regulatory basis
    bytes32[] ukRegulationsApplied;     // List of UK regulations the product complies with
    bytes32[] ukStandardsApplied;       // UK-adopted technical standards (BS EN etc.)

    // Conformity assessment
    ConformityAssessmentRoute assessmentRoute;
    bytes32 ukApprovedBodyId;           // If third-party assessment required
    bytes32 ukApprovedBodyCertNo;       // Certificate number from UKAS-accredited body
    uint256 certificationDate;
    uint256 certificationExpiry;

    // Declaration
    address signedBy;                   // Authorised signatory
    uint256 declarationDate;
    bytes32 docIPFSCID;                 // Full DoC IPFS CID

    ConformityMark mark;                // UKCA for GB; CE for EU
}

enum ConformityAssessmentRoute {
    SELF_DECLARATION,           // Module A: manufacturer self-certifies (low-risk products)
    UK_APPROVED_BODY,           // Module B+C, D, E, F, G, H: third-party required (high-risk)
    TYPE_EXAMINATION,           // Module B: type-examination by approved body
    FULL_QUALITY_ASSURANCE      // Module H: full QA system approval
}
```

---

## UK Approved Bodies (UABs)

```solidity
// UK Approved Bodies replaced EU Notified Bodies for UKCA marking
// Appointed by UK government departments (OPSS, HSE, MHRA, etc.)
// Must be accredited by UKAS (UK Accreditation Service)

struct UKApprovedBody {
    bytes32 uabId;                      // UAB identification number
    bytes32 uabName;
    bytes32 ukasAccreditationRef;
    bytes32[] authorisedProductCategories; // Which product types they can certify
    bytes32[] authorisedRegulations;
    uint256 appointmentDate;
    uint256 appointmentExpiry;
    bool isActive;
}

interface IUKApprovedBodyRegistry {
    function isApprovedBody(address body, bytes32 regulation) external view returns (bool);
    function getUABId(address body) external view returns (bytes32);
    function isUKASAccredited(address body) external view returns (bool);
}

// Database of UK approved bodies: OPSS Product Safety Database
// Key UKAS-accredited UABs: BSI, SIRA, TÜV SÜD (UK), Intertek (UK), SGS (UK)
```

---

## UK Technical Standards

```solidity
// UKCA uses UK-adopted versions of international/European standards:
// BS EN standards: British Standards (BS) adopting European Norms (EN)
// BS: purely British standards (some legacy)

// Product record must identify which standards were applied:

struct UKTechnicalStandardCompliance {
    bytes32 productId;
    bytes32[] standardsApplied;         // e.g. keccak256("BS_EN_ISO_9001_2015")
    bool usedHarmonisedStandards;       // Harmonised = presumption of conformity
    bytes32[] testReportCIDs;           // Test laboratory reports
    address testLaboratory;
    bool testLabUKASAccredited;
    uint256 lastTestDate;
    uint256 standardsVersionDate;       // Date of standards versions used
}

// Post-Brexit divergence: UK standards may diverge from EN standards over time
// Companies selling to both GB and EU may need dual compliance
bool public hasDivergingUKandEURequirements;
bytes32 public ukDivergenceNotesCID;    // Notes on where UK and EU requirements differ
```

---

## Northern Ireland — Windsor Framework

```solidity
// Northern Ireland: complex dual-market access under Windsor Framework
// NI goods: can use CE marking (for EU market access)
// NI goods: UKNI mark for goods remaining in NI (not for EU market)
// NI has direct access to EU single market for goods

// "Green lane" / "red lane" for goods crossing from GB to NI:
// Green lane: goods for NI market only — reduced checks
// Red lane: goods at risk of entering EU single market — full EU checks

enum NIGoodsDestination {
    NI_ONLY,            // Green lane — staying in NI
    EU_AT_RISK,         // Red lane — may enter EU single market
    REPUBLIC_OF_IRELAND // Full customs procedures apply
}

struct NorthernIrelandTraceRecord {
    bytes32 shipmentId;
    NIGoodsDestination destination;
    bool usedGreenLane;
    bytes32 ukIMSTRef;              // UK Internal Market Scheme trusted trader ref
    ConformityMark markApplied;     // CE or UKNI
}

// UK Internal Market Scheme (UKIMS): trusted trader scheme for GB→NI green lane
// Businesses must register with HMRC to use green lane
bool public isUKIMSRegistered;
bytes32 public ukimsRegistrationRef;
```

---

## Product Safety Database & Economic Operator Chain

```solidity
// UK General Product Safety Regulations (GPSR) + Product Safety & Metrology Bill
// Economic operator chain must be traceable for product recalls

struct EconomicOperatorChain {
    bytes32 productId;
    address manufacturer;           // Entity that places product on market
    bytes32 manufacturerCountry;
    address ukResponsiblePerson;    // Required if manufacturer outside GB
    address importer;               // If product manufactured outside GB
    address distributor;
    bool hasUKEstablishment;        // Whether manufacturer has UK establishment

    // Recall capability
    uint256 unitsPlacedOnMarket;
    uint256 unitsInDistribution;
    bytes32 recallProcedureCID;     // IPFS CID of recall procedure
}

// UK Responsible Person (RP): required from Jan 2025 for non-GB manufacturers
// RP: must be established in GB, holds DoC and technical file
// RP bears legal responsibility for product compliance

uint256 constant UK_RP_MANDATE_DATE = 1735689600; // Jan 1, 2025 Unix timestamp

modifier requiresUKResponsiblePerson(address manufacturer, bytes2 manufacturerCountry) {
    if (manufacturerCountry != bytes2("GB") && block.timestamp >= UK_RP_MANDATE_DATE) {
        require(
            ukResponsiblePersonRegistry.isRegistered(manufacturer),
            "UKCA: UK Responsible Person required for non-GB manufacturers"
        );
    }
    _;
}
```
