from app.yaml_loader import load_catalog
from app.infra.db import init_db
from app.infra.repositories import list_controls, get_progress

DB_PATH = "storage/audits.db"

if __name__ == "__main__":
    # 1) Inicializa BD (crea tablas si no existen)
    init_db(DB_PATH)

    # 2) Carga catálogo
    catalog = load_catalog("data/catalogo_controles.yml")
    controles = catalog["controles"]

    # 3) Contexto (luego vendrá de UI)
    contexto = {
        "usa_nube": True,
        "proveedor_tercero": False,
        "teletrabajo": True,
    }


    """
    # 5) Guarda auditoría + controles en DB
    conn = connect(DB_PATH)
    try:
        audit_id = create_audit(conn, "Auditoría ENS demo", "Mi empresa", "MEDIA", contexto)

        for c in aplicables:
            upsert_audit_control(conn, audit_id, c["id"], c.get("titulo", ""), True)
        for c in excluidos:
            upsert_audit_control(conn, audit_id, c["id"], c.get("titulo", ""), False)

        conn.commit()

        # 6) Lee progreso y lista aplicables
        progress = get_progress(conn, audit_id)
        print(f"Audit ID: {audit_id}")
        print(f"Progreso auditado: {progress.audited}/{progress.total_applicable} ({progress.audited_pct:.1f}%)")

        rows = list_controls(conn, audit_id, only_applicable=True)
        print("\nControles aplicables (desde SQLite):")
        for r in rows:
            print(f"- {r['control_id']} | {r['control_title']} | status={r['audit_status']} result={r['result']}")
    finally:
        conn.close()
    """