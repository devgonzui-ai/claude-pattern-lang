# claude-pattern-lang

[![npm](https://img.shields.io/npm/v/@gonzui/claude-pattern-lang?label=npm&color=blue)](https://www.npmjs.com/package/@gonzui/claude-pattern-lang)
[![License: MIT](https://img.shields.io/npm/l/@gonzui/claude-pattern-lang?label=license&color=blue)](LICENSE)
[![Node: >=18.0.0](https://img.shields.io/node/v/@gonzui/claude-pattern-lang?label=node&color=blue)](https://nodejs.org)

日本語 | [English](README.md)

Claude Codeのセッションログから自動的にパターンを抽出・カタログ化するCLIツール。効果的なアプローチをパターン・ランゲージとして蓄積し、以降のセッションでClaudeが参照することで、タスク完了の高速化とコード品質の一貫性向上を実現します。

## 概要

**claude-pattern-lang** はClaude Codeのセッションログを分析し、再利用可能なパターン—効果的なプロンプト構造、問題解決アプローチ、プロジェクト固有のイディオム—を特定します。抽出されたパターンは自動的にカタログ化され、`CLAUDE.md` に同期されることで、以降のセッションでClaudeが利用できるようになります。

### パターン・ランゲージとは？

- **タスク完了の高速化**: パターンがClaudeを正解に直接導き、会話ターン数を約35%削減
- **コード品質の一貫性**: テンプレートにより統一されたコーディングスタイルを実現、コード量を約44%削減
- **再利用可能な解決策**: 効果的なアプローチを将来のセッションでも活用
- **自動発見**: 手動でのドキュメント作成は不要

> **検証結果**: テストでは、パターンありのプロジェクトでAPI実装タスクが9ターンで完了（パターンなしは14ターン）。生成コードも39行の一貫した実装 vs 69行のアドホックな実装という結果に。詳細は[検証レポート](docs/validation-report-patterns-effect.ja.md)を参照。

## 機能

- **自動パターン抽出**: LLMによるセッションログの分析
- **パターンカタログ管理**: YAML形式での保存・整理
- **CLAUDE.md同期**: Claudeのコンテキストに自動統合
- **Claude Code Skillsエクスポート**: パターンをオンデマンド読み込みのSkillsとして出力し、コンテキストを節約
- **使用状況スコア & 整理**: 実際に使われているパターンを測定し、未使用パターンを整理
- **Claude Codeフック連携**: セッションライフサイクルとシームレスに統合
- **重複検出**: 自動重複排除とマージ
- **プライバシー保護**: 機密情報の自動マスキング
- **増分解析**: 前回解析以降の新しいセッションのみを対象に処理
- **マルチLLM対応**: Claude Code（デフォルト・APIキー不要）、Anthropic、OpenAI、Gemini、Ollama、DeepSeek

## インストール

### グローバルインストール

```bash
npm install -g @gonzui/claude-pattern-lang
```

### ローカルインストール

```bash
npm install
npm run build
```

### 動作環境

- Node.js >= 18.0.0
- macOS, Linux, または Windows (WSL対応)

## 使い方

### 初期化

初回セットアップを行います：

```bash
cpl init
```

設定ディレクトリを作成し、Claude Codeのフックをインストールします。

### セッション解析

セッションログからパターンを抽出します：

```bash
# 最近のセッションをすべて解析
cpl analyze

# 特定のセッションを解析
cpl analyze --session <session-id>

# 指定日以降のセッションを解析
cpl analyze --since 2024-01-01

# 特定プロジェクトのセッションを解析
cpl analyze --project /path/to/project
```

> **Note**: `analyze`コマンドはセッションごとにLLM APIを呼び出してパターンを抽出します。解析するセッション数が多いほどトークン消費量が増加します。使用量は`cpl metrics`で確認できます。

### パターン一覧

パターンカタログを閲覧します：

```bash
# すべてのパターンを表示
cpl list

# タイプでフィルタ
cpl list --type prompt

# キーワード検索
cpl list --search "error handling"

# JSON形式で出力
cpl list --json
```

### パターン詳細表示

特定のパターンを表示します：

```bash
cpl show <pattern-name>
```

### CLAUDE.md への同期

カタログ化されたパターンをプロジェクトのCLAUDE.mdに反映します：

```bash
# 現在のプロジェクトに同期
cpl sync

# 特定プロジェクトに同期
cpl sync --project /path/to/project

# 変更をプレビュー（書き込みなし）
cpl sync --dry-run

# グローバルCLAUDE.mdに同期
cpl sync --global
```

#### sync の仕組み

`sync` コマンドは2つのファイルを生成します：

1. **patterns.md** - 実際のパターン内容を含む
   - プロジェクトローカル: `{project}/.claude/patterns.md`
   - グローバル (`--global`): `~/.claude-patterns/patterns.md`

2. **CLAUDE.md** - patterns.mdへの `@` 参照を含む
   ```markdown
   <!-- CPL:PATTERNS:START -->
   @.claude/patterns.md
   <!-- CPL:PATTERNS:END -->
   ```

このアプローチにより、CLAUDE.mdがスッキリし、パターンを独立して管理できます。Claude Codeの `@` インポート機能がパターン内容を自動的に読み込みます。

### Claude Code Skillsとしてエクスポート

`patterns.md` 経由で全パターンをコンテキストに読み込む代わりに、パターンを [Claude Code Skills](https://docs.claude.com/en/docs/claude-code) としてエクスポートできます。Skillsはオンデマンドで読み込まれます — Claudeは各スキルのdescriptionを見て、関連する場合のみ本文を読み込むため、パターンカタログが大きくなってもコンテキストウィンドウを圧迫しません。

```bash
# 全パターンをSkillsとして現在のプロジェクトにエクスポート
cpl export --skills

# 特定のパターンのみエクスポート（IDは短縮可）
cpl export <pattern-id> --skills

# 特定プロジェクトにエクスポート
cpl export --skills --project /path/to/project

# 個人用スキル（~/.claude/skills）にエクスポート
cpl export --skills --global

# 生成内容をプレビュー（書き込みなし）
cpl export --skills --dry-run

# 確認なしで書き込み
cpl export --skills --force
```

#### export の仕組み

各パターンが `SKILL.md` を含むスキルディレクトリになります：

```
{project}/.claude/skills/
└── <pattern-name>/
    └── SKILL.md    # frontmatter (name, description) + パターン内容
```

スキルの `description` はパターンのcontext・problem・tagsから生成されるため、Claudeが読み込みタイミングを判断できます。

**`sync` と `export` の使い分け:**

| 観点 | `cpl sync` | `cpl export --skills` |
|------|-----------|----------------------|
| **読み込み** | 常にコンテキストに載る（`@patterns.md` 経由） | オンデマンド（Skills） |
| **コンテキストコスト** | カタログサイズに比例して増加 | ほぼ一定（descriptionのみ） |
| **向いている用途** | 小さいカタログ、常に適用したいルール | 大きいカタログ、状況依存のパターン |

### パターン使用状況の測定

Claude Codeのセッションログを走査し、どのパターンが実際に会話で言及されているかを確認できます：

```bash
# 現在のプロジェクトのセッションでスコアを測定
cpl score

# 全プロジェクト / 指定日以降を走査
cpl score --all
cpl score --since 2026-01-01

# JSON出力 / 使用回数をカタログに保存
cpl score --json
cpl score --save
```

走査対象はuser/assistantメッセージ内のパターン名の言及のみです。ツール出力や `<system-reminder>` ブロックは除外されるため、`patterns.md` 自体の読み込みで使用回数が水増しされることはありません。

### 未使用パターンの整理

セッションに一度も登場しないパターンを削除できます：

```bash
# 削除候補をプレビュー
cpl prune --dry-run

# 使用回数3回未満のパターンを削除
cpl prune --min-uses 3

# 確認なしで削除
cpl prune --force
```

整理後は `cpl sync` / `cpl export` を実行して同期済みファイルを更新してください。

### 類似パターンの統合

意味的に類似したパターンをLLMの支援で検出・統合できます：

```bash
# 統合提案をプレビュー
cpl dedupe --dry-run

# インタラクティブに統合（ペアごとに確認）
cpl dedupe

# 重複と判定された全ペアを確認なしで統合
cpl dedupe --force

# 候補検出のチューニング
cpl dedupe --threshold 0.5 --limit 5
```

まず字句類似度で候補ペアを絞り込み、設定されたLLMが意味的な重複かどうかを判定して統合パターンを提案します。

### チームでパターンを共有

パターンをポータブルなYAMLファイルとしてエクスポートし、別のマシンでインポートできます：

```bash
# 全パターン（またはID指定）を共有ファイルにエクスポート
cpl export --output team-patterns.yaml
cpl export a1b2c3d4 --output team-patterns.yaml

# ファイルまたはURLからインポート
cpl import team-patterns.yaml
cpl import https://example.com/team-patterns.yaml

# プレビュー / 同名の既存パターンを上書き更新
cpl import team-patterns.yaml --dry-run
cpl import team-patterns.yaml --overwrite
```

共有ファイルにはパターンの内容のみが含まれます（ローカルのID・タイムスタンプ・使用実績は含まれません）。インポート時、同名の既存パターンは `--overwrite` を指定しない限りスキップされます。

### 自動解析（フック連携）

Claude Codeフックをインストールすると、抽出〜同期のループを自動化できます。`~/.claude-patterns/config.yaml` で有効化してください：

```yaml
analysis:
  auto_analyze: true
sync:
  auto_sync: true  # 任意: 抽出したパターンをCLAUDE.mdへ自動同期
```

`SessionEnd` フックが終了したセッションをキューに追加し、`Stop` フックがキューのセッションをバックグラウンドで解析（1回あたり最大3件）して結果を同期します。

### パターン管理

パターンを手動で追加・削除します：

```bash
# 対話的にパターンを追加
cpl add

# 対話的にパターンを作成（add -i のエイリアス）
cpl create

# YAMLファイルから追加
cpl add --file pattern.yaml

# パターンを削除
cpl remove <pattern-name>
```

### 分析・統計

目的の異なる2つの分析コマンドがあります：

#### `cpl session` - Claude Codeセッション分析

**Claude Codeの会話ログ**からトークン使用量を分析します。セッションでのコンテキスト効率を把握するのに使います。

```bash
# 現在のプロジェクトの最新セッションを分析
cpl session

# 現在のプロジェクトの全セッションを分析
cpl session --all

# 特定プロジェクトのセッションを分析
cpl session --project /path/to/project

# 特定のセッションファイルを分析
cpl session ~/.claude/projects/.../session-id.jsonl
```

**出力内容：**
- メッセージ数（会話ターン数）
- 入力/出力トークン
- キャッシュ作成/読み取りトークン
- キャッシュ効率（%）

#### `cpl metrics` - cplツール使用統計

**cplツール自体**の使用統計を記録します（`cpl analyze`実行時など）。パターン抽出活動をモニタリングするのに使います。

```bash
# メトリクス履歴と統計を表示
cpl metrics

# 統計のみ表示
cpl metrics --stats

# 過去30日間の統計を表示
cpl metrics --days 30

# メトリクスをクリア
cpl metrics --clear
```

**主な違い：**

| 観点 | `cpl session` | `cpl metrics` |
|------|---------------|---------------|
| **対象** | Claude Codeの会話 | cplツールの使用 |
| **データソース** | `~/.claude/projects/**/*.jsonl` | `~/.claude-patterns/metrics.yaml` |
| **用途** | セッション効率の分析 | パターン抽出活動の追跡 |
| **追跡するトークン** | Claude CodeのLLM呼び出し | cplのLLM呼び出し（analyze時） |

## パターンタイプ

### プロンプトパターン (`prompt`)

効果的なプロンプト構造とテクニック：

- 良い結果を引き出す特定の言い回し
- 複雑なリクエストのためのフレームワーク構造
- コンテキスト設定のパターン

### 問題解決パターン (`solution`)

再利用可能な問題解決アプローチ：

- デバッグ・調査手順
- 一般的な問題の解決方法
- アーキテクチャ決定パターン

### コードパターン (`code`)

プロジェクト固有のコーディングイディオム：

- 繰り返し使われるコード構造
- テンプレートの慣習
- フレームワーク固有のパターン

## 設定

設定ファイルは `~/.claude-patterns/config.yaml` にあります：

```yaml
version: 1

llm:
  # LLMプロバイダ: claude-code | anthropic | openai | gemini | ollama | deepseek
  provider: claude-code
  # 使用するモデル
  model: claude-opus-4-20250514
  # APIキーの環境変数名 (claude-code / ollamaは不要)
  api_key_env: ""
  # カスタムエンドポイント (ollama等で使用)
  # base_url: http://localhost:11434

analysis:
  # セッション終了時に自動解析
  auto_analyze: false
  # 解析対象の最小メッセージ数
  min_session_length: 5
  # 除外するパターン (glob)
  exclude_patterns: []

sync:
  # 解析後に自動でCLAUDE.mdに同期
  auto_sync: false
  # 同期対象プロジェクト (glob)
  target_projects: []
```

### 対応LLMプロバイダ

`cpl config --provider` でインタラクティブに切り替えるか、`config.yaml` を直接編集してください：

| プロバイダ | デフォルトモデル | APIキー環境変数 | 備考 |
|-----------|----------------|----------------|------|
| `claude-code` | `claude-code` | （不要） | デフォルト。ローカルのClaude Code CLIを使用 |
| `anthropic` | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` | |
| `openai` | `gpt-4o` | `OPENAI_API_KEY` | OpenAI互換エンドポイントは `base_url` で指定 |
| `gemini` | `gemini-2.0-flash` | `GEMINI_API_KEY` | |
| `ollama` | `llama3.1` | （不要） | ローカルモデル。`base_url` のデフォルトは `http://localhost:11434` |
| `deepseek` | `deepseek-chat` | `DEEPSEEK_API_KEY` | |

設定したプロバイダのAPIキーが未設定の場合、自動的にClaude Codeへフォールバックします（`CPL_DISABLE_FALLBACK=1` で無効化）。

## ディレクトリ構成

インストール後、以下の構造が作成されます：

```
~/.claude-patterns/
├── config.yaml           # グローバル設定
├── patterns.yaml         # パターンカタログ
├── patterns.md           # 同期されたパターン（グローバル、--global sync用）
├── prompts/              # カスタムプロンプトテンプレート
│   └── extract.txt
└── cache/
    ├── sessions.yaml     # 解析済みセッションキャッシュ
    └── queue.yaml        # 解析キュー
```

プロジェクト固有の構成（`cpl sync` 実行後）：

```
{project}/
├── .claude/
│   ├── patterns.yaml     # プロジェクト固有パターン（オプション）
│   └── patterns.md       # 同期されたパターン（CLAUDE.mdから参照）
└── CLAUDE.md             # @.claude/patterns.md への参照を含む
```

## 開発

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/claude-pattern-lang.git
cd claude-pattern-lang

# 依存関係をインストール
npm install

# ビルド
npm run build

# テスト実行
npm test
```

### スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run build` | プロジェクトをビルド |
| `npm run dev` | ウォッチモードでビルド |
| `npm run lint` | リント実行 |
| `npm run lint:fix` | リント問題を自動修正 |
| `npm run format` | Prettierでコード整形 |
| `npm run format:check` | コードフォーマットをチェック |
| `npm test` | ユニットテスト実行 |
| `npm run test:run` | テストを一度だけ実行 |
| `npm run test:e2e` | E2Eテスト実行 |
| `npm run test:all` | すべてのテストを実行 |
| `npm run typecheck` | TypeScript型チェックを実行 |

### 技術スタック

- **ランタイム**: Node.js 18+ with TypeScript
- **CLI**: [commander.js](https://www.npmjs.com/package/commander)
- **LLM SDK**: @anthropic-ai/sdk, openai, ollama
- **YAML**: js-yaml
- **テスト**: Vitest
- **ビルド**: tsup

## ライセンス

MIT © [Your Name]

---

詳細については、完全な仕様書を [spec.md](spec.md) で確認できます。
