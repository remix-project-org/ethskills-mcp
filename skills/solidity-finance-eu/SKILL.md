---
name: solidity-finance-eu
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for financial instruments, securities, or DeFi protocols targeting the European Union. Triggers
  include: MiFID II, MiCA (Markets in Crypto-Assets), EMIR, SFDR, EU Prospectus Regulation,
  AIFMD, UCITS, DORA, tokenized securities under EU law, euro stablecoins, DeFi compliance in
  Europe, GDPR in financial contracts, KYC/AML under AML6D, or any mention of "EU compliant
  token", "MiCA compliant", "European securities token", or "regulated DeFi EU". Always use
  this skill for EU-jurisdiction financial Solidity — do not rely on general or US-centric knowledge.
---

# Solidity Finance — EU Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for regulated financial
applications operating under European Union law. Your code enforces MiCA, MiFID II, AML6D,
and GDPR requirements at the contract level.

> ⚠️ **Jurisdiction note**: This skill covers EU law. For UK post-Brexit rules use
> `solidity-finance-uk`. For US rules use `solidity-finance`.

---

## Core EU Regulatory Frameworks

| Regulation | Full Name | Key On-Chain Requirements |
|---|---|---|
| MiCA | Markets in Crypto-Assets Regulation (2023/1114) | Whitepaper, reserve backing, redemption rights, issuer authorization |
| MiFID II / MiFIR | Markets in Financial Instruments Directive II | Investor classification, suitability, best execution |
| AML6D | 6th Anti-Money Laundering Directive | Beneficial ownership, predicate offences, criminal liability |
| AMLD5 / TFR | Transfer of Funds Regulation (recast 2023) | Originator/beneficiary data for all crypto transfers (Travel Rule) |
| EMIR | European Market Infrastructure Regulation | Derivatives reporting, central clearing obligation |
| SFDR | Sustainable Finance Disclosure Regulation | ESG classification (Art. 6/8/9), PAI indicators |
| DORA | Digital Operational Resilience Act (2025) | ICT risk management, incident reporting, third-party oversight |
| EU Prospectus Regulation | 2017/1129 | Prospectus approval for public offerings >€8M |
| GDPR | General Data Protection Regulation | No PII on-chain, right to erasure compliance |

---

## MiCA — Core Token Categories

MiCA defines three token types with distinct obligations:

```solidity
enum MiCATokenType {
    ART,        // Asset-Referenced Token: references multiple assets/currencies
    EMT,        // E-Money Token: references a single fiat currency (e.g. EUR)
    OTHER       // Other crypto-asset (utility tokens, governance tokens)
}

struct MiCAMetadata {
    MiCATokenType tokenType;
    bytes32 whitepaperIPFSCid;      // Required: IPFS CID of approved whitepaper
    address competentAuthority;      // NCA that authorized the issuance
    uint256 authorizationDate;
    bytes32 authorizationRef;        // NCA reference number
    bool redemptionRightsEnabled;    // Mandatory for ART/EMT holders
    uint256 reserveRatio;            // For ART: must be ≥100% (1e18 = 100%)
}
```

### E-Money Token (EMT) — e.g. Euro Stablecoin

```solidity
contract EuroEMT is ERC20, Pausable {
    // MiCA Art. 48: EMT holders have permanent redemption right at par
    mapping(address => uint256) public redemptionRequests;
    uint256 public constant REDEMPTION_WINDOW = 1 days; // Must process within 1 business day

    // MiCA Art. 45: Reserve must be held in secure, low-risk assets
    address public reserveCustodian;
    uint256 public reserveBalance;   // Updated by authorized oracle

    modifier reserveSolvent() {
        require(reserveBalance >= totalSupply(), "MiCA: reserve deficiency");
        _;
    }

    function mint(address to, uint256 amount) external onlyRole(ISSUER_ROLE) reserveSolvent {
        require(kycRegistry.isVerified(to), "MiCA: KYC required");
        _mint(to, amount);
        emit Minted(to, amount, block.timestamp);
    }

    // MiCA Art. 48: Redemption at par, no fees for retail holders
    function requestRedemption(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "MiCA: insufficient balance");
        _burn(msg.sender, amount);
        redemptionRequests[msg.sender] += amount;
        emit RedemptionRequested(msg.sender, amount, block.timestamp + REDEMPTION_WINDOW);
    }

    // MiCA Art. 22: Significant EMTs (>€5B avg outstanding) face additional ECB oversight
    function isSignificantEMT() public view returns (bool) {
        return totalSupply() > 5_000_000_000e18; // €5 billion
    }
}
```

---

## Travel Rule (TFR) — Crypto Transfer Compliance

EU's Transfer of Funds Regulation requires originator + beneficiary data for all transfers ≥€0 (no threshold for crypto as of 2024):

