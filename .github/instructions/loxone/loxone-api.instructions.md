---
name: 'Loxone API Integration'
description: 'Use when consulting Loxone platform API documentation or implementing, debugging, or reviewing Loxone API integration, controls, states, commands, structure file parsing, or loxone-ts-api testbenches. Covers typed structure enumeration, local test credentials, and mandatory latest-documentation checks.'
---

# Loxone API Documentation

- The Loxone platform API is documented at https://www.loxone.com/enen/kb/api/.
- Before reading Loxone API documentation, ALWAYS check the live API page and follow its current documentation links to ensure you are reading the latest published version. Do not assume a saved URL or cached copy is current.
- For the structure file documentation, follow the link named "Structure file" on that page. The reference PDF URL supplied on 2026-09-27 is https://www.loxone.com/dede/wp-content/uploads/sites/2/2021/10/1701_Structure-File.pdf; use it only after verifying that the live page still points to it.
- If the live page cannot be checked, explicitly report that the latest version could not be verified rather than treating an older copy as current.

## Typed Structure Access

- The `matterbridge-loxone` plugin relies on `loxone-ts-api`: https://github.com/andrasg/loxone-ts-api.
- Run `LoxoneClient.parseStructureFile()` before enumerating the Loxone structure file through the package's typed API. Prefer this typed access over implementing a separate structure parser.
- Check the installed package's API and existing plugin usage when implementing a testbench so calls match the installed version.

## Local Testbench Credentials

- Current connection settings and credentials for testing and working with a `loxone-ts-api` testbench are in `.matterbridge/matterbridge-loxone.config.json`.
- Load the configuration locally at runtime when needed. Never print credentials or include them in source code, logs, documentation, commits, or agent memory.
- Default live testbenches to read-only inspection. Obtain explicit user approval before sending commands that change device state or configuration.
