import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { generateApiArtifacts } from "../src/api-generator.js";
import { routeApiRequest } from "../src/api-router.js";

test("generateApiArtifacts indexes command-service files and routeApiRequest forwards them", async () => {
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
    assert.ok(generated.endpoints.some((endpoint) => endpoint.kind === "generated" && endpoint.commandId === "hello"));

    const routed = await routeApiRequest(
      {
        method: "POST",
        path: "/api/v1/commands/hello",
        body: {
          commandId: "hello",
          args: ["--name", "World"]
        }
      },
      {
        commandServicePath: commandRoot
      }
    );

    assert.equal(routed.mode, "forward");
    assert.equal(routed.statusCode, 200);
    if (routed.mode === "forward") {
      assert.equal(routed.target.commandId, "hello");
      assert.equal(routed.body.forwardedTo, "hello");
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});