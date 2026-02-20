"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, RefreshCw, TrendingUp } from "lucide-react";
import { getCompetitors, createCompetitor, deleteCompetitor, trackCompetitorNow, type Competitor } from "@/lib/socialcubeApi";

export default function CompetitorsPage() {
  const router = useRouter();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPlatform, setNewPlatform] = useState("instagram");

  const load = () => {
    setLoading(true);
    getCompetitors()
      .then((res) => setCompetitors(res.data.results || []))
      .catch(() => setCompetitors([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newUsername.trim()) return;
    await createCompetitor({ platform: newPlatform, username: newUsername.trim().replace("@", "") });
    setNewUsername("");
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this competitor?")) return;
    await deleteCompetitor(id);
    load();
  };

  const handleTrack = async (id: number) => {
    await trackCompetitorNow(id);
    alert("Tracking queued");
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/socialcube")} className="p-2 hover:bg-card rounded-lg"><ArrowLeft className="w-5 h-5 text-text-secondary" /></button>
          <h1 className="text-2xl font-bold text-text-primary">Competitor Analysis</h1>
          <div className="flex-1" />
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-text-primary rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Add Competitor
          </button>
        </div>

        {showAdd && (
          <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
            <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm">
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
            </select>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="@username"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-text-primary rounded-lg text-sm">Add</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-text-secondary">Loading...</div>
        ) : competitors.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <TrendingUp className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary">No competitors tracked yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {competitors.map((comp) => (
              <div key={comp.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                {comp.profile_image_url ? (
                  <img src={comp.profile_image_url} className="w-12 h-12 rounded-full" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">
                    {comp.platform[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-text-primary">@{comp.username}</p>
                  <p className="text-sm text-text-secondary capitalize">{comp.platform}</p>
                </div>
                {comp.latest_snapshot && (
                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="text-lg font-bold text-text-primary">{comp.latest_snapshot.followers?.toLocaleString() || "-"}</p>
                      <p className="text-xs text-text-tertiary">followers</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-text-primary">{comp.latest_snapshot.engagement_rate?.toFixed(2) || "-"}%</p>
                      <p className="text-xs text-text-tertiary">engagement</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-text-primary">{comp.latest_snapshot.avg_likes?.toLocaleString() || "-"}</p>
                      <p className="text-xs text-text-tertiary">avg likes</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-1">
                  <button onClick={() => handleTrack(comp.id)} className="p-2 hover:bg-background rounded-lg text-text-secondary"><RefreshCw className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(comp.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
