# Advanced AML/CTF On-Chain Patterns — Reference

## Overview
US AML obligations for crypto businesses come from the Bank Secrecy Act (BSA),
FinCEN guidance, OFAC sanctions rules, and FATF Travel Rule implementation.
All crypto exchanges and money services businesses (MSBs) must register with FinCEN.

---

## FinCEN MSB Registration

```solidity
// All US crypto businesses transmitting >$1,000 must register as MSBs with FinCEN
// Registration is FREE and mandatory — failure is a federal crime

struct FinCENRegistration {
    bytes32 msbRegistrationNumber;  // FinCEN MSB registration number
    uint256 registrationDate;
    uint256 renewalDate;            // Must renew every 2 years
    bool isActive;
    bytes32[] coveredActivities;    // e.g. keccak256("MONEY_TRANSMISSION"), keccak256("EXCHANGER")
}

interface IFinCENRegistry {
    function isRegisteredMSB(address entity) external view returns (bool);
    function getRegistrationNumber(address entity) external view returns (bytes32);
}

modifier onlyRegisteredMSB() {
    require(fincenRegistry.isRegisteredMSB(address(this)), "BSA: FinCEN MSB registration required");
    _;
}
```

---

## OFAC Sanctions Screening

```solidity
// OFAC maintains the SDN (Specially Designated Nationals) list
// Strict liability: no knowledge requirement — any transaction with SDN is a violation
// Penalties: up to $1M per violation (criminal) + $311,562 per violation (civil, 2024)

interface IOFACOracle {
    function isSanctioned(address wallet) external view returns (bool);
    function isSDN(bytes32 entityNameHash) external view returns (bool);
    function getSanctionProgram(address wallet) external view returns (bytes32[] memory);
    // Programs: UKRAINE-EO13661, IRAN, CUBA, NORTH-KOREA, SYRIA, etc.
}

// OFAC: even 50%+ owned entities of SDNs are effectively sanctioned (50% rule)
interface IOFACBeneficialOwnership {
    function hasSanctionedUBO(address entity) external view returns (bool);
}

modifier ofacCheck(address party) {
    require(!ofacOracle.isSanctioned(party), "OFAC: SDN list match");
    require(!ofacOracle.hasSanctionedUBO(party), "OFAC: sanctioned UBO detected");
    _;
}

event OFACHit(address indexed party, bytes32[] programs, uint256 timestamp);
```

---

## Travel Rule — FinCEN / FATF Implementation

```solidity
// FinCEN Travel Rule: applies to transfers ≥$3,000 (bank wire equivalent)
// FATF recommendation: crypto Travel Rule for transfers ≥$1,000 / €1,000 / equivalent
// US VASPs must pass originator + beneficiary info to receiving VASP

uint256 constant TRAVEL_RULE_THRESHOLD_USD = 3_000e18; // $3,000

struct TravelRulePayload {
    // Originator information
    bytes32 originatorNameHash;         // Hashed full legal name
    bytes32 originatorAccountHash;      // Hashed account number / wallet address
    bytes32 originatorPhysicalAddrHash; // Hashed physical address
    bytes32 originatorDOBHash;          // Hashed date of birth (or national ID hash)

    // Beneficiary information
    bytes32 beneficiaryNameHash;
    bytes32 beneficiaryAccountHash;

    // VASP identifiers
    bytes32 originatorVASPId;           // LEI or other identifier
    bytes32 beneficiaryVASPId;

    // Transfer details
    uint256 transferAmountUSD;
    bytes32 transferRef;                // Unique transfer reference
    uint256 timestamp;
}

// Travel Rule data transmitted peer-to-peer between VASPs via:
// - OpenVASP protocol
// - TRISA (Travel Rule Information Sharing Architecture)
// - Sygna Bridge, Notabene, VerifyVASP, etc.
// On-chain: only store reference hash — full PII transmitted off-chain

mapping(bytes32 => bytes32) public travelRuleRefs; // txHash → payload hash

event TravelRuleTransmitted(
    bytes32 indexed txHash,
    bytes32 payloadHash,
    bytes32 receivingVASPId,
    uint256 amount
);

function transferWithTravelRule(
    address to,
    uint256 amount,
    bytes32 travelRulePayloadHash,
    bytes32 receivingVASPId
) external onlyRegisteredMSB {
    require(travelRulePayloadHash != bytes32(0), "TravelRule: payload hash required");

    bytes32 txHash = keccak256(abi.encodePacked(msg.sender, to, amount, block.timestamp));
    travelRuleRefs[txHash] = travelRulePayloadHash;

    emit TravelRuleTransmitted(txHash, travelRulePayloadHash, receivingVASPId, amount);
    _transfer(msg.sender, to, amount);
}
```

