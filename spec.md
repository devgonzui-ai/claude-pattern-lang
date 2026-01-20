# claude-pattern-lang 要件定義・仕様書

## 1. プロジェクト概要

### 1.1 目的

Claude Codeのセッションログから自動的にパターン（繰り返し使われる問題解決手法、効果的なプロンプト構造、プロジェクト固有のイディオム）を抽出し、カタログ化するツール。抽出されたパターンはCLAUDE.mdに統合され、以降のセッションでClaudeが参照・活用できるようにする。

### 1.2 背景・動機

- パターン・ランゲージは「圧縮された知識」として機能する
- パターン名だけで複雑なコンテキストを伝達でき、LLMのコンテキストウィンドウを効率的に使える
- しかし、パターンを手動で定義・管理するのは面倒
- Claude Codeのセッションログには暗黙的なパターンが蓄積されている
- これを自動抽出・整理することで、低コストでパターンカタログを構築できる

### 1.3 想定ユーザー

- Claude Codeを日常的に使用する開発者
- プロジェクト固有の知識を蓄積・再利用したい人
- ターミナルベースのワークフローを好む人

---

## 2. 機能要件

### 2.1 コア機能

#### F1: 初期化 (`cpl init`)

| 項目 | 内容 |
|------|------|
| 概要 | ツールの初期設定を行う |
| 入力 | なし（対話的に設定） |
| 処理 | 1. `~/.claude-patterns/` ディレクトリ作成<br>2. 初期設定ファイル生成<br>3. Claude Codeフック設定を `~/.claude/settings.json` に追加 |
| 出力 | 設定完了メッセージ、`/hooks` での承認を促すメッセージ |
| 備考 | 既存設定がある場合はマージ、上書き確認 |

#### F2: セッション解析 (`cpl analyze`)

| 項目 | 内容 |
|------|------|
| 概要 | セッションログを解析してパターンを抽出 |
| 入力 | オプション: `--session <id>`, `--since <date>`, `--project <path>` |
| 処理 | 1. `~/.claude/projects/` からJSONLファイル読み込み<br>2. LLMでパターン抽出<br>3. 既存パターンとの重複チェック<br>4. ユーザー確認後、カタログに保存 |
| 出力 | 抽出されたパターン候補の一覧、保存確認 |
| 備考 | 増分解析（前回解析以降のセッションのみ）をサポート |

#### F3: パターン一覧表示 (`cpl list`)

| 項目 | 内容 |
|------|------|
| 概要 | 保存済みパターンの一覧を表示 |
| 入力 | オプション: `--type <prompt\|solution\|code>`, `--search <keyword>` |
| 処理 | カタログから条件に合うパターンを取得 |
| 出力 | パターン名、タイプ、概要の一覧（テーブル形式） |

#### F4: パターン詳細表示 (`cpl show <name>`)

| 項目 | 内容 |
|------|------|
| 概要 | 特定パターンの詳細を表示 |
| 入力 | パターン名 |
| 処理 | カタログから該当パターンを取得 |
| 出力 | パターンの全フィールド（YAML形式） |

#### F5: CLAUDE.md同期 (`cpl sync`)

| 項目 | 内容 |
|------|------|
| 概要 | パターンカタログをCLAUDE.mdに反映 |
| 入力 | オプション: `--project <path>`, `--dry-run` |
| 処理 | 1. 対象プロジェクトのCLAUDE.md読み込み<br>2. パターンセクション生成<br>3. 既存内容とマージ<br>4. ファイル書き込み |
| 出力 | 更新内容のdiff、完了メッセージ |
| 備考 | 既存のCLAUDE.mdは保持、パターンセクションのみ更新 |

#### F6: パターン手動追加 (`cpl add`)

| 項目 | 内容 |
|------|------|
| 概要 | パターンを手動で追加 |
| 入力 | 対話的入力 または `--file <yaml>` |
| 処理 | バリデーション後、カタログに追加 |
| 出力 | 追加完了メッセージ |

#### F7: パターン削除 (`cpl remove <name>`)

| 項目 | 内容 |
|------|------|
| 概要 | パターンを削除 |
| 入力 | パターン名 |
| 処理 | 確認後、カタログから削除 |
| 出力 | 削除完了メッセージ |

### 2.2 フック機能

#### H1: SessionEnd フック

| 項目 | 内容 |
|------|------|
| トリガー | Claude Codeセッション終了時 |
| 処理 | セッションIDを解析キューに追加 |
| 備考 | 非ブロッキング、バックグラウンド実行 |

#### H2: Stop フック（オプション）

| 項目 | 内容 |
|------|------|
| トリガー | Claudeの応答完了時 |
| 処理 | 特定条件（長い会話、複雑なタスク）でメタデータ収集 |
| 備考 | パフォーマンス影響を最小化 |

