import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import { randomUUID } from "crypto";
import { SkillManager } from "./SkillManager";
import { WebSkillSource } from "./sources/WebSkillSource";
import { FileSkillSource } from "./sources/FileSkillSource";
import { GitSkillSource } from "./sources/GitSkillSource";
import { ETHSKILLS_BASE_URL, ETHSKILLS_METADATA, GITHUB_REPOS } from "./skillsConfig";

const PORT = parseInt(process.env.PORT || "9005");
const HOST = process.env.HOST || "0.0.0.0";
const SKILLS_DIRECTORY = process.env.SKILLS_DIRECTORY || "./skills";

const skillManager = new SkillManager();

async function initializeSkillSources(): Promise<void> {
  // Add web-based skills from ethskills.com
  const webSource = new WebSkillSource(ETHSKILLS_BASE_URL, ETHSKILLS_METADATA);
  skillManager.addSource(webSource);
  await webSource.preloadAllSkills();

  // Add file-based skills from local directory
  const fileSource = new FileSkillSource(SKILLS_DIRECTORY);
  skillManager.addSource(fileSource);

  // Add GitHub repository-based skills
  for (const repoConfig of GITHUB_REPOS) {
    try {
      console.log(`Initializing GitHub repo: ${repoConfig.name} (${repoConfig.url})`);
      const gitSource = new GitSkillSource(repoConfig);
      skillManager.addSource(gitSource);
    } catch (error) {
      console.error(`Failed to initialize GitHub repo ${repoConfig.name}: ${(error as Error).message}`);
    }
  }
}

