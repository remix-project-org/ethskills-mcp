# FHIR R4 Data Models → Solidity Mapping

## Key FHIR Resources and Their On-Chain Representation

FHIR resources are stored off-chain as JSON bundles. On-chain, we store only
hashes and workflow-relevant fields.

---

### Patient Resource
**Off-chain FHIR fields**: name, birthDate, gender, address, telecom, identifier (MRN)
**On-chain representation**:
```solidity
struct PatientRecord {
    bytes32 fhirBundleHash;     // keccak256 of canonical FHIR Patient JSON
    address patientWallet;      // self-sovereign identity
    address dataController;     // hospital/clinic as GDPR data controller
    uint256 registeredAt;
    bool active;
}
mapping(bytes32 => PatientRecord) public patients; // key = keccak256(MRN + organizationId)
```

---

### Claim Resource
**Off-chain FHIR fields**: patient, provider, insurer, items (procedures/diagnoses),
  total amounts, supporting info
**On-chain representation**:
```solidity
struct FHIRClaim {
    bytes32 claimBundleHash;
    bytes32 patientRef;         // keccak256(MRN + orgId) — never raw MRN
    address providerNPI;        // NPI as address or bytes32
    address insurerAddress;
    uint256 totalAmountCents;
    uint256 serviceDate;        // unix timestamp of service (date only, not time)
    ClaimStatus status;
}
```

---

### Coverage Resource (Insurance)
**Off-chain fields**: subscriber, beneficiary, payer, plan details, coverage period
**On-chain representation**:
```solidity
struct Coverage {
    bytes32 coverageHash;
    address subscriber;         // wallet of policy holder
    address insurer;
    uint256 coverageStart;
    uint256 coverageEnd;
    bool active;
}
```

---

### Observation Resource (Lab Results, Vitals)
**Off-chain fields**: patient, code (LOINC), value, units, effectiveDateTime, status
**On-chain representation**: Usually only the hash + access control.
Lab results should almost never have any fields on-chain beyond the hash.
```solidity
struct ObservationRef {
    bytes32 observationHash;
    bytes32 patientRef;
    uint256 observedAt;         // date only if needed for billing
    address orderingProvider;
}
```

---

### MedicationRequest Resource
**Off-chain fields**: patient, medication (RxNorm code), dosage, prescriber, pharmacy
**On-chain use case**: Drug supply chain + e-prescribing
```solidity
struct Prescription {
    bytes32 rxHash;             // hash of full MedicationRequest
    bytes32 patientRef;
    bytes32 medicationCode;     // RxNorm code as bytes32
    address prescriber;
    address pharmacy;
    uint256 prescribedAt;
    uint256 expiresAt;
    bool dispensed;
    bool cancelled;
}
```

---

## Standard Code Systems → bytes32 Encoding

Always encode medical codes as `bytes32`, not `string`:

| Code System | Example | Use Case |
|---|---|---|
| ICD-10-CM | E11.9 (Type 2 Diabetes) | Diagnosis codes |
| CPT | 99213 (Office visit) | Procedure codes |
| NDC | 0069-0296-03 | Drug identification |
| NPI | 1234567890 | Provider identifier |
| LOINC | 2345-7 (Glucose) | Lab test codes |
| RxNorm | 860975 | Medication codes |
| SNOMED CT | 44054006 | Clinical concepts |

```solidity
// Encoding pattern
bytes32 public constant ICD10_TYPE2_DIABETES = keccak256("ICD10:E11.9");
bytes32 public constant CPT_OFFICE_VISIT_99213 = keccak256("CPT:99213");

// Or store as left-padded bytes32
function encodeCode(string memory code) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(code));
}
```
