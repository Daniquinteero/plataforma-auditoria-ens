from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _styles():
    styles = getSampleStyleSheet()

    def add(name: str, parent: str, **kwargs):
        if name not in styles:
            styles.add(ParagraphStyle(name=name, parent=styles[parent], **kwargs))

    add(
        "CoverTitle",
        "Title",
        fontSize=24,
        leading=30,
        spaceAfter=10,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_CENTER,
    )

    add(
        "CoverSubtitle",
        "Heading2",
        fontSize=14,
        leading=18,
        spaceAfter=10,
        textColor=colors.HexColor("#334155"),
        alignment=TA_CENTER,
    )

    add(
        "Heading1Custom",
        "Heading1",
        fontSize=16,
        leading=21,
        spaceBefore=8,
        spaceAfter=10,
        textColor=colors.HexColor("#1d4ed8"),
    )

    add(
        "Heading2Custom",
        "Heading2",
        fontSize=12.2,
        leading=16,
        spaceBefore=8,
        spaceAfter=5,
        textColor=colors.HexColor("#0f172a"),
    )

    add(
        "ControlTitle",
        "Heading2",
        fontSize=13,
        leading=17,
        spaceBefore=4,
        spaceAfter=8,
        textColor=colors.HexColor("#0f172a"),
    )

    add(
        "SectionLabel",
        "BodyText",
        fontSize=9,
        leading=11,
        spaceBefore=8,
        spaceAfter=5,
        textColor=colors.HexColor("#1e3a8a"),
    )

    add(
        "BodyCustom",
        "BodyText",
        fontSize=9.5,
        leading=14,
        spaceAfter=6,
        textColor=colors.HexColor("#334155"),
    )

    add(
        "BodySmall",
        "BodyText",
        fontSize=8.5,
        leading=12,
        spaceAfter=4,
        textColor=colors.HexColor("#334155"),
    )

    add(
        "BodyStrong",
        "BodyText",
        fontSize=9.5,
        leading=14,
        spaceAfter=4,
        textColor=colors.HexColor("#0f172a"),
    )

    add(
        "SmallMuted",
        "BodyText",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748b"),
    )

    add(
        "QuestionText",
        "BodyText",
        fontSize=9.4,
        leading=13.5,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4,
    )

    add(
        "QuestionMeta",
        "BodyText",
        fontSize=8.2,
        leading=10.5,
        textColor=colors.HexColor("#334155"),
    )

    add(
        "QuestionComment",
        "BodyText",
        fontSize=8.7,
        leading=12,
        textColor=colors.HexColor("#475569"),
    )

    add(
        "PillText",
        "BodyText",
        fontSize=7.4,
        leading=8.8,
        textColor=colors.white,
        alignment=TA_CENTER,
    )

    add(
        "TableCell",
        "BodyText",
        fontSize=8.7,
        leading=11.5,
        textColor=colors.HexColor("#0f172a"),
    )

    add(
        "TableCellSmall",
        "BodyText",
        fontSize=8.2,
        leading=10.5,
        textColor=colors.HexColor("#0f172a"),
    )

    return styles


def _p(text: Any, style):
    value = "-" if text is None or text == "" else str(text)
    return Paragraph(value.replace("\n", "<br/>"), style)


def _result_label(value: str) -> str:
    mapping = {
        "CUMPLE": "Cumple",
        "NO_CUMPLE": "No cumple",
        "PARCIAL": "Parcial",
        "NO_EVAL": "No evaluado",
        "SIN_RESPUESTA": "Sin respuesta",
        "SIN_RESPUESTA": "Sin respuesta",
        "AUDITADO": "Auditado",
        "PENDIENTE": "Pendiente",
    }
    return mapping.get(value or "", value or "-")


def _result_color(value: str):
    value = (value or "").upper()
    if value in {"CUMPLE", "AUDITADO"}:
        return colors.HexColor("#16a34a")
    if value in {"NO_CUMPLE"}:
        return colors.HexColor("#dc2626")
    if value in {"PARCIAL"}:
        return colors.HexColor("#d97706")
    if value in {"PENDIENTE"}:
        return colors.HexColor("#64748b")
    return colors.HexColor("#475569")


def _build_pill(text: str, bg_color, width: float = 26 * mm) -> Table:
    pill = Table([[Paragraph(text, _styles()["PillText"])]], colWidths=[width])
    pill.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), bg_color),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("ROUNDEDCORNERS", [4, 4, 4, 4]),
            ]
        )
    )
    return pill


