# FDA FSMA 204 — Food Traceability Rule Reference

## Overview
FSMA Section 204 (21 CFR Part 1, Subpart S) requires traceability records for foods on the
Food Traceability List (FTL). Compliance deadline: January 20, 2026.

## Foods on the Traceability List (FTL)
- Soft cheeses, shell eggs
- Nut butters
- Fresh cut fruits and vegetables
- Herbs (fresh)
- Leafy greens (fresh and fresh cut)
- Melons, peppers, sprouts, tomatoes
- Ready-to-eat salads, deli salads
- Finfish (fresh and frozen), smoked finfish
- Crustaceans, bivalve mollusks
- Fresh shell eggs

## Required Critical Tracking Events (CTEs)

### For Farms / Growers
```
CTE: HARVESTING
Required KDEs:
- Traceability lot code (TLC)
- Quantity and unit of measure
- Location description (farm ID, growing area)
- Date of harvest / date lot code was assigned
- Reference document type + number (field harvest record)
```

### For Packers / First Receivers
```
CTE: COOLING (if product cooled before packing)
Required KDEs: same as harvesting + cooling facility location

CTE: INITIAL PACKING
Required KDEs:
- TLC for packed food
- Location of packing (facility FDA registration number)
- Date of packing
- TLC for harvested food (if different lot)
- Reference document
```

### For Shippers
```
CTE: SHIPPING
Required KDEs:
- TLC
- Quantity + UOM
- Ship-to location (FDA registration or farm ID)
- Date of shipping
- Reference document (BOL number)
```

### For Receivers
```
CTE: RECEIVING
Required KDEs:
- TLC (from shipper's records)
- Quantity + UOM
- Location received (facility ID)
- Date of receipt
- Reference document (BOL, PO)
```

### For Processors (Transformation)
```
CTE: TRANSFORMATION
Required KDEs:
- New TLC assigned
- All input TLCs (ingredients)
- Location of transformation
- Date of transformation
- Reference document
```

## Solidity Implementation

```solidity
// Full FSMA 204 event recording
struct FSMA204Record {
    CTEType cteType;
    bytes32 traceabilityLotCode;
    bytes32 productDescription;     // FDA PTI description
    uint256 quantity;               // Scaled integer (e.g., lb * 1000)
    bytes32 unitOfMeasure;
    bytes32 locationId;             // FDA facility registration number hash
    uint256 eventDate;              // Unix timestamp
    bytes32 referenceDocType;       // e.g. keccak256("BOL"), keccak256("HARVEST_RECORD")
    bytes32 referenceDocNumber;
    bytes32[] inputLotCodes;        // For TRANSFORMATION events
    bytes32 ipfsDocumentCID;        // Supporting documentation
}

mapping(bytes32 => FSMA204Record[]) public fsmaRecords; // TLC → records

function recordCTE(
    bytes32 lotCode,
    FSMA204Record calldata record
) external onlyRole(AUTHORIZED_RECORDER_ROLE) {
    require(record.traceabilityLotCode == lotCode, "FSMA: lot code mismatch");
    require(record.quantity > 0, "FSMA: quantity required");
    require(record.locationId != bytes32(0), "FSMA: location required");
    require(record.eventDate <= block.timestamp, "FSMA: future date");
    require(record.referenceDocNumber != bytes32(0), "FSMA: reference doc required");

    if (record.cteType == CTEType.TRANSFORMATION) {
        require(record.inputLotCodes.length > 0, "FSMA: input lots required for transformation");
        // Link output lot to input lots
        for (uint i = 0; i < record.inputLotCodes.length; i++) {
            transformationInputs[lotCode].push(record.inputLotCodes[i]);
        }
    }

    fsmaRecords[lotCode].push(record);
    emit CTERecorded(lotCode, record.cteType, record.locationId, record.eventDate);
}

// FDA requires ability to produce records within 24 hours of request
function getFullTraceabilityRecord(bytes32 lotCode)
    external view returns (FSMA204Record[] memory) {
    return fsmaRecords[lotCode];
}

// Trace upstream for recalls
function getUpstreamLots(bytes32 lotCode)
    external view returns (bytes32[] memory) {
    return transformationInputs[lotCode];
}
```

## Traceability Lot Code (TLC) Format

```solidity
// GS1 SGTIN-96 encoded as bytes32
// Structure: Company Prefix (7 digits) + Item Reference (5 digits) + Serial (up to 20 chars)
// Plus: lot code assigned at point of harvest or packing

function generateTLC(
    uint64 gtin,        // 14-digit GTIN
    uint64 serial,      // Serial number
    uint32 batchDate    // YYYYMMDD
) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(gtin, serial, batchDate));
}
```

## Record Retention
FDA requires records kept for **2 years**. On-chain storage satisfies this requirement
but consider gas costs — use events + IPFS for bulk data, store only TLC on-chain.

## Recall Response Requirements
Must be able to identify:
1. All lots that received product from recalled lot (forward trace)
2. All lots that contributed to recalled lot (backward trace)
3. Response within 24 hours of FDA request