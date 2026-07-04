# Otto API Extension

This repository provides a tracer-bullet Otto API extension that scans the command service layer and builds versioned OpenAPI endpoint metadata from the command registry without reimplementing command business logic.

## Responsibilities
- Scan `otto-command-service/src/commands/` for command definitions.
- Generate versioned REST endpoint metadata from registered commands.
- Support manual rescans through command-service execution of `otto.api.rescan`.
- Support automatic rescans triggered by `OttoUpdateAgent`.
- Persist generation metadata to MemPalace.

## Runtime Assumptions
- `OTTO_COMMAND_SERVICE_PATH` can override the command scan root.
- `OTTO_MEMPALACE_PATH` can override the MemPalace root.
- Without overrides, this repository expects sibling checkouts of `otto-command-service` and `otto-extensions`.

## Validation
- `npm test`
- `npm run typecheck`