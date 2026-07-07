import { program, Command } from "commander";
import { readFileSync } from "node:fs";
import {
  initCommand,
  analyzeCommand,
  listCommand,
  showCommand,
  syncCommand,
  exportCommand,
  importCommand,
  scoreCommand,
  pruneCommand,
  dedupeCommand,
  addCommand,
  removeCommand,
  configCommand,
  metricsCommand,
  createCommand,
  sessionCommand,
} from "./cli/index.js";
import { handleSessionEnd } from "./cli/hooks/session-end.js";
import { handleStop } from "./cli/hooks/stop.js";
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
  program.addCommand(importCommand);
  program.addCommand(scoreCommand);
  program.addCommand(pruneCommand);
  program.addCommand(dedupeCommand);
  program.addCommand(addCommand);
  program.addCommand(removeCommand);
  program.addCommand(configCommand);
  program.addCommand(metricsCommand);
  program.addCommand(createCommand);
  program.addCommand(sessionCommand);

  // Claude Codeフックから呼ばれる内部コマンド（ヘルプには表示しない）
  program.addCommand(
    new Command("_hook-session-end")
      .description("(internal) SessionEnd hook handler")
      .action(handleSessionEnd),
    { hidden: true }
  );
  program.addCommand(
    new Command("_hook-stop")
      .description("(internal) Stop hook handler")
      .action(handleStop),
    { hidden: true }
  );

  program.parse();
}

main().catch(console.error);
