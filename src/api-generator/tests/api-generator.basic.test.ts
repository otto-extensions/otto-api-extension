import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { generateApiArtifacts, resolveCommandServicePath } from "../../api-generator.js";

test("api generator indexes command-service files and preserves versioning", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "otto-api-basic-"));

  try {
    const commandRoot = path.join(tempRoot, "commands");
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
    assert.equal(generated.endpoints.length, 1);
    assert.equal(generated.endpoints[0]?.commandId, "hello");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("api generator resolves explicit and default command service paths", () => {
  const explicitPath = resolveCommandServicePath("/repo/root", "/custom/commands");

  assert.equal(explicitPath, "/custom/commands");
  assert.match(resolveCommandServicePath("/repo/root"), /otto-command-service\/src\/commands$/);
});