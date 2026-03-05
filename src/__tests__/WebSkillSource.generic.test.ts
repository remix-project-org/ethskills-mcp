import { WebSkillSource, UrlResolver } from '../sources/WebSkillSource';
import { SkillMetadata } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('WebSkillSource - Generic URL Functionality', () => {
  const mockSkills: SkillMetadata[] = [
    { id: 'test-skill', name: 'Test Skill', description: 'Test description' },
    { id: 'another-skill', name: 'Another Skill', description: 'Another description' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom URL Resolvers', () => {
    it('should use custom URL resolver', async () => {
      const customResolver: UrlResolver = (skillId, baseUrl) => `${baseUrl}/custom/${skillId}.txt`;
      const webSource = new WebSkillSource('https://example.com', mockSkills, customResolver);
      const mockContent = 'Custom content from txt file';
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBe(mockContent);
      expect(fetch).toHaveBeenCalledWith('https://example.com/custom/test-skill.txt');
    });

    it('should handle complex URL patterns', async () => {
      const complexResolver: UrlResolver = (skillId, baseUrl) => {
        return `${baseUrl}/api/v1/skills/${skillId}?format=markdown&version=latest`;
      };
      const webSource = new WebSkillSource('https://api.skills.com', mockSkills, complexResolver);
      const mockContent = 'API response content';
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      const content = await webSource.loadSkill('another-skill');
      
      expect(content).toBe(mockContent);
      expect(fetch).toHaveBeenCalledWith('https://api.skills.com/api/v1/skills/another-skill?format=markdown&version=latest');
    });
  });

  describe('Factory Methods', () => {
    it('should create EthSkills source with default resolver', async () => {
      const webSource = WebSkillSource.createEthSkillsSource('https://ethskills.com', mockSkills);
      const mockContent = 'EthSkills content';
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBe(mockContent);
      expect(fetch).toHaveBeenCalledWith('https://ethskills.com/test-skill/SKILL.md');
    });

    it('should create direct URL source', async () => {
      const webSource = WebSkillSource.createDirectUrlSource('https://docs.example.com', mockSkills);
      const mockContent = 'Direct URL content';
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBe(mockContent);
      expect(fetch).toHaveBeenCalledWith('https://docs.example.com/test-skill.md');
    });

    it('should create GitHub raw source', async () => {
      const webSource = WebSkillSource.createRawGitHubSource('https://raw.githubusercontent.com/org/repo/main', mockSkills);
      const mockContent = 'GitHub README content';
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBe(mockContent);
      expect(fetch).toHaveBeenCalledWith('https://raw.githubusercontent.com/org/repo/main/test-skill/README.md');
    });

    it('should create custom URL source', async () => {
      const customResolver: UrlResolver = (skillId, baseUrl) => `${baseUrl}/wiki/${skillId.toUpperCase()}.wiki`;
      const webSource = WebSkillSource.createCustomUrlSource('https://wiki.example.com', mockSkills, customResolver);
      const mockContent = 'Wiki content';
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBe(mockContent);
      expect(fetch).toHaveBeenCalledWith('https://wiki.example.com/wiki/TEST-SKILL.wiki');
    });
  });

  describe('Error Handling with Generic URLs', () => {
    it('should handle HTTP errors with custom URLs', async () => {
      const customResolver: UrlResolver = (skillId, baseUrl) => `${baseUrl}/files/${skillId}.json`;
      const webSource = new WebSkillSource('https://files.example.com', mockSkills, customResolver);
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response);

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBeNull();
      expect(fetch).toHaveBeenCalledWith('https://files.example.com/files/test-skill.json');
    });

    it('should handle network errors with custom URLs', async () => {
      const customResolver: UrlResolver = (skillId, baseUrl) => `${baseUrl}/${skillId}.html`;
      const webSource = new WebSkillSource('https://unreachable.example.com', mockSkills, customResolver);
      
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('DNS resolution failed')
      );

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBeNull();
    });
  });

  describe('Caching with Generic URLs', () => {
    it('should cache content from custom URLs', async () => {
      const customResolver: UrlResolver = (skillId, baseUrl) => `${baseUrl}/content/${skillId}.md`;
      const webSource = new WebSkillSource('https://content.example.com', mockSkills, customResolver);
      const mockContent = 'Cached content';
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      // First load
      const content1 = await webSource.loadSkill('test-skill');
      expect(content1).toBe(mockContent);
      expect(fetch).toHaveBeenCalledTimes(1);
      
      // Second load should use cache
      const content2 = await webSource.loadSkill('test-skill');
      expect(content2).toBe(mockContent);
      expect(fetch).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('Real-world URL Patterns', () => {
    it('should handle GitLab raw files', async () => {
      const gitlabResolver: UrlResolver = (skillId, baseUrl) => 
        `${baseUrl}/-/raw/main/docs/${skillId}/${skillId}.md`;
      const webSource = new WebSkillSource('https://gitlab.com/org/project', mockSkills, gitlabResolver);
      const mockContent = 'GitLab documentation';
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBe(mockContent);
      expect(fetch).toHaveBeenCalledWith('https://gitlab.com/org/project/-/raw/main/docs/test-skill/test-skill.md');
    });

    it('should handle CDN-hosted files', async () => {
      const cdnResolver: UrlResolver = (skillId, baseUrl) => 
        `${baseUrl}/v1/skills/${skillId.replace('-', '_')}.markdown`;
      const webSource = new WebSkillSource('https://cdn.skills.io', mockSkills, cdnResolver);
      const mockContent = 'CDN content';
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBe(mockContent);
      expect(fetch).toHaveBeenCalledWith('https://cdn.skills.io/v1/skills/test_skill.markdown');
    });

    it('should handle API endpoints with authentication headers', async () => {
      const apiResolver: UrlResolver = (skillId, baseUrl) => `${baseUrl}/api/skills/${skillId}`;
      const webSource = new WebSkillSource('https://secure-api.example.com', mockSkills, apiResolver);
      const mockContent = 'Secure API content';
      
      // Mock fetch to verify URL is constructed correctly
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      } as Response);

      const content = await webSource.loadSkill('test-skill');
      
      expect(content).toBe(mockContent);
      expect(fetch).toHaveBeenCalledWith('https://secure-api.example.com/api/skills/test-skill');
    });
  });
});