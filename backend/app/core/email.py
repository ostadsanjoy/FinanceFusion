import requests
from app.core.config import settings

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def send_otp_email(to_email: str, otp: str):
    subject = "Your Finance Fusion password reset code"
    html_content = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
            <h2>Reset your password</h2>
            <p>Use the code below to reset your Finance Fusion password. It expires in
            {settings.OTP_EXPIRE_MINUTES} minutes.</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">{otp}</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
    """

    if not settings.BREVO_API_KEY:
        print("=" * 60)
        print("BREVO_API_KEY not set — printing OTP for local dev:")
        print(f"To: {to_email}")
        print(f"OTP: {otp}")
        print("=" * 60)
        return

    payload = {
        "sender": {"name": settings.BREVO_SENDER_NAME, "email": settings.BREVO_SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }
    headers = {
        "api-key": settings.BREVO_API_KEY,
        "Content-Type": "application/json",
        "accept": "application/json",
    }

    response = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=10)
    response.raise_for_status()