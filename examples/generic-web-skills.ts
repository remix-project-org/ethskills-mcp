/**
 * Examples of using the generic WebSkillSource to fetch skills from different URL patterns
 */

import { WebSkillSource, UrlResolver } from '../src/sources/WebSkillSource';
import { SkillMetadata } from '../src/types';

// Example 1: Using the default EthSkills pattern
const ethSkillsMetadata: SkillMetadata[] = [
  { id: 'ship', name: 'Ship', description: 'Deployment guide' },
  { id: 'wallets', name: 'Wallets', description: 'Wallet integration' }
];

const ethSkillsSource = WebSkillSource.createEthSkillsSource('https://ethskills.com', ethSkillsMetadata);
// This will fetch from: https://ethskills.com/{skillId}/SKILL.md

// Example 2: Direct markdown files
const docsMetadata: SkillMetadata[] = [
  { id: 'installation', name: 'Installation', description: 'How to install' },
  { id: 'configuration', name: 'Configuration', description: 'How to configure' }
];

const docsSource = WebSkillSource.createDirectUrlSource('https://docs.example.com', docsMetadata);
// This will fetch from: https://docs.example.com/{skillId}.md

// Example 3: GitHub raw files
const githubMetadata: SkillMetadata[] = [
  { id: 'api-reference', name: 'API Reference', description: 'API documentation' },
  { id: 'tutorials', name: 'Tutorials', description: 'Step-by-step tutorials' }
];

const githubSource = WebSkillSource.createRawGitHubSource(
  'https://raw.githubusercontent.com/org/repo/main', 
  githubMetadata
);
// This will fetch from: https://raw.githubusercontent.com/org/repo/main/{skillId}/README.md

// Example 4: Custom URL pattern with API endpoints
const apiMetadata: SkillMetadata[] = [
  { id: 'user-management', name: 'User Management', description: 'User system docs' },
  { id: 'authentication', name: 'Authentication', description: 'Auth system docs' }
];

const apiResolver: UrlResolver = (skillId: string, baseUrl: string) => {
  return `${baseUrl}/api/v2/documentation/${skillId}?format=markdown&lang=en`;
};

const apiSource = WebSkillSource.createCustomUrlSource('https://api.myservice.com', apiMetadata, apiResolver);
// This will fetch from: https://api.myservice.com/api/v2/documentation/{skillId}?format=markdown&lang=en

// Example 5: Complex custom resolver for GitLab
const gitlabMetadata: SkillMetadata[] = [
  { id: 'deployment', name: 'Deployment', description: 'Deployment strategies' },
  { id: 'monitoring', name: 'Monitoring', description: 'System monitoring' }
];

const gitlabResolver: UrlResolver = (skillId: string, baseUrl: string) => {
  // Convert kebab-case to snake_case and add versioning
  const fileName = skillId.replace(/-/g, '_');
  return `${baseUrl}/-/raw/main/docs/skills/${fileName}/${fileName}.md`;
};

const gitlabSource = WebSkillSource.createCustomUrlSource(
  'https://gitlab.com/myorg/knowledge-base', 
  gitlabMetadata, 
  gitlabResolver
);
// This will fetch from: https://gitlab.com/myorg/knowledge-base/-/raw/main/docs/skills/{skill_name}/{skill_name}.md

// Example 6: CDN with versioning and file transformation
const cdnMetadata: SkillMetadata[] = [
  { id: 'quick-start', name: 'Quick Start', description: 'Get started quickly' },
  { id: 'advanced-topics', name: 'Advanced Topics', description: 'Advanced usage' }
];

const cdnResolver: UrlResolver = (skillId: string, baseUrl: string) => {
  // Transform skill ID and add version/cache busting
  const transformedId = skillId.replace(/-/g, '_').toUpperCase();
  const timestamp = Date.now();
  return `${baseUrl}/v3/skills/${transformedId}.markdown?v=${timestamp}`;
};

const cdnSource = WebSkillSource.createCustomUrlSource('https://cdn.skills.io', cdnMetadata, cdnResolver);
// This will fetch from: https://cdn.skills.io/v3/skills/{SKILL_NAME}.markdown?v={timestamp}

// Usage example
async function demonstrateUsage() {
  try {
    // Load from EthSkills
    const shipContent = await ethSkillsSource.loadSkill('ship');
    console.log('Loaded ship skill')

    // Load from direct URL
    const installContent = await docsSource.loadSkill('installation');
    console.log('Loaded installation docs')

    // Load from GitHub
    const apiContent = await githubSource.loadSkill('api-reference');
    console.log('Loaded API reference')

    // Load from custom API
    const userMgmtContent = await apiSource.loadSkill('user-management');
    console.log('Loaded user management docs')

  } catch (error) {
    console.error('Error loading skills:', error);
  }
}

// Example of using in a SkillManager
import { SkillManager } from '../src/SkillManager';

async function setupMultipleWebSources() {
  const skillManager = new SkillManager();
  
  // Add multiple web sources with different URL patterns
  skillManager.addSource(ethSkillsSource);
  skillManager.addSource(docsSource);
  skillManager.addSource(githubSource);
  skillManager.addSource(apiSource);
  
  // Preload all skills from all sources
  await Promise.all([
    ethSkillsSource.preloadAllSkills(),
    docsSource.preloadAllSkills(),
    githubSource.preloadAllSkills(),
    apiSource.preloadAllSkills()
  ]);
  
  console.log('All web sources ready!');
  console.log('Available skills:', skillManager.getAllSkills().map(s => s.id));
}

export {
  ethSkillsSource,
  docsSource,
  githubSource,
  apiSource,
  gitlabSource,
  cdnSource,
  demonstrateUsage,
  setupMultipleWebSources
};