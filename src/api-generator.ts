import { promises as fs } from "node:fs";
import path from "node:path";

export type RescanTrigger = "manual" | "automatic";
export type RescanSource = "user" | "OttoUpdateAgent";

export interface ScannedCommandDefinition {
  id: string;
  description: string;
  sourceFile: string;
}

export interface ApiEndpointDefinition {
  kind: "builtin" | "generated";
  method: "GET" | "POST";
  route: string;
  description: string;
  commandId?: string;
  sourceFile?: string;
}

export interface ApiGenerationResult {
  version: string;
  generatedAt: string;
  scannedPath: string;
  warnings: string[];
  endpoints: ApiEndpointDefinition[];
}

export interface ApiGenerationOptions {
  repoRoot?: string;
  commandServicePath?: string;
  version?: string;
}

export interface ApiMetadataWriteOptions {
  memPalaceRoot?: string;
  trigger: RescanTrigger;
  source: RescanSource;
}

const SUPPORTED_EXTENSIONS = new Set([".json", ".ts", ".js", ".mjs", ".cjs", ".rs"]);

function normalizeVersion(version?: string): string {
  return version ?? "0.1.0";
}

export function resolveCommandServicePath(repoRoot = process.cwd(), explicitPath?: string): string {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  if (process.env.OTTO_COMMAND_SERVICE_PATH) {
    return path.resolve(process.env.OTTO_COMMAND_SERVICE_PATH);
  }

  return path.resolve(repoRoot, "../otto-command-service/src/commands");
}

export function resolveMemPalacePath(repoRoot = process.cwd(), explicitPath?: string): string {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  if (process.env.OTTO_MEMPALACE_PATH) {
    return path.resolve(process.env.OTTO_MEMPALACE_PATH);
  }

  return path.resolve(repoRoot, "../otto-extensions/mempalace");
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(rootPath: string): Promise<string[]> {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(entryPath);
      }

      return SUPPORTED_EXTENSIONS.has(path.extname(entry.name)) ? [entryPath] : [];
    })
  );

  return files.flat().sort();
}

function extractFirstMatch(content: string, patterns: RegExp[], fallback: string): string {
  for (const pattern of patterns) {
    const match = pattern.exec(content);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return fallback;
}

export async function scanCommandDefinitions(options: ApiGenerationOptions = {}): Promise<{
  scannedPath: string;
  commands: ScannedCommandDefinition[];
  warnings: string[];
}> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const scannedPath = resolveCommandServicePath(repoRoot, options.commandServicePath);
  const warnings: string[] = [];

  if (!(await pathExists(scannedPath))) {
    warnings.push(`Command service path not found: ${scannedPath}`);
    return { scannedPath, commands: [], warnings };
  }

  const files = await walkFiles(scannedPath);
  if (files.length === 0) {
    warnings.push(`No command definitions were discovered in ${scannedPath}`);
    return { scannedPath, commands: [], warnings };
  }

  const commands = await Promise.all(
    files.map(async (filePath) => {
      const content = await fs.readFile(filePath, "utf8");
      const fallbackId = path.basename(filePath, path.extname(filePath));
      const id = extractFirstMatch(
        content,
        [
          /"id"\s*:\s*"([^"]+)"/,
          /"name"\s*:\s*"([^"]+)"/,
          /id\s*[:=]\s*"([^"]+)"/,
          /name\s*[:=]\s*"([^"]+)"/
        ],
        fallbackId
      );
      const description = extractFirstMatch(
        content,
        [
          /"description"\s*:\s*"([^"]+)"/,
          /description\s*[:=]\s*"([^"]+)"/
        ],
        `Forward API request for ${id} to the command service layer.`
      );

      return {
        id,
        description,
        sourceFile: filePath
      } satisfies ScannedCommandDefinition;
    })
  );

  return { scannedPath, commands, warnings };
}

export async function generateApiArtifacts(options: ApiGenerationOptions = {}): Promise<ApiGenerationResult> {
  const { scannedPath, commands, warnings } = await scanCommandDefinitions(options);
  const version = normalizeVersion(options.version);

  const generated = commands.map<ApiEndpointDefinition>((command) => ({
    kind: "generated",
    method: "POST",
    route: `/api/v1/commands/${command.id}`,
    description: command.description,
    commandId: command.id,
    sourceFile: command.sourceFile
  }));

  return {
    version,
    generatedAt: new Date().toISOString(),
    scannedPath,
    warnings,
    endpoints: generated
  };
}

async function writeJson(targetPath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readJsonArray(targetPath: string): Promise<unknown[]> {
  if (!(await pathExists(targetPath))) {
    return [];
  }

  const content = await fs.readFile(targetPath, "utf8");
  const parsed = JSON.parse(content) as unknown;
  return Array.isArray(parsed) ? parsed : [];
}

export async function persistApiMetadata(
  result: ApiGenerationResult,
  options: ApiMetadataWriteOptions
): Promise<void> {
  const memPalaceRoot = resolveMemPalacePath(process.cwd(), options.memPalaceRoot);
  const snapshot = {
    updatedAt: result.generatedAt,
    version: result.version,
    scannedPath: result.scannedPath,
    warnings: result.warnings,
    endpoints: result.endpoints.filter((endpoint) => endpoint.kind === "generated")
  };
  const event = {
    at: result.generatedAt,
    trigger: options.trigger,
    source: options.source,
    endpointCount: snapshot.endpoints.length,
    warnings: result.warnings
  };

  await writeJson(path.join(memPalaceRoot, "api-endpoint-index.json"), snapshot);

  const generationHistoryPath = path.join(memPalaceRoot, "api-generation-history.json");
  const generationHistory = await readJsonArray(generationHistoryPath);
  generationHistory.push({ ...event, snapshot });
  await writeJson(generationHistoryPath, generationHistory);

  const rescanEventsPath = path.join(memPalaceRoot, "api-rescan-events.json");
  const rescanEvents = await readJsonArray(rescanEventsPath);
  rescanEvents.push(event);
  await writeJson(rescanEventsPath, rescanEvents);
}