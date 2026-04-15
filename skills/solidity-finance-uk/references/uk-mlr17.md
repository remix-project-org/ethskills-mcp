# UK MLR17 — CDD/EDD & SAR Obligations Reference

## Overview
The Money Laundering, Terrorist Financing and Transfer of Funds (Information on the Payer)
Regulations 2017 (MLR17) implement EU AMLD4/5 into UK law (retained post-Brexit).
UK AML regime is now independently maintained by HM Treasury, with FCA/HMRC as supervisors.

---

## Obliged Entities Under MLR17

```solidity
// MLR17 Reg. 8: Relevant persons (obliged entities) include:
// - Credit and financial institutions
// - Crypto asset exchange providers (Reg. 14A — added 2019)
// - Custodian wallet providers (Reg. 14A — added 2019)
// - Auditors, accountants, tax advisers
// - Legal professionals
// - Estate agents
// - High-value dealers (cash transactions ≥€10,000)
// - Trust or company service providers

// Crypto businesses must register with FCA under MLR17
// Failure to register: unlimited fine + 2 years imprisonment

interface IFCAMLRRegistry {
    function isMLR17Registered(address entity) external view returns (bool);
    function getRegistrationDate(address entity) external view returns (uint256);
    function isTemporaryRegistered(address entity) external view returns (bool); // Transitional
}
```

---

## Customer Due Diligence (CDD) — MLR17 Reg. 27-38

```solidity
// Three levels of CDD:
// 1. Simplified CDD (SDD): lower risk situations
// 2. Standard CDD: default for all customers
// 3. Enhanced CDD (EDD): higher risk situations (mandatory)

enum UKCDDLevel { SIMPLIFIED, STANDARD, ENHANCED }

// Standard CDD requires (Reg. 28):
// (a) Identify customer using reliable, independent documents
// (b) Identify beneficial owner (≥25% ownership or control)
// (c) Assess and understand purpose of business relationship
// (d) Ongoing monitoring of transactions

struct UKCDDRecord {
    address customer;
    UKCDDLevel level;
    uint256 cddCompletedDate;
    uint256 cddRenewalDue;          // Risk-based; typically 1-3 years
    bytes32 idDocumentHash;         // Hash of verified identity document
    bytes32 addressVerificationHash; // Hash of proof of address document
    bytes32 sourceOfFundsHash;      // For EDD — source of funds / wealth
    bool pepScreeningCompleted;
    bool sanctionsScreeningCompleted;
    bytes32 ofsiScreeningRef;       // OFSI sanctions check reference
    bytes32 cddDocumentsCID;        // IPFS CID of full CDD file
}

// Timing: CDD must be completed BEFORE establishing business relationship
// Exception: during establishment if low risk + necessary to avoid interrupting normal business
// Must complete CDD as soon as practicable if deferred

modifier cddCompleted(address customer) {
    UKCDDRecord storage cdd = cddRecords[customer];
    require(cdd.cddCompletedDate > 0, "MLR17: CDD not completed");
    require(block.timestamp < cdd.cddRenewalDue, "MLR17: CDD renewal required");
    _;
}
```

---

## Enhanced Due Diligence (EDD) — MLR17 Reg. 33-35

