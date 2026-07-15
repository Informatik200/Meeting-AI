import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PDF_LABELS = {
    "en": {
        "title": "Meeting Notes",
        "date": "Date",
        "status": "Status",
        "summary": "Summary",
        "key_points": "Key Points",
        "decisions": "Decisions",
        "action_items": "Action Items",
        "transcript": "Full Transcript",
        "task": "Task",
        "owner": "Owner",
        "due": "Due",
        "not_specified": "Not specified",
        "no_action_items": "No action items captured.",
        "none_captured": "None captured",
    },
    "de": {
        "title": "Meeting-Notizen",
        "date": "Datum",
        "status": "Status",
        "summary": "Zusammenfassung",
        "key_points": "Wichtige Punkte",
        "decisions": "Entscheidungen",
        "action_items": "Aufgaben",
        "transcript": "Vollständiges Transkript",
        "task": "Aufgabe",
        "owner": "Verantwortlicher",
        "due": "Fällig",
        "not_specified": "Nicht angegeben",
        "no_action_items": "Keine Aufgaben erfasst.",
        "none_captured": "Keine erfasst",
    },
}


class NumberedCanvas(canvas.Canvas):
    """Canvas implementation for two-pass page numbering ('Page X of Y')."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#555555"))
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, page_text)

        # Add a subtle footer line
        self.setStrokeColor(colors.HexColor("#dfe4dc"))
        self.setLineWidth(0.5)
        self.line(54, 50, letter[0] - 54, 50)
        self.restoreState()


def generate_pdf(meeting_dict: dict, lang: str = "en") -> bytes:
    """
    Generates a professional PDF document from a meeting dictionary.
    Returns the raw bytes of the PDF.
    """
    labels = PDF_LABELS.get(lang, PDF_LABELS["en"])

    # Setup document in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,  # 0.75 in
        rightMargin=54,
        topMargin=54,
        bottomMargin=64,
    )

    # Styles
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "PDFTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#192824"),
        spaceAfter=15,
    )

    section_heading_style = ParagraphStyle(
        "PDFSectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#246251"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "PDFBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#222222"),
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "PDFBullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#222222"),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4,
    )

    metadata_label_style = ParagraphStyle(
        "PDFMetadataLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#6c7872"),
    )

    metadata_val_style = ParagraphStyle(
        "PDFMetadataVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#192824"),
    )

    story = []

    # Title
    story.append(Paragraph(meeting_dict.get("title") or "Untitled Meeting", title_style))

    # Metadata Table
    created_at_str = meeting_dict.get("created_at")
    date_formatted = ""
    if created_at_str:
        try:
            dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            date_formatted = dt.strftime("%b %d, %Y · %H:%M UTC")
        except Exception:
            date_formatted = created_at_str

    metadata_data = [
        [Paragraph(f"{labels['date']}:", metadata_label_style), Paragraph(date_formatted, metadata_val_style)],
        [
            Paragraph(f"{labels['status']}:", metadata_label_style),
            Paragraph(meeting_dict.get("status", "").capitalize(), metadata_val_style),
        ],
    ]
    meta_table = Table(metadata_data, colWidths=[60, 444])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # Summary
    story.append(Paragraph(labels["summary"], section_heading_style))
    summary_text = meeting_dict.get("summary")
    if not summary_text:
        if meeting_dict.get("status") == "failed":
            summary_text = labels["processingFailed"]
        else:
            summary_text = labels["processingStatus"]
    story.append(Paragraph(summary_text, body_style))

    # Key Points
    story.append(Paragraph(labels["key_points"], section_heading_style))
    key_points = meeting_dict.get("key_points") or []
    if key_points:
        for kp in key_points:
            story.append(Paragraph(f"&bull;&nbsp;&nbsp;{kp}", bullet_style))
    else:
        story.append(Paragraph(labels["none_captured"], body_style))

    # Decisions
    story.append(Paragraph(labels["decisions"], section_heading_style))
    decisions = meeting_dict.get("decisions") or []
    if decisions:
        for d in decisions:
            story.append(Paragraph(f"&bull;&nbsp;&nbsp;{d}", bullet_style))
    else:
        story.append(Paragraph(labels["none_captured"], body_style))

    # Action Items
    story.append(Paragraph(labels["action_items"], section_heading_style))
    action_items = meeting_dict.get("action_items") or []
    if action_items:
        table_style = TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f4f4f4")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#192824")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe4dc")),
            ]
        )

        # Table content
        table_data = [
            [
                Paragraph(labels["task"], metadata_label_style),
                Paragraph(labels["owner"], metadata_label_style),
                Paragraph(labels["due"], metadata_label_style),
            ]
        ]

        for item in action_items:
            task_text = item.get("task", "")
            owner_text = item.get("owner") or labels["not_specified"]
            due_text = item.get("due") or labels["not_specified"]

            table_data.append(
                [Paragraph(task_text, body_style), Paragraph(owner_text, body_style), Paragraph(due_text, body_style)]
            )

        action_table = Table(table_data, colWidths=[280, 112, 112])
        action_table.setStyle(table_style)
        story.append(action_table)
    else:
        story.append(Paragraph(labels["no_action_items"], body_style))

    # Full Transcript
    transcript_text = meeting_dict.get("transcript")
    if transcript_text:
        story.append(Paragraph(labels["transcript"], section_heading_style))
        story.append(Paragraph(transcript_text, body_style))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
