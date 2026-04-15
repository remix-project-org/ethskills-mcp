---
name: solidity-real-estate
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  for real estate, property tokenization, REITs, mortgage lending, title transfer, rental income
  distribution, escrow, or any on-chain property transaction. Triggers include: property NFT,
  fractional real estate, tokenized REIT, on-chain mortgage, deed transfer, title registry,
  rental yield distribution, property escrow, due diligence vault, landlord-tenant automation,
  or any mention of "real estate token", "property on-chain", "tokenized property", "smart
  contract mortgage", or "on-chain deed". Always use this skill for real estate Solidity —
  legal pitfalls in this domain are severe and general knowledge is insufficient.
---

# Solidity Real Estate Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for real estate applications.
Your contracts handle property rights, fractional ownership, REIT structures, and mortgage logic
while respecting property law, securities regulation, and investor protection requirements.

---

## Core Regulatory Frameworks

| Regulation | Scope | Key On-Chain Requirements |
|---|---|---|
| SEC Reg D / Reg A+ | USA tokenized real estate | Investor accreditation, transfer restrictions, offering limits |
| FIRPTA | USA foreign sellers | 15% withholding on foreign seller dispositions |
| RESPA | USA mortgage | Settlement disclosures, anti-kickback, escrow rules |
| TILA / Reg Z | USA consumer lending | APR disclosure, right of rescission (3 days) |
| EU AIFMD | EU real estate funds | AIF manager authorization, leverage limits, reporting |
| AML/KYC (FATF) | Global | Beneficial ownership disclosure for property purchases |
| UCC Article 9 | USA | Perfection of security interests in tokenized property |

> ⚠️ **Critical Legal Caveat**: On-chain contracts do NOT automatically transfer legal title to
> real property in most jurisdictions. A parallel off-chain legal instrument (deed, title
> insurance, notarization) is required. Smart contracts typically manage **economic rights**
> and **beneficial ownership**, not legal title, unless jurisdiction-specific digital title
> law applies (e.g., certain US county registries, Georgia (country), etc.).

---

## Property Representation Standards

### Property NFT (ERC-721 + Metadata)

```solidity
// Each property is an ERC-721 token with rich metadata
struct PropertyData {
    bytes32 propertyId;         // Internal registry ID
    string legalDescription;    // e.g. "Lot 42, Block 7, Sunset Heights Subdivision"
    bytes32 parcelNumber;       // APN / Parcel ID from county assessor
    bytes32 titleDocumentHash;  // IPFS CID of title deed / title insurance policy
    address titleCompany;       // On-chain address of title insurer
    uint256 assessedValue;      // Latest assessed value (updated by oracle)
    bytes32 jurisdiction;       // ISO 3166-2 state/province code
    PropertyType propertyType;
    bool encumbered;            // True if mortgage/lien exists
}

enum PropertyType { SINGLE_FAMILY, MULTI_FAMILY, COMMERCIAL, INDUSTRIAL, LAND, MIXED_USE }

// Liens / encumbrances must be tracked
struct Lien {
    address lender;
    uint256 principalAmount;
    uint256 interestRateBPS;    // Basis points (e.g. 650 = 6.50%)
    uint256 originationDate;
    uint256 maturityDate;
    LienPriority priority;
    bool satisfied;
}

enum LienPriority { FIRST, SECOND, THIRD, JUDGMENT }
```

---

## Mandatory Patterns

### 1. Fractional Ownership (ERC-1155 or ERC-20 per property)

```solidity
// Each property gets its own ERC-20 token representing fractional shares
// Total supply = 10,000 shares (basis points of ownership)

contract FractionalProperty is ERC20, Ownable {
    uint256 public constant TOTAL_SHARES = 10_000;
    uint256 public immutable propertyTokenId;
    IPropertyRegistry public immutable registry;
    IKYCRegistry public immutable kycRegistry;

    // SEC compliance: track who holds what
    address[] public shareholders;
    mapping(address => bool) public isShareholder;

    constructor(uint256 _propertyTokenId, address _registry, address _kyc)
        ERC20("Fractional Property Token", "FPT") {
        propertyTokenId = _propertyTokenId;
        registry = IPropertyRegistry(_registry);
        kycRegistry = IKYCRegistry(_kyc);
        _mint(msg.sender, TOTAL_SHARES);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        if (to != address(0)) {
            // KYC required for all shareholders
            require(kycRegistry.isVerified(to), "FractProp: KYC required");
            require(!kycRegistry.isSanctioned(to), "FractProp: sanctioned");

            // Accreditation required if offering under Reg D
            if (registry.requiresAccreditation(propertyTokenId)) {
                require(kycRegistry.isAccredited(to), "FractProp: accredited investor only");
            }

            // Track shareholders for dividend distribution
            if (!isShareholder[to] && balanceOf(to) == 0) {
                shareholders.push(to);
                isShareholder[to] = true;
            }
        }
        if (from != address(0) && balanceOf(from) == amount) {
            isShareholder[from] = false;
            // Note: don't remove from array (gas) — filter off-chain
        }
    }
}
```

