from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# ── Brand palette ──────────────────────────────────────────────────────────────
DARK  = colors.HexColor("#1A1A2E")   # deep navy
GOLD  = colors.HexColor("#C9A84C")   # warm gold
LIGHT = colors.HexColor("#F5F0E8")   # cream – alt row
WHITE = colors.white
GREEN = colors.HexColor("#1B6B3A")
RED   = colors.HexColor("#C0392B")
GREY  = colors.HexColor("#555555")
LGREY = colors.HexColor("#AAAAAA")

PAGE_W, PAGE_H = A4
LM = RM = 18 * mm
TM = BM = 14 * mm
USABLE_W = PAGE_W - LM - RM


def _fmt_date(dt):
    if dt is None:
        return ""
    if isinstance(dt, datetime):
        return dt.strftime("%d %b %Y")
    return str(dt)


def _fmt_time(dt):
    if isinstance(dt, datetime):
        return dt.strftime("%I:%M %p")
    return ""


def _inr(val):
    try:
        return f"₹ {float(val or 0):,.2f}"
    except (TypeError, ValueError):
        return "₹ 0.00"


def _num(val, d=3):
    try:
        return f"{float(val or 0):.{d}f}"
    except (TypeError, ValueError):
        return "-"


def _sty(name, **kw):
    base = getSampleStyleSheet()["Normal"]
    return ParagraphStyle(name, parent=base, **kw)


