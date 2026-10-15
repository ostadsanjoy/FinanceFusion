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

CHARGE_WORDS = ("charges", "cgst", "sgst", "igst", "gst on", "service tax", "annual fee", "amc ", "min bal", "penalty", "chgs", "chrg", "rtnchg", "return chg", "dept - admn")


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


IFSC_RE = re.compile(r"^[A-Za-z]{4}0[A-Za-z0-9]{5,}$")
MASK_RE = re.compile(r"^[Xx*]{3,}\d*$")
NOISE_PREFIXES = (
    "transfer", "payment", "pay ", "paid", "subscription", "upi", "imps", "neft", "rtgs", "debit", "credit",
    "ref", "txn", "trf", "to ", "by ", "from ", "mob", "inb", "tpt", "bil", "onl", "net ", "mb ", "self",
    "branch", "ifsc", "a/c", "acct", "account",
)


def _is_noise_token(tok):
    t = tok.strip()
    if not t:
        return True
    low = t.lower()
    first = low.split()[0]
    if first.upper() in STOP_TOKENS:
        return True
    if any(low == p.strip() or low.startswith(p) for p in NOISE_PREFIXES):
        return True
    if "@" in t or MASK_RE.match(t.replace(" ", "")):
        return True
    compact = t.replace(" ", "")
    if IFSC_RE.match(compact) or re.match(r"^[A-Za-z]{4}0[A-Za-z0-9]{4,}[A-Za-z]{0,4}$", compact) and any(c.isdigit() for c in compact):
        return True
    digits = sum(c.isdigit() for c in t)
    if digits >= 6 or (digits and digits >= len(compact) * 0.5):
        return True
    if re.fullmatch(r"[A-Za-z]{4}", t) and t.isupper():
        return True
    letters = sum(c.isalpha() for c in t)
    return letters < 3


def _first_name_token(tokens):
    for tok in tokens:
        if not _is_noise_token(tok):
            return tok.strip()
    return None


def _detect_method(low):
    if "upi" in low:
        return "UPI"
    if "imps" in low:
        return "IMPS"
    if "neft" in low:
        return "NEFT"
    if "rtgs" in low:
        return "RTGS"
    if re.search(r"\b(ach|ecs|nach|mandate|si)\b", low):
        return "AUTOPAY"
    if re.search(r"\b(pos|ecom|pur|purchase|card)\b", low):
        return "CARD"
    return "OTHER"


def clean_narration(raw):
    text = re.sub(r"\s+", " ", raw or "").strip()
    text = re.sub(r"\s*/?\s*BRANCH\s*:.*$", "", text, flags=re.I).strip()
    if not text:
        return "Unknown", "OTHER"
    low = text.lower()

    if any(w in low for w in CHARGE_WORDS):
        return "Bank charges", "CHARGES"
    if re.search(r"\b(int\.?\s*pd|interest|int pd)\b", low):
        return "Bank interest", "INTEREST"
    if re.search(r"\batm\b|\bnfs\b|cash\s*w(i)?th?dr|cash wdl|\bcwdr\b", low):
        return "ATM cash withdrawal", "ATM"

    method = _detect_method(low)

    if method == "CARD" and "/" not in text:
        cleaned = re.sub(r"\b(pos|ecom|pur|purchase|card)\b", " ", text, flags=re.I)
        cleaned = re.sub(r"\b\d[\dxX*]{5,}\b", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" /-")
        if cleaned:
            return _title_case(cleaned[:40]), "CARD"

    text = re.sub(r"^(transfer|trf)\s+(to|from)\s+[\d\s]*", "", text, flags=re.I).strip() or text
    text = re.sub(r"^(tp\s+)?(ach|ecs|nach)\s+(d\s+)?", "", text, flags=re.I).strip() or text
    text = re.sub(r"(e-?sign|e-?mandate)?(idib|[A-Za-z]{0,6})\d{8,}$", "", text, flags=re.I).strip() or text
    sep = "/" if "/" in text else ("*" if "*" in text else "-")
    parts = [re.sub(r"^[A-Za-z]{4}-([xX*]+\d*|\d+)-\s*", "", p.strip()) for p in text.split(sep)]
    name = _first_name_token(parts)
    if not name and "/" in text:
        name = _first_name_token([p.strip() for p in text.replace("/", "-").split("-")])
    if name:
        name = re.sub(r"(e-?sign|e-?mandate)?[A-Za-z]{0,6}\d{6,}$", "", name, flags=re.I).strip() or name
        return _title_case(name[:48]), method
    words = [w for w in re.split(r"[\s/\-_]+", text) if w and not _is_noise_token(w)]
    if words:
        joined = re.sub(r"(e-?sign|e-?mandate)?[A-Za-z]{0,6}\d{6,}$", "", " ".join(words[:4]), flags=re.I).strip() or " ".join(words[:4])
        return _title_case(joined[:40]), method
    return _title_case(text[:40]), method


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


