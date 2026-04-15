# Scope 1/2/3 Emissions Tracking & Carbon Credit Integration Reference

## Overview
Carbon tracking in supply chains is driven by:
- **SEC Climate Disclosure Rule** (2024): large accelerated filers must disclose Scope 1 + 2
- **California SB 253 / SB 261** (2026): >$1B revenue companies must report all 3 scopes
- **GHG Protocol**: global standard for emissions accounting
- **Voluntary carbon markets**: VERRA VCS, Gold Standard, ACR credits
- **Compliance markets**: California Cap-and-Trade, RGGI, EU ETS (for imports)

---

## GHG Protocol — Scope Definitions

```solidity
enum EmissionScope {
    SCOPE_1,    // Direct: owned/controlled sources (factories, vehicles, furnaces)
    SCOPE_2,    // Indirect: purchased electricity, steam, heat, cooling
    SCOPE_3     // Value chain: all other indirect (upstream + downstream)
}

// Scope 3 Categories (15 total):
enum Scope3Category {
    CAT_01_PURCHASED_GOODS,         // Supplier emissions (biggest for most companies)
    CAT_02_CAPITAL_GOODS,
    CAT_03_FUEL_ENERGY_ACTIVITIES,
    CAT_04_UPSTREAM_TRANSPORT,      // Logistics to company
    CAT_05_WASTE_GENERATED,
    CAT_06_BUSINESS_TRAVEL,
    CAT_07_EMPLOYEE_COMMUTING,
    CAT_08_UPSTREAM_LEASED_ASSETS,
    CAT_09_DOWNSTREAM_TRANSPORT,    // Logistics from company to customer
    CAT_10_PROCESSING_SOLD_PRODUCTS,
    CAT_11_USE_OF_SOLD_PRODUCTS,    // Often largest for energy/auto companies
    CAT_12_END_OF_LIFE_TREATMENT,
    CAT_13_DOWNSTREAM_LEASED_ASSETS,
    CAT_14_FRANCHISES,
    CAT_15_INVESTMENTS
}
```

---

## Emissions Data Structure

```solidity
struct EmissionRecord {
    bytes32 entityId;               // Reporting entity (supplier, subsidiary, etc.)
    EmissionScope scope;
    Scope3Category category;        // Only for Scope 3
    uint256 reportingYear;
    uint256 emissionsTonneCO2e;     // Metric tonnes CO2 equivalent (scaled 1e3 = 1 tonne)
    bytes32 ghgProtocolMethod;      // Calculation method used
    bytes32 emissionFactor;         // Emission factor applied (keccak256 of factor name)
    bytes32 activityDataCID;        // IPFS CID of underlying activity data
    bytes32 verificationCID;        // Third-party verification report CID
    address verifier;               // Verified by (accredited body)
    bool isVerified;
    uint256 uncertainty;            // Uncertainty range in % (scaled 1e2)
}

// GHG Protocol calculation methods:
bytes32 constant METHOD_SPEND_BASED = keccak256("SPEND_BASED");
bytes32 constant METHOD_AVERAGE_DATA = keccak256("AVERAGE_DATA");
bytes32 constant METHOD_HYBRID = keccak256("HYBRID");
bytes32 constant METHOD_SUPPLIER_SPECIFIC = keccak256("SUPPLIER_SPECIFIC"); // Most accurate for Cat 01

mapping(bytes32 => EmissionRecord[]) public emissionRecords; // entityId → records
```

---

## Supplier Emissions Collection (Scope 3 Cat 01)

```solidity
// Category 1 (purchased goods & services) = typically 70-90% of total footprint
// Supplier-specific data is most accurate but hardest to collect

struct SupplierEmissionAttestation {
    address supplier;
    bytes32 supplierId;
    uint256 reportingYear;
    uint256 scope1TonneCO2e;
    uint256 scope2TonneCO2e;
    uint256 scope3TonneCO2e;        // Relevant portion attributable to buyer
    uint256 revenueAllocationPct;   // % of supplier revenue from this buyer (for attribution)
    bytes32 methodologyUsed;
    bytes32 thirdPartyVerifierCID;
    bool isSBTiAligned;             // Science Based Targets initiative alignment
    uint256 attestationDate;
    bytes signedAttestation;        // Supplier's cryptographic signature
}

mapping(address => SupplierEmissionAttestation[]) public supplierAttestations;

// Attribution: buyer's share of supplier emissions
function calcAttributedEmissions(
    address supplier,
    uint256 year,
    uint256 spendWithSupplier,      // USD
    uint256 supplierTotalRevenue    // USD
) public view returns (uint256 attributedTonneCO2e) {
    SupplierEmissionAttestation[] storage atts = supplierAttestations[supplier];
    for (uint i = 0; i < atts.length; i++) {
        if (atts[i].reportingYear == year) {
            uint256 totalScope123 = atts[i].scope1TonneCO2e +
                atts[i].scope2TonneCO2e + atts[i].scope3TonneCO2e;
            // Attribution = (spend / supplier revenue) × supplier total emissions
            attributedTonneCO2e = totalScope123 * spendWithSupplier / supplierTotalRevenue;
            return attributedTonneCO2e;
        }
    }
}
```

---

## Carbon Credit Integration

