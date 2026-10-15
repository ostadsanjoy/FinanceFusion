import csv
import hashlib
import io
import re
from collections import defaultdict
from datetime import datetime

import openpyxl
import pdfplumber
from pdfminer.pdfdocument import PDFPasswordIncorrect


class StatementError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


DATE_PATTERNS = [
    (re.compile(r"^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ,]+(\d{2,4})"), "named"),
    (re.compile(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})"), "numeric"),
    (re.compile(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})"), "iso"),
]

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

NUMBER_RE = re.compile(r"^\(?-?[\d,]+(\.\d+)?\)?(Dr|Cr|DR|CR)?$")

BANKS = [
    ("Jio Payments Bank", r"jio\s*payments\s*bank"),
    ("State Bank of India", r"state\s*bank\s*of\s*india|\bsbin\d"),
    ("HDFC Bank", r"hdfc\s*bank"),
    ("ICICI Bank", r"icici\s*bank"),
    ("Axis Bank", r"axis\s*bank"),
    ("Kotak Mahindra Bank", r"kotak\s*mahindra"),
    ("Punjab National Bank", r"punjab\s*national\s*bank"),
    ("Bank of Baroda", r"bank\s*of\s*baroda"),
    ("Canara Bank", r"canara\s*bank"),
    ("Union Bank of India", r"union\s*bank\s*of\s*india"),
    ("IDFC FIRST Bank", r"idfc\s*first"),
    ("Yes Bank", r"yes\s*bank"),
    ("IndusInd Bank", r"indusind"),
    ("Paytm Payments Bank", r"paytm\s*payments\s*bank"),
    ("Airtel Payments Bank", r"airtel\s*payments\s*bank"),
    ("India Post Payments Bank", r"india\s*post\s*payments"),
    ("Federal Bank", r"federal\s*bank"),
    ("Bank of India", r"bank\s*of\s*india"),
]

STOP_TOKENS = {
    "UPI", "DR", "CR", "P2A", "P2M", "P2P", "TO", "BY", "TRANSFER", "NEFT", "IMPS", "RTGS",
    "PAYMENT", "PAY", "DEBIT", "CREDIT", "TRF", "FROM", "ACH", "ECS", "NACH", "MOB", "INB",
    "TPT", "BIL", "ONL", "NET", "MB", "OTHERS", "SELF", "REF", "NO", "THROUGH", "ACH D", "ACH C", "D", "C",
}

CHARGE_WORDS = ("charges", "cgst", "sgst", "igst", "gst on", "service tax", "annual fee", "amc ", "min bal", "penalty")


def _classify_header(text):
    t = re.sub(r"[^a-z]", "", text.lower())
    if not t:
        return None
    if t.startswith("withdraw") or t.startswith("debit") or t in ("dr", "paidout", "moneyout"):
        return "debit"
    if t.startswith("deposit") or t.startswith("credit") or t in ("cr", "paidin", "moneyin"):
        return "credit"
    if t in ("balance", "closingbalance", "bal", "runningbalance") or t.startswith("closingbal"):
        return "balance"
    if t in ("narration", "description", "particulars", "details", "remarks", "transactiondetails", "transactionremarks", "transactiondescription"):
        return "narration"
    if t in ("amount", "txnamount", "transactionamount"):
        return "amount"
    if t in ("date", "txndate", "transactiondate", "postingdate", "tran date", "trandate"):
        return "date"
    return None


def _parse_date_prefix(text):
    text = text.strip()
    for pattern, kind in DATE_PATTERNS:
        m = pattern.match(text)
        if not m:
            continue
        try:
            if kind == "named":
                day, mon, year = int(m.group(1)), MONTHS.get(m.group(2)[:3].lower()), int(m.group(3))
                if not mon:
                    continue
            elif kind == "numeric":
                day, mon, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            else:
                year, mon, day = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if year < 100:
                year += 2000
            return datetime(year, mon, day), m.end()
        except ValueError:
            continue
    return None, 0


def _parse_amount(text):
    if text is None:
        return None, None
    s = str(text).strip().replace("₹", "").replace("Rs.", "").replace("INR", "").replace(" ", "")
    if not s or not NUMBER_RE.match(s):
        return None, None
    flag = None
    if s[-2:].lower() in ("dr", "cr"):
        flag = s[-2:].lower()
        s = s[:-2]
    negative = s.startswith("(") or s.startswith("-")
    s = s.strip("()-").replace(",", "")
    try:
        value = float(s)
    except ValueError:
        return None, None
    return (-value if negative else value), flag


def _title_case(name):
    name = re.sub(r"\s+", " ", name).strip(" /-_.,")
    if not name:
        return name
    return " ".join(w.capitalize() if w.isupper() or w.islower() else w for w in name.split(" "))


