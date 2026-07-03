# Otto API Extension

This repository provides a tracer-bullet Otto API extension that scans the command service layer, builds versioned endpoint metadata, validates request shapes, and forwards matched command requests without reimplementing command business logic.

## Responsibilities
- Scan `otto-command-service/src/commands/` for command definitions.
- Generate versioned REST endpoints and JSON schemas.
- Support manual rescans through `otto api rescan`.
- Support automatic rescans triggered by `OttoUpdateAgent`.
- Persist generation metadata to MemPalace.

## Runtime Assumptions
- `OTTO_COMMAND_SERVICE_PATH` can override the command scan root.
- `OTTO_MEMPALACE_PATH` can override the MemPalace root.
- Without overrides, this repository expects sibling checkouts of `otto-command-service` and `otto-extensions`.

## Validation
- `npm test`
- `npm run typecheck`