---

## SAR / CTR Filing Triggers

```solidity
// CTR (Currency Transaction Report): filed for cash transactions >$10,000
// SAR (Suspicious Activity Report): filed for suspicious activity ≥$5,000
// Both filed with FinCEN within 30 days (SAR) or 15 days (CTR) of detection

uint256 constant CTR_THRESHOLD = 10_000e18;  // $10,000
uint256 constant SAR_THRESHOLD = 5_000e18;   // $5,000

// Structuring: deliberately breaking transactions into <$10k amounts to avoid CTR
// Structuring is a federal crime (31 USC §5324) regardless of source of funds
// On-chain: detect patterns suggesting structuring

uint256 constant STRUCTURING_WINDOW = 24 hours;
uint256 constant STRUCTURING_PATTERN_COUNT = 3; // 3+ transactions in window near threshold

struct TransactionPattern {
    uint256 windowStart;
    uint256 totalVolume;
    uint256 transactionCount;
    uint256 largestSingle;
}

mapping(address => TransactionPattern) public txPatterns;

function _detectStructuring(address sender, uint256 amount) internal {
    TransactionPattern storage p = txPatterns[sender];

    if (block.timestamp > p.windowStart + STRUCTURING_WINDOW) {
        p.windowStart = block.timestamp;
        p.totalVolume = 0;
        p.transactionCount = 0;
    }

    p.totalVolume += amount;
    p.transactionCount++;
    if (amount > p.largestSingle) p.largestSingle = amount;

    // Flag if: total would be >$10k but individual transactions stay <$10k
    bool possibleStructuring = p.totalVolume >= CTR_THRESHOLD &&
        p.largestSingle < CTR_THRESHOLD &&
        p.transactionCount >= STRUCTURING_PATTERN_COUNT;

    if (possibleStructuring) {
        emit SuspiciousActivityDetected(
            sender,
            "POSSIBLE_STRUCTURING",
            p.totalVolume,
            block.timestamp
        );
        pendingSARReview[sender] = true;
    }
}

mapping(address => bool) public pendingSARReview;
event SuspiciousActivityDetected(address indexed party, string reason, uint256 amount, uint256 timestamp);
```

---

## Enhanced Due Diligence (EDD) Triggers

```solidity
// FinCEN: EDD required for:
// 1. PEPs (Politically Exposed Persons) and their families/close associates
// 2. High-risk jurisdictions (FATF grey/black list, OFAC-designated countries)
// 3. Unusual transaction patterns
// 4. Shell companies / complex ownership structures
// 5. Cash-intensive businesses

enum RiskRating { LOW, MEDIUM, HIGH, UNACCEPTABLE }

struct CustomerRiskProfile {
    RiskRating rating;
    bool isPEP;
    bool isPEPFamily;                   // Immediate family of PEP
    bool isPEPCloseAssociate;           // Known business partner of PEP
    bytes2 countryOfResidence;          // ISO 3166
    bool isHighRiskCountry;
    bool isCashIntensiveBusiness;
    uint256 lastEDDDate;
    uint256 eddRenewalRequired;         // EDD must be refreshed (typically annually)
    bytes32 eddDocumentsCID;            // IPFS CID of EDD documentation
}

// FATF high-risk and monitored jurisdictions (grey list / black list)
// Updated periodically — use off-chain oracle for current list
interface IFATFOracle {
    function isBlacklisted(bytes2 country) external view returns (bool);   // Iran, North Korea, Myanmar
    function isGreylisted(bytes2 country) external view returns (bool);    // Enhanced monitoring
}

modifier eddRequired(address customer) {
    CustomerRiskProfile storage profile = riskProfiles[customer];
    if (profile.rating == RiskRating.HIGH) {
        require(
            profile.lastEDDDate > 0 &&
            block.timestamp < profile.eddRenewalRequired,
            "AML: EDD expired or not completed for high-risk customer"
        );
    }
    require(profile.rating != RiskRating.UNACCEPTABLE, "AML: customer risk unacceptable");
    _;
}
```

