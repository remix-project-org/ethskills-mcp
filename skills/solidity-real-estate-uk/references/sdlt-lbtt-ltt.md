# UK Land Taxes — SDLT, LBTT & LTT Full Rate Tables Reference

## Overview
Three separate land taxes apply in the UK by jurisdiction:
- **SDLT** (Stamp Duty Land Tax): England + Northern Ireland — HMRC
- **LBTT** (Land and Buildings Transaction Tax): Scotland — Revenue Scotland
- **LTT** (Land Transaction Tax): Wales — Welsh Revenue Authority (WRA)

---

## SDLT — England & Northern Ireland

### Residential SDLT Rates (2024/25)

```solidity
// Standard residential rates (from October 2021, reverting from COVID relief)
// Note: temporary threshold changes may apply — always check current HMRC rates

struct SDLTBand {
    uint256 fromGBP;
    uint256 toGBP;      // 0 = no upper limit
    uint256 rateBPS;
}

// Standard residential bands:
SDLTBand[] public standardResidentialBands = [
    SDLTBand(0,          250_000e18,  0),     // 0%
    SDLTBand(250_000e18, 925_000e18,  500),   // 5%
    SDLTBand(925_000e18, 1_500_000e18, 1000), // 10%
    SDLTBand(1_500_000e18, 0,         1200)   // 12%
];

// First-time buyer relief (property ≤ £625,000):
// £0–£425,000: 0% | £425,001–£625,000: 5% | Above £625,000: standard rates apply (no relief)
uint256 constant FTB_ZERO_THRESHOLD = 425_000e18;
uint256 constant FTB_RELIEF_CAP = 625_000e18;

// Additional dwelling surcharge: +3% on all bands (from 31 Oct 2024: +5%)
// Note: surcharge rate increased from 3% to 5% from 31 October 2024
uint256 constant ADDITIONAL_DWELLING_SURCHARGE_BPS = 500; // 5% (post Oct 2024)

// Non-UK resident surcharge: +2% (from April 2021)
uint256 constant NON_UK_RESIDENT_SURCHARGE_BPS = 200; // 2%

// Corporate purchaser (residential >£500k): 15% flat rate
uint256 constant CORPORATE_RESIDENTIAL_FLAT_RATE_BPS = 1500; // 15%
uint256 constant CORPORATE_FLAT_RATE_THRESHOLD = 500_000e18;

function calcSDLTResidential(
    uint256 valueGBP,
    bool isFirstTimeBuyer,
    bool isAdditionalDwelling,
    bool isNonUKResident,
    bool isCorporate
) public pure returns (uint256 sdlt) {
    // Corporate flat rate check first
    if (isCorporate && valueGBP > CORPORATE_FLAT_RATE_THRESHOLD) {
        return valueGBP * CORPORATE_RESIDENTIAL_FLAT_RATE_BPS / 10_000;
    }

    // First-time buyer relief
    if (isFirstTimeBuyer && !isAdditionalDwelling && valueGBP <= FTB_RELIEF_CAP) {
        if (valueGBP <= FTB_ZERO_THRESHOLD) {
            sdlt = 0;
        } else {
            sdlt = (valueGBP - FTB_ZERO_THRESHOLD) * 500 / 10_000; // 5%
        }
    } else {
        // Standard banded calculation
        if (valueGBP > 1_500_000e18)
            sdlt += (valueGBP - 1_500_000e18) * 1200 / 10_000;
        if (valueGBP > 925_000e18)
            sdlt += (min(valueGBP, 1_500_000e18) - 925_000e18) * 1000 / 10_000;
        if (valueGBP > 250_000e18)
            sdlt += (min(valueGBP, 925_000e18) - 250_000e18) * 500 / 10_000;
        // First band: 0%
    }

    // Surcharges
    if (isAdditionalDwelling) sdlt += valueGBP * ADDITIONAL_DWELLING_SURCHARGE_BPS / 10_000;
    if (isNonUKResident) sdlt += valueGBP * NON_UK_RESIDENT_SURCHARGE_BPS / 10_000;
}

function min(uint256 a, uint256 b) internal pure returns (uint256) {
    return a < b ? a : b;
}
```

### Non-Residential / Mixed SDLT

```solidity
// Non-residential and mixed-use property bands:
// £0–£150,000: 0% | £150,001–£250,000: 2% | Above £250,000: 5%

function calcSDLTNonResidential(uint256 valueGBP) public pure returns (uint256 sdlt) {
    if (valueGBP > 250_000e18)
        sdlt += (valueGBP - 250_000e18) * 500 / 10_000;
    if (valueGBP > 150_000e18)
        sdlt += (min(valueGBP, 250_000e18) - 150_000e18) * 200 / 10_000;
    // First £150k: 0%
}
```

---

## LBTT — Scotland (Revenue Scotland)

