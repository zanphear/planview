"""Email notification service — sends task-related emails via SMTP.

Requires SMTP env vars to be configured:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
If not configured, emails are logged instead of sent.
"""
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@planview.local")


def _smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to: str, subject: str, html_body: str) -> bool:
    if not _smtp_configured():
        logger.info("SMTP not configured — would send to=%s subject=%s", to, subject)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to], msg.as_string())

        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def send_task_assigned_email(to_email: str, task_name: str, assigner_name: str) -> bool:
    subject = f"You've been assigned to: {task_name}"
    body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4186E0;">Planview</h2>
        <p><strong>{assigner_name}</strong> assigned you to a task:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0;">{task_name}</h3>
        </div>
        <p style="color: #666; font-size: 14px;">Log in to Planview to view the task.</p>
    </div>
    """
    return send_email(to_email, subject, body)


def send_task_due_email(to_email: str, task_name: str, due_date: str) -> bool:
    subject = f"Task due soon: {task_name}"
    body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4186E0;">Planview</h2>
        <p>A task you're assigned to is due soon:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0;">{task_name}</h3>
            <p style="margin: 8px 0 0; color: #e67e22;">Due: {due_date}</p>
        </div>
        <p style="color: #666; font-size: 14px;">Log in to Planview to view the task.</p>
    </div>
    """
    return send_email(to_email, subject, body)


def send_comment_email(to_email: str, task_name: str, commenter_name: str, comment_text: str) -> bool:
    subject = f"New comment on: {task_name}"
    body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4186E0;">Planview</h2>
        <p><strong>{commenter_name}</strong> commented on <strong>{task_name}</strong>:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;">{comment_text[:500]}</p>
        </div>
        <p style="color: #666; font-size: 14px;">Log in to Planview to view the full thread.</p>
    </div>
    """
    return send_email(to_email, subject, body)
