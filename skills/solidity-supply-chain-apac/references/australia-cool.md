# Australia Country of Origin Labelling (COOL) Requirements Reference

## Overview
Australia's Country of Origin Labelling (COOL) framework for food is among the world's
most comprehensive. Mandatory since July 1, 2018 under the Country of Origin Food
Labelling Information Standard 2016 (COOL Standard), enforced by ACCC.

---

## COOL Standard — Scope

```solidity
// Mandatory COOL applies to:
// - Food for retail sale in Australia
// - Food for use as an ingredient in food for retail sale
// - Food for use in food service (restaurants, cafes — simpler rules)

// Exempt: food not for sale to final consumer (B2B ingredients), single-ingredient spices,
// confectionery in small packages, food at farmers markets (some exemptions)

enum AUFoodCOOLCategory {
    GROWN_IN_AUSTRALIA,         // 100% Australian-grown ingredients + processing
    MADE_IN_AUSTRALIA,          // Substantially transformed in Australia
    PRODUCT_OF_AUSTRALIA,       // Both grown AND made in Australia (highest standard)
    PACKED_IN_AUSTRALIA,        // Only packed here — ingredients may be imported
    MADE_FROM_LOCAL_AND_IMPORTED // Mixed origin — bar chart required
}
```

---

## "Product of Australia" — Highest Standard

```solidity
// "Product of Australia" OR "Australian made, Australian grown":
// BOTH conditions must be met:
// 1. Substantially transformed in Australia, AND
// 2. All significant ingredients and processing inputs are of Australian origin

// Most restrictive claim — water and additives typically excluded from "significant"

struct ProductOfAustraliaRecord {
    bytes32 productId;
    bool isSubstantiallyTransformed;    // Manufacturing/processing in Australia
    bool allSignificantIngredientsAU;   // 100% AU significant ingredients
    uint256 australianContentPct;       // Should be ~100% for this claim
    bytes32 verificationCID;
}
```

---

## "Made in Australia" — Substantial Transformation Test

```solidity
// "Made in Australia" requires SUBSTANTIAL TRANSFORMATION in Australia
// Substantial transformation: process that fundamentally changes the nature of inputs
// Examples:
// YES: Raw ingredients → processed food (e.g. wheat → bread)
// NO: Simply combining, mixing, packaging imported ingredients
// NO: Cutting, cooking if nature not fundamentally changed (e.g. imported fish → fish fillets)

// Must also state origin of ingredients via:
// (a) Bar chart, OR
// (b) Statement of Australian content %

struct MadeInAustraliaRecord {
    bytes32 productId;
    bool isSubstantiallyTransformed;
    uint256 australianIngredientPct;    // % by ingoing weight
    uint256 australianProcessingPct;    // % of processing inputs (energy, labour, etc.)
    bool requiresBarChart;              // True if ingredients not all Australian
    bool requiresContentStatement;      // "Made in Australia from X% Australian ingredients"
    bytes32 verificationCID;
}

// Content percentage calculation:
// = (weight of Australian ingredients / total weight of all ingredients) × 100
// Water added in Australia counts as Australian if used in substantial transformation
```

---

## Bar Chart / Kangaroo Logo Requirement

```solidity
// "Made in Australia" from mixed ingredients: MUST include bar chart OR content statement
// Bar chart: visual representation of Australian content % with "Australian" label

struct AUCOOLLabel {
    bytes32 productId;
    AUFoodCOOLCategory category;
    uint256 australianContentPct;           // Scaled 1e2 (e.g. 6500 = 65.00%)
    bool hasBarChart;                       // Mandatory for "Made in Aus" with <100% AU content
    bool hasKangarooLogo;                   // Optional — emphasises Australian origin
    bytes32 barChartImageCID;               // Digital representation of physical bar chart
    string contentStatement;                // e.g. "Made in Australia from 65% Australian ingredients"
    bytes32 labelImageCID;                  // Full label IPFS CID

    // For "Grown in Australia" — must specify which ingredients are grown in Australia
    bytes32[] grownInAustraliaIngredients;

    // For imported products:
    bytes2 primaryCountryOfOrigin;          // Where product grown/manufactured
    bool isMultiCountry;                    // If ingredients from multiple countries
    bytes2[] allCountriesOfOrigin;
}

// Kangaroo logo: registered trademark of Australian Made Campaign Ltd
// Licence required to use official logo — free for qualifying products
bool public hasKangarooLicence;
bytes32 public kangarooLicenceRef;
```

---

