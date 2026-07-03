import { generateApiArtifacts, type ApiEndpointDefinition, type ApiGenerationOptions } from "./api-generator.js";
import { buildGeneratedRequestSchema, buildGeneratedResponseSchema, validateGeneratedRequest } from "./api-schemas.js";
import { rescanApi } from "./api-rescan.js";

export interface ApiRequest {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}

export type ApiRouteResult =
  | { statusCode: 200; mode: "version" | "lifecycle" | "update"; body: Record<string, unknown> }
  | { statusCode: 200; mode: "rescan"; body: Record<string, unknown> }
  | {
      statusCode: 200;
      mode: "forward";
      body: Record<string, unknown>;
      target: ApiEndpointDefinition;
    }
  | { statusCode: 400 | 404; mode: "error"; body: Record<string, unknown> };

export interface ApiRouteOptions extends ApiGenerationOptions {
  memPalaceRoot?: string;
}

function notFound(path: string): ApiRouteResult {
  return {
    statusCode: 404,
    mode: "error",
    body: {
      error: "NotFound",
      message: `No API route matches ${path}.`
    }
  };
}

function badRequest(errors: string[]): ApiRouteResult {
  return {
    statusCode: 400,
    mode: "error",
    body: {
      error: "ValidationError",
      errors
    }
  };
}

export async function routeApiRequest(request: ApiRequest, options: ApiRouteOptions = {}): Promise<ApiRouteResult> {
  if (request.method === "GET" && request.path === "/api/v1/system/version") {
    const generated = await generateApiArtifacts(options);
    return {
      statusCode: 200,
      mode: "version",
      body: {
        version: generated.version,
        scannedPath: generated.scannedPath,
        warnings: generated.warnings
      }
    };
  }

  if (request.method === "GET" && request.path === "/api/v1/system/lifecycle") {
    return {
      statusCode: 200,
      mode: "lifecycle",
      body: {
        status: "ready",
        mode: "tracer-bullet",
        managedBy: "otto-api-extension"
      }
    };
  }

  if (request.method === "POST" && request.path === "/api/v1/system/update") {
    return {
      statusCode: 200,
      mode: "update",
      body: {
        status: "accepted",
        next: "Forward update execution to OttoUpdateAgent."
      }
    };
  }

  if (request.method === "POST" && request.path === "/api/v1/system/rescan") {
    const generated = await rescanApi({
      ...options,
      memPalaceRoot: options.memPalaceRoot,
      trigger: "manual",
      source: "user"
    });
    return {
      statusCode: 200,
      mode: "rescan",
      body: {
        generatedAt: generated.generatedAt,
        endpointCount: generated.endpoints.filter((endpoint) => endpoint.kind === "generated").length,
        warnings: generated.warnings
      }
    };
  }

  const generated = await generateApiArtifacts(options);
  const target = generated.endpoints.find(
    (endpoint) => endpoint.kind === "generated" && endpoint.method === request.method && endpoint.route === request.path
  );

  if (!target?.commandId) {
    return notFound(request.path);
  }

  const requestValidation = validateGeneratedRequest(target.commandId, request.body);
  if (!requestValidation.valid) {
    return badRequest(requestValidation.errors);
  }

  return {
    statusCode: 200,
    mode: "forward",
    target,
    body: {
      status: "accepted",
      forwardedTo: target.commandId,
      requestSchema: buildGeneratedRequestSchema(target.commandId),
      responseSchema: buildGeneratedResponseSchema()
    }
  };
}