# ── keep old signature working (store_name kwarg) ─────────────────────────────
def build_purchase_order_pdf(transaction, store=None, store_name=None):
    """Professional jewellery purchase-order / tax-invoice PDF."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=RM, leftMargin=LM,
                            topMargin=TM, bottomMargin=BM)

    # store info
    s_name    = (store.name if store else None) or store_name or "Jewellery Store"
    s_address = (store.address if store else None) or ""
    s_phone   = (store.contact_phone if store else None) or ""
    s_email   = (store.owner_email if store else None) or ""
    s_gstin   = (store.gstin if store else None) or ""

    # transaction info
    t            = transaction
    inv_no       = t.invoice_number or f"#{t.id}"
    bill_type    = (t.bill_type or "Purchase Order").upper()
    pay_mode     = (t.payment_mode or "").capitalize()
    cust_name    = t.customer_name or "-"
    cust_gstin   = t.customer_gstin or ""
    products     = t.products or []
    grand_total  = float(t.grand_total or 0)
    paid_amount  = float(t.paid_amount or 0)
    due_amount   = float(t.due_amount or 0)
    gst_computed = bool(t.gst_computed)
    taxable_val  = float(t.taxable_value or 0)
    making_chg   = float(t.making_charges or 0)
    cgst         = float(t.cgst_amount or 0)
    sgst         = float(t.sgst_amount or 0)
    igst         = float(t.igst_amount or 0)
    m_cgst       = float(t.making_cgst or 0)
    m_sgst       = float(t.making_sgst or 0)
    m_igst       = float(t.making_igst or 0)
    is_tax_inv   = gst_computed and bool(t.hsn_code)

    title_label = "TAX INVOICE" if is_tax_inv else "PURCHASE ORDER"
    elements = []

    # ── 1. Header ─────────────────────────────────────────────────────────
    store_cells = [
        Paragraph(s_name, _sty("SN", fontSize=16, fontName="Helvetica-Bold",
                                textColor=DARK, spaceAfter=2)),
    ]
    if s_address:
        store_cells.append(Paragraph(s_address, _sty("SA", fontSize=8,
                                                      textColor=GREY, spaceAfter=1)))
    contacts = []
    if s_phone: contacts.append(f"Ph: {s_phone}")
    if s_email: contacts.append(s_email)
    if contacts:
        store_cells.append(Paragraph("  |  ".join(contacts),
                                     _sty("SC", fontSize=8, textColor=GREY, spaceAfter=1)))
    if s_gstin:
        store_cells.append(Paragraph(f"GSTIN: {s_gstin}",
                                     _sty("SG", fontSize=8, textColor=GREY)))

    meta_cells = [
        Paragraph(title_label, _sty("TL", fontSize=18, fontName="Helvetica-Bold",
                                    textColor=GOLD, alignment=TA_RIGHT, spaceAfter=4)),
        Paragraph(f"<b>Invoice No:</b>  {inv_no}",
                  _sty("M1", fontSize=9, alignment=TA_RIGHT, textColor=DARK, spaceAfter=2)),
        Paragraph(f"<b>Date:</b>  {_fmt_date(t.date)}",
                  _sty("M2", fontSize=9, alignment=TA_RIGHT, textColor=DARK, spaceAfter=2)),
        Paragraph(f"<b>Time:</b>  {_fmt_time(t.date)}",
                  _sty("M3", fontSize=9, alignment=TA_RIGHT, textColor=DARK, spaceAfter=2)),
        Paragraph(f"<b>Type:</b>  {bill_type}",
                  _sty("M4", fontSize=9, alignment=TA_RIGHT, textColor=DARK)),
    ]
    if pay_mode:
        meta_cells.append(Paragraph(f"<b>Payment:</b>  {pay_mode}",
                                    _sty("M5", fontSize=9, alignment=TA_RIGHT,
                                         textColor=DARK, spaceBefore=2)))

    hdr = Table([[store_cells, meta_cells]],
                colWidths=[USABLE_W * 0.55, USABLE_W * 0.45])
    hdr.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (0, 0),   0),
        ("RIGHTPADDING", (-1, 0), (-1, 0), 0),
    ]))
    elements.append(hdr)
    elements.append(Spacer(1, 3 * mm))
    elements.append(HRFlowable(width="100%", thickness=2, color=GOLD, spaceAfter=4 * mm))

    # ── 2. Bill-To ────────────────────────────────────────────────────────
    elements.append(Paragraph("BILL TO",
                               _sty("BT", fontSize=7, fontName="Helvetica-Bold",
                                    textColor=GOLD, spaceAfter=2)))
    elements.append(Paragraph(cust_name,
                               _sty("CN", fontSize=12, fontName="Helvetica-Bold",
                                    textColor=DARK, spaceAfter=2)))
    if cust_gstin:
        elements.append(Paragraph(f"GSTIN: {cust_gstin}",
                                   _sty("CG", fontSize=8, textColor=GREY)))
    elements.append(Spacer(1, 4 * mm))

    # ── 3. Products table ────────────────────────────────────────────────
    col_w = [12*mm, 52*mm, 22*mm, 22*mm, 22*mm, 22*mm, 22*mm]

    def th(text, align=TA_LEFT):
        return Paragraph(text, _sty(f"th{text}", fontSize=8,
                                     fontName="Helvetica-Bold",
                                     textColor=WHITE, alignment=align))

    rows = [[
        th("No.",    TA_CENTER),
        th("Description"),
        th("Metal",  TA_CENTER),
        th("Wt (g)", TA_RIGHT),
        th("Rate/g", TA_RIGHT),
        th("Making", TA_RIGHT),
        th("Amount", TA_RIGHT),
    ]]

    for i, p in enumerate(products, 1):
        name   = p.get("productName") or "-"
        metal  = (p.get("metalType") or "").capitalize()
        weight = p.get("weight")
        rate   = p.get("rate")
        making = p.get("makingCharge")
        diamond= p.get("diamondCharge")
        total_p= p.get("total")
        qty    = p.get("qty")

        desc = name
        extras = []
        if qty and float(qty or 1) != 1:
            extras.append(f"Qty: {qty}")
        if diamond and float(diamond or 0) > 0:
            extras.append(f"Diamond: {_inr(diamond)}")
        if extras:
            desc += "\n" + "  •  ".join(extras)

        def td(text, align=TA_LEFT, bold=False):
            fn = "Helvetica-Bold" if bold else "Helvetica"
            return Paragraph(text, _sty(f"td{i}{text[:4]}", fontSize=8,
                                         fontName=fn, textColor=DARK, alignment=align))

        rows.append([
            td(str(i),        TA_CENTER),
            td(desc),
            td(metal,         TA_CENTER),
            td(_num(weight),  TA_RIGHT),
            td(_inr(rate),    TA_RIGHT),
            td(_inr(making),  TA_RIGHT),
            td(_inr(total_p), TA_RIGHT, bold=True),
        ])

    pt = Table(rows, colWidths=col_w, repeatRows=1)
    pt.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),   DARK),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1),  [LIGHT, WHITE]),
        ("TOPPADDING",    (0, 0), (-1, -1),  5),
        ("BOTTOMPADDING", (0, 0), (-1, -1),  5),
        ("LEFTPADDING",   (0, 0), (-1, -1),  5),
        ("RIGHTPADDING",  (0, 0), (-1, -1),  5),
        ("VALIGN",        (0, 0), (-1, -1),  "MIDDLE"),
        ("LINEBELOW",     (0, 0), (-1, 0),   1,   GOLD),
        ("LINEBELOW",     (0, 1), (-1, -1),  0.3, LGREY),
        ("BOX",           (0, 0), (-1, -1),  1,   GOLD),
    ]))
    elements.append(pt)
    elements.append(Spacer(1, 5 * mm))

    # ── 4. Summary / GST ────────────────────────────────────────────────
    right_w  = USABLE_W * 0.52
    label_w  = right_w * 0.56
    val_w    = right_w * 0.44

    def srow(label, value, bold=False, color=DARK):
        fn = "Helvetica-Bold" if bold else "Helvetica"
        fs = 9 if bold else 8
        return [
            Paragraph(label, _sty(f"sl{label[:6]}", fontSize=fs, fontName=fn,
                                   textColor=color, alignment=TA_RIGHT)),
            Paragraph(value, _sty(f"sv{label[:6]}", fontSize=fs, fontName=fn,
                                   textColor=color, alignment=TA_RIGHT)),
        ]

    sum_rows = []
    if gst_computed:
        sum_rows.append(srow("Taxable Value:", _inr(taxable_val)))
        if making_chg > 0:
            sum_rows.append(srow("Making Charges:", _inr(making_chg)))
        total_cgst = cgst + m_cgst
        total_sgst = sgst + m_sgst
        total_igst = igst + m_igst
        if t.is_interstate:
            if total_igst > 0:
                sum_rows.append(srow(f"IGST ({t.tax_rate}%):", _inr(total_igst)))
        else:
            if total_cgst > 0:
                sum_rows.append(srow(f"CGST ({t.tax_rate/2:.1f}%):", _inr(total_cgst)))
            if total_sgst > 0:
                sum_rows.append(srow(f"SGST ({t.tax_rate/2:.1f}%):", _inr(total_sgst)))
        total_gst = total_cgst + total_sgst + total_igst
        if total_gst > 0:
            sum_rows.append(srow("Total GST:", _inr(total_gst), bold=True))

    sum_rows.append(srow("Grand Total:", _inr(grand_total), bold=True))
    sum_rows.append(srow("Amount Paid:", _inr(paid_amount), bold=True, color=GREEN))
    sum_rows.append(srow("Balance Due:", _inr(due_amount),  bold=True,
                          color=RED if due_amount > 0 else GREY))

    # figure out separator row index (before Grand Total)
    gt_idx = len(sum_rows) - 3

    st = Table(sum_rows, colWidths=[label_w, val_w])
    ts = [
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("LINEABOVE",     (0, 0), (-1, 0),  0.5, GOLD),
        ("LINEBELOW",     (0, -1), (-1, -1), 1,  GOLD),
    ]
    if gt_idx >= 0:
        ts.append(("LINEABOVE", (0, gt_idx), (-1, gt_idx), 0.8, LGREY))
    st.setStyle(TableStyle(ts))

    layout = Table([["", st]], colWidths=[USABLE_W - right_w, right_w])
    layout.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    elements.append(layout)

    # ── 5. Payment badge ──────────────────────────────────────────────────
    elements.append(Spacer(1, 4 * mm))
    if due_amount <= 0:
        badge_txt, badge_col = "✓  FULLY PAID", GREEN
    elif paid_amount <= 0:
        badge_txt, badge_col = "PAYMENT PENDING", RED
    else:
        badge_txt, badge_col = "PARTIALLY PAID", colors.HexColor("#E67E22")

    badge = Table(
        [[Paragraph(badge_txt, _sty("BDG", fontSize=9, fontName="Helvetica-Bold",
                                     textColor=WHITE, alignment=TA_CENTER))]],
        colWidths=[52 * mm],
    )
    badge.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), badge_col),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(badge)

    # ── 6. Footer ─────────────────────────────────────────────────────────
    elements.append(Spacer(1, 8 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=GOLD, spaceAfter=4 * mm))

    footer_l = [
        Paragraph("Terms & Conditions",
                  _sty("FTH", fontSize=7, fontName="Helvetica-Bold",
                       textColor=GREY, spaceAfter=2)),
        Paragraph("• All disputes subject to local jurisdiction.",
                  _sty("FT1", fontSize=7, textColor=LGREY, spaceAfter=1)),
        Paragraph("• Goods once sold will not be taken back.",
                  _sty("FT2", fontSize=7, textColor=LGREY, spaceAfter=1)),
        Paragraph("• This is a computer-generated document.",
                  _sty("FT3", fontSize=7, textColor=LGREY)),
    ]
    footer_r = [
        Paragraph("Thank you for your business!",
                  _sty("FRH", fontSize=9, fontName="Helvetica-Bold",
                       textColor=GOLD, alignment=TA_RIGHT, spaceAfter=8)),
        Paragraph(s_name,
                  _sty("FRN", fontSize=8, fontName="Helvetica-Bold",
                       textColor=DARK, alignment=TA_RIGHT, spaceAfter=2)),
        Paragraph("Authorised Signatory",
                  _sty("FRS", fontSize=7, textColor=LGREY, alignment=TA_RIGHT)),
    ]
    ft = Table([[footer_l, footer_r]],
               colWidths=[USABLE_W * 0.55, USABLE_W * 0.45])
    ft.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING",   (0, 0), (0, 0),   0),
        ("RIGHTPADDING",  (-1, 0), (-1, 0), 0),
    ]))
    elements.append(ft)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
