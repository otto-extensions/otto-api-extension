import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { apiRescanCommandDefinition, executeApiRescanCommand } from "../../api-rescan.js";

test("api rescan command writes MemPalace metadata with manual defaults", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "otto-api-rescan-"));

  try {
    const commandRoot = path.join(tempRoot, "commands");
    const memPalaceRoot = path.join(tempRoot, "mempalace");
    await mkdir(commandRoot, { recursive: true });
    await writeFile(path.join(commandRoot, "status.ts"), 'export const command = { id: "status", description: "Report status." };\n', "utf8");

    const rescanned = await executeApiRescanCommand({
      commandServicePath: commandRoot,
      memPalaceRoot
    });

    assert.equal(rescanned.endpoints.length, 1);
    const index = JSON.parse(await readFile(path.join(memPalaceRoot, "api-endpoint-index.json"), "utf8")) as {
      endpoints: Array<{ commandId?: string }>;
    };
    assert.equal(index.endpoints[0]?.commandId, "status");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("api rescan command definition exposes the expected command metadata", () => {
  assert.equal(apiRescanCommandDefinition.id, "otto.api.rescan");
  assert.equal(apiRescanCommandDefinition.safety.idempotent, true);
});