### 2. Rental Income Distribution

```solidity
// Pro-rata rental distribution to fractional shareholders
contract RentalDistributor {
    IERC20 public propertyToken;    // Fractional ownership token
    IERC20 public stablecoin;       // USDC for rent payments
    uint256 public constant TOTAL_SHARES = 10_000;

    uint256 public accumulatedRentPerShare; // Scaled by 1e18
    mapping(address => uint256) public rentDebtPerShare;

    event RentDeposited(uint256 amount, uint256 perShare, uint256 timestamp);
    event RentClaimed(address indexed shareholder, uint256 amount);

    // Called monthly by property manager or keeper
    function depositRent(uint256 amount) external {
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        // Deduct property management fee (typically 8-12%)
        uint256 mgmtFee = amount * managementFeeBPS / 10_000;
        stablecoin.safeTransfer(propertyManager, mgmtFee);
        uint256 netAmount = amount - mgmtFee;

        accumulatedRentPerShare += netAmount * 1e18 / TOTAL_SHARES;

        emit RentDeposited(amount, accumulatedRentPerShare, block.timestamp);
    }

    function claimableRent(address shareholder) public view returns (uint256) {
        uint256 shares = propertyToken.balanceOf(shareholder);
        return shares * (accumulatedRentPerShare - rentDebtPerShare[shareholder]) / 1e18;
    }

    function claimRent() external {
        uint256 amount = claimableRent(msg.sender);
        require(amount > 0, "RentDist: nothing to claim");
        rentDebtPerShare[msg.sender] = accumulatedRentPerShare;
        stablecoin.safeTransfer(msg.sender, amount);
        emit RentClaimed(msg.sender, amount);
    }

    // Must update debt before any token transfer
    function _syncBeforeTransfer(address from, address to) internal {
        if (from != address(0)) rentDebtPerShare[from] = accumulatedRentPerShare;
        if (to != address(0)) rentDebtPerShare[to] = accumulatedRentPerShare;
    }
}
```

### 3. Purchase Escrow with Title Contingency

```solidity
enum EscrowMilestone {
    OPENED,
    INSPECTION_PERIOD,   // Due diligence window (typically 10-30 days)
    TITLE_CLEARED,       // Title company confirms clean title
    LOAN_APPROVED,       // Lender approval (if financed)
    FUNDING,             // Buyer funds deposited
    CLOSED,              // Title transfers, funds released
    CANCELLED_BUYER,     // Buyer backed out (earnest money at risk)
    CANCELLED_SELLER,    // Seller backed out (double earnest money owed)
    DISPUTED
}

struct PurchaseEscrow {
    address buyer;
    address seller;
    address titleCompany;
    address escrowOfficer;
    uint256 purchasePrice;
    uint256 earnestMoney;       // Typically 1-3% of purchase price
    uint256 closingDate;
    uint256 inspectionDeadline;
    uint256 propertyTokenId;
    EscrowMilestone milestone;
    mapping(address => bool) contingencyWaivers;
}

function openEscrow(
    address seller,
    address titleCompany,
    uint256 purchasePrice,
    uint256 closingDate,
    uint256 propertyTokenId
) external payable returns (uint256 escrowId) {
    require(msg.value > 0, "Escrow: earnest money required");
    require(closingDate > block.timestamp + 7 days, "Escrow: closing too soon");

    escrowId = escrowCount++;
    PurchaseEscrow storage e = escrows[escrowId];
    e.buyer = msg.sender;
    e.seller = seller;
    e.titleCompany = titleCompany;
    e.purchasePrice = purchasePrice;
    e.earnestMoney = msg.value;
    e.closingDate = closingDate;
    e.inspectionDeadline = block.timestamp + INSPECTION_PERIOD;
    e.propertyTokenId = propertyTokenId;
    e.milestone = EscrowMilestone.OPENED;

    emit EscrowOpened(escrowId, msg.sender, seller, purchasePrice);
}

function clearTitle(uint256 escrowId) external {
    PurchaseEscrow storage e = escrows[escrowId];
    require(msg.sender == e.titleCompany, "Escrow: not title company");
    require(e.milestone == EscrowMilestone.INSPECTION_PERIOD ||
            e.milestone == EscrowMilestone.OPENED, "Escrow: wrong milestone");
    e.milestone = EscrowMilestone.TITLE_CLEARED;
    emit TitleCleared(escrowId, block.timestamp);
}

function close(uint256 escrowId) external {
    PurchaseEscrow storage e = escrows[escrowId];
    require(msg.sender == e.escrowOfficer, "Escrow: not officer");
    require(e.milestone == EscrowMilestone.FUNDING, "Escrow: not funded");
    require(block.timestamp <= e.closingDate + 1 days, "Escrow: past closing date");

    e.milestone = EscrowMilestone.CLOSED;

    // Transfer property token to buyer
    propertyRegistry.transferProperty(e.propertyTokenId, e.seller, e.buyer);

    // Release funds to seller (minus closing costs)
    uint256 sellerProceeds = e.purchasePrice - closingCosts[escrowId];
    (bool ok,) = e.seller.call{value: sellerProceeds}("");
    require(ok, "Escrow: payment failed");

    emit EscrowClosed(escrowId, e.buyer, e.seller, e.purchasePrice);
}
```

