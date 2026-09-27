# Matterbridge Agents Instructions (v.1.0.3)

## Style And Formatting

- Follow [STYLEGUIDE.md](./STYLEGUIDE.md) for code style, naming, JSDoc, validation, logging, and formatting expectations.
- JSDoc requirements are enforced by the linter. Treat missing or incomplete JSDoc on required APIs as a real lint issue, not optional documentation.
- Import and export ordering are enforced by the linter or by the formatter. Preserve the existing grouped and sorted order unless a change requires updating it.
- Formatting is enforced by oxfmt. Follow the existing formatting and do not fight the formatter.

## Scope And Safety

- Keep changes minimal and scoped to the request. Avoid unrelated refactors or broad cleanup.
- Do not modify production code only to make a test pass. If a failing test points to a likely source issue, explain the issue and change behavior only when required by the task.
- Preserve cross-platform behavior. Changes must work on Windows, macOS, and Linux, especially for paths, shell commands, environment variables, and networking behavior.
- Maintain compatibility with the supported Node.js versions declared in [package.json](./package.json): 24 and 26.

## Project Architecture

- This repository is a TypeScript ESM repo. Follow existing project patterns for imports, exports, build configuration, and test setup.

## Testing And Validation

- HARD RULE: never invoke `tsc`, test runners, `oxlint`, or `oxfmt` directly via `npx`, `node node_modules/...`, or another ad hoc command. Use the matching scripts in [package.json](./package.json) or valid tasks in [tasks.json](./.vscode/tasks.json): `npm run build`, `npm run typecheck`, `npm run lint`, `npm run lint:fix`, `npm run format`, or `npm run format:check`.
- Verify that a task's underlying script exists before running it. If there is no matching script or task, report the gap and ask before improvising a raw tool invocation.
- This repository currently has no test framework, test scripts, or test suite. The `Test` task references an unavailable `test:coverage` script. Do not claim tests passed or install a framework without agreement; report the validation gap and use the available checks appropriate to the change.
- Keep tests deterministic and simple. Prefer small data sets and straightforward setup.
- Some tests are intentionally multi-step flows. State may persist across successive steps within a single test flow, but each test unit must remain isolated from other tests.
- For validation, run the relevant full test file or the matching suite/task for the touched area rather than assuming arbitrary isolated single-test execution is reliable.

## Documentation

- When behavior changes, update the relevant tests and documentation in the README.md files.

## Additional Agent Guidance

Read the relevant task-specific instructions in full before working on that area:

- [Matterbridge endpoint guide](./.github/instructions/matterbridge/matterbridge.instructions.md) for endpoint construction, registration, and single-class devices.
- [Testing standards](./.github/instructions/testing/testing.instructions.md) for test authoring and validation expectations.

The [verify-agent-context skill](./.github/skills/verify-agent-context/SKILL.md), invocable as `/verify-agent-context` in Copilot, checks instruction discovery and readability.
