# CSDDD — Corporate Sustainability Due Diligence Directive Risk Framework Reference

## Overview
Directive 2024/1760 (CSDDD) — entered into force July 25, 2024.
Transposition deadline: July 26, 2026. Application phased:
- July 2027: companies >5,000 employees + >€1.5B global turnover
- July 2028: companies >3,000 employees + >€900M turnover
- July 2029: companies >1,000 employees + >€450M turnover

Also applies to non-EU companies with >€450M EU net turnover.

---

## Scope & Obligations

```solidity
// CSDDD requires companies to conduct due diligence on:
// 1. Their own operations
// 2. Operations of subsidiaries
// 3. Operations of "business partners" in the value chain
//    - Upstream: raw materials, production, manufacturing
//    - Downstream: distribution, transport, storage (NOT end consumers)

// "Adverse impacts" covered:
// Part A (human rights): child labour, forced labour, unsafe working conditions,
//   rights to life, health, freedom of association, non-discrimination, privacy, etc.
// Part B (environment): climate, biodiversity, pollution, water, ecosystems

enum CSDDDImpactCategory {
    HUMAN_RIGHTS,
    ENVIRONMENT
}

enum CSDDDImpactType {
    ACTUAL_ADVERSE_IMPACT,      // Already occurred
    POTENTIAL_ADVERSE_IMPACT    // Risk of occurrence
}

// CSDDD references specific international standards:
// Human rights: UN Guiding Principles on Business and Human Rights (UNGPs)
// Environment: Paris Agreement, CBD, Aarhus Convention
// Guidance: OECD Guidelines for Multinational Enterprises
```

---

## The 6-Step Due Diligence Process

```solidity
// CSDDD Art. 5-11 defines mandatory due diligence steps:

// STEP 1: Integrate due diligence into policies and management systems
struct CSDDDPolicy {
    bytes32 policyDocCID;           // IPFS CID of published DD policy
    uint256 adoptionDate;
    bool boardApproved;             // Must be board-level responsibility
    bool coversOwnOperations;
    bool coversSubsidiaries;
    bool coversUpstreamPartners;
    bool coversDownstreamPartners;
    bytes32 conductCodeCID;         // Code of conduct for business partners
}

// STEP 2: Identify and assess actual and potential adverse impacts
struct CSDDDImpactAssessment {
    bytes32 supplierId;
    bytes32 supplierName;           // Hashed
    bytes2 countryOfOperation;
    CSDDDImpactCategory category;
    CSDDDImpactType impactType;
    bytes32 impactDescription;      // Hashed summary
    CSDDDSeverity severity;
    uint256 likelihoodPct;          // 0-100
    bool isSystemic;                // Whether impact is widespread in sector
    bytes32 assessmentMethodCID;    // IPFS CID of assessment methodology
    uint256 assessmentDate;
    address assessor;
}

enum CSDDDSeverity { LOW, MODERATE, SEVERE, CRITICAL }

// STEP 3: Prevent and mitigate potential adverse impacts
struct CSDDDMitigationPlan {
    bytes32 assessmentRef;
    bytes32[] preventionMeasures;   // e.g. keccak256("SUPPLIER_TRAINING"), keccak256("CONTRACT_CLAUSE")
    bytes32 actionPlanCID;
    uint256 implementationDeadline;
    uint256 progressPct;            // 0-100
    bool requiresFinancialSupport;  // For SME suppliers — must offer support
    uint256 financialSupportEUR;
}

// STEP 4: Establish and maintain a complaints procedure
struct CSDDDComplaintsMechanism {
    bytes32 contactPointRef;        // Designated contact point
    bool isAccessibleToAffectedParties;
    bool allowsAnonymousReports;
    uint256 acknowledgmentWindowDays; // Must acknowledge within this period
    uint256 investigationWindowDays;
    uint256 totalComplaintsReceived;
    uint256 totalComplaintsResolved;
}

// STEP 5: Monitor effectiveness of DD policy and measures
struct CSDDDMonitoringRecord {
    uint256 monitoringYear;
    bytes32[] kpisTracked;
    bytes32 monitoringReportCID;
    bool isThirdPartyVerified;
    address verifier;
    uint256 verificationDate;
}

// STEP 6: Publicly communicate on due diligence (annual statement)
struct CSDDDAnnualStatement {
    uint256 reportingYear;
    bytes32 statementCID;           // IPFS CID of published statement
    uint256 publicationDate;
    bool submittedToEUDatabase;     // EU will maintain central database
    bytes32 euDatabaseRef;
}
```

---

## Supplier Risk Tiering

