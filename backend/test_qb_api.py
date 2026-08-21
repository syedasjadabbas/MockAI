from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_api():
    print("Testing backend Question Bank API via TestClient...")
    
    # 1. Login
    login_resp = client.post("/admin/login", json={"email": "admin@mockai.com", "password": "admin123"})
    if login_resp.status_code != 200:
        print("Login failed:", login_resp.status_code, login_resp.text)
        return False
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Admin Login successful")

    # 2. Get Categories
    cats_resp = client.get("/admin/categories", headers=headers)
    assert cats_resp.status_code == 200, f"Categories failed: {cats_resp.text}"
    cats = cats_resp.json()
    print(f"[PASS] GET /categories returned {len(cats)} categories")
    assert len(cats) >= 1, "Expected categories to be seeded"

    # 3. Create Category
    cat_payload = {
        "name": "DevOps & Cloud Systems",
        "description": "CI/CD pipelines, Docker, Kubernetes, Terraform, and cloud architecture.",
        "icon": "Cloud",
        "status": "active"
    }
    create_cat_resp = client.post("/admin/categories", json=cat_payload, headers=headers)
    assert create_cat_resp.status_code == 200, f"Create category failed: {create_cat_resp.text}"
    new_cat = create_cat_resp.json()
    cat_id = new_cat["_id"]
    print(f"[PASS] POST /categories created category: {new_cat['name']} (ID: {cat_id})")

    # 4. Duplicate Category Check
    dup_cat_resp = client.post("/admin/categories", json=cat_payload, headers=headers)
    assert dup_cat_resp.status_code == 400, "Expected 400 for duplicate category"
    print("[PASS] Duplicate category validation works (400 returned)")

    # 5. Update Category
    update_cat_resp = client.put(f"/admin/categories/{cat_id}", json={"description": "Updated DevOps description"}, headers=headers)
    assert update_cat_resp.status_code == 200
    print("[PASS] PUT /categories/{id} updated category")

    # 6. Status Toggle Category
    toggle_cat_resp = client.patch(f"/admin/categories/{cat_id}/status", json={"status": "archived"}, headers=headers)
    assert toggle_cat_resp.status_code == 200
    assert toggle_cat_resp.json()["status"] == "archived"
    print("[PASS] PATCH /categories/{id}/status archived category")

    # 7. Create Question
    q_payload = {
        "category_id": cat_id,
        "question_text": "Explain Kubernetes Pod lifecycle and how liveness/readiness probes work.",
        "difficulty": "Hard",
        "type": "Technical",
        "expected_answer": "Liveness probes determine if container needs restart. Readiness probes determine if container is ready to accept incoming traffic.",
        "tags": ["Kubernetes", "DevOps", "Containers"],
        "status": "active"
    }
    create_q_resp = client.post("/admin/questions", json=q_payload, headers=headers)
    assert create_q_resp.status_code == 200, f"Create question failed: {create_q_resp.text}"
    new_q = create_q_resp.json()
    q_id = new_q["_id"]
    print(f"[PASS] POST /questions created question: {new_q['question_text'][:30]}... (ID: {q_id})")

    # 8. Filter & Search Questions
    filter_resp = client.get(f"/admin/questions?difficulty=Hard&category_id={cat_id}", headers=headers)
    assert filter_resp.status_code == 200
    filtered_qs = filter_resp.json()
    assert len(filtered_qs) >= 1
    print(f"[PASS] GET /questions with category & difficulty filter returned {len(filtered_qs)} questions")

    search_resp = client.get("/admin/questions?search=Kubernetes", headers=headers)
    assert search_resp.status_code == 200
    searched_qs = search_resp.json()
    assert any(q["_id"] == q_id for q in searched_qs)
    print(f"[PASS] GET /questions with search query returned {len(searched_qs)} matching questions")

    # 9. Update Question
    update_q_resp = client.put(f"/admin/questions/{q_id}", json={"difficulty": "Medium"}, headers=headers)
    assert update_q_resp.status_code == 200
    assert update_q_resp.json()["difficulty"] == "Medium"
    print("[PASS] PUT /questions/{id} updated question")

    # 10. Status Toggle Question
    toggle_q_resp = client.patch(f"/admin/questions/{q_id}/status", json={"status": "archived"}, headers=headers)
    assert toggle_q_resp.status_code == 200
    assert toggle_q_resp.json()["status"] == "archived"
    print("[PASS] PATCH /questions/{id}/status archived question")

    # 11. Stats Endpoint
    stats_resp = client.get("/admin/question-bank/stats", headers=headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    print("[PASS] GET /admin/question-bank/stats:", stats)

    # 12. Delete Question
    del_q_resp = client.delete(f"/admin/questions/{q_id}", headers=headers)
    assert del_q_resp.status_code == 200
    print("[PASS] DELETE /questions/{id} deleted question")

    # 13. Delete Category
    del_cat_resp = client.delete(f"/admin/categories/{cat_id}", headers=headers)
    assert del_cat_resp.status_code == 200
    print("[PASS] DELETE /categories/{id} deleted category")

    # 14. Check Audit Logs
    logs_resp = client.get("/admin/logs", headers=headers)
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    actions = [l["action"] for l in logs[:10]]
    print("[PASS] Recent Audit Log Actions:", actions)

    print("\nALL QUESTION BANK BACKEND API TESTS PASSED SUCCESSFULLY!")
    return True

if __name__ == "__main__":
    test_api()
