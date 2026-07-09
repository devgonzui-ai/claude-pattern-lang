import { program } from "commander";
import { readFileSync } from "node:fs";
import {
  initCommand,
  analyzeCommand,
  listCommand,
  showCommand,
  syncCommand,
  exportCommand,
  scoreCommand,
  pruneCommand,
  addCommand,
  removeCommand,
  configCommand,
  metricsCommand,
  createCommand,
  sessionCommand,
} from "./cli/index.js";
import { initI18n, t } from "./i18n/index.js";

/**
 * package.jsonからバージョンを取得する
 * （dist/index.js・src/index.tsどちらから見てもpackage.jsonは1つ上の階層）
 */
function getVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf-8")
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<void> {
  // i18nを初期化
  await initI18n();

  program
    .name("cpl")
    .description(t("cli.description"))
    .version(getVersion());

  program.addCommand(initCommand);
  program.addCommand(analyzeCommand);
  program.addCommand(listCommand);
  program.addCommand(showCommand);
  program.addCommand(syncCommand);
  program.addCommand(exportCommand);
  program.addCommand(scoreCommand);
  program.addCommand(pruneCommand);
  program.addCommand(addCommand);
  program.addCommand(removeCommand);
  program.addCommand(configCommand);
  program.addCommand(metricsCommand);
  program.addCommand(createCommand);
  program.addCommand(sessionCommand);

  program.parse();
}

main().catch(console.error);
