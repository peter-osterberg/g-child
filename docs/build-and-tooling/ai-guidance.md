# AI Guidance And Skills

This repository uses [G-Boost](https://github.com/TheGeneration/g-boost) for AI-facing project guidance and skills.

Edit the `.ai/` source files, then regenerate the tool-facing files. Do not edit generated guide files or generated skill folders directly.

## What To Edit

- `.ai/guidelines/custom/`: project-specific always-on guidance
- `.ai/skills/<skill-name>/SKILL.md`: project-specific workflows, checklists, examples, or procedures

Shared G-Boost input lives in `.ai/vendor/g-boost/`. Change shared guidelines or vendor skills in the G-Boost source package, not here.

## Generated Output

These are generated from `.ai/`:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.agents/skills/`
- `.codex/skills/`
- `.claude/skills/`
- `.cursor/skills/`
- `.gemini/skills/`
- `.github/skills/`

Regenerate after changing `.ai/guidelines/custom` or `.ai/skills`:

```bash
node .ai/bin/generate-ai-guides.js
```
