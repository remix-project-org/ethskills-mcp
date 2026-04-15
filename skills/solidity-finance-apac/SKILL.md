---
name: solidity-finance-apac
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for financial instruments, securities, or crypto-assets targeting Asia-Pacific markets. Triggers
  include: MAS (Singapore), SFC (Hong Kong), FSA (Japan), FSC (South Korea), ASIC (Australia),
  Payment Services Act, Virtual Asset Service Provider licensing, tokenized securities in APAC,
  stablecoins in Singapore or Hong Kong, DeFi compliance in APAC, or any mention of "MAS compliant",
  "SFC licensed", "VASP APAC", "Singapore digital token", "Hong Kong virtual asset", "Japan FSA
  crypto", or "Australian crypto regulation". Always use this skill for APAC-jurisdiction financial
  Solidity — regulatory frameworks vary significantly by country.
---

# Solidity Finance — APAC Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for regulated financial
applications across Asia-Pacific markets: Singapore, Hong Kong, Japan, South Korea, and Australia.

> ⚠️ **Multi-jurisdiction note**: APAC has no unified crypto framework. Each jurisdiction has
> distinct rules. This skill covers all major markets — identify the target jurisdiction first
> and apply the relevant section. For US use `solidity-finance`. For EU use `solidity-finance-eu`.

---

## Jurisdiction Overview

| Market | Regulator | Key Framework | Token Classification |
|---|---|---|---|
| Singapore | MAS | Payment Services Act 2019 (amended 2023) | DPT, e-money, stablecoin |
| Hong Kong | SFC + HKMA | VASP licensing (AMLO), Stablecoin Bill 2024 | Virtual Asset, SFC-regulated |
| Japan | FSA | FIEA + PSA (amended 2023) | Crypto-asset, electronic payment instrument |
| South Korea | FSC/FSS | Virtual Asset User Protection Act 2024 | Virtual Asset |
| Australia | ASIC + AUSTRAC | ASIC CP 343, AML/CTF Act | Financial product, digital currency |

---

## Singapore — MAS Payment Services Act (PSA)

```solidity
// PSA License types relevant to DeFi/crypto:
// - Major Payment Institution (MPI): unlimited transaction volume
// - Standard Payment Institution (SPI): limited volume
// - Money-Changing Licence: FX only

enum MASLicenceType { NONE, SPI, MPI, EXEMPT }

interface IMASRegistry {
    function getLicence(address entity) external view returns (MASLicenceType);
    function isNoticeApplicable(address entity, uint256 noticeId) external view returns (bool);
    function isSingaporeResident(address investor) external view returns (bool);
}

// MAS Notice PSN01: DPT service providers must implement AML/CFT
// MAS Notice PSN02: Safeguarding customer assets
contract SingaporeDPTService {
    IMASRegistry public masRegistry;

    // MAS safeguarding: customer assets must be held separately
    address public safeguardingAccount; // Separate trust/custodian account
    mapping(address => uint256) public customerBalances;
    uint256 public totalCustomerFunds;

    modifier onlyMASLicensed() {
        require(
            masRegistry.getLicence(address(this)) != MASLicenceType.NONE,
            "PSA: MAS licence required"
        );
        _;
    }

    // MAS Notice PSN02: Safeguarding obligation
    function deposit(uint256 amount) external onlyMASLicensed {
        require(kycRegistry.isVerified(msg.sender), "PSA: KYC required");
        customerBalances[msg.sender] += amount;
        totalCustomerFunds += amount;
        // Funds must be in segregated safeguarding account
        IERC20(stablecoin).safeTransferFrom(msg.sender, safeguardingAccount, amount);
    }

    // Singapore stablecoin framework (MAS PS-S01):
    // Single-currency stablecoins pegged to SGD or G10 currencies
    // Reserve: 100% in cash/cash equivalents or sovereign bonds ≤3mo maturity
}

// MAS retail investor restrictions
uint256 constant MAS_RETAIL_CAP_SGD = 75_000e18; // S$75,000 annual cap for retail DPT purchases
```

---

## Hong Kong — SFC VASP Licensing

