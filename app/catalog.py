from __future__ import annotations

from typing import Any, Dict, List, Optional


LEVEL_ORDER = {"BASICA": 1, "MEDIA": 2, "ALTA": 3}


def get_questions_for_control_by_level(catalog: Dict[str, Any], control_id: str, target_level: str) -> List[Dict[str, Any]]:
    # Busca el control
    controls = catalog.get("controles", [])
    control = next((c for c in controls if c.get("id") == control_id), None)
    if not control:
        return []

    qs = control.get("preguntas", []) or []
    t = LEVEL_ORDER.get(target_level, 3)  # por defecto ALTA
    out = []
    for q in qs:
        min_level = q.get("min_level", "BASICA")
        if t >= LEVEL_ORDER.get(min_level, 1):
            out.append(q)
    return out