# DSCSA — Drug Supply Chain Security Act Reference

## Overview
DSCSA (enacted 2013, fully effective November 2023) requires end-to-end electronic
traceability of prescription drugs in the US supply chain. Administered by FDA.
Key milestone: November 27, 2023 — interoperable electronic tracing mandatory.

---

## Key Requirements

| Requirement | Deadline | Scope |
|---|---|---|
| Unique product identifier (serialization) | 2017–2019 (phased) | Manufacturers |
| Electronic tracing (T3 data) | Nov 2023 | All trading partners |
| Interoperable EPCIS | Nov 2023 | All trading partners |
| Enhanced drug distribution security (EDDS) | Nov 2023 | Full system |
| Verification system (DSVP) | Nov 2023 | Manufacturers, wholesalers |

---

## Unique Product Identifier (UPI)

```solidity
// Every prescription drug package must bear a UPI with 4 elements:
// 1. NDC (National Drug Code) — 10 or 11 digits
// 2. Serial number — up to 20 alphanumeric characters
// 3. Lot number
// 4. Expiration date (YYYYMMDD)

// Encoded as GS1 DataMatrix 2D barcode
// On-chain: store as structured record

struct DSCSAProductIdentifier {
    bytes32 ndc;                    // National Drug Code (hashed for efficiency)
    bytes32 serialNumber;           // Up to 20 alphanumeric chars
    bytes32 lotNumber;
    uint256 expirationDate;         // Unix timestamp of expiry
    bytes32 gs1Gtin;                // GTIN-14 derived from NDC
    bytes32 packageType;            // e.g. keccak256("BOTTLE"), keccak256("BLISTER")
}

// NDC format: 5-4-2 or 5-3-2 or 4-4-2 (labeler-product-package)
// GTIN-14: 00 + 10-digit NDC + check digit
```

---

## Transaction Information (TI), Transaction History (TH), Transaction Statement (TS)

```solidity
// Every sale/transfer must be accompanied by T3 data:
// TI: what was transferred (product, lot, quantity, dates)
// TH: complete history of prior transactions
// TS: statement that product is approved, not counterfeit/stolen/recalled

struct DSCSATransactionData {
    // Transaction Information (TI)
    DSCSAProductIdentifier product;
    uint256 quantity;
    bytes32 unitOfSale;             // e.g. keccak256("BOTTLE"), keccak256("CASE")
    uint256 transactionDate;
    bytes32 purchaseOrderRef;

    // Transaction History (TH) — chain of all prior owners
    bytes32[] priorOwnershipChain; // Array of prior custodian hashes

    // Transaction Statement (TS) — attestations
    bool isApprovedProduct;         // FDA-approved
    bool isNotCounterfeit;
    bool isNotStolenOrDiverted;
    bool isNotKnownUnacceptable;
    bool isFromAuthorizedTradePartner;

    // Parties
    address transferor;             // Seller/shipper
    address transferee;             // Buyer/receiver
    bytes32 transferorDEANumber;    // DEA registration if controlled substance
    bytes32 transfereeStatePharmLicence; // State pharmacy licence

    // Record keeping
    bytes32 ipfsDocumentCID;        // IPFS CID of full T3 documentation
}

// DSCSA: T3 records must be retained for 6 years
uint256 constant DSCSA_RETENTION_PERIOD = 6 * 365 days;

mapping(bytes32 => DSCSATransactionData) public transactionRecords; // serialNumber → latest T3

event DSCSATransfer(
    bytes32 indexed serialNumber,
    address indexed from,
    address indexed to,
    uint256 timestamp,
    bytes32 transactionRef
);

function transferDrug(
    bytes32 serialNumber,
    address transferee,
    DSCSATransactionData calldata txData
) external {
    require(txData.isApprovedProduct, "DSCSA: product not attested as FDA-approved");
    require(txData.isNotCounterfeit, "DSCSA: counterfeit attestation missing");
    require(txData.isFromAuthorizedTradePartner, "DSCSA: authorized trading partner required");
    require(txData.ipfsDocumentCID != bytes32(0), "DSCSA: T3 documentation required");

    transactionRecords[serialNumber] = txData;
    emit DSCSATransfer(serialNumber, msg.sender, transferee, block.timestamp, serialNumber);
}
```

---

## Authorized Trading Partners (ATP)

