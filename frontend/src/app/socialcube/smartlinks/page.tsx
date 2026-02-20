"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Link2, Eye, Trash2, ExternalLink, Copy } from "lucide-react";
import { getSmartLinks, createSmartLink, deleteSmartLink, type SmartLinkPage } from "@/lib/socialcubeApi";

export default function SmartLinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<SmartLinkPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const load = () => {
    setLoading(true);
    getSmartLinks()
      .then((res) => setLinks(res.data.results || []))
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newTitle || !newSlug) return;
    await createSmartLink({
      title: newTitle,
      slug: newSlug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      bio: "",
      theme: { bg: "#1a1a2e", text: "#ffffff", accent: "#3b82f6" },
    });
    setNewTitle("");
    setNewSlug("");
    setShowCreate(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this SmartLink page?")) return;
    await deleteSmartLink(id);
    load();
  };

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/socialcube/s/${slug}`);
    alert("URL copied!");
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/socialcube")} className="p-2 hover:bg-card rounded-lg"><ArrowLeft className="w-5 h-5 text-text-secondary" /></button>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2"><Link2 className="w-6 h-6" /> SmartLinks</h1>
          <div className="flex-1" />
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-text-primary rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Create Page
          </button>
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Page Title" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm" />
            <div className="flex gap-2 items-center">
              <span className="text-sm text-text-tertiary">/s/</span>
              <input type="text" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="my-page" className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm" />
            </div>
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-text-primary rounded-lg text-sm">Create</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-text-secondary">Loading...</div>
        ) : links.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Link2 className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary">No SmartLink pages yet</p>
            <p className="text-sm text-text-tertiary mt-1">Create a bio link page for your social profiles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div key={link.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-text-primary font-bold text-lg">
                  {link.title[0]?.toUpperCase() || "S"}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{link.title}</p>
                  <p className="text-sm text-text-secondary">/s/{link.slug}</p>
                  <p className="text-xs text-text-tertiary">{link.buttons?.length || 0} buttons</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary flex items-center gap-1"><Eye className="w-4 h-4" /> {link.total_views}</p>
                    <p className="text-xs text-text-tertiary">views</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => copyUrl(link.slug)} className="p-2 hover:bg-background rounded-lg text-text-secondary" title="Copy URL"><Copy className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(link.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
