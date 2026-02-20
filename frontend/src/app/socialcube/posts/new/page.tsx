"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Image, Video, Sparkles, Hash, Clock, Eye } from "lucide-react";
import {
  getAccounts, createPost, uploadMedia,
  generateCaption, suggestHashtags, improveCaption,
  type SocialAccount, type PostMedia,
} from "@/lib/socialcubeApi";

export default function NewPostPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [postType, setPostType] = useState("image");
  const [scheduledAt, setScheduledAt] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [mediaFiles, setMediaFiles] = useState<PostMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    getAccounts().then((res) => {
      const data = Array.isArray(res.data) ? res.data : [];
      setAccounts(data.filter((a: SocialAccount) => a.is_active));
    });
  }, []);

  const toggleAccount = (id: number) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const res = await uploadMedia(file);
        setMediaFiles((prev) => [...prev, res.data]);
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
    setUploading(false);
  };

  const handleAICaption = async () => {
    if (!title) return;
    setAiLoading("caption");
    try {
      const res = await generateCaption(title, selectedAccountIds.length > 0 ? accounts.find(a => a.id === selectedAccountIds[0])?.platform : "instagram");
      setCaption(res.data.caption);
    } catch (err) {
      console.error(err);
    }
    setAiLoading("");
  };

  const handleAIHashtags = async () => {
    if (!caption) return;
    setAiLoading("hashtags");
    try {
      const res = await suggestHashtags(caption);
      setHashtags(res.data.hashtags || []);
    } catch (err) {
      console.error(err);
    }
    setAiLoading("");
  };

  const handleAIImprove = async () => {
    if (!caption) return;
    setAiLoading("improve");
    try {
      const res = await improveCaption(caption);
      setCaption(res.data.improved_caption);
    } catch (err) {
      console.error(err);
    }
    setAiLoading("");
  };

  const addHashtag = () => {
    if (hashtagInput.trim()) {
      const tag = hashtagInput.trim().replace(/^#/, "");
      if (!hashtags.includes(tag)) setHashtags([...hashtags, tag]);
      setHashtagInput("");
    }
  };

  const handleSave = async (publish: boolean) => {
    if (selectedAccountIds.length === 0) return alert("Select at least one account");
    setSaving(true);
    try {
      const data: any = {
        title,
        caption: caption + (hashtags.length > 0 ? "\n\n" + hashtags.map(h => `#${h}`).join(" ") : ""),
        hashtags,
        post_type: postType,
        account_ids: selectedAccountIds,
        media_ids: mediaFiles.map(m => m.id),
        first_comment: firstComment,
      };
      if (scheduledAt) data.scheduled_at = new Date(scheduledAt).toISOString();

      const res = await createPost(data);

      if (publish) {
        const { publishNow } = await import("@/lib/socialcubeApi");
        await publishNow(res.data.id);
      }

      router.push("/socialcube");
    } catch (err) {
      console.error(err);
      alert("Failed to save post");
    }
    setSaving(false);
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-card rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-2xl font-bold text-text-primary">Create New Post</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div className="bg-card border border-border rounded-xl p-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">Title (internal)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g. Product launch announcement"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Caption */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-secondary">Caption</label>
                <div className="flex gap-2">
                  <button onClick={handleAICaption} disabled={!!aiLoading} className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50">
                    <Sparkles className="w-3 h-3" /> {aiLoading === "caption" ? "..." : "Generate"}
                  </button>
                  <button onClick={handleAIImprove} disabled={!!aiLoading} className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-50">
                    <Sparkles className="w-3 h-3" /> {aiLoading === "improve" ? "..." : "Improve"}
                  </button>
                </div>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={6}
                placeholder="Write your caption..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
              <p className="text-xs text-text-tertiary mt-1">{caption.length} characters</p>
            </div>

            {/* Hashtags */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-secondary">Hashtags</label>
                <button onClick={handleAIHashtags} disabled={!!aiLoading} className="flex items-center gap-1 text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50">
                  <Hash className="w-3 h-3" /> {aiLoading === "hashtags" ? "..." : "AI Suggest"}
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                  placeholder="Add hashtag..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button onClick={addHashtag} className="px-3 py-2 bg-blue-600 text-text-primary rounded-lg text-sm">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                    #{tag}
                    <button onClick={() => setHashtags(hashtags.filter(h => h !== tag))} className="hover:text-red-400">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Media Upload */}
            <div className="bg-card border border-border rounded-xl p-4">
              <label className="text-sm font-medium text-text-secondary mb-2 block">Media</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <Image className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-secondary">{uploading ? "Uploading..." : "Upload"}</span>
                  <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <div className="flex gap-2">
                  {["image", "video", "carousel"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setPostType(type)}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${postType === type ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-border text-text-secondary hover:border-blue-500/50"}`}
                    >
                      {type === "image" && <Image className="w-3 h-3 inline mr-1" />}
                      {type === "video" && <Video className="w-3 h-3 inline mr-1" />}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {mediaFiles.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {mediaFiles.map((m) => (
                    <div key={m.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      {m.media_type === "image" ? (
                        <img src={m.file} alt={m.alt_text} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-background flex items-center justify-center">
                          <Video className="w-6 h-6 text-text-tertiary" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* First Comment */}
            <div className="bg-card border border-border rounded-xl p-4">
              <label className="text-sm font-medium text-text-secondary mb-2 block">First Comment (optional)</label>
              <input
                type="text"
                value={firstComment}
                onChange={(e) => setFirstComment(e.target.value)}
                placeholder="Add a first comment after publishing..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Accounts */}
            <div className="bg-card border border-border rounded-xl p-4">
              <label className="text-sm font-medium text-text-secondary mb-3 block">Post to accounts</label>
              {accounts.length === 0 ? (
                <p className="text-sm text-text-tertiary">
                  No accounts connected.{" "}
                  <button onClick={() => router.push("/socialcube/accounts")} className="text-blue-400 hover:underline">Connect one</button>
                </p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <label key={acc.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedAccountIds.includes(acc.id) ? "bg-blue-500/20 border border-blue-500/50" : "hover:bg-background border border-transparent"}`}>
                      <input
                        type="checkbox"
                        checked={selectedAccountIds.includes(acc.id)}
                        onChange={() => toggleAccount(acc.id)}
                        className="accent-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        {acc.profile_image_url ? (
                          <img src={acc.profile_image_url} className="w-6 h-6 rounded-full" alt="" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400">
                            {acc.platform[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-text-primary">{acc.username}</p>
                          <p className="text-xs text-text-tertiary capitalize">{acc.platform}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-card border border-border rounded-xl p-4">
              <label className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Schedule
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-xs text-text-tertiary mt-1">Leave empty to save as draft</p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border text-text-primary rounded-xl hover:bg-background transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : scheduledAt ? "Schedule Post" : "Save Draft"}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || selectedAccountIds.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-text-primary rounded-xl transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {saving ? "Publishing..." : "Publish Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