```solidity
// DSCSA: only "authorized trading partners" may engage in drug distribution
// ATPs: licensed manufacturers, wholesalers, dispensers (pharmacies), 3PLs

enum DSCSALicenceType { MANUFACTURER, WHOLESALE_DISTRIBUTOR, DISPENSER, THIRD_PARTY_LOGISTICS }

struct DSCSAAuthorizedPartner {
    address entity;
    DSCSALicenceType licenceType;
    bytes32 stateLicenceNumber;
    bytes32 deaRegistrationNumber;  // If applicable
    bytes32 ndcLabelerCode;         // For manufacturers
    uint256 licenceExpiry;
    bool fdaRegistered;             // Manufacturers: FDA drug establishment registration
}

mapping(address => DSCSAAuthorizedPartner) public authorizedPartners;

modifier onlyAuthorizedTradingPartner() {
    require(
        authorizedPartners[msg.sender].licenceExpiry > block.timestamp,
        "DSCSA: not an authorized trading partner or licence expired"
    );
    _;
}
```

---

## Verification System (DSVP — Drug Supply Chain Verification Program)

```solidity
// Manufacturers and wholesale distributors must respond to verification requests
// within 24 hours (manufacturers) or 1 business day (wholesalers)
// Suspect and illegitimate product: must quarantine + notify FDA + trading partners

enum DSCSAProductStatus { VERIFIED, SUSPECT, ILLEGITIMATE, RECALLED, QUARANTINED }

mapping(bytes32 => DSCSAProductStatus) public productStatus; // serialNumber → status

event SuspectProductIdentified(bytes32 indexed serialNumber, string reason, address reporter);
event IllegalitimatProductConfirmed(bytes32 indexed serialNumber, address confirmedBy);

function reportSuspectProduct(bytes32 serialNumber, string calldata reason) external {
    productStatus[serialNumber] = DSCSAProductStatus.SUSPECT;
    emit SuspectProductIdentified(serialNumber, reason, msg.sender);
    // Off-chain: must quarantine physical product within 24 hours
    // Off-chain: must notify FDA + immediate trading partners
}

function confirmIllegitimateProduct(bytes32 serialNumber)
    external onlyRole(DSCSA_AUTHORITY_ROLE) {
    productStatus[serialNumber] = DSCSAProductStatus.ILLEGITIMATE;
    emit IllegalitimatProductConfirmed(serialNumber, msg.sender);
    // FDA must be notified within 24 hours of confirmation
}

// Block transfers of suspect/illegitimate/recalled products
modifier dscsa ProductStatusCheck(bytes32 serialNumber) {
    DSCSAProductStatus status = productStatus[serialNumber];
    require(
        status == DSCSAProductStatus.VERIFIED || status == DSCSAProductStatus.ILLEGITIMATE, // allow illegitimate for return
        "DSCSA: product is suspect, recalled, or quarantined"
    );
    _;
}
```

---

## EPCIS — Electronic Product Code Information Services

```solidity
// DSCSA interoperability: requires EPCIS 2.0 standard (GS1)
// EPCIS events stored on-chain by reference; full XML stored on IPFS or GS1 network

// Core EPCIS event types for pharma:
enum EPCISEventType {
    OBJECT_EVENT,       // Product commissioned, decommissioned, observed
    AGGREGATION_EVENT,  // Packing (case → pallet)
    TRANSACTION_EVENT,  // Sale, return
    TRANSFORMATION_EVENT // Repackaging, reprocessing
}

struct EPCISEvent {
    EPCISEventType eventType;
    uint256 eventTime;          // ISO 8601 → Unix timestamp
    bytes32 eventTimeZoneOffset; // e.g. keccak256("-05:00")
    bytes32[] epcs;             // List of affected EPCs (serialized product codes)
    bytes32 bizStep;            // e.g. keccak256("commissioning"), keccak256("shipping")
    bytes32 disposition;        // e.g. keccak256("in_progress"), keccak256("active")
    bytes32 readPoint;          // Location where event was read (GLN)
    bytes32 bizLocation;        // Business location (GLN)
    bytes32 ipfsCID;            // Full EPCIS XML document on IPFS
}

// GS1 Business Steps for pharma:
bytes32 constant BIZ_STEP_COMMISSIONING = keccak256("urn:epcglobal:cbv:bizstep:commissioning");
bytes32 constant BIZ_STEP_SHIPPING = keccak256("urn:epcglobal:cbv:bizstep:shipping");
bytes32 constant BIZ_STEP_RECEIVING = keccak256("urn:epcglobal:cbv:bizstep:receiving");
bytes32 constant BIZ_STEP_DISPENSING = keccak256("urn:epcglobal:cbv:bizstep:dispensing");
bytes32 constant BIZ_STEP_DECOMMISSIONING = keccak256("urn:epcglobal:cbv:bizstep:decommissioning");
```
