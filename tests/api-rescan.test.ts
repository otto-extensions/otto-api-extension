import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { executeApiRescanCommand, rescanApi } from "../src/api-rescan.js";

test("manual and automatic API rescans write MemPalace metadata", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "otto-api-rescan-"));

  try {
    const commandRoot = path.join(tempRoot, "commands");
    const memPalaceRoot = path.join(tempRoot, "mempalace");
    await mkdir(commandRoot, { recursive: true });
    await writeFile(
      path.join(commandRoot, "status.ts"),
      'export const command = { id: "status", description: "Report status." };\n',
      "utf8"
    );

    const viaCommand = await executeApiRescanCommand({
      commandServicePath: commandRoot,
      memPalaceRoot,
      trigger: "manual",
      source: "user"
    });
    assert.equal(viaCommand.endpoints.filter((endpoint) => endpoint.kind === "generated").length, 1);

    const automatic = await rescanApi({
      commandServicePath: commandRoot,
      memPalaceRoot,
      trigger: "automatic",
      source: "OttoUpdateAgent"
    });
    assert.equal(automatic.endpoints.filter((endpoint) => endpoint.kind === "generated").length, 1);

    const index = JSON.parse(await readFile(path.join(memPalaceRoot, "api-endpoint-index.json"), "utf8")) as {
      endpoints: Array<{ commandId?: string }>;
    };
    assert.equal(index.endpoints.length, 1);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});