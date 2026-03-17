from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

def new_id() -> str:
    return uuid4().hex

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

@dataclass(frozen=True)
class Progress:
    total_applicable: int
    audited: int
    with_result: int
    non_compliant: int

    @property
    def audited_pct(self) -> float:
        return (self.audited / self.total_applicable * 100.0) if self.total_applicable else 0.0

def create_audit(
    conn: sqlite3.Connection,
    name: str,
    org: str,
    ens_category: str,
    context: Dict[str, Any],
) -> str:
    audit_id = new_id()
    now = _now_iso()

    conn.execute(
        """
        INSERT INTO audits (id, name, org, ens_category, context_json, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (audit_id, name, org, ens_category, json.dumps(context, ensure_ascii=False), "EN_CURSO", now, now),
    )
    return audit_id

def upsert_audit_control(
    conn: sqlite3.Connection,
    audit_id: str,
    control_id: str,
    control_title: str,
    applies: bool,
) -> None:
    now = _now_iso()
    conn.execute(
        """
        INSERT INTO audit_controls (
          audit_id, control_id, control_title, applies, exclusion_reason,
          audit_status, result, implementation_grade, notes, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(audit_id, control_id) DO UPDATE SET
          control_title=excluded.control_title,
          applies=excluded.applies,
          updated_at=excluded.updated_at
        """,
        (
            audit_id,
            control_id,
            control_title,
            1 if applies else 0,
            None,
            "PENDIENTE",
            "NO_EVAL",
            None,
            None,
            now,
        ),
    )

def list_controls(conn: sqlite3.Connection, audit_id: str, only_applicable: bool = True) -> List[sqlite3.Row]:
    if only_applicable:
        return list(
            conn.execute(
                """
                SELECT * FROM audit_controls
                WHERE audit_id=? AND applies=1
                ORDER BY control_id
                """,
                (audit_id,),
            )
        )
    return list(
        conn.execute(
            """
            SELECT * FROM audit_controls
            WHERE audit_id=?
            ORDER BY applies DESC, control_id
            """,
            (audit_id,),
        )
    )

def get_progress(conn: sqlite3.Connection, audit_id: str) -> Progress:
    total_applicable = conn.execute(
        "SELECT COUNT(*) AS n FROM audit_controls WHERE audit_id=? AND applies=1",
        (audit_id,),
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

    return Progress(
        total_applicable=int(total_applicable),
        audited=int(audited),
        with_result=int(with_result),
        non_compliant=int(non_compliant),
    )


def update_control(
    conn: sqlite3.Connection,
    audit_id: str,
    control_id: str,
    audit_status: str,
    result: str,
    notes: str | None,
) -> None:
    now = _now_iso()
    conn.execute(
        """
        UPDATE audit_controls
        SET audit_status=?, result=?, notes=?, updated_at=?
        WHERE audit_id=? AND control_id=?
        """,
        (audit_status, result, notes, now, audit_id, control_id),
    )

def get_answers_for_control(conn: sqlite3.Connection, audit_id: str, control_id: str) -> Dict[str, sqlite3.Row]:
    """
    Devuelve un dict: question_id -> row(answer, comment, answered_at)
    """
    rows = conn.execute(
        """
        SELECT question_id, answer, comment, answered_at
        FROM audit_answers
        WHERE audit_id=? AND control_id=?
        """,
        (audit_id, control_id),
    ).fetchall()
    return {r["question_id"]: r for r in rows}


def upsert_answer(
    conn: sqlite3.Connection,
    answer_id: str,
    audit_id: str,
    control_id: str,
    question_id: str,
    answer: str,  # SI|NO|NA
    comment: str | None,
) -> None:
    now = _now_iso()
    conn.execute(
        """
        INSERT INTO audit_answers (id, audit_id, control_id, question_id, answer, comment, answered_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(audit_id, control_id, question_id) DO UPDATE SET
          answer=excluded.answer,
          comment=excluded.comment,
          answered_at=excluded.answered_at
        """,
        (answer_id, audit_id, control_id, question_id, answer, comment, now),
    )




def add_evidence(
    conn: sqlite3.Connection,
    evidence_id: str,
    audit_id: str,
    control_id: str,
    kind: str,              # url|file|text
    uri: str,
    description: str | None,
) -> None:
    now = _now_iso()
    conn.execute(
        """
        INSERT INTO evidences (id, audit_id, control_id, kind, description, uri, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (evidence_id, audit_id, control_id, kind, description, uri, now),
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


def get_audit(conn: sqlite3.Connection, audit_id: str) -> sqlite3.Row | None:
    row = conn.execute(
        """
        SELECT id, name, org, ens_category, status, context_json, created_at, updated_at
        FROM audits
        WHERE id=?
        """,
        (audit_id,),
    ).fetchone()
    return row