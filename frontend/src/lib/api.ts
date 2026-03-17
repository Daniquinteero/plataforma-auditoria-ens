const API_BASE_URL = "http://127.0.0.1:8000";

export async function fetchAudits() {
  const res = await fetch(`${API_BASE_URL}/audits`);

  if (!res.ok) {
    throw new Error("Failed to fetch audits");
  }

  return res.json();
}

export async function fetchAuditById(auditId: string) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch audit ${auditId}`);
  }

  return res.json();
}

export async function fetchAuditSummary(auditId: string) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/summary`);

  if (!res.ok) {
    throw new Error(`Failed to fetch audit summary ${auditId}`);
  }

  return res.json();
}



export async function fetchAuditCategoriesSummary(auditId: string) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/categories-summary`);

  if (!res.ok) {
    throw new Error(`Failed to fetch audit categories summary ${auditId}`);
  }

  return res.json();
}


export async function fetchAuditControls(auditId: string, onlyApplicable: boolean = true) {
  const res = await fetch(
    `${API_BASE_URL}/audits/${auditId}/controls?only_applicable=${onlyApplicable}`
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch controls for audit ${auditId}`);
  }

  return res.json();
}

export async function fetchControlQuestions(auditId: string, controlId: string) {
  const res = await fetch(
    `${API_BASE_URL}/audits/${auditId}/controls/${controlId}/questions`
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch questions for control ${controlId}`);
  }

  return res.json();
}


export async function patchControl(
  auditId: string,
  controlId: string,
  payload: {
    audit_status?: string | null;
    result?: string | null;
    notes?: string | null;
    applies?: boolean | null;
    exclusion_reason?: string | null;
  }
) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/controls/${controlId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to update control ${controlId}`);
  }

  return res.json();
}


export async function saveControlAnswers(
  auditId: string,
  controlId: string,
  payload: {
    answers: {
      question_id: string;
      answer: string;
      comment?: string | null;
    }[];
  }
) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/controls/${controlId}/answers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to save answers for control ${controlId}`);
  }

  return res.json();
}

export async function fetchControlEvidences(auditId: string, controlId: string) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/controls/${controlId}/evidences`);

  if (!res.ok) {
    throw new Error(`Failed to fetch evidences for control ${controlId}`);
  }

  return res.json();
}

export async function createControlEvidence(
  auditId: string,
  controlId: string,
  payload: {
    kind: "url" | "text";
    uri: string;
    description?: string | null;
  }
) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/controls/${controlId}/evidences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create evidence for control ${controlId}`);
  }

  return res.json();
}




export async function fetchCatalogControls() {
  const res = await fetch(`${API_BASE_URL}/catalog/controls`);

  if (!res.ok) {
    throw new Error("Failed to fetch catalog controls");
  }

  return res.json();
}

export async function createAudit(payload: {
  name: string;
  org: string;
  ens_category: string;
  controls: {
    control_id: string;
    control_title: string;
    applies: boolean;
    target_level: string | null;
    exclusion_reason: string | null;
  }[];
}) {
  const res = await fetch(`${API_BASE_URL}/audits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to create audit");
  }

  return res.json();
}



export async function fetchAuditEvidences(auditId: string) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/evidences`);

  if (!res.ok) {
    throw new Error(`Failed to fetch evidences for audit ${auditId}`);
  }

  return res.json();
}



export async function fetchAuditActivity(auditId: string) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/activity`);

  if (!res.ok) {
    throw new Error(`Failed to fetch activity for audit ${auditId}`);
  }

  return res.json();
}


export async function uploadControlEvidenceFile(
  auditId: string,
  controlId: string,
  file: File,
  description?: string | null
) {
  const formData = new FormData();
  formData.append("file", file);

  if (description) {
    formData.append("description", description);
  }

  const res = await fetch(
    `${API_BASE_URL}/audits/${auditId}/controls/${controlId}/evidences/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to upload file evidence for control ${controlId}`);
  }

  return res.json();
}




export async function deleteAudit(auditId: string) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete audit ${auditId}`);
  }

  return res.json();
}



export async function fetchAuditProgressTimeseries(auditId: string, days: number = 7) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/progress-timeseries?days=${days}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch progress timeseries for audit ${auditId}`);
  }

  return res.json();
}




export async function generateAuditReport(
  auditId: string,
  payload: {
    auditor_name: string;
    auditor_role: string;
    report_date: string;
    observations?: string;
    include_detailed_controls: boolean;
    include_evidence: boolean;
    sections: Record<string, boolean>;
  }
) {
  const res = await fetch(`${API_BASE_URL}/audits/${auditId}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to generate report for audit ${auditId}`);
  }

  return res.blob();
}