```solidity
// Carbon credits: 1 credit = 1 tonne CO2e removed or avoided
// Registry standards: VERRA VCS, Gold Standard, ACR, CAR, Climate Action Reserve

enum CarbonCreditRegistry { VERRA_VCS, GOLD_STANDARD, ACR, CAR, CLIMATE_ACTION_RESERVE, CALIFORNIA_ARB }
enum CarbonCreditType { REMOVAL, AVOIDANCE, REDUCTION }
enum CarbonCreditStatus { ACTIVE, RETIRED, CANCELLED, TRANSFERRED }

struct CarbonCredit {
    bytes32 creditId;               // Registry-assigned serial number
    CarbonCreditRegistry registry;
    CarbonCreditType creditType;
    uint256 vintageYear;            // Year the reduction/removal occurred
    uint256 tonneCO2e;              // Quantity (1 credit = 1 tonne)
    bytes32 projectId;              // Underlying project ID
    bytes32 projectType;            // e.g. keccak256("REFORESTATION"), keccak256("METHANE_CAPTURE")
    bytes32 countryOfOrigin;        // ISO 3166
    address currentHolder;
    CarbonCreditStatus status;
    bytes32 registryCertCID;        // Registry certificate IPFS CID
}

mapping(bytes32 => CarbonCredit) public carbonCredits; // creditId → credit

// Retirement: permanent, irreversible cancellation to offset emissions
event CreditRetired(
    bytes32 indexed creditId,
    address indexed retirer,
    uint256 tonneCO2e,
    uint256 vintageYear,
    string retirementReason         // e.g. "Scope 1 offset FY2024"
);

function retireCredit(bytes32 creditId, string calldata reason) external {
    CarbonCredit storage credit = carbonCredits[creditId];
    require(credit.currentHolder == msg.sender, "Carbon: not credit holder");
    require(credit.status == CarbonCreditStatus.ACTIVE, "Carbon: credit not active");

    credit.status = CarbonCreditStatus.RETIRED;
    retiredCredits[msg.sender].push(creditId);

    emit CreditRetired(creditId, msg.sender, credit.tonneCO2e, credit.vintageYear, reason);
}

// Net emissions calculation
function calcNetEmissions(bytes32 entityId, uint256 year)
    external view returns (int256 netTonneCO2e) {
    uint256 grossEmissions = _totalGrossEmissions(entityId, year);
    uint256 retiredCredits = _totalRetiredCredits(entityId, year);
    netTonneCO2e = int256(grossEmissions) - int256(retiredCredits);
}
```

---

## SEC Climate Disclosure (2024 Rule)

```solidity
// SEC Final Rule (March 2024): mandatory climate disclosure for public companies
// Scope 1 + 2: mandatory for large accelerated filers (phased in 2026-2027)
// Scope 3: required only if material OR if company has set Scope 3 targets
// Third-party assurance: limited assurance → reasonable assurance (phased)

struct SECClimateDisclosure {
    uint256 fiscalYear;
    uint256 scope1TonneCO2e;
    uint256 scope2LocationBasedTonneCO2e;
    uint256 scope2MarketBasedTonneCO2e;
    uint256 scope3TonneCO2e;        // If material or target set
    bool scope3IsMaterial;
    bool hasScope3Target;
    bytes32 assuranceProviderCID;   // Assurance report IPFS CID
    bytes32 assuranceLevel;         // keccak256("LIMITED") or keccak256("REASONABLE")
    bool hasInternalCarbonPrice;
    uint256 internalCarbonPriceUSD; // Per tonne if applicable
    bytes32 transitionRiskCID;      // Climate-related transition risks description
    bytes32 physicalRiskCID;        // Climate-related physical risks description
}

// California SB 253: >$1B revenue, doing business in CA → all 3 scopes by 2026
uint256 constant SB253_REVENUE_THRESHOLD = 1_000_000_000e18; // $1 billion
```

---

## Logistics Emissions (Scope 3 Cat 04 + 09)

```solidity
// Transport emissions calculated from:
// Distance × Weight × Emission Factor (by transport mode)

struct LogisticsEmissionFactor {
    bytes32 transportMode;          // ROAD, SEA, AIR, RAIL
    uint256 emissionFactorGCO2ePerTKM; // Grams CO2e per tonne-kilometre
}

// GLEC Framework emission factors (2023):
// Road (truck): 62-98 gCO2e/tkm | Sea (container): 10-16 gCO2e/tkm
// Air freight: 500-1,400 gCO2e/tkm | Rail: 22-28 gCO2e/tkm (electric)

bytes32 constant MODE_ROAD = keccak256("ROAD_FREIGHT");
bytes32 constant MODE_SEA = keccak256("SEA_FREIGHT_CONTAINER");
bytes32 constant MODE_AIR = keccak256("AIR_FREIGHT");
bytes32 constant MODE_RAIL = keccak256("RAIL_FREIGHT");

mapping(bytes32 => uint256) public emissionFactors; // mode → gCO2e/tkm

struct ShipmentEmission {
    bytes32 shipmentId;
    bytes32 transportMode;
    uint256 distanceKm;
    uint256 weightTonnes;
    uint256 emissionsTonneCO2e;     // = distance × weight × factor / 1e6
    bool isRefrigerated;            // Reefer adds ~50% to emission factor
    bytes32 carrierCertCID;         // Carrier emission verification certificate
}

function calcShipmentEmissions(
    bytes32 mode,
    uint256 distanceKm,
    uint256 weightTonnes,
    bool isRefrigerated
) public view returns (uint256 tCO2e) {
    uint256 factor = emissionFactors[mode];
    uint256 reeферMultiplier = isRefrigerated ? 15_000 : 10_000; // 1.5x for reefer
    // tCO2e = (gCO2e/tkm × tkm) / 1e6 → tonnes
    tCO2e = factor * distanceKm * weightTonnes * reeферMultiplier / (1e6 * 10_000);
}
```
