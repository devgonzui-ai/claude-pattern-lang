import { program } from "commander";

// TODO: 各コマンドをインポート
// import { initCommand } from "./cli/commands/init.js";
// import { analyzeCommand } from "./cli/commands/analyze.js";
// import { listCommand } from "./cli/commands/list.js";
// import { showCommand } from "./cli/commands/show.js";
// import { syncCommand } from "./cli/commands/sync.js";
// import { addCommand } from "./cli/commands/add.js";
// import { removeCommand } from "./cli/commands/remove.js";

program
  .name("cpl")
  .description(
    "Claude Codeのセッションログからパターンを自動抽出・カタログ化するCLIツール"
  )
  .version("0.1.0");

// TODO: コマンドを登録
// program.addCommand(initCommand);
// program.addCommand(analyzeCommand);
// program.addCommand(listCommand);
// program.addCommand(showCommand);
// program.addCommand(syncCommand);
// program.addCommand(addCommand);
// program.addCommand(removeCommand);

program.parse();
