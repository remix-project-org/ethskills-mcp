# Onchain Contracts Path

## Trigger Conditions

Read this file when:
- The user mentions `smartcontractkit/chainlink-ace`, the Chainlink ACE GitHub repo, or `@chainlink/ace`
- The user wants to use audited public contracts directly
- The user wants to self-deploy PolicyEngine, policies, extractors, identity registries, or token examples
- The user wants custom policies, custom extractors, custom mappers, or direct contract integration
- The user wants Foundry commands, package layout, licensing, or upgrade guidance

## Path Summary

Use this path when the user wants to build directly with smart contracts from the public repository.

| Dimension | Public ACE core contracts |
| --- | --- |
| Source | `https://github.com/smartcontractkit/chainlink-ace` |
| Package | `@chainlink/ace` |
| License | BUSL-1.1, change license MIT on the configured change date |
| Tooling | Foundry, pnpm, Solidity |
| Network scope | EVM contracts; users own deployment decisions |
| Production use | Contact Chainlink for production/commercial licensing |
| Management model | User deploys/configures contracts directly |

The public contracts support custom policies, extractors, mappers, and self-deployment, subject to license, audit, and engineering responsibility.

## Repository Structure

Top-level resources:
- `README.md` - product and repository overview
- `getting_started/GETTING_STARTED.md` - basic PolicyProtected + PolicyEngine integration
- `getting_started/advanced/GETTING_STARTED_ADVANCED.md` - tokenized-fund example with identity/credentials
- `UPGRADE_GUIDE.md` - upgrading existing proxy contracts to ACE
- `Glossary.md` - terms
- `LICENSE` - BUSL-1.1 license
- `chainlink-ace-License-grants` - additional use grant file
- `foundry.toml`, `remappings.txt`, `package.json` - Foundry/package configuration

Packages:

| Path | Purpose |
| --- | --- |
| `packages/policy-management` | PolicyEngine, PolicyProtected, policies, extractors, mappers, docs, tests |
| `packages/cross-chain-identity` | CCID, identity registry, credential registry, validator policy, docs, tests |
| `packages/tokens` | Example ERC-20 and ERC-3643 compliance token integrations |
| `packages/vendor` | Vendored dependencies |

## Package Scripts

The repo package metadata identifies:

```json
{
  "name": "@chainlink/ace",
  "license": "BUSL-1.1",
  "scripts": {
    "build": "forge build --sizes",
    "test": "forge test",
    "fmt": "forge fmt",
    "fmt:check": "forge fmt --check",
    "lint": "solhint packages/**/*.sol",
    "deploy:token:erc20": "forge script ./script/DeployComplianceTokenERC20.s.sol --via-ir --broadcast --rpc-url ${RPC_URL:=local}",
    "deploy:token:erc3643": "forge script ./script/DeployComplianceTokenERC3643.s.sol --via-ir --broadcast --rpc-url ${RPC_URL:=local}",
    "deploy:token:simple": "forge script ./script/DeploySimpleComplianceToken.s.sol --via-ir --broadcast --rpc-url ${RPC_URL:=local}"
  }
}
```

## Integration Pattern

For a new contract:

1. Inherit from `PolicyProtected`.
2. Add `runPolicy` or `runPolicyWithContext` to protected functions.
3. Deploy and initialize `PolicyEngine` behind a proxy.
4. Deploy the application contract behind a proxy and connect it to the PolicyEngine.
5. Deploy policies behind proxies where required.
6. Attach policies to specific function selectors through `policyEngine.addPolicy(...)`.

The getting-started guide uses a simple vault and `PausePolicy`; token builders should inspect the token examples instead of reinventing token logic.

## Upgrade Pattern

For an existing deployed contract, the upstream upgrade guide assumes the contract is upgradeable.

Recommended approach:
- Extend `PolicyProtectedUpgradeable`.
- Add a one-time `migrateToACE(address policyEngine)` reinitializer.
- Add `runPolicy` to functions that need policy checks.
- Deploy ACE infrastructure.
- Upgrade the proxy and call the migration.

Alternative approach:
- Implement `IPolicyProtected` directly when bytecode size or custom behavior requires it.
- This requires custom storage, context handling, `policyEngine.run()` calls, attach/detach support, and ERC-165 support.

Non-upgradeable contracts need alternatives such as wrapper contracts, contract migration, or protection at integration points. These involve tradeoffs and should be discussed with Chainlink for production use.

## Capabilities

Direct contract users can:
- Use pre-built policies
- Build custom policies
- Use or write extractors and mappers
- Deploy on EVM networks
- Integrate with custom dApps, vaults, DEXs, lending protocols, or tokens
- Use Cross-Chain Identity contracts directly
- Use reference ERC-20 and ERC-3643 token implementations

## Licensing Guidance

The repository license is BUSL-1.1. It grants copying, modification, derivative works, redistribution, and non-production use under the license terms, with a configured change date and change license. For production use, users should contact Chainlink for a commercial/prod license.

Do not provide legal advice. Recommend counsel review and Chainlink contact for production licensing.

## Security Guidance

1. Treat PolicyEngine administration as critical. Unauthorized policy changes can bypass compliance controls.
2. Use pre-built policies where possible.
3. Custom policies, extractors, and mappers require careful review and testing.
4. Review policy ordering because `Allowed` skips later policies.
5. Review `postRun()` logic carefully because it can mutate state after checks pass.
6. Ensure extractors parse calldata honestly; bad extractors can feed policies false data.
7. For upgrades, verify storage layout and bytecode size.
8. Run repo tests and integration tests against the specific policy chain.

## Source URLs

- Repo: `https://github.com/smartcontractkit/chainlink-ace`
- README: `https://github.com/smartcontractkit/chainlink-ace/blob/main/README.md`
- Getting started: `https://github.com/smartcontractkit/chainlink-ace/blob/main/getting_started/GETTING_STARTED.md`
- Advanced getting started: `https://github.com/smartcontractkit/chainlink-ace/blob/main/getting_started/advanced/GETTING_STARTED_ADVANCED.md`
- Upgrade guide: `https://github.com/smartcontractkit/chainlink-ace/blob/main/UPGRADE_GUIDE.md`
- Policy Management: `https://github.com/smartcontractkit/chainlink-ace/tree/main/packages/policy-management`
- Cross-Chain Identity: `https://github.com/smartcontractkit/chainlink-ace/tree/main/packages/cross-chain-identity`
- Tokens: `https://github.com/smartcontractkit/chainlink-ace/tree/main/packages/tokens`
