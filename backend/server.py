from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, BackgroundTasks, Depends, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import io
import re
import csv
import json
import html
import uuid
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '').strip().lower()

app = FastAPI()
api = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

CLASSES = [f"XI {i}" for i in range(1, 13)]
PLATFORM_PATTERNS = {
    "youtube": r"(^|\.)(youtube\.com|youtu\.be)$",
    "tiktok": r"(^|\.)tiktok\.com$",
    "instagram": r"(^|\.)(instagram\.com|instagr\.am)$",
    "facebook": r"(^|\.)(facebook\.com|fb\.watch|fb\.com)$",
}
ASSIGNMENT = """Judul tugas: "Creative Video Project: Musik di Sekitar Kita"
Ketentuan: Durasi 60-90 detik, format vertikal 9:16, menjelaskan fungsi musik dengan contoh dunia nyata, dan dilengkapi subtitle.
Wajib memakai hashtag #FungsiMusik dan tag @Mr. Ocha."""
RUBRIC = """Rubrik & bobot:
1. Content & Context (50%): keakuratan penjelasan fungsi musik dan keberadaan contoh nyata (audio/visual/pertunjukan).
2. Delivery & Subtitles (30%): penyampaian komunikatif, kejelasan, adanya teks/subtitle di layar.
3. Technical & Tagging (20%): orientasi vertikal, kesesuaian durasi (60-90 detik), hashtag #FungsiMusik, tag @Mr. Ocha."""


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def detect_platform(url: str) -> Optional[str]:
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return None
    for name, pat in PLATFORM_PATTERNS.items():
        if re.search(pat, host):
            return name
    return None


def letter_grade(score: float) -> str:
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    if score >= 55:
        return "C"
    return "D"


def weighted(content: float, delivery: float, technical: float) -> float:
    return round(content * 0.5 + delivery * 0.3 + technical * 0.2, 1)


# ---------- Models ----------
class SubmissionIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    class_name: str
    attendance_number: int = Field(ge=1, le=60)
    video_url: str = Field(max_length=1000)

    @field_validator("class_name")
    @classmethod
    def check_class(cls, v):
        if v not in CLASSES:
            raise ValueError("Invalid class")
        return v

    @field_validator("full_name", "video_url")
    @classmethod
    def strip(cls, v):
        return v.strip()


class SubmissionUpdate(BaseModel):
    content_score: Optional[float] = Field(default=None, ge=0, le=100)
    delivery_score: Optional[float] = Field(default=None, ge=0, le=100)
    technical_score: Optional[float] = Field(default=None, ge=0, le=100)
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    teacher_notes: Optional[str] = None
    published: Optional[bool] = None


class BulkPublish(BaseModel):
    ids: List[str]
    published: bool


class SettingsIn(BaseModel):
    results_public: bool


# ---------- Auth ----------
async def get_admin_email() -> Optional[str]:
    doc = await db.settings.find_one({"key": "admin"}, {"_id": 0})
    return doc["email"] if doc else None


async def current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(401, "Invalid session")
    exp = sess["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(401, "Session expired")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    admin_email = await get_admin_email()
    user["is_admin"] = bool(admin_email) and user["email"].lower() == admin_email
    return user


async def require_admin(user: dict = Depends(current_user)) -> dict:
    if not user["is_admin"]:
        raise HTTPException(403, "Admin access only")
    return user


@api.post("/auth/session")
async def create_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(400, "Missing session id")
    async with httpx.AsyncClient(timeout=20) as hc:
        r = await hc.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                         headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session id")
    data = r.json()
    email = data["email"].lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name"), "picture": data.get("picture")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({"user_id": user_id, "email": email, "name": data.get("name"),
                                   "picture": data.get("picture"), "created_at": now_iso()})
    # First account to log in becomes admin (only if no admin assigned yet)
    await db.settings.update_one({"key": "admin"}, {"$setOnInsert": {"key": "admin", "email": email}}, upsert=True)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": data["session_token"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7), "created_at": now_iso()})
    response.set_cookie("session_token", data["session_token"], httponly=True, secure=True,
                        samesite="none", path="/", max_age=7 * 24 * 3600)
    admin_email = await get_admin_email()
    return {"user_id": user_id, "email": email, "name": data.get("name"), "picture": data.get("picture"),
            "is_admin": email == admin_email}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"ok": True}


