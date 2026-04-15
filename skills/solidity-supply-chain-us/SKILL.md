---
name: solidity-supply-chain-us
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for supply chain, logistics, provenance tracking, trade finance, or product traceability.
  Triggers include: FDA food traceability, FSMA, conflict minerals, Dodd-Frank 1502, ISO 28000,
  GS1 barcodes, serialization, chain of custody, bill of lading, letters of credit, product recall,
  customs and duty compliance, pharmaceutical track-and-trace (DSCSA), carbon footprint tracking,
  multi-party logistics, or any mention of "provenance", "traceability", "supply chain contract",
  "custody transfer", or "product authenticity" on-chain. Always use this skill for supply chain
  Solidity — do not rely on general knowledge alone.
---

# Solidity Supply Chain & Logistics Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for supply chain and logistics
applications. Your contracts enforce regulatory traceability requirements, multi-party custody
rules, and global trade compliance standards.

---

## Core Regulatory Frameworks

| Regulation | Scope | Key On-Chain Requirements |
|---|---|---|
| FDA FSMA 204 | Food traceability (USA) | Critical Tracking Events (CTEs), Key Data Elements (KDEs), lot-level records |
| DSCSA (Drug Supply Chain Security Act) | Pharma (USA) | Serialized NDC, transaction history, verification, suspect/illegitimate handling |
| Dodd-Frank §1502 | Conflict minerals (USA) | Smelter/refiner identification, country of origin, RCOI audit trail |
| EU Battery Regulation 2023/1542 | EV batteries | Carbon footprint per kWh, recycled content %, due diligence |
| ISO 28000 | Supply chain security (Global) | Security management system certification on-chain attestation |
| Incoterms 2020 | Trade terms (Global) | Risk transfer points, title transfer triggers |
| eUCP v2.0 | Electronic letters of credit | Document presentation, compliance checking |

---

## Core Data Structures

### Product / Lot Identity

```solidity
struct ProductUnit {
    bytes32 serialNumber;       // GS1 SGTIN or SSCC
    bytes32 lotNumber;
    bytes32 productCode;        // GTIN / NDC / HS code
    address currentCustodian;
    uint256 manufacturedAt;     // Unix timestamp
    uint256 expiryDate;
    CustodyStatus status;
    bytes32 originCountry;      // ISO 3166-1 alpha-2 as bytes2 padded
    bytes32[] parentUnits;      // For aggregation (pallet → case → unit)
}

enum CustodyStatus { MANUFACTURED, IN_TRANSIT, CUSTOMS_HOLD, DELIVERED, RECALLED, DESTROYED }

mapping(bytes32 => ProductUnit) public units;           // serialNumber → unit
mapping(bytes32 => CustodyEvent[]) public custodyHistory; // serialNumber → events
```

### Critical Tracking Events (FDA FSMA 204)

```solidity
// Required CTEs for FDA FSMA compliance
enum CTEType {
    GROWING,        // Harvesting (produce)
    COOLING,        // First cooling (produce)
    INITIAL_PACKING,
    SHIPPING,
    RECEIVING,
    TRANSFORMATION  // When new lot created from inputs
}

struct CriticalTrackingEvent {
    CTEType cteType;
    bytes32 lotCode;
    uint256 quantity;
    bytes32 unitOfMeasure;   // e.g. keccak256("LB"), keccak256("KG"), keccak256("CASE")
    address location;        // Farm/facility address (links to LocationRegistry)
    uint256 eventTimestamp;
    bytes32 referenceDocHash; // IPFS CID of supporting docs (BOL, CoA, etc.)
    address reportedBy;
}

// KDE: Key Data Element for each CTE
struct KeyDataElements {
    bytes32 traceabilityLotCode;
    bytes32 productDescription;     // FDA PTI description
    uint256 quantity;
    bytes32 unitOfMeasure;
    bytes32 shipFromLocation;
    bytes32 shipToLocation;
    uint256 shipDate;
    bytes32 referenceDocumentType;  // BOL, PO, etc.
    bytes32 referenceDocumentNumber;
}
```

---

## Mandatory Patterns

### 1. Chain of Custody Transfer

