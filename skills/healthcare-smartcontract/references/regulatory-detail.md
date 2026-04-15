# Regulatory Detail Reference

## HIPAA Deep Dive

### The 18 PHI Identifiers (never put these on-chain)
1. Names
2. Geographic data smaller than state (street, city, zip, county, precinct)
3. Dates (except year) — DOB, admission, discharge, death dates, ages over 89
4. Phone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers and serial numbers (including license plates)
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers (fingerprints, voice prints)
17. Full-face photos and comparable images
18. Any other unique identifying number, characteristic, or code

### Safe Harbor De-identification
If ALL 18 identifiers are removed AND there's no actual knowledge the remaining info
could identify an individual → the data is de-identified and not subject to HIPAA.
This de-identified data CAN be stored on-chain if truly de-identified.

### Minimum Necessary Standard
- Covered entities must make reasonable efforts to limit PHI to minimum necessary
- Translate to contracts: access grants should be scoped to specific data types,
  not blanket "all records" grants
- Implement data-type flags in access grants:
  ```solidity
  struct AccessGrant {
      bool labResults;
      bool medications;
      bool diagnoses;
      bool billingInfo;
      uint256 expiry;
  }
  ```

### Business Associate Agreements (BAA)
- Any off-chain vendor processing PHI on behalf of a covered entity needs a BAA
- This is a legal contract, not a smart contract
- In your system design: document which off-chain components need BAAs
- Cloud providers (AWS, Azure, GCP) offer HIPAA-eligible services with BAAs

---

## GDPR Deep Dive

### Lawful Basis for Processing
Healthcare data requires explicit consent OR vital interests OR legal obligation.
Your consent contract should record which lawful basis applies.

### Right to Erasure — Blockchain Conflict Resolution
GDPR Art. 17 requires deletion on request. Immutable blockchains can't delete.
Accepted solutions:
1. **Hash invalidation**: Delete off-chain data, the on-chain hash becomes a dead pointer
2. **Encryption key deletion**: Encrypt all personal data, delete the encryption key
3. **Pseudonymization**: Replace identifiers with pseudonyms, delete the mapping table

Most EU regulators accept approaches 1 and 2 for blockchain use cases.

### Data Protection Impact Assessment (DPIA)
Required for large-scale processing of health data. When helping developers,
remind them that launching a healthcare contract system may require a DPIA before
going to production in the EU.

### Cross-Border Transfers
Health data of EU citizens cannot be transferred to non-adequate countries without
safeguards (Standard Contractual Clauses, etc.). If your off-chain storage is in the US,
this matters.

---

## US State Regulations Worth Knowing

### California (CMIA + CCPA)
- Confidentiality of Medical Information Act (CMIA) — stricter than HIPAA in some areas
- CCPA gives consumers rights over personal data similar to GDPR
- California Consumer Health Data Act (2023) — requires consent for collection/sharing

### New York (SHIELD Act)
- Requires reasonable safeguards for private information
- Health information is in scope

### Texas, Florida, Washington
- All have health data privacy laws with varying requirements
- Washington My Health MY Data Act (2023) — very broad definition of health data

**Practical advice for bootcamp devs**: design for HIPAA + GDPR compliance and you'll
satisfy most US state requirements as a byproduct.
