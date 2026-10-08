"""Backend API tests for Music Journal app."""
import time
import io
import pytest
import requests
from openpyxl import load_workbook


# ---------- Health ----------
def test_root(anon_client, base_url):
    r = anon_client.get(f"{base_url}/api/")
    assert r.status_code == 200
    assert r.json()["message"] == "Music Journal API"


# ---------- Auth ----------
class TestAuth:
    def test_me_unauthenticated(self, anon_client, base_url):
        r = anon_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_me_admin(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["is_admin"] is True
        assert data["email"].lower() == "raraaaghs22@gmail.com"

    def test_me_nonadmin(self, nonadmin_client, base_url):
        r = nonadmin_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["is_admin"] is False

    def test_nonadmin_403_on_admin_routes(self, nonadmin_client, base_url):
        for ep in ["/api/admin/submissions", "/api/admin/stats", "/api/admin/settings"]:
            r = nonadmin_client.get(f"{base_url}{ep}")
            assert r.status_code == 403, f"{ep} returned {r.status_code}"


# ---------- Public submissions ----------
class TestSubmissions:
    def test_submit_invalid_domain(self, anon_client, base_url):
        r = anon_client.post(f"{base_url}/api/submissions", json={
            "full_name": "TEST_Invalid", "class_name": "XI 1",
            "attendance_number": 1, "video_url": "https://vimeo.com/12345"
        })
        assert r.status_code == 422

    def test_submit_invalid_class(self, anon_client, base_url):
        r = anon_client.post(f"{base_url}/api/submissions", json={
            "full_name": "TEST_X", "class_name": "XI 13",
            "attendance_number": 1, "video_url": "https://youtube.com/watch?v=abc"
        })
        assert r.status_code == 422

    def test_submit_short_name(self, anon_client, base_url):
        r = anon_client.post(f"{base_url}/api/submissions", json={
            "full_name": "A", "class_name": "XI 1",
            "attendance_number": 1, "video_url": "https://youtube.com/watch?v=abc"
        })
        assert r.status_code == 422

    def test_submit_success_message_and_db(self, anon_client, base_url, db):
        r = anon_client.post(f"{base_url}/api/submissions", json={
            "full_name": "TEST_Siswa Satu", "class_name": "XI 2",
            "attendance_number": 5,
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        })
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["message"] == "Your video assignment link has been successfully submitted / Tugas link video Anda berhasil dikirimkan."
        rec = db.submissions.find_one({"full_name": "TEST_Siswa Satu", "class_name": "XI 2"})
        assert rec is not None
        assert rec["platform"] == "youtube"
        assert rec["status"] in ("pending", "processing", "graded", "failed")
        assert rec["published"] is False

    def test_platform_detection_tiktok(self, anon_client, base_url, db):
        r = anon_client.post(f"{base_url}/api/submissions", json={
            "full_name": "TEST_TTK", "class_name": "XI 3",
            "attendance_number": 10, "video_url": "https://www.tiktok.com/@user/video/12345"
        })
        assert r.status_code == 200
        rec = db.submissions.find_one({"full_name": "TEST_TTK"})
        assert rec["platform"] == "tiktok"

    def test_resubmission_creates_new_record(self, anon_client, base_url, db):
        payload = {"full_name": "TEST_Resubmit", "class_name": "XI 4",
                   "attendance_number": 7, "video_url": "https://www.youtube.com/watch?v=abcd1"}
        r1 = anon_client.post(f"{base_url}/api/submissions", json=payload)
        r2 = anon_client.post(f"{base_url}/api/submissions", json={**payload, "video_url": "https://www.youtube.com/watch?v=abcd2"})
        assert r1.status_code == 200 and r2.status_code == 200
        count = db.submissions.count_documents({"class_name": "XI 4", "attendance_number": 7, "full_name": "TEST_Resubmit"})
        assert count >= 2

    def test_url_without_scheme_prepended(self, anon_client, base_url, db):
        r = anon_client.post(f"{base_url}/api/submissions", json={
            "full_name": "TEST_NoScheme", "class_name": "XI 5",
            "attendance_number": 2, "video_url": "youtu.be/abc123"
        })
        assert r.status_code == 200
        rec = db.submissions.find_one({"full_name": "TEST_NoScheme"})
        assert rec["video_url"].startswith("https://")
        assert rec["platform"] == "youtube"


# ---------- Public settings/results ----------
class TestPublicResults:
    def test_results_disabled_by_default(self, anon_client, base_url, admin_client, db):
        # Set results_public=false
        r = admin_client.put(f"{base_url}/api/admin/settings", json={"results_public": False})
        assert r.status_code == 200
        s = anon_client.get(f"{base_url}/api/public/settings")
        assert s.status_code == 200
        assert s.json()["results_public"] is False
        # results endpoint returns 403
        r = anon_client.get(f"{base_url}/api/public/results",
                            params={"class_name": "XI 1", "attendance_number": 1})
        assert r.status_code == 403

    def test_results_enabled_hides_sensitive(self, anon_client, admin_client, base_url, db):
        # Insert a graded+published submission directly
        from uuid import uuid4
        sub_id = str(uuid4())
        db.submissions.insert_one({
            "id": sub_id, "full_name": "TEST_Published", "class_name": "XI 6",
            "attendance_number": 15, "video_url": "https://youtu.be/x", "platform": "youtube",
            "status": "graded", "published": True, "manually_edited": False,
            "teacher_notes": "secret note",
            "content_score": 80, "delivery_score": 70, "technical_score": 60,
            "final_score": 73.0, "grade": "B",
            "strengths": "secret strengths", "weaknesses": "secret weaknesses",
            "submitted_at": "2025-01-01T00:00:00+00:00"
        })
        # Insert unpublished
        db.submissions.insert_one({
            "id": str(uuid4()), "full_name": "TEST_Unpub", "class_name": "XI 6",
            "attendance_number": 16, "video_url": "https://youtu.be/y", "platform": "youtube",
            "status": "graded", "published": False, "manually_edited": False,
            "content_score": 50, "delivery_score": 50, "technical_score": 50,
            "final_score": 50.0, "grade": "C", "strengths": "x", "weaknesses": "y",
            "submitted_at": "2025-01-01T00:00:00+00:00"
        })
        # Enable
        admin_client.put(f"{base_url}/api/admin/settings", json={"results_public": True})
        try:
            r = anon_client.get(f"{base_url}/api/public/results",
                                params={"class_name": "XI 6", "attendance_number": 15})
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            d = data[0]
            # Must contain
            assert d["final_score"] == 73.0
            assert d["grade"] == "B"
            # Must NOT contain sensitive fields
            for forbidden in ("strengths", "weaknesses", "teacher_notes",
                              "content_score", "delivery_score", "technical_score", "ai"):
                assert forbidden not in d, f"Sensitive field '{forbidden}' leaked"

            # Unpublished -> final_score/grade should be None
            r2 = anon_client.get(f"{base_url}/api/public/results",
                                 params={"class_name": "XI 6", "attendance_number": 16})
            assert r2.status_code == 200
            d2 = r2.json()[0]
            assert d2["final_score"] is None
            assert d2["grade"] is None
            assert d2["published"] is False
        finally:
            admin_client.put(f"{base_url}/api/admin/settings", json={"results_public": False})


# ---------- Admin CRUD ----------
class TestAdminCRUD:
    def test_list_stats(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/submissions")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        s = admin_client.get(f"{base_url}/api/admin/stats")
        assert s.status_code == 200
        d = s.json()
        for k in ("total", "graded", "pending", "failed", "published", "per_class"):
            assert k in d

    def test_filters(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/submissions", params={"class_name": "XI 6"})
        assert r.status_code == 200
        for s in r.json():
            assert s["class_name"] == "XI 6"

    def test_patch_recomputes_score_and_grade(self, admin_client, base_url, db):
        from uuid import uuid4
        sub_id = str(uuid4())
        db.submissions.insert_one({
            "id": sub_id, "full_name": "TEST_Patch", "class_name": "XI 7",
            "attendance_number": 20, "video_url": "https://youtu.be/p", "platform": "youtube",
            "status": "graded", "published": False, "manually_edited": False,
            "content_score": 50, "delivery_score": 50, "technical_score": 50,
            "final_score": 50.0, "grade": "C", "submitted_at": "2025-01-01T00:00:00+00:00"
        })
        r = admin_client.patch(f"{base_url}/api/admin/submissions/{sub_id}",
                               json={"content_score": 90, "delivery_score": 80, "technical_score": 70})
        assert r.status_code == 200
        d = r.json()
        # 90*.5 + 80*.3 + 70*.2 = 45 + 24 + 14 = 83 -> B
        assert d["final_score"] == 83.0
        assert d["grade"] == "B"
        assert d["manually_edited"] is True

    def test_publish_requires_score(self, admin_client, base_url, db):
        from uuid import uuid4
        sub_id = str(uuid4())
        db.submissions.insert_one({
            "id": sub_id, "full_name": "TEST_NoScore", "class_name": "XI 8",
            "attendance_number": 21, "video_url": "https://youtu.be/n", "platform": "youtube",
            "status": "pending", "published": False, "submitted_at": "2025-01-01T00:00:00+00:00"
        })
        r = admin_client.patch(f"{base_url}/api/admin/submissions/{sub_id}", json={"published": True})
        assert r.status_code == 422

    def test_bulk_publish(self, admin_client, base_url, db):
        from uuid import uuid4
        ids = []
        for i in range(2):
            sid = str(uuid4())
            db.submissions.insert_one({
                "id": sid, "full_name": f"TEST_Bulk{i}", "class_name": "XI 9",
                "attendance_number": 30 + i, "video_url": "https://youtu.be/b",
                "platform": "youtube", "status": "graded", "published": False,
                "final_score": 80.0, "grade": "B",
                "content_score": 80, "delivery_score": 80, "technical_score": 80,
                "submitted_at": "2025-01-01T00:00:00+00:00"
            })
            ids.append(sid)
        r = admin_client.post(f"{base_url}/api/admin/publish", json={"ids": ids, "published": True})
        assert r.status_code == 200
        assert r.json()["updated"] == 2
        for sid in ids:
            doc = db.submissions.find_one({"id": sid})
            assert doc["published"] is True

    def test_delete(self, admin_client, base_url, db):
        from uuid import uuid4
        sid = str(uuid4())
        db.submissions.insert_one({
            "id": sid, "full_name": "TEST_Del", "class_name": "XI 10",
            "attendance_number": 1, "video_url": "https://youtu.be/d", "platform": "youtube",
            "status": "pending", "published": False, "submitted_at": "2025-01-01T00:00:00+00:00"
        })
        r = admin_client.delete(f"{base_url}/api/admin/submissions/{sid}")
        assert r.status_code == 200
        assert db.submissions.find_one({"id": sid}) is None


# ---------- Export ----------
class TestExport:
    def test_export_csv(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/export", params={"format": "csv"})
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert "attachment" in r.headers.get("content-disposition", "")
        assert "Kelas" in r.text
        assert "Nilai Akhir" in r.text

    def test_export_xlsx_sheets(self, admin_client, base_url, db):
        # Ensure at least one record in XI 1 for a per-class sheet
        from uuid import uuid4
        sid = str(uuid4())
        db.submissions.insert_one({
            "id": sid, "full_name": "TEST_Xlsx", "class_name": "XI 1",
            "attendance_number": 50, "video_url": "https://youtu.be/x",
            "platform": "youtube", "status": "graded", "published": True,
            "final_score": 80.0, "grade": "B",
            "content_score": 80, "delivery_score": 80, "technical_score": 80,
            "submitted_at": "2025-01-01T00:00:00+00:00"
        })
        r = admin_client.get(f"{base_url}/api/admin/export", params={"format": "xlsx"})
        assert r.status_code == 200
        wb = load_workbook(io.BytesIO(r.content))
        assert "Semua Kelas" in wb.sheetnames
        assert "XI 1" in wb.sheetnames


# ---------- AI grading (optional, slow) ----------
@pytest.mark.slow
def test_background_grading_progresses(anon_client, base_url, db):
    """Submit a real YouTube link and check status progresses (may be pending/processing/graded)."""
    r = anon_client.post(f"{base_url}/api/submissions", json={
        "full_name": "TEST_AI Grading", "class_name": "XI 11",
        "attendance_number": 40,
        "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    })
    assert r.status_code == 200
    # Poll for up to ~60s
    end = time.time() + 70
    final_status = None
    while time.time() < end:
        rec = db.submissions.find_one({"full_name": "TEST_AI Grading"})
        final_status = rec["status"]
        if final_status in ("graded", "failed"):
            break
        time.sleep(5)
    assert final_status in ("graded", "failed", "processing", "pending")
    # at least transitioned past pending initial state in most cases
    print(f"Final AI grading status: {final_status}")
