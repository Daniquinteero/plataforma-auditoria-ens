from __future__ import annotations

from pathlib import Path
from typing import Tuple
import re


def _safe_name(name: str) -> str:
    # elimina caracteres raros para evitar rutas feas
    name = name.strip()
    name = re.sub(r"[^a-zA-Z0-9._-]+", "_", name)
    return name or "evidence"


def save_uploaded_file(base_dir: str, audit_id: str, control_id: str, filename: str, content: bytes) -> str:
    """
    Guarda un archivo subido y devuelve la ruta (uri) a guardar en BD.
    """
    safe = _safe_name(filename)
    folder = Path(base_dir) / audit_id / control_id
    folder.mkdir(parents=True, exist_ok=True)

    path = folder / safe

    # Si existe, añade sufijo incremental
    if path.exists():
        stem = path.stem
        suffix = path.suffix
        i = 1
        while True:
            candidate = folder / f"{stem}_{i}{suffix}"
            if not candidate.exists():
                path = candidate
                break
            i += 1

    path.write_bytes(content)

    # Guardamos como "uri" relativa para que sea portable
    return str(path.as_posix())