## "Packed in Australia" — Weakest Claim

```solidity
// "Packed in Australia": packaging occurred in Australia but ingredients may be entirely imported
// Must state country of origin of ALL ingredients
// e.g. "Packed in Australia from imported ingredients" OR list each country

struct PackedInAustraliaRecord {
    bytes32 productId;
    bytes2[] ingredientOriginCountries;     // All countries where ingredients grown/manufactured
    uint256 australianPackagingPct;         // % of packaging that is Australian (informational)
    bool allIngredientsSameCountry;         // Simplifies labeling if yes
    bytes32 primaryIngredientCountry;       // If single source country
}
```

---

## ACCC Enforcement

```solidity
// ACCC (Australian Competition and Consumer Commission) enforces COOL
// Penalties: up to $10M for corporations, $500,000 for individuals (per breach)
// "False or misleading" origin claims: additional liability under Australian Consumer Law

uint256 constant ACCC_MAX_CORPORATE_PENALTY = 10_000_000e18; // A$10M per breach (or 3x benefit)

// Common violations:
// - Claiming "Product of Australia" when ingredients are imported
// - Bar chart misrepresenting content %
// - "Australian" imagery (maps, flags) creating false impression of AU origin
// - Failure to label at all (mandatory for in-scope products)

// ACCC can issue: infringement notices, court-enforceable undertakings,
// mandatory recalls, civil penalty orders

event ACCCEnforcementAction(bytes32 indexed productId, string violationType, uint256 timestamp);
```

---

## Country of Origin — Non-Food Products

```solidity
// Consumer goods (non-food): Australian Consumer Law s.255
// "Country of origin" representation must be accurate — general law applies
// No mandatory bar chart for non-food, but cannot make false claims

// TCF products (Textiles, Clothing, Footwear): separate COOL requirements
// "Made in Australia" for TCF: 75%+ of production cost incurred in Australia

struct TCFCOOLRecord {
    bytes32 productId;
    bytes32 productType;                // keccak256("TEXTILE"), keccak256("CLOTHING"), keccak256("FOOTWEAR")
    uint256 australianProductionCostPct; // Must be ≥7500 (75%) for "Made in Australia"
    bytes2 countryOfOrigin;             // Where majority of production occurred
    bool qualifiesForAUClaim;
}

uint256 constant TCF_MADE_IN_AUSTRALIA_THRESHOLD = 7500; // 75%
```

---

## Imported Food Control Act 1992

```solidity
// Imported Food Control Act: food safety (distinct from COOL)
// DAFF (Dept Agriculture, Fisheries and Forestry) enforces
// Imported Food Inspection Scheme (IFIS): risk-based sampling

enum IFISRiskCategory { RISK_FOOD, SURVEILLANCE_FOOD }
// Risk food: high-risk category — 100% inspected initially, then reduced if compliant
// Surveillance food: periodic random inspection

struct IFISRecord {
    bytes32 importPermitRef;
    IFISRiskCategory riskCategory;
    bytes32 productCategory;
    bytes2 countryOfOrigin;
    uint256 quantityKg;
    bool wasInspected;
    bool passed;
    bytes32 labTestResultCID;
    uint256 inspectionDate;
    address inspectingLaboratory;   // Must be NATA-accredited laboratory
}

// NATA (National Association of Testing Authorities): Australian lab accreditation body
interface INATARegistry {
    function isAccredited(address laboratory, bytes32 testType) external view returns (bool);
    function getAccreditationNumber(address laboratory) external view returns (bytes32);
}
```

---

## Food Standards Australia New Zealand (FSANZ)

```solidity
// FSANZ develops Australia New Zealand Food Standards Code
// Shared between Australia and NZ — Code applies in both countries
// Key standards relevant to COOL and traceability:

// Standard 1.2.11: Country of origin labelling (food)
// Standard 1.2.3: Mandatory warning and advisory statements
// Standard 1.2.4: Statement of ingredients
// Standard 1.2.7: Nutrition, health and related claims

struct FSANZCompliance {
    bytes32 productId;
    bool meetsStd1211;              // Country of origin labelling
    bool meetsStd123;               // Warning statements (if required)
    bool meetsStd124;               // Ingredients declaration
    bool meetsStd127;               // Nutrition facts (if making claims)
    bytes32 fsanzFoodCategoryCode;  // FSANZ food category classification
    bool isNovelFood;               // Novel food = FSANZ pre-market approval required
    bytes32 novelFoodApprovalRef;   // If novel food
}
```