# ---------- Metadata extraction ----------
def meta_content(page: str, *names) -> Optional[str]:
    for n in names:
        m = re.search(rf'<meta[^>]+(?:property|name|itemprop)=["\']{re.escape(n)}["\'][^>]*content=["\']([^"\']*)["\']', page, re.I) \
            or re.search(rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name|itemprop)=["\']{re.escape(n)}["\']', page, re.I)
        if m and m.group(1).strip():
            return html.unescape(m.group(1).strip())
    return None


async def fetch_metadata(url: str, platform: str) -> dict:
    meta = {"platform": platform, "url": url}
    path = urlparse(url).path.lower()
    if platform == "youtube" and "/shorts/" in path:
        meta["url_hint"] = "YouTube Shorts URL (format vertikal 9:16, maks 60 detik kecuali akun tertentu)"
    if platform == "instagram" and "/reel" in path:
        meta["url_hint"] = "Instagram Reel URL (biasanya vertikal 9:16)"
    if platform == "facebook" and ("/reel" in path or "fb.watch" in url):
        meta["url_hint"] = "Facebook Reel/Watch URL"
    if platform == "tiktok":
        meta["url_hint"] = "TikTok video (biasanya vertikal 9:16)"
    headers = {"User-Agent": "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)",
               "Accept-Language": "id,en;q=0.8"}
    oembed_url = {"youtube": "https://www.youtube.com/oembed", "tiktok": "https://www.tiktok.com/oembed"}.get(platform)
    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=headers) as hc:
        if oembed_url:
            try:
                r = await hc.get(oembed_url, params={"url": url, "format": "json"})
                if r.status_code == 200:
                    o = r.json()
                    meta["oembed"] = {k: o.get(k) for k in ("title", "author_name", "author_url", "width", "height",
                                                            "thumbnail_width", "thumbnail_height") if o.get(k) is not None}
            except Exception as e:
                logger.info(f"oEmbed failed: {e}")
        try:
            r = await hc.get(url)
            if r.status_code == 200:
                page = r.text[:600000]
                meta["page"] = {k: v for k, v in {
                    "title": meta_content(page, "og:title", "twitter:title", "title"),
                    "description": meta_content(page, "og:description", "description", "twitter:description"),
                    "video_width": meta_content(page, "og:video:width"),
                    "video_height": meta_content(page, "og:video:height"),
                    "duration_iso": meta_content(page, "duration"),
                    "keywords": meta_content(page, "keywords"),
                }.items() if v}
                if platform == "youtube":
                    m = re.search(r'"lengthSeconds":"(\d+)"', page)
                    if m:
                        meta["page"]["duration_seconds"] = int(m.group(1))
                    m = re.search(r'"shortDescription":"((?:[^"\\]|\\.)*)"', page)
                    if m:
                        try:
                            meta["page"]["full_description"] = json.loads(f'"{m.group(1)}"')[:3000]
                        except Exception:
                            pass
                if platform == "tiktok":
                    m = re.search(r'"duration":(\d+)', page)
                    if m:
                        meta["page"]["duration_seconds"] = int(m.group(1))
            else:
                meta["page_status"] = r.status_code
        except Exception as e:
            meta["page_error"] = str(e)[:200]
    return meta