def _is_ref_token(tok):
    digits = sum(c.isdigit() for c in tok)
    if digits >= 6:
        return True
    if "@" in tok:
        return True
    if re.fullmatch(r"[A-Za-z]{4}0[A-Za-z0-9]{6}", tok):
        return True
    if re.fullmatch(r"[A-Za-z]{4}\d*", tok) and tok.upper() == tok and len(tok) <= 5 and tok.upper() not in STOP_TOKENS and len(tok) == 4:
        return True
    return False


def _first_name_token(tokens):
    for tok in tokens:
        t = tok.strip()
        if not t or t.upper() in STOP_TOKENS or _is_ref_token(t):
            continue
        letters = sum(c.isalpha() for c in t)
        if letters >= 3 and letters >= len(t) * 0.5:
            return t
    return None


def clean_narration(raw):
    text = re.sub(r"\s+", " ", raw or "").strip()
    if not text:
        return "Unknown", "OTHER"
    low = text.lower()

    if any(w in low for w in CHARGE_WORDS):
        return "Bank charges", "CHARGES"
    if re.search(r"\b(int\.?\s*pd|interest|int pd)\b", low):
        return "Bank interest", "INTEREST"
    if re.search(r"\batm\b|\bnfs\b|cash\s*w(i)?th?dr|cash wdl|\bcwdr\b", low):
        return "ATM cash withdrawal", "ATM"

    if "upi" in low:
        if "/" in text:
            parts = [p.strip() for p in text.split("/")]
            idx = next((i for i, p in enumerate(parts) if p.isdigit() and len(p) >= 8), None)
            candidates = parts[idx + 1:] if idx is not None else parts
        else:
            parts = [p.strip() for p in text.split("-")]
            idx = next((i for i, p in enumerate(parts) if p.upper() == "UPI"), 0)
            candidates = parts[idx + 1:]
        name = _first_name_token(candidates)
        if name:
            return _title_case(name), "UPI"

    for method in ("NEFT", "IMPS", "RTGS"):
        if method.lower() in low:
            parts = [p.strip() for p in re.split(r"[/\-]", text)]
            name = _first_name_token(parts)
            if name:
                return _title_case(name), method

    if re.search(r"\b(ach|ecs|nach|si)\b", low):
        parts = [p.strip() for p in re.split(r"[/\-]", text)]
        name = _first_name_token(parts)
        if name:
            return _title_case(name), "AUTOPAY"

    if re.search(r"\b(pos|ecom|pur|purchase)\b", low):
        cleaned = re.sub(r"\b(pos|ecom|pur|purchase)\b", " ", text, flags=re.I)
        cleaned = re.sub(r"\b\d[\dxX*]{5,}\b", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" /-")
        if cleaned:
            return _title_case(cleaned[:40]), "CARD"

    parts = [p.strip() for p in re.split(r"[/\-]", text)]
    name = _first_name_token(parts)
    if name:
        return _title_case(name[:40]), "OTHER"
    return _title_case(text[:40]), "OTHER"


def _item_id(date, amount, narration, seen):
    base = f"{date.date().isoformat()}|{amount:.2f}|{narration}"
    seen[base] += 1
    return hashlib.sha1(f"{base}|{seen[base]}".encode()).hexdigest()[:16]


def _finalize(entries):
    seen = defaultdict(int)
    items = []
    for e in entries:
        name, method = clean_narration(e["narration"])
        items.append(
            {
                "id": _item_id(e["date"], e["amount"], e["narration"], seen),
                "date": e["date"].date().isoformat(),
                "amount": round(e["amount"], 2),
                "name": name,
                "method": method,
                "narration": e["narration"],
            }
        )
    return items


def _detect_bank(text):
    for label, pattern in BANKS:
        if re.search(pattern, text, flags=re.I):
            return label
    return None


def _group_lines(words, tolerance=3):
    lines = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if lines and abs(lines[-1]["top"] - w["top"]) <= tolerance:
            lines[-1]["words"].append(w)
        else:
            lines.append({"top": w["top"], "words": [w]})
    for ln in lines:
        ln["words"].sort(key=lambda w: w["x0"])
    return lines


def _find_header(lines):
    for i, ln in enumerate(lines):
        kinds = {_classify_header(w["text"]) for w in ln["words"]}
        if not (("debit" in kinds or "amount" in kinds) and ("balance" in kinds or "credit" in kinds)):
            continue
        block = [ln]
        for j in (i - 1, i + 1, i + 2):
            if 0 <= j < len(lines) and abs(lines[j]["top"] - ln["top"]) <= 22:
                block.append(lines[j])
        cols = _columns_from_block(block)
        if "narration_x0" in cols and "date_x0" in cols:
            return i, block
    return None, None


