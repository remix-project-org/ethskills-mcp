import { SkillSource, SkillMetadata } from "../types";

export type UrlResolver = (skillId: string, baseUrl: string) => string;

export class WebSkillSource implements SkillSource {
  private skillCache = new Map<string, string>();
  private urlResolver: UrlResolver;
  
  constructor(
    private baseUrl: string,
    private skills: SkillMetadata[],
    urlResolver?: UrlResolver
  ) {
    // Default URL resolver for ethskills.com pattern
    this.urlResolver = urlResolver || ((skillId: string, baseUrl: string) => `${baseUrl}/${skillId}/SKILL.md`);
  }

  getName(): string {
    return `Web (${this.baseUrl})`;
  }

  getSkills(): SkillMetadata[] {
    return this.skills;
  }

  async loadSkill(skillId: string): Promise<string | null> {
    if (this.skillCache.has(skillId)) {
      return this.skillCache.get(skillId)!;
    }

    const url = this.urlResolver(skillId, this.baseUrl);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[${skillId}] HTTP ${response.status} — skipped`);
        return null;
      }
      const content = await response.text();
      this.skillCache.set(skillId, content);
      return content;
    } catch (err) {
      console.warn(`[${skillId}] web fetch failed: ${(err as Error).message}`);
      return null;
    }
  }

  isSkillAvailable(skillId: string): boolean {
    return this.skillCache.has(skillId);
  }

  async preloadAllSkills(): Promise<void> {
    console.log(`Downloading ${this.skills.length} skills from ${this.baseUrl}...`);

    await Promise.all(
      this.skills.map(async (skill) => {
        await this.loadSkill(skill.id);
      })
    );

    console.log(`Web skills ready: ${this.skillCache.size}/${this.skills.length}`);
  }

  // Static factory methods for common URL patterns
  static createEthSkillsSource(baseUrl: string, skills: SkillMetadata[]): WebSkillSource {
    return new WebSkillSource(baseUrl, skills);
  }

  static createDirectUrlSource(baseUrl: string, skills: SkillMetadata[]): WebSkillSource {
    return new WebSkillSource(baseUrl, skills, (skillId: string, baseUrl: string) => `${baseUrl}/${skillId}.md`);
  }

  static createRawGitHubSource(baseUrl: string, skills: SkillMetadata[]): WebSkillSource {
    return new WebSkillSource(baseUrl, skills, (skillId: string, baseUrl: string) => `${baseUrl}/${skillId}/README.md`);
  }

  static createCustomUrlSource(baseUrl: string, skills: SkillMetadata[], urlResolver: UrlResolver): WebSkillSource {
    return new WebSkillSource(baseUrl, skills, urlResolver);
  }
}