# Singapore Property Restrictions — Reference

## Overview
Singapore has strict foreign ownership rules under the Residential Property Act (RPA)
and additional buyer stamp duties (ABSD) designed to cool the market.

---

## Residential Property Act (RPA) — Ownership Restrictions

```solidity
// Who can own what in Singapore:

// LANDED RESIDENTIAL (houses, bungalows, semi-detached, terraced):
// Singapore Citizens: YES (freely)
// Singapore PRs: NO (unless SLA approval for restricted residential property in Sentosa)
// Foreigners: NO (unless SLA approval — rare, usually for Sentosa Cove)
// Companies: NO (unless SLA approval, very rare)

// STRATA-TITLED RESIDENTIAL (condominiums, apartments):
// Singapore Citizens: YES
// Singapore PRs: YES (subject to ABSD)
// Foreigners: YES (subject to ABSD)
// Companies: YES (subject to ABSD — 65%)

// HDB FLATS (public housing — ~80% of Singapore residents):
// Singapore Citizens: YES (with eligibility criteria)
// Singapore PRs: YES (resale only, with restrictions — see below)
// Foreigners: NO
// Companies: NO

enum SGPropertyOwnershipStatus { PERMITTED, REQUIRES_SLA_APPROVAL, PROHIBITED }

function checkOwnershipPermitted(
    SGPropertyType propType,
    SGBuyerType buyerType
) public pure returns (SGPropertyOwnershipStatus) {
    if (propType == SGPropertyType.LANDED_RESIDENTIAL) {
        if (buyerType == SGBuyerType.SINGAPORE_CITIZEN) return SGPropertyOwnershipStatus.PERMITTED;
        return SGPropertyOwnershipStatus.REQUIRES_SLA_APPROVAL;
    }
    if (propType == SGPropertyType.HDB_FLAT) {
        if (buyerType == SGBuyerType.SINGAPORE_CITIZEN) return SGPropertyOwnershipStatus.PERMITTED;
        if (buyerType == SGBuyerType.SINGAPORE_PR) return SGPropertyOwnershipStatus.REQUIRES_SLA_APPROVAL;
        return SGPropertyOwnershipStatus.PROHIBITED;
    }
    // Private condos + commercial: permitted for all (with ABSD)
    return SGPropertyOwnershipStatus.PERMITTED;
}
```

---

## HDB Resale — Eligibility Criteria

```solidity
// HDB resale flats: SPR (Singapore PR) buyers must meet:
// 1. Form a family nucleus (married couple, parent + child, etc.)
// 2. At least one buyer must be SC or SPR
// 3. Minimum Occupation Period (MOP): 5 years before resale

struct HDBEligibility {
    bool isCitizenOrPR;
    bool hasFamilyNucleus;
    bool hasCompletedMOP;           // Previous flat MOP completed
    uint256 mopCompletionDate;
    uint256 incomeCapSGD;           // HDB income ceiling (varies by flat type)
    bool hasOutstandingHDBLoan;     // Cannot buy resale if outstanding HDB loan on another flat
}

uint256 constant HDB_INCOME_CAP_4ROOM = 14_000e18;     // S$14,000/month for 4-room
uint256 constant HDB_INCOME_CAP_EXEC = 16_000e18;       // S$16,000/month for executive flat
uint256 constant MOP_PERIOD = 5 * 365 days;             // 5-year minimum occupation period
```

---

## ABSD Rates (2023 Update — Current as of April 2023)

