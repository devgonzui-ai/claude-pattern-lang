import { program } from "commander";
import {
  initCommand,
  analyzeCommand,
  listCommand,
  showCommand,
  syncCommand,
  addCommand,
  removeCommand,
} from "./cli/index.js";

program
  .name("cpl")
  .description(
    "Claude Codeのセッションログからパターンを自動抽出・カタログ化するCLIツール"
  )
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(analyzeCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(syncCommand);
program.addCommand(addCommand);
program.addCommand(removeCommand);

program.parse();
