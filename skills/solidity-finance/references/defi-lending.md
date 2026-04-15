# Compliant DeFi Lending — Reference

## Architecture Overview

A compliant lending pool adds KYC/AML gates and regulatory caps on top of standard
collateral/liquidation logic.

```
Borrower (KYC verified) → LendingPool → CollateralVault
                                      → InterestRateModel
                                      → PriceOracle (TWAP)
                                      → LiquidationEngine
                                      → ReserveManager (Basel III buffers)
```

## Core Storage

```solidity
struct UserPosition {
    uint256 collateralAmount;   // locked collateral (in collateral token)
    uint256 debtPrincipal;      // borrowed principal
    uint256 debtIndex;          // interest accrual index at last update
    uint256 lastUpdateTimestamp;
}

uint256 public constant MIN_COLLATERAL_RATIO = 150e16; // 150% (1.5e18)
uint256 public constant LIQUIDATION_THRESHOLD = 125e16; // 125%
uint256 public constant LIQUIDATION_BONUS = 105e16;      // 5% bonus for liquidators
uint256 public constant RESERVE_FACTOR = 10e16;          // 10% of interest → reserves (Basel III)
```

## Interest Rate Model (Compound-style)

```solidity
interface IInterestRateModel {
    /// @param cash Available liquidity in pool
    /// @param borrows Total borrows outstanding
    /// @param reserves Protocol reserves
    /// @return borrowRate Per-second borrow rate (scaled 1e18)
    function getBorrowRate(uint256 cash, uint256 borrows, uint256 reserves)
        external view returns (uint256 borrowRate);
}

// Kinked rate model
contract KinkedRateModel is IInterestRateModel {
    uint256 public constant KINK = 80e16;          // 80% utilization
    uint256 public constant BASE_RATE = 2e16;       // 2% annual base
    uint256 public constant SLOPE1 = 10e16;         // slope below kink
    uint256 public constant SLOPE2 = 100e16;        // steep slope above kink

    function getBorrowRate(uint256 cash, uint256 borrows, uint256)
        external pure override returns (uint256) {
        if (cash + borrows == 0) return 0;
        uint256 utilization = borrows * 1e18 / (cash + borrows);
        if (utilization <= KINK) {
            return (BASE_RATE + utilization * SLOPE1 / 1e18) / 365 days;
        }
        uint256 excessUtil = utilization - KINK;
        return (BASE_RATE + KINK * SLOPE1 / 1e18 + excessUtil * SLOPE2 / 1e18) / 365 days;
    }
}
```

## Borrow with Compliance Checks

```solidity
function borrow(uint256 amount) external nonReentrant onlyVerified(msg.sender) {
    require(!kycRegistry.isSanctioned(msg.sender), "Lending: sanctioned");

    _accrueInterest(msg.sender);

    UserPosition storage pos = positions[msg.sender];
    uint256 collateralValue = _getCollateralValue(msg.sender);
    uint256 newDebt = pos.debtPrincipal + _indexedDebt(pos) + amount;

    require(
        collateralValue * 1e18 / newDebt >= MIN_COLLATERAL_RATIO,
        "Lending: insufficient collateral"
    );

    // Per-borrower cap (Reg D / MiFID suitability)
    require(newDebt <= maxBorrowPerUser, "Lending: exceeds borrow cap");

    // Pool-level cap (Basel III concentration limits)
    require(totalBorrows + amount <= poolBorrowCap, "Lending: pool cap reached");

    pos.debtPrincipal = newDebt;
    totalBorrows += amount;

    IERC20(borrowToken).safeTransfer(msg.sender, amount);
    emit Borrowed(msg.sender, amount, newDebt);
}
```

## Liquidation

```solidity
function liquidate(address borrower, uint256 repayAmount) external nonReentrant onlyVerified(msg.sender) {
    _accrueInterest(borrower);

    uint256 debt = _totalDebt(borrower);
    uint256 collateralValue = _getCollateralValue(borrower);

    require(
        collateralValue * 1e18 / debt < LIQUIDATION_THRESHOLD,
        "Lending: position healthy"
    );

    // Max repay = 50% of debt (prevents full liquidation in single tx)
    uint256 maxRepay = debt / 2;
    uint256 actualRepay = repayAmount > maxRepay ? maxRepay : repayAmount;

    uint256 collateralToSeize = actualRepay * LIQUIDATION_BONUS / 1e18
        * 1e18 / oracle.getPrice(collateralToken);

    positions[borrower].debtPrincipal -= actualRepay;
    positions[borrower].collateralAmount -= collateralToSeize;
    totalBorrows -= actualRepay;

    IERC20(borrowToken).safeTransferFrom(msg.sender, address(this), actualRepay);
    IERC20(collateralToken).safeTransfer(msg.sender, collateralToSeize);

    emit Liquidated(borrower, msg.sender, actualRepay, collateralToSeize);
}
```

## TWAP Oracle (Anti-manipulation)

```solidity
// Always use TWAP, never spot price for liquidation triggers
function _getCollateralValue(address user) internal view returns (uint256) {
    uint256 price = oracle.getTWAP(collateralToken, 30 minutes); // 30-min TWAP
    return positions[user].collateralAmount * price / 1e18;
}
```