```solidity
// CSDDD: risk-based prioritisation — focus on most significant risks first
// Criteria: severity, likelihood, scale, irremediable character, company's causal role

struct SupplierRiskProfile {
    bytes32 supplierId;
    bytes32 supplierName;
    bytes2[] operatingCountries;
    bytes32[] sectors;              // High-risk sectors: textiles, agriculture, extractives
    CSDDDSeverity overallRiskLevel;
    uint256 lastAssessmentDate;
    uint256 nextAssessmentDue;
    bool isDirectSupplier;          // Tier 1 vs indirect (Tier 2+)
    bool hasCSDDDContractClause;    // Contractual DD commitment obtained
    bytes32 contractClauseCID;
    bool isCapacityBuildingNeeded;  // SME: company must support capacity building
}

// High-risk country list for CSDDD purposes:
// Based on: governance indicators, conflict zones, weak rule of law
// Key high-risk regions: Sub-Saharan Africa, SE Asia, parts of MENA, Central Asia
interface ICSDDDCountryRiskOracle {
    function getCountryRiskScore(bytes2 country) external view returns (uint256); // 0-100
    function isConflictAffected(bytes2 country) external view returns (bool);
    function hasWeakRuleOfLaw(bytes2 country) external view returns (bool);
}

// High-risk sectors for CSDDD:
bytes32 constant SECTOR_TEXTILES = keccak256("TEXTILES_CLOTHING_FOOTWEAR");
bytes32 constant SECTOR_AGRICULTURE = keccak256("AGRICULTURE_FORESTRY_FISHERIES");
bytes32 constant SECTOR_EXTRACTIVES = keccak256("MINING_QUARRYING_OIL_GAS");
bytes32 constant SECTOR_CONSTRUCTION = keccak256("CONSTRUCTION");
bytes32 constant SECTOR_FOOD = keccak256("FOOD_BEVERAGES");
bytes32 constant SECTOR_TRANSPORT = keccak256("TRANSPORT_STORAGE");
```

---

## Remediation Obligations

```solidity
// CSDDD Art. 11: When actual adverse impact identified — MUST REMEDIATE
// Remediation: restore to state before impact, or minimise if restoration impossible
// Financial compensation to affected people where restoration impossible

struct CSDDDRemediationRecord {
    bytes32 impactRef;
    string remediationDescription;
    uint256 remediationStartDate;
    uint256 remediationCompletionDate;
    bool isCompleted;
    bytes32[] affectedStakeholders;     // Hashed identifiers of affected communities
    uint256 compensationPaidEUR;        // Financial compensation if applicable
    bool stakeholderEngagementDone;     // Must consult affected stakeholders
    bytes32 remediationReportCID;
    bool thirdPartyVerified;
}

// CSDDD requires engagement with stakeholders BEFORE and DURING remediation
// Affected communities, workers, trade unions, NGOs, indigenous peoples
event RemediationInitiated(bytes32 indexed impactRef, uint256 startDate, address initiatedBy);
event RemediationCompleted(bytes32 indexed impactRef, uint256 completionDate, bool stakeholderApproved);
```

---

## Climate Transition Plan

```solidity
// CSDDD Art. 22: In-scope companies must adopt a climate transition plan
// Aligned with: Paris Agreement 1.5°C pathway, EU Climate Law (net zero 2050)
// Plan must include: emission reduction targets, implementation actions, annual progress

struct ClimateTransitionPlan {
    bytes32 planCID;
    uint256 adoptionDate;
    bool boardApproved;
    uint256 netZeroTargetYear;          // Must be ≤ 2050
    uint256 scope1ReductionPct2030;     // vs base year (scaled 1e2)
    uint256 scope2ReductionPct2030;
    uint256 scope3ReductionPct2030;
    bool isSBTiAligned;                 // Science Based Targets initiative validation
    bytes32 sbtiCommitmentRef;
    bool includesFinancingPlan;         // Capex aligned with plan
    uint256 greenCapexEUR;              // Investment earmarked for transition
    uint256 annualProgressReviewDate;
}

// CSDDD variable remuneration: companies must link director pay to climate plan execution
bool public directorRemunerationLinkedToClimate;
uint256 public climateKPIWeightPct;    // % of variable pay linked to climate KPIs
```

---

## Civil Liability (CSDDD Art. 29)

```solidity
// CSDDD creates civil liability for harm caused by failure to comply with DD obligations
// Affected persons can sue in EU courts
// Limitation period: minimum 5 years

// On-chain: maintain audit trail to demonstrate DD compliance as legal defence
// CSDDD explicitly states: compliance with obligations = defence against liability

struct CSDDDLiabilityDefence {
    bytes32 incidentRef;
    bytes32[] complianceEvidenceCIDs;   // Evidence of DD steps taken
    bool hadContractualClause;          // Had DD obligation in supplier contract
    bool hadMonitoringInPlace;          // Monitoring was active at time of incident
    bool respondedPromptly;             // Took remedial action on discovery
    bytes32 legalCounselRef;            // Legal assessment reference
}

// Member states must ensure:
// - Legal standing for trade unions and NGOs to bring representative actions
// - Injunctive relief available pending investigation
// - No burden on claimant to prove exact causal pathway (reversed burden in some states)
```
