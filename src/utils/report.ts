import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PipelineReport } from "../models/index.js";

export async function writeReport(report: PipelineReport, path = "output/results.json"): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rename(temp, path);
}
