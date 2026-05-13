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

// ── Shared Upload Modal ───────────────────────────────────────────────────────
function UploadModal({ t, tasks, targetFolderId, onClose, onDone }) {
  const [selectedTask, setSelectedTask] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const isFolderUpload = targetFolderId != null;

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  const doUpload = async () => {
    if (isFolderUpload && !file) return;
    if (!isFolderUpload && (!selectedTask || !file)) return;
    setUploading(true);
    const token = localStorage.getItem("tp_token");
    const fd = new FormData();
    fd.append("file", file);
    if (displayName.trim()) fd.append("displayName", displayName.trim());
    try {
      const url = isFolderUpload
        ? `${API_BASE}/creative/folders/${targetFolderId}/upload`
        : `${API_BASE}/creative/tasks/${selectedTask}/upload`;
      await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      onDone();
      onClose();
    } finally { setUploading(false); }
  };

  const canSubmit = isFolderUpload ? !!file : (!!selectedTask && !!file);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, width: "min(480px, 94vw)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text1 }}>Upload File</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!isFolderUpload && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Task</label>
              <select style={inputStyle} value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}>
                <option value="">— Select task —</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>{task._jobTitle} — {task.description}</option>
                ))}
              </select>
            </div>
          )}
          {isFolderUpload && <div style={{ fontSize: 13, color: t.text2 }}>Uploading into current folder.</div>}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Display Name (optional)</label>
            <input style={inputStyle} placeholder="e.g. Homepage Banner v2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div style={{ border: `2px dashed ${t.border}`, borderRadius: 10, padding: "20px 16px", textAlign: "center" }}>
            {file ? (
              <div style={{ fontSize: 13, color: t.text1 }}>
                ✓ <strong>{file.name}</strong>
                <button onClick={() => setFile(null)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", marginLeft: 8, fontSize: 12 }}>✕</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: t.text3, marginBottom: 10 }}>Choose file to upload</div>
                <input type="file" accept="image/*,application/pdf,video/*,.doc,.docx,.ppt,.pptx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 13, color: t.text2 }} />
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px", color: t.text2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={doUpload} disabled={!canSubmit || uploading}
            style={{ flex: 1, background: t.accent, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: (!canSubmit || uploading) ? "not-allowed" : "pointer", opacity: (!canSubmit || uploading) ? 0.5 : 1 }}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Folder Modal ──────────────────────────────────────────────────────────
function NewFolderModal({ t, parentId, onClose, onDone }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  const doCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api("/creative/folders", { method: "POST", body: JSON.stringify({ name: name.trim(), parentId: parentId || null }) });
      onDone();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, width: "min(380px, 92vw)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text1 }}>New Folder</div>
        <input ref={inputRef} style={inputStyle} placeholder="Folder name" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doCreate(); if (e.key === "Escape") onClose(); }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px", color: t.text2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={doCreate} disabled={!name.trim() || saving}
            style={{ flex: 1, background: t.accent, border: "none", borderRadius: 8, padding: "9px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rename Modal ──────────────────────────────────────────────────────────────
function RenameModal({ t, initial, onClose, onSave }) {
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  const doSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, width: "min(380px, 92vw)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text1 }}>Rename</div>
        <input ref={inputRef} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doSave(); if (e.key === "Escape") onClose(); }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px", color: t.text2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={doSave} disabled={!name.trim() || saving}
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
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#fff", fontSize: 13, width: "100%" }}>
          <span style={{ flex: 1, fontWeight: 600 }}>{v.displayName || v.originalName || `v${v.versionNumber}`}</span>
          <button onClick={download} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>⬇ Download</button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <img src={v.fileUrl} alt={v.displayName || `v${v.versionNumber}`} style={{ maxWidth: "90vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 8 }} />
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

// ── File Card (shared) ────────────────────────────────────────────────────────
function FileCard({ version, canManage, imageVersions, onPreview, onRename, onDelete, t }) {
  const [hover, setHover] = useState(false);
  const isImage = getFileCategory(version.mimeType) === "image";
  const label = version.displayName || version.originalName || `v${version.versionNumber}`;

  const download = () => {
    const a = document.createElement("a");
    a.href = version.fileUrl;
    a.download = version.displayName || version.originalName || `file-v${version.versionNumber}`;
    a.click();
  };

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: t.surfaceBg, border: `1px solid ${hover ? t.accent + "80" : t.border}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative", transition: "border-color 0.15s" }}>
      <div onClick={() => isImage ? onPreview() : download()}
        style={{ height: 120, background: t.contentBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {isImage ? (
          <img src={version.fileUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <FileIcon mimeType={version.mimeType} size={44} />
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={label}>{label}</div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{new Date(version.uploadedAt).toLocaleDateString()}</div>
      </div>
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

// ── Folder Card ───────────────────────────────────────────────────────────────
function FolderCard({ folder, canManage, onOpen, onRename, onDelete, t }) {
  const [hover, setHover] = useState(false);
  const fileCount = folder._count?.versions || 0;
  const childCount = folder._count?.children || 0;

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onDoubleClick={onOpen}
      style={{ background: t.surfaceBg, border: `1px solid ${hover ? t.accent + "80" : t.border}`, borderRadius: 12, padding: "16px 14px", cursor: "pointer", position: "relative", transition: "border-color 0.15s", display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span style={{ fontSize: 36, lineHeight: 1 }}>📁</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>
          {childCount > 0 && `${childCount} folder${childCount !== 1 ? "s" : ""}${fileCount > 0 ? " · " : ""}`}
          {fileCount > 0 && `${fileCount} file${fileCount !== 1 ? "s" : ""}`}
          {childCount === 0 && fileCount === 0 && "Empty"}
        </div>
      </div>
      {hover && canManage && (
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
          <button onClick={(e) => { e.stopPropagation(); onRename(); }}
            style={{ background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ background: "rgba(200,40,40,0.7)", border: "none", color: "#fff", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
        </div>
      )}
    </div>
  );
}

// ── Projects Tab (existing Drive) ─────────────────────────────────────────────
function FolderTree({ clients, selectedTaskId, onSelectTask, t }) {
  const [openClients, setOpenClients] = useState({});
  const [openJobs, setOpenJobs] = useState({});

  const itemStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
    borderRadius: 8, cursor: "pointer", fontSize: 13, color: active ? t.accent : t.text1,
    background: active ? t.accentSoft : "transparent", fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {clients.map((client) => {
        const clientOpen = openClients[client.id] !== false;
        const totalVersions = client.jobs.reduce((a, j) => a + j.tasks.reduce((b, tk) => b + (tk.versions?.length || 0), 0), 0);
        return (
          <div key={client.id}>
            <div onClick={() => setOpenClients((s) => ({ ...s, [client.id]: !clientOpen }))} style={itemStyle(false)}>
              <span style={{ fontSize: 11, color: t.text3, width: 12 }}>{clientOpen ? "▾" : "▸"}</span>
              <span>📁</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</span>
              <span style={{ fontSize: 10, color: t.text3, background: t.contentBg, padding: "2px 6px", borderRadius: 10 }}>{totalVersions}</span>
            </div>
            {clientOpen && client.jobs.map((job) => {
              const jobOpen = openJobs[job.id] !== false;
              return (
                <div key={job.id} style={{ marginLeft: 16 }}>
                  <div onClick={() => setOpenJobs((s) => ({ ...s, [job.id]: !jobOpen }))} style={itemStyle(false)}>
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
      {clients.length === 0 && <div style={{ fontSize: 12, color: t.text3, padding: "12px 10px" }}>No project files yet</div>}
    </div>
  );
}

function ProjectsTab({ t, isMobile, canManage, canUpload }) {
  const [clients, setClients] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [renameVersion, setRenameVersion] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showTree, setShowTree] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await api("/creative/drive"); setClients(d || []); } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allTasks = clients.flatMap((c) =>
    c.jobs.flatMap((j) => j.tasks.map((task) => ({ ...task, _jobTitle: `${c.name} / ${j.title}` })))
  );

  useEffect(() => {
    if (!selectedTask) return;
    const refreshed = allTasks.find((tk) => tk.id === selectedTask.id);
    if (refreshed) setSelectedTask(refreshed);
  }, [clients]);

  const versions = selectedTask?.versions || [];
  const imageVersions = versions.filter((v) => getFileCategory(v.mimeType) === "image");
  const FILTER_TABS = [
    { key: "all", label: "All" }, { key: "image", label: "Images" },
    { key: "pdf", label: "PDFs" }, { key: "video", label: "Videos" }, { key: "other", label: "Other" },
  ];
  const filteredVersions = filterCat === "all" ? versions : versions.filter((v) => getFileCategory(v.mimeType) === filterCat);

  const deleteVersion = async (id) => {
    if (!confirm("Delete this file?")) return;
    await api(`/creative/versions/${id}`, { method: "DELETE" });
    load();
  };

  const tabStyle = (active) => ({
    padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? t.accent : "transparent", color: active ? "#fff" : t.text2,
    border: `1px solid ${active ? t.accent : t.border}`, cursor: "pointer", whiteSpace: "nowrap",
  });

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
      {(!isMobile || showTree) && (
        <div style={{ width: isMobile ? "100%" : 260, borderRight: isMobile ? "none" : `1px solid ${t.border}`, overflowY: "auto", padding: "12px 8px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px 8px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Project Files</div>
            {canUpload && <button onClick={() => setShowUpload(true)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 8px", color: t.text2, fontSize: 11, cursor: "pointer" }}>+ Upload</button>}
          </div>
          {loading ? <div style={{ fontSize: 12, color: t.text3, padding: "12px 10px" }}>Loading…</div> : (
            <FolderTree clients={clients} selectedTaskId={selectedTask?.id} onSelectTask={(task) => { setSelectedTask(task); setFilterCat("all"); if (isMobile) setShowTree(false); }} t={t} />
          )}
        </div>
      )}

      {(!isMobile || !showTree) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedTask ? (
            <>
              <div style={{ padding: "12px 20px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                {isMobile && <button onClick={() => setShowTree(true)} style={{ background: "none", border: "none", color: t.text2, fontSize: 18, cursor: "pointer", marginRight: 8, padding: 0 }}>←</button>}
                <span style={{ fontSize: 14, fontWeight: 700, color: t.text1 }}>{selectedTask.description}</span>
                <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>{versions.length} file{versions.length !== 1 ? "s" : ""}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto" }}>
                  {FILTER_TABS.map((tab) => {
                    const count = tab.key === "all" ? versions.length : versions.filter((v) => getFileCategory(v.mimeType) === tab.key).length;
                    if (tab.key !== "all" && count === 0) return null;
                    return <button key={tab.key} onClick={() => setFilterCat(tab.key)} style={tabStyle(filterCat === tab.key)}>{tab.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}</button>;
                  })}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 12 : 20 }}>
                {filteredVersions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: t.text3, fontSize: 13 }}>{versions.length === 0 ? "No files uploaded yet." : "No files match this filter."}</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
                    {filteredVersions.map((version) => {
                      const imgIdx = imageVersions.findIndex((v) => v.id === version.id);
                      return (
                        <FileCard key={version.id} version={version} canManage={canManage} imageVersions={imageVersions} t={t}
                          onPreview={() => setLightbox({ versions: imageVersions, startIndex: imgIdx >= 0 ? imgIdx : 0 })}
                          onRename={() => setRenameVersion(version)}
                          onDelete={() => deleteVersion(version.id)} />
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
            </div>
          )}
        </div>
      )}

      {showUpload && <UploadModal t={t} tasks={allTasks} targetFolderId={null} onClose={() => setShowUpload(false)} onDone={load} />}
      {renameVersion && (
        <RenameModal t={t} initial={renameVersion.displayName || renameVersion.originalName || `v${renameVersion.versionNumber}`}
          onClose={() => setRenameVersion(null)}
          onSave={async (name) => { await api(`/creative/versions/${renameVersion.id}`, { method: "PATCH", body: JSON.stringify({ displayName: name }) }); load(); }} />
      )}
      {lightbox && <Lightbox versions={lightbox.versions} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// ── Folders Tab ───────────────────────────────────────────────────────────────
function FoldersTab({ t, isMobile, canManage, canUpload }) {
  const [rootFolders, setRootFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null = root
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [children, setChildren] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [renameItem, setRenameItem] = useState(null); // { type: "folder"|"file", id, name }
  const [lightbox, setLightbox] = useState(null);

  const loadRoot = useCallback(async () => {
    setLoading(true);
    try {
      const folders = await api("/creative/folders");
      setRootFolders(folders || []);
      setChildren(folders || []);
      setFiles([]);
      setBreadcrumbs([]);
      setCurrentFolder(null);
    } catch (_) {}
    setLoading(false);
  }, []);

  const loadFolder = useCallback(async (folderId) => {
    setLoading(true);
    try {
      const { folder, breadcrumbs: bc } = await api(`/creative/folders/${folderId}`);
      setCurrentFolder(folder);
      setBreadcrumbs(bc || []);
      setChildren(folder.children || []);
      setFiles(folder.versions || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadRoot(); }, [loadRoot]);

  const reload = () => currentFolder ? loadFolder(currentFolder.id) : loadRoot();

  const navigateTo = (folderId) => {
    if (!folderId) { loadRoot(); return; }
    loadFolder(folderId);
  };

  const deleteFolder = async (id) => {
    if (!confirm("Delete this folder and all its contents?")) return;
    await api(`/creative/folders/${id}`, { method: "DELETE" });
    reload();
  };

  const deleteFile = async (id) => {
    if (!confirm("Delete this file?")) return;
    await api(`/creative/versions/${id}`, { method: "DELETE" });
    reload();
  };

  const imageVersions = files.filter((v) => getFileCategory(v.mimeType) === "image");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Breadcrumb + toolbar */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, flexWrap: "wrap" }}>
          <button onClick={() => navigateTo(null)} style={{ background: "none", border: "none", color: currentFolder ? t.accent : t.text1, fontSize: 13, cursor: "pointer", padding: "2px 4px", fontWeight: currentFolder ? 400 : 700 }}>My Drive</button>
          {breadcrumbs.map((bc) => (
            <span key={bc.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: t.text3 }}>/</span>
              <button onClick={() => navigateTo(bc.id)} style={{ background: "none", border: "none", color: t.accent, fontSize: 13, cursor: "pointer", padding: "2px 4px" }}>{bc.name}</button>
            </span>
          ))}
          {currentFolder && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: t.text3 }}>/</span>
              <span style={{ fontSize: 13, color: t.text1, fontWeight: 700 }}>{currentFolder.name}</span>
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canManage && <button onClick={() => setShowNewFolder(true)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 12px", color: t.text2, fontSize: 12, cursor: "pointer" }}>📁 New Folder</button>}
          {canUpload && currentFolder && <button onClick={() => setShowUpload(true)} style={{ background: t.accent, border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Upload</button>}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 12 : 20 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: t.text3 }}>Loading…</div>
        ) : children.length === 0 && files.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text2 }}>
              {currentFolder ? "This folder is empty" : "No folders yet"}
            </div>
            {canManage && <div style={{ fontSize: 12, marginTop: 6 }}>Click "New Folder" to get started</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {children.length > 0 && (
              <div>
                {files.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Folders</div>}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {children.map((folder) => (
                    <FolderCard key={folder.id} folder={folder} canManage={canManage} t={t}
                      onOpen={() => navigateTo(folder.id)}
                      onRename={() => setRenameItem({ type: "folder", id: folder.id, name: folder.name })}
                      onDelete={() => deleteFolder(folder.id)} />
                  ))}
                </div>
              </div>
            )}
            {files.length > 0 && (
              <div>
                {children.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Files</div>}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
                  {files.map((version) => {
                    const imgIdx = imageVersions.findIndex((v) => v.id === version.id);
                    return (
                      <FileCard key={version.id} version={version} canManage={canManage} imageVersions={imageVersions} t={t}
                        onPreview={() => setLightbox({ versions: imageVersions, startIndex: imgIdx >= 0 ? imgIdx : 0 })}
                        onRename={() => setRenameItem({ type: "file", id: version.id, name: version.displayName || version.originalName || `v${version.versionNumber}` })}
                        onDelete={() => deleteFile(version.id)} />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showNewFolder && <NewFolderModal t={t} parentId={currentFolder?.id || null} onClose={() => setShowNewFolder(false)} onDone={reload} />}
      {showUpload && currentFolder && <UploadModal t={t} tasks={[]} targetFolderId={currentFolder.id} onClose={() => setShowUpload(false)} onDone={reload} />}
      {renameItem && (
        <RenameModal t={t} initial={renameItem.name} onClose={() => setRenameItem(null)}
          onSave={async (name) => {
            if (renameItem.type === "folder") await api(`/creative/folders/${renameItem.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
            else await api(`/creative/versions/${renameItem.id}`, { method: "PATCH", body: JSON.stringify({ displayName: name }) });
            reload();
          }} />
      )}
      {lightbox && <Lightbox versions={lightbox.versions} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CreativePage() {
  const { t } = useTheme();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("folders");

  const user = (() => { try { return JSON.parse(localStorage.getItem("tp_user") || "{}"); } catch { return {}; } })();
  const canManage = user.role === "HOD" || user.role === "ADMIN";
  const canUpload = user.role !== "CLIENT";

  const tabStyle = (active) => ({
    padding: "7px 18px", borderRadius: 20, fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? t.accent : "transparent", color: active ? "#fff" : t.text2,
    border: `1px solid ${active ? t.accent : t.border}`, cursor: "pointer",
  });

  return (
    <div className="anim-fade" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ padding: isMobile ? "12px 14px" : "16px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: t.text1 }}>Creative Drive</div>
          {!isMobile && <div style={{ fontSize: 12, color: t.text2, marginTop: 1 }}>Organize and preview creative assets</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTab("folders")} style={tabStyle(tab === "folders")}>📁 Folders</button>
          <button onClick={() => setTab("projects")} style={tabStyle(tab === "projects")}>💼 Projects</button>
        </div>
      </div>

      {/* Tab content */}
      {tab === "folders" && <FoldersTab t={t} isMobile={isMobile} canManage={canManage} canUpload={canUpload} />}
      {tab === "projects" && <ProjectsTab t={t} isMobile={isMobile} canManage={canManage} canUpload={canUpload} />}
    </div>
  );
}