function createMcpServer(): Server {
  const server = new Server(
    { name: "ethskills", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_skills",
        description: "List all available Ethereum development skills from multiple sources (ethskills.com and local files)",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "get_skill",
        description: "Read the full content of a specific Ethereum development skill",
        inputSchema: {
          type: "object" as const,
          properties: {
            skill_id: {
              type: "string",
              description:
                "The skill identifier. Use list_skills to see all available ids (e.g. 'ship', 'wallets', 'security')",
            },
          },
          required: ["skill_id"],
        },
      },
      {
        name: "get_skill_resource",
        description: "Read a resource file associated with a specific skill (references, assets, scripts, etc.)",
        inputSchema: {
          type: "object" as const,
          properties: {
            skill_id: {
              type: "string",
              description: "The skill identifier that owns the reference file",
            },
            resource_path: {
              type: "string",
              description: "Relative path from the skill's directory to the resource file (e.g. 'references/claims-lifecycle.md', 'assets/diagram.png', 'scripts/setup.sh')",
            },
          },
          required: ["skill_id", "resource_path"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "list_skills") {
      const allSkills = skillManager.getAllSkills();
      const skillList = allSkills.map((s: any) => {
        const note = skillManager.isSkillAvailable(s.id) ? "" : " *(unavailable)*";
        const sourceNote = s.source ? ` [${s.source}]` : "";
        return `- **${s.name}** (id: \`${s.id}\`): ${s.description}${note}${sourceNote}`;
      }).join("\n");

      const sourcesInfo = skillManager.getSourcesInfo().join("\n- ");

      return {
        content: [
          {
            type: "text" as const,
            text: `# Available Ethereum Development Skills\n\nUse \`get_skill\` with a skill id to read the full content.\n\n## Sources:\n- ${sourcesInfo}\n\n## Skills:\n${skillList}`,
          },
        ],
      };
    }

    if (name === "get_skill") {
      const skill_id = (args as { skill_id: string }).skill_id;
      const allSkills = skillManager.getAllSkills();
      const skill = allSkills.find((s) => s.id === skill_id);

      if (!skill) {
        const validIds = allSkills.map((s) => s.id).join(", ");
        console.warn(`Requested unknown skill id: '${skill_id}'. Valid ids are: ${validIds}`);
        return {
          content: [{ type: "text" as const, text: `Unknown skill id: '${skill_id}'. Valid ids are: ${validIds}` }],
          isError: true,
        };
      }

      const content = await skillManager.getSkillContent(skill_id);
      if (!content) {
        console.error(`Failed to load content for skill id: '${skill_id}'`);
        return {
          content: [{ type: "text" as const, text: `Skill '${skill_id}' content is unavailable (failed to load).` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: content }],
      };
    }

    if (name === "get_skill_resource") {
      const { skill_id, resource_path } = args as { skill_id: string; resource_path: string };
      const allSkills = skillManager.getAllSkills();
      const skill = allSkills.find((s) => s.id === skill_id);

      if (!skill) {
        const validIds = allSkills.map((s) => s.id).join(", ");
        console.warn(`Requested unknown skill id: '${skill_id}'. Valid ids are: ${validIds}`);
        return {
          content: [{ type: "text" as const, text: `Unknown skill id: '${skill_id}'. Valid ids are: ${validIds}` }],
          isError: true,
        };
      }

      try {
        const resourceContent = await skillManager.getSkillResource(skill_id, resource_path);
        if (!resourceContent) {
          console.warn(`Resource file not found: ${resource_path} for skill: ${skill_id}`);
          return {
            content: [{ type: "text" as const, text: `Resource file '${resource_path}' not found for skill '${skill_id}'` }],
            isError: true,
          };
        }
        
        return {
          content: [{ type: "text" as const, text: resourceContent }],
        };
      } catch (error) {
        console.error(`Failed to load resource: ${resource_path} for skill: ${skill_id}`, error);
        return {
          content: [{ type: "text" as const, text: `Failed to load resource file '${resource_path}' for skill '${skill_id}': ${(error as Error).message}` }],
          isError: true,
        };
      }
    }
    console.warn(`Received request for unknown tool: '${name}'`);
    return {
      content: [{ type: "text" as const, text: `Unknown tool: '${name}'` }],
      isError: true,
    };
  });

  return server;
}

const app = express();
app.use(express.json());
app.use((_req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

const sessions = new Map<string, { transport: StreamableHTTPServerTransport }>();

app.get("/health", (_req: Request, res: Response) => {
  const allSkills = skillManager.getAllSkills();
  const availableSkills = allSkills.filter(skill => skillManager.isSkillAvailable(skill.id));
  
  res.json({
    status: "ok",
    service: "ethskills-mcp",
    skills_loaded: availableSkills.length,
    skills_total: allSkills.length,
    sources: skillManager.getSourcesInfo(),
  });
});

app.get("/skills", (_req: Request, res: Response) => {
  const allSkills = skillManager.getAllSkills();
  const skillList = allSkills.map((s: any) => {
    const note = skillManager.isSkillAvailable(s.id) ? "" : " *(unavailable)*";
    const sourceNote = s.source ? ` [${s.source}]` : "";
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      available: skillManager.isSkillAvailable(s.id),
      source: s.source,
      displayText: `- **${s.name}** (id: \`${s.id}\`): ${s.description}${note}${sourceNote}`
    };
  });

  const sourcesInfo = skillManager.getSourcesInfo();

  res.json({
    skills: skillList,
    sources: sourcesInfo,
    total: allSkills.length,
    available: skillList.filter(skill => skill.available).length
  });
});

app.get("/skills/:skillId", async (req: Request, res: Response) => {
  const { skillId } = req.params;
  
  const allSkills = skillManager.getAllSkills();
  const skill = allSkills.find(s => s.id === skillId);
  
  if (!skill) {
    const validIds = allSkills.map(s => s.id).join(", ");
    res.status(404).json({ 
      error: `Unknown skill id: '${skillId}'. Valid ids are: ${validIds}` 
    });
    return;
  }
  
  try {
    const content = await skillManager.getSkillContent(skillId);
    if (!content) {
      res.status(500).json({ 
        error: `Skill '${skillId}' content is unavailable (failed to load).` 
      });
      return;
    }
    
    // Get all resource files for this skill
    const resources: { [path: string]: string } = {};
    
    // Get available resource paths dynamically
    const resourcePaths = await skillManager.getSkillResourcePaths(skillId);
    
    // Load each resource file
    for (const resourcePath of resourcePaths) {
      try {
        const resourceContent = await skillManager.getSkillResource(skillId, resourcePath);
        if (resourceContent) {
          resources[resourcePath] = resourceContent;
        }
      } catch (error) {
        console.warn(`Failed to load resource ${resourcePath} for skill ${skillId}:`, error);
      }
    }
    
    res.json({
      id: skillId,
      name: skill.name,
      description: skill.description,
      content,
      resources
    });
    
  } catch (error) {
    console.error(`Error fetching skill ${skillId}:`, error);
    res.status(500).json({ 
      error: `Failed to load skill '${skillId}': ${(error as Error).message}` 
    });
  }
});

app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, { transport });
    },
  });

  transport.onclose = () => {
    const id = transport.sessionId;
    if (id) sessions.delete(id);
  };

  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing mcp-session-id" });
    return;
  }
  const { transport } = sessions.get(sessionId)!;
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
    sessions.delete(sessionId);
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

async function main(): Promise<void> {
  await initializeSkillSources();

  app.listen(PORT, HOST, () => {
    console.log(`ethskills MCP server listening on ${HOST}:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
