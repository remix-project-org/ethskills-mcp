# Real Estate Tokenization Structures — Reference

## Three Main Legal Wrappers

### 1. Direct Deed Tokenization
**Jurisdictions**: Wyoming (USA), Vermont (USA), Georgia (country), some EU jurisdictions
**How it works**: Property deed is directly recorded on-chain or linked to token
**Pros**: Cleanest structure, fewest intermediaries
**Cons**: Limited jurisdiction support, legal uncertainty, no liability protection

```solidity
// Direct deed model: token IS the deed
contract DirectDeedToken is ERC721 {
    struct Deed {
        bytes32 parcelNumber;
        string legalDescription;
        bytes32 titleDocCID;        // IPFS CID of recorded deed
        uint256 recordingDate;
        address recordingAuthority; // County recorder address
        bool isLegallyRecorded;
    }

    mapping(uint256 => Deed) public deeds;

    // Only county recorder can attest legal recording
    function attestRecording(uint256 tokenId, bytes32 docCID)
        external onlyRole(COUNTY_RECORDER_ROLE) {
        deeds[tokenId].titleDocCID = docCID;
        deeds[tokenId].recordingDate = block.timestamp;
        deeds[tokenId].isLegallyRecorded = true;
        emit DeedRecorded(tokenId, docCID, block.timestamp);
    }

    // Transfer checks lien clearance
    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(deeds[tokenId].isLegallyRecorded, "Deed: not legally recorded");
        require(!lienRegistry.hasActiveLiens(tokenId), "Deed: liens must be cleared");
        super.transferFrom(from, to, tokenId);
    }
}
```

### 2. LLC / SPV Wrapper (Most Common in USA)
**How it works**: Each property held in a single-purpose LLC. Token = membership interest in LLC.
**Pros**: Liability protection, clear legal framework, works everywhere
**Cons**: Ongoing entity maintenance, tax complexity, requires operating agreement

```
Property → Single-Purpose LLC → Membership Interest Tokens → Investors
```

```solidity
// Token represents LLC membership interest, not property directly
contract LLCMembershipToken is ERC20 {
    struct LLCData {
        string entityName;          // e.g., "123 Main St Property LLC"
        bytes32 einHash;            // Hashed EIN (not stored plaintext)
        string stateOfFormation;    // "DE", "WY", etc.
        bytes32 operatingAgreementCID; // IPFS CID of operating agreement
        address registeredAgent;
        address propertyManager;
    }

    LLCData public llcData;

    // Operating agreement governs distributions, voting, dissolution
    function getGoverningDocument() external view returns (bytes32) {
        return llcData.operatingAgreementCID;
    }
}
```

### 3. REIT / Fund Structure
**How it works**: Multiple properties in a fund. Token = share in the fund.
**Pros**: Diversification, established legal framework
**Cons**: SEC registration (unless exempt), 100+ shareholder requirement, 90% distribution rule

---

## Fractional Ownership Math

```solidity
// Standard: 10,000 shares per property = basis points of ownership
// 100 shares = 1% ownership

uint256 constant BASIS_POINTS = 10_000;

// Pro-rata distributions
function calculateDistribution(
    address shareholder,
    uint256 totalDistribution
) public view returns (uint256) {
    uint256 shares = membershipToken.balanceOf(shareholder);
    return totalDistribution * shares / BASIS_POINTS;
}

// Voting weight = share weight
function voteWeight(address voter) public view returns (uint256) {
    return membershipToken.balanceOf(voter); // out of 10,000
}
```

---

## Title Insurance Integration

```solidity
interface ITitleInsurer {
    // Request title commitment before closing
    function requestCommitment(
        uint256 propertyTokenId,
        address buyer,
        uint256 purchasePrice
    ) external returns (uint256 commitmentId);

    // Issue policy after closing
    function issuePolicy(
        uint256 commitmentId,
        bytes32 deedCID
    ) external returns (uint256 policyId);

    // Claim against title defect
    function fileClaim(
        uint256 policyId,
        string calldata defectDescription,
        bytes32 supportingDocsCID
    ) external returns (uint256 claimId);
}
```

---

## Common Lien Types

```solidity
enum LienType {
    MORTGAGE,           // Voluntary - purchase money
    HOME_EQUITY,        // Voluntary - HELOC
    MECHANIC,           // Involuntary - contractor unpaid
    TAX,                // Involuntary - property tax delinquency
    HOA,                // Involuntary - HOA dues
    JUDGMENT,           // Court-ordered
    FEDERAL_TAX         // IRS lien - highest priority
}

// Lien priority in most US states:
// 1. Property taxes (always first)
// 2. Federal tax liens (if recorded)
// 3. First mortgage (by recording date)
// 4. Subsequent mortgages (by recording date)
// 5. Mechanic's liens (by start of work date in most states)
// 6. HOA liens (varies by state)
// 7. Judgment liens (by recording date)

function getLienPayoffOrder(uint256 propertyTokenId)
    external view returns (Lien[] memory ordered) {
    // Returns liens sorted by priority for payoff at closing
    // ... sorting logic
}
```