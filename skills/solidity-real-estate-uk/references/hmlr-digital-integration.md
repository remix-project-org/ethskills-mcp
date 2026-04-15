# HMLR Digital Integration — Reference

## Overview
HM Land Registry (HMLR) is the official body for registering property ownership
in England and Wales. Scotland uses Registers of Scotland (RoS); Northern Ireland
uses Land & Property Services (LPS). Each has distinct rules.

---

## England & Wales — HMLR

```solidity
// HMLR: Land Registration Act 2002
// Classes of title: Absolute, Good Leasehold, Qualified, Possessory
// Register comprises 3 parts: Property Register, Proprietorship Register, Charges Register

// Title number format: County code + number (e.g. "TGL12345", "MX567890")
// On-chain: store as keccak256 of title number string for efficient lookup

struct HMLRRegisterEntry {
    // Property Register
    bytes32 titleNumber;
    string tenure;                  // "FREEHOLD" or "LEASEHOLD"
    string propertyDescription;     // Verbal description + plan reference
    bytes32 titlePlanCID;           // IPFS CID of title plan (filed under OS map)

    // Proprietorship Register
    address currentProprietor;      // Registered legal owner
    bytes32 proprietorNameHash;     // Hash of full legal name
    TitleClass titleClass;
    bytes32 restrictionText;        // e.g. "No disposition without lender consent"
    bool hasRestriction;

    // Charges Register
    Charge[] charges;               // Mortgages, beneficial covenants, easements
    uint256 lastUpdated;            // Block timestamp of last on-chain sync
}

// HMLR official copy: generated on demand, admissible in court
// On-chain stores hash of official copy for verification
mapping(bytes32 => bytes32) public officialCopyHash; // titleNumber → document hash
mapping(bytes32 => uint256) public officialCopyDate;

function verifyOfficialCopy(bytes32 titleNumber, bytes32 documentHash)
    external view returns (bool valid) {
    return officialCopyHash[titleNumber] == documentHash;
}
```

---

## HMLR Digital Mortgage (Form CH1)

```solidity
// Form CH1: Legal Charge (mortgage) registered at HMLR
// Digital mortgage deed: HMLR launched digital deed signing (2019)
// Requirements: GOV.UK Verify identity, witnessed electronically

struct DigitalMortgageDeed {
    bytes32 titleNumber;
    address borrower;
    address lender;                 // Must be FCA-authorized
    uint256 amountSecuredGBP;
    uint256 registrationDate;
    bytes32 formCH1Hash;            // Hash of executed Form CH1
    bytes32 hmlrApplicationRef;     // AP1 application reference
    bool isRegistered;              // Confirmed registered at HMLR
    uint256 chargePriority;         // 1 = first charge, 2 = second, etc.
}

// HMLR AP1 application: used to register dealings
// On-chain: store application reference for tracking
mapping(bytes32 => bytes32) public pendingApplications; // titleNumber → AP1 ref

// HMLR requisitions: HMLR may raise queries — must be responded to within deadline
struct HMLRRequisition {
    bytes32 applicationRef;
    string query;
    uint256 deadline;               // Usually 20 business days
    bool responded;
    bytes32 responseCID;
}
```

---

## Scotland — Registers of Scotland (RoS)

```solidity
// Scotland: Land Register of Scotland (not HMLR)
// Sasines Register (older) being replaced by Land Register
// Scottish law: SDLT replaced by LBTT (Land and Buildings Transaction Tax)

struct ScottishPropertyRecord {
    bytes32 titleSheetNumber;       // Land Register title sheet number (e.g. "MID12345")
    bytes32 sasinesRef;             // If still in Sasines Register
    bool isInLandRegister;          // Migrated to Land Register
    address grantee;                // Registered owner
    bytes32 dispOneRef;             // Disposition (Scottish deed of transfer)
    uint256 lbttPaid;               // LBTT paid (see sdlt-lbtt-ltt.md)
    bool hasStandardSecurity;       // Scottish equivalent of English mortgage
}

// Scotland: Standard Security (not "charge") for mortgages
// Form A or Form B Standard Security
struct ScottishStandardSecurity {
    bytes32 titleSheetNumber;
    address creditor;               // Lender
    uint256 amountSecured;
    bytes32 standardSecurityCID;   // IPFS CID of executed standard security deed
    bool isRegistered;             // Registered in Land Register
}
```

---

## HMLR Blockchain Pilot — Digital Street Project

```solidity
// HMLR "Digital Street" research programme explored blockchain for conveyancing
// Key findings (2018-2021):
// - Smart contracts can automate conveyancing workflow
// - Title transfer still requires legal deed + HMLR registration
// - Blockchain can act as "single source of truth" for pre-completion stages

// Proposed workflow (research only — not live):
// 1. Offer accepted → property reserved on blockchain (smart contract locks property)
// 2. Searches + enquiries → results stored on blockchain
// 3. Exchange of contracts → smart contract holds deposit
// 4. Completion → HMLR updates Land Register, smart contract releases funds

// On-chain: implement conveyancing workflow tracking
enum ConveyancingStage {
    OFFER_ACCEPTED,
    SOLICITORS_INSTRUCTED,
    SEARCHES_ORDERED,
    SEARCHES_RECEIVED,
    ENQUIRIES_RAISED,
    ENQUIRIES_ANSWERED,
    MORTGAGE_OFFER_RECEIVED,
    EXCHANGE_OF_CONTRACTS,
    COMPLETION_DATE_SET,
    FUNDS_TRANSFERRED,
    COMPLETED,
    HMLR_APPLICATION_SUBMITTED,
    HMLR_REGISTERED
}

mapping(uint256 => ConveyancingStage) public transactionStage; // escrowId → stage
mapping(uint256 => uint256) public stageTimestamp;

event StageAdvanced(uint256 indexed escrowId, ConveyancingStage newStage, uint256 timestamp);

function advanceStage(uint256 escrowId, ConveyancingStage newStage)
    external onlyRole(CONVEYANCER_ROLE) {
    require(uint8(newStage) == uint8(transactionStage[escrowId]) + 1,
            "HMLR: stages must advance sequentially");
    transactionStage[escrowId] = newStage;
    stageTimestamp[escrowId] = block.timestamp;
    emit StageAdvanced(escrowId, newStage, block.timestamp);
}
```

---

## Priority Searches

```solidity
// OS1 Priority Search: 30-business-day priority period for registration
// During priority period: no other application can take priority

struct PrioritySearch {
    bytes32 titleNumber;
    uint256 searchDate;
    uint256 expiryDate;             // searchDate + 30 business days (~42 calendar days)
    address searchRequester;        // Buyer's solicitor
    bool isActive;
}

mapping(bytes32 => PrioritySearch) public activePrioritySearches;

// Block transfers during active priority search period
modifier respectPrioritySearch(bytes32 titleNumber) {
    PrioritySearch storage s = activePrioritySearches[titleNumber];
    if (s.isActive && block.timestamp < s.expiryDate) {
        require(
            msg.sender == s.searchRequester || hasRole(HMLR_ROLE, msg.sender),
            "HMLR: priority search active — only requester can transact"
        );
    }
    _;
}
```
