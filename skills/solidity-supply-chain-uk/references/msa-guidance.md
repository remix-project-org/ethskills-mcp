# UK Modern Slavery Act — Home Office Due Diligence Guidance Reference

## Overview
Modern Slavery Act 2015 (MSA) — Section 54 requires commercial organisations with
annual turnover ≥ £36 million to publish an annual modern slavery statement.
Home Office guidance updated 2021 — 6 mandatory areas that statements must cover.

---

## 6 Mandatory Statement Areas (s.54(5) MSA + 2021 Guidance)

```solidity
// Home Office guidance: statements MUST cover these 6 areas:
// 1. Organisation's structure, business and supply chains
// 2. Policies in relation to slavery and human trafficking
// 3. Due diligence processes in relation to slavery and human trafficking in business and supply chains
// 4. Parts of business and supply chains where there is a risk of slavery and human trafficking
// 5. Key performance indicators to measure effectiveness
// 6. Training about slavery and human trafficking

struct ModernSlaveryStatement {
    uint256 reportingYear;          // Financial year covered
    bytes32 organisationName;       // Hashed
    uint256 annualTurnoverGBP;      // Must be > £36M
    address signatoryDirector;      // Must be signed by director/equivalent
    uint256 signatureDate;
    bytes32 statementCID;           // IPFS CID of published statement
    bool publishedOnGovWebsite;     // Must be published on government registry (from 2021)
    bytes32 govRegistryRef;         // Government Modern Slavery Statement Registry ref

    // The 6 areas (each must be addressed — "N/A" is not acceptable for most)
    bool coversStructureAndChains;
    bool coversPolicies;
    bool coversDueDiligence;
    bool coversRisks;
    bool coversKPIs;
    bool coversTraining;

    // Approval
    bool boardApproved;             // Must be approved by board or equivalent
    uint256 boardApprovalDate;
}

// Statement must be published on company website with prominent link on homepage
// AND submitted to government registry (mandatory from 2021)
// Deadline: within 6 months of financial year end

uint256 constant STATEMENT_DEADLINE_MONTHS = 6;
```

---

## Risk Assessment Framework

```solidity
// Home Office identifies high-risk sectors and geographies

// HIGH-RISK UK SECTORS (Home Office guidance):
bytes32 constant SECTOR_AGRICULTURE_UK = keccak256("UK_AGRICULTURE_HORTICULTURE");
bytes32 constant SECTOR_CONSTRUCTION_UK = keccak256("UK_CONSTRUCTION");
bytes32 constant SECTOR_HOSPITALITY_UK = keccak256("UK_HOSPITALITY_CATERING");
bytes32 constant SECTOR_CARE_UK = keccak256("UK_ADULT_SOCIAL_CARE");
bytes32 constant SECTOR_CLEANING_UK = keccak256("UK_CLEANING_FACILITIES");
bytes32 constant SECTOR_MANUFACTURING_UK = keccak256("UK_GARMENT_MANUFACTURING");
bytes32 constant SECTOR_LOGISTICS_UK = keccak256("UK_LOGISTICS_TRANSPORT");

// HIGH-RISK COUNTRIES (commonly cited in MSA statements):
// Top source countries for modern slavery in UK supply chains:
// India, China, Bangladesh, Vietnam, Pakistan, Thailand, Brazil, Malaysia
// Gulf states (construction, domestic workers)
// Eastern Europe (seasonal agricultural work)

struct SupplyChainRiskMapping {
    bytes32 supplierId;
    bytes32 supplierName;       // Hashed
    bytes2 countryOfOperation;
    bytes32 sector;
    MSARiskLevel riskLevel;
    bytes32[] specificRisks;    // e.g. keccak256("DEBT_BONDAGE"), keccak256("DOCUMENT_CONFISCATION")
    uint256 lastAssessmentDate;
    uint256 nextReviewDue;
}

enum MSARiskLevel { LOW, MEDIUM, HIGH, CRITICAL }
```

---

## Due Diligence Steps

```solidity
// MSA does not prescribe specific due diligence steps — but Home Office guidance recommends:

struct MSADueDiligenceRecord {
    bytes32 supplierId;

    // Supplier engagement
    bool selfAssessmentCompleted;       // Supplier completed MSA questionnaire
    bytes32 selfAssessmentCID;
    uint256 selfAssessmentDate;

    // Audits
    bool auditCompleted;
    AuditType auditType;
    bytes32 auditReportCID;
    address auditFirm;
    uint256 auditDate;
    uint256 nextAuditDue;
    bool auditUnannounced;              // Unannounced audits more effective

    // Training
    bool supplierTrainingProvided;
    uint256 trainedStaffCount;
    bytes32 trainingMaterialCID;

    // Contractual
    bool hasAntiSlaveryContractClause;
    bytes32 contractClauseCID;
    bool hasTerminationRightForBreach;

    // Remediation
    bool findingsRequireRemediation;
    bytes32 remediationPlanCID;
    uint256 remediationDeadline;
}

enum AuditType { DESKTOP, ANNOUNCED, SEMI_ANNOUNCED, UNANNOUNCED, WORKER_INTERVIEW_ONLY }

// Best practice audit standards:
bytes32 constant AUDIT_SMETA = keccak256("SEDEX_SMETA");         // Most common UK/EU
bytes32 constant AUDIT_SA8000 = keccak256("SA8000");
bytes32 constant AUDIT_BSCI = keccak256("BSCI");
bytes32 constant AUDIT_WRAP = keccak256("WRAP");
bytes32 constant AUDIT_FLOCERT = keccak256("FLOCERT_FAIRTRADE");
```

