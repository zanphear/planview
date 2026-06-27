"""Dump the FastAPI OpenAPI document to backend/openapi.json (ADR 0006).

Run from backend/:  python scripts/dump_openapi.py
The frontend then regenerates typed bindings with `npm run gen:api`
(openapi-typescript ../backend/openapi.json -o src/api/schema.ts).

No server boot required; we call app.openapi() directly. A throwaway JWT secret is
injected if one is not set, so the import-time secret check does not abort the dump.
"""

import json
import os
import pathlib
import sys

# Make `app` importable when run as `python scripts/dump_openapi.py` from backend/.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
os.environ.setdefault("JWT_SECRET_KEY", "openapi-dump-throwaway-secret-not-for-runtime-use")

from app.main import app  # noqa: E402  (import after sys.path + env are set)

OUT = pathlib.Path(__file__).resolve().parent.parent / "openapi.json"


def main() -> None:
    schema = app.openapi()
    OUT.write_text(json.dumps(schema, indent=2, sort_keys=True))
    print(f"Wrote {OUT} ({len(schema.get('paths', {}))} paths)")


if __name__ == "__main__":
    main()
