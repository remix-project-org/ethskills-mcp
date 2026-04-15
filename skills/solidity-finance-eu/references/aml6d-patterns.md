# AML6D — 6th Anti-Money Laundering Directive Patterns Reference

## Overview
6AMLD (Directive 2018/1673) extended EU AML rules by:
- Expanding predicate offences to 22 categories (cybercrime added)
- Criminal liability for legal persons (companies)
- Extended jurisdiction (offences committed partly in EU)
- Tougher penalties: min. 4 years imprisonment

Combined with AMLD5 (Directive 2018/843) which brought crypto exchanges and custodians
into scope as "obliged entities."

---

## Obliged Entities (Crypto — AMLD5/6AMLD)

```solidity
// Crypto exchanges and custodian wallet providers are obliged entities
// Must: register with national FIU, implement CDD/EDD, file STRs (Suspicious Transaction Reports)

enum EUObligedEntityType {
    CREDIT_INSTITUTION,
    FINANCIAL_INSTITUTION,
    CRYPTO_EXCHANGE,                // Exchange of crypto for fiat or crypto for crypto
    CUSTODIAN_WALLET_PROVIDER,      // Safekeeping of private keys
    TRUST_COMPANY,
    REAL_ESTATE_AGENT,
    AUDITOR_ACCOUNTANT,
    TAX_ADVISOR
}

interface IEUFIURegistry {
    // National FIU (Financial Intelligence Unit) registration
    // e.g. TRACFIN (France), FIU-NL (Netherlands), BaFin (Germany for crypto)
    function isRegistered(address entity, bytes2 memberState) external view returns (bool);
    function getRegistrationRef(address entity) external view returns (bytes32);
}
```

---

## 22 Predicate Offences (6AMLD — Art. 2)

```solidity
// ML is a criminal offence when proceeds come from ANY of these:
bytes32[] public predicateOffences = [
    keccak256("TERRORISM"),
    keccak256("HUMAN_TRAFFICKING"),
    keccak256("SEXUAL_EXPLOITATION"),
    keccak256("ILLICIT_DRUG_TRAFFICKING"),
    keccak256("ILLICIT_ARMS_TRAFFICKING"),
    keccak256("CORRUPTION_BRIBERY"),
    keccak256("FRAUD"),
    keccak256("COUNTERFEITING"),
    keccak256("FORGERY"),
    keccak256("PIRACY"),
    keccak256("CYBERCRIME"),         // NEW in 6AMLD — includes ransomware, hacking
    keccak256("ENVIRONMENTAL_CRIME"),
    keccak256("MURDER"),
    keccak256("KIDNAPPING"),
    keccak256("ROBBERY_THEFT"),
    keccak256("SMUGGLING"),
    keccak256("EXTORTION"),
    keccak256("COUNTERFEITING_CURRENCY"),
    keccak256("TAX_CRIME"),          // Included in most member states
    keccak256("MARKET_MANIPULATION"),
    keccak256("INSIDER_TRADING"),
    keccak256("ORGANISED_CRIME")
];

// On-chain: flag transactions linked to known predicate offences
mapping(address => bytes32) public knownOffenceLink; // wallet → predicate offence hash
event PredicateOffenceFlagged(address indexed wallet, bytes32 offence, uint256 timestamp);
```

---

## EU CDD — Customer Due Diligence Levels

