# EMIR — On-Chain Derivatives Reporting & Clearing Reference

## Overview
EMIR (Regulation 648/2012) + EMIR Refit (2019/834) regulate OTC derivatives in the EU:
- **Reporting**: all derivatives reported to a Trade Repository (TR)
- **Clearing**: standardised OTC derivatives centrally cleared via CCP
- **Risk mitigation**: for uncleared derivatives — margin, daily valuation, reconciliation

EMIR 3.0 (2024): further reforms to clearing obligation and active account requirements.

---

## Counterparty Classification

```solidity
// EMIR classifies counterparties to determine obligations:

enum EMIRCounterpartyClass {
    FC,     // Financial Counterparty (banks, investment firms, CCPs, insurers, UCITS, AIFs)
    NFC_PLUS,   // Non-Financial Counterparty above clearing threshold
    NFC_MINUS,  // Non-Financial Counterparty below clearing threshold
    TC      // Third-Country entity (non-EU)
}

// Clearing thresholds (EMIR Refit — gross notional):
// Credit derivatives: €1 billion | Equity derivatives: €1 billion
// Interest rate derivatives: €3 billion | FX derivatives: €3 billion
// Commodity + other: €3 billion

struct ClearingThresholds {
    uint256 creditDerivativesEUR;   // €1B
    uint256 equityDerivativesEUR;   // €1B
    uint256 interestRateEUR;        // €3B
    uint256 fxDerivativesEUR;       // €3B
    uint256 commodityOtherEUR;      // €3B
}

interface IEMIRClassificationRegistry {
    function getCounterpartyClass(address entity) external view returns (EMIRCounterpartyClass);
    function isClearingObligated(address entity, bytes32 assetClass) external view returns (bool);
}
```

---

## Trade Reporting (EMIR Art. 9)

```solidity
// All derivatives (exchange-traded + OTC) must be reported to EU-registered TR
// Reporting deadline: T+1 (next business day after execution/modification/termination)
// Unique Trade Identifier (UTI): must be generated and agreed between counterparties

// EU-registered Trade Repositories (examples):
// DTCC Derivatives Repository, Regis-TR, UnaVista (LSEG), ICE Trade Vault

struct EMIRTradeReport {
    bytes32 uti;                    // Unique Trade Identifier (ISO 23897)
    bytes32 lei_counterparty1;      // LEI of reporting counterparty
    bytes32 lei_counterparty2;      // LEI of other counterparty
    EMIRCounterpartyClass class1;
    EMIRCounterpartyClass class2;
    bytes32 productClassification;  // ISDA product taxonomy
    bytes32 isinOrCFI;              // ISIN (if listed) or CFI code (ISO 10962)
    uint256 notionalAmountEUR;
    bytes32 currency;               // ISO 4217 currency code hash
    uint256 executionDate;          // UTC timestamp
    uint256 maturityDate;
    bytes32 tradeRepositoryId;      // ESMA-registered TR identifier
    EMIRReportType reportType;
    bool isCleared;                 // True if cleared through CCP
    bytes32 ccpLEI;                 // CCP's LEI if cleared
}

enum EMIRReportType { NEW, MODIFY, ERROR, CANCEL, VALUATION, MARGIN_UPDATE, COMPRESSION }

// UTI generation: ISO 23897 format
// Format: {namespace}{local_identifier}
// Namespace: LEI of generating party (20 chars) + "0" padding
function generateUTI(bytes32 partyLEI, uint256 tradeId) public view returns (bytes32) {
    return keccak256(abi.encodePacked(partyLEI, tradeId, block.timestamp));
}

mapping(bytes32 => EMIRTradeReport) public tradeReports; // UTI → report
mapping(bytes32 => bytes32) public tradeRepositoryAcks;  // UTI → TR acknowledgment ref

event TradeReported(bytes32 indexed uti, bytes32 tradeRepository, EMIRReportType reportType);

function reportTrade(EMIRTradeReport calldata report) external onlyRole(REPORTING_ROLE) {
    require(report.uti != bytes32(0), "EMIR: UTI required");
    require(report.lei_counterparty1 != bytes32(0), "EMIR: LEI required");
    require(report.notionalAmountEUR > 0, "EMIR: notional required");
    tradeReports[report.uti] = report;
    emit TradeReported(report.uti, report.tradeRepositoryId, report.reportType);
}
```

---

## Clearing Obligation (EMIR Art. 4)

