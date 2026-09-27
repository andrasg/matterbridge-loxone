---
name: 'Testing Standards v.1.0.0'
description: 'Use when writing TypeScript unit tests, choosing test commands, or reporting validation gaps in the Loxone plugin.'
applyTo: '**/*.test.ts,**/*.spec.ts'
---

# Testing Standards

Adapted from the example plugin's testing standards v.1.0.5 for this repository.

## Available Infrastructure

- Read [package.json](../../../package.json) before choosing a framework or command. This repository currently has no test framework, test scripts, or test suite.
- The `Test` task in [tasks.json](../../../.vscode/tasks.json) references a missing `test:coverage` script; it does not establish that tests are available.
- Do not install a framework or copy the example plugin's test infrastructure without agreement. Report missing test coverage and use available build, typecheck, lint, and format scripts as appropriate; these do not replace behavioral tests.

## Test Design

- Once test infrastructure is agreed, use TypeScript and ESM and follow its file placement and mocking conventions. Prefer `*.test.ts`, `describe` groups, and `test` cases when supported by the chosen framework.
- Use descriptive names such as `should [expected behavior] when [condition]`.
- Use small, deterministic data, straightforward setup, and assertions directly tied to the behavior. Cover happy paths and relevant edge cases; prioritize meaningful coverage over a percentage target.
- Keep each test unit isolated. State may persist between steps within an intentional multi-step flow, so execute that unit in full.
- If Jest is selected, use `jest.unstable_mockModule` for ESM dependency mocking rather than `jest.mock`.
- Avoid optimization or complex setups in tests unless the behavior requires them.

## Running Checks

- Follow the script-only validation rule in [AGENTS.md](../../../AGENTS.md). Never invoke test runners, `tsc`, `oxlint`, or `oxfmt` directly through `npx` or `node node_modules/...`.
- Once a test script exists, run the relevant full test file or matching suite/task. Use an area-specific task when it supplies required grouping, coverage targets, or ignore patterns.
- Only forward file arguments when the configured script supports them. Do not assume example commands such as `npm run test -- yourTest.test.ts` work here.
- Avoid running unrelated tests. Report exactly which checks ran, their outcomes, and any unverified behavior.
