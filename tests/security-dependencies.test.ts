import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8")) as {
  packages: Record<string, { version?: string }>;
};

function atLeast(actual: string, minimum: string) {
  const a = actual.split(".").map(Number);
  const b = minimum.split(".").map(Number);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return true;
}

for (const [name, minimum] of Object.entries({ next: "15.5.24", sharp: "0.35.4", postcss: "8.5.23", browserslist: "4.28.7", esbuild: "0.25.0" })) {
  test(`all locked copies of ${name} meet the security floor ${minimum}`, () => {
    const entries = Object.entries(lock.packages).filter(([path]) => path.endsWith(`node_modules/${name}`));
    assert.ok(entries.length > 0);
    for (const [path, value] of entries) {
      assert.ok(value.version && atLeast(value.version, minimum), `${path}: ${value.version}`);
    }
  });
}
