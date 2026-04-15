---
name: solidity-finance-uk
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for financial instruments, securities, or crypto-assets targeting the United Kingdom post-Brexit.
  Triggers include: FCA authorization, UK Financial Services and Markets Act (FSMA 2000), UK MiCA
  equivalent (UK crypto regime), FCA PS23/4 stablecoin regulation, UK MAR, UK Prospectus Regulation,
  sandbox regimes (FCA Sandbox, DRCF), tokenized gilts, UK ESG, or any mention of "FCA compliant",
  "UK regulated token", "UK stablecoin", or "FCA authorized DeFi". Always use this skill for
  UK-jurisdiction financial Solidity — post-Brexit UK law diverges significantly from EU MiCA.
---

# Solidity Finance — UK Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for regulated financial
applications operating under United Kingdom law post-Brexit. Your code enforces FCA rules,
UK FSMA 2000, and the emerging UK crypto regulatory regime.

> ⚠️ **Jurisdiction note**: UK law diverged from EU law after Brexit (Jan 2021). The UK is
> developing its own crypto regime distinct from EU MiCA. For EU rules use `solidity-finance-eu`.

---

## Core UK Regulatory Frameworks

| Regulation / Body | Key On-Chain Requirements |
|---|---|
| FSMA 2000 + Financial Services Act 2021 | Regulated activity authorization, financial promotions |
| FCA PS23/4 (Fiat-backed Stablecoins) | Reserve requirements, redemption rights, systemic designation |
| UK MAR (Market Abuse Regulation) | Insider dealing prevention, market manipulation surveillance |
| UK Prospectus Regulation | Prospectus for offers >£8M to public |
| FCA COBS (Conduct of Business) | Appropriateness/suitability for retail, risk warnings |
| Money Laundering Regulations 2017 (MLR17) | KYC, CDD, EDD, SAR obligations |
| UK GDPR + DPA 2018 | Data minimization, no PII on-chain |
| Bank of England (systemic stablecoins) | Systemic designation if widely used for payments |
| FCA Sandbox / DRCF | Innovation testing regime — modified rules apply |

---

## FCA Crypto Registration & Authorization

```solidity
// All UK crypto firms must be registered with FCA under MLR17
// (or authorized under FSMA for broader financial services)

interface IFCARegistry {
    // FCA Firm Reference Number (FRN)
    function isRegistered(address firm) external view returns (bool);
    function getFRN(address firm) external view returns (uint256 frn);
    function getRegistrationType(address firm)
        external view returns (RegistrationType);
}

enum RegistrationType {
    MLR17_REGISTERED,       // Crypto asset business registration
    FSMA_AUTHORIZED,        // Full FCA authorization
    SANDBOX_PARTICIPANT,    // FCA Sandbox / DRCF testing
    TEMPORARY_REGISTRATION  // Transitional registration
}

modifier onlyFCARegistered() {
    require(
        fcaRegistry.isRegistered(msg.sender),
        "UK: FCA registration required"
    );
    _;
}
```

---

## UK Stablecoin (FCA PS23/4)

The UK regime for fiat-backed stablecoins (used as means of payment) differs from EU MiCA:

```solidity
contract UKFiatStablecoin is ERC20, Pausable {
    // FCA PS23/4: Reserve must be in UK bank accounts or BoE reserves
    address public reserveCustodian;        // FCA-authorized UK bank
    uint256 public reserveBalance;          // Updated by authorized auditor oracle
    bool public isSystemicallyDesignated;   // Designated by HMT/BoE if systemic

    // FCA: Redemption must be within 1 business day for retail holders
    uint256 public constant RETAIL_REDEMPTION_WINDOW = 1 days;
    uint256 public constant WHOLESALE_REDEMPTION_WINDOW = 2 days;

    // Financial Promotions: must be approved by FCA-authorized person (s.21 FSMA)
    bytes32 public financialPromotionApprovalRef;
    address public approvedCommunicator;    // FCA-authorized approver

    // UK MAR: Large holders must be flagged for market surveillance
    uint256 public constant PDT_THRESHOLD = 1_000_000e18; // £1M threshold

    function transfer(address to, uint256 amount) public override returns (bool) {
        require(kycRegistry.isVerified(msg.sender), "UK: KYC required");
        require(kycRegistry.isVerified(to), "UK: recipient KYC required");

        // MLR17: Enhanced due diligence for high-value transfers
        if (amount >= PDT_THRESHOLD) {
            require(eddRegistry.hasEDD(msg.sender), "UK: EDD required for large transfer");
            emit HighValueTransfer(msg.sender, to, amount, block.timestamp);
        }

        return super.transfer(to, amount);
    }

    function mint(address to, uint256 amount)
        external onlyRole(ISSUER_ROLE) onlyFCARegistered {
        require(reserveBalance >= totalSupply() + amount, "UK: reserve insufficient");
        _mint(to, amount);
    }

    // BoE systemic designation triggers enhanced oversight
    function designateSystemic() external onlyRole(BOE_ROLE) {
        isSystemicallyDesignated = true;
        emit SystemicDesignation(block.timestamp);
        // Triggers: BoE oversight, recovery/resolution plan requirements
    }
}
```