---

## Beneficial Ownership (FinCEN CDD Rule)

```solidity
// FinCEN CDD Rule (2016): identify beneficial owners of legal entity customers
// Beneficial owner: individual owning ≥25% OR single individual with significant control
// "Control prong": one individual who controls / manages the entity

struct BeneficialOwnerRecord {
    bytes32 nameHash;
    bytes32 dobHash;
    bytes32 addressHash;
    bytes32 idDocumentHash;             // Passport / Driver's license hash
    uint256 ownershipPct;               // Scaled 1e4 (e.g. 2500 = 25.00%)
    bool isControlProng;                // True for the control individual
    uint256 verificationDate;
    bytes32 verificationDocCID;
}

uint256 constant BO_OWNERSHIP_THRESHOLD = 2500; // 25% threshold

// Must collect BO info for all legal entity customers
// Refresh: on "trigger events" (merger, new 25%+ shareholder, etc.)
mapping(address => BeneficialOwnerRecord[]) public beneficialOwners;

function addBeneficialOwner(address entity, BeneficialOwnerRecord calldata bo)
    external onlyRole(COMPLIANCE_ROLE) {
    require(
        bo.ownershipPct >= BO_OWNERSHIP_THRESHOLD || bo.isControlProng,
        "CDD: below 25% threshold and not control prong"
    );
    require(bo.verificationDocCID != bytes32(0), "CDD: verification document required");
    beneficialOwners[entity].push(bo);
    emit BeneficialOwnerAdded(entity, bo.ownershipPct, bo.isControlProng);
}
```

---

## Transaction Monitoring — Velocity & Pattern Rules

```solidity
// Common rule-based transaction monitoring patterns:

// Rule 1: Large single transaction
uint256 constant LARGE_TX_ALERT = 50_000e18; // $50,000

// Rule 2: Rapid succession of transfers (layering detection)
uint256 constant RAPID_TRANSFER_WINDOW = 1 hours;
uint256 constant RAPID_TRANSFER_COUNT = 5;

// Rule 3: Round number transactions (structuring indicator)
uint256 constant ROUND_NUMBER_MODULUS = 1_000e18; // Divisible by $1,000

// Rule 4: Dormant account suddenly active
uint256 constant DORMANCY_THRESHOLD = 180 days;

// Rule 5: Cross-border transfers to high-risk jurisdictions
// (handled via FATF oracle check above)

function _runTransactionMonitoring(
    address from,
    address to,
    uint256 amount
) internal {
    // Rule 1: Large transaction
    if (amount >= LARGE_TX_ALERT) {
        emit AlertRaised(from, "LARGE_TRANSACTION", amount);
    }

    // Rule 3: Round number
    if (amount % ROUND_NUMBER_MODULUS == 0 && amount >= 10_000e18) {
        emit AlertRaised(from, "ROUND_NUMBER_TRANSACTION", amount);
    }

    // Rule 4: Dormant account
    if (block.timestamp > lastActivity[from] + DORMANCY_THRESHOLD && amount >= SAR_THRESHOLD) {
        emit AlertRaised(from, "DORMANT_ACCOUNT_ACTIVITY", amount);
    }

    lastActivity[from] = block.timestamp;

    // Structuring detection
    _detectStructuring(from, amount);
}

mapping(address => uint256) public lastActivity;
event AlertRaised(address indexed party, string ruleTriggered, uint256 amount);
```
