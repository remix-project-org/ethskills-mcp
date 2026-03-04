import { SkillSource, SkillMetadata } from "../types";

export class WebSkillSource implements SkillSource {
  private skillCache = new Map<string, string>();
  
  constructor(
    private baseUrl: string,
    private skills: SkillMetadata[]
  ) {}

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

    const url = `${this.baseUrl}/${skillId}/SKILL.md`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[${skillId}] HTTP ${response.status} — skipped`);
        return null;
      }
      const content = await response.text();
      this.skillCache.set(skillId, content);
      console.log(`[${skillId}] loaded from web (${content.length} bytes)`);
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
}