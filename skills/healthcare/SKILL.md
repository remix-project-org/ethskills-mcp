---
name: healthcare-smartcontract
description: Domain expertise for writing smart contracts in the healthcare industry. Use this skill
  whenever a developer is writing, reviewing, or designing Solidity contracts that touch
  healthcare data, insurance claims, patient records, billing, access control, or drug supply
  chains. Trigger even when the user only mentions healthcare + blockchain tangentially — e.g.,
  "I'm building a patient portal on-chain", "how do I handle insurance claims in a contract",
  "HIPAA and smart contracts", "EHR on Ethereum". Always combine this skill with Solidity
  best practices. Never let a developer ship healthcare contracts without applying this skill.
---

# Healthcare Smart Contract Skill

You are helping developers write smart contracts for the healthcare industry. This domain has
unique legal, privacy, and data architecture constraints that must shape every design decision.
Your job is to enforce those constraints proactively — not wait to be asked.

---

## Core Principle: On-Chain vs. Off-Chain Boundary

**This is the most important rule in healthcare contracts.**

Healthcare data (PII, PHI) must NEVER be stored on a public blockchain. This violates HIPAA,
GDPR, and most regional equivalents. The blockchain stores only:

- Cryptographic hashes (keccak256) of sensitive data
- Access control rules and permissions
- Audit trails (who accessed what, when)
- Financial settlement records (amounts, not diagnoses)
- Status flags and workflow states

Sensitive data lives off-chain in encrypted, access-controlled storage (IPFS+encryption,
AWS HealthLake, Azure Health Data Services, or self-hosted FHIR servers). The contract holds
a content-addressed pointer (hash) to that storage.

**Pattern to always suggest:**
```solidity
// WRONG — never do this
struct Patient {
    string name;
    string diagnosis;
    uint256 dateOfBirth;
}

// CORRECT
struct PatientRecord {
    bytes32 dataHash;        // keccak256 of off-chain FHIR bundle
    string offChainURI;      // encrypted IPFS CID or FHIR server ref
    address dataController;  // GDPR data controller
    uint256 lastUpdated;
    bool isActive;
}
```

---

## Regulatory Framework

### HIPAA (US)
- Protected Health Information (PHI) = any data that could identify a patient + health info
- 18 HIPAA identifiers must NEVER appear on-chain: names, SSN, DOB, addresses, phone, email,
  medical record numbers, health plan numbers, account numbers, certificate numbers, IP
  addresses, URLs, biometric IDs, photos, and any other unique identifier
- Minimum Necessary Rule: contracts should only expose/process the minimum data needed
- Breach notification: your audit trail contract IS your breach notification log
- Business Associate Agreement (BAA): any off-chain vendor storing PHI needs a BAA

### GDPR (EU)
- Right to erasure ("right to be forgotten") — immutable blockchains conflict with this
- Resolution: store only hashes on-chain; off-chain data can be deleted, rendering the
  hash a pointer to nothing — this satisfies GDPR erasure in most interpretations
- Data minimization: only collect/process what's needed for the stated purpose
- Explicit consent must be recorded — consent contracts are a valid use case
- Data controller vs. data processor distinction matters for contract ownership design

### HL7/FHIR (Interoperability Standard)
- FHIR R4 is the current standard for healthcare data exchange
- Key FHIR resources to know: Patient, Practitioner, Organization, Encounter, Claim,
  Coverage, ExplanationOfBenefit, Observation, MedicationRequest
- Off-chain data should be structured as FHIR bundles when possible
- The hash stored on-chain should be of the canonical FHIR JSON representation

---

## Canonical Use Cases & Patterns

### 1. Patient Data Access Control
**Problem:** Patient controls who can read their health records.
**Pattern:** Token-gated access with revocation.

```solidity
contract PatientAccessControl {
    // patient => provider => expiry timestamp
    mapping(address => mapping(address => uint256)) public accessGrants;
    
    event AccessGranted(address indexed patient, address indexed provider, uint256 expiry);
    event AccessRevoked(address indexed patient, address indexed provider);

    function grantAccess(address provider, uint256 durationSeconds) external {
        accessGrants[msg.sender][provider] = block.timestamp + durationSeconds;
        emit AccessGranted(msg.sender, provider, block.timestamp + durationSeconds);
    }

    function revokeAccess(address provider) external {
        delete accessGrants[msg.sender][provider];
        emit AccessRevoked(msg.sender, provider);
    }

    function hasAccess(address patient, address provider) public view returns (bool) {
        return accessGrants[patient][provider] > block.timestamp;
    }
}
```

Key points: access is time-bounded, revocable, and patient-controlled. The audit trail
is in the events — never store PHI in event data either.

---

### 2. Insurance Claims Lifecycle
**Problem:** Automate claims from submission → adjudication → payment.
**Stages:** Submitted → UnderReview → Approved/Denied → Paid/Appealed

