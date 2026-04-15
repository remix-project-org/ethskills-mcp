# Japan FSA — FIEA & PSA Crypto-Asset Framework Reference

## Overview
Japan was one of the first G20 countries to regulate crypto, amending the Payment Services Act (PSA)
in 2017 to bring crypto exchanges into scope. Further amendments in 2020 and 2023 refined the framework.

Two main laws govern crypto in Japan:
- **PSA (資金決済に関する法律)**: Crypto-asset (暗号資産) exchanges + stablecoins
- **FIEA (金融商品取引法)**: Security tokens + investment management

---

## Asset Classification Under Japanese Law

```solidity
// Japan has three distinct categories for digital assets:

enum JapanDigitalAssetType {
    CRYPTO_ASSET,               // 暗号資産 — PSA regulated (BTC, ETH, etc.)
    ELECTRONIC_PAYMENT_INSTRUMENT, // 電子決済手段 — PSA regulated (stablecoins)
    ELECTRONIC_SECURITY,        // 電子記録移転有価証券表示権利等 — FIEA regulated (security tokens)
    UTILITY_TOKEN               // No specific regulation if not security/crypto-asset
}

// Crypto-asset (PSA s.2(5)): property value exchangeable for payment that can be
// transferred electronically using electronic information processing

// Electronic Payment Instrument (EPI): added in 2023 PSA amendment
// Covers stablecoins pegged to fiat currencies issued by regulated entities
// EPIs must be issued by: banks, fund transfer service providers, trust companies

// Electronic Security (FIEA s.2(2)): rights expressible on electronic device
// that fall under securities definition (equity, bond-like rights)
// Requires: Type II FIBO + Investment Management Business registration for operators
```

---

## Crypto-Asset Exchange Service Provider (CAESP) Registration

```solidity
// All Japan crypto exchanges must register with FSA under PSA
// Registration number format: 関東財務局長 第○○号 (Kanto Finance Bureau No. XX)

struct JapanCAESPRegistration {
    bytes32 registrationNumber;     // FSA registration number hash
    bytes32 financeDirectorRef;     // Regional Finance Bureau reference
    uint256 registrationDate;
    bool isRegistered;
    bytes32[] permittedActivities;  // e.g. keccak256("SPOT_TRADING"), keccak256("CUSTODY")
    uint256 capitalRequirementJPY;  // Minimum ¥10M net assets for CAESP
}

uint256 constant CAESP_MIN_NET_ASSETS_JPY = 10_000_000e18; // ¥10M

// CAESP annual reporting: financial statements filed with regional Finance Bureau
// AML/CFT: registered with Japan Financial Intelligence Centre (JAFIC)

interface IJapanFSARegistry {
    function isRegisteredCAESP(address entity) external view returns (bool);
    function isRegisteredFIBO(address entity) external view returns (bool); // For security tokens
    function getRegistrationNumber(address entity) external view returns (bytes32);
}
```

---

## PSA Requirements for Crypto-Asset Exchanges

```solidity
// PSA s.63-14 et seq: CAESP obligations

// 1. Asset Segregation: customer crypto-assets must be segregated from proprietary assets
// Cold storage: majority of customer assets (FSA guidance: ≥95%)
// Hot wallet: ≤5% with security measures

uint256 constant JAPAN_COLD_STORAGE_REQUIREMENT = 9500; // 95%

// 2. Cold wallet management: multi-sig, offline storage required
// 3. System security: FSA Comprehensive Guidelines requirements

// 4. AML/CFT (PSA s.63-11, AML Act):
// Japan Act on Prevention of Transfer of Criminal Proceeds (犯罪収益移転防止法)
// CDD required: name, address, DOB for individuals + UBO for corporations

struct JapanCDDRecord {
    address customer;
    bytes32 myNumberHash;           // Individual Number (マイナンバー) hash — if provided
    bytes32 driverLicenceHash;      // OR driver's licence hash
    bytes32 nameHash;
    bytes32 addressHash;
    bytes32 dobHash;
    JapanRiskLevel riskLevel;
    uint256 cddDate;
}

enum JapanRiskLevel { LOW, MEDIUM, HIGH }

// 5. Travel Rule (JVCEA self-regulatory: implemented from 2023)
// Japan Virtual Currency Exchange Association (JVCEA) guidance
// Threshold: ¥100,000 (≈ FATF equivalent at prevailing rates)

uint256 constant JAPAN_TRAVEL_RULE_THRESHOLD_JPY = 100_000e18; // ¥100,000

struct JapanTravelRuleData {
    bytes32 senderNameHash;
    bytes32 senderAddressHash;
    bytes32 senderCAESPRegistrationNo;
    bytes32 recipientNameHash;
    bytes32 recipientCAESPRegistrationNo;
    uint256 amountJPY;
}
```

