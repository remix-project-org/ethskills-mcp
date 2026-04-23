import { SkillSource, SkillMetadata } from "./types";

export class SkillManager {
  private sources: SkillSource[] = [];

  addSource(source: SkillSource): void {
    this.sources.push(source);
  }

  getAllSkills(): SkillMetadata[] {
    return this.sources.flatMap(source => 
      source.getSkills().map(skill => ({
        ...skill,
        source: source.getName()
      }))
    );
  }

  async getSkillContent(skillId: string): Promise<string | null> {
    for (const source of this.sources) {
      const content = await source.loadSkill(skillId);
      if (content !== null) {
        return content;
      }
    }
    return null;
  }

  async getSkillResource(skillId: string, resourcePath: string): Promise<string | null> {
    for (const source of this.sources) {
      if (source.loadSkillResource && source.isSkillAvailable(skillId)) {
        const content = await source.loadSkillResource(skillId, resourcePath);
        if (content !== null) {
          return content;
        }
      }
    }
    return null;
  }

  isSkillAvailable(skillId: string): boolean {
    return this.sources.some(source => source.isSkillAvailable(skillId));
  }

  getSourcesInfo(): string[] {
    return this.sources.map(source => {
      const skills = source.getSkills();
      const available = skills.filter(skill => source.isSkillAvailable(skill.id)).length;
      return `${source.getName()}: ${available}/${skills.length} skills available`;
    });
  }

  async getSkillResourcePaths(skillId: string): Promise<string[]> {
    for (const source of this.sources) {
      if (source.isSkillAvailable(skillId) && source.getSkillResourcePaths) {
        return await source.getSkillResourcePaths(skillId);
      }
    }
    return [];
  }
}