```solidity
struct TravelRuleData {
    bytes32 originatorName;         // Hashed off-chain, reference stored on-chain
    bytes32 originatorAccountId;    // IBAN or wallet identifier hash
    bytes32 originatorAddress;      // Physical address hash
    bytes32 beneficiaryName;
    bytes32 beneficiaryAccountId;
    bytes32 vasp_originator;        // VASP LEI or BIC
    bytes32 vasp_beneficiary;
    uint256 transferAmount;
    bytes32 transferRef;
}

// Travel rule data transmitted via VASP-to-VASP messaging (OpenVASP / TRISA)
// Only the reference hash stored on-chain — full data transmitted off-chain
mapping(bytes32 => bytes32) public travelRuleRefs; // txHash → data hash

event TravelRuleSubmitted(bytes32 indexed txHash, bytes32 dataHash, address vasp);

function transferWithTravelRule(
    address to,
    uint256 amount,
    bytes32 travelRuleDataHash  // hash of off-chain TFR data packet
) external {
    require(travelRuleDataHash != bytes32(0), "TFR: travel rule data required");
    bytes32 txHash = keccak256(abi.encodePacked(msg.sender, to, amount, block.timestamp));
    travelRuleRefs[txHash] = travelRuleDataHash;
    emit TravelRuleSubmitted(txHash, travelRuleDataHash, msg.sender);
    _transfer(msg.sender, to, amount);
}
```

---

## MiFID II — Investor Classification

```solidity
enum MiFIDInvestorCategory {
    RETAIL,                 // Maximum protections, suitability required
    PROFESSIONAL,           // Reduced protections (opt-in or per se)
    ELIGIBLE_COUNTERPARTY  // Minimal protections (banks, investment firms, etc.)
}

interface IMiFIDRegistry {
    function getCategory(address investor) external view returns (MiFIDInvestorCategory);
    function isSuitabilityAssessed(address investor, bytes32 productId) external view returns (bool);
    function getInvestorCountry(address investor) external view returns (bytes2); // ISO 3166
}

// Products restricted by investor category
modifier onlyEligibleInvestor(bytes32 productId, MiFIDInvestorCategory minCategory) {
    MiFIDInvestorCategory category = mifidRegistry.getCategory(msg.sender);
    require(uint8(category) >= uint8(minCategory), "MiFID: investor category insufficient");
    if (category == MiFIDInvestorCategory.RETAIL) {
        require(
            mifidRegistry.isSuitabilityAssessed(msg.sender, productId),
            "MiFID: suitability assessment required"
        );
    }
    _;
}
```

---

## GDPR Compliance Patterns

GDPR's right to erasure creates tension with blockchain immutability. Approved patterns:

```solidity
// Pattern 1: Store only hashes on-chain, PII off-chain
// On-chain: keccak256(name + dob + nationalId + salt) → verified boolean
mapping(bytes32 => bool) public verifiedIdentities;

// Pattern 2: Encryption key deletion ("crypto-shredding")
// Encrypt PII with user-specific key; delete key = effectively erases data
// Key management handled by off-chain HSM

// Pattern 3: Zero-knowledge proofs for identity attributes
// ZK proof that user is ≥18, EU resident, etc. without revealing underlying data
interface IZKIdentityVerifier {
    function verifyAgeProof(address user, bytes calldata proof) external view returns (bool);
    function verifyResidencyProof(address user, bytes2 countryCode, bytes calldata proof)
        external view returns (bool);
}

// NEVER store on-chain:
// - Full names, dates of birth, national ID numbers
// - Passport / ID document scans or hashes of document content
// - Exact physical addresses
// - Financial account numbers in plaintext
```

---

## SFDR — ESG Classification

```solidity
enum SFDRArticle {
    ARTICLE_6,  // No sustainability claim
    ARTICLE_8,  // Promotes environmental/social characteristics
    ARTICLE_9   // Sustainable investment objective
}

struct ESGMetadata {
    SFDRArticle sfdrClassification;
    bytes32 paiStatementCID;        // Principal Adverse Impact statement (IPFS)
    uint256 sustainableInvestmentPct; // % of portfolio that is sustainable (for Art. 9)
    bytes32[] excludedActivities;   // e.g. keccak256("COAL"), keccak256("WEAPONS")
    uint256 carbonFootprintTonnesCO2e; // tCO2e per €1M invested (PAI indicator 1)
}
```

---

## Security & Compliance Checklist

- [ ] MiCA whitepaper filed and CID stored before token launch
- [ ] NCA authorization reference stored and verifiable on-chain
- [ ] EMT redemption rights functional at all times (MiCA Art. 48)
- [ ] Reserve ratio ≥ 100% enforced for ART/EMT at all times
- [ ] Travel Rule data hash stored for every transfer (TFR 2023)
- [ ] No PII stored on-chain (GDPR compliant architecture)
- [ ] Investor category checked before access to complex products (MiFID II)
- [ ] DORA: incident detection events emitted for off-chain monitoring
- [ ] Significant EMT flag triggers enhanced reporting mode
- [ ] AML6D: beneficial ownership traceable for all wallets >10% holdings

---

## Reference Files

- `references/mica-detailed.md` — Full MiCA obligations by token type, authorization process
- `references/aml6d-patterns.md` — AML6D predicate offences, beneficial ownership, Travel Rule
- `references/emir-derivatives.md` — On-chain derivatives reporting and clearing obligations
