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

export async function rescanApi(options: ApiRescanOptions): Promise<ApiGenerationResult> {
  const result = await generateApiArtifacts(options);
  await persistApiMetadata(result, {
    memPalaceRoot: options.memPalaceRoot,
    trigger: options.trigger,
    source: options.source
  });
  return result;
}

export async function runApiRescanCommand(argv: string[], options: Omit<ApiRescanOptions, "trigger" | "source">) {
  const normalized = argv[0] === "otto" ? argv.slice(1) : argv;
  if (normalized[0] !== "api" || normalized[1] !== "rescan") {
    throw new Error("Expected the manual command 'otto api rescan'.");
  }

  return rescanApi({
    ...options,
    trigger: "manual",
    source: "user"
  });
}