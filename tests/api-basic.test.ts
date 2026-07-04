import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { generateApiArtifacts } from "../src/api-generator.js";
import { executeApiRescanCommand } from "../src/api-rescan.js";

test("generateApiArtifacts indexes command-service files and command execution persists metadata", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "otto-api-basic-"));

  try {
    const commandRoot = path.join(tempRoot, "commands");
    const memPalaceRoot = path.join(tempRoot, "mempalace");
    await mkdir(commandRoot, { recursive: true });
    await writeFile(
      path.join(commandRoot, "hello.json"),
      JSON.stringify({ id: "hello", description: "Say hello." }, null, 2),
      "utf8"
    );

    const generated = await generateApiArtifacts({
      commandServicePath: commandRoot,
      version: "2.4.6"
    });

    assert.equal(generated.version, "2.4.6");
    assert.equal(generated.warnings.length, 0);
    assert.ok(generated.endpoints.some((endpoint) => endpoint.kind === "generated" && endpoint.commandId === "hello"));

    const rescanned = await executeApiRescanCommand({
      commandServicePath: commandRoot,
      memPalaceRoot,
      source: "user",
      trigger: "manual"
    });

    assert.equal(rescanned.endpoints.filter((endpoint) => endpoint.kind === "generated").length, 1);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});