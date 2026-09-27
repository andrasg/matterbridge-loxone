---
name: verify-agent-context
description: 'Verify that GitHub Copilot loaded this repository guidance and can discover and read its instructions and skills. Use when asked to check, test, or debug Copilot agent configuration. v.1.0.0'
---

# Copilot Context Check

Run this read-only check and return a concise Markdown table with columns `Item`, `Status`, and `Notes`. Do not modify files.

1. Identify yourself as GitHub Copilot.
2. State whether AGENTS.md was already in context before this check. Then read [AGENTS.md](../../../AGENTS.md) and quote its title, including the version. Distinguish prior automatic loading from reading it during this check.
3. Read [.github/copilot-instructions.md](../../copilot-instructions.md) and verify that its shared-instruction link resolves to AGENTS.md.
4. List the instruction files under [.github/instructions](../../instructions/). For each, report its version, `applyTo` scope if present, and whether its body was already loaded or only available on demand.
5. List skills discovered under [.github/skills](../). Distinguish files found on disk from skills actually advertised by the client; do not infer automatic discovery from file existence alone.
6. Read the [testing instructions](../../instructions/testing/testing.instructions.md) and report their version and the repository's current test infrastructure status to demonstrate readability.
7. Report broken links, missing metadata, or contradictory guidance. Give counts of repository instructions and skills you can confirm are loaded. If exact context size or automatic discovery cannot be observed, mark it unknown rather than estimating.
