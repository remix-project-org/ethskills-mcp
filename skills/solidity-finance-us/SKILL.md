---
name: solidity-finance-us
description: >
  Use this skill whenever a developer is writing, reviewing, or auditing Solidity smart contracts
  that touch financial instruments, securities, tokenized assets, lending, DeFi protocols, KYC/AML,
  or any on-chain finance. Triggers include: tokenized securities, ERC-1400, ERC-3643, KYC/AML
  enforcement, accredited investor checks, dividend distribution, escrow contracts, stablecoins,
  lending pools, interest rate logic, regulatory compliance (SEC, MiFID II, Basel III), or any
  mention of "compliant token", "security token", "regulated DeFi", or "financial smart contract".
  Always use this skill — do not rely on general Solidity knowledge alone — when finance or
  securities compliance is in scope.
---

# Solidity Finance & Securities Compliance Skill

You are an expert in writing **compliant, production-grade Solidity** for regulated financial
applications. Your code enforces securities law, KYC/AML requirements, investor restrictions,
and prudential rules at the contract level.

---

## Core Regulatory Frameworks

| Regulation | Jurisdiction | Key On-Chain Requirements |
|---|---|---|
| SEC Reg D / Reg S | USA | Accredited investor checks, transfer restrictions, lockup periods |
| SEC Reg CF | USA | Investment caps per investor, aggregate offering limits |
| MiFID II | EU | Investor classification (Retail/Professional/Eligible Counterparty), suitability |
| Basel III | Global (banks) | Capital adequacy ratios, liquidity buffers, leverage limits |
| FATF / AML5D | Global/EU | KYC onboarding, transaction monitoring, sanctions screening |
| FINRA Rule 4512 | USA | Customer account records |

---

## Mandatory Patterns

### 1. Identity & KYC Registry

Every compliant financial contract MUST reference an external `IKYCRegistry`:

```solidity
interface IKYCRegistry {
    function isVerified(address account) external view returns (bool);
    function isAccredited(address account) external view returns (bool);
    function investorTier(address account) external view returns (uint8);
    // Tiers: 0=unverified, 1=retail, 2=professional, 3=eligible-counterparty
    function isSanctioned(address account) external view returns (bool);
}

modifier onlyVerified(address account) {
    require(!kycRegistry.isSanctioned(account), "Finance: sanctioned address");
    require(kycRegistry.isVerified(account), "Finance: KYC not completed");
    _;
}
```

> ⚠️ **Never store PII on-chain.** The registry holds only boolean/tier flags; all identity
> data lives off-chain (e.g., in a permissioned database or zk-proof system).

---

### 2. Security Token Standards

Use **ERC-1400** (modular partitions) or **ERC-3643** (T-REX, popular in EU) depending on jurisdiction:

```solidity
// ERC-1400 partition transfer with compliance hook
function transferByPartition(
    bytes32 partition,
    address to,
    uint256 value,
    bytes calldata data
) external onlyVerified(msg.sender) onlyVerified(to) returns (bytes32) {
    _checkTransferRestrictions(msg.sender, to, value, partition);
    // ... transfer logic
}

function _checkTransferRestrictions(
    address from,
    address to,
    uint256 value,
    bytes32 partition
) internal view {
    require(!transfersPaused, "Finance: transfers paused");
    require(block.timestamp >= lockupExpiry[from], "Finance: lockup active");
    require(
        kycRegistry.investorTier(to) >= requiredTierForPartition[partition],
        "Finance: insufficient investor tier"
    );
    require(
        investorHoldings[to] + value <= maxHoldingPerInvestor,
        "Finance: exceeds per-investor cap"
    );
}
```

---

### 3. Transfer Restrictions & Lockups

```solidity
mapping(address => uint256) public lockupExpiry;     // Reg D 12-month lockup
mapping(address => uint256) public investorHoldings;
uint256 public maxHoldingPerInvestor;               // Reg D / Reg CF cap
uint256 public maxInvestorCount;                    // Reg D 506(b): max 35 non-accredited

uint256 public accreditedCount;
uint256 public nonAccreditedCount;

function _updateInvestorCount(address from, address to, uint256 value) internal {
    // Track investor counts for Reg D compliance
    if (investorHoldings[to] == 0 && value > 0) {
        if (kycRegistry.isAccredited(to)) accreditedCount++;
        else {
            require(nonAccreditedCount < 35, "Finance: Reg D non-accredited cap reached");
            nonAccreditedCount++;
        }
    }
    if (investorHoldings[from] == value) {
        if (kycRegistry.isAccredited(from)) accreditedCount--;
        else nonAccreditedCount--;
    }
}
```

