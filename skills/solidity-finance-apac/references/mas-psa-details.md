# Singapore MAS — Payment Services Act & DPT Framework Reference

## Overview
The Payment Services Act 2019 (PSA), amended in 2021 and 2023, is Singapore's primary
crypto regulation. Administered by the Monetary Authority of Singapore (MAS).

---

## PSA Licence Types

```solidity
enum MASLicenceType {
    NONE,
    SPI,    // Standard Payment Institution: limited transaction volumes
    MPI,    // Major Payment Institution: unlimited volumes, broader activities
    EXEMPT  // Certain exemptions apply (e.g. intragroup, incidental business)
}

// SPI volume limits:
// Monthly transaction volume: ≤ S$3M per payment service
// Daily float: ≤ S$5M

// MPI: no volume limits; covers all 7 payment services

uint256 constant SPI_MONTHLY_LIMIT = 3_000_000e18;  // S$3M/month
uint256 constant SPI_FLOAT_LIMIT = 5_000_000e18;    // S$5M daily float

// 7 Payment Services requiring licensing:
// 1. Account issuance service
// 2. Domestic money transfer service
// 3. Cross-border money transfer service
// 4. Merchant acquisition service
// 5. E-money issuance service
// 6. Digital payment token (DPT) service ← crypto
// 7. Money-changing service

enum PaymentServiceType {
    ACCOUNT_ISSUANCE,
    DOMESTIC_MONEY_TRANSFER,
    CROSS_BORDER_TRANSFER,
    MERCHANT_ACQUISITION,
    EMONEY_ISSUANCE,
    DPT_SERVICE,            // Crypto exchange / wallet / OTC
    MONEY_CHANGING
}
```

---

## MAS Notices for DPT Service Providers

```solidity
// PSN01: Prevention of Money Laundering and Countering the Financing of Terrorism
// PSN02: Technology Risk Management
// PSN03: Reporting of Cyber Incidents and Disclosure of Technology-Related Information (proposed)

// PSN01 Key Requirements:

// 1. Customer Due Diligence
// Individual: verify name, NRIC/FIN/passport, date of birth, address
// Corporate: verify UEN, registered address, UBOs ≥25%

struct MASCDDRecord {
    address customer;
    bytes32 idDocumentHash;
    bool isIndividual;
    bytes32 nricOrPassportHash;
    bytes32 corpUENHash;            // Singapore UEN for corporate customers
    uint256 cddDate;
    uint256 cddRenewalDue;
    MASSRiskLevel riskLevel;
}

enum MASSRiskLevel { LOW, MEDIUM, HIGH }

// 2. Simplified CDD: allowed for transactions ≤ S$5,000 per day from verified customer
uint256 constant MAS_SDD_THRESHOLD = 5_000e18; // S$5,000/day

// 3. Ongoing monitoring: transactions ≥ S$1,500 must be screened against sanctions
uint256 constant MAS_MONITORING_THRESHOLD = 1_500e18;

// 4. Correspondent relationships: EDD required for cross-border DPT transfers
```

---

## MAS Travel Rule (PSN01 Amendment 2024)

```solidity
// MAS Travel Rule: effective January 2024
// Threshold: S$1,500 (for cross-border transfers) / S$1,500 (domestic)

uint256 constant MAS_TRAVEL_RULE_THRESHOLD = 1_500e18; // S$1,500

struct MASTravelRuleData {
    bytes32 originatorName;
    bytes32 originatorAccountNumber;    // Wallet address or account ID hash
    bytes32 originatorAddress;
    bytes32 beneficiaryName;
    bytes32 beneficiaryAccountNumber;
    bytes32 originatorVASPUEN;          // Singapore UEN of sending VASP
    bytes32 beneficiaryVASPIdentifier;  // LEI or equivalent for receiving VASP
    uint256 transferAmountSGD;
}

// MAS requires VASPs to use interoperable Travel Rule solutions
// Approved solutions: TRISA, OpenVASP, Sygna Bridge
// "Sunrise issue": when counterparty VASP is not yet Travel Rule compliant
// → may still proceed but must flag and apply enhanced monitoring

bool public travelRuleInteroperabilityEnabled;
bytes32 public travelRuleSolutionProvider; // e.g. keccak256("TRISA")
```

---

