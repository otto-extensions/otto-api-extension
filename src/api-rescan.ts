import {
  type ApiGenerationOptions,
  type ApiGenerationResult,
  type RescanSource,
  type RescanTrigger,
  generateApiArtifacts,
  persistApiMetadata
} from "./api-generator.js";

export interface ApiRescanOptions extends ApiGenerationOptions {
  memPalaceRoot?: string;
  trigger: RescanTrigger;
  source: RescanSource;
}

export interface ApiRescanCommandInput extends Omit<ApiRescanOptions, "trigger" | "source"> {
  trigger?: RescanTrigger;
  source?: RescanSource;
}

export interface ExtensionCommandDefinition<TInput, TOutput> {
  id: string;
  version: string;
  description: string;
  metadata: {
    owner: string;
    tags: string[];
  };
  safety: {
    idempotent: boolean;
    sideEffects: Array<"mempalace-write">;
  };
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  execute(input: TInput): Promise<TOutput>;
}

export async function rescanApi(options: ApiRescanOptions): Promise<ApiGenerationResult> {
  const result = await generateApiArtifacts(options);
  await persistApiMetadata(result, {
    memPalaceRoot: options.memPalaceRoot,
    trigger: options.trigger,
    source: options.source
  });
  return result;
}

export async function executeApiRescanCommand(input: ApiRescanCommandInput): Promise<ApiGenerationResult> {
  return rescanApi({
    ...input,
    trigger: input.trigger ?? "manual",
    source: input.source ?? "user"
  });
}

export const apiRescanCommandDefinition: ExtensionCommandDefinition<ApiRescanCommandInput, ApiGenerationResult> = {
  id: "otto.api.rescan",
  version: "1.0.0",
  description: "Rescan command registry and regenerate OpenAPI metadata.",
  metadata: {
    owner: "otto-api-extension",
    tags: ["api", "rescan", "command-service"]
  },
  safety: {
    idempotent: true,
    sideEffects: ["mempalace-write"]
  },
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      repoRoot: { type: "string" },
      commandServicePath: { type: "string" },
      memPalaceRoot: { type: "string" },
      version: { type: "string" },
      trigger: { type: "string", enum: ["manual", "automatic"] },
      source: { type: "string", enum: ["user", "OttoUpdateAgent"] }
    }
  },
  outputSchema: {
    type: "object",
    required: ["version", "generatedAt", "scannedPath", "warnings", "endpoints"],
    properties: {
      version: { type: "string" },
      generatedAt: { type: "string" },
      scannedPath: { type: "string" },
      warnings: { type: "array" },
      endpoints: { type: "array" }
    }
  },
  execute: executeApiRescanCommand
};