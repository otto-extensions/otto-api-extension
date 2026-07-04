import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { executeApiRescanCommand, rescanApi } from "../../api-rescan.js";

test("api rescan surfaces malformed MemPalace history as a parse failure", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "otto-api-bad-history-"));

  try {
    const commandRoot = path.join(tempRoot, "commands");
    const memPalaceRoot = path.join(tempRoot, "mempalace");
    await mkdir(commandRoot, { recursive: true });
    await writeFile(path.join(commandRoot, "hello.json"), JSON.stringify({ id: "hello" }, null, 2), "utf8");
    await mkdir(memPalaceRoot, { recursive: true });
    await writeFile(path.join(memPalaceRoot, "api-generation-history.json"), "not-json", "utf8");

    await assert.rejects(
      async () =>
        rescanApi({
          commandServicePath: commandRoot,
          memPalaceRoot,
          trigger: "manual",
          source: "user"
        }),
      /not valid JSON|Unexpected token/i
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("api rescan command reports a missing command-service path as a warning", async () => {
  const result = await executeApiRescanCommand({
    commandServicePath: path.join(os.tmpdir(), "missing-api-commands"),
    memPalaceRoot: path.join(os.tmpdir(), "missing-api-mempalace")
  });

  assert.equal(result.endpoints.length, 0);
  assert.match(result.warnings[0] ?? "", /path not found/i);
});