```solidity
// Land and Buildings Transaction Tax — administered by Revenue Scotland
// Residential rates (2024/25):
// £0–£145,000: 0% | £145,001–£250,000: 2% | £250,001–£325,000: 5%
// £325,001–£750,000: 10% | Above £750,000: 12%

// ADS (Additional Dwelling Supplement): +6% on total price (from April 2024)
uint256 constant ADS_RATE_BPS = 600; // 6% (increased from 4%)

// First-time buyer relief: £0–£175,000 at 0%
uint256 constant LBTT_FTB_THRESHOLD = 175_000e18;

function calcLBTTResidential(
    uint256 valueGBP,
    bool isFirstTimeBuyer,
    bool isAdditionalDwelling
) public pure returns (uint256 lbtt) {
    uint256 threshold1 = isFirstTimeBuyer ? LBTT_FTB_THRESHOLD : 145_000e18;

    if (valueGBP > 750_000e18)
        lbtt += (valueGBP - 750_000e18) * 1200 / 10_000;
    if (valueGBP > 325_000e18)
        lbtt += (min(valueGBP, 750_000e18) - 325_000e18) * 1000 / 10_000;
    if (valueGBP > 250_000e18)
        lbtt += (min(valueGBP, 325_000e18) - 250_000e18) * 500 / 10_000;
    if (valueGBP > threshold1)
        lbtt += (min(valueGBP, 250_000e18) - threshold1) * 200 / 10_000;
    // Below threshold1: 0%

    if (isAdditionalDwelling) lbtt += valueGBP * ADS_RATE_BPS / 10_000;
}

// LBTT Non-residential:
// £0–£150,000: 0% | £150,001–£250,000: 1% | Above £250,000: 5%
function calcLBTTNonResidential(uint256 valueGBP) public pure returns (uint256 lbtt) {
    if (valueGBP > 250_000e18)
        lbtt += (valueGBP - 250_000e18) * 500 / 10_000;
    if (valueGBP > 150_000e18)
        lbtt += (min(valueGBP, 250_000e18) - 150_000e18) * 100 / 10_000;
}
```

---

## LTT — Wales (Welsh Revenue Authority)

```solidity
// Land Transaction Tax — administered by Welsh Revenue Authority
// Residential rates (2024/25):
// £0–£225,000: 0% | £225,001–£400,000: 6% | £400,001–£750,000: 7.5%
// £750,001–£1,500,000: 10% | Above £1,500,000: 12%

// Higher residential rates (additional dwellings): +4% surcharge
uint256 constant LTT_HIGHER_RATE_SURCHARGE_BPS = 400; // 4%

function calcLTTResidential(
    uint256 valueGBP,
    bool isAdditionalDwelling
) public pure returns (uint256 ltt) {
    if (valueGBP > 1_500_000e18)
        ltt += (valueGBP - 1_500_000e18) * 1200 / 10_000;
    if (valueGBP > 750_000e18)
        ltt += (min(valueGBP, 1_500_000e18) - 750_000e18) * 1000 / 10_000;
    if (valueGBP > 400_000e18)
        ltt += (min(valueGBP, 750_000e18) - 400_000e18) * 750 / 10_000;
    if (valueGBP > 225_000e18)
        ltt += (min(valueGBP, 400_000e18) - 225_000e18) * 600 / 10_000;
    // First £225k: 0%

    if (isAdditionalDwelling) ltt += valueGBP * LTT_HIGHER_RATE_SURCHARGE_BPS / 10_000;
}

// LTT Non-residential:
// £0–£225,000: 0% | £225,001–£250,000: 1% | £250,001–£1,000,000: 5% | Above £1M: 6%
function calcLTTNonResidential(uint256 valueGBP) public pure returns (uint256 ltt) {
    if (valueGBP > 1_000_000e18)
        ltt += (valueGBP - 1_000_000e18) * 600 / 10_000;
    if (valueGBP > 250_000e18)
        ltt += (min(valueGBP, 1_000_000e18) - 250_000e18) * 500 / 10_000;
    if (valueGBP > 225_000e18)
        ltt += (min(valueGBP, 250_000e18) - 225_000e18) * 100 / 10_000;
}
```

---

## Determining Jurisdiction

```solidity
// Critical: land tax jurisdiction is determined by where the property is located
// NOT where the buyer/seller is resident or incorporated

function getLandTaxJurisdiction(bytes32 postcode)
    external view returns (string memory jurisdiction) {
    // Scottish postcodes: AB, DD, DG, EH, FK, G, HS, IV, KA, KW, KY, ML, PA, PH, TD, ZE
    // Welsh postcodes: CF, CH (part), HR (part), LD, LL, NP, SA, SY (part)
    // All others: England (SDLT) | Northern Ireland: BT postcodes (also SDLT)
    // Note: implement using off-chain oracle for postcode lookup
}

// Jurisdiction mapping (simplified):
// "EN" or "NI" → SDLT | "SC" → LBTT | "WL" → LTT
mapping(bytes2 => string) public landTaxByJurisdiction;
```
