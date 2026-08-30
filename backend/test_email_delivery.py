"""
Test suite for Gmail SMTP Delivery Layer and Error Handling.
"""
import os
import unittest
from unittest.mock import patch, MagicMock
import smtplib
from fastapi import HTTPException

from utils.email import send_email


class TestEmailDeliveryLayer(unittest.TestCase):
    def setUp(self):
        self.orig_env = dict(os.environ)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.orig_env)

    def test_testing_mode_bypasses_smtp(self):
        os.environ["TESTING"] = "1"
        result = send_email("recipient@example.com", "Test Subject", "<p>Hello</p>")
        self.assertTrue(result)

    def test_missing_credentials_raises_500(self):
        os.environ.pop("TESTING", None)
        os.environ["SMTP_EMAIL"] = ""
        os.environ["SMTP_PASSWORD"] = ""

        with self.assertRaises(HTTPException) as ctx:
            send_email("recipient@example.com", "Test Subject", "<p>Hello</p>")

        self.assertEqual(ctx.exception.status_code, 500)
        self.assertIn("SMTP is not configured", ctx.exception.detail)

    @patch("smtplib.SMTP")
    def test_smtp_authentication_error_raises_500(self, mock_smtp_cls):
        os.environ.pop("TESTING", None)
        os.environ["SMTP_EMAIL"] = "user@gmail.com"
        os.environ["SMTP_PASSWORD"] = "badpass"

        mock_server = MagicMock()
        mock_server.login.side_effect = smtplib.SMTPAuthenticationError(535, b"Bad credentials")
        mock_smtp_cls.return_value = mock_server

        with self.assertRaises(HTTPException) as ctx:
            send_email("recipient@example.com", "Test Subject", "<p>Hello</p>")

        self.assertEqual(ctx.exception.status_code, 500)
        self.assertIn("Gmail SMTP authentication failed", ctx.exception.detail)
        mock_server.quit.assert_called_once()

    @patch("smtplib.SMTP")
    def test_smtp_connection_error_raises_500(self, mock_smtp_cls):
        os.environ.pop("TESTING", None)
        os.environ["SMTP_EMAIL"] = "user@gmail.com"
        os.environ["SMTP_PASSWORD"] = "apppassword"

        mock_smtp_cls.side_effect = smtplib.SMTPConnectError(421, b"Connection refused")

        with self.assertRaises(HTTPException) as ctx:
            send_email("recipient@example.com", "Test Subject", "<p>Hello</p>")

        self.assertEqual(ctx.exception.status_code, 500)
        self.assertIn("Could not connect to SMTP server", ctx.exception.detail)

    @patch("smtplib.SMTP")
    def test_smtp_port_587_starttls_success(self, mock_smtp_cls):
        os.environ.pop("TESTING", None)
        os.environ["SMTP_EMAIL"] = "sender@gmail.com"
        os.environ["SMTP_PASSWORD"] = "apppassword1234"
        os.environ["SMTP_SERVER"] = "smtp.gmail.com"
        os.environ["SMTP_PORT"] = "587"

        mock_server = MagicMock()
        mock_smtp_cls.return_value = mock_server

        res = send_email("recipient@example.com", "Test Subject", "<p>Hello</p>", "MockAI Custom")
        self.assertTrue(res)
        mock_smtp_cls.assert_called_once_with("smtp.gmail.com", 587, timeout=10)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("sender@gmail.com", "apppassword1234")
        mock_server.send_message.assert_called_once()
        mock_server.quit.assert_called_once()

    @patch("smtplib.SMTP_SSL")
    def test_smtp_port_465_ssl_success(self, mock_ssl_cls):
        os.environ.pop("TESTING", None)
        os.environ["SMTP_EMAIL"] = "sender@gmail.com"
        os.environ["SMTP_PASSWORD"] = "apppassword1234"
        os.environ["SMTP_SERVER"] = "smtp.gmail.com"
        os.environ["SMTP_PORT"] = "465"

        mock_server = MagicMock()
        mock_ssl_cls.return_value = mock_server

        res = send_email("recipient@example.com", "Test Subject", "<p>Hello</p>")
        self.assertTrue(res)
        mock_ssl_cls.assert_called_once_with("smtp.gmail.com", 465, timeout=10)
        mock_server.login.assert_called_once_with("sender@gmail.com", "apppassword1234")
        mock_server.send_message.assert_called_once()
        mock_server.quit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
