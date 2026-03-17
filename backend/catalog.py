from pathlib import Path
from typing import Any, Dict, List
import yaml

LEVEL_ORDER = {"BASICA": 1, "MEDIA": 2, "ALTA": 3}

CATALOG_PATH = Path("data/catalogo_controles.yml")


def load_catalog() -> Dict[str, Any]:
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if data is None:
        return {"controles": []}

    return data


def get_questions_for_control_by_level(
    catalog: Dict[str, Any],
    control_id: str,
    target_level: str,
) -> List[Dict[str, Any]]:
    controls = catalog.get("controles", [])
    control = next((c for c in controls if c.get("id") == control_id), None)
    if not control:
        return []

    qs = control.get("preguntas", []) or []

    normalized_target = (target_level or "ALTA").upper()
    target_order = LEVEL_ORDER.get(normalized_target, LEVEL_ORDER["ALTA"])

    visible_questions = []
    for q in qs:
        min_level = (q.get("min_level", "BASICA") or "BASICA").upper()
        min_order = LEVEL_ORDER.get(min_level, LEVEL_ORDER["BASICA"])

        if target_order >= min_order:
            visible_questions.append(q)

    return visible_questions


def list_catalog_controls(catalog: Dict[str, Any]) -> List[Dict[str, Any]]:
    controls = catalog.get("controles", []) or []
    result = []

    for c in controls:
        result.append(
            {
                "control_id": c.get("id", ""),
                "control_title": c.get("titulo", ""),
                "description": c.get("descripcion", ""),
            }
        )

    return result






def get_questions_for_control_by_level(
    catalog: Dict[str, Any],
    control_id: str,
    target_level: str,
) -> List[Dict[str, Any]]:
    controls = catalog.get("controles", [])
    control = next((c for c in controls if c.get("id") == control_id), None)
    if not control:
        return []

    qs = control.get("preguntas", []) or []

    normalized_target = (target_level or "ALTA").upper()
    target_order = LEVEL_ORDER.get(normalized_target, LEVEL_ORDER["ALTA"])

    visible_questions = []
    for q in qs:
        min_level = (q.get("min_level", "BASICA") or "BASICA").upper()
        min_order = LEVEL_ORDER.get(min_level, LEVEL_ORDER["BASICA"])

        if target_order >= min_order:
            visible_questions.append(q)

    return visible_questions