```solidity
// SFC VASP licence required from June 2023 (AMLO amendment)
// Two-tier system: SFC (securities) + HKMA (stablecoins/payments)

enum SFCLicenceType { NONE, TYPE_1, TYPE_7, VASP }
// Type 1: Dealing in securities (security tokens)
// Type 7: Providing automated trading services
// VASP: Virtual Asset Service Provider (from 2023)

interface ISFCRegistry {
    function getLicence(address entity) external view returns (SFCLicenceType);
    function isApprovedVirtualAsset(bytes32 assetId) external view returns (bool);
    function isProfessionalInvestor(address investor) external view returns (bool); // HK$8M threshold
}

// HK: Retail access to virtual assets allowed (unlike pre-2023 PI-only rule)
// BUT: complex products (derivatives, leveraged) still PI-only
contract HKVirtualAssetPlatform {
    ISFCRegistry public sfcRegistry;

    uint256 constant PI_THRESHOLD_HKD = 8_000_000e18; // HK$8 million = Professional Investor

    modifier onlySFCLicensed() {
        require(
            sfcRegistry.getLicence(address(this)) != SFCLicenceType.NONE,
            "SFC: VASP licence required"
        );
        _;
    }

    modifier onlyApprovedAsset(bytes32 assetId) {
        require(sfcRegistry.isApprovedVirtualAsset(assetId), "SFC: asset not approved for retail");
        _;
    }

    // HK Stablecoin Bill 2024: issuer licence required for HKD-pegged stablecoins
    // Reserve: 100% in HKD or equivalent high-quality liquid assets
    // Redemption: within 1 business day
}
```

---

## Japan — FSA FIEA + PSA

```solidity
// Japan classifies crypto into two categories:
// 1. Crypto-assets (暗号資産): BTC, ETH-like → regulated under PSA
// 2. Security tokens (電子記録移転有価証券表示権利等): equity/bond tokens → FIEA

enum JapanAssetType { CRYPTO_ASSET, SECURITY_TOKEN, ELECTRONIC_PAYMENT_INSTRUMENT }

// Japan FSA: Crypto Exchange Service Providers (CESP) must register
// Security Token Offering platforms: Type I Financial Instruments Business registration

contract JapanSecurityToken {
    // FIEA: Security tokens must use approved blockchain (FSA whitelist)
    bytes32 public approvedBlockchain; // e.g., keccak256("ETHEREUM_MAINNET")

    // Japan: strict transfer restrictions for security tokens
    // Cannot transfer to non-residents without additional disclosure
    mapping(address => bool) public isJapanResident;
    mapping(address => bool) public isQualifiedInstitutionalInvestor; // QII

    uint256 constant QII_THRESHOLD_JPY = 1_000_000_000e18; // ¥1 billion

    // FSA: Security token transfers must be reported to CESP/custodian
    event SecurityTokenTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp,
        bool crossBorder
    );

    function transfer(address to, uint256 amount) public override returns (bool) {
        bool crossBorder = isJapanResident[msg.sender] != isJapanResident[to];
        if (crossBorder) {
            // Cross-border transfers require additional disclosure under FIEA
            require(crossBorderDisclosureRegistry.hasDisclosure(msg.sender, to), 
                    "FIEA: cross-border disclosure required");
        }
        emit SecurityTokenTransfer(msg.sender, to, amount, block.timestamp, crossBorder);
        return super.transfer(to, amount);
    }

    // Japan PSA Amendment 2023: Stablecoins only issuable by:
    // - Banks, fund transfer service providers, trust companies
    // Foreign stablecoin issuers must appoint Japan-based agent
}
```

---

## South Korea — Virtual Asset User Protection Act (2024)

```solidity
// VAUPA effective July 2024: investor protection focused
// VASP registration with FSC required (since 2021 under SPTCA)

contract KoreaVASP {
    // VAUPA: mandatory hot/cold wallet separation
    // ≥80% of customer assets in cold storage
    uint256 public coldStoragePercent; // Must be ≥ 80e16 (80%)
    uint256 public constant MIN_COLD_STORAGE = 80e16;

    // VAUPA: mandatory insurance or reserve fund
    uint256 public insuranceFundBalance;
    uint256 public constant MIN_INSURANCE_RATIO = 5e16; // 5% of customer assets

    // VAUPA: market manipulation prohibition
    // Wash trading, spoofing, layering all explicitly prohibited
    mapping(address => uint256) public lastTradeTimestamp;
    mapping(bytes32 => uint256) public orderCount; // Per address per block

    uint256 constant WASH_TRADE_WINDOW = 30 seconds;

    modifier antiWashTrade() {
        require(
            block.timestamp > lastTradeTimestamp[msg.sender] + WASH_TRADE_WINDOW,
            "VAUPA: potential wash trade detected"
        );
        lastTradeTimestamp[msg.sender] = block.timestamp;
        _;
    }

    // VAUPA: abnormal trading must be reported to FSC/FSS
    event AbnormalTradingDetected(address indexed trader, string reason, uint256 timestamp);

    // Korea: real-name verification system — must link to Korean bank account
    mapping(address => bytes32) public realNameVerificationHash; // Hash of verified KRW bank account
}
```