## MAS Safeguarding Requirements (PSN02)

```solidity
// PSA s.23: Safeguarding obligation for DPT service providers
// Must hold customer assets in trust OR equivalent safeguarding arrangement

// Option 1: Hold in trust with Singapore-licensed bank
// Option 2: Obtain insurance / guarantee from approved entity
// Option 3: Hold in own account but maintain equivalent assets (for e-money)

struct MASafeguardingRecord {
    address safeguardingBank;       // Singapore licensed bank (e.g. DBS, OCBC, UOB)
    bytes32 trustAccountRef;        // Trust account reference number
    uint256 customerFundsHeld;      // Total customer funds (SGD equivalent)
    uint256 lastReconciliationDate;
    bool isSegregated;              // Must be segregated from own funds
    bytes32 auditReportCID;         // Monthly independent audit
}

// MAS: daily reconciliation between customer records and trust account balance
// Discrepancy > 0.5%: must report to MAS within 1 business day

uint256 constant MAS_DISCREPANCY_THRESHOLD_BPS = 50; // 0.5%

function checkSafeguardingCompliance() external view returns (bool, uint256 shortfall) {
    uint256 totalCustomerFunds = _calculateTotalCustomerFunds();
    uint256 safeguardedAmount = safeguardingRecord.customerFundsHeld;

    if (safeguardedAmount >= totalCustomerFunds) return (true, 0);

    uint256 gap = totalCustomerFunds - safeguardedAmount;
    bool isSignificant = gap * 10_000 / totalCustomerFunds > MAS_DISCREPANCY_THRESHOLD_BPS;
    return (!isSignificant, gap);
}
```

---

## MAS Stablecoin Framework (MAS PS-S01, 2023)

```solidity
// Singapore Single-Currency Stablecoin (SCS) framework:
// Applies to: SGD-pegged and G10-currency-pegged stablecoins issued in Singapore
// Must be: MPI licence holder + MAS SCS designation

// SCS Requirements:
// 1. Reserve: 100% in cash, cash equivalents, or sovereign bonds ≤3mo maturity
// 2. Reserve custodian: Singapore-licensed bank or MAS-approved custodian
// 3. Redemption: within 5 business days at par value
// 4. Independent audit: monthly (reserve), annual (operations)
// 5. Disclosure: reserve composition published monthly

uint256 constant SCS_RESERVE_RATIO = 1e18;              // 100%
uint256 constant SCS_REDEMPTION_WINDOW = 5 * 1 days;   // 5 business days

struct SCSSReserveDisclosure {
    uint256 disclosureDate;
    uint256 totalSCSOutstanding;
    uint256 reserveValueSGD;
    uint256 cashPct;                // % in cash
    uint256 cashEquivalentsPct;     // % in cash equivalents (T-bills etc.)
    uint256 sovereignBondPct;       // % in short-term sovereign bonds
    bytes32 auditReportCID;
    address auditor;
}

// MAS SCS label: cannot use "MAS-regulated stablecoin" without MAS SCS designation
bytes32 public masScSDesignationRef;
bool public isMASDesignatedSCS;
```

---

## MAS Technology Risk Management (PSN02 / TRM Guidelines)

```solidity
// MAS TRM Guidelines (2021): cybersecurity requirements for financial institutions
// Key requirements relevant to smart contract systems:

// 1. Security testing: penetration testing annually + after major changes
// 2. Change management: no unilateral changes to production smart contracts
// 3. Incident reporting: material cyber incidents → MAS within 1 hour of awareness
// 4. Third-party risk: due diligence on external smart contract dependencies (e.g. OpenZeppelin)

// MAS "material" cyber incident definition (PSN02 para 4.5):
// - Disruption >2 hours | Data breach >500 customers | Regulatory notification required

uint256 constant MAS_INCIDENT_REPORTING_WINDOW = 1 hours;

event CyberIncidentDetected(
    string incidentType,
    bool isMaterial,
    uint256 detectedAt,
    bytes32 incidentRef
);

// Smart contract upgrade governance: multi-sig with time-lock
uint256 constant UPGRADE_TIMELOCK = 48 hours;   // MAS best practice for critical systems
uint256 constant UPGRADE_MULTISIG_THRESHOLD = 3; // 3-of-5 multi-sig minimum
```
