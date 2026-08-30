"""
Candidate Authentication backend test suite.

Covers: registration -> MongoDB persistence with hashed password -> login ->
JWT -> protected route -> role separation from Admin -> duplicate/invalid
handling -> expired/garbage token rejection -> password recovery ->
change-password -> Admin regression (still works, still rejects candidate
tokens).

Run with: ../.venv/Scripts/python.exe test_candidate_auth_api.py
"""
import os
import time

os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient
from jose import jwt

from datetime import datetime
from main import app
from database import users_collection, otps_collection
from utils.auth import SECRET_KEY, ALGORITHM, hash_password

client = TestClient(app)


def expect(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"[PASS] {message}")


def test_candidate_auth():
    print("Testing Candidate Authentication API...\n")

    email = f"candidate.test.{int(time.time())}@example.com"
    password = "SecurePass123"

    # 1. Initiate Registration (sends OTP)
    reg_resp = client.post("/candidate/register", json={
        "name": "Test Candidate",
        "email": email,
        "password": password,
        "confirm_password": password,
    })
    expect(reg_resp.status_code == 200, f"POST /candidate/register returns 200 (got {reg_resp.status_code}: {reg_resp.text})")
    expect("message" in reg_resp.json(), "Registration returns verification message")

    # 1b. Inspect pending registration OTP record in MongoDB
    reg_otp_doc = otps_collection.find_one({"email": email, "type": "candidate_registration"})
    expect(reg_otp_doc is not None, "Pending registration OTP record exists in otps_collection")
    expect("otp_hash" in reg_otp_doc, "Registration OTP is stored hashed, never plaintext")

    # 1c. Invalid OTP verification fails
    bad_verify_resp = client.post("/candidate/register/verify-otp", json={"email": email, "otp": "000000"})
    expect(bad_verify_resp.status_code == 400, "Invalid registration OTP is rejected with 400")

    # 1d. Valid OTP verification activates candidate account
    import hashlib
    test_reg_otp = "123456"
    test_reg_hash = hashlib.sha256(test_reg_otp.encode("utf-8")).hexdigest()
    otps_collection.update_one(
        {"_id": reg_otp_doc["_id"]},
        {"$set": {"otp_hash": test_reg_hash, "attempts": 0}}
    )

    verify_reg_resp = client.post("/candidate/register/verify-otp", json={"email": email, "otp": test_reg_otp})
    expect(verify_reg_resp.status_code == 201, f"POST /candidate/register/verify-otp returns 201 (got {verify_reg_resp.status_code})")
    expect(verify_reg_resp.json().get("user_id") is not None, "Account created with valid user_id")

    # 2. MongoDB user created, password stored hashed (never plaintext)
    user_doc = users_collection.find_one({"email": email})
    expect(user_doc is not None, "User document exists in MongoDB users_collection")
    expect(user_doc["password"] != password, "Stored password is not plaintext")
    expect(user_doc["password"].startswith("$2b$") or user_doc["password"].startswith("$2a$"), "Stored password is a bcrypt hash")
    expect(user_doc["role"] == "user", "New candidate has role 'user' (matches existing schema convention)")

    # 3. Duplicate registration fails (account already exists)
    dup_resp = client.post("/candidate/register", json={
        "name": "Test Candidate",
        "email": email,
        "password": password,
        "confirm_password": password,
    })
    expect(dup_resp.status_code == 400, f"Duplicate registration rejected with 400 (got {dup_resp.status_code})")

    # 3b. Registering with an existing ADMIN's email also fails (cross-collection check)
    admin_email_dup = client.post("/candidate/register", json={
        "name": "Impersonator",
        "email": "admin@mockai.com",
        "password": password,
        "confirm_password": password,
    })
    expect(admin_email_dup.status_code == 400, "Registering with an existing admin's email is rejected with 400")

    # 3c. Mismatched confirm_password fails
    mismatch_resp = client.post("/candidate/register", json={
        "name": "Test Candidate 2",
        "email": f"mismatch.{int(time.time())}@example.com",
        "password": password,
        "confirm_password": "DifferentPass123",
    })
    expect(mismatch_resp.status_code == 400, "Mismatched password/confirm_password rejected with 400")

    # 3d. Weak password fails
    weak_resp = client.post("/candidate/register", json={
        "name": "Test Candidate 3",
        "email": f"weak.{int(time.time())}@example.com",
        "password": "123",
        "confirm_password": "123",
    })
    expect(weak_resp.status_code == 400, "Password under 6 characters rejected with 400")

    # 4. Login with correct credentials
    login_resp = client.post("/candidate/login", json={"email": email, "password": password})
    expect(login_resp.status_code == 200, f"POST /candidate/login returns 200 (got {login_resp.status_code})")
    candidate_token = login_resp.json()["access_token"]

    # 4b. Login fails with incorrect password
    bad_login_resp = client.post("/candidate/login", json={"email": email, "password": "WrongPassword"})
    expect(bad_login_resp.status_code == 401, "Login with incorrect password rejected with 401")

    # 4c. Login fails for non-existent email
    nouser_resp = client.post("/candidate/login", json={"email": "doesnotexist@example.com", "password": password})
    expect(nouser_resp.status_code == 401, "Login with non-existent email rejected with 401 (no user enumeration)")

    # 5. Protected route (/candidate/me) with the JWT
    headers = {"Authorization": f"Bearer {candidate_token}"}
    me_resp = client.get("/candidate/me", headers=headers)
    expect(me_resp.status_code == 200, "GET /candidate/me with valid token returns 200")
    expect(me_resp.json()["email"] == email, "/candidate/me returns the correct account")
    expect("password" not in me_resp.json(), "/candidate/me never exposes the password field")

    # 5b. Protected route fails without token / invalid token / expired token
    no_token = client.get("/candidate/me")
    expect(no_token.status_code == 401, "GET /candidate/me with no token returns 401")

    bad_token = client.get("/candidate/me", headers={"Authorization": "Bearer not-a-real-jwt"})
    expect(bad_token.status_code == 401, "GET /candidate/me with a garbage token returns 401")

    expired_jwt = jwt.encode({"user_id": str(user_doc["_id"]), "role": "user", "exp": int(time.time()) - 100}, SECRET_KEY, algorithm=ALGORITHM)
    exp_resp = client.get("/candidate/me", headers={"Authorization": f"Bearer {expired_jwt}"})
    expect(exp_resp.status_code == 401, "GET /candidate/me with an expired token returns 401")

    # 5c. Profile updates via PATCH /candidate/me
    patch_resp = client.patch("/candidate/me", headers=headers, json={"name": "Updated Candidate Name"})
    expect(patch_resp.status_code == 200, f"PATCH /candidate/me returns 200 (got {patch_resp.status_code}: {patch_resp.text})")
    expect(patch_resp.json()["name"] == "Updated Candidate Name", "PATCH /candidate/me returns the updated name")
    expect(patch_resp.json()["email"] == email, "PATCH /candidate/me does not change the email")
    expect(patch_resp.json()["role"] == "user", "PATCH /candidate/me does not change the role")

    refreshed_user = users_collection.find_one({"_id": user_doc["_id"]})
    expect(refreshed_user["name"] == "Updated Candidate Name", "Updated name is actually persisted in MongoDB")

    # 5d. Profile update validation and security
    patch_no_token = client.patch("/candidate/me", json={"name": "No Token"})
    expect(patch_no_token.status_code == 401, "PATCH /candidate/me with no token returns 401")

    patch_bad_token = client.patch("/candidate/me", headers={"Authorization": "Bearer bad"}, json={"name": "Bad Token"})
    expect(patch_bad_token.status_code == 401, "PATCH /candidate/me with an invalid token returns 401")

    patch_smuggle = client.patch("/candidate/me", headers=headers, json={"name": "Smuggler", "role": "admin"})
    expect(patch_smuggle.status_code == 200, "PATCH /candidate/me ignores unexpected extra fields like role")
    expect(patch_smuggle.json()["role"] == "user", "Attempting to smuggle role='admin' into the payload has no effect")
    expect(users_collection.find_one({"_id": user_doc["_id"]})["role"] == "user", "Role in MongoDB is unchanged after the smuggling attempt")

    patch_blank = client.patch("/candidate/me", headers=headers, json={"name": "   "})
    expect(patch_blank.status_code == 400, "PATCH /candidate/me rejects a blank/whitespace-only name")

    # 5e. Cross-user isolation on PATCH: candidate A cannot modify candidate B's profile
    other_email = f"other.candidate.{int(time.time())}@example.com"
    other_reg = client.post("/candidate/register", json={
        "name": "Other Candidate",
        "email": other_email,
        "password": password,
        "confirm_password": password,
    })
    other_otp_doc = otps_collection.find_one({"email": other_email, "type": "candidate_registration"})
    test_other_hash = hashlib.sha256(b"654321").hexdigest()
    otps_collection.update_one({"_id": other_otp_doc["_id"]}, {"$set": {"otp_hash": test_other_hash}})
    other_verify = client.post("/candidate/register/verify-otp", json={"email": other_email, "otp": "654321"})
    expect(other_verify.status_code == 201, "Second candidate registers and verifies fine (setup for ownership test)")
    other_user_doc = users_collection.find_one({"email": other_email})

    client.patch("/candidate/me", headers=headers, json={"name": "Still Just A Candidate"})
    other_user_after = users_collection.find_one({"_id": other_user_doc["_id"]})
    expect(other_user_after["name"] == "Other Candidate", "Candidate A's PATCH /candidate/me never touches Candidate B's document")

    # 6. Role separation: an Admin token cannot authenticate through candidate routes
    admin_login = client.post("/admin/login", json={"email": "admin@mockai.com", "password": "admin123"})
    expect(admin_login.status_code == 200, "Admin login still works (regression check)")
    admin_token = admin_login.json()["access_token"]

    admin_on_candidate = client.get("/candidate/me", headers={"Authorization": f"Bearer {admin_token}"})
    expect(admin_on_candidate.status_code == 401, "An Admin's token is REJECTED on GET /candidate/me")

    # 6b. Symmetric: a Candidate token cannot authenticate through admin routes
    candidate_on_admin = client.get("/admin/", headers=headers)
    expect(candidate_on_admin.status_code == 401, "A Candidate's token is REJECTED on GET /admin/ (dashboard)")

    admin_users_resp = client.get("/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    expect(admin_users_resp.status_code == 200, "Admin protected route /admin/users still works with a real admin token")

    candidate_on_admin_users = client.get("/admin/users", headers=headers)
    expect(candidate_on_admin_users.status_code == 401, "A Candidate's token is REJECTED on GET /admin/users")

    # 7. Change password (authenticated)
    new_password = "NewSecurePass456"
    change_resp = client.put("/candidate/change-password", headers=headers, json={
        "old_password": password,
        "new_password": new_password,
    })
    expect(change_resp.status_code == 200, f"PUT /candidate/change-password succeeds (got {change_resp.status_code}: {change_resp.text})")

    old_pw_login = client.post("/candidate/login", json={"email": email, "password": password})
    expect(old_pw_login.status_code == 401, "Old password no longer works after change-password")

    new_pw_login = client.post("/candidate/login", json={"email": email, "password": new_password})
    expect(new_pw_login.status_code == 200, "New password works after change-password")

    wrong_old_resp = client.put("/candidate/change-password", headers=headers, json={
        "old_password": "TotallyWrong",
        "new_password": "Whatever123",
    })
    # 8. Password recovery (Forgot Password + OTP Flow)
    reset_email = email

    # 8a. Send OTP for registered user
    send_otp_resp = client.post("/candidate/forgot-password/send-otp", json={"email": reset_email})
    expect(send_otp_resp.status_code == 200, "POST /candidate/forgot-password/send-otp returns 200")
    expect("message" in send_otp_resp.json(), "send-otp returns a generic message")

    # 8b. Anti-enumeration: unknown email returns the same generic 200 response
    unknown_resp = client.post("/candidate/forgot-password/send-otp", json={"email": "unknown.candidate@example.com"})
    expect(unknown_resp.status_code == 200, "send-otp for unknown email returns 200")
    expect(unknown_resp.json() == send_otp_resp.json(), "send-otp response is identical for known and unknown emails")

    # 8c. Inspect OTP record in MongoDB to test verification
    otp_doc = otps_collection.find_one({"email": reset_email, "type": "candidate_password_reset"})
    expect(otp_doc is not None, "OTP record created in otps_collection")
    expect("otp_hash" in otp_doc, "OTP is stored as a secure hash, never plaintext")
    expect(otp_doc.get("verified") is False, "OTP initial status is verified=False")

    # 8d. Incorrect OTP rejected with attempt count
    bad_otp_resp = client.post("/candidate/forgot-password/verify-otp", json={"email": reset_email, "otp": "000000"})
    expect(bad_otp_resp.status_code == 400, "Invalid OTP code rejected with 400")
    expect("attempt" in bad_otp_resp.json()["detail"].lower(), "Error message informs remaining attempts")

    # 8e. Correct OTP verification
    # To test verification deterministically, inject a known test OTP hash into the record
    import hashlib
    test_otp = "849201"
    test_otp_hash = hashlib.sha256(test_otp.encode("utf-8")).hexdigest()
    otps_collection.update_one(
        {"_id": otp_doc["_id"]},
        {"$set": {"otp_hash": test_otp_hash, "attempts": 0}}
    )

    verify_resp = client.post("/candidate/forgot-password/verify-otp", json={"email": reset_email, "otp": test_otp})
    expect(verify_resp.status_code == 200, "Valid OTP verification returns 200")
    expect("reset_token" in verify_resp.json(), "Verification returns cryptographic reset_token")
    reset_token = verify_resp.json()["reset_token"]

    # 8f. Password reset with mismatched confirmation fails
    mismatch_reset = client.post("/candidate/forgot-password/reset", json={
        "email": reset_email,
        "reset_token": reset_token,
        "new_password": "NewResetPassword789",
        "confirm_password": "DifferentPassword789",
    })
    expect(mismatch_reset.status_code == 400, "Password reset with mismatched passwords rejected with 400")

    # 8g. Password reset with invalid token fails
    invalid_token_reset = client.post("/candidate/forgot-password/reset", json={
        "email": reset_email,
        "reset_token": "invalid.jwt.token",
        "new_password": "NewResetPassword789",
        "confirm_password": "NewResetPassword789",
    })
    expect(invalid_token_reset.status_code == 400, "Password reset with invalid token rejected with 400")

    # 8h. Successful password reset
    final_new_password = "BrandNewResetPass999"
    reset_resp = client.post("/candidate/forgot-password/reset", json={
        "email": reset_email,
        "reset_token": reset_token,
        "new_password": final_new_password,
        "confirm_password": final_new_password,
    })
    expect(reset_resp.status_code == 200, "Password reset with valid token succeeds with 200")

    # 8i. Single-use: OTP record is cleaned up / cannot be reused
    reuse_verify = client.post("/candidate/forgot-password/verify-otp", json={"email": reset_email, "otp": test_otp})
    expect(reuse_verify.status_code == 400, "Reusing the verified OTP fails (single-use enforced)")

    # 8j. Login with old password fails, login with newly reset password succeeds
    login_old_after_reset = client.post("/candidate/login", json={"email": reset_email, "password": new_password})
    expect(login_old_after_reset.status_code == 401, "Old password rejected after password reset")

    login_new_after_reset = client.post("/candidate/login", json={"email": reset_email, "password": final_new_password})
    expect(login_new_after_reset.status_code == 200, "Login succeeds with the newly reset password")

    # 9. Google OAuth2 Sign-In Flow - Complete Scenarios (1-6)
    print("\nTesting Google OAuth2 Sign-In API Scenarios...")

    # Scenario 5: Invalid/failed Google authentication
    # 5a. Missing or empty id_token rejected
    empty_google = client.post("/candidate/auth/google", json={"id_token": ""})
    expect(empty_google.status_code == 400, "Scenario 5a: Google auth with empty id_token rejected with 400")

    # 5b. Malformed mock token rejected
    bad_mock_google = client.post("/candidate/auth/google", json={"id_token": "mock-google-token:bad"})
    expect(bad_mock_google.status_code == 401, "Scenario 5b: Malformed mock Google token rejected with 401")

    # 5c. Admin email attempting Google Sign-In as candidate is rejected
    admin_google_token = f"mock-google-token:admin_sub_123:admin@mockai.com:Admin Person"
    admin_g_resp = client.post("/candidate/auth/google", json={"id_token": admin_google_token})
    expect(admin_g_resp.status_code == 400, "Scenario 5c: Admin email attempting candidate Google auth rejected with 400")

    # Scenario 2: New Google account registration with profile picture
    google_sub_1 = f"sub_google_new_{int(time.time())}"
    google_email_1 = f"new.google.{int(time.time())}@gmail.com"
    google_name_1 = "New Google User"
    google_avatar_1 = "https://lh3.googleusercontent.com/a/initial_photo_123"
    new_mock_token_1 = f"mock-google-token:{google_sub_1}:{google_email_1}:{google_name_1}:{google_avatar_1}"

    new_google_resp = client.post("/candidate/auth/google", json={"id_token": new_mock_token_1})
    expect(new_google_resp.status_code == 200, f"Scenario 2: POST /candidate/auth/google creates new candidate account (status: {new_google_resp.status_code})")
    new_google_data = new_google_resp.json()
    expect("access_token" in new_google_data, "Scenario 2: Google auth returns access_token")
    expect(new_google_data.get("user", {}).get("email") == google_email_1, "Scenario 2: User profile returned with matching email")
    expect(new_google_data.get("user", {}).get("avatar") == google_avatar_1, "Scenario 2: Google profile picture returned in auth response")

    g1_user_doc = users_collection.find_one({"email": google_email_1})
    expect(g1_user_doc is not None, "Scenario 2: Document saved in MongoDB users_collection")
    expect(g1_user_doc.get("google_id") == google_sub_1, "Scenario 2: google_id stored")
    expect(g1_user_doc.get("avatar") == google_avatar_1, "Scenario 2: Google profile picture stored in MongoDB")
    expect(g1_user_doc.get("is_verified") is True, "Scenario 2: Account is marked is_verified=True")

    # Verify GET /candidate/me returns the Google profile picture
    g1_headers = {"Authorization": f"Bearer {new_google_data['access_token']}"}
    g1_me_resp = client.get("/candidate/me", headers=g1_headers)
    expect(g1_me_resp.status_code == 200, "GET /candidate/me returns 200 for Google candidate")
    expect(g1_me_resp.json().get("avatar") == google_avatar_1, "GET /candidate/me returns Google avatar URL")

    # Scenario 1 & 2b: Existing Google account login with refreshed profile picture
    refreshed_avatar = "https://lh3.googleusercontent.com/a/refreshed_photo_456"
    refreshed_mock_token = f"mock-google-token:{google_sub_1}:{google_email_1}:{google_name_1}:{refreshed_avatar}"
    login_google_resp = client.post("/candidate/auth/google", json={"id_token": refreshed_mock_token})
    expect(login_google_resp.status_code == 200, "Scenario 1: Existing Google account successfully logs in (status: 200)")
    expect(login_google_resp.json()["user"]["id"] == str(g1_user_doc["_id"]), "Scenario 1: Existing candidate document ID preserved")
    expect(login_google_resp.json()["user"]["avatar"] == refreshed_avatar, "Scenario 1: Stored Google avatar refreshed on subsequent login")
    g1_refreshed_doc = users_collection.find_one({"_id": g1_user_doc["_id"]})
    expect(g1_refreshed_doc.get("avatar") == refreshed_avatar, "Scenario 1: Refreshed avatar persisted in MongoDB")

    # Scenario 3: Google account already associated with a pre-existing email candidate
    pre_email = f"preexisting.{int(time.time())}@example.com"
    pre_user = {
        "name": "Pre Existing",
        "email": pre_email,
        "password": hash_password("Password123!"),
        "role": "user",
        "is_verified": True,
        "created_at": datetime.utcnow(),
    }
    pre_res = users_collection.insert_one(pre_user)
    pre_sub = f"sub_pre_{int(time.time())}"
    pre_google_avatar = "https://lh3.googleusercontent.com/a/pre_photo_789"
    link_mock_token = f"mock-google-token:{pre_sub}:{pre_email}:Pre Existing:{pre_google_avatar}"

    link_resp = client.post("/candidate/auth/google", json={"id_token": link_mock_token})
    expect(link_resp.status_code == 200, "Scenario 3: Pre-existing candidate seamlessly links Google account")
    expect(link_resp.json()["user"]["id"] == str(pre_res.inserted_id), "Scenario 3: User ID matches pre-existing candidate ID")
    expect(link_resp.json()["user"]["avatar"] == pre_google_avatar, "Scenario 3: Google avatar applied to pre-existing candidate")
    updated_pre = users_collection.find_one({"_id": pre_res.inserted_id})
    expect(updated_pre.get("google_id") == pre_sub, "Scenario 3: google_id linked to existing document")
    expect(updated_pre.get("avatar") == pre_google_avatar, "Scenario 3: Avatar saved in document")

    # Scenario 4: Google account without picture (avatar is None)
    google_sub_2 = f"sub_diff_{int(time.time())}"
    google_email_2 = f"no.avatar.{int(time.time())}@gmail.com"
    no_avatar_mock_token = f"mock-google-token:{google_sub_2}:{google_email_2}:No Avatar User"

    no_avatar_resp = client.post("/candidate/auth/google", json={"id_token": no_avatar_mock_token})
    expect(no_avatar_resp.status_code == 200, "Scenario 4: Google sign-in without picture succeeds")
    expect(no_avatar_resp.json()["user"]["avatar"] is None, "Scenario 4: Avatar is None when Google provides no picture")
    expect(no_avatar_resp.json()["user"]["email"] == google_email_2, "Scenario 4: Distinct email matches")

    # Scenario 6: Normal email/password login still works and has no invented Google avatar
    standard_login = client.post("/candidate/login", json={"email": pre_email, "password": "Password123!"})
    expect(standard_login.status_code == 200, "Scenario 6: Normal email/password login still works after Google linking")

    # Verify alias route /candidate/google-auth
    alias_resp = client.post("/candidate/google-auth", json={"id_token": new_mock_token_1})
    expect(alias_resp.status_code == 200, "POST /candidate/google-auth alias route works identically")

    print("\nALL CANDIDATE AUTHENTICATION, OTP RECOVERY & GOOGLE SIGN-IN TESTS PASSED SUCCESSFULLY!")
    return True


if __name__ == "__main__":
    test_candidate_auth()