```solidity
// EDD mandatory for (Reg. 33):
// (a) High-risk third countries (FATF grey/black list + HMT list)
// (b) Politically Exposed Persons (PEPs)
// (c) Correspondent relationships (bank-to-bank)
// (d) Any situation assessed as higher risk

// EDD for PEPs (Reg. 35):
// - Senior management approval BEFORE establishing relationship
// - Establish source of wealth AND source of funds
// - Enhanced ongoing monitoring

// HMT high-risk third countries list (published under Reg. 33(3)(b)):
// Updated by HMT — distinct from EU Commission list post-Brexit
// Includes: Iran, North Korea, Myanmar, plus FATF-monitored countries
interface IHMTHighRiskCountryList {
    function isHMTHighRisk(bytes2 country) external view returns (bool);
    function isFATFBlacklisted(bytes2 country) external view returns (bool); // Iran, North Korea
    function isFATFGreylisted(bytes2 country) external view returns (bool);  // Enhanced monitoring
}

struct UKEDDRecord {
    address customer;
    bool isPEP;
    bool isPEPFamily;               // Within 12 months of PEP leaving public function
    bytes32 seniorMgmtApprovalRef;  // Required before relationship with PEP
    bytes32 sourceOfWealthHash;     // How wealth was accumulated
    bytes32 sourceOfFundsHash;      // How funds for this specific transaction obtained
    uint256 eddApprovalDate;
    uint256 eddRenewalDue;          // Typically annual for PEPs
    bool isHighRiskCountry;
    bytes32 additionalMeasuresCID;  // Additional verification measures taken
}

// For high-risk third countries: ADDITIONAL measures beyond standard EDD (Reg. 33(3A)):
// - Obtain additional information on customer, BO, intended nature of relationship
// - Obtain senior management approval
// - Conduct enhanced monitoring
// - Obtain information on source of funds/wealth

function applyHighRiskCountryEDD(address customer, bytes2 country)
    external onlyRole(COMPLIANCE_ROLE) {
    require(hmtHighRiskList.isHMTHighRisk(country), "MLR17: country not on HMT high-risk list");
    require(eddRecords[customer].seniorMgmtApprovalRef != bytes32(0),
            "MLR17: senior management approval required for high-risk country EDD");
    eddRecords[customer].isHighRiskCountry = true;
    eddRecords[customer].eddRenewalDue = block.timestamp + 180 days; // 6-month refresh for high-risk
}
```

---

## Simplified CDD — MLR17 Reg. 37

```solidity
// Simplified CDD permitted for low-risk situations (risk-based approach)
// Obliged entity must have assessed risk as genuinely lower

// Low-risk factors (Schedule 2, MLR17):
// - Customer is public authority or listed company
// - Customer is regulated financial institution in EEA/equivalent
// - Low-value transactions (e.g. e-money ≤€150/month, ≤€2,500 p.a.)
// - Geographic: low-risk country (EU member state, EEA)
// - Product: low ML/TF risk product (regular payment product, pension scheme)

uint256 constant EMONEY_SDD_MONTHLY = 150e18;       // €150/month for e-money SDD
uint256 constant EMONEY_SDD_ANNUAL = 2_500e18;      // €2,500/year for e-money SDD
uint256 constant EMONEY_SDD_REDEMPTION = 50e18;     // €50 cash redemption limit for SDD

// Cannot apply SDD if: high-risk indicators present, ML/TF suspicion, discrepancy in info
modifier sddEligibilityCheck(address customer, uint256 monthlyVolume) {
    require(!pepRegistry.isPEP(customer), "MLR17: SDD not available for PEPs");
    require(!hmtHighRiskList.isHMTHighRisk(customerCountry[customer]), "MLR17: SDD not available for high-risk countries");
    require(monthlyVolume <= EMONEY_SDD_MONTHLY, "MLR17: volume exceeds SDD threshold");
    _;
}
```

---

## Suspicious Activity Reports (SARs) — POCA 2002 + TACT 2000

