from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT


def _format_date(dt):
    if dt is None:
        return ""
    if isinstance(dt, datetime):
        return dt.strftime("%d-%b-%Y %I:%M %p")
    return str(dt)


def build_purchase_order_pdf(transaction, store_name=None):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=16,
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    elements = []

    elements.append(Paragraph("PURCHASE ORDER", title_style))
    elements.append(Spacer(1, 4 * mm))

    if store_name:
        elements.append(Paragraph(store_name, styles["Normal"]))
        elements.append(Spacer(1, 2 * mm))

    elements.append(Paragraph(f"<b>Customer:</b> {transaction.customer_name}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Date:</b> {_format_date(transaction.date)}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Order No:</b> #{transaction.id}", styles["Normal"]))
    elements.append(Spacer(1, 6 * mm))

    products = transaction.products or []
    table_data = [["No.", "Product", "Weight/Qty", "Rate", "Amount"]]
    for i, p in enumerate(products, 1):
        name = p.get("productName") or "-"
        weight = p.get("weight")
        weight_str = f"{weight}" if weight is not None else "-"
        try:
            rate = p.get("rate")
            rate_str = f"{float(rate):.2f}" if rate is not None else "-"
        except (TypeError, ValueError):
            rate_str = "-"
        try:
            total = p.get("total")
            total_str = f"{float(total):.2f}" if total is not None else "-"
        except (TypeError, ValueError):
            total_str = "-"
        table_data.append([str(i), name, weight_str, rate_str, total_str])

    t = Table(table_data, colWidths=[25, 120, 55, 55, 60])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    elements.append(t)
    elements.append(Spacer(1, 6 * mm))

    grand = transaction.grand_total or 0
    paid = transaction.paid_amount or 0
    due = transaction.due_amount or 0
    summary_data = [
        ["Grand Total", f"₹ {grand:.2f}"],
        ["Paid", f"₹ {paid:.2f}"],
        ["Due", f"₹ {due:.2f}"],
    ]
    summary_table = Table(summary_data, colWidths=[100, 80])
    summary_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(summary_table)
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
