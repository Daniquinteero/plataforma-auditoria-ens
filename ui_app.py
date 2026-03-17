from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import streamlit as st

from app.infra.db import init_db, connect
from app.yaml_loader import load_catalog
from app.catalog import get_questions_for_control_by_level
from app.file_store import save_uploaded_file


DB_PATH = "storage/audits.db"
FILES_BASE_DIR = "storage/files"


# --------------------------
# Helpers (DB + time + ids)
# --------------------------
def new_id() -> str:
    return uuid4().hex


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_column(conn: sqlite3.Connection, table: str, column: str, coltype: str) -> None:
    """Añade columna si no existe (migración simple)."""
    cols = conn.execute(f"PRAGMA table_info({table})").fetchall()
    existing = {c["name"] for c in cols}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}")


@dataclass(frozen=True)
class Progress:
    total_applicable: int
    audited: int
    with_result: int
    non_compliant: int

    @property
    def audited_pct(self) -> float:
        return (self.audited / self.total_applicable * 100.0) if self.total_applicable else 0.0


# --------------------------
# Minimal repo (inline)
# --------------------------
def db_migrations(conn: sqlite3.Connection) -> None:
    """
    Migraciones ligeras para soportar el nuevo scope manual.
    - Añadimos target_level a audit_controls.
    """
    ensure_column(conn, "audit_controls", "target_level", "TEXT")


def list_audits(conn: sqlite3.Connection) -> List[sqlite3.Row]:
    return list(
        conn.execute(
            """
            SELECT id, name, org, ens_category, status, created_at, updated_at
            FROM audits
            ORDER BY created_at DESC
            """
        )
    )


