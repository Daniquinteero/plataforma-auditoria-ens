from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from backend.catalog import load_catalog, get_questions_for_control_by_level, list_catalog_controls
from backend.repositories import (
    list_audits,
    get_audit_by_id,
    list_controls_by_audit_id,
    get_control_by_audit_id_and_control_id,
    get_answers_for_control,
    update_control,
    upsert_answer,
    list_evidences,
    add_evidence,
    get_audit_summary,
    get_audit_category_summary,
    create_audit,
    create_audit_control,
    list_evidences_by_audit_id,
    get_audit_activity,
    delete_audit,
    create_audit_event,
    get_audit_progress_timeseries,
    get_report_controls,
    get_report_applicable_controls,
    get_report_answers_by_control,
    get_report_evidences_by_control,
)
from pydantic import BaseModel
from backend.file_store import save_uploaded_file
from backend.file_store import save_uploaded_file, delete_audit_files
from fastapi.responses import Response
from backend.reporting import generate_audit_report_pdf
from backend.catalog import load_catalog, get_questions_for_control_by_level

app = FastAPI(
    title="ENS Audit Tool API",
    version="0.1.0"
)

class ControlUpdatePayload(BaseModel):
    audit_status: str | None = None
    result: str | None = None
    notes: str | None = None
    applies: bool | None = None
    exclusion_reason: str | None = None


class AnswerItemPayload(BaseModel):
    question_id: str
    answer: str
    comment: str | None = None


class AnswersPayload(BaseModel):
    answers: list[AnswerItemPayload]


class EvidencePayload(BaseModel):
    kind: str
    uri: str
    description: str | None = None


class CreateAuditControlPayload(BaseModel):
    control_id: str
    control_title: str
    applies: bool
    target_level: str | None = None
    exclusion_reason: str | None = None


class CreateAuditPayload(BaseModel):
    name: str
    org: str
    ens_category: str
    controls: list[CreateAuditControlPayload]    



class ReportSectionsPayload(BaseModel):
    resumenEjecutivo: bool = True
    alcanceObjetivos: bool = True
    metodologia: bool = True
    resultadosGenerales: bool = True
    controlsPorCategoria: bool = True
    noConformidades: bool = True
    evidencias: bool = True
    recomendaciones: bool = True
    conclusiones: bool = True
    anexos: bool = True


class GenerateReportPayload(BaseModel):
    auditor_name: str
    auditor_role: str
    report_date: str
    observations: str | None = None
    include_detailed_controls: bool = True
    include_evidence: bool = True
    sections: ReportSectionsPayload    


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "ENS Audit Tool API running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.get("/audits")
def get_audits():
    return list_audits()


@app.get("/audits/{audit_id}")
def get_audit(audit_id: str):
    audit = get_audit_by_id(audit_id)

    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    return audit



@app.get("/audits/{audit_id}/controls")
def get_audit_controls(audit_id: str, only_applicable: bool = False):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    return list_controls_by_audit_id(audit_id, only_applicable=only_applicable)



@app.get("/audits/{audit_id}/controls/{control_id}")
def get_audit_control(audit_id: str, control_id: str):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    control = get_control_by_audit_id_and_control_id(audit_id, control_id)
    if control is None:
        raise HTTPException(status_code=404, detail="Control not found")

    return control





@app.get("/audits/{audit_id}/controls/{control_id}/questions")
def get_control_questions(audit_id: str, control_id: str):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    control = get_control_by_audit_id_and_control_id(audit_id, control_id)
    if control is None:
        raise HTTPException(status_code=404, detail="Control not found")

    target_level = control.get("target_level") or "ALTA"

    catalog = load_catalog()
    questions = get_questions_for_control_by_level(catalog, control_id, target_level)

    answers = get_answers_for_control(audit_id, control_id)
    answers_by_qid = {a["question_id"]: a for a in answers}

    enriched_questions = []
    for q in questions:
        qid = q["id"]
        saved = answers_by_qid.get(qid)

        enriched_questions.append(
            {
                "id": qid,
                "texto": q.get("texto", ""),
                "min_level": q.get("min_level", "BASICA"),
                "answer": saved["answer"] if saved else None,
                "comment": saved["comment"] if saved else None,
                "answered_at": saved["answered_at"] if saved else None,
            }
        )

    return enriched_questions