```solidity
// SAR obligations: report to NCA (National Crime Agency) via SARs Online
// Two statutory duties:
// 1. Proceeds of Crime Act 2002 (POCA): report knowledge or suspicion of money laundering
// 2. Terrorism Act 2000 (TACT): report knowledge or suspicion of terrorist financing

// Defence against money laundering (DAML):
// If SAR filed + consent obtained from NCA → "authorised disclosure" protects from liability
// NCA has 7 days to refuse consent (moratorium), otherwise consent deemed given
// Moratorium can be extended to 31 days if NCA applies to court

uint256 constant NCA_CONSENT_WINDOW = 7 days;
uint256 constant NCA_MORATORIUM_PERIOD = 31 days;

struct UKSARRecord {
    bytes32 sarRef;                     // NCA SAR reference number
    bool isDAMLRequest;                 // Requesting consent to proceed
    uint256 filingDate;
    uint256 ncaConsentDeadline;         // 7 days from filing
    bool ncaConsentGranted;
    bool nca MoratoriumExtended;
    uint256 moratoriumExpiry;
    bytes32 suspicionBasis;             // Summary of grounds for suspicion
}

// TIPPING OFF prohibition (POCA s.333A / TACT s.21D):
// Cannot disclose to customer or third party that SAR filed or investigation underway
// "Prejudicing an investigation" is a criminal offence: up to 5 years imprisonment

// On-chain implementation: SAR flags MUST be private
mapping(address => bool) private _sarFiled;

function _markSARFiled(address customer) internal {
    _sarFiled[customer] = true;
    // Do NOT emit events revealing SAR filing
    // Do NOT block transactions in a way that signals SAR filing (tipping-off risk)
}

// Compliance officers only — NOT readable by general public or customer
function hasSARFiled(address customer) external view onlyRole(MLRO_ROLE) returns (bool) {
    return _sarFiled[customer];
}
```

---

## Record Keeping — MLR17 Reg. 40

```solidity
// Retention periods (MLR17 Reg. 40):
// CDD documents: 5 years from end of business relationship
// Transaction records: 5 years from date of transaction
// After 5 years: must DELETE (UK GDPR — data minimisation)

// On-chain: store only document hashes + IPFS CIDs (not PII)
// Off-chain IPFS: must be purged after 5-year retention period
// On-chain hashes: immutable — store as compliance audit trail only

struct RetentionSchedule {
    bytes32 documentCID;
    bytes32 documentType;           // e.g. keccak256("PASSPORT"), keccak256("PROOF_OF_ADDRESS")
    uint256 createdDate;
    uint256 retentionExpiryDate;    // createdDate + 5 years
    bool markedForDeletion;
}

uint256 constant RETENTION_PERIOD = 5 * 365 days; // 5 years

event DocumentRetentionExpiry(bytes32 indexed documentCID, uint256 expiryDate);

function scheduleRetention(bytes32 documentCID, bytes32 docType) external onlyRole(COMPLIANCE_ROLE) {
    uint256 expiry = block.timestamp + RETENTION_PERIOD;
    retentionSchedule[documentCID] = RetentionSchedule({
        documentCID: documentCID,
        documentType: docType,
        createdDate: block.timestamp,
        retentionExpiryDate: expiry,
        markedForDeletion: false
    });
    emit DocumentRetentionExpiry(documentCID, expiry);
}
```

---

## MLRO Responsibilities

```solidity
// Every MLR17-regulated firm must appoint a Money Laundering Reporting Officer (MLRO)
// MLRO: senior management responsibility, nominated officer under POCA

bytes32 public mlroName;                // Hashed full name
address public mlroAddress;            // On-chain address of MLRO
uint256 public mlroAppointmentDate;
bytes32 public mlroFCAApprovalRef;     // If FCA-authorized firm: MLRO is SMF17 function

event MLROAppointed(address indexed mlro, bytes32 nameHash, uint256 appointmentDate);
event MLROChanged(address indexed oldMLRO, address indexed newMLRO, uint256 changeDate);

function appointMLRO(address newMLRO, bytes32 nameHash, bytes32 fcaApprovalRef)
    external onlyRole(BOARD_ROLE) {
    address oldMLRO = mlroAddress;
    mlroAddress = newMLRO;
    mlroName = nameHash;
    mlroAppointmentDate = block.timestamp;
    mlroFCAApprovalRef = fcaApprovalRef;
    emit MLROChanged(oldMLRO, newMLRO, block.timestamp);
}
```
