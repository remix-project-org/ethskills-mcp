import { WebSkillSource } from '../sources/WebSkillSource';
import { SkillMetadata } from '../types';

// Real ethskills.com metadata from the actual project
const REAL_ETHSKILLS_METADATA: SkillMetadata[] = [
  {
    id: "ship",
    name: "Ship",
    description: "End-to-end guide for AI agents — from a dApp idea to deployed production app",
  },
  {
    id: "wallets",
    name: "Wallets",
    description: "Wallet creation, connection, signing, multisig, and account abstraction",
  },
  {
    id: "security",
    name: "Security", 
    description: "Solidity security patterns and vulnerability defense",
  }
];

describe('WebSkillSource', () => {
  let webSkillSource: WebSkillSource;
  const realBaseUrl = 'https://ethskills.com';

  beforeEach(() => {
    webSkillSource = new WebSkillSource(realBaseUrl, REAL_ETHSKILLS_METADATA);
  });

  describe('Should get the skill content by id', () => {
    it('should load real skill content by ID successfully', async () => {
      const skillId = 'ship'; // Real skill from ethskills.com
      const content = await webSkillSource.loadSkill(skillId);
      
      expect(content).toBeDefined();
      expect(content).not.toBeNull();
      if (content) {
        expect(content.length).toBeGreaterThan(0);
        // Real ship skill should contain relevant content
        expect(content).toMatch(/ship|deploy|dapp|production|app/i);
      }
    }, 10000); // Increase timeout for real web request

    it('should load wallets skill content successfully', async () => {
      const skillId = 'wallets';
      const content = await webSkillSource.loadSkill(skillId);
      
      expect(content).toBeDefined();
      expect(content).not.toBeNull();
      if (content) {
        expect(content.length).toBeGreaterThan(0);
        // Real wallets skill should contain wallet-related content
        expect(content).toMatch(/wallet|connection|signing|multisig/i);
      }
    }, 10000);

    it('should return null for non-existent skill', async () => {
      const skillId = 'definitely-non-existent-skill-12345';
      const content = await webSkillSource.loadSkill(skillId);
      
      expect(content).toBeNull();
    });

    it('should cache skill content after first load', async () => {
      const skillId = 'security';
      
      // First load
      const content1 = await webSkillSource.loadSkill(skillId);
      expect(content1).toBeDefined();
      
      // Second load should return cached content (same reference)
      const content2 = await webSkillSource.loadSkill(skillId);
      expect(content2).toBe(content1);
    }, 10000);

    it('should correctly identify available skills after caching', async () => {
      const skillId = 'ship';
      
      // Initially not available (not cached)
      expect(webSkillSource.isSkillAvailable(skillId)).toBe(false);
      
      // Load the skill
      await webSkillSource.loadSkill(skillId);
      
      // Now it should be available (cached)
      expect(webSkillSource.isSkillAvailable(skillId)).toBe(true);
    }, 10000);

    it('should return correct real skill metadata', () => {
      const skills = webSkillSource.getSkills();
      
      expect(skills).toEqual(REAL_ETHSKILLS_METADATA);
      expect(skills.length).toBe(3);
      
      const shipSkill = skills.find(s => s.id === 'ship');
      expect(shipSkill?.name).toBe('Ship');
      expect(shipSkill?.description).toBe('End-to-end guide for AI agents — from a dApp idea to deployed production app');
      
      const walletsSkill = skills.find(s => s.id === 'wallets');
      expect(walletsSkill?.name).toBe('Wallets');
      expect(walletsSkill?.description).toBe('Wallet creation, connection, signing, multisig, and account abstraction');
    });

    it('should return correct source name', () => {
      const name = webSkillSource.getName();
      expect(name).toBe(`Web (${realBaseUrl})`);
    });

    it('should handle preloadAllSkills functionality', async () => {
      // Test preloading all skills
      await webSkillSource.preloadAllSkills();
      
      // After preloading, all skills should be available
      expect(webSkillSource.isSkillAvailable('ship')).toBe(true);
      expect(webSkillSource.isSkillAvailable('wallets')).toBe(true);
      expect(webSkillSource.isSkillAvailable('security')).toBe(true);
    }, 30000); // Longer timeout for preloading multiple skills
  });
});