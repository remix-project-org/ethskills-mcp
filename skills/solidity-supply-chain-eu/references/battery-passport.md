# EU Battery Regulation 2023/1542 — Digital Battery Passport Reference

## Overview
The EU Battery Regulation replaces the old Battery Directive (2006/66/EC).
Digital Battery Passport (DBP) mandatory from:
- **February 18, 2027**: EV batteries, industrial batteries >2kWh, LMT batteries
- **August 18, 2028**: all other regulated batteries

---

## Battery Categories

```solidity
enum EUBatteryCategory {
    PORTABLE,           // <2kWh, consumer electronics (exempt from passport until 2028)
    LMT,                // Light Means of Transport: e-bikes, e-scooters, e-mopeds
    EV,                 // Electric Vehicle traction batteries (most stringent)
    INDUSTRIAL_SMALL,   // ≤2kWh (limited requirements)
    INDUSTRIAL_LARGE,   // >2kWh (full passport required from 2027)
    SLI                 // Starting, Lighting, Ignition (cars)
}

// Passport requirement summary:
// EV + Industrial >2kWh + LMT: February 18, 2027
// SLI + portable: August 18, 2028
```

---

## Full Digital Battery Passport Data Requirements (Annex XIII)

```solidity
struct DigitalBatteryPassport {
    // === IDENTITY ===
    bytes32 batteryPassportId;          // Unique passport identifier
    bytes32 batteryModelId;             // Model-level identifier
    bytes32 manufacturerIdentification; // Manufacturer name + address (hashed)
    bytes32 manufacturingPlantId;       // Plant where manufactured
    uint256 manufacturingDate;          // Month + year of manufacture
    EUBatteryCategory batteryCategory;
    bytes32 batteryChemistry;           // e.g. keccak256("NMC"), keccak256("LFP"), keccak256("NCA")

    // === PERFORMANCE & DURABILITY ===
    PerformanceData performance;

    // === CARBON FOOTPRINT ===
    CarbonFootprintData carbonFootprint;

    // === RESPONSIBLE SOURCING ===
    ResponsibleSourcingData sourcing;

    // === CIRCULAR ECONOMY ===
    CircularEconomyData circularEconomy;

    // === STATE OF HEALTH (for used batteries) ===
    StateOfHealthData soh;

    // === SUPPLY CHAIN ===
    SupplyChainData supplyChain;

    // Status
    BatteryStatus status;
    bytes32 fullPassportIPFSCID;        // Full passport data on IPFS
}

enum BatteryStatus { ORIGINAL, REPURPOSED, REPACKED, REMANUFACTURED, WASTE }
```

---

## Performance & Durability Data

```solidity
struct PerformanceData {
    // Rated capacity
    uint256 ratedCapacityAh;            // Ampere-hours (scaled 1e3)
    uint256 energyCapacityWh;           // Watt-hours

    // Voltage
    uint256 nominalVoltageV;            // Millivolts (scaled 1e3)
    uint256 minVoltageV;
    uint256 maxVoltageV;

    // Temperature range
    int256 minTemperatureC;             // Celsius × 100
    int256 maxTemperatureC;
    int256 minChargeTemperatureC;
    int256 maxChargeTemperatureC;

    // Lifetime / durability
    uint256 expectedLifetimeCycles;     // Number of full charge/discharge cycles
    uint256 expectedLifetimeYears;
    uint256 capacityThresholdFade;      // % capacity at end of life (e.g. 8000 = 80%)

    // Power
    uint256 originalPowerCapabilityW;
    uint256 maxPermittedBatteryPowerW;

    // State of charge (dynamic — updated by BMS)
    uint256 currentStateOfChargePercent; // Scaled 1e2 (e.g. 9500 = 95.00%)
}
```

---

## Carbon Footprint Data (Mandatory from Feb 2025)

```solidity
struct CarbonFootprintData {
    // Carbon footprint per kWh of capacity — declared value
    uint256 carbonFootprintKgCO2ePerKWh; // Scaled 1e3

    // Breakdown by life cycle stage (Art. 7 + Annex II):
    uint256 rawMaterialAcquisitionKgCO2e;
    uint256 mainSupplierProductionKgCO2e;
    uint256 batteryProductionKgCO2e;
    uint256 distributionKgCO2e;
    uint256 endOfLifeKgCO2e;

    // Performance class (assigned by Commission based on declared value)
    bytes1 carbonPerformanceClass;      // A (best) to E (worst)

    // Verification
    bytes32 carbonFootprintStudyCID;    // LCA study IPFS CID
    address thirdPartyVerifier;         // Accredited verification body
    uint256 verificationDate;
    bool isDeclaredValueVerified;

    // Carbon footprint label (mandatory on battery and packaging)
    bytes32 labelImageCID;              // Digital copy of physical label
}
```

