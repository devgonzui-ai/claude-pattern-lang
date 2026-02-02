# Sample Pattern Library

A collection of reusable patterns for Claude Code.

## Directory Structure

```
sample/en/
├── README.md                    # This file
├── coding-patterns.yaml        # Coding best practices
├── tool-usage-patterns.yaml    # Claude Code tool usage
├── debugging-patterns.yaml     # Debugging & troubleshooting
├── effective-prompts.yaml      # Effective prompting techniques
└── architecture-patterns.yaml  # Software architecture patterns
```

## Categories

| File | Description | Pattern Count |
|------|-------------|---------------|
| `coding-patterns.yaml` | Coding best practices (types, error handling, immutability) | 10 |
| `tool-usage-patterns.yaml` | Claude Code tool usage (Read→Edit, search→fix workflows) | 10 |
| `debugging-patterns.yaml` | Debugging approaches (systematic error resolution) | 8 |
| `effective-prompts.yaml` | Effective prompting (context, constraints, examples) | 10 |
| `architecture-patterns.yaml` | Software architecture (Repository, Service, Factory, Middleware) | 8 |

## How to Use

1. **Reference** - Open pattern files and apply to similar situations
2. **Save** - Save as project-specific patterns for reuse
3. **Share** - Share with team as coding standards

## Pattern Structure

Each pattern contains the following fields:

| Field | Description |
|-------|-------------|
| `id` | **Unique identifier** (required for ID-based sync) |
| `name` | Pattern name (human-readable display name) |
| `type` | Pattern type (`prompt` / `solution` / `code`) |
| `context` | When to use this pattern |
| `solution` | How to solve the problem |
| `example` / `example_prompt` | Concrete examples |
| `tags` | Tags for searchability |
| `notes` | Additional notes (optional) |

## ID Naming Convention

- Format: `{lang}-{category}-{number}`
- `lang`: Language code (`ja` / `en`)
- `category`: Category (`coding` / `tool` / `debug` / `prompt` / `arch`)
- `number`: 3-digit sequential number (`001`, `002`, ...)

Examples: `en-coding-001`, `ja-tool-003`

## Pattern Types

### Prompt Patterns (`prompt`)
Effective prompt structures for requesting work from Claude:
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

## Adding New Patterns

1. Choose the appropriate file for your pattern category
2. Follow the existing pattern structure
3. Assign a unique ID
4. Review with your team

```yaml
patterns:
  - id: en-coding-011          # Unique identifier (required)
    name: Pattern Name         # Human-readable display name
    type: prompt | solution | code
    context: When to use this pattern
    solution: How to solve the problem
    example: |
      Your code example
    example_prompt: "Your prompt example"
    tags: [tag1, tag2, tag3]
    notes: Additional context (optional)
```

## Pattern Example

### Read Before Modify（coding-patterns.yaml）

Always use the Read tool to verify file contents before making changes.

```yaml
- id: en-coding-001
  name: Read Before Modify
  type: prompt
  context: When modifying, deleting, or refactoring existing code
  solution: Always use the Read tool to verify file contents before making changes
  example_prompt: "Read the file first, then make the changes"
  tags: [coding, file-operation, safe-edit]
```

---

These sample patterns serve as reference when creating project-specific patterns.
