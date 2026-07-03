# ROADMAP

claude-pattern-lang の今後の機能開発ロードマップ(2026-07-04 時点のメモ)。

現状: v1.0.1。「セッションログからパターン抽出 → カタログ化 → patterns.md 経由で CLAUDE.md に同期」のコアフローは完成済み。

---

## 優先度 High

### 1. ✅ パターン → Claude Code Skills 変換 (`cpl export --skills`) — v1.1.0 でリリース済み

**背景**: 現在の sync はパターン全量を `patterns.md` として毎セッションのコンテキストに載せる方式。パターンが増えるほどコンテキストを圧迫する構造的な弱点がある。

**内容**: パターンを Claude Code の Skills 形式(`.claude/skills/` 配下の SKILL.md + frontmatter)に変換して出力する。Skills は必要な時だけ読み込まれるため、「コンテキスト効率化」というツールの価値提案を強化できる。

- パターン type(prompt / solution / code)ごとの変換ルール設計
- 既存 sync との共存(全量ロードとオンデマンドロードの選択)

### 2. パターン効果測定・フィードバックループ (`cpl score` / `cpl prune`)

**背景**: README で「ターン数 35% 削減」を謳っており、これを継続的に測定できる仕組みがあると説得力が増す。

**内容**:

- セッションログをスキャンし、どのパターンが実際に参照・活用されたかを検出
- 使用回数・効果をスコア化して `cpl score` で表示
- 使われていないパターンの整理を `cpl prune` で提案
- `cpl session` の解析基盤を再利用できる

## 優先度 Medium

### 3. セマンティック重複検出の完成(deduplicator 実装)

**背景**: `src/core/analyzer/deduplicator.ts` が TODO のまま未実装。パターンが増えると「ほぼ同じパターン」が蓄積し、カタログの質が低下する。

**内容**:

- LLM を使った類似パターン判定
- マージ提案を対話的に行う `cpl dedupe` コマンドとして独立させる案も
- 併せて `src/core/catalog/search.ts` の検索 TODO も解消する

### 4. auto_analyze の完全対応

**背景**: `src/cli/hooks/stop.ts` が空実装で、config の `auto_analyze` が実質機能していない。

**内容**: Stop フックを実装し、「セッション終了 → 自動抽出 → 自動 sync」の完全自動化を実現する。

## 優先度 Low / 検討中

### 5. チーム共有機能 (`cpl export` / `cpl import`)

パターンをファイルや URL 経由でエクスポート・インポートできるようにし、チームでのパターン共有を可能にする。git 管理との相性が良い。

### 6. マルチ LLM プロバイダーの正式公開

anthropic / openai / gemini / ollama / deepseek のプロバイダーは実装済み(`src/llm/providers/`)だが「future releases」として封印中。テストを整備して正式公開する。

---

## 進め方

方向性が決まった機能から `/kiro:spec-init` でスペックを作成し、Kiro のスペック駆動開発フロー(requirements → design → tasks → impl)で進める。
