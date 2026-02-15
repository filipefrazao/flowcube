"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ClipboardCheck, ArrowLeft, Loader2, Save, Check, X as XIcon,
  Calendar, Users, CheckSquare, Square, MinusSquare,
} from "lucide-react";
import { miniApi, type MiniClass, type Enrollment, type Attendance } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

interface AttendanceRow {
  enrollmentId: string;
  studentName: string;
  present: boolean;
  notes: string;
  existingAttendanceId?: string;
}

export default function PresencaPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classData, setClassData] = useState<MiniClass | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [rows, setRows] = useState<AttendanceRow[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cd, enroll] = await Promise.all([
        miniApi.getClass(classId),
        miniApi.getClassEnrollments(classId),
      ]);
      setClassData(cd);
      setEnrollments(enroll || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [classId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load attendance for selected date
  useEffect(() => {
    if (enrollments.length === 0) return;

    async function loadAttendance() {
      try {
        const existingData = await miniApi.listAttendances({
          date: selectedDate,
          limit: 500,
        });
        const existingMap = new Map<string, Attendance>();
        (existingData.results || []).forEach((a) => {
          existingMap.set(a.enrollment, a);
        });

        const newRows: AttendanceRow[] = enrollments.map((e) => {
          const existing = existingMap.get(e.id);
          return {
            enrollmentId: e.id,
            studentName: e.student_name || "Aluno",
            present: existing ? existing.present : false,
            notes: existing ? existing.notes : "",
            existingAttendanceId: existing?.id,
          };
        });
        setRows(newRows);
      } catch (err) {
        console.error(err);
        // Fallback: all absent
        setRows(enrollments.map((e) => ({
          enrollmentId: e.id,
          studentName: e.student_name || "Aluno",
          present: false,
          notes: "",
        })));
      }
    }
    loadAttendance();
  }, [enrollments, selectedDate]);

  function togglePresent(index: number) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, present: !r.present } : r));
  }

  function updateNotes(index: number, notes: string) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, notes } : r));
  }

  function markAll(present: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, present })));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setSaveSuccess(false);
      const records = rows.map((r) => ({
        enrollment: r.enrollmentId,
        date: selectedDate,
        present: r.present,
        notes: r.notes,
      }));
      await miniApi.bulkCreateAttendance(records);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar presenca");
    } finally { setSaving(false); }
  }

  const presentCount = rows.filter((r) => r.present).length;
  const absentCount = rows.filter((r) => !r.present).length;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-950">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-950 px-6 py-4 shrink-0">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => router.push(`/minicube/turmas/${classId}`)}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-100">Controle de Presenca</h1>
              <p className="text-sm text-gray-400">{classData?.name || "Turma"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div className="flex items-center gap-3 ml-auto text-sm">
              <span className="flex items-center gap-1.5 text-green-400">
                <Check className="w-4 h-4" /> {presentCount} presentes
              </span>
              <span className="flex items-center gap-1.5 text-red-400">
                <XIcon className="w-4 h-4" /> {absentCount} ausentes
              </span>
            </div>
          </div>
        </header>

        {/* Bulk actions */}
        <div className="border-b border-gray-800 bg-gray-950/50 px-6 py-2.5 flex items-center gap-3 shrink-0">
          <button onClick={() => markAll(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/10 transition-colors">
            <CheckSquare className="w-3.5 h-3.5" /> Marcar Todos Presente
          </button>
          <button onClick={() => markAll(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
            <Square className="w-3.5 h-3.5" /> Marcar Todos Ausente
          </button>
          <div className="flex-1" />
          <button onClick={handleSave} disabled={saving || rows.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              saveSuccess
                ? "bg-green-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            )}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? "Salvo!" : "Salvar Presenca"}
          </button>
        </div>

        {/* Attendance list */}
        <div className="flex-1 overflow-auto p-6">
          {rows.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum aluno matriculado nesta turma.</p>
              <button onClick={() => router.push(`/minicube/turmas/${classId}`)}
                className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                Adicionar alunos
              </button>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-center px-4 py-3 w-16 text-xs font-medium text-gray-500 uppercase tracking-wider">Presente</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Observacao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {rows.map((row, index) => (
                    <tr key={row.enrollmentId} className={cn("transition-colors", row.present ? "bg-green-500/5" : "hover:bg-gray-800/40")}>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => togglePresent(index)}
                          className={cn("w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                            row.present
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-gray-600 hover:border-gray-400"
                          )}>
                          {row.present && <Check className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-sm font-medium", row.present ? "text-gray-100" : "text-gray-400")}>
                          {row.studentName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.notes} onChange={(e) => updateNotes(index, e.target.value)}
                          placeholder="Observacao..."
                          className="w-full max-w-md px-3 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
