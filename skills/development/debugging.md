# Debugging Ethereum Applications

Comprehensive guide for debugging smart contracts and dApps.

## Tools

### Hardhat Console
```bash
npx hardhat console --network localhost
```

### Foundry Debugger
```bash
forge debug --debug src/Contract.sol:Contract --sig "function()"
```

### Browser Developer Tools
- Use MetaMask developer mode
- Monitor network requests
- Check console for JavaScript errors

## Common Issues

1. **Gas Estimation Failures**
   - Check for reverts in view functions
   - Verify contract state before transactions

2. **Transaction Reverts**
   - Use `require` statements with descriptive messages
   - Test edge cases thoroughly

3. **Frontend Connection Issues**
   - Verify RPC endpoint connectivity
   - Check wallet connection status
   - Ensure correct network selection

## Debugging Strategies

1. **Add logging events**
2. **Use step-through debugging**
3. **Test with minimal examples**
4. **Check blockchain state directly**

Effective debugging saves time and prevents costly mistakes in production.