#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import the actual skill manager and sources
const { SkillManager } = require('../dist/SkillManager');
const { WebSkillSource } = require('../dist/sources/WebSkillSource');
const { FileSkillSource } = require('../dist/sources/FileSkillSource');
const { ETHSKILLS_BASE_URL, CYFRIN_SOLSKILL_BASE_URL, ETHSKILLS_METADATA, CYFRIN_SOLSKILL_METADATA } = require('../dist/skillsConfig');

const SKILLS_DIRECTORY = process.env.SKILLS_DIRECTORY || "./skills";


async function main() {
  const outputFile = path.join(__dirname, '..', 'skills-dump.md');
  
  try {
    // Build the project first to ensure compiled files exist
    const { execSync } = require('child_process');
    console.log('Building project...');
    execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    
    // Initialize skill manager
    console.log('Initializing skill sources...');
    const skillManager = new SkillManager();
    
    // Add web source for ethskills.com
    const webSource = new WebSkillSource(ETHSKILLS_BASE_URL, ETHSKILLS_METADATA);
    skillManager.addSource(webSource);
    await webSource.preloadAllSkills();

    // Add Cyfrin Solskill source with custom URL resolver
    const cyfrinSolskillSource = WebSkillSource.createCustomUrlSource(
      CYFRIN_SOLSKILL_BASE_URL,
      CYFRIN_SOLSKILL_METADATA,
      (skillId, baseUrl) => `${baseUrl}/${skillId}/SKILL.md`
    );
    skillManager.addSource(cyfrinSolskillSource);
    await cyfrinSolskillSource.preloadAllSkills();
    
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
    
    for (const [, skills] of Object.entries(skillsBySource)) {
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