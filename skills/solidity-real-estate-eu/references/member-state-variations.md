# EU Member State Real Estate Variations — Reference

## Overview
While EU law sets baseline rules (AIFMD, MCD, AML), real estate transactions are
primarily governed by national civil law. Key differences between major markets:

---

## Germany (DE)

```solidity
// German land law: Grundbuch (land register) is definitive
// Transfer requires: notarial purchase agreement + Auflassung (conveyance) + Grundbuch entry
// Grunderwerbsteuer (real estate transfer tax): 3.5%–6.5% depending on state (Bundesland)

struct GermanPropertyRecord {
    bytes32 grundbuchRef;           // e.g. "Amtsgericht München, Blatt 12345"
    bytes32 flurkarteRef;           // Cadastral map reference (Flurstück)
    bytes32 notarialDeedCID;        // Notarvertrag IPFS CID
    address notary;                 // German Notar (Bundesnotarkammer registered)
    uint256 grunderwerbsteuerBPS;   // Varies: Bayern 3.5%, Berlin 6%, NRW 6.5%
    bool auflassungCompleted;       // Conveyance declared before notary
    bool grundbuchUpdated;          // Land register updated (legal title transferred)
    bool vorlaeufigeEintragung;     // Vormerkung (priority notice) registered
}

// Germany: Vorkaufsrecht (statutory pre-emption right)
// Municipalities have right of first refusal on certain properties
// Tenants in multi-family buildings have pre-emption right (§577 BGB)
bool public hasGemeindlichesVorkaufsrecht; // Municipal pre-emption right

// Germany Grunderwerbsteuer by Bundesland (2024):
mapping(bytes32 => uint256) public grunderwerbsteuerByState;
// Bayern: 3500 bps | Hamburg: 5500 | Berlin: 6000 | NRW: 6500 | Thüringen: 6500

// Share deals: buying ≥90% of a company owning property triggers RETT
// Anti-avoidance: 5-year lock-up on share deal transfers
uint256 constant SHARE_DEAL_RETT_THRESHOLD = 9000; // 90%
uint256 constant SHARE_DEAL_LOCKUP = 5 * 365 days;
```

---

## France (FR)

```solidity
// French land law: publication at Service de Publicité Foncière is required
// Transfer requires: acte authentique before notaire + publication

struct FrenchPropertyRecord {
    bytes32 cadastreRef;            // Numéro de parcelle cadastrale
    bytes32 foncierPublicationRef;  // Publication reference (SPF)
    address notaire;                // French notaire
    bytes32 acteCID;                // Acte de vente IPFS CID
    uint256 droitsMutation;         // Transfer taxes (~5.80% for existing, reduced for new)
    bool isNewBuild;                // TVA applies instead of droits de mutation for <5yr builds
    bool hasPreemptionRight;        // DPU — Droit de Préemption Urbain (municipality)
    bool loiduRisqueCompliant;      // Risk information (floods, soil, etc.) disclosed
}

// France SCPI: retail real estate fund — REIT equivalent
// Minimum distribution: 85% of rental income, 50% of capital gains
uint256 constant SCPI_INCOME_DISTRIBUTION = 8500; // 85%
uint256 constant SCPI_GAINS_DISTRIBUTION = 5000;  // 50%

// France: Bail commercial (commercial lease) — 3-6-9 year structure
// Tenant has right of renewal; landlord must pay eviction indemnity if not renewed
struct FrenchCommercialLease {
    uint256 initialTermYears;       // Minimum 9 years (3+3+3)
    uint256 baseRentEUR;
    bytes32 irlIndex;               // Loyer de référence index for residential
    bytes32 iciIndex;               // Indice des Coûts à la Construction for commercial
    bool hasRightOfRenewal;
    uint256 evictionIndemnityCap;   // If landlord refuses renewal: 2 years rent minimum
}
```

---

## Netherlands (NL)

```solidity
// Dutch land law: Kadaster (land registry)
// Transfer: notarial deed of transfer (leveringsakte) + Kadaster registration

struct DutchPropertyRecord {
    bytes32 kadasterRef;            // Kadaster perceelnummer
    bytes32 leveringsakteRef;
    address notaris;
    uint256 overdrachtsbelasting;   // Transfer tax: 2% residential, 10.4% other (2024)
    bool isResidential;             // 2% rate if owner-occupied residential
    bool hasErfpacht;               // Ground lease (gemeente often retains freehold)
    uint256 erfpachtCanon;          // Annual ground lease payment (EUR)
    uint256 erfpachtExpiry;
}

// Netherlands: overdrachtsbelasting (transfer tax) 2024 rates:
// Residential (owner-occupier, ≤35): 0% if first-time buyer + price ≤€510k
// Residential (other): 2%
// Non-residential / investment: 10.4%

function calcDutchTransferTax(
    uint256 valueEUR,
    bool isResidentialOwnerOccupier,
    bool isFirstTimeBuyer,
    uint256 buyerAge
) public pure returns (uint256 taxEUR) {
    if (isResidentialOwnerOccupier && isFirstTimeBuyer && buyerAge <= 35 && valueEUR <= 510_000e18)
        return 0;
    if (isResidentialOwnerOccupier)
        return valueEUR * 200 / 10_000; // 2%
    return valueEUR * 1040 / 10_000;    // 10.4%
}
```

---

## Spain (ES)

```solidity
// Spanish land law: Registro de la Propiedad
// Transfer: notarial escritura pública + Registro entry
// ITP (Impuesto de Transmisiones Patrimoniales): varies by region (6-11%)
// AJD (Actos Jurídicos Documentados): for new builds (~1-2% of value)

struct SpanishPropertyRecord {
    bytes32 registroRef;            // Registro de la Propiedad reference
    bytes32 catastralRef;           // Valor catastral reference
    bytes32 escrituraCID;           // Escritura pública IPFS CID
    address notario;
    bytes2 autonomousCommunity;     // e.g. keccak256("MADRID"), keccak256("CATALONIA")
    uint256 itpRateBPS;             // 6-11% depending on region
    bool isNewBuild;                // AJD instead of ITP for new builds from developer
    bool hasVPORestriction;         // Vivienda de Protección Oficial — social housing restrictions
    uint256 vpoPriceCapEUR;         // Maximum price if VPO designation
}

// Spain: Golden Visa program (suspended for residential from April 2024)
// Non-EU investors: €500k+ investment historically qualified
// On-chain: track golden visa eligibility status
bool public goldenVisaResidentialSuspended; // true from April 2024
```

---

## Italy (IT)

```solidity
// Italian land law: Catasto (cadastre) + Conservatoria dei Registri Immobiliari
// Transfer: atto notarile + registrazione + trascrizione

struct ItalianPropertyRecord {
    bytes32 catasto_foglio;         // Foglio, Particella, Subalterno
    bytes32 conservatoriaRef;
    address notaio;
    uint256 impostaDiRegistro;      // Transfer tax: 9% (existing), 2% (primary residence)
    uint256 imposteIpocatastali;    // Mortgage + cadastral taxes
    bool isPrimaAbidazione;         // Primary residence: reduced 2% registration tax
    bool hasMutuoIpotecario;        // Mortgage (ipoteca iscritta)
    uint256 imuAnnualEUR;           // IMU property tax (not due on primary residence)
}

// Italy: Golden Visa (Investor Visa) still active
// €500k in innovative startup OR €1M in Italian company OR €2M in government bonds
// Real estate NOT in Golden Visa program (unlike Spain previously)
```
