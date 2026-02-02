import { program } from "commander";
import {
  initCommand,
  analyzeCommand,
  listCommand,
  showCommand,
  syncCommand,
  addCommand,
  removeCommand,
  configCommand,
  metricsCommand,
  createCommand,
  sessionCommand,
} from "./cli/index.js";
import { initI18n, t } from "./i18n/index.js";

async function main(): Promise<void> {
  // i18nを初期化
  await initI18n();

  program
    .name("cpl")
    .description(t("cli.description"))
    .version("0.1.0");

  program.addCommand(initCommand);
  program.addCommand(analyzeCommand);
  program.addCommand(listCommand);
  program.addCommand(showCommand);
  program.addCommand(syncCommand);
  program.addCommand(addCommand);
  program.addCommand(removeCommand);
  program.addCommand(configCommand);
  program.addCommand(metricsCommand);
  program.addCommand(createCommand);
  program.addCommand(sessionCommand);

  program.parse();
}

main().catch(console.error);
