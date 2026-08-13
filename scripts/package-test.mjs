import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["--test", "test/package-artifact.test.mjs"], {
  stdio: "inherit",
  env: { ...process.env, NERV_PACKAGE_TEST: "1" },
});
process.exit(result.status ?? 1);