---

### 4. Dividend & Interest Distribution

```solidity
// Checkpoint-based dividend distribution (gas-efficient)
struct Checkpoint {
    uint256 blockNumber;
    uint256 totalSupply;
}

mapping(uint256 => mapping(address => uint256)) public balanceAtCheckpoint;
Checkpoint[] public checkpoints;

function distributeDividend(uint256 checkpointId) external payable {
    uint256 supply = checkpoints[checkpointId].totalSupply;
    require(supply > 0, "Finance: zero supply at checkpoint");
    uint256 perUnit = msg.value / supply; // wei per token unit
    dividendPerUnit[checkpointId] = perUnit;

    emit DividendDistributed(checkpointId, msg.value, perUnit);
}

function claimDividend(uint256 checkpointId) external onlyVerified(msg.sender) {
    require(!dividendClaimed[checkpointId][msg.sender], "Finance: already claimed");
    dividendClaimed[checkpointId][msg.sender] = true;
    uint256 bal = balanceAtCheckpoint[checkpointId][msg.sender];
    uint256 amount = bal * dividendPerUnit[checkpointId];
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok, "Finance: transfer failed");
}
```

---

### 5. AML Transaction Monitoring

```solidity
uint256 public constant AML_THRESHOLD = 10_000e18;  // $10k reporting threshold (FinCEN)
uint256 public constant VELOCITY_WINDOW = 1 days;
mapping(address => uint256) public dailyVolume;
mapping(address => uint256) public lastVolumeReset;

modifier amlCheck(address from, uint256 amount) {
    if (block.timestamp > lastVolumeReset[from] + VELOCITY_WINDOW) {
        dailyVolume[from] = 0;
        lastVolumeReset[from] = block.timestamp;
    }
    dailyVolume[from] += amount;
    if (dailyVolume[from] >= AML_THRESHOLD) {
        emit SuspiciousActivityReport(from, dailyVolume[from], block.timestamp);
        // Optionally flag for off-chain review — do NOT auto-block without due process
    }
    _;
}
```

---

### 6. Escrow with Dispute Resolution

```solidity
enum EscrowState { PENDING, RELEASED, DISPUTED, REFUNDED }

struct Escrow {
    address depositor;
    address beneficiary;
    address arbitrator;
    uint256 amount;
    uint256 releaseTime;     // time-lock
    EscrowState state;
}

function createEscrow(address beneficiary, address arbitrator, uint256 releaseTime)
    external payable returns (uint256 id) {
    id = escrowCount++;
    escrows[id] = Escrow(msg.sender, beneficiary, arbitrator, msg.value, releaseTime, EscrowState.PENDING);
}

function release(uint256 id) external {
    Escrow storage e = escrows[id];
    require(msg.sender == e.depositor || block.timestamp >= e.releaseTime, "Finance: not authorized");
    require(e.state == EscrowState.PENDING, "Finance: wrong state");
    e.state = EscrowState.RELEASED;
    (bool ok,) = e.beneficiary.call{value: e.amount}("");
    require(ok, "Finance: transfer failed");
}
```

---

## Security Checklist

Before finalizing any financial contract, verify:

- [ ] Reentrancy guard on all external calls (`nonReentrant` from OpenZeppelin)
- [ ] `checks-effects-interactions` pattern strictly followed
- [ ] Integer overflow impossible (Solidity ≥0.8 or SafeMath)
- [ ] All state mutations emit events for audit trail
- [ ] Upgradeability strategy defined (proxy pattern) — regulators may require ability to freeze/seize
- [ ] Emergency pause mechanism (`Pausable`) with multi-sig governance
- [ ] No hardcoded addresses — use registry pattern for upgradeable dependencies
- [ ] Front-running protection on sensitive operations (commit-reveal or private mempool)
- [ ] Oracle manipulation resistance (TWAP over spot price)

---

## Reference Files

- `references/erc1400.md` — Full ERC-1400 interface and partition logic
- `references/erc3643.md` — T-REX / ERC-3643 identity & compliance architecture
- `references/defi-lending.md` — Compliant lending pool patterns (collateral, liquidation, interest)
- `references/aml-patterns.md` — Advanced AML/CTF on-chain patterns

Read the relevant reference file when the user's task goes deep into one of those domains.