@app.patch("/audits/{audit_id}/controls/{control_id}")
def patch_control(audit_id: str, control_id: str, payload: ControlUpdatePayload):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    control = get_control_by_audit_id_and_control_id(audit_id, control_id)
    if control is None:
        raise HTTPException(status_code=404, detail="Control not found")

    previous_status = control.get("audit_status")

    if payload.applies is False and not payload.exclusion_reason:
        raise HTTPException(
            status_code=400,
            detail="exclusion_reason is required when applies is false",
        )

    update_control(
        audit_id=audit_id,
        control_id=control_id,
        audit_status=payload.audit_status,
        result=payload.result,
        notes=payload.notes,
        applies=payload.applies,
        exclusion_reason=payload.exclusion_reason,
    )

    # Registrar evento real cuando pasa a AUDITADO
    if payload.audit_status == "AUDITADO" and previous_status != "AUDITADO":
        create_audit_event(
            audit_id=audit_id,
            control_id=control_id,
            event_type="CONTROL_AUDITED",
            event_value="AUDITADO",
        )

    updated = get_control_by_audit_id_and_control_id(audit_id, control_id)
    return updated





@app.post("/audits/{audit_id}/controls/{control_id}/answers")
def save_control_answers(audit_id: str, control_id: str, payload: AnswersPayload):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    control = get_control_by_audit_id_and_control_id(audit_id, control_id)
    if control is None:
        raise HTTPException(status_code=404, detail="Control not found")

    target_level = control.get("target_level") or "ALTA"

    catalog = load_catalog()
    visible_questions = get_questions_for_control_by_level(catalog, control_id, target_level)
    visible_qids = {q["id"] for q in visible_questions}

    for item in payload.answers:
        if item.question_id not in visible_qids:
            raise HTTPException(
                status_code=400,
                detail=f"Question '{item.question_id}' is not valid for control '{control_id}' at level '{target_level}'"
            )

        if item.answer not in ("SI", "NO", "NA"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid answer '{item.answer}'. Allowed values: SI, NO, NA"
            )

        upsert_answer(
            audit_id=audit_id,
            control_id=control_id,
            question_id=item.question_id,
            answer=item.answer,
            comment=item.comment,
        )

    # devolvemos las preguntas actualizadas con sus respuestas
    answers = get_answers_for_control(audit_id, control_id)
    answers_by_qid = {a["question_id"]: a for a in answers}

    enriched_questions = []
    for q in visible_questions:
        qid = q["id"]
        saved = answers_by_qid.get(qid)

        enriched_questions.append(
            {
                "id": qid,
                "texto": q.get("texto", ""),
                "min_level": q.get("min_level", "BASICA"),
                "answer": saved["answer"] if saved else None,
                "comment": saved["comment"] if saved else None,
                "answered_at": saved["answered_at"] if saved else None,
            }
        )

    return enriched_questions





@app.get("/audits/{audit_id}/controls/{control_id}/evidences")
def get_control_evidences(audit_id: str, control_id: str):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    control = get_control_by_audit_id_and_control_id(audit_id, control_id)
    if control is None:
        raise HTTPException(status_code=404, detail="Control not found")

    return list_evidences(audit_id, control_id)




@app.post("/audits/{audit_id}/controls/{control_id}/evidences")
def create_control_evidence(audit_id: str, control_id: str, payload: EvidencePayload):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    control = get_control_by_audit_id_and_control_id(audit_id, control_id)
    if control is None:
        raise HTTPException(status_code=404, detail="Control not found")

    if payload.kind not in ("url", "text"):
        raise HTTPException(
            status_code=400,
            detail="Invalid evidence kind. Allowed values: url, text"
        )

    if not payload.uri or not payload.uri.strip():
        raise HTTPException(
            status_code=400,
            detail="Evidence uri cannot be empty"
        )

    add_evidence(
        audit_id=audit_id,
        control_id=control_id,
        kind=payload.kind,
        uri=payload.uri.strip(),
        description=payload.description,
    )

    return list_evidences(audit_id, control_id)




@app.get("/audits/{audit_id}/summary")
def get_summary(audit_id: str):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    return get_audit_summary(audit_id)




@app.get("/audits/{audit_id}/categories-summary")
def get_categories_summary(audit_id: str):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    return get_audit_category_summary(audit_id)



