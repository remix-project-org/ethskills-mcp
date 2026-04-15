# UK REIT Qualification Tests — Reference

## Overview
UK REIT regime established by CTA 2010 (Part 12). Entry notification to HMRC required.
A UK REIT company avoids corporation tax on qualifying property rental income and gains.

---

## Conditions for UK REIT Status (CTA 2010, s.528)

```solidity
// Condition A: Listed on recognised stock exchange OR has ≥ 35% institutional investors
// Condition B: Not an open-ended investment company
// Condition C: Not a close company (see 5/50 rule below)
// Condition D: Resident in UK only (not dual-resident)
// Condition E: Not a private equity firm or partnership
// Condition F: Has a property rental business

// On-chain tracking of REIT conditions
struct UKREITConditions {
    bool isListed;                  // Listed on LSE, AIM, or other recognised exchange
    uint256 institutionalInvestorPct; // % held by institutional investors (if not listed)
    bool isCloseCompany;            // Must be FALSE
    bool isUKResident;              // Must be TRUE
    bool hasPropertyRentalBusiness; // Must be TRUE
    uint256 lastAssessmentDate;
}

// Close company test: 5 or fewer participators control >50%
// Participators include associated persons (family members, connected parties)
uint256 constant CLOSE_COMPANY_THRESHOLD_BPS = 5000;  // 50% control threshold
uint256 constant CLOSE_COMPANY_MAX_PARTICIPATORS = 5;

mapping(address => uint256) public participatorShareholding; // participator → bps of total
address[] public topParticipators;

function isCloseCompany() public view returns (bool) {
    uint256 top5Holdings = 0;
    uint256 count = topParticipators.length < 5 ? topParticipators.length : 5;
    for (uint i = 0; i < count; i++) {
        top5Holdings += participatorShareholding[topParticipators[i]];
    }
    return top5Holdings > CLOSE_COMPANY_THRESHOLD_BPS;
}
```

---

## The Three Principal Tests

### Test 1: Property Rental Business (PRB) — Income Test (s.531)

```solidity
// ≥75% of REIT's total profits must come from property rental business
// Profits = income profits + chargeable gains

uint256 constant PRB_INCOME_TEST_BPS = 7500; // 75%

struct IncomeBreakdown {
    uint256 propertyRentalIncomePounds;    // Qualifying PRB income
    uint256 nonPropertyIncomePounds;       // Non-qualifying (e.g. trading income)
    uint256 propertyRentalGainsPounds;     // Qualifying PRB gains
    uint256 nonPropertyGainsPounds;        // Non-qualifying gains
}

function checkIncomeTest(IncomeBreakdown memory income) public pure returns (bool) {
    uint256 prbProfits = income.propertyRentalIncomePounds + income.propertyRentalGainsPounds;
    uint256 totalProfits = prbProfits + income.nonPropertyIncomePounds + income.nonPropertyGainsPounds;
    if (totalProfits == 0) return true;
    return prbProfits * 10_000 / totalProfits >= PRB_INCOME_TEST_BPS;
}
```

### Test 2: Property Rental Business — Assets Test (s.532)

```solidity
// ≥75% of REIT's total assets must be assets of the property rental business
uint256 constant PRB_ASSETS_TEST_BPS = 7500; // 75%

struct AssetBreakdown {
    uint256 prbAssetsPounds;               // Investment properties, mortgages secured on RE
    uint256 nonPrbAssetsPounds;            // Cash, trading assets, other investments
}

function checkAssetsTest(AssetBreakdown memory assets) public pure returns (bool) {
    uint256 total = assets.prbAssetsPounds + assets.nonPrbAssetsPounds;
    if (total == 0) return true;
    return assets.prbAssetsPounds * 10_000 / total >= PRB_ASSETS_TEST_BPS;
}
```

### Test 3: Distribution Requirement (s.530)

```solidity
// Must distribute ≥90% of PRB profits (after deducting financing costs)
// Distribution treated as "property income distribution" (PID)
// Basic rate income tax (20%) withheld at source on PID (for non-exempt shareholders)

uint256 constant DISTRIBUTION_REQUIREMENT_BPS = 9000; // 90%
uint256 constant WITHHOLDING_TAX_BPS = 2000;           // 20% basic rate tax

struct PIDDistribution {
    uint256 grossAmount;           // Total PID before withholding
    uint256 withholdingTax;        // 20% withheld for non-exempt shareholders
    uint256 netAmount;             // Net paid to non-exempt shareholders
    uint256 periodCoveredStart;
    uint256 periodCoveredEnd;
    bytes32 hmrcFormRef;           // REIT-9 certificate reference
}

function distributePID(uint256 grossAmountPounds)
    external onlyRole(FINANCE_DIRECTOR_ROLE) {
    require(
        distributedThisYear + grossAmountPounds >= prbProfitsThisYear * DISTRIBUTION_REQUIREMENT_BPS / 10_000,
        "REIT: 90% distribution requirement not met"
    );

    distributedThisYear += grossAmountPounds;

    // Distribute to all shareholders with WHT deducted for non-exempt
    for (uint i = 0; i < shareholders.length; i++) {
        address sh = shareholders[i];
        uint256 gross = grossAmountPounds * balanceOf(sh) / totalSupply();
        uint256 net = isExemptFromWHT[sh]
            ? gross
            : gross * (10_000 - WITHHOLDING_TAX_BPS) / 10_000;

        pidDistributions[sh] += net;
    }

    emit PIDDistributed(grossAmountPounds, block.timestamp);
}

// Exempt from 20% WHT: ISAs, SIPPs, charities, other UK REITs, non-UK companies
mapping(address => bool) public isExemptFromWHT;
```

---

## Entry & Exit Charges

```solidity
// Entry charge: if property appreciated before REIT conversion
// = 2% of market value of investment properties at entry date (s.536 CTA 2010)

uint256 public constant ENTRY_CHARGE_RATE_BPS = 200; // 2%

struct REITEntryData {
    uint256 entryDate;
    uint256 totalPropertyValueAtEntryPounds;
    uint256 entryChargePounds;          // = totalPropertyValue * 2%
    bytes32 hmrcElectionRef;            // s.524 HMRC election reference
}

// Exit: leaving REIT regime triggers deemed disposal at market value
// On-chain: flag exit event for HMRC notification
event REITExitTriggered(uint256 exitDate, string reason, address notifiedBy);
```

---

## Overseas REITs (s.550 CTA 2010)

```solidity
// UK investors in overseas REITs: PIDs still taxable as property income
// REIT must notify HMRC of overseas equivalent status

mapping(bytes32 => bool) public isRecognisedOverseasREIT;
// Recognised: US REITs, Australian AREITs, Japanese J-REITs, etc.
// Treatment: dividends taxed as property income (not dividend income)
```

---

## Penalty Regime

```solidity
// Breach of distribution test: 20% penalty on shortfall (s.551)
// Breach of balance of business tests: notice to remedy; continued breach = exit regime
// Breach of close company condition: immediate exit from REIT regime

uint256 constant DISTRIBUTION_BREACH_PENALTY_BPS = 2000; // 20% of shortfall

function calcDistributionPenalty(
    uint256 requiredDistribution,
    uint256 actualDistribution
) public pure returns (uint256 penalty) {
    if (actualDistribution >= requiredDistribution) return 0;
    uint256 shortfall = requiredDistribution - actualDistribution;
    return shortfall * DISTRIBUTION_BREACH_PENALTY_BPS / 10_000;
}
```