def _columns_from_block(block):
    cols = {}
    for ln in block:
        for w in ln["words"]:
            kind = _classify_header(w["text"])
            if not kind:
                continue
            center = (w["x0"] + w["x1"]) / 2
            if kind == "date":
                cols.setdefault("date_x0", w["x0"])
                cols["date_x0"] = min(cols["date_x0"], w["x0"])
            elif kind == "narration":
                cols.setdefault("narration_x0", w["x0"])
            elif kind not in cols:
                cols[kind] = center
    return cols


def _page_entries(page, state):
    words = page.extract_words(x_tolerance=1.5, y_tolerance=2, keep_blank_chars=False)
    lines = _group_lines(words)

    header_idx, block = _find_header(lines)
    if header_idx is not None:
        cols = _columns_from_block(block)
        if ("debit" in cols or "amount" in cols) and "narration_x0" in cols:
            state["cols"] = cols
            block_ids = {id(b) for b in block}
            body = [ln for ln in lines if ln["top"] > max(b["top"] for b in block) + 1 and id(ln) not in block_ids]
        else:
            body = lines if state.get("cols") else []
    else:
        body = lines if state.get("cols") else []

    cols = state.get("cols")
    if not cols:
        return []

    number_cols = {k: cols[k] for k in ("debit", "credit", "balance", "amount") if k in cols}
    amount_left = min(number_cols.values()) - 38
    narr_left = cols["narration_x0"] - 3
    date_right = narr_left
    rows = []
    current = None
    prev_top = None
    for ln in body:
        date_words = [w for w in ln["words"] if w["x0"] < date_right]
        date_text = " ".join(w["text"] for w in date_words)
        parsed_date, _ = _parse_date_prefix(date_text)
        has_narr = any(narr_left <= w["x0"] < amount_left + 20 for w in ln["words"])
        has_num = any(
            w["x0"] >= amount_left + 20 and _parse_amount(w["text"])[0] is not None for w in ln["words"]
        )
        if parsed_date is not None:
            current = {"date": parsed_date, "narr_lines": [], "nums": {}}
            rows.append(current)
            prev_top = ln["top"]
        elif current is not None and prev_top is not None and ln["top"] - prev_top <= 16 and (has_narr or has_num):
            prev_top = ln["top"]
        else:
            current = None
            prev_top = None
            continue

        narr_words = [
            w for w in ln["words"] if narr_left <= w["x0"] < amount_left + 20 and w["x1"] <= amount_left + 45
        ]
        if narr_words:
            current["narr_lines"].append(narr_words)

        for w in ln["words"]:
            if w["x0"] < amount_left + 20:
                continue
            value, flag = _parse_amount(w["text"])
            if value is None:
                continue
            center = (w["x0"] + w["x1"]) / 2
            kind = min(number_cols, key=lambda k: abs(number_cols[k] - center))
            current["nums"][kind] = (value, flag)

    line_ends = [nl[-1]["x1"] for r in rows for nl in r["narr_lines"][:-1]]
    wrap_limit = (max(line_ends) - 12) if line_ends else amount_left - 22
    lens = [len(" ".join(w["text"] for w in nl)) for r in rows for nl in r["narr_lines"][:-1]]
    cap = None
    if lens:
        top_len = max(set(lens), key=lens.count)
        if lens.count(top_len) / len(lens) >= 0.6 and top_len >= 20:
            cap = top_len

    entries = []
    for row in rows:
        text = ""
        prev_wrapped = False
        for nl in row["narr_lines"]:
            piece = " ".join(w["text"] for w in nl)
            if text:
                text += piece if prev_wrapped else " " + piece
            else:
                text = piece
            if cap is not None:
                prev_wrapped = len(piece) >= cap
            else:
                prev_wrapped = nl[-1]["x1"] >= wrap_limit
        entries.append({"date": row["date"], "narration": text.strip(), "nums": row["nums"]})
    return entries


def _entries_to_debits(raw_entries):
    debits = []
    prev_balance = None
    for e in raw_entries:
        nums = e["nums"]
        balance = nums.get("balance", (None, None))[0]
        amount = None
        if "debit" in nums or "credit" in nums:
            d = nums.get("debit", (0.0, None))[0] or 0.0
            c = nums.get("credit", (0.0, None))[0] or 0.0
            if d > 0 and c <= 0:
                amount = d
            elif d <= 0 and c <= 0 and prev_balance is not None and balance is not None and balance < prev_balance - 0.005:
                amount = round(prev_balance - balance, 2)
        elif "amount" in nums:
            value, flag = nums["amount"]
            if flag == "dr":
                amount = abs(value)
            elif flag == "cr":
                amount = None
            elif value < 0:
                amount = abs(value)
            elif prev_balance is not None and balance is not None:
                amount = value if balance < prev_balance else None
        if balance is not None:
            prev_balance = balance
        if amount and amount > 0:
            debits.append({"date": e["date"], "amount": amount, "narration": e["narration"]})
    return debits