```solidity
// AMLD5 Art. 13: Standard CDD required for all customers
// AMLD5 Art. 14: Simplified CDD for low-risk situations
// AMLD5 Art. 18-24: Enhanced CDD for high-risk situations

enum EUCDDLevel { SIMPLIFIED, STANDARD, ENHANCED }

struct EUCustomerProfile {
    EUCDDLevel cddLevel;
    bytes2 countryOfResidence;      // ISO 3166
    bool isPEP;                     // Politically Exposed Person (Art. 20 AMLD5)
    bool isPEPFamily;
    bool isPEPCloseAssociate;
    bool isHighRiskThirdCountry;    // Art. 18a — EBA high-risk third country list
    uint256 cddCompletedDate;
    uint256 cddRenewalDue;
    bytes32 cddDocumentsCID;
    bool isOngoingMonitoringActive;
}

// AMLD5 Art. 18a: Enhanced CDD mandatory for high-risk third countries
// EU Commission publishes list — includes Iran, North Korea, high-risk jurisdictions
interface IEUHighRiskCountryOracle {
    function isHighRiskThirdCountry(bytes2 country) external view returns (bool);
    function isEUMemberState(bytes2 country) external view returns (bool);
}

// Simplified CDD allowed for: e-money products ≤€150 per month, low-risk products
uint256 constant SIMPLIFIED_CDD_THRESHOLD_EUR = 150e18; // €150/month
```

---

## PEP Identification & Enhanced Due Diligence

```solidity
// AMLD5 defines PEPs as individuals entrusted with prominent public functions:
// Heads of state, government ministers, members of parliament, judges of supreme courts,
// members of courts of auditors, central bank governors, ambassadors,
// senior military officers, members of governing boards of state-owned enterprises,
// directors of international organisations

enum PEPCategory {
    HEAD_OF_STATE,
    GOVERNMENT_MINISTER,
    MEMBER_OF_PARLIAMENT,
    SUPREME_COURT_JUDGE,
    CENTRAL_BANK_GOVERNOR,
    AMBASSADOR,
    SENIOR_MILITARY,
    SOE_BOARD_MEMBER,
    INTERNATIONAL_ORG_DIRECTOR
}

struct PEPRecord {
    address wallet;
    PEPCategory category;
    bytes2 country;                 // Country where position held
    bool isFormerPEP;               // Former PEPs: at least 12 months EDD after leaving
    uint256 positionEndDate;        // If former PEP
    bytes32 eddApprovalRef;         // Senior management approval required for PEP business
}

// AMLD5 Art. 20: PEP business requires SENIOR MANAGEMENT APPROVAL
modifier pepApprovalRequired(address customer) {
    if (pepRegistry.isPEP(customer)) {
        require(
            seniorMgmtApprovals[customer].approvedBy != address(0),
            "6AMLD: senior management approval required for PEP"
        );
        require(
            block.timestamp < seniorMgmtApprovals[customer].approvalExpiry,
            "6AMLD: senior management approval expired"
        );
    }
    _;
}

struct SeniorMgmtApproval {
    address approvedBy;
    uint256 approvalDate;
    uint256 approvalExpiry;         // Annual renewal typically required
    bytes32 approvalDocCID;
}

mapping(address => SeniorMgmtApproval) public seniorMgmtApprovals;
```

---

## EU Beneficial Ownership Register

```solidity
// AMLD5: member states must maintain public central BO registers
// AMLD5 Art. 30: legal entities — UBO must be registered in national register
// AMLD5 Art. 31: trusts — UBO register (not always public)

// EU UBO threshold: 25% ownership or control
uint256 constant EU_UBO_THRESHOLD_BPS = 2500; // 25%

// "Fallback" UBO: if no natural person owns/controls ≥25%,
// the senior managing official is treated as UBO (Art. 3(6)(a)(ii))

struct EUBeneficialOwner {
    bytes32 nameHash;
    bytes32 countryOfResidenceHash;
    bytes32 dobHash;
    bytes32 nationalityHash;
    uint256 ownershipPct;           // Scaled 1e4
    bool isControllingInterest;
    bool isFallbackUBO;             // True if no 25%+ owner — senior official
    bytes32 nationalBoRegisterRef;  // Reference in national UBO register
    uint256 registrationDate;
}

// Discrepancy reporting: AMLD5 Art. 30(5b) — obliged entities must report discrepancies
// between their own BO records and national UBO register
event BODiscrepancyDetected(
    address indexed entity,
    bytes32 onChainUBOHash,
    bytes32 nationalRegisterUBOHash,
    uint256 timestamp
);

function reportBODiscrepancy(
    address entity,
    bytes32 nationalRegisterUBOHash
) external onlyRole(COMPLIANCE_ROLE) {
    bytes32 onChainHash = _computeUBOHash(entity);
    if (onChainHash != nationalRegisterUBOHash) {
        emit BODiscrepancyDetected(entity, onChainHash, nationalRegisterUBOHash, block.timestamp);
        // Must report to national FIU
    }
}
```