---

## 3. 非機能要件

### 3.1 パフォーマンス

| 項目 | 要件 |
|------|------|
| フック実行時間 | 100ms以内（ユーザー体験に影響しない） |
| 解析処理時間 | 1セッションあたり30秒以内 |
| カタログ読み込み | 100ms以内 |

### 3.2 互換性

| 項目 | 要件 |
|------|------|
| Node.js | 18.x 以上 |
| OS | macOS, Linux（Windows WSL対応） |
| Claude Code | v1.0.0 以上（フックAPI対応バージョン） |

### 3.3 セキュリティ

- セッションログはローカルでのみ処理
- LLM APIへの送信時、機密情報（APIキー、パスワード等）を自動マスク
- パターンカタログへの機密情報混入を防止

### 3.4 拡張性

- プラグインアーキテクチャで追加の抽出器をサポート
- カスタムプロンプトテンプレートの差し替え可能

---

## 4. データ仕様

### 4.1 パターン定義スキーマ

```yaml
# Pattern Schema (patterns.yaml)
patterns:
  - id: string              # ユニークID (自動生成 UUID)
    name: string            # パターン名 (必須)
    type: enum              # prompt | solution | code (必須)
    context: string         # 使用場面の説明 (必須)
    problem: string         # 解決する問題 (任意)
    solution: string        # 解決策の要約 (必須)
    example: string         # 使用例 (任意)
    example_prompt: string  # プロンプト例 (type=promptの場合)
    related: string[]       # 関連パターン名 (任意)
    tags: string[]          # 検索用タグ (任意)
    source_sessions: string[] # 抽出元セッションID (自動)
    created_at: datetime    # 作成日時 (自動)
    updated_at: datetime    # 更新日時 (自動)
    usage_count: number     # 使用回数 (将来用)
```

### 4.2 設定ファイルスキーマ

```yaml
# Config Schema (~/.claude-patterns/config.yaml)
version: 1
llm:
  provider: anthropic | openai | local  # LLMプロバイダ
  model: string                          # モデル名
  api_key_env: string                    # APIキーの環境変数名
analysis:
  auto_analyze: boolean      # セッション終了時に自動解析
  min_session_length: number # 解析対象の最小メッセージ数
  exclude_patterns: string[] # 除外するパターン (glob)
sync:
  auto_sync: boolean         # 解析後に自動でCLAUDE.mdに反映
  target_projects: string[]  # 同期対象プロジェクト (glob)
```

### 4.3 セッション解析キャッシュ

```yaml
# Cache Schema (~/.claude-patterns/cache/sessions.yaml)
sessions:
  - id: string           # セッションID
    project: string      # プロジェクトパス
    analyzed_at: datetime
    message_count: number
    extracted_patterns: string[]  # 抽出されたパターンID
```

### 4.4 Claude Code セッションログ形式

```jsonl
// ~/.claude/projects/{encoded-path}/{session-id}.jsonl
{"type":"user","message":{"role":"user","content":"..."},"timestamp":"..."}
{"type":"assistant","message":{"role":"assistant","content":"..."},"timestamp":"..."}
{"type":"tool_use","tool_name":"Edit","tool_input":{...},"timestamp":"..."}
{"type":"tool_result","tool_name":"Edit","output":"...","timestamp":"..."}
```

---

## 5. ディレクトリ構成

### 5.1 インストール後のユーザーディレクトリ

```
~/.claude-patterns/
├── config.yaml           # グローバル設定
├── patterns.yaml         # パターンカタログ
├── prompts/              # カスタムプロンプトテンプレート
│   └── extract.txt
└── cache/
    ├── sessions.yaml     # 解析済みセッション情報
    └── queue.yaml        # 解析キュー
```

### 5.2 プロジェクトディレクトリ（オプション）

```
{project}/
├── .claude/
│   └── patterns.yaml     # プロジェクト固有パターン（オプション）
└── CLAUDE.md             # パターンセクションが追加される
```

### 5.3 パッケージソースコード

