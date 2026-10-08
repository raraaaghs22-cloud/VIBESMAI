import { createContext, createElement, useContext, useState } from "react";

const DICT = {
  id: {
    navSubmit: "Kumpulkan Tugas",
    navResults: "Cek Nilai",
    overline: "Seni Musik · Kelas XI",
    project: "Creative Video Project: Musik di Sekitar Kita",
    intro: "Kumpulkan link video tugasmu dari TikTok, Instagram, Facebook, atau YouTube.",
    req: ["Durasi 60–90 detik", "Format vertikal 9:16", "Jelaskan fungsi musik + contoh nyata", "Pakai subtitle", "#FungsiMusik & tag @Mr. Ocha"],
    name: "Nama Lengkap",
    namePh: "Contoh: Ayu Lestari",
    klass: "Kelas",
    klassPh: "Pilih kelas",
    absen: "Nomor Absen",
    link: "Link Video Tugas",
    linkPh: "https://www.tiktok.com/@kamu/video/…",
    linkInvalid: "Link harus dari TikTok, Instagram, Facebook, atau YouTube.",
    detected: "Terdeteksi",
    submit: "Kirim Tugas",
    sending: "Mengirim…",
    fillAll: "Lengkapi semua kolom terlebih dahulu.",
    again: "Kirim link lain",
    resultsTitle: "Cek Status & Nilai",
    resultsIntro: "Masukkan kelas dan nomor absen untuk melihat status pengumpulan dan nilai akhir yang sudah dipublikasikan guru.",
    search: "Cari",
    noResults: "Belum ada pengumpulan untuk kelas dan nomor absen ini.",
    disabled: "Halaman nilai belum dibuka oleh guru. Silakan cek kembali nanti.",
    submitted: "Terkumpul",
    finalScore: "Nilai Akhir",
    notPublished: "Belum dipublikasikan",
    submittedAt: "Dikirim",
  },
  en: {
    navSubmit: "Submit Assignment",
    navResults: "Check Grades",
    overline: "Music Arts · Grade XI",
    project: "Creative Video Project: Music Around Us",
    intro: "Submit your assignment video link from TikTok, Instagram, Facebook, or YouTube.",
    req: ["60–90 seconds long", "Vertical 9:16 format", "Explain music's function + real examples", "Include subtitles", "#FungsiMusik & tag @Mr. Ocha"],
    name: "Full Name",
    namePh: "e.g. Ayu Lestari",
    klass: "Class",
    klassPh: "Select class",
    absen: "Attendance Number",
    link: "Assignment Video Link",
    linkPh: "https://www.tiktok.com/@you/video/…",
    linkInvalid: "Link must be from TikTok, Instagram, Facebook, or YouTube.",
    detected: "Detected",
    submit: "Submit Assignment",
    sending: "Submitting…",
    fillAll: "Please complete all fields first.",
    again: "Submit another link",
    resultsTitle: "Check Status & Grades",
    resultsIntro: "Enter your class and attendance number to see your submission status and any final grade your teacher has published.",
    search: "Search",
    noResults: "No submissions found for this class and attendance number.",
    disabled: "The grades page has not been opened by the teacher yet. Please check back later.",
    submitted: "Submitted",
    finalScore: "Final Score",
    notPublished: "Not published yet",
    submittedAt: "Submitted",
  },
};

export const SUCCESS_MSG = "Your video assignment link has been successfully submitted / Tugas link video Anda berhasil dikirimkan.";

const LangCtx = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => localStorage.getItem("lang") || "id");
  const setLang = (l) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  };
  return createElement(LangCtx.Provider, { value: { lang, setLang, t: DICT[lang] } }, children);
};

export const useLang = () => useContext(LangCtx);