---

## EPI (Electronic Payment Instrument) — Stablecoin Rules (2023 PSA Amendment)

```solidity
// 2023 PSA amendment: comprehensive stablecoin framework
// EPIs = stablecoins pegged to fiat (JPY, USD, EUR etc.)

// Only these entities can ISSUE EPIs:
// 1. Banks (銀行) registered under Banking Act
// 2. Fund Transfer Service Providers (資金移動業者) — 1st class only
// 3. Trust companies (信託会社) — bank trust or licensed trust company

enum EPIIssuerType { BANK, FUND_TRANSFER_1ST_CLASS, TRUST_COMPANY }

struct JapanEPIIssuer {
    EPIIssuerType issuerType;
    bytes32 fsbRegistrationNo;      // Financial Services Bureau registration
    bytes32 referenceFiatCurrency;  // e.g. keccak256("JPY"), keccak256("USD")
    uint256 reserveRatioJPY;        // Must be 100% backed
    address trusteeBank;            // If trust company structure: custodian bank
}

// EPI restrictions:
// - Cannot pay interest to holders (bank law restriction)
// - Must be redeemable at par on demand
// - Transfers: only between registered EPI intermediaries

// Foreign stablecoin issuers (e.g. USDC): must appoint Japan-based "domestic handling agent"
// Domestic handling agent: registered Japanese financial institution that represents issuer

struct JapanDomesticHandlingAgent {
    address agentAddress;
    bytes32 fsbRegistrationNo;
    bytes32 foreignIssuerName;
    bytes2 foreignIssuerCountry;
    uint256 appointmentDate;
    bytes32 agencyAgreementCID;
}
```

---

## FIEA — Security Token Obligations

```solidity
// Security tokens (電子記録移転有価証券表示権利等) = ETSP

// Types of securities that can be tokenised:
// - Investment trust beneficiary interests (投資信託受益権)
// - Collective investment scheme interests (集団投資スキーム持分)
// - Bond/note interests (社債)
// - Equity interests (株式) — limited currently

// FIEA Art. 2: ETSP = rights that:
// (a) Fall under definition of securities
// (b) Can be transferred electronically using information processing

// Required registrations for ETSP platforms:
// Type II FIBO (第二種金融商品取引業): dealing + intermediation for ETSP
// Investment Management Business (投資運用業): if managing investment decisions

// Transfer restrictions for ETSP:
// "Specially permitted business for qualified institutional investors" (QII)
// OR prospectus-based public offering (公募)

bool public isQIISpecialBusiness;     // Restricted to Qualified Institutional Investors
bool public isPublicOffering;          // Public offering with prospectus

uint256 constant JAPAN_QII_NET_ASSETS_JPY = 1_000_000_000e18; // ¥1B for QII status

// ETSP: transfer restrictions embedded on-chain
// Standard lockup for private placements: no transfer for 1 year without prospectus
uint256 constant JAPAN_PRIVATE_PLACEMENT_LOCKUP = 365 days;
```

---

## Japan AML — Act on Prevention of Transfer of Criminal Proceeds

```solidity
// 犯収法 (Hanzai Shueki Itten Boshi Ho): Japan's primary AML law
// CAESPs designated as "specified business operators" (特定事業者)

// Required AML measures:
// 1. Customer identification + verification (本人確認)
// 2. Retention of transaction records: 7 years
// 3. Suspicious transaction reporting (疑わしい取引の届出) to JAFIC

uint256 constant JAPAN_RECORD_RETENTION_PERIOD = 7 * 365 days; // 7 years

// Suspicious transaction reporting: to Japan Financial Intelligence Centre (JAFIC)
// Timing: without delay after identification (no specific deadline, but promptly)
// Volume: Japan CAESPs submit tens of thousands of STRs annually

// My Number (マイナンバー) for CDD:
// CAESPs can request Individual Number for verification purposes
// Must be stored securely under My Number Act (マイナンバー法) — separate compliance

// PEP definition in Japan:
// Foreign PEPs: senior officials of foreign governments + their families
// Domestic PEPs: no statutory definition but best practice to screen
// Note: Japan has no domestic PEP list — use international PEP databases

bool public screenForeignPEPs;      // Must be true
bool public screenDomesticPEPs;     // Best practice
bytes32 public pepDatabaseProvider;  // e.g. keccak256("WORLD_CHECK"), keccak256("REFINITIV")
```