```solidity
// Standardised OTC derivatives between two FC or NFC+ must be cleared via CCP
// Clearing obligation applies to: IRS (EUR, USD, GBP, JPY), CDS indices (iTraxx, CDX)

enum ClearingStatus { NOT_REQUIRED, REQUIRED_PENDING, CLEARED, EXEMPT }

struct DerivativeClearingRecord {
    bytes32 uti;
    ClearingStatus status;
    bytes32 ccpLEI;                     // CCP used (e.g. LCH, Eurex Clearing, ICE Clear)
    bytes32 clearingMemberLEI;          // Clearing member if indirect clearing
    uint256 clearingDate;
    bytes32 clearingConfirmationRef;
}

// Exemptions from clearing obligation:
// - Intragroup transactions (Art. 4(2))
// - Non-EU pension funds (temporary exemption, extended)
// - Small FCs below threshold (NFC- equivalent rule for some FCs post-EMIR Refit)

bool public isIntragroupExemptionApplied;
bytes32 public intragroupExemptionNotificationRef; // Must notify ESMA

modifier clearingCompliant(bytes32 uti, EMIRCounterpartyClass myClass, EMIRCounterpartyClass counterpartyClass) {
    if (myClass == EMIRCounterpartyClass.FC || myClass == EMIRCounterpartyClass.NFC_PLUS) {
        if (counterpartyClass == EMIRCounterpartyClass.FC || counterpartyClass == EMIRCounterpartyClass.NFC_PLUS) {
            require(
                clearingRecords[uti].status == ClearingStatus.CLEARED ||
                clearingRecords[uti].status == ClearingStatus.NOT_REQUIRED,
                "EMIR: clearing required between FC/NFC+"
            );
        }
    }
    _;
}
```

---

## Margin Requirements for Uncleared Derivatives

```solidity
// EMIR + RTS 2016/2251: variation margin (VM) + initial margin (IM) for uncleared OTC
// VM: daily exchange of mark-to-market changes
// IM: protection against potential future exposure during close-out

uint256 constant VM_THRESHOLD_EUR = 500_000e18;         // €500k minimum transfer amount
uint256 constant IM_THRESHOLD_EUR = 50_000_000e18;      // €50M IM threshold (phase-in)

struct MarginRecord {
    bytes32 uti;
    uint256 variationMarginPostedEUR;
    uint256 variationMarginReceivedEUR;
    uint256 initialMarginPostedEUR;
    uint256 initialMarginReceivedEUR;
    address collateralCustodian;        // Independent custodian for IM
    uint256 lastValuationDate;
    int256 markToMarketEUR;             // Current MTM value (can be negative)
}

// Eligible collateral for margin (EMIR RTS):
// Cash (EUR, USD, GBP, JPY, CHF), sovereign bonds (haircut applied),
// covered bonds (haircut), equities in main indices (haircut), gold
bytes32[] public eligibleCollateralTypes;

// Haircuts by collateral type (2024 EMIR standard haircuts):
mapping(bytes32 => uint256) public collateralHaircutBPS;
// EUR cash: 0% | EUR sovereign 0-1yr: 0.5% | EUR sovereign 1-5yr: 2% | EUR sovereign >5yr: 4%
// Equities: 15% | Gold: 15%

function calcCollateralRequired(
    uint256 exposureEUR,
    bytes32 collateralType
) public view returns (uint256 collateralAmountEUR) {
    uint256 haircut = collateralHaircutBPS[collateralType];
    // Required collateral = exposure / (1 - haircut)
    collateralAmountEUR = exposureEUR * 10_000 / (10_000 - haircut);
}
```

---

## EMIR 3.0 — Active Account Requirement (2024)

```solidity
// EMIR 3.0 (effective 2024): systemic EU market participants must hold "active accounts"
// at EU CCPs for certain derivative classes (to reduce reliance on UK CCPs post-Brexit)

// Active account requirement applies to: FC above clearing threshold
// Minimum activity: at least 5 trades + 1% of notional cleared at EU CCP per asset class

struct ActiveAccountRequirement {
    address euCCP;                      // EU CCP address (e.g. Eurex Clearing)
    uint256 minTradesPerQuarter;        // Minimum 5
    uint256 minNotionalPctBPS;          // Minimum 1% = 100 bps
    uint256 lastComplianceCheck;
    bool isCompliant;
}

// Covered asset classes for active account requirement:
// EUR-denominated IRS | EUR-denominated CDS indices (iTraxx Europe, iTraxx Crossover)
bytes32 constant EUR_IRS = keccak256("EUR_INTEREST_RATE_SWAP");
bytes32 constant EUR_CDS_INDEX = keccak256("EUR_CDS_INDEX");
```
