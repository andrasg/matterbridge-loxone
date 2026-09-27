# Matterbridge Workspace Instructions (v.1.0.3)

Read and apply the [shared repository instructions](../AGENTS.md) to all work in this repository. They are the single source for style, scope, architecture, and validation rules. Edit AGENTS.md instead of duplicating those rules here.

## Copilot Specifics

- Task-specific guidance lives directly in [.github/instructions](instructions/). Read relevant instructions in full; `applyTo` patterns select them for matching files, and descriptions support on-demand discovery.
- The [verify-agent-context skill](skills/verify-agent-context/SKILL.md) is available as `/verify-agent-context` to check that this guidance is discoverable and readable.
- Keep this setup Copilot-focused. Do not introduce other agents' configuration or shared pointer directories just to mirror the example plugin.

## Upstream Reference

Adapted from the [example plugin instructions](https://github.com/Luligu/matterbridge-example-dynamic-platform/tree/8bf59991628a71e37c441e86a7a91372fe3bc778) on 2026-09-27: agent guidance v.1.0.3, endpoint guide v.1.0.2, testing standards v.1.0.5, and context-check skill v.1.0.0. Keep local paths, supported Node.js versions, and available scripts authoritative when incorporating later upstream changes.
