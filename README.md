# claude-pattern-lang

[![npm version](https://img.shields.io/npm/v/claude-pattern-lang)](https://www.npmjs.com/package/claude-pattern-lang)
[![License: MIT](https://img.shields.io/npm/l/claude-pattern-lang)](LICENSE)
[![Node: >=18.0.0](https://img.shields.io/node/v/claude-pattern-lang)](https://nodejs.org)

A CLI tool to automatically extract and catalog patterns from Claude Code session logs. It captures effective approaches as a pattern language that Claude can reference, enabling faster task completion and more consistent code quality in future sessions.

## Overview

**claude-pattern-lang** analyzes your Claude Code session logs to identify reusable patterns—effective prompt structures, problem-solving approaches, and project-specific idioms. These patterns are automatically cataloged and synced to your `CLAUDE.md`, making them available to Claude in subsequent sessions.

### Why Pattern Language?

- **Faster Task Completion**: Patterns guide Claude to solutions directly, reducing conversation turns by ~35%
- **Consistent Code Quality**: Templates ensure uniform coding style and reduce code volume by ~44%
- **Reusable Solutions**: Capture effective approaches for future use
- **Automatic Discovery**: No manual documentation required

> **Validation Results**: In testing, projects with patterns completed API implementation tasks in 9 turns vs 14 turns without patterns, producing 39 lines of consistent code vs 69 lines of ad-hoc implementation. See [validation report](docs/validation-report-patterns-effect.md) for details.

## Features

- **Automatic Pattern Extraction**: LLM-powered analysis of session logs
- **Pattern Catalog Management**: Store and organize patterns in YAML format
- **CLAUDE.md Sync**: Automatically integrate patterns into Claude's context
- **Claude Code Hooks**: Seamless integration with session lifecycle
- **Duplicate Detection**: Automatic deduplication and merging
- **Privacy Protection**: Automatic masking of sensitive information
- **Incremental Analysis**: Only analyze new sessions since last run
- **Multi-LLM Support**: Claude Code
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

# Create a pattern interactively (alias for add -i)
cpl create

# Add from YAML file
cpl add --file pattern.yaml

# Remove a pattern
cpl remove <pattern-name>
```

### Analytics

There are two analytics commands with different purposes:

#### `cpl session` - Claude Code Session Analysis

Analyzes token usage from **Claude Code's conversation logs**. Use this to understand how efficiently Claude Code is using context in your sessions.

```bash
# Analyze latest session for current project
cpl session

# Analyze all sessions for current project
cpl session --all

# Analyze sessions for a specific project
cpl session --project /path/to/project

# Analyze a specific session file
cpl session ~/.claude/projects/.../session-id.jsonl
```

**Output includes:**
- Message count (conversation turns)
- Input/Output tokens
- Cache creation/read tokens
- Cache efficiency percentage

#### `cpl metrics` - CPL Tool Usage Metrics

Tracks usage statistics for **the cpl tool itself** (e.g., when running `cpl analyze`). Use this to monitor your pattern extraction activity.

```bash
# Show metrics history and statistics
cpl metrics

# Show statistics only
cpl metrics --stats

# Show statistics for last 30 days
cpl metrics --days 30

# Clear all metrics
cpl metrics --clear
```

**Key differences:**

| Aspect | `cpl session` | `cpl metrics` |
|--------|---------------|---------------|
| **Target** | Claude Code conversations | cpl tool usage |
| **Data source** | `~/.claude/projects/**/*.jsonl` | `~/.claude-patterns/metrics.yaml` |
| **Purpose** | Analyze session efficiency | Track pattern extraction activity |
| **Tokens tracked** | Claude Code's LLM calls | cpl's LLM calls (during analyze) |

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
  # LLM provider: claude-code
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

## Testing

### Running Tests

```bash
# Run unit tests
npm test

# Run tests once (without watch mode)
npm run test:run

# Run E2E tests
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all

# Run tests with coverage
npm run test:run -- --coverage
```

### Test Structure

```
tests/
├── unit/                 # Unit tests
│   ├── *.test.ts        # Individual test files
│   └── commands/        # Command-specific tests
├── e2e/                 # End-to-end tests
│   ├── commands/        # E2E command tests
│   ├── integration/     # Integration flow tests
│   └── errors/          # Error handling tests
├── test_data/           # Test data fixtures
│   ├── sessions/        # Sample session logs (JSONL)
│   └── patterns/        # Expected patterns (YAML)
└── fixtures/            # Additional test fixtures
    └── sessions/        # Legacy fixtures
```

### Test Data

Test sessions and expected patterns are stored in `tests/test_data/`:

```bash
tests/test_data/
├── sessions/              # Session logs for testing
│   ├── test-session-with-patterns.jsonl
│   ├── code-pattern-session.jsonl
│   ├── empty-session.jsonl
│   └── prompt-pattern-session.jsonl
└── patterns/              # Expected extracted patterns
    ├── expected-patterns.yaml
    ├── react-form-pattern.yaml
    ├── debugging-pattern.yaml
    └── empty-patterns.yaml
```

### Writing Tests

1. **Unit Tests**: Test individual functions and classes

```typescript
// Example unit test
import { describe, it, expect } from 'vitest';
import { extractPatterns } from '@/core/analyzer';

describe('Pattern Extractor', () => {
  it('should extract patterns from session', async () => {
    const session = loadTestSession('test-session.jsonl');
    const patterns = await extractPatterns(session);
    expect(patterns).toHaveLength(3);
  });
});
```

2. **E2E Tests**: Test complete command flows

```typescript
// Example E2E test
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('CLI: list command', () => {
  it('should list all patterns', () => {
    const output = execSync('cpl list', { encoding: 'utf-8' });
    expect(output).toContain('Patterns:');
  });
});
```

3. **Using Test Data**

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

function loadTestSession(filename: string) {
  const path = join(__dirname, '../test_data/sessions', filename);
  return readFileSync(path, 'utf-8');
}
```

## Adding Sample Patterns

### Sample Pattern Library

The `sample/` directory contains reusable patterns that serve as both examples and a library for common scenarios:

```
sample/
├── README.md                        # Sample patterns guide
└── patterns/
    ├── coding-patterns.yaml        # Coding best practices
    ├── tool-usage-patterns.yaml    # Claude Code tool usage
    ├── debugging-patterns.yaml     # Debugging approaches
    ├── effective-prompts.yaml      # Effective prompting techniques
    └── architecture-patterns.yaml  # Software architecture patterns
```

### Creating New Sample Patterns

1. **Choose the appropriate file** based on pattern type:
   - `coding-patterns.yaml` - Code conventions and idioms
   - `tool-usage-patterns.yaml` - Claude Code workflow patterns
   - `debugging-patterns.yaml` - Problem-solving approaches
   - `effective-prompts.yaml` - Prompt engineering techniques
   - `architecture-patterns.yaml` - Design patterns

2. **Follow the pattern structure**:

```yaml
patterns:
  - name: pattern-name          # Unique identifier (kebab-case)
    type: prompt | solution | code  # Pattern type
    context: When to use this pattern
    solution: How to solve the problem
    example: |                  # Code example OR
      your code here
    example_prompt: "Your prompt here"  # Prompt example
    tags: [tag1, tag2, tag3]    # For searchability
    notes: Additional context (optional)
```

3. **Pattern types**:
   - **`prompt`**: Effective prompt structures for requesting work from Claude
   - **`solution`**: Repeatable problem-solving approaches and debugging methods
   - **`code`**: Reusable code templates and idioms

4. **Example: Adding a new pattern**

```yaml
# In coding-patterns.yaml
- name: error-boundary-react
  type: code
  context: Reactでエラー境界を実装する場合
  solution: Error Boundaryコンポーネントで子コンポーネントのエラーをキャッチ
  example: |
    class ErrorBoundary extends React.Component {
      state = { hasError: false };

      static getDerivedStateFromError(error) {
        return { hasError: true };
      }

      componentDidCatch(error, errorInfo) {
        console.error('Error caught:', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          return <h1>Something went wrong.</h1>;
        }
        return this.props.children;
      }
    }
  tags: [react, error-handling, typescript]
```

### Pattern Guidelines

- **Name**: Use kebab-case, descriptive and concise
- **Context**: Clearly describe when the pattern applies
- **Solution**: Explain the approach, not just the code
- **Example**: Provide complete, runnable examples
- **Tags**: Include relevant tags for discoverability
- **Language**: Write patterns in your project's language

### Using Sample Patterns

Sample patterns can be:
- Referenced when creating project-specific patterns
- Imported directly into your pattern catalog
- Used as templates for custom patterns
- Shared with your team as coding standards

## License

MIT © [Your Name]

---

For more details, see [spec.md](spec.md) for the complete specification.
