#!/usr/bin/env python3
"""Check the original GLB and local WebP bindings without any external dependencies."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

ORIGINAL_SHA256 = "e86983558b8c6739da0389b4e3fe7456a0161e6b12e34b858f2c73733e8d913c"
PREFIX = "window.RainyCharacterPack="


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh-textures", action="store_true",
                        help="Refresh the offline copy after intentionally editing the source WebP files")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    file = root / "film/character-pack.js"
    source = file.read_text().strip()
    if not source.startswith(PREFIX) or not source.endswith(";"):
        raise SystemExit("Unexpected character pack wrapper")
    pack = json.loads(source[len(PREFIX):-1])
    raw = base64.b64decode(pack["model"], validate=True)
    if hashlib.sha256(raw).hexdigest() != ORIGINAL_SHA256:
        raise SystemExit("GLB differs from the original rain-street actor")
    expected = {path.name: base64.b64encode(path.read_bytes()).decode("ascii")
                for path in sorted((root / "gtex").glob("*.webp"))}
    if expected.keys() != pack["textures"].keys() or len(expected) != 21:
        raise SystemExit("Missing or unexpected source texture names")
    if expected != pack["textures"]:
        if not args.refresh_textures:
            raise SystemExit("The packed textures differ from gtex. Use --refresh-textures after intentional edits.")
        pack["textures"] = expected
        output = PREFIX + json.dumps(pack, separators=(",", ":")) + ";\n"
        with NamedTemporaryFile("w", dir=file.parent, delete=False) as temp:
            temp.write(output)
            tmp = Path(temp.name)
        tmp.chmod(file.stat().st_mode & 0o777)
        os.replace(tmp, file)
    print(f"Verified original GLB ({len(raw):,} bytes) and {len(expected)} byte-identical textures.")


if __name__ == "__main__":
    main()