---

## Indicators of Modern Slavery

```solidity
// Home Office: organisations should train staff to identify indicators

bytes32[] public modernslaveryIndicators = [
    keccak256("PERSON_APPEARS_CONTROLLED"),
    keccak256("EVIDENCE_OF_PHYSICAL_ABUSE"),
    keccak256("DOCUMENTS_HELD_BY_EMPLOYER"),
    keccak256("PAID_LESS_THAN_MINIMUM_WAGE"),
    keccak256("EXCESSIVE_WORKING_HOURS"),
    keccak256("LIVES_AT_PLACE_OF_WORK"),
    keccak256("DEBT_TO_EMPLOYER_FOR_ACCOMMODATION"),
    keccak256("POOR_LIVING_CONDITIONS"),
    keccak256("UNABLE_TO_SPEAK_FREELY"),
    keccak256("APPEARS_FEARFUL_OR_ANXIOUS"),
    keccak256("MULTIPLE_WORKERS_SAME_ADDRESS"),
    keccak256("TRANSPORTED_IN_GROUPS")
];

// Worker voice mechanisms — best practice:
// Anonymous hotlines, worker surveys, worker committees
// Sedex Worker Voice tool, Ulula, Labor Link

struct WorkerVoiceMechanism {
    bytes32 mechanismType;          // e.g. keccak256("ANONYMOUS_HOTLINE")
    uint256 workersCovered;
    uint256 reportingPeriodStart;
    uint256 totalReportsReceived;
    uint256 reportsActedUpon;
    bool isAvailableInLocalLanguage;
    bytes32[] supportedLanguages;
}
```

---

## KPIs — Measuring Effectiveness

```solidity
// Home Office guidance: companies should report KPIs to demonstrate progress
// KPIs should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound)

struct MSAKPIRecord {
    uint256 reportingYear;

    // Supplier coverage
    uint256 suppliersAssessedCount;
    uint256 suppliersAuditedCount;
    uint256 suppliersWithAntiSlaveryClauseCount;
    uint256 totalSuppliersInScope;

    // Training
    uint256 staffTrainedCount;
    uint256 totalStaffInScope;
    uint256 supplierStaffTrainedCount;

    // Incidents
    uint256 suspectedCasesIdentified;
    uint256 confirmedCasesIdentified;
    uint256 casesReferredToAuthorities;  // NCA, police, Gangmasters Licensing Authority
    uint256 casesRemediated;

    // Remediation
    uint256 suppliersExitedDueToNonCompliance;
    uint256 suppliersImprovedAfterRemediation;

    // Worker voice
    uint256 workerInterviewsCompleted;
    uint256 grievancesReceived;
    uint256 grievancesResolved;
}
```

---

## Gangmasters & Labour Abuse Authority (GLAA)

```solidity
// GLAA: regulates labour providers in agriculture, horticulture, shellfish, food processing
// Gangmasters licence required for labour providers in these sectors
// Using unlicensed gangmaster: criminal offence for both gangmaster AND buyer

interface IGLAALicenceRegistry {
    function isLicensed(address labourProvider) external view returns (bool);
    function getLicenceExpiry(address labourProvider) external view returns (uint256);
    function isRevoked(address labourProvider) external view returns (bool);
}

// GLAA-licensed sectors (Gangmasters Act 2004 + GLAA 2016 extension):
bytes32 constant GLAA_SECTOR_AGRICULTURE = keccak256("AGRICULTURE");
bytes32 constant GLAA_SECTOR_HORTICULTURE = keccak256("HORTICULTURE");
bytes32 constant GLAA_SECTOR_SHELLFISH = keccak256("SHELLFISH_GATHERING");
bytes32 constant GLAA_SECTOR_FOOD_PROCESSING = keccak256("FOOD_DRINK_PROCESSING");
bytes32 constant GLAA_SECTOR_PACKAGING = keccak256("PACKAGING_FOOD_DRINK");

modifier onlyGLAALicensed(address labourProvider, bytes32 sector) {
    if (_isGLAASector(sector)) {
        require(
            glaaRegistry.isLicensed(labourProvider) && !glaaRegistry.isRevoked(labourProvider),
            "GLAA: labour provider not licensed"
        );
        require(
            glaaRegistry.getLicenceExpiry(labourProvider) > block.timestamp,
            "GLAA: licence expired"
        );
    }
    _;
}
```