---

## Australia — ASIC + AUSTRAC

```solidity
// Australia: crypto may be a "financial product" under Corps Act 2001
// ASIC CP 343 (2023): guidance on when tokens are financial products
// AUSTRAC: AML/CTF registration required for DCEs (Digital Currency Exchanges)

enum AustralianAssetClassification {
    NOT_FINANCIAL_PRODUCT,  // Pure utility token
    MANAGED_INVESTMENT,     // If pooled funds with expectation of return
    DERIVATIVE,             // If price derived from another asset
    NON_CASH_PAYMENT        // Payment token (AUSTRAC regulated)
}

contract AustralianTokenOffering {
    AustralianAssetClassification public classification;
    bytes32 public austracRegistrationNumber;
    bytes32 public asicLicenceNumber; // AFSL if financial product

    // ASIC: retail PDS (Product Disclosure Statement) required for financial products
    bytes32 public pdsIPFSCid;
    uint256 public pdsDate;

    // AUSTRAC: Travel Rule for transfers ≥ A$1,000
    uint256 constant AUSTRAC_TRAVEL_RULE_THRESHOLD = 1_000e18; // A$1,000

    // ASIC CP 343: Hawking prohibition — no unsolicited offers of financial products
    mapping(address => bool) public hasOptedIn;

    modifier noHawking(address recipient) {
        if (classification != AustralianAssetClassification.NOT_FINANCIAL_PRODUCT) {
            require(hasOptedIn[recipient], "ASIC: no unsolicited financial product offers");
        }
        _;
    }

    // Australia: sophisticated/professional investor threshold A$2.5M net assets or A$250k income
    uint256 constant SOPHISTICATED_INVESTOR_ASSETS = 2_500_000e18;  // A$2.5M
    uint256 constant SOPHISTICATED_INVESTOR_INCOME = 250_000e18;    // A$250k
}
```

---

## Cross-APAC Common Patterns

```solidity
// Travel Rule thresholds by jurisdiction
mapping(bytes2 => uint256) public travelRuleThresholds;
// SG: SGD 1,500 | HK: HKD 8,000 | JP: JPY 100,000 | KR: KRW 1,000,000 | AU: AUD 1,000

// Sanctions lists vary by jurisdiction — must check all applicable lists
interface IAPACSanctionsOracle {
    function isSanctionedUNSC(address wallet) external view returns (bool);
    function isSanctionedMAS(address wallet) external view returns (bool);   // Singapore
    function isSanctionedOFAC(address wallet) external view returns (bool);  // US SDN (often required)
    function isSanctionedFSA(address wallet) external view returns (bool);   // Japan
    function isSanctionedAustralian(address wallet) external view returns (bool);
}

modifier apacSanctionsCheck(address party, bytes2 jurisdiction) {
    require(!sanctionsOracle.isSanctionedUNSC(party), "APAC: UN sanctions");
    if (jurisdiction == "SG") require(!sanctionsOracle.isSanctionedMAS(party), "MAS: sanctioned");
    if (jurisdiction == "AU") require(!sanctionsOracle.isSanctionedAustralian(party), "AUSTRAC: sanctioned");
    _;
}
```

---

## Security & Compliance Checklist

- [ ] Identify target APAC jurisdiction(s) before writing compliance logic
- [ ] Singapore: MAS licence type verified; safeguarding account segregated
- [ ] Hong Kong: SFC VASP licence; asset on SFC approved list for retail
- [ ] Japan: asset classified (crypto-asset vs security token vs EPI); CESP registered
- [ ] South Korea: ≥80% cold storage; insurance fund ≥5%; wash trade prevention active
- [ ] Australia: ASIC classification determined; AUSTRAC registered; PDS if financial product
- [ ] Travel Rule thresholds respected per jurisdiction
- [ ] All applicable sanctions lists checked (UNSC + local)
- [ ] Cross-border transfers flag nationality of sender/receiver

---

## Reference Files

- `references/mas-psa-details.md` — Singapore PSA licensing, DPT notices, stablecoin framework
- `references/sfc-hkma-details.md` — Hong Kong VASP licensing, SFC circulars, HKMA stablecoin
- `references/japan-fiea-psa.md` — Japan security token framework, crypto-asset exchange rules