# ---------- AI grading ----------
SYSTEM_PROMPT = f"""Anda adalah asisten penilai untuk Guru Seni Musik SMA (Mr. Ocha).
Nilai tugas video siswa berdasarkan METADATA yang tersedia (judul, caption/deskripsi, hashtag, durasi, orientasi, konteks URL).
Anda tidak dapat menonton video secara langsung; jika informasi tidak tersedia, berikan estimasi wajar yang konservatif dan sebutkan keterbatasan data.
{ASSIGNMENT}
{RUBRIC}
Balas HANYA dengan JSON valid (tanpa markdown) dengan kunci:
"content_score" (0-100), "delivery_score" (0-100), "technical_score" (0-100),
"strengths" (string, poin-poin kelebihan dalam Bahasa Indonesia, pisahkan dengan baris baru dan awali "- "),
"weaknesses" (string, poin-poin kekurangan & saran perbaikan dalam Bahasa Indonesia, format sama),
"data_confidence" ("high" | "medium" | "low")."""


def parse_json(text: str) -> dict:
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text)


async def grade_submission(sub_id: str):
    sub = await db.submissions.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        return
    await db.submissions.update_one({"id": sub_id}, {"$set": {"status": "processing", "error": None}})
    try:
        meta = await fetch_metadata(sub["video_url"], sub["platform"])
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"grade-{sub_id}-{uuid.uuid4().hex[:6]}",
                       system_message=SYSTEM_PROMPT).with_model("gemini", "gemini-3.1-pro-preview")
        prompt = (f"Siswa: {sub['full_name']} (Kelas {sub['class_name']}, Absen {sub['attendance_number']})\n"
                  f"Link video: {sub['video_url']}\nMetadata hasil inspeksi:\n{json.dumps(meta, ensure_ascii=False, indent=2)}")
        reply = await chat.send_message(UserMessage(text=prompt))
        res = parse_json(reply)
        c, d, t = (max(0.0, min(100.0, float(res[k]))) for k in ("content_score", "delivery_score", "technical_score"))
        score = weighted(c, d, t)
        ai = {"content_score": c, "delivery_score": d, "technical_score": t, "final_score": score,
              "grade": letter_grade(score), "strengths": res.get("strengths", ""),
              "weaknesses": res.get("weaknesses", ""), "data_confidence": res.get("data_confidence", "low"),
              "graded_at": now_iso()}
        await db.submissions.update_one({"id": sub_id}, {"$set": {
            "status": "graded", "metadata": meta, "ai": ai,
            **{k: ai[k] for k in ("content_score", "delivery_score", "technical_score", "final_score",
                                  "grade", "strengths", "weaknesses")},
            "manually_edited": False}})
    except Exception as e:
        logger.exception("AI grading failed")
        await db.submissions.update_one({"id": sub_id}, {"$set": {"status": "failed", "error": str(e)[:300]}})


# ---------- Public ----------
async def results_public() -> bool:
    doc = await db.settings.find_one({"key": "results_public"}, {"_id": 0})
    return bool(doc and doc.get("value"))


@api.get("/")
async def root():
    return {"message": "Music Journal API"}


@api.post("/submissions")
async def create_submission(data: SubmissionIn, bg: BackgroundTasks):
    url = data.video_url
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    platform = detect_platform(url)
    if not platform:
        raise HTTPException(422, "Link must be from TikTok, Instagram, Facebook, or YouTube")
    doc = {"id": str(uuid.uuid4()), "full_name": data.full_name, "class_name": data.class_name,
           "attendance_number": data.attendance_number, "video_url": url, "platform": platform,
           "status": "pending", "published": False, "manually_edited": False, "teacher_notes": "",
           "submitted_at": now_iso()}
    await db.submissions.insert_one(doc)
    bg.add_task(grade_submission, doc["id"])
    return {"ok": True, "message": "Your video assignment link has been successfully submitted / Tugas link video Anda berhasil dikirimkan."}


@api.get("/public/settings")
async def public_settings():
    return {"results_public": await results_public()}


@api.get("/public/results")
async def public_results(class_name: str, attendance_number: int):
    if not await results_public():
        raise HTTPException(403, "Results page is disabled")
    subs = await db.submissions.find({"class_name": class_name, "attendance_number": attendance_number},
                                     {"_id": 0}).sort("submitted_at", -1).to_list(50)
    return [{"full_name": s["full_name"], "class_name": s["class_name"], "attendance_number": s["attendance_number"],
             "platform": s["platform"], "submitted_at": s["submitted_at"], "published": s.get("published", False),
             "final_score": s.get("final_score") if s.get("published") else None,
             "grade": s.get("grade") if s.get("published") else None} for s in subs]