```
claude-pattern-lang/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # エントリーポイント
│   ├── cli/
│   │   ├── index.ts             # CLIルーター
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── analyze.ts
│   │   │   ├── list.ts
│   │   │   ├── show.ts
│   │   │   ├── sync.ts
│   │   │   ├── add.ts
│   │   │   └── remove.ts
│   │   └── hooks/               # フック用内部コマンド
│   │       ├── session-end.ts
│   │       └── stop.ts
│   ├── core/
│   │   ├── analyzer/
│   │   │   ├── session-parser.ts    # JSONL解析
│   │   │   ├── pattern-extractor.ts # LLMでパターン抽出
│   │   │   └── deduplicator.ts      # 重複検出・統合
│   │   ├── catalog/
│   │   │   ├── store.ts             # CRUD操作
│   │   │   ├── search.ts            # 検索
│   │   │   └── validator.ts         # スキーマバリデーション
│   │   └── sync/
│   │       ├── claude-md.ts         # CLAUDE.md操作
│   │       └── merger.ts            # マージロジック
│   ├── llm/
│   │   ├── client.ts                # LLMクライアント抽象化
│   │   ├── providers/
│   │   │   ├── anthropic.ts
│   │   │   └── openai.ts
│   │   └── prompts/
│   │       └── extract-patterns.ts  # 抽出用プロンプト
│   ├── hooks/
│   │   ├── installer.ts             # フック設定インストーラ
│   │   └── templates/
│   │       └── hooks.json           # フック設定テンプレート
│   ├── utils/
│   │   ├── fs.ts                    # ファイル操作
│   │   ├── logger.ts                # ロギング
│   │   └── sanitizer.ts             # 機密情報マスク
│   └── types/
│       ├── pattern.ts               # パターン型定義
│       ├── config.ts                # 設定型定義
│       └── session.ts               # セッション型定義
├── templates/
│   ├── config.yaml                  # デフォルト設定
│   └── claude-md-section.hbs        # CLAUDE.mdセクションテンプレート
├── prompts/
│   └── extract-patterns.txt         # パターン抽出プロンプト
└── tests/
    ├── unit/
    └── integration/
```

---

## 6. API仕様

### 6.1 CLI コマンド

```bash
# グローバルインストール
npm install -g claude-pattern-lang

# コマンド一覧
cpl init                           # 初期化
cpl analyze [options]              # セッション解析
cpl list [options]                 # パターン一覧
cpl show <name>                    # パターン詳細
cpl sync [options]                 # CLAUDE.md同期
cpl add [options]                  # パターン追加
cpl remove <name>                  # パターン削除

# 内部コマンド（フックから呼び出し）
cpl _hook-session-end              # SessionEndフック処理
cpl _hook-stop                     # Stopフック処理
```

### 6.2 コマンドオプション詳細

```bash
# cpl analyze
cpl analyze
  --session, -s <id>       # 特定セッションのみ解析
  --since, -d <date>       # 指定日以降のセッションを解析
  --project, -p <path>     # 特定プロジェクトのみ
  --dry-run                # 保存せず結果のみ表示
  --auto-approve           # 確認なしで保存

# cpl list
cpl list
  --type, -t <type>        # prompt | solution | code でフィルタ
  --search, -s <keyword>   # キーワード検索
  --json                   # JSON形式で出力

# cpl sync
cpl sync
  --project, -p <path>     # 同期先プロジェクト
  --global                 # ~/.claude/CLAUDE.md に同期
  --dry-run                # 変更内容のみ表示
  --force                  # 確認なしで上書き

# cpl add
cpl add
  --file, -f <yaml>        # YAMLファイルから追加
  --interactive, -i        # 対話モード（デフォルト）
```

---

## 7. パターン抽出プロンプト

```text
あなたはソフトウェア開発のパターン分析専門家です。
以下のClaude Codeセッションログを分析し、再利用可能なパターンを抽出してください。

## 抽出対象

1. **プロンプトパターン** (type: prompt)
   - 効果的だった指示の構造や言い回し
   - 特定の結果を引き出すプロンプトテクニック

2. **問題解決パターン** (type: solution)
   - 繰り返し使われた調査・デバッグ手順
   - 特定の問題に対する解決アプローチ

3. **コードパターン** (type: code)
   - プロジェクト固有のコーディングイディオム
   - 繰り返し生成された構造やテンプレート

## 出力形式

以下のYAML形式で出力してください。パターンが見つからない場合は空の配列を返してください。

```yaml
patterns:
  - name: パターン名（短く識別しやすい名前）
    type: prompt | solution | code
    context: どのような状況で使うか（1-2文）
    problem: 解決する問題（任意、1文）
    solution: 解決策の要約（2-3文）
    example: 具体的な使用例（任意）
    example_prompt: プロンプト例（type=promptの場合）
    tags: [関連タグ]
```

## 注意事項

- 汎用的すぎるパターン（例：「エラーハンドリング」だけ）は避け、具体的な手法を記述
- プロジェクト固有の文脈が重要な場合は context に明記
- 機密情報（APIキー、パスワード、内部URL等）は含めない
- 1セッションから抽出するパターンは最大5個まで

## セッションログ

{session_content}
```

---

## 8. 実装フェーズ

### Phase 1: MVP（1-2週間）

**目標**: 手動でセッション解析してパターン抽出、YAMLに保存

