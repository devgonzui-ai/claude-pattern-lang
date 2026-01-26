# claude-pattern-lang

[![npm version](https://img.shields.io/npm/v/claude-pattern-lang)](https://www.npmjs.com/package/claude-pattern-lang)
[![License: MIT](https://img.shields.io/npm/l/claude-pattern-lang)](LICENSE)
[![Node: >=18.0.0](https://img.shields.io/node/v/claude-pattern-lang)](https://nodejs.org)

A CLI tool to automatically extract and catalog patterns from Claude Code session logs. It compresses knowledge into a pattern language that Claude can reference and reuse in future sessions.

## Overview

**claude-pattern-lang** analyzes your Claude Code session logs to identify reusable patterns—effective prompt structures, problem-solving approaches, and project-specific idioms. These patterns are automatically cataloged and synced to your `CLAUDE.md`, making them available to Claude in subsequent sessions.

### Why Pattern Language?

- **Compressed Knowledge**: Pattern names convey complex context efficiently
- **Reusable Solutions**: Capture effective approaches for future use
- **Context Efficiency**: Maximize LLM context window usage
- **Automatic Discovery**: No manual documentation required

## Features

- **Automatic Pattern Extraction**: LLM-powered analysis of session logs
- **Pattern Catalog Management**: Store and organize patterns in YAML format
- **CLAUDE.md Sync**: Automatically integrate patterns into Claude's context
- **Claude Code Hooks**: Seamless integration with session lifecycle
- **Duplicate Detection**: Automatic deduplication and merging
- **Privacy Protection**: Automatic masking of sensitive information
- **Incremental Analysis**: Only analyze new sessions since last run
- **Multi-LLM Support**: Claude Code, GLM (Zhipu)
  - *Other providers (Anthropic, OpenAI, Gemini, Ollama, DeepSeek) are available for future releases*

## Installation

### Global Install

```bash
npm install -g claude-pattern-lang
```

### Local Install

```bash
npm install
npm run build
```

### Requirements

- Node.js >= 18.0.0
- macOS, Linux, or Windows (WSL supported)

## Usage

### Initialize

Set up the tool for the first time:

```bash
cpl init
```

This creates the configuration directory and installs Claude Code hooks.

### Analyze Sessions

Extract patterns from your session logs:

```bash
# Analyze all recent sessions
cpl analyze

# Analyze a specific session
cpl analyze --session <session-id>

# Analyze sessions since a date
cpl analyze --since 2024-01-01

# Analyze sessions for a specific project
cpl analyze --project /path/to/project
```

### List Patterns

Browse your pattern catalog:

```bash
# List all patterns
cpl list

# Filter by type
cpl list --type prompt

# Search by keyword
cpl list --search "error handling"

# Output as JSON
cpl list --json
```

### Show Pattern Details

View a specific pattern:

```bash
cpl show <pattern-name>
```

### Sync to CLAUDE.md

Update your project's CLAUDE.md with cataloged patterns:

```bash
# Sync to current project
cpl sync

# Sync to specific project
cpl sync --project /path/to/project

# Preview changes without writing
cpl sync --dry-run

# Sync to global CLAUDE.md
cpl sync --global
```

### Manage Patterns

Manually add or remove patterns:

```bash
# Add a pattern interactively
cpl add

# Add from YAML file
cpl add --file pattern.yaml

# Remove a pattern
cpl remove <pattern-name>
```

## Pattern Types

### Prompt Patterns (`prompt`)

Effective prompt structures and techniques that produce good results:

- Specific phrasing that elicits better responses
- Framework structures for complex requests
- Context-setting patterns

### Solution Patterns (`solution`)

Repeatable problem-solving approaches:

- Debugging and investigation procedures
- Common problem resolutions
- Architectural decision patterns

### Code Patterns (`code`)

Project-specific coding idioms:

- Recurring code structures
- Template conventions
- Framework-specific patterns

## Configuration

The configuration file is located at `~/.claude-patterns/config.yaml`:

```yaml
version: 1

llm:
  # LLM provider: claude-code | zhipu
  # (Other providers available for future releases)
  provider: claude-code
  # Model to use
  model: claude-opus-4-20250514
  # API key environment variable (not needed for claude-code)
  api_key_env: ""

analysis:
  # Auto-analyze on session end
  auto_analyze: false
  # Minimum message count for analysis
  min_session_length: 5
  # Patterns to exclude (glob)
  exclude_patterns: []

sync:
  # Auto-sync to CLAUDE.md after analysis
  auto_sync: false
  # Target projects for sync (glob)
  target_projects: []
```

## Directory Structure

After installation, the following structure is created:

```
~/.claude-patterns/
├── config.yaml           # Global configuration
├── patterns.yaml         # Pattern catalog
├── prompts/              # Custom prompt templates
│   └── extract.txt
└── cache/
    ├── sessions.yaml     # Analyzed session cache
    └── queue.yaml        # Analysis queue
```

Project-specific structure (optional):

```
{project}/
├── .claude/
│   └── patterns.yaml     # Project-specific patterns
└── CLAUDE.md             # Patterns section added here
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-pattern-lang.git
cd claude-pattern-lang

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the project |
| `npm run dev` | Build in watch mode |
| `npm run lint` | Lint source code |
| `npm run lint:fix` | Fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm test` | Run unit tests |
| `npm run test:run` | Run tests once |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:all` | Run all tests |
| `npm run typecheck` | Run TypeScript type checking |

### Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **CLI**: [commander.js](https://www.npmjs.com/package/commander)
- **LLM SDKs**: @anthropic-ai/sdk, openai, ollama
- **YAML**: js-yaml
- **Testing**: Vitest
- **Build**: tsup

## License

MIT © [Your Name]

---

For more details, see [spec.md](spec.md) for the complete specification.
