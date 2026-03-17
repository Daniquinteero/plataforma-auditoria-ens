from backend.db import get_connection
import json
import uuid


def list_audits():
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, name, org, ens_category, status, created_at, updated_at
            FROM audits
            ORDER BY created_at DESC
            """
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_audit_by_id(audit_id: str):
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, name, org, ens_category, status, context_json, created_at, updated_at
            FROM audits
            WHERE id = ?
            """,
            (audit_id,),
        ).fetchone()

        if row is None:
            return None

        return dict(row)
    finally:
        conn.close()





def list_controls_by_audit_id(audit_id: str, only_applicable: bool = False):
    conn = get_connection()
    try:
        if only_applicable:
            rows = conn.execute(
                """
                SELECT
                    audit_id,
                    control_id,
                    control_title,
                    applies,
                    exclusion_reason,
                    audit_status,
                    result,
                    implementation_grade,
                    notes,
                    updated_at,
                    target_level
                FROM audit_controls
                WHERE audit_id = ? AND applies = 1
                ORDER BY control_id
                """,
                (audit_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT
                    audit_id,
                    control_id,
                    control_title,
                    applies,
                    exclusion_reason,
                    audit_status,
                    result,
                    implementation_grade,
                    notes,
                    updated_at,
                    target_level
                FROM audit_controls
                WHERE audit_id = ?
                ORDER BY applies DESC, control_id
                """,
                (audit_id,),
            ).fetchall()

        return [dict(row) for row in rows]
    finally:
        conn.close()




def get_control_by_audit_id_and_control_id(audit_id: str, control_id: str):
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT
                audit_id,
                control_id,
                control_title,
                applies,
                exclusion_reason,
                audit_status,
                result,
                implementation_grade,
                notes,
                updated_at,
                target_level
            FROM audit_controls
            WHERE audit_id = ? AND control_id = ?
            """,
            (audit_id, control_id),
        ).fetchone()

        if row is None:
            return None

        return dict(row)
    finally:
        conn.close()



def get_answers_for_control(audit_id: str, control_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT question_id, answer, comment, answered_at
            FROM audit_answers
            WHERE audit_id = ? AND control_id = ?
            """,
            (audit_id, control_id),
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        conn.close()



def update_control(audit_id: str, control_id: str, audit_status: str, result: str, notes: str | None):
    conn = get_connection()
    try:
        conn.execute(
            """
            UPDATE audit_controls
            SET audit_status = ?, result = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE audit_id = ? AND control_id = ?
            """,
            (audit_status, result, notes, audit_id, control_id),
        )
        conn.commit()
    finally:
        conn.close()



def upsert_answer(audit_id: str, control_id: str, question_id: str, answer: str, comment: str | None):
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO audit_answers (id, audit_id, control_id, question_id, answer, comment, answered_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(audit_id, control_id, question_id)
            DO UPDATE SET
                answer = excluded.answer,
                comment = excluded.comment,
                answered_at = CURRENT_TIMESTAMP
            """,
            (str(__import__("uuid").uuid4().hex), audit_id, control_id, question_id, answer, comment),
        )
        conn.commit()
    finally:
        conn.close()





def list_evidences(audit_id: str, control_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, kind, description, uri, created_at
            FROM evidences
            WHERE audit_id = ? AND control_id = ?
            ORDER BY created_at DESC
            """,
            (audit_id, control_id),
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        conn.close()


def add_evidence(audit_id: str, control_id: str, kind: str, uri: str, description: str | None):
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO evidences (id, audit_id, control_id, kind, description, uri, created_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (str(__import__("uuid").uuid4().hex), audit_id, control_id, kind, description, uri),
        )
        conn.commit()
    finally:
        conn.close()





def get_audit_summary(audit_id: str):
    conn = get_connection()
    try:
        total_applicable = conn.execute(
            """
            SELECT COUNT(*) AS n
            FROM audit_controls
            WHERE audit_id = ? AND applies = 1
            """,
            (audit_id,),
        ).fetchone()["n"]

        audited = conn.execute(
            """
            SELECT COUNT(*) AS n
            FROM audit_controls
            WHERE audit_id = ? AND applies = 1 AND audit_status = 'AUDITADO'
            """,
            (audit_id,),
        ).fetchone()["n"]

        with_result = conn.execute(
            """
            SELECT COUNT(*) AS n
            FROM audit_controls
            WHERE audit_id = ? AND applies = 1 AND result != 'NO_EVAL'
            """,
            (audit_id,),
        ).fetchone()["n"]

        non_compliant = conn.execute(
            """
            SELECT COUNT(*) AS n
            FROM audit_controls
            WHERE audit_id = ? AND applies = 1 AND result = 'NO_CUMPLE'
            """,
            (audit_id,),
        ).fetchone()["n"]

        total_evidences = conn.execute(
            """
            SELECT COUNT(*) AS n
            FROM evidences
            WHERE audit_id = ?
            """,
            (audit_id,),
        ).fetchone()["n"]

        total_yes_answers = conn.execute(
            """
            SELECT COUNT(*) AS n
            FROM audit_answers
            WHERE audit_id = ? AND answer = 'SI'
            """,
            (audit_id,),
        ).fetchone()["n"]

        progress_pct = 0.0
        if total_applicable:
            progress_pct = round((audited / total_applicable) * 100, 2)

        return {
            "audit_id": audit_id,
            "total_applicable": int(total_applicable),
            "audited": int(audited),
            "with_result": int(with_result),
            "non_compliant": int(non_compliant),
            "total_evidences": int(total_evidences),
            "total_yes_answers": int(total_yes_answers),
            "progress_pct": progress_pct,
        }
    finally:
        conn.close()



def get_category_key_from_control_id(control_id: str) -> str:
    if control_id.startswith("org."):
        return "org"
    if control_id.startswith("op."):
        return "op"
    if control_id.startswith("mp."):
        return "mp"
    return "other"


def get_category_label(category_key: str) -> str:
    mapping = {
        "org": "Marco organizativo",
        "op": "Marco operacional",
        "mp": "Medidas de protección",
        "other": "Otras medidas",
    }
    return mapping.get(category_key, "Otras medidas")



def get_audit_category_summary(audit_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT control_id, audit_status
            FROM audit_controls
            WHERE audit_id = ? AND applies = 1
            ORDER BY control_id
            """,
            (audit_id,),
        ).fetchall()

        grouped = {}

        for row in rows:
            control_id = row["control_id"]
            audit_status = row["audit_status"]

            key = get_category_key_from_control_id(control_id)
            label = get_category_label(key)

            if key not in grouped:
                grouped[key] = {
                    "key": key,
                    "label": label,
                    "total": 0,
                    "audited": 0,
                    "progress_pct": 0.0,
                }

            grouped[key]["total"] += 1

            if audit_status == "AUDITADO":
                grouped[key]["audited"] += 1

        result = []
        for key in ["org", "op", "mp", "other"]:
            if key in grouped:
                item = grouped[key]
                if item["total"] > 0:
                    item["progress_pct"] = round((item["audited"] / item["total"]) * 100, 2)
                result.append(item)

        return result
    finally:
        conn.close()





def create_audit(name: str, org: str, ens_category: str, context: dict):
    conn = get_connection()
    try:
        audit_id = uuid.uuid4().hex

        conn.execute(
            """
            INSERT INTO audits (id, name, org, ens_category, context_json, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (
                audit_id,
                name,
                org,
                ens_category,
                json.dumps(context, ensure_ascii=False),
                "EN_CURSO",
            ),
        )

        conn.commit()
        return audit_id
    finally:
        conn.close()


def create_audit_control(
    audit_id: str,
    control_id: str,
    control_title: str,
    applies: bool,
    target_level: str | None,
    exclusion_reason: str | None,
):
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO audit_controls (
                audit_id,
                control_id,
                control_title,
                applies,
                exclusion_reason,
                audit_status,
                result,
                implementation_grade,
                notes,
                updated_at,
                target_level
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
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
                target_level,
            ),
        )

        conn.commit()
    finally:
        conn.close()





def list_evidences_by_audit_id(audit_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
                e.id,
                e.kind,
                e.description,
                e.uri,
                e.created_at,
                e.control_id
            FROM evidences e
            WHERE e.audit_id = ?
            ORDER BY e.created_at DESC
            """,
            (audit_id,),
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        conn.close()



def get_audit_activity(audit_id: str):
    conn = get_connection()
    try:
        activities = []

        # 1) Creación de auditoría
        audit_row = conn.execute(
            """
            SELECT id, name, created_at
            FROM audits
            WHERE id = ?
            """,
            (audit_id,),
        ).fetchone()

        if audit_row:
            activities.append(
                {
                    "id": f"audit-created-{audit_row['id']}",
                    "action": f"Se creó la auditoría '{audit_row['name']}'",
                    "user": "Sistema",
                    "timestamp": audit_row["created_at"],
                }
            )

        # 2) Últimas actualizaciones de controles
        control_rows = conn.execute(
            """
            SELECT control_id, control_title, audit_status, result, updated_at
            FROM audit_controls
            WHERE audit_id = ?
            ORDER BY updated_at DESC
            """,
            (audit_id,),
        ).fetchall()

        for row in control_rows:
            activities.append(
                {
                    "id": f"control-{row['control_id']}-{row['updated_at']}",
                    "action": f"Actualización del control {row['control_id']} ({row['control_title']}) — estado: {row['audit_status']}, resultado: {row['result']}",
                    "user": "Auditor",
                    "timestamp": row["updated_at"],
                }
            )

        # 3) Respuestas a preguntas
        answer_rows = conn.execute(
            """
            SELECT control_id, question_id, answer, answered_at
            FROM audit_answers
            WHERE audit_id = ?
            ORDER BY answered_at DESC
            """,
            (audit_id,),
        ).fetchall()

        for row in answer_rows:
            activities.append(
                {
                    "id": f"answer-{row['control_id']}-{row['question_id']}-{row['answered_at']}",
                    "action": f"Respuesta guardada en {row['control_id']} / {row['question_id']}: {row['answer']}",
                    "user": "Auditor",
                    "timestamp": row["answered_at"],
                }
            )

        # 4) Evidencias añadidas
        evidence_rows = conn.execute(
            """
            SELECT control_id, kind, description, created_at
            FROM evidences
            WHERE audit_id = ?
            ORDER BY created_at DESC
            """,
            (audit_id,),
        ).fetchall()

        for row in evidence_rows:
            desc = row["description"] or "Sin descripción"
            activities.append(
                {
                    "id": f"evidence-{row['control_id']}-{row['created_at']}",
                    "action": f"Evidencia añadida en {row['control_id']} ({row['kind']}): {desc}",
                    "user": "Auditor",
                    "timestamp": row["created_at"],
                }
            )

        # Ordenar por fecha descendente
        activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)

        return activities
    finally:
        conn.close()




def update_control(
    audit_id: str,
    control_id: str,
    audit_status: str | None = None,
    result: str | None = None,
    notes: str | None = None,
    applies: bool | None = None,
    exclusion_reason: str | None = None,
):
    conn = get_connection()
    try:
        fields = []
        values = []

        if audit_status is not None:
            fields.append("audit_status = ?")
            values.append(audit_status)

        if result is not None:
            fields.append("result = ?")
            values.append(result)

        if notes is not None:
            fields.append("notes = ?")
            values.append(notes)

        if applies is not None:
            fields.append("applies = ?")
            values.append(1 if applies else 0)

        if exclusion_reason is not None:
            fields.append("exclusion_reason = ?")
            values.append(exclusion_reason)

        fields.append("updated_at = CURRENT_TIMESTAMP")

        values.extend([audit_id, control_id])

        conn.execute(
            f"""
            UPDATE audit_controls
            SET {", ".join(fields)}
            WHERE audit_id = ? AND control_id = ?
            """,
            values,
        )
        conn.commit()
    finally:
        conn.close()




def delete_audit(audit_id: str):
    conn = get_connection()
    try:
        conn.execute(
            """
            DELETE FROM audits
            WHERE id = ?
            """,
            (audit_id,),
        )
        conn.commit()
    finally:
        conn.close()



def create_audit_event(audit_id: str, control_id: str, event_type: str, event_value: str | None = None):
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO audit_events (id, audit_id, control_id, event_type, event_value, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (uuid.uuid4().hex, audit_id, control_id, event_type, event_value),
        )
        conn.commit()
    finally:
        conn.close()        



def get_audit_progress_timeseries(audit_id: str, days: int = 7):
    conn = get_connection()
    try:
        rows = conn.execute(
            f"""
            SELECT
              DATE(created_at) as day,
              COUNT(*) as audited_count
            FROM audit_events
            WHERE audit_id = ?
              AND event_type = 'CONTROL_AUDITED'
              AND DATE(created_at) >= DATE('now', '-{days - 1} day')
            GROUP BY DATE(created_at)
            ORDER BY day ASC
            """,
            (audit_id,),
        ).fetchall()

        db_map = {row["day"]: int(row["audited_count"]) for row in rows}

        # Generar todos los días aunque no haya eventos
        from datetime import datetime, timedelta

        today = datetime.utcnow().date()
        result = []

        for i in range(days):
            d = today - timedelta(days=(days - 1 - i))
            iso_day = d.isoformat()
            result.append(
                {
                    "day": iso_day,
                    "audited_count": db_map.get(iso_day, 0),
                }
            )

        return result
    finally:
        conn.close()



def get_report_controls(audit_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
              audit_id,
              control_id,
              control_title,
              applies,
              exclusion_reason,
              audit_status,
              result,
              implementation_grade,
              notes,
              updated_at,
              target_level
            FROM audit_controls
            WHERE audit_id = ?
            ORDER BY control_id
            """,
            (audit_id,),
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        conn.close()        





def get_report_applicable_controls(audit_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
              audit_id,
              control_id,
              control_title,
              applies,
              exclusion_reason,
              audit_status,
              result,
              implementation_grade,
              notes,
              updated_at,
              target_level
            FROM audit_controls
            WHERE audit_id = ? AND applies = 1
            ORDER BY control_id
            """,
            (audit_id,),
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_report_answers_by_control(audit_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
              control_id,
              question_id,
              answer,
              comment,
              answered_at
            FROM audit_answers
            WHERE audit_id = ?
            ORDER BY control_id, question_id
            """,
            (audit_id,),
        ).fetchall()

        grouped = {}
        for row in rows:
            item = dict(row)
            grouped.setdefault(item["control_id"], []).append(item)

        return grouped
    finally:
        conn.close()


def get_report_evidences_by_control(audit_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
              control_id,
              kind,
              description,
              uri,
              created_at
            FROM evidences
            WHERE audit_id = ?
            ORDER BY control_id, created_at
            """,
            (audit_id,),
        ).fetchall()

        grouped = {}
        for row in rows:
            item = dict(row)
            grouped.setdefault(item["control_id"], []).append(item)

        return grouped
    finally:
        conn.close()