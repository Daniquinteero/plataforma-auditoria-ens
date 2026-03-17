import streamlit as st

from app.infra.db import init_db, connect
from app.infra.repositories import list_controls, get_progress, update_control
from app.yaml_loader import load_catalog
from app.catalog import get_questions_for_control
from app.infra.repositories import get_answers_for_control, upsert_answer, new_id
from app.infra.repositories import add_evidence, list_evidences
from app.file_store import save_uploaded_file
from app.infra.repositories import count_evidences_by_control, count_answers_by_control
from app.catalog import count_questions_by_control
import pandas as pd


DB_PATH = "storage/audits.db"
FILES_BASE_DIR = "storage/files"


st.set_page_config(page_title="ENS Audit Tool", layout="wide")
st.title("ENS Audit Tool — Dashboard")

catalog = load_catalog("data/catalogo_controles.yml")

questions_total_map = count_questions_by_control(catalog)

# 1) Inicializa DB por si no existe (no hace daño)
init_db(DB_PATH)

# 2) Pedimos audit_id al usuario (por ahora manual)
audit_id = st.text_input("Audit ID", value="", placeholder="Pega aquí el Audit ID que te salió en main.py")

if not audit_id:
    st.info("Introduce un Audit ID para cargar una auditoría.")
    st.stop()