def _open_pdf(content, password):
    try:
        return pdfplumber.open(io.BytesIO(content), password=password or None)
    except Exception as exc:
        inner = exc.args[0] if exc.args else exc
        if isinstance(exc, PDFPasswordIncorrect) or isinstance(inner, PDFPasswordIncorrect):
            if password:
                raise StatementError("PASSWORD_INCORRECT", "That password didn't unlock the PDF. Please try again.")
            raise StatementError("PASSWORD_REQUIRED", "This PDF is password protected. Enter its password to continue.")
        raise StatementError("UNREADABLE", "Couldn't read this PDF. Make sure it's a bank statement downloaded from your bank.")


def parse_pdf_statement(content, password=None):
    pdf = _open_pdf(content, password)
    raw = []
    bank = None
    state = {}
    try:
        for index, page in enumerate(pdf.pages):
            if index == 0:
                bank = _detect_bank(page.extract_text() or "")
            raw.extend(_page_entries(page, state))
    finally:
        pdf.close()
    if not raw:
        raise StatementError(
            "NO_TRANSACTIONS",
            "No transaction table was recognised in this PDF. It may be a scanned image or an unsupported layout.",
        )
    return bank, _finalize(_entries_to_debits(raw)), len(raw)


def _table_rows_to_debits(rows):
    header_idx, cols = None, {}
    for i, row in enumerate(rows[:40]):
        found = {}
        for j, cell in enumerate(row):
            kind = _classify_header(str(cell)) if cell is not None else None
            if kind and kind not in found:
                found[kind] = j
        if "date" in found and "narration" in found and ("debit" in found or "amount" in found):
            header_idx, cols = i, found
            break
    if header_idx is None:
        return []
    raw = []
    for row in rows[header_idx + 1:]:
        def cell(kind):
            j = cols.get(kind)
            return row[j] if j is not None and j < len(row) else None

        date_cell = cell("date")
        if isinstance(date_cell, datetime):
            date = date_cell
        else:
            date, _ = _parse_date_prefix(str(date_cell or ""))
        if date is None:
            continue
        nums = {}
        for kind in ("debit", "credit", "balance", "amount"):
            raw_value = cell(kind)
            if isinstance(raw_value, (int, float)):
                nums[kind] = (float(raw_value), None)
            else:
                value, flag = _parse_amount(raw_value)
                if value is not None:
                    nums[kind] = (value, flag)
        raw.append({"date": date, "narration": re.sub(r"\s+", " ", str(cell("narration") or "")).strip(), "nums": nums})
    return raw


def parse_table_statement(filename, content):
    lower = filename.lower()
    if lower.endswith(".csv"):
        text = content.decode("utf-8-sig", errors="ignore")
        rows = list(csv.reader(io.StringIO(text)))
    else:
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        rows = []
        for ws in wb.worksheets:
            rows.extend([list(r) for r in ws.iter_rows(values_only=True)])
    raw = _table_rows_to_debits(rows)
    if not raw:
        raise StatementError("NO_TRANSACTIONS", "No transaction table was recognised in this file.")
    return None, _finalize(_entries_to_debits(raw)), len(raw)


def parse_bank_statement(filename, content, password=None):
    lower = (filename or "").lower()
    if lower.endswith(".pdf"):
        bank, items, total_rows = parse_pdf_statement(content, password)
    elif lower.endswith((".csv", ".xlsx", ".xlsm")):
        bank, items, total_rows = parse_table_statement(lower, content)
    else:
        raise StatementError("UNSUPPORTED", "Upload a bank statement as a PDF, XLSX or CSV file.")
    items.sort(key=lambda i: i["date"])
    months = defaultdict(lambda: {"count": 0, "total": 0.0})
    for item in items:
        key = item["date"][:7]
        months[key]["count"] += 1
        months[key]["total"] = round(months[key]["total"] + item["amount"], 2)
    month_list = [
        {
            "key": key,
            "label": datetime.strptime(key, "%Y-%m").strftime("%B %Y"),
            "count": data["count"],
            "total": data["total"],
        }
        for key, data in sorted(months.items())
    ]
    return {"bank": bank, "rows_read": total_rows, "months": month_list, "transactions": items}