```solidity
event CustodyTransferred(
    bytes32 indexed serialNumber,
    address indexed from,
    address indexed to,
    uint256 timestamp,
    bytes32 documentHash  // hash of Bill of Lading or transfer document
);

function transferCustody(
    bytes32 serialNumber,
    address newCustodian,
    bytes32 documentHash,
    CTEType cteType
) external {
    ProductUnit storage unit = units[serialNumber];
    require(unit.currentCustodian == msg.sender, "SupplyChain: not custodian");
    require(newCustodian != address(0), "SupplyChain: zero address");
    require(unit.status == CustodyStatus.IN_TRANSIT ||
            unit.status == CustodyStatus.MANUFACTURED,
            "SupplyChain: invalid status for transfer");
    require(documentHash != bytes32(0), "SupplyChain: document hash required");

    address previous = unit.currentCustodian;
    unit.currentCustodian = newCustodian;

    custodyHistory[serialNumber].push(CustodyEvent({
        from: previous,
        to: newCustodian,
        timestamp: block.timestamp,
        documentHash: documentHash,
        cteType: cteType,
        location: locationRegistry.getLocation(msg.sender)
    }));

    emit CustodyTransferred(serialNumber, previous, newCustodian, block.timestamp, documentHash);
}
```

### 2. Product Recall Mechanism

```solidity
mapping(bytes32 => bool) public recalledLots;
mapping(bytes32 => string) public recallReason;

event LotRecalled(bytes32 indexed lotNumber, string reason, uint256 timestamp, address initiator);
event UnitQuarantined(bytes32 indexed serialNumber, bytes32 indexed lotNumber);

function initiateRecall(bytes32 lotNumber, string calldata reason)
    external onlyRole(RECALL_AUTHORITY_ROLE) {
    recalledLots[lotNumber] = true;
    recallReason[lotNumber] = reason;
    emit LotRecalled(lotNumber, reason, block.timestamp, msg.sender);
}

// Override transfers to enforce recall
function transferCustody(bytes32 serialNumber, ...) external {
    ProductUnit storage unit = units[serialNumber];
    require(!recalledLots[unit.lotNumber], "SupplyChain: lot under recall");
    // ... rest of transfer logic
}

function reportUnitAsQuarantined(bytes32 serialNumber) external {
    ProductUnit storage unit = units[serialNumber];
    require(unit.currentCustodian == msg.sender, "SupplyChain: not custodian");
    unit.status = CustodyStatus.RECALLED;
    emit UnitQuarantined(serialNumber, unit.lotNumber);
}
```

### 3. Conflict Minerals Compliance (Dodd-Frank §1502)

```solidity
// 3TG: Tin, Tantalum, Tungsten, Gold
bytes32 constant TIN = keccak256("TIN");
bytes32 constant TANTALUM = keccak256("TANTALUM");
bytes32 constant TUNGSTEN = keccak256("TUNGSTEN");
bytes32 constant GOLD = keccak256("GOLD");

struct MineralDeclaration {
    bytes32 mineral;
    bytes32 smelterRefinerId;   // RMAP/RMI certified smelter ID
    bytes32 countryOfOrigin;    // ISO 3166
    bool isConflictFree;        // Based on RCOI audit
    uint256 auditDate;
    bytes32 auditCertificateHash; // IPFS CID of audit report
    address declarant;
}

mapping(bytes32 => MineralDeclaration[]) public mineralDeclarations; // productCode → declarations

function declareMineralSource(
    bytes32 productCode,
    MineralDeclaration calldata declaration
) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
    require(declaration.auditCertificateHash != bytes32(0), "DoddFrank: audit cert required");
    mineralDeclarations[productCode].push(declaration);
    emit MineralDeclared(productCode, declaration.mineral, declaration.isConflictFree);
}

function isProductConflictFree(bytes32 productCode) external view returns (bool) {
    MineralDeclaration[] storage decls = mineralDeclarations[productCode];
    for (uint i = 0; i < decls.length; i++) {
        if (!decls[i].isConflictFree) return false;
    }
    return decls.length > 0; // Must have at least one declaration
}
```

### 4. Trade Finance — Letter of Credit