---

## Responsible Sourcing Data (Critical Raw Materials)

```solidity
// Regulation requires due diligence for:
// Cobalt, lithium, nickel, natural graphite
// From February 2025: supply chain due diligence report mandatory

struct ResponsibleSourcingData {
    CriticalMaterialRecord cobalt;
    CriticalMaterialRecord lithium;
    CriticalMaterialRecord nickel;
    CriticalMaterialRecord naturalGraphite;
    // Additional materials as Commission may add
}

struct CriticalMaterialRecord {
    bytes32 materialName;
    uint256 contentPctByWeight;         // Scaled 1e4 (e.g. 1500 = 15.00%)
    bool isRecycled;
    uint256 recycledContentPct;         // Scaled 1e4
    bytes32[] mineOrSmelterIds;         // All mines/smelters in chain
    bytes32[] countryOfOrigin;          // ISO 3166 for each source
    bool isConflictFreeAttested;
    bytes32 oecdDueDiligenceCID;        // OECD Due Diligence Guidance compliance CID
    bytes32 auditCertificateCID;
    address thirdPartyAuditor;
    uint256 auditDate;
}
```

---

## Recycled Content Targets

```solidity
// Mandatory minimum recycled content (Art. 8):
// From 2030: Cobalt 16%, Lead 85%, Lithium 6%, Nickel 6%
// From 2035: Cobalt 26%, Lead 85%, Lithium 12%, Nickel 15%

struct RecycledContentTargets {
    uint256 cobaltTarget2030;       // 1600 = 16%
    uint256 lithiumTarget2030;      // 600 = 6%
    uint256 nickelTarget2030;       // 600 = 6%
    uint256 leadTarget2030;         // 8500 = 85%
    uint256 cobaltTarget2035;       // 2600 = 26%
    uint256 lithiumTarget2035;      // 1200 = 12%
    uint256 nickelTarget2035;       // 1500 = 15%
    uint256 leadTarget2035;         // 8500 = 85%
}

function checkRecycledContentCompliance(
    uint256 cobaltRecycledPct,
    uint256 lithiumRecycledPct,
    uint256 nickelRecycledPct,
    uint256 year
) public pure returns (bool cobaltOk, bool lithiumOk, bool nickelOk) {
    if (year >= 2035) {
        cobaltOk = cobaltRecycledPct >= 2600;
        lithiumOk = lithiumRecycledPct >= 1200;
        nickelOk = nickelRecycledPct >= 1500;
    } else if (year >= 2030) {
        cobaltOk = cobaltRecycledPct >= 1600;
        lithiumOk = lithiumRecycledPct >= 600;
        nickelOk = nickelRecycledPct >= 600;
    } else {
        cobaltOk = true; lithiumOk = true; nickelOk = true; // No target yet
    }
}
```

---

## Circular Economy & End-of-Life Data

```solidity
struct CircularEconomyData {
    // Repairability (Art. 11)
    uint256 repairabilityScore;         // Commission scoring methodology (1-10)
    uint256 sparePartsAvailabilityYears;
    bytes32 repairManualCID;
    bytes32 dismantlingInstructionsCID;

    // Removability
    bool isRemovableByConsumer;         // Can end-user remove battery?
    bool isRemovableByProfessional;

    // Extended Producer Responsibility
    bytes32 eprSchemeId;               // EPR scheme registration
    bytes32 producerRegistrationNo;    // National producer register number

    // End-of-life state
    BatteryStatus currentStatus;
    uint256 stateOfHealth;             // % of original capacity remaining (scaled 1e4)
    bool isSuitableForSecondLife;      // Repurposing assessment result
    bytes32 endOfLifeAssessmentCID;
}
```

---

## State of Health (Dynamic Data)

```solidity
// Dynamic data updated throughout battery lifetime by BMS / service provider
struct StateOfHealthData {
    uint256 currentStateOfHealthPct;    // % of original capacity (scaled 1e4)
    uint256 cyclesCompleted;
    int256 currentCellTemperatureC;     // × 100
    uint256 lastUpdated;                // Timestamp
    address dataProvider;               // Entity updating SOH data
    bool isThirdPartyAssessed;          // Independent assessment done

    // Predictive health
    uint256 estimatedRemainingLifeCycles;
    uint256 estimatedRemainingLifeYears;
}

// Battery passport access levels:
// PUBLIC: basic identity, carbon footprint class, general info
// SUPPLY CHAIN ACTORS: detailed technical data, sourcing info
// COMPETENT AUTHORITIES: full unrestricted access
// THIRD-PARTY SERVICE PROVIDERS: with permission from owner

enum PassportAccessLevel { PUBLIC, SUPPLY_CHAIN, AUTHORITY, SERVICE_PROVIDER }
mapping(address => PassportAccessLevel) public accessLevels;
```
