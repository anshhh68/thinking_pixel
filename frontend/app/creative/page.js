"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { useIsMobile } from "../../lib/useBreakpoint";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

function getFileCategory(mimeType) {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  return "other";
}

function FileIcon({ mimeType, size = 32 }) {
  const cat = getFileCategory(mimeType);
  const icons = { image: "🖼", pdf: "📄", video: "🎬", other: "📁" };
  return <span style={{ fontSize: size }}>{icons[cat] || "📁"}</span>;
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ t, tasks, onClose, onDone }) {
  const [selectedTask, setSelectedTask] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  const doUpload = async () => {
    if (!selectedTask || !file) return;
    setUploading(true);
    const token = localStorage.getItem("tp_token");
    const fd = new FormData();
    fd.append("file", file);
    if (displayName.trim()) fd.append("displayName", displayName.trim());
    try {
      await fetch(`${API_BASE}/creative/tasks/${selectedTask}/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      onDone();
      onClose();
    } finally { setUploading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, width: "min(480px, 94vw)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text1 }}>Upload File</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Task</label>
            <select style={inputStyle} value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}>
              <option value="">— Select task —</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>{task._jobTitle} — {task.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Display Name (optional)</label>
            <input style={inputStyle} placeholder="e.g. Homepage Banner v2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div style={{ border: `2px dashed ${t.border}`, borderRadius: 10, padding: "20px 16px", textAlign: "center" }}>
            {file ? (
              <div style={{ fontSize: 13, color: t.text1 }}>
                ✓ <strong>{file.name}</strong>
                <button onClick={() => setFile(null)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", marginLeft: 8, fontSize: 12 }}>✕ Remove</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: t.text3, marginBottom: 10 }}>Choose file to upload</div>
                <input type="file" accept="image/*,application/pdf,video/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 13, color: t.text2 }} />
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px", color: t.text2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={doUpload} disabled={!selectedTask || !file || uploading}
            style={{ flex: 1, background: t.accent, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: (!selectedTask || !file || uploading) ? "not-allowed" : "pointer", opacity: (!selectedTask || !file || uploading) ? 0.5 : 1 }}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rename Modal ──────────────────────────────────────────────────────────────
function RenameModal({ t, version, onClose, onDone }) {
  const [name, setName] = useState(version.displayName || version.originalName || `v${version.versionNumber}`);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const doRename = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api(`/creative/versions/${version.id}`, { method: "PATCH", body: JSON.stringify({ displayName: name.trim() }) });
      onDone();
      onClose();
    } finally { setSaving(false); }
  };

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, width: "min(400px, 92vw)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text1 }}>Rename File</div>
        <input ref={inputRef} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doRename(); if (e.key === "Escape") onClose(); }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px", color: t.text2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={doRename} disabled={!name.trim() || saving}
            style={{ flex: 1, background: t.accent, border: "none", borderRadius: 8, padding: "9px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Saving…" : "Rename"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ versions, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const v = versions[idx];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, versions.length - 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [versions.length, onClose]);

  const download = () => {
    const a = document.createElement("a");
    a.href = v.fileUrl;
    a.download = v.displayName || v.originalName || `file-v${v.versionNumber}`;
    a.click();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#fff", fontSize: 13, width: "100%" }}>
          <span style={{ flex: 1, fontWeight: 600 }}>{v.displayName || v.originalName || `v${v.versionNumber}`}</span>
          <button onClick={download} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>⬇ Download</button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {/* Image */}
        <img src={v.fileUrl} alt={v.displayName || `v${v.versionNumber}`}
          style={{ maxWidth: "90vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 8 }} />
        {/* Nav */}
        {versions.length > 1 && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={() => setIdx((i) => Math.max(i - 1, 0))} disabled={idx === 0}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 6, padding: "6px 14px", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.4 : 1, fontSize: 16 }}>←</button>
            <span style={{ color: "#aaa", fontSize: 12 }}>{idx + 1} / {versions.length}</span>
            <button onClick={() => setIdx((i) => Math.min(i + 1, versions.length - 1))} disabled={idx === versions.length - 1}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 6, padding: "6px 14px", cursor: idx === versions.length - 1 ? "not-allowed" : "pointer", opacity: idx === versions.length - 1 ? 0.4 : 1, fontSize: 16 }}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── File Card ─────────────────────────────────────────────────────────────────
function FileCard({ version, canManage, imageVersions, onPreview, onRename, onDelete, t }) {
  const [hover, setHover] = useState(false);
  const cat = getFileCategory(version.mimeType);
  const isImage = cat === "image";
  const label = version.displayName || version.originalName || `v${version.versionNumber}`;
  const date = new Date(version.uploadedAt).toLocaleDateString();

  const download = () => {
    const a = document.createElement("a");
    a.href = version.fileUrl;
    a.download = version.displayName || version.originalName || `file-v${version.versionNumber}`;
    a.click();
  };

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: t.surfaceBg, border: `1px solid ${hover ? t.accent + "80" : t.border}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative", transition: "border-color 0.15s" }}>
      {/* Thumbnail */}
      <div onClick={() => isImage ? onPreview() : download()}
        style={{ height: 120, background: t.contentBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {isImage ? (
          <img src={version.fileUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <FileIcon mimeType={version.mimeType} size={44} />
        )}
      </div>
      {/* Info */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={label}>{label}</div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>v{version.versionNumber} · {date}</div>
      </div>
      {/* Hover actions */}
      {hover && (
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
          <button onClick={(e) => { e.stopPropagation(); download(); }}
            title="Download" style={{ background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>⬇</button>
          {canManage && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onRename(); }}
                title="Rename" style={{ background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete" style={{ background: "rgba(200,40,40,0.75)", border: "none", color: "#fff", borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Folder Tree ───────────────────────────────────────────────────────────────
function FolderTree({ clients, selectedTaskId, onSelectTask, t }) {
  const [openClients, setOpenClients] = useState({});
  const [openJobs, setOpenJobs] = useState({});

  const toggleClient = (id) => setOpenClients((s) => ({ ...s, [id]: !s[id] }));
  const toggleJob = (id) => setOpenJobs((s) => ({ ...s, [id]: !s[id] }));

  const itemStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
    borderRadius: 8, cursor: "pointer", fontSize: 13, color: active ? t.accent : t.text1,
    background: active ? t.accentSoft : "transparent",
    fontWeight: active ? 600 : 400,
    transition: "background 0.1s",
    minHeight: 36,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {clients.map((client) => {
        const clientOpen = openClients[client.id] !== false;
        const totalVersions = client.jobs.reduce((a, j) => a + j.tasks.reduce((b, t) => b + (t.versions?.length || 0), 0), 0);
        return (
          <div key={client.id}>
            <div onClick={() => toggleClient(client.id)} style={itemStyle(false)}>
              <span style={{ fontSize: 11, color: t.text3, width: 12 }}>{clientOpen ? "▾" : "▸"}</span>
              <span>📁</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</span>
              <span style={{ fontSize: 10, color: t.text3, background: t.contentBg, padding: "2px 6px", borderRadius: 10 }}>{totalVersions}</span>
            </div>
            {clientOpen && client.jobs.map((job) => {
              const jobOpen = openJobs[job.id] !== false;
              return (
                <div key={job.id} style={{ marginLeft: 16 }}>
                  <div onClick={() => toggleJob(job.id)} style={itemStyle(false)}>
                    <span style={{ fontSize: 11, color: t.text3, width: 12 }}>{jobOpen ? "▾" : "▸"}</span>
                    <span>💼</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</span>
                  </div>
                  {jobOpen && job.tasks.map((task) => (
                    <div key={task.id} style={{ marginLeft: 16 }}>
                      <div onClick={() => onSelectTask(task)} style={itemStyle(selectedTaskId === task.id)}>
                        <span style={{ fontSize: 11, color: "transparent", width: 12 }}>·</span>
                        <span>📝</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</span>
                        {(task.versions?.length || 0) > 0 && (
                          <span style={{ fontSize: 10, color: t.text3, background: t.contentBg, padding: "2px 6px", borderRadius: 10 }}>{task.versions.length}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
      {clients.length === 0 && <div style={{ fontSize: 12, color: t.text3, padding: "12px 10px" }}>No files yet</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CreativePage() {
  const { t } = useTheme();
  const isMobile = useIsMobile();

  const [clients, setClients] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [lightbox, setLightbox] = useState(null); // { versions, startIndex }
  const [renameVersion, setRenameVersion] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showTree, setShowTree] = useState(true);
  const [loading, setLoading] = useState(true);

  const user = (() => { try { return JSON.parse(localStorage.getItem("tp_user") || "{}"); } catch { return {}; } })();
  const canManage = user.role === "HOD" || user.role === "ADMIN";
  const canUpload = user.role !== "CLIENT";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/creative/drive");
      setClients(data || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Flatten all tasks for the upload modal
  const allTasks = clients.flatMap((c) =>
    c.jobs.flatMap((j) =>
      j.tasks.map((task) => ({ ...task, _jobTitle: `${c.name} / ${j.title}` }))
    )
  );

  // Sync selectedTask versions after reload
  useEffect(() => {
    if (!selectedTask) return;
    const refreshed = allTasks.find((t) => t.id === selectedTask.id);
    if (refreshed) setSelectedTask(refreshed);
  }, [clients]);

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setFilterCat("all");
    if (isMobile) setShowTree(false);
  };

  const deleteVersion = async (versionId) => {
    if (!confirm("Delete this file?")) return;
    await api(`/creative/versions/${versionId}`, { method: "DELETE" });
    load();
  };

  const versions = selectedTask?.versions || [];
  const imageVersions = versions.filter((v) => getFileCategory(v.mimeType) === "image");
  const filteredVersions = filterCat === "all" ? versions : versions.filter((v) => getFileCategory(v.mimeType) === filterCat);

  const FILTER_TABS = [
    { key: "all", label: "All" },
    { key: "image", label: "Images" },
    { key: "pdf", label: "PDFs" },
    { key: "video", label: "Videos" },
    { key: "other", label: "Other" },
  ];

  const tabStyle = (active) => ({
    padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? t.accent : "transparent", color: active ? "#fff" : t.text2,
    border: `1px solid ${active ? t.accent : t.border}`, cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div className="anim-fade" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ padding: isMobile ? "12px 14px" : "16px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {isMobile && selectedTask && !showTree && (
          <button onClick={() => setShowTree(true)} style={{ background: "none", border: "none", color: t.text2, fontSize: 18, cursor: "pointer", padding: 4 }}>←</button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: t.text1 }}>Creative Drive</div>
          {!isMobile && <div style={{ fontSize: 12, color: t.text2, marginTop: 1 }}>Organize and preview creative assets</div>}
        </div>
        {canUpload && (
          <button onClick={() => setShowUpload(true)}
            style={{ background: t.accent, border: "none", borderRadius: 8, padding: isMobile ? "8px 12px" : "9px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            + Upload
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Left: Folder tree */}
        {(!isMobile || showTree) && (
          <div style={{
            width: isMobile ? "100%" : 260, borderRight: isMobile ? "none" : `1px solid ${t.border}`,
            overflowY: "auto", padding: "12px 8px", flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 10px 8px" }}>Files</div>
            {loading ? (
              <div style={{ fontSize: 12, color: t.text3, padding: "12px 10px" }}>Loading…</div>
            ) : (
              <FolderTree clients={clients} selectedTaskId={selectedTask?.id} onSelectTask={handleSelectTask} t={t} />
            )}
          </div>
        )}

        {/* Right: File grid */}
        {(!isMobile || !showTree) && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {selectedTask ? (
              <>
                {/* Task header */}
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text1 }}>{selectedTask.description}</div>
                  <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>{versions.length} file{versions.length !== 1 ? "s" : ""}</div>
                  {/* Filter tabs */}
                  <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
                    {FILTER_TABS.map((tab) => {
                      const count = tab.key === "all" ? versions.length : versions.filter((v) => getFileCategory(v.mimeType) === tab.key).length;
                      if (tab.key !== "all" && count === 0) return null;
                      return (
                        <button key={tab.key} onClick={() => setFilterCat(tab.key)} style={tabStyle(filterCat === tab.key)}>
                          {tab.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Grid */}
                <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 12 : 20 }}>
                  {filteredVersions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: t.text3, fontSize: 13 }}>
                      {versions.length === 0 ? "No files uploaded yet." : "No files match this filter."}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
                      {filteredVersions.map((version, i) => {
                        const imgIdx = imageVersions.findIndex((v) => v.id === version.id);
                        return (
                          <FileCard
                            key={version.id}
                            version={version}
                            canManage={canManage}
                            imageVersions={imageVersions}
                            t={t}
                            onPreview={() => setLightbox({ versions: imageVersions, startIndex: imgIdx >= 0 ? imgIdx : 0 })}
                            onRename={() => setRenameVersion(version)}
                            onDelete={() => deleteVersion(version.id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: t.text3 }}>
                <span style={{ fontSize: 48 }}>📁</span>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text2 }}>Select a task to view files</div>
                <div style={{ fontSize: 12 }}>Browse the folder tree on the left</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showUpload && <UploadModal t={t} tasks={allTasks} onClose={() => setShowUpload(false)} onDone={load} />}
      {renameVersion && <RenameModal t={t} version={renameVersion} onClose={() => setRenameVersion(null)} onDone={load} />}
      {lightbox && <Lightbox versions={lightbox.versions} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />}
    </div>
  );
}