# ---------- Admin ----------
def build_query(class_name, platform, status, q, published=None):
    query = {}
    if class_name:
        query["class_name"] = class_name
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    if published is not None:
        query["published"] = published
    if q:
        query["full_name"] = {"$regex": re.escape(q), "$options": "i"}
    return query


def class_sort_key(s):
    return (int(s["class_name"].split()[-1]), s["attendance_number"], s["submitted_at"])


@api.get("/admin/submissions")
async def list_submissions(class_name: Optional[str] = None, platform: Optional[str] = None,
                           status: Optional[str] = None, q: Optional[str] = None,
                           published: Optional[bool] = None, _: dict = Depends(require_admin)):
    return await db.submissions.find(build_query(class_name, platform, status, q, published),
                                     {"_id": 0, "metadata": 0}).sort("submitted_at", -1).to_list(5000)


@api.get("/admin/stats")
async def stats(_: dict = Depends(require_admin)):
    subs = await db.submissions.find({}, {"_id": 0, "status": 1, "final_score": 1, "published": 1, "class_name": 1}).to_list(10000)
    graded = [s for s in subs if s.get("final_score") is not None]
    per_class = {c: 0 for c in CLASSES}
    for s in subs:
        per_class[s["class_name"]] = per_class.get(s["class_name"], 0) + 1
    return {"total": len(subs), "graded": len(graded),
            "pending": sum(1 for s in subs if s["status"] in ("pending", "processing")),
            "failed": sum(1 for s in subs if s["status"] == "failed"),
            "published": sum(1 for s in subs if s.get("published")),
            "avg_score": round(sum(s["final_score"] for s in graded) / len(graded), 1) if graded else None,
            "per_class": per_class}