def create_audit(conn: sqlite3.Connection, name: str, org: str, ens_category: str, context: Dict[str, Any]) -> str:
    audit_id = new_id()
    t = now_iso()
    conn.execute(
        """
        INSERT INTO audits (id, name, org, ens_category, context_json, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (audit_id, name, org, ens_category, json.dumps(context, ensure_ascii=False), "EN_CURSO", t, t),
    )
    return audit_id


def upsert_audit_control(
    conn: sqlite3.Connection,
    audit_id: str,
    control_id: str,
    control_title: str,
    applies: bool,
    target_level: Optional[str],
    exclusion_reason: Optional[str],
) -> None:
    t = now_iso()
    conn.execute(
        """
        INSERT INTO audit_controls (
          audit_id, control_id, control_title, applies, exclusion_reason,
          audit_status, result, implementation_grade, notes, updated_at, target_level
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(audit_id, control_id) DO UPDATE SET
          control_title=excluded.control_title,
          applies=excluded.applies,
          exclusion_reason=excluded.exclusion_reason,
          target_level=excluded.target_level,
          updated_at=excluded.updated_at
        """,
        (
            audit_id,
            control_id,
            control_title,
            1 if applies else 0,
            exclusion_reason,
            "PENDIENTE",
            "NO_EVAL",
            None,
            None,
            t,
            target_level,
        ),
    )


def list_controls(conn: sqlite3.Connection, audit_id: str, only_applicable: bool = True) -> List[sqlite3.Row]:
    if only_applicable:
        return list(
            conn.execute(
                """
                SELECT *
                FROM audit_controls
                WHERE audit_id=? AND applies=1
                ORDER BY control_id
                """,
                (audit_id,),
            )
        )
    return list(
        conn.execute(
            """
            SELECT *
            FROM audit_controls
            WHERE audit_id=?
            ORDER BY applies DESC, control_id
            """,
            (audit_id,),
        )
    )


def update_control(conn: sqlite3.Connection, audit_id: str, control_id: str, audit_status: str, result: str, notes: str) -> None:
    t = now_iso()
    conn.execute(
        """
        UPDATE audit_controls
        SET audit_status=?, result=?, notes=?, updated_at=?
        WHERE audit_id=? AND control_id=?
        """,
        (audit_status, result, notes, t, audit_id, control_id),
    )


def get_progress(conn: sqlite3.Connection, audit_id: str) -> Progress:
    total_applicable = conn.execute(
        "SELECT COUNT(*) AS n FROM audit_controls WHERE audit_id=? AND applies=1", (audit_id,)
    ).fetchone()["n"]

    audited = conn.execute(
        "SELECT COUNT(*) AS n FROM audit_controls WHERE audit_id=? AND applies=1 AND audit_status='AUDITADO'",
        (audit_id,),
    ).fetchone()["n"]

    with_result = conn.execute(
        "SELECT COUNT(*) AS n FROM audit_controls WHERE audit_id=? AND applies=1 AND result!='NO_EVAL'",
        (audit_id,),
    ).fetchone()["n"]

    non_compliant = conn.execute(
        "SELECT COUNT(*) AS n FROM audit_controls WHERE audit_id=? AND applies=1 AND result='NO_CUMPLE'",
        (audit_id,),
    ).fetchone()["n"]

    return Progress(int(total_applicable), int(audited), int(with_result), int(non_compliant))


def get_answers_for_control(conn: sqlite3.Connection, audit_id: str, control_id: str) -> Dict[str, sqlite3.Row]:
    rows = conn.execute(
        """
        SELECT question_id, answer, comment, answered_at
        FROM audit_answers
        WHERE audit_id=? AND control_id=?
        """,
        (audit_id, control_id),
    ).fetchall()
    return {r["question_id"]: r for r in rows}


def upsert_answer(conn: sqlite3.Connection, audit_id: str, control_id: str, question_id: str, answer: str, comment: Optional[str]) -> None:
    t = now_iso()
    conn.execute(
        """
        INSERT INTO audit_answers (id, audit_id, control_id, question_id, answer, comment, answered_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(audit_id, control_id, question_id) DO UPDATE SET
          answer=excluded.answer,
          comment=excluded.comment,
          answered_at=excluded.answered_at
        """,
        (new_id(), audit_id, control_id, question_id, answer, comment, t),
    )


def add_evidence(conn: sqlite3.Connection, audit_id: str, control_id: str, kind: str, uri: str, description: Optional[str]) -> None:
    t = now_iso()
    conn.execute(
        """
        INSERT INTO evidences (id, audit_id, control_id, kind, description, uri, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (new_id(), audit_id, control_id, kind, description, uri, t),
    )


def list_evidences(conn: sqlite3.Connection, audit_id: str, control_id: str) -> List[sqlite3.Row]:
    return list(
        conn.execute(
            """
            SELECT id, kind, description, uri, created_at
            FROM evidences
            WHERE audit_id=? AND control_id=?
            ORDER BY created_at DESC
            """,
            (audit_id, control_id),
        )
    )


def count_evidences_by_control(conn: sqlite3.Connection, audit_id: str) -> Dict[str, int]:
    rows = conn.execute(
        """
        SELECT control_id, COUNT(*) AS n
        FROM evidences
        WHERE audit_id=?
        GROUP BY control_id
        """,
        (audit_id,),
    ).fetchall()
    return {r["control_id"]: int(r["n"]) for r in rows}


def count_answers_by_control(conn: sqlite3.Connection, audit_id: str) -> Dict[str, int]:
    rows = conn.execute(
        """
        SELECT control_id, COUNT(*) AS n
        FROM audit_answers
        WHERE audit_id=?
        GROUP BY control_id
        """,
        (audit_id,),
    ).fetchall()
    return {r["control_id"]: int(r["n"]) for r in rows}


# --------------------------
# Streamlit App
# --------------------------
st.set_page_config(page_title="ENS Audit Tool", layout="wide")
st.title("ENS Audit Tool")

# init DB + migrate
init_db(DB_PATH)
_conn = connect(DB_PATH)
try:
    db_migrations(_conn)
    _conn.commit()
finally:
    _conn.close()

catalog = load_catalog("data/catalogo_controles.yml")
catalog_controls = catalog.get("controles", [])

# Sidebar: select audit or create new
st.sidebar.header("Auditorías")

conn = connect(DB_PATH)
try:
    audits = list_audits(conn)
finally:
    conn.close()

audit_options = ["(Crear nueva auditoría)"] + [f"{a['name']} — {a['org']} — {a['id']}" for a in audits]
selected_audit = st.sidebar.selectbox("Selecciona auditoría", audit_options)

# --------------------------
# Create Audit (Manual Scope)
# --------------------------
if selected_audit == "(Crear nueva auditoría)":
    st.subheader("Crear auditoría — Scope manual por control")

    c1, c2, c3 = st.columns(3)
    with c1:
        audit_name = st.text_input("Nombre auditoría", value="Auditoría ENS")
    with c2:
        audit_org = st.text_input("Organización", value="")
    with c3:
        ens_category = st.selectbox("Categoría ENS del sistema", ["BASICA", "MEDIA", "ALTA"], index=1)

    st.markdown("### Scope (Declaración de aplicabilidad)")

    # Construimos tabla base (una fila por control)
    base_rows = []
    for c in catalog_controls:
        base_rows.append(
            {
                "control_id": c.get("id", ""),
                "titulo": c.get("titulo", ""),
                "aplica": True,               # por defecto aplica; el auditor lo ajusta
                "nivel_objetivo": ens_category,  # por defecto igual que categoría seleccionada
                "motivo_exclusion": "",
            }
        )

    df = pd.DataFrame(base_rows)

    # Editor de tabla
    edited = st.data_editor(
        df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "control_id": st.column_config.TextColumn("ID", disabled=True),
            "titulo": st.column_config.TextColumn("Título", disabled=True),
            "aplica": st.column_config.CheckboxColumn("Aplica"),
            "nivel_objetivo": st.column_config.SelectboxColumn(
                "Nivel objetivo",
                options=["BASICA", "MEDIA", "ALTA"],
            ),
            "motivo_exclusion": st.column_config.TextColumn("Motivo exclusión (si no aplica)"),
        },
        key="scope_editor",
    )

    st.caption(
        "Sugerencia: si un control NO aplica, marca 'aplica' en False y rellena el motivo de exclusión."
    )

    if st.button("Crear auditoría con este scope", type="primary"):
        # Contexto mínimo: aquí guardamos categoría y que el scope es manual
        context = {
            "ens_category": ens_category,
            "scope_mode": "manual",
        }

        conn = connect(DB_PATH)
        try:
            audit_id = create_audit(conn, audit_name, audit_org, ens_category, context)

            # Guardar todos los controles con aplica + target_level + motivo_exclusion
            for _, row in edited.iterrows():
                cid = str(row["control_id"]).strip()
                titulo = str(row["titulo"]).strip()
                aplica = bool(row["aplica"])
                target_level = str(row["nivel_objetivo"]).strip() if row["nivel_objetivo"] else None
                motivo = str(row["motivo_exclusion"]).strip() if row["motivo_exclusion"] else None

                if (not aplica) and (not motivo):
                    motivo = "No aplica (sin motivo indicado)"

                upsert_audit_control(
                    conn,
                    audit_id=audit_id,
                    control_id=cid,
                    control_title=titulo,
                    applies=aplica,
                    target_level=target_level,
                    exclusion_reason=motivo,
                )

            conn.commit()
        finally:
            conn.close()

        st.success(f"Auditoría creada: {audit_id}")
        st.info("Ahora selecciónala en el menú lateral para empezar a auditar.")
        st.stop()

    st.stop()


# --------------------------
# Dashboard / Audit View
# --------------------------
audit_name = selected_audit.split(" — ")[0].strip()
audit_org = selected_audit.split(" — ")[1].strip()
audit_id = selected_audit.split(" — ")[2].strip()
st.subheader(f"Dashboard — {audit_name} {audit_org}")

conn = connect(DB_PATH)
try:
    progress = get_progress(conn, audit_id)

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Controles aplicables", progress.total_applicable)
    m2.metric("Auditados", progress.audited)
    m3.metric("Con resultado", progress.with_result)
    m4.metric("No conformes", progress.non_compliant)

    st.progress(min(progress.audited_pct / 100.0, 1.0))
    st.caption(f"Progreso auditado: {progress.audited_pct:.1f}%")

    rows = list_controls(conn, audit_id, only_applicable=True)
    if not rows:
        st.warning("No hay controles aplicables en esta auditoría.")
        st.stop()

    ev_count = count_evidences_by_control(conn, audit_id)

    table = []
    for r in rows:
        cid = r["control_id"]
        target_level = r["target_level"] or "ALTA"

        # Preguntas visibles según el nivel del control
        visible_questions = get_questions_for_control_by_level(catalog, cid, target_level)
        visible_qids = {q["id"] for q in visible_questions}
        total_q = len(visible_qids)

        # Respuestas guardadas para este control
        existing_answers = get_answers_for_control(conn, audit_id, cid)

        # Contar solo respuestas de preguntas visibles

        answered_q = sum(
            1
            for qid in visible_qids
            if qid in existing_answers and existing_answers[qid]["answer"] == "SI"
        )

        evidences = ev_count.get(cid, 0)

        table.append(
            {
                "control_id": cid,
                "titulo": r["control_title"] or "",
                "nivel_objetivo": target_level,
                "estado": r["audit_status"],
                "resultado": r["result"],
                "evidencias": evidences,
                "preguntas": f"{answered_q}/{total_q}",
            }
        )

    df = pd.DataFrame(table)

    with st.expander("Filtros", expanded=True):
        f1, f2, f3, f4 = st.columns(4)
        with f1:
            estado_f = st.multiselect(
                "Estado",
                ["PENDIENTE", "EN_PROGRESO", "AUDITADO"],
                default=["PENDIENTE", "EN_PROGRESO", "AUDITADO"],
            )
        with f2:
            solo_no_conforme = st.checkbox("Solo no conformes", value=False)
            solo_sin_resultado = st.checkbox("Solo sin resultado (NO_EVAL)", value=False)
        with f3:
            solo_sin_evidencias = st.checkbox("Solo sin evidencias", value=False)
        with f4:
            q = st.text_input("Buscar (id/título)", value="")

    filtered = df[df["estado"].isin(estado_f)]
    if solo_no_conforme:
        filtered = filtered[filtered["resultado"] == "NO_CUMPLE"]
    if solo_sin_resultado:
        filtered = filtered[filtered["resultado"] == "NO_EVAL"]
    if solo_sin_evidencias:
        filtered = filtered[filtered["evidencias"] == 0]
    if q.strip():
        qq = q.strip().lower()
        filtered = filtered[
            filtered["control_id"].str.lower().str.contains(qq)
            | filtered["titulo"].str.lower().str.contains(qq)
        ]

    st.caption(f"Mostrando {len(filtered)}/{len(df)} controles")
    st.dataframe(
        filtered[["control_id", "titulo", "nivel_objetivo", "estado", "resultado", "evidencias", "preguntas"]],
        use_container_width=True,
        hide_index=True,
    )

    if len(filtered) == 0:
        st.info("No hay controles con esos filtros.")
        st.stop()

    selected_id = st.selectbox(
        "Abrir control",
        options=list(filtered["control_id"]),
        format_func=lambda x: f"{x} — {df.loc[df['control_id'] == x, 'titulo'].iloc[0]}",
    )
    selected_row = next(r for r in rows if r["control_id"] == selected_id)

    st.divider()
    st.subheader(f"Ficha: {selected_row['control_id']}")
    st.write(selected_row["control_title"])
    st.caption(f"Nivel objetivo: {selected_row['target_level'] or '—'}")

    # Estado / resultado / notas
    left, right = st.columns([1, 1])
    with left:
        audit_status = st.selectbox(
            "Estado de auditoría",
            ["PENDIENTE", "EN_PROGRESO", "AUDITADO"],
            index=["PENDIENTE", "EN_PROGRESO", "AUDITADO"].index(selected_row["audit_status"]),
        )
        result = st.selectbox(
            "Resultado",
            ["NO_EVAL", "CUMPLE", "NO_CUMPLE", "PARCIAL"],
            index=["NO_EVAL", "CUMPLE", "NO_CUMPLE", "PARCIAL"].index(selected_row["result"]),
        )
    with right:
        notes = st.text_area("Notas del auditor", value=selected_row["notes"] or "", height=150)

    if st.button("Guardar cambios", type="primary"):
        update_control(conn, audit_id, selected_row["control_id"], audit_status, result, notes)
        conn.commit()
        st.success("Guardado.")
        st.rerun()

    # Preguntas
    st.divider()
    st.subheader("Preguntas del control")

    target_level = selected_row["target_level"] or "ALTA"
    questions = get_questions_for_control_by_level(catalog, selected_row["control_id"], target_level)    
    existing = get_answers_for_control(conn, audit_id, selected_row["control_id"])

    if not questions:
        st.info("Este control no tiene preguntas definidas en el YAML.")
    else:
        # init state
        for qitem in questions:
            qid = qitem["id"]
            key_ans = f"ans_{selected_row['control_id']}_{qid}"
            key_com = f"com_{selected_row['control_id']}_{qid}"
            prev = existing.get(qid)
            default_ans = prev["answer"] if prev else "NO"
            default_com = prev["comment"] if (prev and prev["comment"]) else ""
            st.session_state.setdefault(key_ans, default_ans)
            st.session_state.setdefault(key_com, default_com)

        for qitem in questions:
            qid = qitem["id"]
            st.markdown(f"**{qitem.get('texto','')}**")
            c1, c2 = st.columns([1, 3])
            with c1:
                st.selectbox(
                    "Respuesta",
                    ["SI", "NO", "NA"],
                    key=f"ans_{selected_row['control_id']}_{qid}",
                    label_visibility="collapsed",
                )
            with c2:
                st.text_input(
                    "Comentario",
                    key=f"com_{selected_row['control_id']}_{qid}",
                    label_visibility="collapsed",
                )

        if st.button("Guardar respuestas"):
            for qitem in questions:
                qid = qitem["id"]
                ans = st.session_state.get(f"ans_{selected_row['control_id']}_{qid}", "NO")
                com = st.session_state.get(f"com_{selected_row['control_id']}_{qid}", "")
                upsert_answer(conn, audit_id, selected_row["control_id"], qid, ans, com if com else None)
            conn.commit()
            st.success("Respuestas guardadas.")
            st.rerun()

    # Evidencias
    st.divider()
    st.subheader("Evidencias")

    ev_rows = list_evidences(conn, audit_id, selected_row["control_id"])
    if ev_rows:
        for ev in ev_rows:
            st.write(f"- [{ev['kind']}] {ev['description'] or ''} → {ev['uri']} ({ev['created_at']})")
    else:
        st.caption("Aún no hay evidencias registradas para este control.")

    st.markdown("### Añadir evidencia URL")
    ev_url = st.text_input("URL", value="", placeholder="https://...", key="ev_url")
    ev_desc = st.text_input("Descripción", value="", placeholder="Ej: enlace a política / ticket / doc...", key="ev_desc")

    if st.button("Guardar evidencia URL"):
        if not ev_url.strip():
            st.error("La URL no puede estar vacía.")
        else:
            add_evidence(conn, audit_id, selected_row["control_id"], "url", ev_url.strip(), ev_desc.strip() or None)
            conn.commit()
            st.success("Evidencia URL guardada.")
            st.rerun()

    st.markdown("### Subir archivo como evidencia")
    uploaded = st.file_uploader("Selecciona un archivo", type=None, key="file_uploader")
    file_desc = st.text_input("Descripción del archivo", value="", placeholder="Ej: PDF procedimiento, captura...", key="file_desc")

    if st.button("Guardar archivo"):
        if uploaded is None:
            st.error("Primero selecciona un archivo.")
        else:
            content = uploaded.getvalue()
            saved_uri = save_uploaded_file(
                base_dir=FILES_BASE_DIR,
                audit_id=audit_id,
                control_id=selected_row["control_id"],
                filename=uploaded.name,
                content=content,
            )
            add_evidence(
                conn,
                audit_id,
                selected_row["control_id"],
                "file",
                saved_uri,
                file_desc.strip() or uploaded.name,
            )
            conn.commit()
            st.success("Archivo guardado como evidencia.")
            st.rerun()

finally:
    conn.close()