conn = connect(DB_PATH)
try:
    # 3) Progreso
    progress = get_progress(conn, audit_id)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Controles aplicables", progress.total_applicable)
    col2.metric("Auditados", progress.audited)
    col3.metric("Con resultado", progress.with_result)
    col4.metric("No conformes", progress.non_compliant)

    st.progress(min(progress.audited_pct / 100.0, 1.0))
    st.caption(f"Progreso auditado: {progress.audited_pct:.1f}%")

    # 4) Lista de controles aplicables



    st.subheader("Controles aplicables")

    rows = list_controls(conn, audit_id, only_applicable=True)
    if not rows:
        st.warning("No se encontraron controles aplicables para este Audit ID.")
        st.stop()

    # Conteos por control
    ev_count = count_evidences_by_control(conn, audit_id)
    ans_count = count_answers_by_control(conn, audit_id)

    # Construimos un dataframe para poder filtrar fácil
    data = []
    for r in rows:
        cid = r["control_id"]
        total_q = questions_total_map.get(cid, 0)
        answered_q = ans_count.get(cid, 0)
        evidences = ev_count.get(cid, 0)

        data.append(
            {
                "control_id": cid,
                "titulo": r["control_title"] or "",
                "estado": r["audit_status"],
                "resultado": r["result"],
                "evidencias": evidences,
                "preguntas": f"{answered_q}/{total_q}",
                "sin_evidencias": evidences == 0,
                "sin_resultado": r["result"] == "NO_EVAL",
                "no_conforme": r["result"] == "NO_CUMPLE",
            }
        )

    df = pd.DataFrame(data)

    # --- Filtros ---
    with st.expander("Filtros", expanded=True):
        colf1, colf2, colf3, colf4 = st.columns(4)

        with colf1:
            estado_f = st.multiselect(
                "Estado",
                ["PENDIENTE", "EN_PROGRESO", "AUDITADO"],
                default=["PENDIENTE", "EN_PROGRESO", "AUDITADO"],
            )
        with colf2:
            solo_no_conforme = st.checkbox("Solo no conformes", value=False)
            solo_sin_resultado = st.checkbox("Solo sin resultado (NO_EVAL)", value=False)
        with colf3:
            solo_sin_evidencias = st.checkbox("Solo sin evidencias", value=False)
        with colf4:
            q = st.text_input("Buscar (id o título)", value="")

    filtered = df[df["estado"].isin(estado_f)]

    if solo_no_conforme:
        filtered = filtered[filtered["no_conforme"] == True]
    if solo_sin_resultado:
        filtered = filtered[filtered["sin_resultado"] == True]
    if solo_sin_evidencias:
        filtered = filtered[filtered["sin_evidencias"] == True]
    if q.strip():
        qq = q.strip().lower()
        filtered = filtered[
            filtered["control_id"].str.lower().str.contains(qq)
            | filtered["titulo"].str.lower().str.contains(qq)
        ]

    # --- Tabla ---
    st.caption(f"Mostrando {len(filtered)}/{len(df)} controles")
    st.dataframe(
        filtered[["control_id", "titulo", "estado", "resultado", "evidencias", "preguntas"]],
        use_container_width=True,
        hide_index=True,
    )

    # Selector de control basado en la tabla filtrada
    if len(filtered) == 0:
        st.info("No hay controles con esos filtros.")
        st.stop()

    selected_id = st.selectbox(
        "Abrir control",
        options=list(filtered["control_id"]),
        format_func=lambda x: f"{x} — {df.loc[df['control_id'] == x, 'titulo'].iloc[0]}",
    )

    # Recuperamos row original del control seleccionado (para la ficha)
    selected = next(r for r in rows if r["control_id"] == selected_id)

    st.divider()




    # 5) Ficha del control
    st.subheader(f"Ficha: {selected['control_id']}")
    st.write(selected["control_title"])

    left, right = st.columns([1, 1])

    with left:
        audit_status = st.selectbox(
            "Estado de auditoría",
            ["PENDIENTE", "EN_PROGRESO", "AUDITADO"],
            index=["PENDIENTE", "EN_PROGRESO", "AUDITADO"].index(selected["audit_status"]),
        )

        result = st.selectbox(
            "Resultado",
            ["NO_EVAL", "CUMPLE", "NO_CUMPLE", "PARCIAL"],
            index=["NO_EVAL", "CUMPLE", "NO_CUMPLE", "PARCIAL"].index(selected["result"]),
        )

    with right:
        notes = st.text_area("Notas del auditor", value=selected["notes"] or "", height=150)

    if st.button("Guardar cambios", type="primary"):
        update_control(conn, audit_id, selected["control_id"], audit_status, result, notes)
        conn.commit()
        st.success("Guardado. Recarga automática del progreso y listado.")

        st.rerun()



    st.divider()
    st.subheader("Preguntas del control")

    questions = get_questions_for_control(catalog, selected["control_id"])
    if not questions:
        st.info("Este control no tiene preguntas definidas en el YAML.")
    else:
        existing = get_answers_for_control(conn, audit_id, selected["control_id"])

        # Guardamos entradas en session_state para no perder cambios si cambias un selectbox
        for q in questions:
            qid = q["id"]
            key_ans = f"ans_{selected['control_id']}_{qid}"
            key_com = f"com_{selected['control_id']}_{qid}"

            prev = existing.get(qid)
            default_ans = (prev["answer"] if prev else "NO")  # default razonable
            default_com = (prev["comment"] if prev and prev["comment"] else "")

            if key_ans not in st.session_state:
                st.session_state[key_ans] = default_ans
            if key_com not in st.session_state:
                st.session_state[key_com] = default_com

        # Render preguntas
        for q in questions:
            qid = q["id"]
            st.markdown(f"**{q.get('texto', '')}**")
            c1, c2 = st.columns([1, 3])

            with c1:
                st.selectbox(
                    "Respuesta",
                    ["SI", "NO", "NA"],
                    key=f"ans_{selected['control_id']}_{qid}",
                    label_visibility="collapsed",
                )
            with c2:
                st.text_input(
                    "Comentario",
                    key=f"com_{selected['control_id']}_{qid}",
                    label_visibility="collapsed",
                    placeholder="Comentario / evidencia relacionada / referencia...",
                )

        if st.button("Guardar respuestas"):
            for q in questions:
                qid = q["id"]
                ans = st.session_state.get(f"ans_{selected['control_id']}_{qid}", "NO")
                com = st.session_state.get(f"com_{selected['control_id']}_{qid}", "")

                upsert_answer(
                    conn,
                    answer_id=new_id(),
                    audit_id=audit_id,
                    control_id=selected["control_id"],
                    question_id=qid,
                    answer=ans,
                    comment=com if com else None,
                )

            conn.commit()
            st.success("Respuestas guardadas.")
            st.rerun()



    st.divider()
    st.subheader("Evidencias")

    # Mostrar evidencias existentes
    ev_rows = list_evidences(conn, audit_id, selected["control_id"])
    if ev_rows:
        for ev in ev_rows:
            st.write(f"- [{ev['kind']}] {ev['description'] or ''} → {ev['uri']} ({ev['created_at']})")
    else:
        st.caption("Aún no hay evidencias registradas para este control.")

    st.markdown("### Añadir evidencia URL")
    ev_url = st.text_input("URL", value="", placeholder="https://...")
    ev_desc = st.text_input("Descripción", value="", placeholder="Ej: enlace a política de VPN / ticket / documento...")

    if st.button("Guardar evidencia URL"):
        if not ev_url.strip():
            st.error("La URL no puede estar vacía.")
        else:
            add_evidence(
                conn,
                evidence_id=new_id(),
                audit_id=audit_id,
                control_id=selected["control_id"],
                kind="url",
                uri=ev_url.strip(),
                description=ev_desc.strip() or None,
            )
            conn.commit()
            st.success("Evidencia URL guardada.")
            st.rerun()

    st.markdown("### Subir archivo como evidencia")
    uploaded = st.file_uploader("Selecciona un archivo", type=None)

    file_desc = st.text_input("Descripción del archivo", value="", placeholder="Ej: captura VPN, PDF del procedimiento...")

    if st.button("Guardar archivo"):

        if uploaded is None:
            st.error("Primero selecciona un archivo.")
        else:
            content = uploaded.getvalue()
            saved_uri = save_uploaded_file(
                base_dir=FILES_BASE_DIR,
                audit_id=audit_id,
                control_id=selected["control_id"],
                filename=uploaded.name,
                content=content,
            )

            add_evidence(
                conn,
                evidence_id=new_id(),
                audit_id=audit_id,
                control_id=selected["control_id"],
                kind="file",
                uri=saved_uri,
                description=file_desc.strip() or uploaded.name,
            )
            conn.commit()
            st.success("Archivo guardado como evidencia.")
            st.rerun()

    

finally:
    conn.close()