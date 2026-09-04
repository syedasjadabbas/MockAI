import os
import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import HTTPException, status


def send_email(to_email: str, subject: str, html_content: str, sender_display_name: str = "MockAI") -> bool:
    """
    Sends an HTML email via SMTP (configured for Gmail or custom SMTP).
    
    Handles both Port 587 (STARTTLS) and Port 465 (SSL).
    Raises HTTPException(500) with descriptive messages on failure so
    API endpoints report failures properly to the client.
    """
    if os.getenv("TESTING") == "1":
        print(f"[TESTING] Skipped real SMTP email to {to_email} (Subject: '{subject}')")
        return True

    sender_email = os.getenv("SMTP_EMAIL", "").strip()
    sender_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
    smtp_port_raw = os.getenv("SMTP_PORT", "587").strip()

    try:
        smtp_port = int(smtp_port_raw)
    except ValueError:
        smtp_port = 587

    if not sender_email or not sender_password:
        print(f"[ERROR] SMTP not configured. Cannot send email to {to_email}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMTP is not configured on the server. Please set SMTP_EMAIL and SMTP_PASSWORD in backend/.env."
        )

    msg = MIMEMultipart()
    msg["From"] = f"{sender_display_name} <{sender_email}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_content, "html"))

    server = None
    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=15)
            server.ehlo()
        else:
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(sender_email, sender_password)
        server.send_message(msg)
        return True
    except smtplib.SMTPAuthenticationError as auth_err:
        print(f"[ERROR] Gmail SMTP authentication failed for {to_email}: {auth_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gmail SMTP authentication failed. Please verify your Gmail address and 16-character App Password in environment variables."
        )
    except (smtplib.SMTPConnectError, socket.timeout, TimeoutError) as conn_err:
        print(f"[ERROR] Gmail SMTP connection failed for {to_email}: {conn_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not connect to SMTP server ({smtp_server}:{smtp_port}). Please check server network or firewall."
        )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Email delivery failed for {to_email}: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deliver email: {str(exc) or type(exc).__name__}"
        )
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass
