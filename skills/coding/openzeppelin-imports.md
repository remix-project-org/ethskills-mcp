---
name: OpenZeppelin v5.6.1 Import Paths
description: Complete reference for OpenZeppelin v5.6.1 import paths with all the latest changes and new contracts. Use this WHENEVER you have to fix or write import statements in solidity.
---

**IMPORTANT**: OpenZeppelin has changed many import paths between versions. Always use these latest v5.6.1 paths to ensure your code compiles.

## Key Changes from Previous Versions

- `ReentrancyGuard.sol` moved from `contracts/security/` to `contracts/utils/`
- Many utilities consolidated under `contracts/utils/`
- New account abstraction contracts under `contracts/account/`
- Enhanced governance extensions

## Complete Import Path Reference

### Access Control
```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/access/extensions/IAccessControlDefaultAdminRules.sol";
import "@openzeppelin/contracts/access/extensions/IAccessControlEnumerable.sol";
import "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import "@openzeppelin/contracts/access/manager/AccessManager.sol";
import "@openzeppelin/contracts/access/manager/AuthorityUtils.sol";
import "@openzeppelin/contracts/access/manager/IAccessManaged.sol";
import "@openzeppelin/contracts/access/manager/IAccessManager.sol";
```

### Account Abstraction (New in v5.x)
```solidity
import "@openzeppelin/contracts/account/Account.sol";
import "@openzeppelin/contracts/account/extensions/draft-AccountERC7579.sol";
import "@openzeppelin/contracts/account/extensions/draft-AccountERC7579Hooked.sol";
import "@openzeppelin/contracts/account/extensions/draft-ERC7821.sol";
import "@openzeppelin/contracts/account/utils/draft-ERC4337Utils.sol";
import "@openzeppelin/contracts/account/utils/draft-ERC7579Utils.sol";
import "@openzeppelin/contracts/account/utils/EIP7702Utils.sol";
```

### Cross-chain (New in v5.x)
```solidity
import "@openzeppelin/contracts/crosschain/axelar/AxelarGatewayBase.sol";
import "@openzeppelin/contracts/crosschain/axelar/AxelarGatewayDestination.sol";
import "@openzeppelin/contracts/crosschain/axelar/AxelarGatewaySource.sol";
import "@openzeppelin/contracts/crosschain/axelar/interfaces/IAxelarGateway.sol";
import "@openzeppelin/contracts/crosschain/axelar/interfaces/IAxelarGasService.sol";
import "@openzeppelin/contracts/crosschain/interfaces/IERC7786GatewayDestination.sol";
import "@openzeppelin/contracts/crosschain/interfaces/IERC7786GatewaySource.sol";
import "@openzeppelin/contracts/crosschain/interfaces/IERC7786Receiver.sol";
```

### Finance
```solidity
import "@openzeppelin/contracts/finance/VestingWallet.sol";
import "@openzeppelin/contracts/finance/VestingWalletCliff.sol";
```

### Governance
```solidity
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingFractional.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorPreventLateQuorum.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorStorage.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockAccess.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockCompound.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "@openzeppelin/contracts/governance/utils/Votes.sol";
```

### Interfaces
```solidity
import "@openzeppelin/contracts/interfaces/draft-IERC1822.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC7579.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC1155MetadataURI.sol";
import "@openzeppelin/contracts/interfaces/IERC1155Receiver.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/interfaces/IERC1363.sol";
import "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";
import "@openzeppelin/contracts/interfaces/IERC1363Spender.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC1820Implementer.sol";
import "@openzeppelin/contracts/interfaces/IERC1820Registry.sol";
import "@openzeppelin/contracts/interfaces/IERC2309.sol";
import "@openzeppelin/contracts/interfaces/IERC2612.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/interfaces/IERC4906.sol";
import "@openzeppelin/contracts/interfaces/IERC5267.sol";
import "@openzeppelin/contracts/interfaces/IERC5313.sol";
import "@openzeppelin/contracts/interfaces/IERC5805.sol";
import "@openzeppelin/contracts/interfaces/IERC6372.sol";
import "@openzeppelin/contracts/interfaces/IERC6909.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC721Enumerable.sol";
import "@openzeppelin/contracts/interfaces/IERC721Metadata.sol";
import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import "@openzeppelin/contracts/interfaces/IERC7579.sol";
import "@openzeppelin/contracts/interfaces/IERC7674.sol";
import "@openzeppelin/contracts/interfaces/IERC7702.sol";
import "@openzeppelin/contracts/interfaces/IERC7786.sol";
import "@openzeppelin/contracts/interfaces/IERC777.sol";
import "@openzeppelin/contracts/interfaces/IERC777Recipient.sol";
import "@openzeppelin/contracts/interfaces/IERC777Sender.sol";
```

### Meta Transactions
```solidity
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "@openzeppelin/contracts/metatx/IERC2771.sol";
```

### Proxy Patterns
```solidity
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
```

### Token Standards

#### ERC20
```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20Errors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Temporary.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Wrapper.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
```

#### ERC721
```solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Consecutive.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Wrapper.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Utils.sol";
```

#### ERC1155
```solidity
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Utils.sol";
```

#### ERC6909 (New Multi-Token Standard)
```solidity
import "@openzeppelin/contracts/token/ERC6909/ERC6909.sol";
import "@openzeppelin/contracts/token/ERC6909/IERC6909.sol";
import "@openzeppelin/contracts/token/ERC6909/extensions/ERC6909ContentURI.sol";
import "@openzeppelin/contracts/token/ERC6909/extensions/ERC6909Metadata.sol";
import "@openzeppelin/contracts/token/ERC6909/extensions/ERC6909TokenSupply.sol";
import "@openzeppelin/contracts/token/ERC6909/extensions/IERC6909ContentURI.sol";
import "@openzeppelin/contracts/token/ERC6909/extensions/IERC6909Metadata.sol";
import "@openzeppelin/contracts/token/ERC6909/extensions/IERC6909TokenSupply.sol";
```

#### Common Token Utils
```solidity
import "@openzeppelin/contracts/token/common/ERC2981.sol";
```

### Utilities (⚠️ IMPORTANT: Many moved here from security/)

#### Core Utils
```solidity
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Arrays.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Blockhash.sol";
import "@openzeppelin/contracts/utils/Bytes.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/Errors.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";
import "@openzeppelin/contracts/utils/NoncesKeyed.sol";
import "@openzeppelin/contracts/utils/Packing.sol";
import "@openzeppelin/contracts/utils/Panic.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";  // ⚠️ MOVED FROM security/
import "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import "@openzeppelin/contracts/utils/ShortStrings.sol";
import "@openzeppelin/contracts/utils/SlotDerivation.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/TransientSlot.sol";
```

#### Cryptography
```solidity
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/Hashes.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/P256.sol";
import "@openzeppelin/contracts/utils/cryptography/RSA.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
```

#### Signers (New in v5.x)
```solidity
import "@openzeppelin/contracts/utils/cryptography/signers/AbstractSigner.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/ERC7739.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/ERC7739Utils.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/SignerECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/SignerP256.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/SignerRSA.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/draft-SignerEIP7702.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/SignerWebAuthn.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/draft-SignerERC7913.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/draft-MultiSignerERC7913.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/draft-MultiSignerERC7913Weighted.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/draft-ERC7913P256Verifier.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/draft-ERC7913RSAVerifier.sol";
import "@openzeppelin/contracts/utils/cryptography/signers/draft-ERC7913WebAuthnVerifier.sol";
```

#### Introspection
```solidity
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
```

#### Math
```solidity
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/utils/math/SignedMath.sol";
```

#### Data Structures
```solidity
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/utils/structs/Checkpoints.sol";
import "@openzeppelin/contracts/utils/structs/CircularBuffer.sol";
import "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/structs/Heap.sol";
import "@openzeppelin/contracts/utils/structs/MerkleTree.sol";
```

#### Types
```solidity
import "@openzeppelin/contracts/utils/types/Time.sol";
```

## Common Migration Examples

### Before (v4.x)
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
```

### After (v5.6.1)
```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
```

**Remember**: When upgrading from older versions, update ALL import paths to match v5.6.1 structure!