# Singapore SFA — Food Safety Licensing & Import Requirements Reference

## Overview
The Singapore Food Agency (SFA) was established in 2019, consolidating food safety
functions from AVA, HSA, and NEA. SFA administers the Food Safety and Security Act (FSSA)
2023 — Singapore's primary food safety legislation.

---

## SFA Licence Types

```solidity
enum SFALicenceType {
    FOOD_IMPORTER,              // Required for all food importers
    FOOD_MANUFACTURER,          // For food processing/manufacturing in Singapore
    FOOD_RETAILER,              // Supermarkets, food service operators
    FOOD_STORAGE_FACILITY,      // Cold stores, warehouses
    SLAUGHTERHOUSE,             // For meat processing
    EGG_PROCESSING,             // For egg products
    SEAFOOD_DEALER              // Licensed seafood dealers
}

struct SFALicence {
    bytes32 licenceNumber;          // SFA licence number
    SFALicenceType licenceType;
    address licenceHolder;
    bytes32 businessName;           // Hashed
    bytes32 premisesAddress;        // Hashed
    uint256 issueDate;
    uint256 expiryDate;             // Typically 1-3 years
    bool isActive;
    bytes32[] approvedActivities;   // What the licence covers
}

interface ISFALicenceRegistry {
    function isLicensed(address entity, SFALicenceType licenceType) external view returns (bool);
    function getLicenceExpiry(address entity) external view returns (uint256);
    function isProductRegistered(bytes32 productCode) external view returns (bool);
}
```

---

## Import Control — SFA Import Permit System

```solidity
// ALL food imports into Singapore require SFA clearance
// High-risk foods: require Import Permit before shipment
// Standard foods: may use TradeNet declaration at point of entry

// HIGH-RISK foods requiring import permit (pre-clearance):
bytes32 constant HIGH_RISK_MEAT = keccak256("MEAT_PRODUCTS");
bytes32 constant HIGH_RISK_SEAFOOD = keccak256("FRESH_CHILLED_SEAFOOD");
bytes32 constant HIGH_RISK_EGGS = keccak256("SHELL_EGGS");
bytes32 constant HIGH_RISK_DAIRY = keccak256("DAIRY_PRODUCTS");
bytes32 constant HIGH_RISK_FRUITS = keccak256("FRESH_FRUITS_VEGETABLES");

struct SFAImportPermit {
    bytes32 permitNumber;               // SFA import permit reference
    bytes32 sfaProductCode;             // SFA-registered product code
    bytes32 countryOfOrigin;
    address licensedImporter;           // SFA-licensed food importer
    bytes32 importerLicenceNo;
    bytes32 healthCertificateCID;       // Exporting country competent authority certificate
    bytes32 exporterAccreditationRef;   // Exporting establishment SFA accreditation
    uint256 permitIssueDate;
    uint256 permitExpiryDate;           // Typically 30-90 days
    uint256 permittedQuantityKg;
    bool isUsed;
    SFAPermitStatus status;
}

enum SFAPermitStatus { PENDING, APPROVED, REJECTED, EXPIRED, USED }

// Accredited food establishments: SFA maintains list of approved overseas suppliers
// Meat: must come from SFA-accredited establishments in approved source countries
// Seafood: must come from approved fish farms/processing plants

interface ISFAAccreditedEstablishments {
    function isAccredited(bytes32 establishmentId, bytes2 country) external view returns (bool);
    function getEstablishmentApprovalDate(bytes32 establishmentId) external view returns (uint256);
}
```

---

## SFA Food Safety Requirements

```solidity
// FSSA 2023 Key Requirements:
// 1. All food must be safe and suitable for human consumption
// 2. Traceability records must be maintained
// 3. Food labels must comply with Singapore Food Regulations
// 4. Recall system must be in place

struct SFAFoodSafetyRecord {
    bytes32 lotCode;
    bytes32 sfaProductCode;
    bytes32 countryOfOrigin;
    bytes32 exportingEstablishmentRef;
    uint256 bestBeforeDate;
    uint256 useByDate;
    bool hasHACCPCertification;
    bytes32 haccpCertNumber;
    bytes32 haccpCertCID;
    bool isOrganicCertified;
    bytes32 organicCertCID;
    SFAClearanceStatus clearanceStatus;
}

enum SFAClearanceStatus { PENDING_CLEARANCE, CLEARED, HELD_FOR_INSPECTION, DETAINED, REJECTED }

// Recall: SFA can issue mandatory recall; operator must also initiate voluntary recall
// Response time: must act within 24 hours of SFA notification

uint256 constant SFA_RECALL_RESPONSE_HOURS = 24;

event SFARecallInitiated(bytes32 indexed lotCode, string reason, uint256 timestamp, address initiatedBy);
event SFARecallCompleted(bytes32 indexed lotCode, uint256 unitsRecovered, uint256 completionDate);
```

