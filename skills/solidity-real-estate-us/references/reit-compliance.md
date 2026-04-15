# US REIT Compliance — IRS Qualification Tests Reference

## Overview
A REIT (Real Estate Investment Trust) is a pass-through entity under US tax law (IRC §856-860).
It avoids corporate-level tax if it satisfies all qualification tests annually.

---

## Organizational Tests (IRC §856(a))

```solidity
// Test 1: Must be organized as a corporation, trust, or association
// Test 2: Managed by trustees or directors (not unitholders directly)
// Test 3: Shares must be transferable

// Test 4: Cannot be a financial institution or insurance company
bytes32 public constant ENTITY_TYPE = keccak256("REAL_ESTATE_INVESTMENT_TRUST");

// Test 5: Taxable as a domestic corporation
bytes2 public constant JURISDICTION = "US";

// Test 6: Not a "closely held corporation" (5/50 rule below)
// Test 7: At least 100 shareholders

uint256 public constant MIN_SHAREHOLDERS = 100;
uint256 public constant MAX_TOP5_OWNERSHIP_BPS = 5000; // 5 shareholders cannot own >50%

function checkOrganizationalTests() external view returns (bool pass, string memory failReason) {
    if (totalShareholders < MIN_SHAREHOLDERS)
        return (false, "Less than 100 shareholders (IRC 856(a)(5))");
    if (_top5Concentration() > MAX_TOP5_OWNERSHIP_BPS)
        return (false, "5 or fewer individuals own >50% (5/50 rule, IRC 856(h))");
    return (true, "");
}

function _top5Concentration() internal view returns (uint256 bps) {
    // Sort shareholders by holdings, sum top 5, divide by total supply
    // Implementation: maintain sorted top-5 list updated on each transfer
    uint256 top5 = 0;
    for (uint i = 0; i < 5 && i < topHolders.length; i++) {
        top5 += balanceOf(topHolders[i]);
    }
    bps = top5 * 10_000 / totalSupply();
}
```

---

## Income Tests (IRC §856(c))

Two income tests must be met **annually**:

### 75% Income Test
At least 75% of gross income must come from real estate sources:

```solidity
// Qualifying income sources for 75% test:
// - Rents from real property
// - Interest on mortgages secured by real property
// - Gain from sale of real property (not dealer property)
// - Dividends from other REITs
// - Abatements and refunds of real property taxes
// - Income from foreclosure property
// - Qualified temporary investment income (within 1 year of offering)

struct IncomeRecord {
    uint256 qualifyingIncome75;     // Qualifies for BOTH 75% and 95% tests
    uint256 qualifyingIncome95;     // Qualifies for 95% test only (e.g. dividends from C-corps)
    uint256 nonQualifyingIncome;    // Neither test
    uint256 periodStart;
    uint256 periodEnd;
}

function check75PctIncomeTest(IncomeRecord memory income) public pure returns (bool) {
    uint256 total = income.qualifyingIncome75 + income.qualifyingIncome95 + income.nonQualifyingIncome;
    if (total == 0) return true;
    return income.qualifyingIncome75 * 10_000 / total >= 7500;
}

// 95% Income Test (IRC §856(c)(2))
function check95PctIncomeTest(IncomeRecord memory income) public pure returns (bool) {
    uint256 total = income.qualifyingIncome75 + income.qualifyingIncome95 + income.nonQualifyingIncome;
    if (total == 0) return true;
    uint256 qualifying = income.qualifyingIncome75 + income.qualifyingIncome95;
    return qualifying * 10_000 / total >= 9500;
}
```

### Prohibited Transactions
```solidity
// Rents from real property are DISQUALIFIED if:
// 1. Based on net income/profits of tenant (percentage rent is OK if based on gross receipts)
// 2. REIT owns >10% of tenant (related party rent)
// 3. REIT provides impermissible services to tenants

uint256 constant MAX_TENANT_OWNERSHIP_BPS = 1000; // 10% ownership limit

mapping(address => uint256) public tenantOwnership; // tenant → REIT's ownership % in tenant

modifier noRelatedPartyRent(address tenant) {
    require(tenantOwnership[tenant] <= MAX_TENANT_OWNERSHIP_BPS,
            "REIT: related party rent disqualified (>10% ownership of tenant)");
    _;
}
```

---

## Asset Tests (IRC §856(c)(4))

Tested **quarterly** at end of each calendar quarter:

```solidity
struct AssetRecord {
    uint256 totalAssetsUSD;
    uint256 qualifyingRealEstateAssetsUSD; // Direct RE + mortgages + REIT shares
    uint256 governmentSecuritiesUSD;
    uint256 cashAndCashEquivalentsUSD;
    uint256 securitiesInSingleIssuerUSD;   // For 5% and 10% tests
    uint256 singleIssuerTotalSecuritiesUSD;
    uint256 taxableREITSubsidiaryAssetsUSD; // TRS assets
}

function checkAssetTests(AssetRecord memory assets) public pure
    returns (bool pass75, bool pass25TRS, bool pass5, bool pass10) {

    // 75% asset test: at least 75% in qualifying real estate assets
    pass75 = assets.qualifyingRealEstateAssetsUSD * 10_000 / assets.totalAssetsUSD >= 7500;

    // 25% TRS test: no more than 20% in TRS (taxable REIT subsidiaries) — reduced to 20% post-2018
    pass25TRS = assets.taxableREITSubsidiaryAssetsUSD * 10_000 / assets.totalAssetsUSD <= 2000;

    // 5% test: no more than 5% of total assets in securities of single non-government issuer
    pass5 = assets.securitiesInSingleIssuerUSD * 10_000 / assets.totalAssetsUSD <= 500;

    // 10% vote/value test: cannot own >10% of vote or value of any single issuer
    pass10 = assets.singleIssuerTotalSecuritiesUSD * 10_000 / assets.totalAssetsUSD <= 1000;
}
```

---

## Distribution Requirement (IRC §857)

```solidity
// Must distribute at least 90% of REIT Taxable Income (RTI)
// If distributes <100% of RTI, pays corporate tax on retained amount
// Excise tax of 4% if distributes <85% of ordinary income + 95% of capital gains

uint256 public reitTaxableIncomeUSD;          // Computed annually
uint256 public distributedThisYearUSD;
uint256 public constant DISTRIBUTION_FLOOR_BPS = 9000; // 90%

// Deficiency dividends: REIT can cure shortfall after year-end (with interest)
// On-chain: track when deficiency dividend declared
struct DeficiencyDividend {
    uint256 amount;
    uint256 declarationDate;
    uint256 paymentDate;         // Must be paid within 90 days of declaration
    bytes32 irsFormRef;          // IRS Form 976
}

function declareDeficiencyDividend(uint256 amount) external onlyRole(BOARD_ROLE) {
    require(
        distributedThisYearUSD < reitTaxableIncomeUSD * DISTRIBUTION_FLOOR_BPS / 10_000,
        "REIT: no deficiency to cure"
    );
    deficiencyDividends.push(DeficiencyDividend({
        amount: amount,
        declarationDate: block.timestamp,
        paymentDate: 0,
        irsFormRef: bytes32(0)
    }));
    emit DeficiencyDividendDeclared(amount, block.timestamp);
}
```

---

## Prohibited Transactions (IRC §857(b)(6))

```solidity
// REIT pays 100% excise tax on net income from "prohibited transactions"
// Prohibited: selling property held primarily for sale to customers (dealer property)
// Safe harbor: property held ≥2 years, <7 sales in year, expenditures <30% of basis

struct PropertySaleRecord {
    bytes32 propertyId;
    uint256 acquisitionDate;
    uint256 saleDate;
    uint256 basisUSD;
    uint256 improvementExpendituresUSD;
    bool isProhibitedTransaction;
}

uint256 public salesThisYear;
uint256 constant SAFE_HARBOR_MAX_SALES = 7;
uint256 constant SAFE_HARBOR_HOLD_PERIOD = 730 days; // 2 years

function checkSafeHarbor(PropertySaleRecord memory sale) public view returns (bool) {
    bool heldLongEnough = (sale.saleDate - sale.acquisitionDate) >= SAFE_HARBOR_HOLD_PERIOD;
    bool underSalesLimit = salesThisYear < SAFE_HARBOR_MAX_SALES;
    bool improvementsOk = sale.improvementExpendituresUSD * 10_000 / sale.basisUSD <= 3000; // <30%
    return heldLongEnough && underSalesLimit && improvementsOk;
}
```

---

## UPREIT Structure (Umbrella Partnership REIT)

```solidity
// UPREIT: property contributed to Operating Partnership (OP) in exchange for OP Units
// OP Units can be converted to REIT shares (triggers taxable event for contributor)
// Allows tax-deferred contribution of appreciated property

struct OPUnit {
    address holder;
    uint256 units;
    uint256 conversionRatio;    // OP Units per REIT share (typically 1:1)
    uint256 lockupExpiry;       // Typically 1 year
    uint256 taxBasis;           // Original tax basis (for gain calculation on conversion)
}

// Conversion: OP Unit → REIT share (taxable event for holder)
function convertOPUnits(uint256 opUnits) external {
    OPUnit storage op = opUnits[msg.sender];
    require(block.timestamp >= op.lockupExpiry, "UPREIT: lockup active");
    require(op.units >= opUnits, "UPREIT: insufficient OP units");

    uint256 reitShares = opUnits * op.conversionRatio / 1e18;
    op.units -= opUnits;

    _mint(msg.sender, reitShares);
    emit OPUnitsConverted(msg.sender, opUnits, reitShares, block.timestamp);
    // Note: conversion is a taxable sale — must be reported to holder for tax purposes
}
```
