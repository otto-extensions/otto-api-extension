import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { scanCommandDefinitions } from "../../api-generator.js";

test("api generator scans nested command files and uses fallback metadata", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "otto-api-edge-"));

  try {
    const commandRoot = path.join(tempRoot, "commands");
    await mkdir(path.join(commandRoot, "nested"), { recursive: true });
    await writeFile(path.join(commandRoot, "nested", "status.ts"), "export const command = { name: \"status\" };\n", "utf8");

    const scanned = await scanCommandDefinitions({ commandServicePath: commandRoot });

    assert.equal(scanned.commands.length, 1);
    assert.equal(scanned.commands[0]?.id, "status");
    assert.match(scanned.commands[0]?.description ?? "", /Forward API request/i);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("api generator keeps supported command file extensions in sorted order", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "otto-api-ext-"));

  try {
    const commandRoot = path.join(tempRoot, "commands");
    await mkdir(commandRoot, { recursive: true });
    await writeFile(path.join(commandRoot, "b.js"), 'export const command = { id: "b" };\n', "utf8");
    await writeFile(path.join(commandRoot, "a.json"), JSON.stringify({ id: "a" }, null, 2), "utf8");

    const scanned = await scanCommandDefinitions({ commandServicePath: commandRoot });

    assert.deepEqual(scanned.commands.map((command) => command.id), ["a", "b"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});