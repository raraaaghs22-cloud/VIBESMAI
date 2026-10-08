import { useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const DeleteDialog = ({ target, onClose, onDeleted }) => {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/submissions/${target.id}`);
      toast.success("Data berhasil dihapus");
      onDeleted(target.id);
      onClose();
    } catch (e) { toast.error(errMsg(e, "Gagal menghapus data")); } finally { setBusy(false); }
  };
  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent data-testid="delete-confirm-dialog" className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus pengumpulan tugas?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus pengumpulan tugas dari siswa ini{target ? <> (<b>{target.full_name}</b>, Kelas {target.class_name})</> : null}? Data yang dihapus tidak dapat dikembalikan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-delete-cancel" className="rounded-xl">Batal</AlertDialogCancel>
          <AlertDialogAction data-testid="button-delete-confirm" disabled={busy} onClick={(e) => { e.preventDefault(); confirm(); }} className="rounded-xl bg-rose-600 text-white hover:bg-rose-700">
            {busy ? "Menghapus..." : "Ya, Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
