"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Loader2, X, Upload, Search, Trash2, FileText, Send } from "lucide-react";
import { aiApi, type KnowledgeBase, type KnowledgeDocument, type ChatTestResponse } from "@/lib/aiApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function KnowledgePage() {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBase, setSelectedBase] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<Partial<KnowledgeBase>>({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Query test state
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState<ChatTestResponse | null>(null);
  const [querying, setQuerying] = useState(false);

  useEffect(() => { loadBases(); }, []);

  async function loadBases() {
    try { setLoading(true); const d = await aiApi.listKnowledgeBases(); setBases(d.results || []); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function loadDocuments(kbId: number) {
    try { setDocsLoading(true); const d = await aiApi.listDocuments(kbId); setDocuments(d.results || []); }
    catch (err) { console.error(err); } finally { setDocsLoading(false); }
  }

  async function handleCreate() {
    try { setSaving(true); await aiApi.createKnowledgeBase(formData); setShowCreateForm(false);
      setFormData({ name: "", description: "" }); loadBases(); }
    catch (err) { console.error(err); } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Tem certeza?")) return;
    try { await aiApi.deleteKnowledgeBase(id); if (selectedBase?.id === id) { setSelectedBase(null); setDocuments([]); } loadBases(); }
    catch (err) { console.error(err); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedBase || !e.target.files?.[0]) return;
    try { setUploading(true); await aiApi.uploadDocument(selectedBase.id, e.target.files[0]); loadDocuments(selectedBase.id); }
    catch (err) { console.error(err); } finally { setUploading(false); e.target.value = ""; }
  }

  async function handleDeleteDoc(docId: number) {
    if (!selectedBase || !confirm("Excluir documento?")) return;
    try { await aiApi.deleteDocument(selectedBase.id, docId); loadDocuments(selectedBase.id); }
    catch (err) { console.error(err); }
  }

  async function handleTestQuery() {
    if (!selectedBase || !queryText.trim()) return;
    try { setQuerying(true); const r = await aiApi.testQuery(selectedBase.id, queryText); setQueryResult(r); }
    catch (err) { console.error(err); } finally { setQuerying(false); }
  }

  function selectBase(kb: KnowledgeBase) {
    setSelectedBase(kb);
    setQueryResult(null);
    setQueryText("");
    loadDocuments(kb.id);
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    processing: "bg-blue-500/20 text-blue-400",
    ready: "bg-green-500/20 text-green-400",
    error: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="flex h-screen bg-background-secondary">
      <AppSidebar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: KB List */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="h-14 border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">Bases de Conhecimento</h2>
            </div>
            <button onClick={() => setShowCreateForm(true)} className="p-1.5 bg-primary hover:bg-primary-hover text-gray-900 rounded">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : bases.length === 0 ? (
              <div className="text-center py-10 text-text-muted text-sm">Nenhuma base criada</div>
            ) : (
              bases.map((kb) => (
                <button key={kb.id} onClick={() => selectBase(kb)}
                  className={`w-full text-left p-3 border-b border-border/50 hover:bg-surface-hover transition-colors ${selectedBase?.id === kb.id ? "bg-surface border-l-2 border-l-primary" : ""}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-text-primary truncate">{kb.name}</h3>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(kb.id); }} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-text-muted truncate mt-1">{kb.description || "Sem descricao"}</p>
                  <div className="flex gap-3 mt-1 text-xs text-text-muted">
                    <span>{kb.documents_count || 0} doc(s)</span>
                    <span>{kb.chunks_count || 0} chunk(s)</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Documents + Query Test */}
        <div className="flex-1 flex flex-col">
          {!selectedBase ? (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Selecione uma base de conhecimento</p>
              </div>
            </div>
          ) : (
            <>
              <div className="h-14 border-b border-border flex items-center justify-between px-6">
                <h2 className="text-sm font-semibold text-text-primary">{selectedBase.name} - Documentos</h2>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-xs font-medium cursor-pointer">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Upload
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {docsLoading ? (
                  <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-10 text-text-muted text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhum documento. Faca upload para comecar.
                  </div>
                ) : (
                  <div className="space-y-2 mb-6">
                    {documents.map((doc) => (
                      <div key={doc.id} className="bg-surface rounded-lg border border-border p-3 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-text-secondary" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm text-text-primary truncate">{doc.title || doc.file_name}</h4>
                          <div className="flex gap-3 text-xs text-text-muted">
                            <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                            <span>{doc.chunks_count || 0} chunks</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[doc.status] || statusColors.pending}`}>
                          {doc.status}
                        </span>
                        <button onClick={() => handleDeleteDoc(doc.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Query Test */}
                <div className="bg-surface rounded-lg border border-border p-4 mt-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" /> Testar Consulta
                  </h3>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={queryText} onChange={(e) => setQueryText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTestQuery()}
                      placeholder="Faca uma pergunta..."
                      className="flex-1 px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary" />
                    <button onClick={handleTestQuery} disabled={querying || !queryText.trim()}
                      className="px-3 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg disabled:opacity-50">
                      {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  {queryResult && (
                    <div className="space-y-3">
                      <div className="bg-background-secondary rounded-lg p-3">
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{queryResult.response}</p>
                      </div>
                      {queryResult.sources && queryResult.sources.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-text-secondary mb-2">Fontes</h4>
                          {queryResult.sources.map((s, i) => (
                            <div key={i} className="text-xs text-text-muted mb-1">
                              <span className="text-text-primary">{s.document}</span> - score: {s.score.toFixed(3)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Create KB Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Nova Base de Conhecimento</h2>
                <button onClick={() => setShowCreateForm(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm text-text-primary mb-1">Nome</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" /></div>
                <div><label className="block text-sm text-text-primary mb-1">Descricao</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" rows={3} /></div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-text-primary hover:text-text-primary">Cancelar</button>
                  <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Base
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