CURRENCY_TOKENS = {"inr", "rs", "rs.", "₹", "usd", "$", "-", "—", "–"}
MONEY_RE = re.compile(r"^\(?-?\d[\d,]*\.\d{1,2}\)?(Dr|Cr|DR|CR)?$")


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


def _header_columns(block):
    spans = {}
    narration_x0 = None
    date_x0 = None
    for ln in block:
        words = ln["words"]
        for i, w in enumerate(words):
            kind = _classify_header(w["text"])
            if not kind:
                continue
            x0, x1 = w["x0"], w["x1"]
            nxt = words[i + 1] if i + 1 < len(words) else None
            if kind in ("debit", "credit", "balance", "amount") and nxt and not _classify_header(nxt["text"]) and nxt["x0"] - x1 < 8:
                x1 = nxt["x1"]
            if kind == "narration":
                prev = words[i - 1] if i > 0 else None
                if prev and not _classify_header(prev["text"]) and x0 - prev["x1"] < 10:
                    x0 = prev["x0"]
                narration_x0 = x0 if narration_x0 is None else min(narration_x0, x0)
            elif kind == "date":
                date_x0 = x0 if date_x0 is None else min(date_x0, x0)
            elif kind not in spans:
                spans[kind] = (x0, x1)
    return spans, narration_x0, date_x0


def _find_header(lines):
    for i, ln in enumerate(lines):
        kinds = {_classify_header(w["text"]) for w in ln["words"]}
        if not (("debit" in kinds or "amount" in kinds) and ("balance" in kinds or "credit" in kinds or "amount" in kinds)):
            continue
        block = [ln]
        for j in (i - 1, i + 1, i + 2):
            if 0 <= j < len(lines) and abs(lines[j]["top"] - ln["top"]) <= 22:
                block.append(lines[j])
        spans, narration_x0, date_x0 = _header_columns(block)
        if narration_x0 is not None and date_x0 is not None and ("debit" in spans or "amount" in spans):
            return i, block, spans
    return None, None, None


def _line_dates(words):
    found = []
    idx = 0
    while idx < len(words) and len(found) < 3:
        matched = False
        for k in range(1, 5):
            chunk = words[idx: idx + k]
            if len(chunk) < k:
                break
            text = " ".join(w["text"] for w in chunk)
            date, end = _parse_date_prefix(text)
            if date is not None and end == len(text):
                found.append((date, chunk))
                idx += k
                matched = True
                break
        if not matched:
            break
    return found


def _is_money(text):
    return bool(MONEY_RE.match(text.replace(",", "")) or MONEY_RE.match(text))


def _nearest_column(word, spans):
    best, best_key = None, None
    for kind, (x0, x1) in spans.items():
        overlap = min(word["x1"], x1) - max(word["x0"], x0)
        center_gap = abs((word["x0"] + word["x1"]) / 2 - (x0 + x1) / 2)
        key = (-max(overlap, 0), center_gap)
        if best_key is None or key < best_key:
            best, best_key = kind, key
    return best


