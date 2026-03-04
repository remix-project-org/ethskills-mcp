import { SkillSource, SkillMetadata } from "../types";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, extname, basename } from "path";

export class FileSkillSource implements SkillSource {
  private skills: SkillMetadata[] = [];
  private skillContentCache = new Map<string, string>();
  
  constructor(private skillsDirectory: string) {
    this.loadSkillsFromDirectory();
  }

  getName(): string {
    return `Files (${this.skillsDirectory})`;
  }

  getSkills(): SkillMetadata[] {
    return this.skills;
  }

  async loadSkill(skillId: string): Promise<string | null> {
    if (this.skillContentCache.has(skillId)) {
      return this.skillContentCache.get(skillId)!;
    }

    const skillFile = join(this.skillsDirectory, `${skillId}.md`);
    if (!existsSync(skillFile)) {
      return null;
    }

    try {
      const content = readFileSync(skillFile, 'utf-8');
      this.skillContentCache.set(skillId, content);
      console.log(`[${skillId}] loaded from file (${content.length} bytes)`);
      return content;
    } catch (err) {
      console.warn(`[${skillId}] file read failed: ${(err as Error).message}`);
      return null;
    }
  }

  isSkillAvailable(skillId: string): boolean {
    return this.skills.some(skill => skill.id === skillId);
  }

  private loadSkillsFromDirectory(): void {
    if (!existsSync(this.skillsDirectory)) {
      console.log(`Skills directory ${this.skillsDirectory} does not exist, creating it...`);
      return;
    }

    try {
      const files = readdirSync(this.skillsDirectory);
      const mdFiles = files.filter(file => extname(file) === '.md');
      
      this.skills = mdFiles.map(file => {
        const skillId = basename(file, '.md');
        return {
          id: skillId,
          name: this.formatSkillName(skillId),
          description: `Local skill: ${skillId}`
        };
      });

      console.log(`Found ${this.skills.length} local skills in ${this.skillsDirectory}`);
    } catch (err) {
      console.warn(`Failed to read skills directory: ${(err as Error).message}`);
    }
  }

  private formatSkillName(skillId: string): string {
    return skillId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}