---

## EU Travel Rule (TFR 2023 — Transfer of Funds Regulation Recast)

```solidity
// TFR (EU 2023/1113): applies to ALL crypto transfers regardless of amount
// No de minimis threshold (unlike US $3,000 threshold)
// Effective from 30 December 2024

// For transfers between two EU VASPs: full originator + beneficiary data required
// For transfers from EU VASP to self-hosted wallet:
//   ≥€1,000: collect info + verify wallet belongs to customer
//   <€1,000: collect info (no verification)

uint256 constant TFR_VERIFICATION_THRESHOLD_EUR = 1_000e18; // €1,000

struct TFRPayload {
    // Originator (sender)
    bytes32 originatorNameHash;
    bytes32 originatorAccountId;    // e.g. IBAN hash or wallet address
    bytes32 originatorAddressHash;
    bytes32 originatorDOBHash;      // OR national ID number hash
    bytes32 originatorLEIHash;      // If legal entity

    // Beneficiary (recipient)
    bytes32 beneficiaryNameHash;
    bytes32 beneficiaryAccountId;

    // VASP identifiers (must use LEI or BIC)
    bytes32 originatorVASPLEI;
    bytes32 beneficiaryVASPLEI;

    // Transfer details
    uint256 amountEUR;
    bytes32 transferRef;
    bool isSelfHostedWallet;        // True if beneficiary is non-custodial
}

// Self-hosted wallet transfers ≥€1,000: must verify wallet ownership
// Acceptable methods: cryptographic signature, micro-transaction, attestation
interface ISelfHostedWalletVerifier {
    function isVerifiedOwner(address wallet, address customer) external view returns (bool);
    function requestOwnershipProof(address wallet, address customer) external returns (bytes32 challengeRef);
}

mapping(bytes32 => bytes32) public tfrRefs; // txHash → TFR payload hash

function transferTFRCompliant(
    address to,
    uint256 amount,
    bytes32 tfrPayloadHash,
    bool isSelfHostedWallet
) external {
    require(tfrPayloadHash != bytes32(0), "TFR: payload required for all transfers");

    if (isSelfHostedWallet && amount >= TFR_VERIFICATION_THRESHOLD_EUR) {
        require(
            selfHostedVerifier.isVerifiedOwner(to, msg.sender),
            "TFR: self-hosted wallet ownership verification required for >=€1,000"
        );
    }

    bytes32 txHash = keccak256(abi.encodePacked(msg.sender, to, amount, block.timestamp));
    tfrRefs[txHash] = tfrPayloadHash;
    _transfer(msg.sender, to, amount);
}
```

---

## STR / SAR Filing — EU Requirements

```solidity
// STR (Suspicious Transaction Report) must be filed with national FIU
// Timeline: immediately on suspicion (before or after transaction)
// EU FIUs: Egmont Group members — all EU member states

// Tipping-off prohibition: CANNOT tell customer that STR has been filed
// On-chain: flag for off-chain STR filing WITHOUT blocking (to avoid tipping-off)

mapping(address => bool) private _strFlagInternal; // private — not publicly readable
uint256 private _strFlagCount;

// Do NOT emit events that would reveal STR filing to the customer
function _flagForSTRReview(address customer) internal {
    _strFlagInternal[customer] = true;
    _strFlagCount++;
    // Off-chain system monitors this via compliance role only
}

// Compliance officers can check flag via role-restricted function
function isSTRFlagged(address customer) external view onlyRole(COMPLIANCE_ROLE) returns (bool) {
    return _strFlagInternal[customer];
}
```