```solidity
enum ClaimStatus { Submitted, UnderReview, Approved, Denied, Paid, Appealed }

struct Claim {
    bytes32 claimDataHash;      // hash of off-chain FHIR Claim resource
    address patient;
    address provider;
    address insurer;
    uint256 amountRequested;    // in smallest currency unit (e.g., cents)
    uint256 amountApproved;
    ClaimStatus status;
    uint256 submittedAt;
    uint256 resolvedAt;
}
```

**Key design decisions to always raise:**
- Use cents/wei-equivalent integers, never floats for amounts
- Role-based access: only insurer can adjudicate, only provider can submit
- Add a dispute window before final payment settlement
- Consider a timelock on large payments

---

### 3. Prior Authorization Workflow
**Problem:** Provider requests insurer approval before a procedure.
**Pattern:** Multi-party sign-off with deadline enforcement.

```solidity
struct PriorAuth {
    bytes32 requestHash;    // hash of procedure + diagnosis codes (ICD-10/CPT)
    address provider;
    address insurer;
    address patient;
    uint256 requestedAt;
    uint256 deadline;       // insurer must respond by this timestamp
    bool approved;
    bool resolved;
}
```

Always enforce the deadline: if insurer doesn't respond by `deadline`, auto-approve or
escalate — mirror real-world regulations (most US states mandate 72h turnaround).

---

### 4. Drug Supply Chain Provenance
**Problem:** Track a drug batch from manufacturer to patient to prevent counterfeits.
**Pattern:** NFT-style token per batch with custody transfers.

```solidity
struct DrugBatch {
    bytes32 batchHash;          // hash of: NDC code + lot number + expiry + manufacturer
    address currentCustodian;
    uint256 manufacturedAt;
    uint256 expiresAt;
    bool recalled;
    address[] custodyChain;     // full chain: manufacturer → distributor → pharmacy
}
```

Key: `recalled` flag must be settable by manufacturer and regulators (FDA/EMA).
Always emit events on custody transfer for off-chain indexing.

---

### 5. Consent Management
**Problem:** Record patient consent for data use (research, sharing, treatment).
**Pattern:** Granular, timestamped, revocable consent registry.

```solidity
struct Consent {
    address patient;
    bytes32 purposeHash;    // hash of the consent purpose (e.g., "clinical_trial_X")
    uint256 grantedAt;
    uint256 expiresAt;      // 0 = indefinite
    bool active;
}
```

Consent must be: specific (not blanket), time-bounded, and revocable at any time.

---

## Common Anti-Patterns — Always Flag These

| Anti-Pattern | Why It's Wrong | Fix |
|---|---|---|
| Storing patient name/DOB on-chain | HIPAA violation | Store keccak256 hash only |
| Using `string` for medical codes | Gas-inefficient, inconsistent | Use `bytes32` for ICD-10/CPT/NDC |
| Centralized oracle for claim data | Single point of failure + manipulation | Use Chainlink or multi-oracle |
| No access expiry on data grants | Violates minimum necessary rule | Always add `expiresAt` |
| Float arithmetic for billing amounts | Precision errors in financial settlement | Use integer cents |
| Storing IP addresses in events | HIPAA identifier | Never log any of the 18 identifiers |
| Upgradeable proxy without timelock | Admin can change rules mid-claim | Add governance timelock |
| No emergency pause | Can't respond to breaches | Implement Pausable pattern |

---

## Role Architecture

Every healthcare contract should define these roles explicitly (use OpenZeppelin AccessControl):

```solidity
bytes32 public constant PATIENT_ROLE = keccak256("PATIENT");
bytes32 public constant PROVIDER_ROLE = keccak256("PROVIDER");       // doctor/hospital
bytes32 public constant INSURER_ROLE = keccak256("INSURER");
bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR");     // FDA, CMS, state
bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR");         // read-only audit
```

Patient always has sovereign control over their own data.
Regulator can pause contracts and flag recalls.
Auditor has read-only access — never write permissions.

---

## Gas Optimization Notes for Healthcare Contracts

- Claims and records are written infrequently but read often → optimize for read with mappings
- Batch claim processing: use array inputs and loop carefully (watch block gas limit)
- `bytes32` for all codes (ICD-10, CPT, NDC, NPI) — never `string`
- Pack struct fields by size to minimize storage slots
- Use events for audit trails, not storage — events are ~8x cheaper and sufficient for logs

---

## Reference Files

For deeper detail, read these when needed:

- `references/regulatory-detail.md` — Full HIPAA/GDPR rule breakdown with contract implications
- `references/fhir-data-models.md` — FHIR R4 resource structures mapped to Solidity structs
- `references/claims-lifecycle.md` — Full claims state machine with all edge cases