---

## Financial Promotions (s.21 FSMA)

Communicating a financial promotion without FCA authorization is a criminal offence:

```solidity
struct FinancialPromotion {
    bytes32 contentHash;            // Hash of approved promotional content
    address approvedBy;             // FCA-authorized firm that approved it
    uint256 approvalDate;
    uint256 expiryDate;             // Approvals are time-limited
    bytes32 fcaApprovalRef;         // FCA reference number for the approval
    bool isApproved;
}

mapping(bytes32 => FinancialPromotion) public promotions;

// All on-chain marketing must reference an approved promotion
modifier promotionApproved(bytes32 promotionId) {
    FinancialPromotion storage p = promotions[promotionId];
    require(p.isApproved, "FSMA: promotion not approved");
    require(block.timestamp <= p.expiryDate, "FSMA: promotion approval expired");
    _;
}
```

---

## FCA COBS — Appropriateness for Retail

```solidity
// FCA PS22/10: Appropriateness assessment required for restricted mass market investments
// Retail clients must pass assessment OR receive risk warning + 24h cooling off

enum RetailInvestmentStatus {
    NOT_ASSESSED,
    APPROPRIATE,
    NOT_APPROPRIATE,        // Warned but proceeded (limited amount allowed)
    COOLING_OFF             // 24-hour cooling off period active
}

struct RetailAssessment {
    RetailInvestmentStatus status;
    uint256 assessmentDate;
    uint256 coolingOffExpiry;
    uint256 maxInvestmentGBP;   // For "not appropriate" clients: limited to £10,000/year
    bytes32 riskWarningAckHash; // Hash of signed risk warning acknowledgment
}

mapping(address => RetailAssessment) public retailAssessments;

uint256 constant NOT_APPROPRIATE_CAP = 10_000e18; // £10,000 annual cap
uint256 constant COOLING_OFF_PERIOD = 24 hours;

function investRetail(uint256 amount) external {
    RetailAssessment storage a = retailAssessments[msg.sender];
    require(a.status != RetailInvestmentStatus.NOT_ASSESSED, "COBS: assessment required");
    require(block.timestamp > a.coolingOffExpiry, "COBS: cooling off period active");

    if (a.status == RetailInvestmentStatus.NOT_APPROPRIATE) {
        require(
            annualInvestment[msg.sender] + amount <= NOT_APPROPRIATE_CAP,
            "COBS: annual investment cap exceeded for non-appropriate client"
        );
    }
    annualInvestment[msg.sender] += amount;
    // ... investment logic
}
```

---

## UK MLR17 — AML / KYC

```solidity
// MLR17 requires Customer Due Diligence (CDD) and Enhanced Due Diligence (EDD)

enum CDDLevel { SIMPLIFIED, STANDARD, ENHANCED }

interface IUKKYCRegistry {
    function getCDDLevel(address customer) external view returns (CDDLevel);
    function isPEP(address customer) external view returns (bool);           // Politically Exposed Person
    function isHighRiskCountry(bytes2 country) external view returns (bool); // FATF grey/black list
    function hasSAR(address customer) external view returns (bool);          // Suspicious Activity Report filed
    function isSanctioned(address customer) external view returns (bool);    // OFSI sanctions list
}

// EDD required for: PEPs, high-risk countries, transactions >£10,000, unusual patterns
modifier eddCheck(address customer, uint256 amount) {
    IUKKYCRegistry kyc = IUKKYCRegistry(kycRegistry);
    require(!kyc.isSanctioned(customer), "MLR17: OFSI sanctioned");
    if (kyc.isPEP(customer) || amount >= 10_000e18) {
        require(kyc.getCDDLevel(customer) == CDDLevel.ENHANCED, "MLR17: EDD required");
    }
    _;
}
```

---

## Security & Compliance Checklist

- [ ] FCA registration/authorization verified for all operators
- [ ] Financial promotions have valid FCA approval reference and not expired
- [ ] Retail appropriateness assessment completed or risk warning + cooling off enforced
- [ ] Reserve 100% backed for fiat stablecoins (PS23/4)
- [ ] OFSI sanctions list checked (distinct from EU/UN lists post-Brexit)
- [ ] MLR17 CDD/EDD levels enforced per customer risk rating
- [ ] UK GDPR: no PII on-chain, data minimization principle applied
- [ ] UK MAR: surveillance events emitted for high-value / unusual transactions
- [ ] Annual investment caps enforced for non-appropriate retail clients
- [ ] Systemic stablecoin flag triggers BoE notification workflow

---

## Reference Files

- `references/uk-crypto-regime.md` — Full UK crypto regulatory roadmap (HMT consultation, FCA rules)
- `references/uk-mlr17.md` — MLR17 CDD/EDD requirements and SAR obligations
