# ELTIF 2.0 — Retail Real Estate Fund Requirements Reference

## Overview
ELTIF 2.0 (Regulation 2023/606, effective January 2024) significantly expands retail
access to long-term investments including real estate.

## Key Changes from ELTIF 1.0

| Feature | ELTIF 1.0 | ELTIF 2.0 |
|---|---|---|
| Minimum investment | €10,000 | Removed for non-advised retail |
| 10% portfolio limit | Yes (retail <€500k) | Removed |
| Leverage limit | 30% NAV | 50% NAV (retail), 100% (professional) |
| Liquidity window | Not required | Optional — can be open-ended |
| Eligible assets | Stricter | Broader (including real assets, green infrastructure) |

---

## Eligibility Requirements

```solidity
// ELTIF must invest ≥55% in eligible long-term assets
uint256 constant ELTIF_MIN_ELIGIBLE_ASSETS_BPS = 5500; // 55%

// Eligible real estate assets for ELTIF:
// - Real assets (infrastructure, real estate) with value ≥€10M
// - Unlisted companies with ≥2 employees or having registered office in EU
// - Listed SMEs (market cap ≤€1.5B)
// - European Long-Term Investment Funds (other ELTIFs)
// - EuVECA, EuSEF funds

uint256 constant MIN_REAL_ASSET_VALUE_EUR = 10_000_000e18; // €10M per asset

// Diversification: single asset ≤20% of ELTIF capital (vs 10% under ELTIF 1.0)
uint256 constant MAX_SINGLE_ASSET_CONCENTRATION_BPS = 2000; // 20%

// Aggregate of exposures >20% per issuer: total cannot exceed 40%
uint256 constant MAX_AGGREGATE_LARGE_EXPOSURES_BPS = 4000; // 40%

struct ELTIFPortfolioCheck {
    uint256 totalNetAssets;
    uint256 eligibleLongTermAssets;
    uint256 largestSingleAsset;
    uint256 sumOfLargeExposures;    // All exposures >20% aggregated

    function check() internal pure returns (bool, string memory) {
        if (eligibleLongTermAssets * 10_000 / totalNetAssets < 5500)
            return (false, "ELTIF: <55% in eligible assets");
        if (largestSingleAsset * 10_000 / totalNetAssets > 2000)
            return (false, "ELTIF: single asset >20% of capital");
        if (sumOfLargeExposures * 10_000 / totalNetAssets > 4000)
            return (false, "ELTIF: large exposures >40% aggregate");
        return (true, "");
    }
}
```

---

## Open-Ended ELTIF — Liquidity Window Requirements

```solidity
// ELTIF 2.0: can now be open-ended with redemption windows
// Manager must implement matching mechanism between redemptions and subscriptions

struct LiquidityWindowPolicy {
    uint256 windowFrequencyDays;    // e.g. 90 = quarterly
    uint256 maxRedemptionPerWindowBPS; // e.g. 500 = 5% of NAV per quarter
    uint256 noticeRequiredDays;     // Advance notice for redemption request
    bool hasMatchingMechanism;      // New investors can take position of redeemers
    uint256 valuationFrequencyDays; // Asset valuation frequency (≤12 months for RE)
}

// Independent valuer required for real assets (Art. 19 ELTIF 2.0)
interface IIndependentValuer {
    function getPropertyValuation(uint256 propertyId) external view
        returns (uint256 valueEUR, uint256 valuationDate, bytes32 valuationReportCID);
}

// NAV-based redemption: price at next available NAV after redemption request
mapping(address => uint256) public pendingRedemptions; // investor → shares
mapping(address => uint256) public redemptionRequestDate;

function requestRedemption(uint256 shares) external {
    require(eltifToken.balanceOf(msg.sender) >= shares, "ELTIF: insufficient balance");
    pendingRedemptions[msg.sender] += shares;
    redemptionRequestDate[msg.sender] = block.timestamp;
    emit RedemptionRequested(msg.sender, shares, block.timestamp);
}

function processRedemption(address investor) external onlyRole(MANAGER_ROLE) {
    uint256 shares = pendingRedemptions[investor];
    require(shares > 0, "ELTIF: no pending redemption");
    require(
        block.timestamp >= redemptionRequestDate[investor] + noticePeriodDays * 1 days,
        "ELTIF: notice period not elapsed"
    );

    uint256 navPerShare = _currentNAV() / eltifToken.totalSupply();
    uint256 proceeds = shares * navPerShare;

    delete pendingRedemptions[investor];
    eltifToken.burn(investor, shares);
    stablecoin.safeTransfer(investor, proceeds);
    emit RedemptionProcessed(investor, shares, proceeds);
}
```

---

## Retail Investor Protections (ELTIF 2.0)

```solidity
// ELTIF 2.0: no minimum investment amount but suitability/appropriateness applies
// For advised retail: investment firm must assess suitability (MiFID II suitability)
// For non-advised retail: ELTIF manager must assess appropriateness

// Key Information Document (KID) required under PRIIPs regulation
bytes32 public kidIPFSCID;
uint256 public kidVersion;
uint256 public kidLastUpdated;

// ELTIF label: cannot be marketed as ELTIF without ESMA registration
bytes32 public esmaELTIFRegistryId;

// Cooling-off: retail investors have right to revoke commitment
// within a period set in the prospectus (typically 2 weeks)
uint256 public constant COOLING_OFF_PERIOD = 14 days;
mapping(address => uint256) public subscriptionTimestamp;

function subscribe(uint256 amount) external {
    require(esmaELTIFRegistryId != bytes32(0), "ELTIF: not registered with ESMA");
    require(kidIPFSCID != bytes32(0), "ELTIF: KID required");

    subscriptionTimestamp[msg.sender] = block.timestamp;
    // ... subscription logic
}

function cancelSubscription() external {
    require(
        block.timestamp <= subscriptionTimestamp[msg.sender] + COOLING_OFF_PERIOD,
        "ELTIF: cooling-off period expired"
    );
    // ... refund logic
    emit SubscriptionCancelled(msg.sender, block.timestamp);
}
```

---

## Leverage Limits

```solidity
// ELTIF 2.0 leverage limits:
// Open-ended ELTIF with retail investors: 50% of NAV
// Closed-ended ELTIF with retail: 50% of NAV (borrowing for investment)
// ELTIF with only professional investors: 100% of NAV

uint256 constant MAX_LEVERAGE_RETAIL_BPS = 5000;       // 50% of NAV
uint256 constant MAX_LEVERAGE_PROFESSIONAL_BPS = 10000; // 100% of NAV

// Borrowing for hedging (FX, interest rate) does not count toward leverage limit
bool public isRetailAccessible;

modifier eltifLeverageCheck(uint256 proposedBorrowing, uint256 nav) {
    uint256 limit = isRetailAccessible ? MAX_LEVERAGE_RETAIL_BPS : MAX_LEVERAGE_PROFESSIONAL_BPS;
    require(
        (totalBorrowing + proposedBorrowing) * 10_000 / nav <= limit,
        "ELTIF: leverage limit exceeded"
    );
    _;
}
```
