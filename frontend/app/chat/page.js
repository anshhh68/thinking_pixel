"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { getStoredUser } from "../../lib/auth";

const POLL_MS = 2000;
const TYPING_THROTTLE_MS = 2500;

function Avatar({ name, size = 32 }) {
  const initials = name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
  const hue = name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `hsl(${hue},55%,50%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function ChatPage() {
  const { t } = useTheme();
  const [user, setUser] = useState(null);
  const [channels, setChannels] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typers, setTypers] = useState([]);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [channelForm, setChannelForm] = useState({ name: "", description: "", clientId: "" });
  const [saving, setSaving] = useState(false);

  const sinceRef = useRef(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const typingRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const fileInputRef = useRef(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "HOD";

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    api("/chat/channels").then((ch) => {
      setChannels(ch || []);
      if (ch?.length) setActiveId(ch[0].id);
    }).catch(() => null);
    api("/clients").then((c) => setClients(Array.isArray(c) ? c : c?.items || [])).catch(() => null);
  }, []);

  // Load history when channel switches
  useEffect(() => {
    if (!activeId) return;
    sinceRef.current = null;
    setMessages([]);
    setTypers([]);
    api(`/chat/channels/${activeId}/messages?limit=60`).then((msgs) => {
      setMessages(msgs || []);
      if (msgs?.length) sinceRef.current = msgs[msgs.length - 1].createdAt;
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    }).catch(() => null);
  }, [activeId]);

  // Poll messages + typing
  useEffect(() => {
    if (!activeId) return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
        const [newMsgs, newTypers] = await Promise.all([
          api(`/chat/channels/${activeId}/messages${qs}`),
          api(`/chat/channels/${activeId}/typing`),
        ]);
        if (newMsgs?.length) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
            // Also update edited/deleted messages
            const updatedMap = new Map(newMsgs.map((m) => [m.id, m]));
            const merged = prev.map((m) => updatedMap.has(m.id) ? updatedMap.get(m.id) : m);
            const result = [...merged, ...fresh];
            if (fresh.length) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            return result;
          });
          sinceRef.current = newMsgs[newMsgs.length - 1].createdAt;
        }
        setTypers(newTypers || []);
      } catch (_) {}
    }, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [activeId]);

  const sendTyping = useCallback(() => {
    if (!activeId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentRef.current = now;
    api(`/chat/channels/${activeId}/typing`, { method: "POST" }).catch(() => null);
  }, [activeId]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if ((!draft.trim() && !attachment) || !activeId) return;
    setSending(true);
    try {
      const msg = await api(`/chat/channels/${activeId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: draft.trim() || null,
          attachmentUrl: attachment?.url || null,
          attachmentName: attachment?.name || null,
          attachmentType: attachment?.type || null,
        }),
      });
      setMessages((prev) => [...prev, msg]);
      sinceRef.current = msg.createdAt;
      setDraft("");
      setAttachment(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (_) {}
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); return; }
    sendTyping();
  };

  const saveEdit = async (msgId) => {
    if (!editDraft.trim()) return;
    try {
      const updated = await api(`/chat/messages/${msgId}`, { method: "PATCH", body: JSON.stringify({ body: editDraft }) });
      setMessages((prev) => prev.map((m) => m.id === msgId ? updated : m));
    } catch (_) {}
    setEditingMsgId(null);
    setEditDraft("");
  };

  const deleteMsg = async (msgId) => {
    try {
      const updated = await api(`/chat/messages/${msgId}`, { method: "DELETE" });
      setMessages((prev) => prev.map((m) => m.id === msgId ? updated : m));
    } catch (_) {}
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const isImage = file.type.startsWith("image/");
      setAttachment({ url: ev.target.result, name: file.name, type: isImage ? "image" : "file" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const createChannel = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ch = await api("/chat/channels", {
        method: "POST",
        body: JSON.stringify({ name: channelForm.name, description: channelForm.description, clientId: channelForm.clientId || undefined }),
      });
      setChannels((prev) => [...prev, ch]);
      setActiveId(ch.id);
      setShowCreate(false);
      setChannelForm({ name: "", description: "", clientId: "" });
    } catch (_) {}
    setSaving(false);
  };

  const saveChannelEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api(`/chat/channels/${editingChannel.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: channelForm.name, description: channelForm.description }),
      });
      setChannels((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      setEditingChannel(null);
    } catch (_) {}
    setSaving(false);
  };

  const deleteChannel = async (channelId) => {
    if (!confirm("Delete this channel and all its messages?")) return;
    try {
      await api(`/chat/channels/${channelId}`, { method: "DELETE" });
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      if (activeId === channelId) setActiveId(channels.find((c) => c.id !== channelId)?.id || null);
    } catch (_) {}
  };

  const openEdit = (ch) => {
    setEditingChannel(ch);
    setChannelForm({ name: ch.name, description: ch.description || "", clientId: ch.clientId || "" });
  };

  const activeChannel = channels.find((c) => c.id === activeId);

  const inputStyle = { background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

  const Modal = ({ title, onClose, onSubmit, children }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 16, padding: 28, width: 440, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text1 }}>{title}</div>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 18px", color: t.text2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ background: t.accent, border: "none", borderRadius: 8, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Channel sidebar */}
      <div style={{ width: 230, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, background: t.sidebarBg }}>
        <div style={{ padding: "14px 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Channels</span>
          {isAdmin && (
            <button onClick={() => { setShowCreate(true); setChannelForm({ name: "", description: "", clientId: "" }); }}
              title="New channel"
              style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 2, borderRadius: 4 }}>+</button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 8px" }}>
          {channels.map((ch) => (
            <div key={ch.id}
              style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 8, marginBottom: 1, background: activeId === ch.id ? t.accentSoft : "none" }}
              onMouseEnter={(e) => { if (activeId !== ch.id) e.currentTarget.style.background = t.border; }}
              onMouseLeave={(e) => { if (activeId !== ch.id) e.currentTarget.style.background = "none"; }}>
              <button onClick={() => setActiveId(ch.id)}
                style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: "7px 10px", cursor: "pointer", color: activeId === ch.id ? t.accent : t.text2, fontSize: 13, fontWeight: activeId === ch.id ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                # {ch.client?.name || ch.name}
              </button>
              {isAdmin && (
                <div style={{ display: "flex", gap: 2, paddingRight: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(ch)} title="Edit" style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 12, padding: "2px 4px", borderRadius: 4 }}>✎</button>
                  <button onClick={() => deleteChannel(ch.id)} title="Delete" style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 12, padding: "2px 4px", borderRadius: 4 }}>✕</button>
                </div>
              )}
            </div>
          ))}
          {channels.length === 0 && (
            <div style={{ fontSize: 12, color: t.text3, padding: "8px 10px" }}>No channels yet.{isAdmin ? " Click + to create one." : ""}</div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activeChannel ? (
          <>
            {/* Header */}
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${t.border}`, flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.text1 }}>
                  # {activeChannel.client?.name || activeChannel.name}
                </div>
                {activeChannel.description && (
                  <div style={{ fontSize: 12, color: t.text3, marginTop: 1 }}>{activeChannel.description}</div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?.id;
                const isDeleted = !!msg.deletedAt;
                const prevMsg = messages[i - 1];
                const groupWithPrev = prevMsg && prevMsg.senderId === msg.senderId && !prevMsg.deletedAt && !isDeleted &&
                  (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) < 5 * 60 * 1000;
                const isHovered = hoveredMsgId === msg.id;
                const isEditing = editingMsgId === msg.id;

                return (
                  <div key={msg.id}
                    style={{ display: "flex", gap: 12, padding: "3px 0", borderRadius: 8, position: "relative", background: isHovered ? t.border + "40" : "transparent", paddingLeft: 4, paddingRight: 4 }}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}>
                    {/* Avatar col */}
                    <div style={{ width: 36, flexShrink: 0, paddingTop: 2 }}>
                      {!groupWithPrev && !isDeleted && <Avatar name={msg.senderName} size={36} />}
                    </div>

                    {/* Content col */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {!groupWithPrev && !isDeleted && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isMe ? t.accent : t.text1 }}>{msg.senderName}</span>
                          <span style={{ fontSize: 11, color: t.text3 }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      )}

                      {isDeleted ? (
                        <div style={{ fontSize: 13, color: t.text3, fontStyle: "italic" }}>This message was deleted.</div>
                      ) : isEditing ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(msg.id); if (e.key === "Escape") { setEditingMsgId(null); } }}
                            style={{ ...inputStyle, flex: 1, fontSize: 13 }} autoFocus />
                          <button onClick={() => saveEdit(msg.id)} style={{ background: t.accent, border: "none", borderRadius: 6, padding: "6px 12px", color: "#fff", fontSize: 12, cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditingMsgId(null)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px 12px", color: t.text2, fontSize: 12, cursor: "pointer" }}>Esc</button>
                        </div>
                      ) : (
                        <>
                          {msg.body && (
                            <div style={{ fontSize: 13, color: t.text1, lineHeight: 1.55, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                              {msg.body}
                              {msg.editedAt && <span style={{ fontSize: 10, color: t.text3, marginLeft: 6 }}>(edited)</span>}
                            </div>
                          )}
                          {msg.attachmentType === "image" && msg.attachmentUrl && (
                            <img src={msg.attachmentUrl} alt={msg.attachmentName || "image"} style={{ maxWidth: 320, maxHeight: 240, borderRadius: 8, marginTop: msg.body ? 6 : 0, display: "block", objectFit: "contain", background: t.border }} />
                          )}
                          {msg.attachmentType === "file" && msg.attachmentUrl && (
                            <a href={msg.attachmentUrl} download={msg.attachmentName}
                              style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: msg.body ? 6 : 0, background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.accent, textDecoration: "none" }}>
                              📎 {msg.attachmentName || "Download file"}
                            </a>
                          )}
                        </>
                      )}
                    </div>

                    {/* Hover actions */}
                    {isHovered && !isDeleted && !isEditing && (
                      <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4, background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "3px 6px" }}>
                        {(isMe || user?.role === "ADMIN") && (
                          <>
                            {isMe && (
                              <button onClick={() => { setEditingMsgId(msg.id); setEditDraft(msg.body || ""); }}
                                title="Edit" style={{ background: "none", border: "none", color: t.text2, cursor: "pointer", fontSize: 14, padding: "2px 4px", borderRadius: 4 }}>✎</button>
                            )}
                            <button onClick={() => deleteMsg(msg.id)}
                              title="Delete" style={{ background: "none", border: "none", color: t.red || "#EF4444", cursor: "pointer", fontSize: 14, padding: "2px 4px", borderRadius: 4 }}>🗑</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: t.text3, fontSize: 13, marginTop: 60 }}>No messages yet. Say hello!</div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Typing indicator */}
            <div style={{ minHeight: 20, padding: "0 20px", fontSize: 12, color: t.text3, fontStyle: "italic" }}>
              {typers.length === 1 && `${typers[0].userName} is typing…`}
              {typers.length === 2 && `${typers[0].userName} and ${typers[1].userName} are typing…`}
              {typers.length > 2 && "Several people are typing…"}
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div style={{ margin: "0 20px 8px", background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                {attachment.type === "image" ? (
                  <img src={attachment.url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6 }} />
                ) : (
                  <span style={{ fontSize: 24 }}>📎</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: t.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.name}</div>
                  <div style={{ fontSize: 11, color: t.text3 }}>{attachment.type}</div>
                </div>
                <button onClick={() => setAttachment(null)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
            )}

            {/* Composer */}
            <form onSubmit={sendMessage} style={{ padding: "0 20px 16px", display: "flex", gap: 8, flexShrink: 0, alignItems: "flex-end" }}>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" style={{ display: "none" }} onChange={handleFileChange} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                title="Attach file"
                style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", color: t.text2, fontSize: 16, cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>
                📎
              </button>
              <textarea
                style={{ ...inputStyle, flex: 1, resize: "none", minHeight: 40, maxHeight: 120, lineHeight: 1.5 }}
                placeholder={`Message #${activeChannel.client?.name || activeChannel.name}`}
                value={draft}
                rows={1}
                onChange={(e) => { setDraft(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button type="submit" disabled={sending || (!draft.trim() && !attachment)}
                style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: (sending || (!draft.trim() && !attachment)) ? "not-allowed" : "pointer", opacity: (sending || (!draft.trim() && !attachment)) ? 0.6 : 1, flexShrink: 0 }}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 32 }}>◫</div>
            <div style={{ fontSize: 14, color: t.text2 }}>Select a channel to start chatting</div>
            {isAdmin && (
              <button onClick={() => { setShowCreate(true); setChannelForm({ name: "", description: "", clientId: "" }); }}
                style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
                + Create channel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create channel modal */}
      {showCreate && (
        <Modal title="New Channel" onClose={() => setShowCreate(false)} onSubmit={createChannel}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Channel Name *</label>
            <input style={{ ...inputStyle, width: "100%" }} required placeholder="e.g. design-team" value={channelForm.name}
              onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
            <input style={{ ...inputStyle, width: "100%" }} placeholder="What's this channel about?" value={channelForm.description}
              onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Link to Client (optional)</label>
            <select style={{ ...inputStyle, width: "100%", cursor: "pointer" }} value={channelForm.clientId}
              onChange={(e) => setChannelForm({ ...channelForm, clientId: e.target.value })}>
              <option value="">No client — general channel</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {/* Edit channel modal */}
      {editingChannel && (
        <Modal title="Edit Channel" onClose={() => setEditingChannel(null)} onSubmit={saveChannelEdit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Channel Name *</label>
            <input style={{ ...inputStyle, width: "100%" }} required value={channelForm.name}
              onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
            <input style={{ ...inputStyle, width: "100%" }} placeholder="What's this channel about?" value={channelForm.description}
              onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
