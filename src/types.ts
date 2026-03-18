export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
}

export interface SkillSource {
  getName(): string;
  getSkills(): SkillMetadata[];
  loadSkill(skillId: string): Promise<string | null>;
  loadSkillReference?(skillId: string, referencePath: string): Promise<string | null>;
  isSkillAvailable(skillId: string): boolean;
}