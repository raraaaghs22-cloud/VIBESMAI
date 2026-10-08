# PRD — Seni Musik XI: Jurnal Kelas & Penilaian AI

## Original problem statement
Guru Seni Musik SMA (12 kelas, Kelas XI 1–XI 12) ingin aplikasi full-stack jurnal kelas + penilaian AI otomatis. Siswa mengumpulkan link video tugas (TikTok/Instagram/Facebook/YouTube) di /submit (publik, bilingual EN/ID, kolom: Nama Lengkap, Kelas, Nomor Absen, Link Video). Validasi platform, simpan sebagai Private Draft, tampilkan pesan "Your video assignment link has been successfully submitted / Tugas link video Anda berhasil dikirimkan." Siswa tidak melihat proses AI. Dashboard guru dengan Emergent Google Auth (akun pertama login = Admin), tabel jurnal 12 kelas, filter, tinjau/edit hasil AI, privasi ketat (siswa hanya melihat status & nilai akhir yang dipublikasikan), ekspor CSV/Excel. AI: Gemini 3.1 Pro, inspeksi hybrid (oEmbed + URL metadata). Tugas "Creative Video Project: Musik di Sekitar Kita" (60–90 dtk, 9:16, fungsi musik + contoh nyata, subtitle). Rubrik: Content & Context 50%, Delivery & Subtitles 30%, Technical & Tagging 20% (#FungsiMusik, @Mr. Ocha). Output: skor 0–100, grade A/B/C/D, Strengths, Weaknesses & Suggestions.

User choices: guru bisa mengatur apakah halaman nilai siswa ditampilkan; AI otomatis di latar belakang; kirim ulang = pengumpulan baru (riwayat); desain terang & modern.

## Architecture
- Backend: FastAPI single `server.py`, MongoDB (users, user_sessions, submissions, settings). Background task grading via emergentintegrations (gemini-3.1-pro-preview, EMERGENT_LLM_KEY). Metadata: YouTube/TikTok oEmbed + page og/meta tags (+ YouTube lengthSeconds/description).
- Admin: db.settings {key:"admin"} — seeded from ADMIN_EMAIL=raraaaghs22@gmail.com, otherwise first login.
- Frontend: React routes /submit, /results, /login, /dashboard (protected). Lang context ID/EN.

## Personas
- Guru (admin): meninjau, mengedit, mempublikasikan, mengekspor nilai.
- Siswa (publik): mengirim link, cek status/nilai akhir yang dipublikasikan.

## Implemented (2026-10-08)
- Public submit form with platform detection & validation, exact success message, bilingual.
- Public /results (toggle by teacher), returns only status + published final score & grade.
- Google auth, admin-only dashboard: stats, filters, review sheet (rubric edit → auto recompute, strengths/weaknesses, private notes, publish), regrade, delete, bulk publish, CSV + Excel (all-classes + per-class sheets) export.
- Auto AI grading with failure status + restart recovery. Tested: 23/23 backend, frontend flows pass.

## Backlog
- P1: Show AI data-confidence filter; per-class export button.
- P2: Split server.py into routers; email notification to teacher on new submission.