def _build_kv_table(rows: List[List[Any]], styles) -> Table:
    data = [[_p(k, styles["TableCell"]), _p(v, styles["TableCell"])] for k, v in rows]

    table = Table(data, colWidths=[48 * mm, 122 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e2e8f0")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _build_summary_table(summary: Dict[str, Any], styles) -> Table:
    rows = [
        ["Controles aplicables", str(summary.get("total_applicable", 0))],
        ["Controles auditados", str(summary.get("audited", 0))],
        ["Controles con resultado", str(summary.get("with_result", 0))],
        ["No conformidades", str(summary.get("non_compliant", 0))],
        ["Evidencias registradas", str(summary.get("total_evidences", 0))],
        ["Respuestas afirmativas", str(summary.get("total_yes_answers", 0))],
        ["Progreso de auditoría", f'{summary.get("progress_pct", 0)}%'],
    ]
    return _build_kv_table(rows, styles)


def _build_categories_table(categories: List[Dict[str, Any]], styles) -> Table:
    rows = [[
        _p("Categoría", styles["TableCell"]),
        _p("Auditados", styles["TableCell"]),
        _p("Total", styles["TableCell"]),
        _p("Progreso", styles["TableCell"]),
    ]]

    for c in categories:
        rows.append([
            _p(c.get("label", ""), styles["TableCell"]),
            _p(str(c.get("audited", 0)), styles["TableCell"]),
            _p(str(c.get("total", 0)), styles["TableCell"]),
            _p(f'{c.get("progress_pct", 0)}%', styles["TableCell"]),
        ])

    table = Table(
        rows,
        colWidths=[92 * mm, 24 * mm, 20 * mm, 34 * mm],
        hAlign="LEFT",
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dbeafe")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _build_control_header(control: Dict[str, Any], styles) -> Table:
    status = _result_label(control.get("audit_status") or "-")
    result = _result_label(control.get("result") or "-")

    left = Paragraph(
        f'<b>{control.get("control_id", "")}</b> - {control.get("control_title", "")}',
        styles["ControlTitle"],
    )

    right = Table(
        [[
            _build_pill(status, _result_color(control.get("audit_status")), width=28 * mm),
            _build_pill(result, _result_color(control.get("result")), width=30 * mm),
        ]],
        colWidths=[31 * mm, 33 * mm],
    )
    right.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    wrapper = Table([[left, right]], colWidths=[106 * mm, 64 * mm], hAlign="LEFT")
    wrapper.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return wrapper


def _build_control_meta_table(control: Dict[str, Any], styles) -> Table:
    rows = [
        [
            _p("<b>ID</b>", styles["TableCellSmall"]),
            _p(control.get("control_id", ""), styles["TableCellSmall"]),
            _p("<b>Nivel objetivo</b>", styles["TableCellSmall"]),
            _p(control.get("target_level") or "-", styles["TableCellSmall"]),
        ],
        [
            _p("<b>Auditada</b>", styles["TableCellSmall"]),
            _p("Sí" if control.get("audit_status") == "AUDITADO" else "No", styles["TableCellSmall"]),
            _p("<b>Estado</b>", styles["TableCellSmall"]),
            _p(_result_label(control.get("audit_status") or "-"), styles["TableCellSmall"]),
        ],
        [
            _p("<b>Resultado</b>", styles["TableCellSmall"]),
            _p(_result_label(control.get("result") or "-"), styles["TableCellSmall"]),
            _p("<b>Notas del auditor</b>", styles["TableCellSmall"]),
            _p(control.get("notes") or "Sin notas", styles["TableCellSmall"]),
        ],
    ]

    table = Table(
        rows,
        colWidths=[24 * mm, 53 * mm, 30 * mm, 63 * mm],
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f8fafc")),
            ]
        )
    )
    return table


def _build_question_card(question: Dict[str, Any], styles) -> Table:
    answer_value = _result_label(question.get("answer") or "SIN_RESPUESTA")
    compliance_value = _result_label(question.get("question_compliance") or "SIN_RESPUESTA")
    min_level = question.get("min_level") or "-"
    comment = question.get("comment") or "Sin comentario"

    question_block = Paragraph(
        f'<b>Pregunta:</b> {question.get("texto", "")}',
        styles["QuestionText"],
    )

    meta_table = Table(
        [[
            _p("<b>Nivel mínimo</b><br/>" + str(min_level), styles["QuestionMeta"]),
            _p("<b>Respuesta</b><br/>" + answer_value, styles["QuestionMeta"]),
            _p("<b>Cumplimiento</b><br/>" + compliance_value, styles["QuestionMeta"]),
            _p("<b>Comentario</b><br/>" + comment, styles["QuestionComment"]),
        ]],
        colWidths=[24 * mm, 28 * mm, 32 * mm, 86 * mm],
        hAlign="LEFT",
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor("#e2e8f0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    card = Table(
        [[question_block], [meta_table]],
        colWidths=[170 * mm],
        hAlign="LEFT",
    )
    card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#dbe3ee")),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return card


def _build_evidence_table(evidences: List[Dict[str, Any]], styles) -> Table:
    rows = [[
        _p("Tipo", styles["TableCellSmall"]),
        _p("Descripción", styles["TableCellSmall"]),
        _p("Referencia", styles["TableCellSmall"]),
        _p("Fecha", styles["TableCellSmall"]),
    ]]

    for ev in evidences:
        rows.append([
            _p(ev.get("kind", ""), styles["TableCellSmall"]),
            _p(ev.get("description") or "", styles["TableCellSmall"]),
            _p(ev.get("uri") or "", styles["TableCellSmall"]),
            _p(ev.get("created_at") or "", styles["TableCellSmall"]),
        ])

    table = Table(
        rows,
        colWidths=[22 * mm, 56 * mm, 68 * mm, 24 * mm],
        hAlign="LEFT",
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def generate_audit_report_pdf(report_data: Dict[str, Any]) -> bytes:
    styles = _styles()
    buffer = BytesIO()

    audit = report_data["audit"]
    summary = report_data["summary"]
    categories = report_data["categories"]
    controls = report_data["controls"]
    config = report_data["config"]
    sections = report_data["sections"]

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title=f'Informe de auditoría - {audit["name"]}',
        author=config.get("auditor_name", ""),
    )

    story = []

    # ------------------------------------------------------------------
    # Portada
    # ------------------------------------------------------------------
    story.append(Spacer(1, 24 * mm))
    story.append(Paragraph("Informe de auditoría ENS", styles["CoverTitle"]))
    story.append(Paragraph(audit["name"], styles["CoverSubtitle"]))
    story.append(Spacer(1, 8 * mm))

    story.append(
        _build_kv_table(
            [
                ["Organización", audit.get("org", "")],
                ["Categoría ENS", audit.get("ens_category", "")],
                ["Auditor responsable", config.get("auditor_name", "")],
                ["Cargo", config.get("auditor_role", "")],
                ["Fecha del informe", config.get("report_date", "")],
                ["Identificador de auditoría", audit.get("id", "")],
            ],
            styles,
        )
    )
    story.append(Spacer(1, 8 * mm))

    story.append(
        Paragraph(
            "Este documento recoge el resultado de la auditoría realizada sobre las medidas de seguridad "
            "registradas en la herramienta, incluyendo su alcance, resultados, evidencias, preguntas de "
            "verificación y conclusiones del auditor.",
            styles["BodyCustom"],
        )
    )

    story.append(Spacer(1, 18 * mm))
    story.append(
        Paragraph(
            "Clasificación del documento: Uso interno / soporte de auditoría ENS",
            styles["SmallMuted"],
        )
    )

    # ------------------------------------------------------------------
    # 1. Resumen ejecutivo
    # ------------------------------------------------------------------
    if sections.get("resumenEjecutivo"):
        story.append(PageBreak())
        story.append(Paragraph("1. Resumen ejecutivo", styles["Heading1Custom"]))
        story.append(
            Paragraph(
                f"En la auditoría del sistema <b>{audit['name']}</b>, perteneciente a "
                f"<b>{audit.get('org', '')}</b>, se han identificado "
                f"<b>{summary.get('total_applicable', 0)}</b> controles aplicables, de los cuales "
                f"<b>{summary.get('audited', 0)}</b> han sido auditados y "
                f"<b>{summary.get('non_compliant', 0)}</b> presentan resultado de no conformidad.",
                styles["BodyCustom"],
            )
        )
        story.append(Spacer(1, 6))
        story.append(_build_summary_table(summary, styles))

    # ------------------------------------------------------------------
    # 2. Alcance y objetivos
    # ------------------------------------------------------------------
    if sections.get("alcanceObjetivos"):
        story.append(PageBreak())
        story.append(Paragraph("2. Alcance y objetivos", styles["Heading1Custom"]))
        story.append(
            Paragraph(
                "El alcance de la auditoría comprende las medidas de seguridad declaradas como aplicables "
                "en la auditoría y su revisión mediante preguntas, respuestas, evidencias y observaciones registradas.",
                styles["BodyCustom"],
            )
        )

    # ------------------------------------------------------------------
    # 3. Metodología
    # ------------------------------------------------------------------
    if sections.get("metodologia"):
        story.append(PageBreak())
        story.append(Paragraph("3. Metodología", styles["Heading1Custom"]))
        story.append(
            Paragraph(
                "La metodología aplicada se basa en la revisión del alcance, análisis de controles aplicables, "
                "comprobación documental, revisión de evidencias y evaluación del estado y resultado de cada medida.",
                styles["BodyCustom"],
            )
        )

    # ------------------------------------------------------------------
    # 4. Resultados generales
    # ------------------------------------------------------------------
    if sections.get("resultadosGenerales"):
        story.append(PageBreak())
        story.append(Paragraph("4. Resultados generales", styles["Heading1Custom"]))
        story.append(_build_summary_table(summary, styles))
        story.append(Spacer(1, 10))
        story.append(Paragraph("Resultados por categoría", styles["Heading2Custom"]))
        story.append(_build_categories_table(categories, styles))

    # ------------------------------------------------------------------
    # 5. No conformidades
    # ------------------------------------------------------------------
    if sections.get("noConformidades"):
        story.append(PageBreak())
        story.append(Paragraph("5. No conformidades", styles["Heading1Custom"]))
        non_compliant = [c for c in controls if c.get("result") == "NO_CUMPLE"]

        if not non_compliant:
            story.append(Paragraph("No se han registrado no conformidades.", styles["BodyCustom"]))
        else:
            for idx, c in enumerate(non_compliant):
                if idx > 0:
                    story.append(Spacer(1, 8))
                    story.append(
                        HRFlowable(
                            width="100%",
                            thickness=0.6,
                            color=colors.HexColor("#dbe3ee"),
                            spaceBefore=0,
                            spaceAfter=8,
                        )
                    )

                story.append(_build_control_header(c, styles))
                story.append(Spacer(1, 4))
                story.append(_build_control_meta_table(c, styles))
                story.append(Spacer(1, 6))

                failed_questions = [
                    q for q in c.get("questions", [])
                    if q.get("question_compliance") == "NO_CUMPLE"
                ]

                if failed_questions:
                    story.append(Paragraph("Preguntas con incumplimiento detectado", styles["SectionLabel"]))
                    for q in failed_questions:
                        story.append(_build_question_card(q, styles))
                        story.append(Spacer(1, 6))

                evidences = c.get("evidences", [])
                story.append(Paragraph("Evidencias asociadas", styles["SectionLabel"]))
                if evidences:
                    story.append(_build_evidence_table(evidences, styles))
                else:
                    story.append(Paragraph("No hay evidencias registradas para este control.", styles["BodyCustom"]))

    # ------------------------------------------------------------------
    # 6. Detalle de controles aplicables
    # ------------------------------------------------------------------
    if sections.get("controlsPorCategoria") and config.get("include_detailed_controls"):
        story.append(PageBreak())
        story.append(Paragraph("6. Detalle de controles aplicables", styles["Heading1Custom"]))

        for idx, c in enumerate(controls):
            if idx > 0:
                story.append(Spacer(1, 6))
                story.append(
                    HRFlowable(
                        width="100%",
                        thickness=0.7,
                        color=colors.HexColor("#dbe3ee"),
                        spaceBefore=0,
                        spaceAfter=9,
                    )
                )

            story.append(_build_control_header(c, styles))
            story.append(Spacer(1, 4))
            story.append(_build_control_meta_table(c, styles))
            story.append(Spacer(1, 7))

            # Preguntas y respuestas en formato ficha, no tabla
            questions = c.get("questions", [])
            story.append(Paragraph("Preguntas y respuestas", styles["SectionLabel"]))

            if questions:
                for q in questions:
                    story.append(_build_question_card(q, styles))
                    story.append(Spacer(1, 6))
            else:
                story.append(Paragraph("No hay preguntas registradas para este control.", styles["BodyCustom"]))

            # Evidencias
            if config.get("include_evidence"):
                story.append(Spacer(1, 2))
                story.append(Paragraph("Evidencias", styles["SectionLabel"]))
                evidences = c.get("evidences", [])

                if evidences:
                    story.append(_build_evidence_table(evidences, styles))
                else:
                    story.append(Paragraph("No hay evidencias registradas para este control.", styles["BodyCustom"]))

            story.append(Spacer(1, 12))

    # ------------------------------------------------------------------
    # 7. Conclusiones
    # ------------------------------------------------------------------
    if sections.get("conclusiones"):
        story.append(PageBreak())
        story.append(Paragraph("7. Conclusiones", styles["Heading1Custom"]))
        story.append(
            Paragraph(
                config.get("observations") or "No se han añadido observaciones finales.",
                styles["BodyCustom"],
            )
        )

    doc.build(story, onFirstPage=_draw_header_footer, onLaterPages=_draw_header_footer)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def _draw_header_footer(canvas, doc):
    canvas.saveState()

    width, height = A4

    # Header
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, height - 15 * mm, width - doc.rightMargin, height - 15 * mm)

    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(doc.leftMargin, height - 12 * mm, "ENS Audit Tool - Informe de auditoría")

    # Footer
    canvas.line(doc.leftMargin, 12 * mm, width - doc.rightMargin, 12 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(doc.leftMargin, 8 * mm, "Documento generado automáticamente")

    page_num = canvas.getPageNumber()
    canvas.drawRightString(width - doc.rightMargin, 8 * mm, f"Página {page_num}")

    canvas.restoreState()