```solidity
// ABSD rates significantly increased in April 2023 — highest for foreigners (60%)
// This is on top of Buyer's Stamp Duty (BSD)

// BSD rates (standard — applies to all buyers):
// First S$180,000: 1% | Next S$180,000: 2% | Next S$640,000: 3%
// Next S$500,000: 4% | Next S$1,500,000: 5% | Above S$3,000,000: 6%

function calcBSD(uint256 valueSGD) public pure returns (uint256 bsd) {
    if (valueSGD > 3_000_000e18)
        bsd += (valueSGD - 3_000_000e18) * 600 / 10_000;
    if (valueSGD > 1_500_000e18)
        bsd += (min(valueSGD, 3_000_000e18) - 1_500_000e18) * 500 / 10_000;
    if (valueSGD > 1_000_000e18)
        bsd += (min(valueSGD, 1_500_000e18) - 1_000_000e18) * 400 / 10_000;
    if (valueSGD > 360_000e18)
        bsd += (min(valueSGD, 1_000_000e18) - 360_000e18) * 300 / 10_000;
    if (valueSGD > 180_000e18)
        bsd += (min(valueSGD, 360_000e18) - 180_000e18) * 200 / 10_000;
    bsd += min(valueSGD, 180_000e18) * 100 / 10_000;
}

// ABSD by buyer profile (April 2023 rates):
uint256 constant ABSD_SC_FIRST = 0;       // Singapore Citizen, 1st property
uint256 constant ABSD_SC_SECOND = 2000;   // 20%
uint256 constant ABSD_SC_THIRD = 3000;    // 30%
uint256 constant ABSD_PR_FIRST = 500;     // 5%
uint256 constant ABSD_PR_SECOND = 3000;   // 30%
uint256 constant ABSD_PR_THIRD = 3500;    // 35%
uint256 constant ABSD_FOREIGNER = 6000;   // 60%
uint256 constant ABSD_ENTITY = 6500;      // 65%
uint256 constant ABSD_TRUSTEE = 6500;     // 65%
```

---

## Seller's Stamp Duty (SSD) — Anti-Speculation

```solidity
// SSD applies if residential property sold within 3 years of purchase
// Year 1: 12% | Year 2: 8% | Year 3: 4% | After 3 years: 0%

function calcSSD(uint256 valueSGD, uint256 holdingDays) public pure returns (uint256 ssd) {
    if (holdingDays >= 3 * 365) return 0;
    if (holdingDays < 365) return valueSGD * 1200 / 10_000;     // 12%
    if (holdingDays < 2 * 365) return valueSGD * 800 / 10_000;  // 8%
    return valueSGD * 400 / 10_000;                              // 4%
}
```

---

## Total Debt Servicing Ratio (TDSR) — Loan Limits

```solidity
// MAS TDSR: all debt repayments ≤ 55% of gross monthly income
// MSR (Mortgage Servicing Ratio) for HDB: ≤ 30% for HDB loan, ≤ 30% for bank loan

uint256 constant TDSR_LIMIT_BPS = 5500;   // 55% of gross monthly income
uint256 constant MSR_LIMIT_BPS = 3000;    // 30% for HDB property

// LTV limits (post-December 2021):
// First housing loan: 75% LTV | Second: 45% | Third+: 35%
uint256 constant LTV_FIRST_LOAN = 7500;   // 75%
uint256 constant LTV_SECOND_LOAN = 4500;  // 45%
uint256 constant LTV_THIRD_PLUS = 3500;   // 35%

function maxLoanAmount(
    uint256 propertyValueSGD,
    uint256 existingLoansCount
) public pure returns (uint256) {
    uint256 ltvBPS;
    if (existingLoansCount == 0) ltvBPS = LTV_FIRST_LOAN;
    else if (existingLoansCount == 1) ltvBPS = LTV_SECOND_LOAN;
    else ltvBPS = LTV_THIRD_PLUS;
    return propertyValueSGD * ltvBPS / 10_000;
}
```

---

## S-REIT Framework (MAS)

```solidity
// S-REITs listed on SGX; regulated by MAS under CIS Code
// Must distribute ≥90% of taxable income to enjoy tax transparency
// Leverage limit: 50% of deposited property value (or 60% with credit rating)

uint256 constant SREIT_DISTRIBUTION_BPS = 9000;  // 90%
uint256 constant SREIT_LEVERAGE_BASIC = 5000;     // 50% gearing limit
uint256 constant SREIT_LEVERAGE_RATED = 6000;     // 60% if ≥BBB- / Baa3 credit rating

// S-REIT: foreign property allowed (many S-REITs own overseas properties)
// No restriction on property type or geography for S-REITs
// Withholding tax: 10% for individuals and qualifying foreign non-individuals
uint256 constant SREIT_WHT_INDIVIDUAL = 1000;     // 10%
uint256 constant SREIT_WHT_FOREIGN_NON_IND = 1000; // 10% (reduced from 20%)

function min(uint256 a, uint256 b) internal pure returns (uint256) {
    return a < b ? a : b;
}
```
