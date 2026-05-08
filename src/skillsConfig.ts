import { SkillMetadata } from "./types";

export const ETHSKILLS_BASE_URL = "https://ethskills.com";

export const ETHSKILLS_METADATA: SkillMetadata[] = [
  {
    id: "ship",
    name: "Ship",
    description: "End-to-end guide for AI agents — from a dApp idea to deployed production app",
  },
  {
    id: "why",
    name: "Why Ethereum",
    description: "Covers upgrades, tradeoffs, and use case matching for Ethereum",
  },
  {
    id: "gas",
    name: "Gas & Costs",
    description: "Current gas pricing and mainnet vs L2 cost comparison",
  },
  {
    id: "wallets",
    name: "Wallets",
    description: "Wallet creation, connection, signing, multisig, and account abstraction",
  },
  {
    id: "l2s",
    name: "Layer 2s",
    description: "L2 landscape, bridging, and deployment differences across L2 networks",
  },
  {
    id: "standards",
    name: "Standards",
    description: "Token, identity, and payment standards including ERC-20, ERC-721, and more",
  },
  {
    id: "tools",
    name: "Tools",
    description: "Frameworks, libraries, RPCs, and block explorers for Ethereum development",
  },
  {
    id: "building-blocks",
    name: "Money Legos",
    description: "DeFi protocols and composability patterns",
  },
  {
    id: "orchestration",
    name: "Orchestration",
    description: "Three-phase build system and dApp patterns",
  },
  {
    id: "addresses",
    name: "Contract Addresses",
    description: "Verified contract addresses for major protocols across Ethereum mainnet and L2s",
  },
  {
    id: "concepts",
    name: "Concepts",
    description: "Mental models for onchain building",
  },
  {
    id: "security",
    name: "Security",
    description: "Solidity security patterns and vulnerability defense",
  },
  {
    id: "testing",
    name: "Testing",
    description: "Foundry testing methodologies for smart contracts",
  },
  {
    id: "indexing",
    name: "Indexing",
    description: "Reading and querying onchain data",
  },
  {
    id: "frontend-playbook",
    name: "Frontend Playbook",
    description: "Complete build-to-production pipeline for dApp frontends",
  },
  {
    id: "qa",
    name: "QA",
    description: "Production QA checklist for dApps",
  },
];

// GitHub repository configurations
export interface GitHubRepoConfig {
  url: string;
  branch?: string;
  skillsPath?: string; // Path within repo where skills are located (default: root)
  name: string; // Display name for the source
}

export const GITHUB_REPOS: GitHubRepoConfig[] = [
  {
    url: "https://github.com/Cyfrin/solskill",
    branch: "main",
    skillsPath: "skills",
    name: "Cyfrin Solskill GitHub"
  },
  {
    url: "https://github.com/Uniswap/uniswap-ai",
    branch: "main",
    skillsPath: "packages/plugins",
    name: "Uniswap-specific skills"
  }
  // Add more GitHub repositories here
  // Example:
  // {
  //   url: "https://github.com/username/repo-name",
  //   branch: "main",
  //   skillsPath: "skills",
  //   name: "Custom Skills Repo"
  // }
];
