export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
}

export interface SkillSource {
  getName(): string;
  getSkills(): SkillMetadata[];
  loadSkill(skillId: string): Promise<string | null>;
  loadSkillResource?(skillId: string, resourcePath: string): Promise<string | null>;
  getSkillResourcePaths?(skillId: string): Promise<string[]>;
  isSkillAvailable(skillId: string): boolean;
}