@api.get("/admin/submissions/{sub_id}")
async def get_submission(sub_id: str, _: dict = Depends(require_admin)):
    s = await db.submissions.find_one({"id": sub_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Not found")
    return s


@api.patch("/admin/submissions/{sub_id}")
async def update_submission(sub_id: str, data: SubmissionUpdate, _: dict = Depends(require_admin)):
    s = await db.submissions.find_one({"id": sub_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Not found")
    upd = data.model_dump(exclude_none=True)
    score_keys = {"content_score", "delivery_score", "technical_score"}
    if score_keys & upd.keys():
        merged = {k: upd.get(k, s.get(k)) for k in score_keys}
        if any(v is None for v in merged.values()):
            raise HTTPException(422, "All three rubric scores are required")
        upd["final_score"] = weighted(merged["content_score"], merged["delivery_score"], merged["technical_score"])
        upd["grade"] = letter_grade(upd["final_score"])
        if s.get("status") != "graded":
            upd["status"] = "graded"
    if upd.get("published") and (upd.get("final_score") if "final_score" in upd else s.get("final_score")) is None:
        raise HTTPException(422, "Cannot publish without a score")
    if set(upd) - {"published", "teacher_notes"}:
        upd["manually_edited"] = True
    upd["updated_at"] = now_iso()
    await db.submissions.update_one({"id": sub_id}, {"$set": upd})
    return await db.submissions.find_one({"id": sub_id}, {"_id": 0})


@api.post("/admin/submissions/{sub_id}/regrade")
async def regrade(sub_id: str, bg: BackgroundTasks, _: dict = Depends(require_admin)):
    res = await db.submissions.update_one({"id": sub_id}, {"$set": {"status": "pending"}})
    if not res.matched_count:
        raise HTTPException(404, "Not found")
    bg.add_task(grade_submission, sub_id)
    return {"ok": True}


@api.delete("/admin/submissions/{sub_id}")
async def delete_submission(sub_id: str, _: dict = Depends(require_admin)):
    await db.submissions.delete_one({"id": sub_id})
    return {"ok": True}


@api.post("/admin/publish")
async def bulk_publish(data: BulkPublish, _: dict = Depends(require_admin)):
    query = {"id": {"$in": data.ids}}
    if data.published:
        query["final_score"] = {"$ne": None}
    res = await db.submissions.update_many(query, {"$set": {"published": data.published, "updated_at": now_iso()}})
    return {"updated": res.modified_count}


@api.get("/admin/settings")
async def get_settings(user: dict = Depends(require_admin)):
    return {"results_public": await results_public(), "admin_email": await get_admin_email()}


@api.put("/admin/settings")
async def put_settings(data: SettingsIn, _: dict = Depends(require_admin)):
    await db.settings.update_one({"key": "results_public"}, {"$set": {"value": data.results_public}}, upsert=True)
    return {"results_public": data.results_public}


EXPORT_COLS = [("Kelas", "class_name"), ("No. Absen", "attendance_number"), ("Nama Lengkap", "full_name"),
               ("Platform", "platform"), ("Link Video", "video_url"), ("Waktu Kirim", "submitted_at"),
               ("Status", "status"), ("Content & Context (50%)", "content_score"),
               ("Delivery & Subtitles (30%)", "delivery_score"), ("Technical & Tagging (20%)", "technical_score"),
               ("Nilai Akhir", "final_score"), ("Grade", "grade"), ("Dipublikasikan", "published"),
               ("Diedit Manual", "manually_edited"), ("Kelebihan", "strengths"),
               ("Kekurangan & Saran", "weaknesses"), ("Catatan Guru", "teacher_notes")]


@api.get("/admin/export")
async def export(format: str = Query("csv", pattern="^(csv|xlsx)$"), class_name: Optional[str] = None,
                 _: dict = Depends(require_admin)):
    subs = await db.submissions.find(build_query(class_name, None, None, None), {"_id": 0, "metadata": 0}).to_list(10000)
    subs.sort(key=class_sort_key)
    rows = [[("Ya" if s.get(k) else "Tidak") if k in ("published", "manually_edited") else s.get(k, "") if s.get(k) is not None else ""
             for _, k in EXPORT_COLS] for s in subs]
    headers = [h for h, _ in EXPORT_COLS]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = f"_kelas_{class_name.replace(' ', '_')}" if class_name else ""
    if format == "csv":
        buf = io.StringIO()
        buf.write("\ufeff")
        w = csv.writer(buf)
        w.writerow(headers)
        w.writerows(rows)
        return Response(buf.getvalue(), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": f'attachment; filename="rekap_nilai_seni_musik{suffix}_{stamp}.csv"'})
    wb = Workbook()
    wb.remove(wb.active)
    if class_name:
        groups = [(f"Kelas {class_name}", subs)]
    else:
        groups = [("Semua Kelas", subs)] + [(c, [s for s in subs if s["class_name"] == c]) for c in CLASSES]
    for title, items in groups:
        if title not in ("Semua Kelas", f"Kelas {class_name}") and not items:
            continue
        ws = wb.create_sheet(title)
        ws.append(headers)
        for cell in ws[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="1E293B")
        for s in items:
            ws.append(rows[subs.index(s)])
        for i, (h, _) in enumerate(EXPORT_COLS, start=1):
            ws.column_dimensions[ws.cell(1, i).column_letter].width = 40 if i in (5, 15, 16, 17) else max(12, len(h) + 2)
    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    return StreamingResponse(out, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f'attachment; filename="rekap_nilai_seni_musik{suffix}_{stamp}.xlsx"'})


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.submissions.create_index("id", unique=True)
    await db.submissions.create_index([("class_name", 1), ("attendance_number", 1)])
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token")
    if ADMIN_EMAIL:
        await db.settings.update_one({"key": "admin"}, {"$setOnInsert": {"key": "admin", "email": ADMIN_EMAIL}}, upsert=True)
    # Recover submissions interrupted by a restart
    stuck = await db.submissions.find({"status": {"$in": ["pending", "processing"]}}, {"_id": 0, "id": 1}).to_list(500)
    for s in stuck:
        asyncio.create_task(grade_submission(s["id"]))


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
