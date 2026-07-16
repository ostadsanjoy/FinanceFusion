CATEGORIES = [
    "essentials",
    "grocery",
    "maintainance",
    "misc",
    "recharge",
    "rent/repay",
    "shopping",
    "utilities",
    "cash",
]
KEYWORD_MAP = {
    "rent": "rent/repay",
    "emi": "rent/repay",
    "loan": "rent/repay",
    "admission": "rent/repay",
    "fee": "rent/repay",
    "lpg": "utilities",
    "electricity": "utilities",
    "wifi": "utilities",
    "broadband": "utilities",
    "gas": "utilities",
    "water bill": "utilities",
    "recharge": "recharge",
    "mobile": "recharge",
    "prepaid": "recharge",
    "medical": "essentials",
    "medicine": "essentials",
    "pharmacy": "essentials",
    "hospital": "essentials",
    "doctor": "essentials",
    "grocery": "grocery",
    "groceries": "grocery",
    "mart": "grocery",
    "vegetable": "grocery",
    "milk": "grocery",
    "dudh": "grocery",
    "repair": "maintainance",
    "maintenance": "maintainance",
    "maintainance": "maintainance",
    "service": "maintainance",
    "flipkart": "shopping",
    "amazon": "shopping",
    "myntra": "shopping",
    "shopping": "shopping",
    "cash": "cash",
    "atm": "cash",
    "withdrawal": "cash",
}


def guess_category(text: str) -> str:
    text = (text or "").lower()
    for keyword, category in KEYWORD_MAP.items():
        if keyword in text:
            return category
    return "misc"