def _collect_pages(pdf):
    pages = []
    spans = None
    for page in pdf.pages:
        words = page.extract_words(x_tolerance=1.5, y_tolerance=2, keep_blank_chars=False)
        lines = _group_lines(words)
        header_idx, block, header_spans = _find_header(lines)
        if header_idx is not None:
            spans = header_spans
            cutoff = max(b["top"] for b in block) + 1
            block_ids = {id(b) for b in block}
            body = [ln for ln in lines if ln["top"] > cutoff and id(ln) not in block_ids]
        else:
            body = lines
        heights = sorted(w["bottom"] - w["top"] for w in words) if words else [9]
        pages.append({"body": body, "spans": spans, "height": heights[len(heights) // 2]})
    return pages


def _layout_entries(pages):
    if not any(p["spans"] for p in pages):
        return None
    page_right = max((w["x1"] for pg in pages for ln in pg["body"] for w in ln["words"]), default=0.0)
    all_rows = []
    date_right = 0.0
    current = None
    prev_top = None
    for pg in pages:
        spans = pg["spans"]
        if not spans:
            continue
        first_line = True
        for ln in pg["body"]:
            dates = _line_dates(ln["words"]) if ln["words"] and ln["words"][0]["x0"] < page_right * 0.5 else []
            if dates:
                current = {"date": dates[0][0], "lines": [], "date_words": [w for _, chunk in dates for w in chunk], "spans": spans}
                all_rows.append(current)
                for w in current["date_words"]:
                    date_right = max(date_right, w["x1"])
            else:
                near = prev_top is not None and ln["top"] - prev_top <= pg["height"] * 2.4
                if not (current is not None and (near or first_line)):
                    current = None
                    prev_top = None
                    first_line = False
                    continue
            first_line = False
            current["lines"].append(ln)
            prev_top = ln["top"]
        prev_top = None

    if not all_rows:
        return None

    amount_xs = []
    for row in all_rows:
        spans = row["spans"]
        min_header = min(x0 for x0, _ in spans.values())
        for ln in row["lines"]:
            for i, w in enumerate(ln["words"]):
                if not _is_money(w["text"]):
                    continue
                kind = _nearest_column(w, spans)
                if not kind or w["x1"] < spans[kind][0] - 2 or w["x0"] < min_header - 45:
                    continue
                x = w["x0"]
                if i > 0 and ln["words"][i - 1]["text"].lower() in CURRENCY_TOKENS and w["x0"] - ln["words"][i - 1]["x1"] < 8:
                    x = min(x, ln["words"][i - 1]["x0"])
                amount_xs.append(x)
    if amount_xs:
        amount_left = min(amount_xs) - 3
    else:
        amount_left = min(x0 for r in all_rows[:1] for x0, _ in r["spans"].values()) - 6
    narr_left = date_right + 1

    built = []
    for row in all_rows:
        narr_lines = []
        nums = {}
        date_ids = {id(w) for w in row["date_words"]}
        for ln in row["lines"]:
            narr = [w for w in ln["words"] if id(w) not in date_ids and narr_left <= w["x0"] < amount_left]
            if narr:
                narr_lines.append(narr)
            for w in ln["words"]:
                if w["x0"] < amount_left or w["text"].lower() in CURRENCY_TOKENS:
                    continue
                value, flag = _parse_amount(w["text"])
                if value is None:
                    continue
                nums[_nearest_column(w, row["spans"])] = (value, flag)
        built.append({"date": row["date"], "narr_lines": narr_lines, "nums": nums})

    non_last = [nl for r in built for nl in r["narr_lines"][:-1]]
    line_ends = [nl[-1]["x1"] for nl in non_last]
    lens = [len(" ".join(w["text"] for w in nl)) for nl in non_last]
    cap = None
    if lens:
        top_len = max(set(lens), key=lens.count)
        if lens.count(top_len) / len(lens) >= 0.6 and top_len >= 20:
            cap = top_len
    char_widths = sorted(
        (nl[-1]["x1"] - nl[0]["x0"]) / max(len(" ".join(w["text"] for w in nl)), 1) for nl in non_last
    )
    avg_char = char_widths[len(char_widths) // 2] if char_widths else 4.5
    column_right = max(line_ends) if line_ends else None
    tight = max(2.0, avg_char * 0.55)

    entries = []
    for row in built:
        text = ""
        glue = False
        for nl in row["narr_lines"]:
            piece = " ".join(w["text"] for w in nl)
            text = text + (piece if glue else (" " + piece if text else piece))
            if cap is not None:
                glue = len(piece) >= cap
            else:
                glue = column_right is not None and (column_right - nl[-1]["x1"]) < tight
        entries.append({"date": row["date"], "narration": text.strip(), "nums": row["nums"]})
    return entries


def _headerless_entries(pages):
    entries = []
    for pg in pages:
        current = None
        prev_top = None
        for ln in pg["body"]:
            dates = _line_dates(ln["words"]) if ln["words"] else []
            if dates and ln["words"][0]["x0"] < 200:
                current = {"date": dates[0][0], "words": [], "ids": {id(w) for _, c in dates for w in c}}
                entries.append(current)
            elif not (current is not None and prev_top is not None and ln["top"] - prev_top <= pg["height"] * 2.4):
                current = None
                prev_top = None
                continue
            current["words"].extend(w for w in ln["words"] if id(w) not in current["ids"])
            prev_top = ln["top"]
    out = []
    for e in entries:
        money = [w for w in e["words"] if _is_money(w["text"])]
        if not money:
            continue
        text_words = [w["text"] for w in e["words"] if not _is_money(w["text"]) and w["text"].lower() not in CURRENCY_TOKENS]
        nums = {}
        if len(money) >= 2:
            nums["amount"] = _parse_amount(money[-2]["text"])
            nums["balance"] = _parse_amount(money[-1]["text"])
        else:
            nums["amount"] = _parse_amount(money[-1]["text"])
        out.append({"date": e["date"], "narration": " ".join(text_words), "nums": nums, "xc": (money[-2]["x0"] + money[-2]["x1"]) / 2 if len(money) >= 2 else None})
    return out


def _entries_to_debits(raw_entries):
    debits = []
    prev_balance = None
    dr_x, cr_x = [], []
    probe = None
    for e in raw_entries:
        b = e["nums"].get("balance", (None, None))[0]
        if "amount" in e["nums"] and e.get("xc") is not None and probe is not None and b is not None:
            (dr_x if b < probe - 0.005 else cr_x).append(e["xc"])
        if b is not None:
            probe = b
    dr_mid = sum(dr_x) / len(dr_x) if dr_x else None
    cr_mid = sum(cr_x) / len(cr_x) if cr_x else None
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
            elif e.get("xc") is not None and dr_mid is not None and cr_mid is not None:
                amount = value if abs(e["xc"] - dr_mid) < abs(e["xc"] - cr_mid) else None
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
    bank = None
    try:
        if pdf.pages:
            bank = _detect_bank(pdf.pages[0].extract_text() or "")
        pages = _collect_pages(pdf)
    finally:
        pdf.close()
    raw = _layout_entries(pages) or []
    if not raw:
        raw = _headerless_entries(pages)
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