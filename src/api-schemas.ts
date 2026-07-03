export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface JsonSchema {
  type: string;
  required?: string[];
  additionalProperties?: boolean;
  properties?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildGeneratedRequestSchema(commandId: string): JsonSchema {
  return {
    type: "object",
    required: ["commandId", "args"],
    additionalProperties: false,
    properties: {
      commandId: {
        type: "string",
        const: commandId
      },
      args: {
        type: "array"
      },
      meta: {
        type: "object"
      }
    }
  };
}

export function buildGeneratedResponseSchema(): JsonSchema {
  return {
    type: "object",
    required: ["status", "forwardedTo"],
    additionalProperties: false,
    properties: {
      status: {
        type: "string"
      },
      forwardedTo: {
        type: "string"
      }
    }
  };
}

export function validateGeneratedRequest(commandId: string, payload: unknown): ValidationResult {
  if (!isRecord(payload)) {
    return { valid: false, errors: ["Payload must be an object."] };
  }

  const errors: string[] = [];
  if (payload.commandId !== commandId) {
    errors.push(`commandId must equal ${commandId}.`);
  }

  if (!Array.isArray(payload.args)) {
    errors.push("args must be an array.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateGeneratedResponse(payload: unknown): ValidationResult {
  if (!isRecord(payload)) {
    return { valid: false, errors: ["Response must be an object."] };
  }

  const errors: string[] = [];
  if (typeof payload.status !== "string") {
    errors.push("status must be a string.");
  }

  if (typeof payload.forwardedTo !== "string") {
    errors.push("forwardedTo must be a string.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}