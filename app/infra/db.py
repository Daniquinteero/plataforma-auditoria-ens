from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  org TEXT,
  ens_category TEXT,
  context_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_controls (
  audit_id TEXT NOT NULL,
  control_id TEXT NOT NULL,
  control_title TEXT,
  applies INTEGER NOT NULL,
  exclusion_reason TEXT,
  audit_status TEXT NOT NULL,
  result TEXT NOT NULL,
  implementation_grade TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (audit_id, control_id),
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_answers (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  control_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  comment TEXT,
  answered_at TEXT NOT NULL,
  UNIQUE (audit_id, control_id, question_id),
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evidences (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  control_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  description TEXT,
  uri TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  control_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_value TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_controls_audit ON audit_controls(audit_id);
CREATE INDEX IF NOT EXISTS idx_answers_audit_control ON audit_answers(audit_id, control_id);
CREATE INDEX IF NOT EXISTS idx_evidences_audit_control ON evidences(audit_id, control_id);
"""

def connect(db_path: str) -> sqlite3.Connection:
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_path: str) -> None:
    conn = connect(db_path)
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
    finally:
        conn.close()