| タスク | 優先度 | 見積もり |
|--------|--------|----------|
| プロジェクト初期化（TypeScript, ESLint, etc.） | 高 | 2h |
| 型定義（Pattern, Config, Session） | 高 | 2h |
| セッションパーサー（JSONL読み込み） | 高 | 4h |
| LLMクライアント（Anthropic API） | 高 | 4h |
| パターン抽出ロジック | 高 | 4h |
| カタログストア（YAML CRUD） | 高 | 4h |
| CLI基盤（commander.js） | 高 | 2h |
| `cpl analyze` コマンド | 高 | 4h |
| `cpl list` / `cpl show` コマンド | 中 | 2h |
| 基本テスト | 中 | 4h |

**成果物**: `cpl analyze` で手動解析、`cpl list` で一覧表示ができる

### Phase 2: フック統合（1週間）

**目標**: Claude Codeフックで自動的にキュー追加、増分解析

| タスク | 優先度 | 見積もり |
|--------|--------|----------|
| `cpl init` コマンド | 高 | 4h |
| フック設定インストーラ | 高 | 4h |
| SessionEndフック処理 | 高 | 4h |
| 解析キュー管理 | 中 | 4h |
| 増分解析（キャッシュ） | 中 | 4h |
| `cpl add` / `cpl remove` コマンド | 中 | 2h |

**成果物**: `cpl init` でフック自動設定、セッション終了時にキュー追加

### Phase 3: CLAUDE.md統合（1週間）

**目標**: パターンカタログをCLAUDE.mdに同期、Claudeが使用可能に

| タスク | 優先度 | 見積もり |
|--------|--------|----------|
| CLAUDE.mdパーサー | 高 | 4h |
| パターンセクション生成 | 高 | 4h |
| マージロジック（既存内容保持） | 高 | 4h |
| `cpl sync` コマンド | 高 | 4h |
| 自動同期オプション | 中 | 2h |
| ドキュメント | 中 | 4h |

**成果物**: `cpl sync` でCLAUDE.mdに反映、Claudeがパターンを認識

### Phase 4: 改善・拡張（継続）

| タスク | 優先度 |
|--------|--------|
| パターン重複検出・統合の高度化 | 中 |
| 使用頻度トラッキング | 低 |
| プロジェクト固有パターン（ローカルカタログ） | 中 |
| 複数LLMプロバイダ対応 | 低 |
| Web UI（オプション） | 低 |

---

## 9. 技術スタック

| カテゴリ | 技術 | 理由 |
|----------|------|------|
| 言語 | TypeScript | 型安全、npmエコシステム |
| ランタイム | Node.js 18+ | LTS、ES Modules対応 |
| CLI | commander.js | 軽量、実績あり |
| YAML | js-yaml | 標準的、高速 |
| LLM | @anthropic-ai/sdk | 公式SDK |
| テスト | Vitest | 高速、ESM対応 |
| ビルド | tsup | シンプル、高速 |
| リント | ESLint + Prettier | 標準的 |

---

## 10. 考慮事項・リスク

### 10.1 技術的リスク

| リスク | 対策 |
|--------|------|
| Claude Codeフック仕様変更 | APIバージョン追従、抽象化レイヤー |
| セッションログ形式変更 | パーサーの柔軟な設計、バージョン対応 |
| LLM抽出精度のばらつき | プロンプト改善、ユーザー確認ステップ |
| 大規模セッションのコスト | トークン制限、要約・サンプリング |

### 10.2 ユーザビリティ

| 課題 | 対策 |
|------|------|
| パターンのノイズ（低品質パターン） | 使用頻度によるランキング、手動キュレーション |
| CLAUDE.mdの肥大化 | パターン数上限、重要度によるフィルタ |
| 初期設定の手間 | `cpl init` でワンコマンド設定 |

### 10.3 将来の拡張性

- MCP (Model Context Protocol) サーバーとしての公開
- VSCode拡張との統合
- チーム間でのパターン共有（Git連携）

---

## 11. 成功指標

| 指標 | 目標 |
|------|------|
| インストールから初回パターン抽出まで | 5分以内 |
| 1セッションあたりの有用パターン抽出数 | 平均1-2個 |
| フック起因のセッション遅延 | 体感できない（<100ms） |
| CLAUDE.md同期後のClaude認識率 | パターン名で指示が通る |

---

## 付録

### A. 用語集

| 用語 | 定義 |
|------|------|
| パターン | 繰り返し適用可能な問題解決の構造化された記述 |
| カタログ | パターンの集合を管理するデータストア |
| セッション | Claude Codeでの1回の対話セッション |
| フック | Claude Codeのライフサイクルイベントで実行されるスクリプト |

### B. 参考資料

- [Claude Code Hooks Reference](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Pattern Language (Wikipedia)](https://en.wikipedia.org/wiki/Pattern_language)
- [A Pattern Language for Prompt Engineering](https://arxiv.org/abs/2302.11382)
- [simonw/claude-code-transcripts](https://github.com/simonw/claude-code-transcripts)