---

## Country-Specific Import Conditions

```solidity
// SFA maintains country-specific conditions — updated based on disease outbreaks, etc.

// Key current restrictions (as of 2024):
// Malaysia: SFA source for poultry (regular updates based on avian flu status)
// Japan: enhanced testing for Fukushima-adjacent prefectures (post-2011)
// Australia/NZ: generally unrestricted (FTA partners)
// US: must comply with SFA food safety standards; USDA certification for meat

struct CountryImportConditions {
    bytes2 countryCode;
    bytes32[] permittedProducts;        // Null = all products permitted
    bytes32[] restrictedProducts;       // Products requiring additional conditions
    bytes32[] prohibitedProducts;       // Completely banned
    bytes32[] additionalRequirements;   // e.g. keccak256("RADIATION_TESTING")
    uint256 lastUpdated;
    bytes32 sfaNoticeCID;               // SFA circular/notice CID
}

// Japan-origin food: SFA requires certificates from Japan's MAFF
// confirming products do not originate from restricted prefectures
bytes2[] public japanRestrictedPrefectures;

// Malaysia poultry: subject to SFA quota system + health certification
bool public malaysiaPoultryQuotaActive;
uint256 public malaysiaPoultryQuotaKgRemaining;
```

---

## Singapore Food Labelling Requirements

```solidity
// Singapore Food Regulations (SFR): mandatory label information
// Labels must be in English; other languages permitted in addition

struct SGFoodLabel {
    bytes32 productName;
    bytes32 netWeight;                  // Weight/volume declaration
    bytes32[] ingredientsList;          // In descending order of weight
    bytes32[] allergens;                // 8 major allergens must be declared
    bytes32 nutritionInformation;       // Mandatory nutrition facts panel
    bytes2 countryOfOrigin;
    uint256 bestBeforeDate;
    uint256 useByDate;
    bytes32 storageinstructions;
    bytes32 importerName;               // Name and address of Singapore importer
    bool hasHalalCertification;
    bytes32 halalCertBody;              // e.g. keccak256("MUIS")
    bytes32 halalCertNumber;
}

// 8 major allergens requiring declaration:
bytes32 constant ALLERGEN_CEREALS_GLUTEN = keccak256("CEREALS_WITH_GLUTEN");
bytes32 constant ALLERGEN_CRUSTACEANS = keccak256("CRUSTACEANS");
bytes32 constant ALLERGEN_EGGS_SG = keccak256("EGGS");
bytes32 constant ALLERGEN_FISH = keccak256("FISH");
bytes32 constant ALLERGEN_PEANUTS_SG = keccak256("PEANUTS");
bytes32 constant ALLERGEN_SOYBEANS = keccak256("SOYBEANS");
bytes32 constant ALLERGEN_MILK_SG = keccak256("MILK");
bytes32 constant ALLERGEN_TREE_NUTS = keccak256("TREE_NUTS");
bytes32 constant ALLERGEN_SULPHITES = keccak256("SULPHITES_10PPM_PLUS");

// Halal certification: MUIS (Islamic Religious Council of Singapore) is the recognised body
// Halal label without MUIS certification: food adulteration offence
```

---

## SFA TradeNet Integration

```solidity
// TradeNet: Singapore's electronic trade documentation system
// All food import declarations submitted via TradeNet
// SFA clearance code required before release of goods

struct TradeNetDeclaration {
    bytes32 tradeNetPermitRef;          // TradeNet permit reference number
    bytes32 sfaClearanceCode;           // SFA clearance code (issued after approval)
    bytes32 billOfLadingRef;
    bytes32 commercialInvoiceRef;
    bytes32 packingListRef;
    bytes32 sfaImportPermitRef;         // For high-risk foods
    uint256 declarationDate;
    uint256 expectedArrivalDate;
    bytes32 portOfEntry;                // e.g. keccak256("PASIR_PANJANG"), keccak256("JURONG_PORT")
    bool physicalInspectionRequired;    // SFA may require physical inspection
    bool samplingRequired;              // SFA may require sample testing
}

// Processing time: standard 1-3 working days | High-risk foods: may take longer
uint256 constant TRADENET_STANDARD_PROCESSING = 3 days;
```
