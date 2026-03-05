import { FileSkillSource } from '../sources/FileSkillSource';

describe('FileSkillSource', () => {
  let fileSkillSource: FileSkillSource;
  const realSkillsDir = './skills'; // Use actual skills directory

  beforeEach(() => {
    fileSkillSource = new FileSkillSource(realSkillsDir);
  });

  describe('Should get the skill content by id', () => {
    it('should load real skill content by ID successfully', async () => {
      const skillId = 'coding-openzeppelin-imports'; // Real skill from coding/openzeppelin-imports.md
      const content = await fileSkillSource.loadSkill(skillId);
      
      expect(content).toBeDefined();
      expect(content).toContain('OpenZeppelin v5.6.1 Import Paths');
      expect(content).toContain('Complete reference for OpenZeppelin v5.6.1 import paths');
      expect(content).toContain('import "@openzeppelin/contracts/access/AccessControl.sol"');
      expect(content).toContain('## Complete Import Path Reference');
    });

    it('should return null for non-existent skill', async () => {
      const skillId = 'non-existent-skill';
      const content = await fileSkillSource.loadSkill(skillId);
      
      expect(content).toBeNull();
    });

    it('should cache skill content after first load', async () => {
      const skillId = 'coding-openzeppelin-imports';
      
      // First load
      const content1 = await fileSkillSource.loadSkill(skillId);
      expect(content1).toBeDefined();
      
      // Second load should return cached content
      const content2 = await fileSkillSource.loadSkill(skillId);
      expect(content2).toBe(content1);
    });

    it('should correctly identify available skills', () => {
      expect(fileSkillSource.isSkillAvailable('coding-openzeppelin-imports')).toBe(true);
      expect(fileSkillSource.isSkillAvailable('non-existent-skill')).toBe(false);
    });

    it('should return correct skill metadata for real skill', () => {
      const skills = fileSkillSource.getSkills();
      const ozSkill = skills.find(s => s.id === 'coding-openzeppelin-imports');
      
      expect(ozSkill).toBeDefined();
      expect(ozSkill?.name).toBe('OpenZeppelin v5.6.1 Import Paths');
      expect(ozSkill?.description).toBe('Complete reference for OpenZeppelin v5.6.1 import paths with all the latest changes and new contracts. Use this WHENEVER you have to fix or write import statements in solidity.');
    });

    it('should have at least one skill loaded', () => {
      const skills = fileSkillSource.getSkills();
      expect(skills.length).toBeGreaterThan(0);
    });
  });
});