@app.post("/audits")
def create_new_audit(payload: CreateAuditPayload):
    context = {
        "ens_category": payload.ens_category,
        "scope_mode": "manual",
    }

    for control in payload.controls:
        if control.applies is False and not control.exclusion_reason:
            raise HTTPException(
                status_code=400,
                detail=f"exclusion_reason is required when applies is false for control {control.control_id}",
            )

    audit_id = create_audit(
        name=payload.name,
        org=payload.org,
        ens_category=payload.ens_category,
        context=context,
    )

    for control in payload.controls:
        create_audit_control(
            audit_id=audit_id,
            control_id=control.control_id,
            control_title=control.control_title,
            applies=control.applies,
            target_level=control.target_level,
            exclusion_reason=control.exclusion_reason,
        )

    audit = get_audit_by_id(audit_id)
    return audit




@app.get("/catalog/controls")
def get_catalog_controls():
    catalog = load_catalog()
    return list_catalog_controls(catalog)




@app.get("/audits/{audit_id}/evidences")
def get_audit_evidences(audit_id: str):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    return list_evidences_by_audit_id(audit_id)




@app.get("/audits/{audit_id}/activity")
def get_activity(audit_id: str):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    return get_audit_activity(audit_id)




@app.post("/audits/{audit_id}/controls/{control_id}/evidences/upload")
async def upload_control_evidence_file(
    audit_id: str,
    control_id: str,
    file: UploadFile = File(...),
    description: str | None = Form(None),
):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    control = get_control_by_audit_id_and_control_id(audit_id, control_id)
    if control is None:
        raise HTTPException(status_code=404, detail="Control not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    saved_uri = save_uploaded_file(
        audit_id=audit_id,
        control_id=control_id,
        filename=file.filename or "evidence",
        content=content,
    )

    add_evidence(
        audit_id=audit_id,
        control_id=control_id,
        kind="file",
        uri=saved_uri,
        description=description or file.filename,
    )

    return list_evidences(audit_id, control_id)




@app.delete("/audits/{audit_id}")
def remove_audit(audit_id: str):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    delete_audit(audit_id)

    return {"message": "Audit deleted successfully"}




@app.delete("/audits/{audit_id}")
def remove_audit(audit_id: str):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    delete_audit(audit_id)
    delete_audit_files(audit_id)

    return {"message": "Audit deleted successfully"}



@app.get("/audits/{audit_id}/progress-timeseries")
def get_progress_timeseries(audit_id: str, days: int = 7):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    return get_audit_progress_timeseries(audit_id, days)





@app.post("/audits/{audit_id}/report")
def generate_audit_report(audit_id: str, payload: GenerateReportPayload):
    audit = get_audit_by_id(audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")

    summary = get_audit_summary(audit_id)
    categories = get_audit_category_summary(audit_id)




    catalog = load_catalog()

    controls = get_report_applicable_controls(audit_id)
    answers_by_control = get_report_answers_by_control(audit_id)
    evidences_by_control = get_report_evidences_by_control(audit_id)

    enriched_controls = []

    for control in controls:
        control_id = control["control_id"]
        target_level = control.get("target_level") or "ALTA"

        catalog_questions = get_questions_for_control_by_level(catalog, control_id, target_level)
        saved_answers = {
            a["question_id"]: a
            for a in answers_by_control.get(control_id, [])
        }

        enriched_questions = []
        for q in catalog_questions:
            qid = q.get("id")
            saved = saved_answers.get(qid)

            answer_value = saved["answer"] if saved else None

            if answer_value == "SI":
                question_compliance = "CUMPLE"
            elif answer_value == "NO":
                question_compliance = "NO_CUMPLE"
            elif answer_value == "NA":
                question_compliance = "NO_APLICA"
            else:
                question_compliance = "SIN_RESPUESTA"

            enriched_questions.append(
                {
                    "id": qid,
                    "texto": q.get("texto", ""),
                    "min_level": q.get("min_level", "BASICA"),
                    "answer": answer_value,
                    "comment": saved["comment"] if saved else None,
                    "answered_at": saved["answered_at"] if saved else None,
                    "question_compliance": question_compliance,
                }
            )

        enriched_control = {
            **control,
            "questions": enriched_questions,
            "evidences": evidences_by_control.get(control_id, []),
        }

        enriched_controls.append(enriched_control)





    report_data = {
        "audit": audit,
        "summary": summary,
        "categories": categories,
        "controls": enriched_controls,
        "config": {
            "auditor_name": payload.auditor_name,
            "auditor_role": payload.auditor_role,
            "report_date": payload.report_date,
            "observations": payload.observations or "",
            "include_detailed_controls": payload.include_detailed_controls,
            "include_evidence": payload.include_evidence,
        },
        "sections": payload.sections.model_dump(),
    }

    pdf_bytes = generate_audit_report_pdf(report_data)

    filename = f"informe_auditoria_{audit_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )