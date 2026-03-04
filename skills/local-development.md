# Local Development Setup

This is a local skill that covers setting up a development environment for Ethereum projects.

## Prerequisites

- Node.js 18+ installed
- Git installed
- Code editor (VS Code recommended)

## Setting Up Your Environment

1. **Install Foundry**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Install Node.js Dependencies**
   ```bash
   npm install -g hardhat @openzeppelin/cli
   ```

3. **Set up your workspace**
   ```bash
   mkdir my-dapp
   cd my-dapp
   npm init -y
   ```

## Best Practices

- Always use version control (Git)
- Set up automated testing early
- Use environment variables for sensitive data
- Document your code and processes

This skill demonstrates how local markdown files can be used as skill sources alongside web-based skills.