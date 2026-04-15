# MiCA — Markets in Crypto-Assets Regulation — Detailed Reference

## Timeline
- June 2023: MiCA entered into force
- June 2024: Title III (ART) + Title IV (EMT) applicable
- December 2024: Full MiCA applicable (all crypto-assets)

## Authorization Requirements by Token Type

### Asset-Referenced Tokens (ART)
- Authorization from home member state NCA (e.g., AMF in France, BaFin in Germany)
- Minimum own funds: €350,000 or 2% of average reserve assets (whichever higher)
- Reserve assets: segregated, held with EU credit institution
- Redemption: must be satisfied within 2 business days
- Significant ART (>10M holders OR >€5B avg outstanding): ECB joint supervision

### E-Money Tokens (EMT)
- Must be issued by: EU credit institution OR EU e-money institution
- Reserve: 100% in deposits at EU credit institutions
- No interest payable to holders
- Redemption at par, at any time, no fees for retail
- Significant EMT: same thresholds as ART above

### Other Crypto-Assets (including utility tokens)
- Whitepaper required if offered to public or traded on CASP
- Whitepaper notification to NCA (not approval, unless ART/EMT)
- Marketing communications must be fair, clear, not misleading

## Whitepaper Required Contents (MiCA Art. 6)

```solidity
// Store whitepaper compliance attestation on-chain
struct MiCAWhitepaper {
    bytes32 ipfsCID;                // IPFS CID of published whitepaper
    uint256 publicationDate;
    bytes32 ncaNotificationRef;     // NCA notification/approval reference
    address issuer;
    bytes32 leiCode;                // Legal Entity Identifier of issuer
    bool includesRightOfWithdrawal; // 14-day withdrawal right for retail
    uint256 withdrawalDeadline;     // = publicationDate + 14 days
}
```

Required whitepaper sections:
1. Information about the issuer
2. Information about the crypto-asset project
3. Information about the offer to the public / admission to trading
4. Information about the crypto-asset (rights, obligations, technology)
5. Information on the underlying technology
6. Information on risks
7. Information on the principal adverse impacts on climate and environment

## CASP (Crypto-Asset Service Provider) Obligations

If the smart contract platform operates as a CASP:

```solidity
// CASPs must be authorized by home member state NCA
// Services requiring CASP authorization:
// - Custody and administration of crypto-assets
// - Operation of trading platform
// - Exchange of crypto for fiat / crypto for crypto
// - Execution of orders
// - Placing of crypto-assets
// - Reception and transmission of orders
// - Providing advice / portfolio management

interface ICASPRegistry {
    function isAuthorizedCASP(address operator) external view returns (bool);
    function getCASPLicense(address operator) external view returns (bytes32 licenseRef, bytes2 homeState);
}

modifier onlyAuthorizedCASP() {
    require(caspRegistry.isAuthorizedCASP(msg.sender), "MiCA: unauthorized CASP");
    _;
}
```

## Market Abuse Prevention (MiCA Title VI)

```solidity
// MiCA Art. 89-92: Insider dealing, market manipulation, unlawful disclosure
// Contracts should emit events sufficient for market surveillance

event LargeTransfer(address indexed from, address indexed to, uint256 amount, uint256 timestamp);
event PriceImpactingTrade(address indexed trader, uint256 volume, uint256 priceImpactBPS);

uint256 constant LARGE_TRANSFER_THRESHOLD = 100_000e18; // €100k equivalent
uint256 constant PRICE_IMPACT_THRESHOLD = 100; // 1% price impact

function _afterTokenTransfer(address from, address to, uint256 amount) internal override {
    if (amount >= LARGE_TRANSFER_THRESHOLD) {
        emit LargeTransfer(from, to, amount, block.timestamp);
    }
}
```

## Cross-Border: EU Passporting

MiCA enables EU-wide passporting once authorized in one member state:

```solidity
// Track which member states the token is passported into
mapping(bytes2 => bool) public passportedCountries; // ISO 3166 country codes
mapping(bytes2 => uint256) public passportDate;

event Passported(bytes2 indexed memberState, uint256 date, bytes32 ncaRef);

function addPassport(bytes2 memberState, bytes32 ncaRef)
    external onlyRole(COMPLIANCE_ROLE) {
    passportedCountries[memberState] = true;
    passportDate[memberState] = block.timestamp;
    emit Passported(memberState, block.timestamp, ncaRef);
}

// Restrict transfers to investors in passported countries only
modifier onlyPassportedCountry(address investor) {
    bytes2 country = mifidRegistry.getInvestorCountry(investor);
    require(passportedCountries[country], "MiCA: not passported in investor country");
    _;
}
```
