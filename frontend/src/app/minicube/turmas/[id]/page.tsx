"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  GraduationCap, ArrowLeft, Loader2, Users, Plus, Search, Pencil, Trash2,
  Calendar, ClipboardCheck, X, UserPlus,
} from "lucide-react";
import { miniApi, type MiniClass, type Enrollment, type Student } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

const ENROLLMENT_STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "confirmado", label: "Confirmado", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "ausente", label: "Ausente", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "sem_contato", label: "Sem Contato", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  { value: "transferido", label: "Transferido", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
];

const CLASS_STATUS = {
  proxima: { label: "Proxima", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  em_andamento: { label: "Em Andamento", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  finalizada: { label: "Finalizada", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  cancelada: { label: "Cancelada", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function TurmaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classData, setClassData] = useState<MiniClass | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add student dialog
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);

  // Edit enrollment status
  const [editingEnrollment, setEditingEnrollment] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cd, enroll, students] = await Promise.all([
        miniApi.getClass(classId),
        miniApi.getClassEnrollments(classId),
        miniApi.listStudents({ limit: 500 }),
      ]);
      setClassData(cd);
      setEnrollments(enroll || []);
      setAllStudents(students.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [classId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredEnrollments = enrollments.filter((e) =>
    !search || (e.student_name || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleAddStudent(studentId: string) {
    try {
      setAddingSaving(true);
      await miniApi.createEnrollment({
        student: studentId,
        course_class: classId,
        status: "pendente",
      });
      setShowAddStudent(false);
      setStudentSearch("");
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao adicionar aluno");
    } finally { setAddingSaving(false); }
  }

  async function handleUpdateEnrollmentStatus(enrollmentId: string, newStatus: string) {
    try {
      await miniApi.updateEnrollment(enrollmentId, { status: newStatus as any });
      setEditingEnrollment(null);
      fetchData();
    } catch (err) { console.error(err); }
  }

  async function handleRemoveEnrollment(enrollmentId: string) {
    if (!confirm("Remover aluno desta turma?")) return;
    try { await miniApi.deleteEnrollment(enrollmentId); fetchData(); } catch (err) { console.error(err); }
  }

  function getEnrollmentBadge(status: string) {
    const opt = ENROLLMENT_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", opt?.color || "bg-gray-500/20 text-gray-400 border-gray-500/30")}>
        {opt?.label || status}
      </span>
    );
  }

  // Students not yet enrolled
  const enrolledStudentIds = new Set(enrollments.map((e) => e.student));
  const availableStudents = allStudents.filter((s) =>
    !enrolledStudentIds.has(s.id) &&
    (!studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || (s.email || "").toLowerCase().includes(studentSearch.toLowerCase()))
  );

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

  if (!classData) {
    return (
      <div className="flex h-screen bg-gray-950">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center text-gray-400">Turma nao encontrada.</div>
      </div>
    );
  }

  const statusInfo = CLASS_STATUS[classData.status as keyof typeof CLASS_STATUS] || CLASS_STATUS.proxima;

  return (
    <div className="flex h-screen bg-gray-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-950 px-6 py-4 shrink-0">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => router.push("/minicube/turmas")}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-100">{classData.name}</h1>
                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusInfo.color)}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                {classData.product_name && <span>Produto: {classData.product_name}</span>}
                {classData.location_name && <span>Unidade: {classData.location_name}</span>}
                {classData.pole_name && <span>Polo: {classData.pole_name}</span>}
              </div>
            </div>
            <button onClick={() => router.push(`/minicube/turmas/${classId}/presenca`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
              <ClipboardCheck className="w-4 h-4" /> Presenca
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Users className="w-3.5 h-3.5" /> Alunos</div>
              <p className="text-lg font-semibold text-gray-100">{enrollments.length} / {classData.capacity}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Calendar className="w-3.5 h-3.5" /> Inicio</div>
              <p className="text-lg font-semibold text-gray-100">{classData.start_date ? new Date(classData.start_date).toLocaleDateString("pt-BR") : "-"}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Calendar className="w-3.5 h-3.5" /> Termino</div>
              <p className="text-lg font-semibold text-gray-100">{classData.end_date ? new Date(classData.end_date).toLocaleDateString("pt-BR") : "-"}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><GraduationCap className="w-3.5 h-3.5" /> Capacidade</div>
              <p className="text-lg font-semibold text-gray-100">{classData.capacity}</p>
            </div>
          </div>
        </header>

        {/* Students section */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-200">Alunos Matriculados</h2>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{enrollments.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <button onClick={() => setShowAddStudent(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                <UserPlus className="w-4 h-4" /> Adicionar Aluno
              </button>
            </div>
          </div>

          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum aluno matriculado nesta turma.</p>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Matricula</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredEnrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-100">{e.student_name || "-"}</td>
                      <td className="px-4 py-3">
                        {editingEnrollment === e.id ? (
                          <div className="flex items-center gap-2">
                            <select value={editStatus} onChange={(ev) => setEditStatus(ev.target.value)}
                              className="px-2 py-1 bg-gray-950 border border-gray-700 rounded text-xs text-gray-100 focus:outline-none focus:border-indigo-500">
                              {ENROLLMENT_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <button onClick={() => handleUpdateEnrollmentStatus(e.id, editStatus)}
                              className="text-xs text-green-400 hover:text-green-300">Salvar</button>
                            <button onClick={() => setEditingEnrollment(null)}
                              className="text-xs text-gray-500 hover:text-gray-300">Cancelar</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingEnrollment(e.id); setEditStatus(e.status); }}>
                            {getEnrollmentBadge(e.status)}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-[200px] truncate">{e.notes || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleRemoveEnrollment(e.id)} title="Remover"
                          className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Student Dialog */}
        {showAddStudent && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100">Adicionar Aluno</h2>
                <button onClick={() => { setShowAddStudent(false); setStudentSearch(""); }} className="p-1 rounded-md hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="Buscar por nome ou email..." value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div className="flex-1 overflow-auto">
                {availableStudents.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-8">Nenhum aluno disponivel. Todos ja estao matriculados ou nao ha alunos cadastrados.</p>
                ) : (
                  <div className="space-y-1">
                    {availableStudents.slice(0, 50).map((s) => (
                      <button key={s.id} onClick={() => handleAddStudent(s.id)} disabled={addingSaving}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-800 text-left transition-colors group">
                        <div>
                          <p className="text-sm font-medium text-gray-200">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.email || s.phone || s.cpf || "Sem contato"}</p>
                        </div>
                        <UserPlus className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
