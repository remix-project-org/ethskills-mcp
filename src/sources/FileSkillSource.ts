import { SkillSource, SkillMetadata } from "../types";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, basename, relative } from "path";

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

    // Find the skill file by searching through nested directories
    const skillFile = this.findSkillFile(skillId);
    if (!skillFile || !existsSync(skillFile)) {
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

  async loadSkillResource(skillId: string, resourcePath: string): Promise<string | null> {
    // Find the skill directory first
    const skillFile = this.findSkillFile(skillId);
    if (!skillFile || !existsSync(skillFile)) {
      return null;
    }

    // Get the skill directory (parent of SKILL.md)
    const skillDirectory = join(skillFile, '..');
    const resourceFile = join(skillDirectory, resourcePath);

    // Security check: ensure the resource path doesn't escape the skill directory
    const normalizedSkillDir = join(skillDirectory).replace(/\\/g, '/');
    const normalizedResourceFile = join(resourceFile).replace(/\\/g, '/');
    
    if (!normalizedResourceFile.startsWith(normalizedSkillDir)) {
      console.warn(`[${skillId}] Resource path '${resourcePath}' attempts to escape skill directory`);
      return null;
    }

    if (!existsSync(resourceFile)) {
      console.warn(`[${skillId}] Resource file not found: ${resourceFile}`);
      return null;
    }

    try {
      const content = readFileSync(resourceFile, 'utf-8');
      console.log(`[${skillId}] loaded resource '${resourcePath}' (${content.length} bytes)`);
      return content;
    } catch (err) {
      console.warn(`[${skillId}] resource file read failed: ${(err as Error).message}`);
      return null;
    }
  }

  private findSkillFile(skillId: string): string | null {
    const skill = this.skills.find(s => s.id === skillId);
    return skill ? (skill as any).filePath : null;
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
      this.skills = this.scanDirectoryRecursively(this.skillsDirectory);
      console.log(`Found ${this.skills.length} local skills in ${this.skillsDirectory}`);
    } catch (err) {
      console.warn(`Failed to read skills directory: ${(err as Error).message}`);
    }
  }

  private scanDirectoryRecursively(dirPath: string): SkillMetadata[] {
    const skills: SkillMetadata[] = [];
    
    try {
      const entries = readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);
        const isReference = entry === 'references'
        // do not crawl references.
        if (stat.isDirectory() && !isReference) {
          // Recursively scan subdirectories
          skills.push(...this.scanDirectoryRecursively(fullPath));
        } else if (stat.isFile() && entry === 'SKILL.md') {
          // Create skill ID from directory path (not filename)
          const categoryPath = relative(this.skillsDirectory, dirPath);
          const skillId = this.createSkillId(categoryPath);
          
          // Extract name and description from file content
          const { name, description } = this.extractMetadataFromFile(fullPath);
          
          skills.push({
            id: skillId,
            name: name || this.formatSkillName(skillId),
            description: description,
            filePath: fullPath
          } as any);
        }
      }
    } catch (err) {
      console.warn(`Failed to read directory ${dirPath}: ${(err as Error).message}`);
    }
    
    return skills;
  }

  private createSkillId(directoryPath: string): string {
    // Convert path like "coding" or "security/ethereum" to skill ID
    if (!directoryPath || directoryPath === '.') {
      return 'root';
    }
    return directoryPath
      .replace(/[/\\]/g, '-')
      .toLowerCase();
  }

  private formatSkillName(skillId: string): string {
    return skillId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractMetadataFromFile(filePath: string): { name: string | null, description: string } {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Parse YAML frontmatter
      const frontmatter = this.parseYamlFrontmatter(content);
      let name: string | null = null;
      let description: string;
      
      // Get description from frontmatter if available
      if (frontmatter && frontmatter.description) {
        description = frontmatter.description;
      } else {
        description = 'No description available';
      }
      
      // Find start index after frontmatter
      let startIndex = 0;
      if (lines[0] === '---') {
        for (let i = 1; i < lines.length; i++) {
          if (lines[i] === '---') {
            startIndex = i + 1;
            break;
          }
        }
      }
      
      // Extract name from frontmatter or markdown title
      if (frontmatter && frontmatter.name) {
        name = frontmatter.name;
      } else {
        // Look for the first markdown header for the title
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#')) {
            // Extract multi-line header
            let headerLines = [line.replace(/^#+\s*/, '')];
            
            // Check if next lines continue the header (non-empty, don't start with #, *, or **)
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (!nextLine) break; // Empty line ends the header
              if (nextLine.startsWith('#') || nextLine.startsWith('**') || nextLine.startsWith('*')) break;
              headerLines.push(nextLine);
            }
            
            name = headerLines.join(' ').trim();
            break;
          }
        }
      }
      
      // If no description from frontmatter, try to extract from content
      if (!frontmatter?.description) {
        let descriptionLines: string[] = [];
        let foundStart = false;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Skip headers and empty lines
          if (line.startsWith('#') || !line) {
            if (foundStart) break; // End of description block
            continue;
          }
          
          // Skip markdown formatting markers at start of description
          if (!foundStart && (line.startsWith('**') || line.startsWith('*'))) {
            continue;
          }
          
          foundStart = true;
          descriptionLines.push(line);
          
          // Stop at next header, empty line, or formatting marker
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (!nextLine || nextLine.startsWith('#') || nextLine.startsWith('**') || nextLine.startsWith('*')) {
              break;
            }
          }
        }
        
        if (descriptionLines.length > 0) {
          description = descriptionLines.join(' ').trim();
        }
      }
      
      return { name, description };
    } catch (err) {
      console.warn(`Failed to extract metadata from ${filePath}: ${(err as Error).message}`);
      return { 
        name: null, 
        description: `Local skill: ${basename(filePath, '.md')}`
      };
    }
  }

  private parseYamlFrontmatter(content: string): Record<string, string> | null {
    const lines = content.split('\n');
    if (lines[0] !== '---') return null;
    
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        endIndex = i;
        break;
      }
    }
    
    if (endIndex === -1) return null;
    
    const frontmatter: Record<string, string> = {};
    let currentKey: string | null = null;
    let currentValue: string[] = [];
    
    for (let i = 1; i < endIndex; i++) {
      const line = lines[i];
      const colonIndex = line.indexOf(':');
      
      if (colonIndex !== -1 && !line.startsWith(' ') && !line.startsWith('\t')) {
        // Save previous key-value if exists
        if (currentKey) {
          frontmatter[currentKey] = currentValue.join('\n').trim();
        }
        
        // Start new key-value pair
        currentKey = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        currentValue = value ? [value] : [];
      } else if (currentKey && (line.startsWith(' ') || line.startsWith('\t') || line.trim() === '')) {
        // Continuation of multi-line value
        currentValue.push(line.replace(/^[ \t]*/, ''));
      }
    }
    
    // Save the last key-value pair
    if (currentKey) {
      frontmatter[currentKey] = currentValue.join('\n').trim();
    }
    
    return frontmatter;
  }
}