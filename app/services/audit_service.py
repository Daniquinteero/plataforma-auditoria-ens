from __future__ import annotations

from typing import Any, Dict, List, Tuple
from uuid import uuid4

from app.infra.db import connect
from app.infra.repositories import create_audit, upsert_audit_control
from app.scope import compute_scope


def new_id() -> str:
    return uuid4().hex


def create_audit_with_scope(
    db_path: str,
    name: str,
    org: str,
    ens_category: str,
    context: Dict[str, Any],
    catalog_controls: List[Dict[str, Any]],
) -> str:
    """
    1) Crea auditoría
    2) Calcula scope (aplicables/excluidos)
    3) Guarda audit_controls con applies=1/0
    """
    audit_id = new_id()

    aplicables, excluidos = compute_scope(catalog_controls, context)

    conn = connect(db_path)
    try:
        create_audit(conn, audit_id, name, org, ens_category, context)

        # Guardamos TODOS los controles en audit_controls (aplica o no)
        for c in aplicables:
            upsert_audit_control(conn, audit_id, c["id"], c.get("titulo", ""), True)
        for c in excluidos:
            upsert_audit_control(conn, audit_id, c["id"], c.get("titulo", ""), False)

        conn.commit()
    finally:
        conn.close()

    return audit_id