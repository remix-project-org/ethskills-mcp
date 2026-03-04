#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import the actual skill manager and sources
const { SkillManager } = require('../dist/SkillManager');
const { WebSkillSource } = require('../dist/sources/WebSkillSource');
const { FileSkillSource } = require('../dist/sources/FileSkillSource');

const ETHSKILLS_BASE_URL = "https://ethskills.com";
const SKILLS_DIRECTORY = process.env.SKILLS_DIRECTORY || "./skills";

// Metadata from ethskills.com
const ETHSKILLS_METADATA = [
  { id: "ship", name: "Ship", description: "End-to-end guide for AI agents — from a dApp idea to deployed production app" },
  { id: "why", name: "Why Ethereum", description: "Covers upgrades, tradeoffs, and use case matching for Ethereum" },
  { id: "gas", name: "Gas & Costs", description: "Current gas pricing and mainnet vs L2 cost comparison" },
  { id: "wallets", name: "Wallets", description: "Wallet creation, connection, signing, multisig, and account abstraction" },
  { id: "l2s", name: "Layer 2s", description: "L2 landscape, bridging, and deployment differences across L2 networks" },
  { id: "standards", name: "Standards", description: "Token, identity, and payment standards including ERC-20, ERC-721, and more" },
  { id: "tools", name: "Tools", description: "Frameworks, libraries, RPCs, and block explorers for Ethereum development" },
  { id: "building-blocks", name: "Money Legos", description: "DeFi protocols and composability patterns" },
  { id: "orchestration", name: "Orchestration", description: "Three-phase build system and dApp patterns" },
  { id: "addresses", name: "Contract Addresses", description: "Verified contract addresses for major protocols across Ethereum mainnet and L2s" },
  { id: "concepts", name: "Concepts", description: "Mental models for onchain building" },
  { id: "security", name: "Security", description: "Solidity security patterns and vulnerability defense" },
  { id: "testing", name: "Testing", description: "Foundry testing methodologies for smart contracts" },
  { id: "indexing", name: "Indexing", description: "Reading and querying onchain data" },
  { id: "frontend-ux", name: "Frontend UX", description: "Scaffold-ETH 2 rules and patterns for frontend development" },
  { id: "frontend-playbook", name: "Frontend Playbook", description: "Complete build-to-production pipeline for dApp frontends" },
  { id: "qa", name: "QA", description: "Production QA checklist for dApps" },
];

function parseYamlFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') return null;
  
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex === -1) return null;
  
  const frontmatter = {};
  for (let i = 1; i < endIndex; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }
  
  return frontmatter;
}

function extractNameFromMarkdown(content) {
  // First try YAML frontmatter
  const frontmatter = parseYamlFrontmatter(content);
  if (frontmatter && frontmatter.name) {
    return frontmatter.name;
  }
  
  // Fallback to markdown header
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '');
    }
  }
  
  return 'Untitled';
}

function extractDescription(content) {
  // First try YAML frontmatter
  const frontmatter = parseYamlFrontmatter(content);
  if (frontmatter && frontmatter.description) {
    return frontmatter.description;
  }
  
  // Fallback to content parsing
  const lines = content.split('\n');
  let startIndex = 0;
  
  // Skip YAML frontmatter if present
  if (lines[0] === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        startIndex = i + 1;
        break;
      }
    }
  }
  
  // Look for the first non-empty line after the title that's not a header
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#') && !line.startsWith('**')) {
      return line;
    }
  }
  
  return 'No description available';
}

async function main() {
  const outputFile = path.join(__dirname, '..', 'skills-dump.txt');
  
  try {
    // Build the project first to ensure compiled files exist
    const { execSync } = require('child_process');
    console.log('Building project...');
    execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    
    // Initialize skill manager
    console.log('Initializing skill sources...');
    const skillManager = new SkillManager();
    
    // Add web source
    const webSource = new WebSkillSource(ETHSKILLS_BASE_URL, ETHSKILLS_METADATA);
    skillManager.addSource(webSource);
    
    // Add file source
    const fileSource = new FileSkillSource(SKILLS_DIRECTORY);
    skillManager.addSource(fileSource);
    
    // Get all skills
    const allSkills = skillManager.getAllSkills();
    
    // Sort skills by source then by name
    allSkills.sort((a, b) => {
      if (a.source !== b.source) {
        return a.source.localeCompare(b.source);
      }
      return a.name.localeCompare(b.name);
    });
    
    // Generate output
    let output = `# Available Skills (${allSkills.length} total)\n\n`;
    
    // Group by source
    const skillsBySource = {};
    allSkills.forEach(skill => {
      if (!skillsBySource[skill.source]) {
        skillsBySource[skill.source] = [];
      }
      skillsBySource[skill.source].push(skill);
    });
    
    for (const [sourceName, skills] of Object.entries(skillsBySource)) {
      for (const skill of skills) {
        output += `### ${skill.name}\n`;
        output += `**ID:** ${skill.id}\n`;
        output += `**Description:** ${skill.description}\n\n`;
      }
    }
    
    // Write to file
    fs.writeFileSync(outputFile, output);
    
    console.log(`✅ Skills dump written to ${outputFile}`);
    console.log(`📊 Found ${allSkills.length} skills from ${Object.keys(skillsBySource).length} sources`);
    
    // Show source summary
    for (const [sourceName, skills] of Object.entries(skillsBySource)) {
      console.log(`   - ${sourceName}: ${skills.length} skills`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();