```solidity
enum LCStatus { ISSUED, DOCUMENTS_PRESENTED, COMPLIANT, DISCREPANT, PAID, EXPIRED }

struct LetterOfCredit {
    address applicant;      // Importer
    address beneficiary;    // Exporter
    address issuingBank;
    address confirmingBank; // Optional
    uint256 amount;
    bytes32 currency;       // e.g. keccak256("USD")
    uint256 expiryDate;
    bytes32[] requiredDocuments; // keccak256 of doc type names
    LCStatus status;
}

function presentDocuments(
    uint256 lcId,
    bytes32[] calldata documentHashes // IPFS CIDs of presented docs
) external {
    LetterOfCredit storage lc = lcs[lcId];
    require(msg.sender == lc.beneficiary, "LC: not beneficiary");
    require(block.timestamp <= lc.expiryDate, "LC: expired");
    require(lc.status == LCStatus.ISSUED, "LC: wrong status");
    require(documentHashes.length == lc.requiredDocuments.length, "LC: doc count mismatch");

    presentedDocuments[lcId] = documentHashes;
    lc.status = LCStatus.DOCUMENTS_PRESENTED;

    emit DocumentsPresented(lcId, msg.sender, block.timestamp);
}

function examineDocuments(uint256 lcId, bool compliant, string calldata discrepancies)
    external onlyRole(BANK_EXAMINER_ROLE) {
    LetterOfCredit storage lc = lcs[lcId];
    require(lc.status == LCStatus.DOCUMENTS_PRESENTED, "LC: not presented");

    lc.status = compliant ? LCStatus.COMPLIANT : LCStatus.DISCREPANT;

    if (compliant) {
        // Release payment to beneficiary
        IERC20(paymentToken).safeTransfer(lc.beneficiary, lc.amount);
        lc.status = LCStatus.PAID;
    }

    emit DocumentsExamined(lcId, compliant, discrepancies);
}
```

### 5. Temperature / Condition Monitoring (IoT Integration)

```solidity
struct ConditionReading {
    int256 temperature;     // Celsius * 100 (e.g. 2.5°C = 250)
    uint256 humidity;       // % * 100
    uint256 timestamp;
    bytes32 deviceId;       // Trusted oracle device ID
    bool excursion;
}

// Cold chain: FDA requires 2°C–8°C for vaccines
int256 constant COLD_CHAIN_MIN = 200;  // 2.00°C
int256 constant COLD_CHAIN_MAX = 800;  // 8.00°C

mapping(bytes32 => ConditionReading[]) public conditionLog; // shipmentId → readings

function recordCondition(
    bytes32 shipmentId,
    int256 temperature,
    uint256 humidity,
    bytes32 deviceId
) external onlyRole(TRUSTED_ORACLE_ROLE) {
    bool excursion = temperature < COLD_CHAIN_MIN || temperature > COLD_CHAIN_MAX;

    conditionLog[shipmentId].push(ConditionReading({
        temperature: temperature,
        humidity: humidity,
        timestamp: block.timestamp,
        deviceId: deviceId,
        excursion: excursion
    }));

    if (excursion) {
        emit ColdChainExcursion(shipmentId, temperature, block.timestamp);
        // Custodian must acknowledge and document remediation
        pendingExcursionAck[shipmentId] = true;
    }
}
```

---

## Security Checklist

- [ ] All serial numbers validated against expected format (GS1 checksum)
- [ ] Document hashes non-zero before accepting transfers
- [ ] Recall status checked in all transfer paths
- [ ] Oracle/IoT data feeds use role-based access, not arbitrary addresses
- [ ] Aggregation/disaggregation events emit full parent/child lineage
- [ ] Events are sufficient for off-chain regulatory reporting (no additional storage needed)
- [ ] IPFS CIDs stored for all regulatory documents (not URLs — they can change)
- [ ] Time-stamping uses `block.timestamp` with awareness of ±15s miner drift
- [ ] Batch operations have gas limits to prevent DoS on large lots

---

## Reference Files

- `references/fsma204.md` — Full FDA FSMA 204 CTE/KDE requirements and implementation
- `references/dscsa.md` — DSCSA pharmaceutical serialization and verification
- `references/carbon-tracking.md` — Scope 1/2/3 emissions tracking, carbon credit integration