### 4. Mortgage / Lien Management

```solidity
struct Mortgage {
    address borrower;
    address lender;
    uint256 principalAmount;
    uint256 interestRateBPS;     // Annual rate in basis points
    uint256 termMonths;
    uint256 monthlyPayment;      // Calculated at origination
    uint256 remainingBalance;
    uint256 originationDate;
    uint256 nextPaymentDue;
    uint256 propertyTokenId;
    MortgageStatus status;
    bool isAdjustableRate;       // ARM vs fixed
}

enum MortgageStatus { ACTIVE, DEFAULT, FORECLOSURE, PAID_OFF }

uint256 constant GRACE_PERIOD = 15 days;
uint256 constant DEFAULT_THRESHOLD = 3; // 3 missed payments → default

function makePayment(uint256 mortgageId) external payable nonReentrant {
    Mortgage storage m = mortgages[mortgageId];
    require(msg.sender == m.borrower, "Mortgage: not borrower");
    require(m.status == MortgageStatus.ACTIVE, "Mortgage: not active");
    require(msg.value >= m.monthlyPayment, "Mortgage: insufficient payment");

    // Split payment: principal + interest
    uint256 interestAccrued = m.remainingBalance * m.interestRateBPS / 10_000 / 12;
    uint256 principalPayment = m.monthlyPayment - interestAccrued;

    m.remainingBalance -= principalPayment;
    m.nextPaymentDue += 30 days;
    m.missedPayments = 0;

    // RESPA: send itemized statement
    emit PaymentMade(mortgageId, msg.value, principalPayment, interestAccrued, m.remainingBalance);

    if (m.remainingBalance == 0) {
        m.status = MortgageStatus.PAID_OFF;
        propertyRegistry.releaseLien(m.propertyTokenId, mortgageId);
        emit MortgageSatisfied(mortgageId, m.propertyTokenId);
    }

    // Forward interest to lender
    (bool ok,) = m.lender.call{value: msg.value}("");
    require(ok, "Mortgage: payment routing failed");
}
```

### 5. REIT Structure

```solidity
// Simplified on-chain REIT: must distribute 90% of taxable income (IRS §856)
contract OnChainREIT {
    uint256 public constant DISTRIBUTION_REQUIREMENT_BPS = 9000; // 90%
    uint256 public constant MAX_NON_REIT_INCOME_BPS = 2500;       // 75% must be real estate income
    uint256 public constant MIN_SHAREHOLDER_COUNT = 100;          // IRS: 100+ shareholders

    uint256 public totalTaxableIncome;
    uint256 public distributedThisYear;

    function distributeIncome(uint256 amount) external onlyRole(MANAGER_ROLE) {
        uint256 required = totalTaxableIncome * DISTRIBUTION_REQUIREMENT_BPS / 10_000;
        require(distributedThisYear + amount >= required || _isInterimDistribution(),
                "REIT: must distribute 90% of taxable income");

        distributedThisYear += amount;
        // ... pro-rata distribution logic
    }

    function verifyREITQualification() external view returns (bool, string memory) {
        if (shareholders.length < MIN_SHAREHOLDER_COUNT)
            return (false, "Less than 100 shareholders");
        if (_top5ShareholderConcentration() > 5000)
            return (false, "5 shareholders hold >50% (5/50 rule)");
        // Additional tests: 75% income test, 75% asset test...
        return (true, "REIT qualified");
    }
}
```

---

## Security & Legal Checklist

- [ ] **Lien priority enforced** — no transfer allowed without satisfying prior liens
- [ ] **Right of rescission** — 3-day cancellation window for residential mortgages (TILA)
- [ ] **FIRPTA withholding** — flag foreign sellers; withhold 15% for IRS
- [ ] **Earnest money protection** — held in separate escrow, not commingled
- [ ] **Inspection contingency** — buyer can exit during inspection period without penalty
- [ ] **Title contingency** — close blocked if title search reveals undisclosed liens
- [ ] **Oracle for valuations** — never accept user-supplied property values without attestation
- [ ] **Foreclosure process** — must comply with state law; on-chain code cannot replace judicial process in most US states
- [ ] **Documentary transfer tax** — flag for off-chain settlement; varies by county
- [ ] **1031 Exchange** — flag transactions that may qualify; must be handled off-chain with QI

---

## Reference Files

- `references/tokenization-structures.md` — Detailed SPV, LLC wrapper, and direct deed structures
- `references/mortgage-math.md` — Amortization formulas, ARM adjustment logic, prepayment penalties
- `references/reit-compliance.md` — Full IRS REIT qualification tests (income, asset, distribution, organizational)