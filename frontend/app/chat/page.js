"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { getStoredUser } from "../../lib/auth";

export default function ChatPage() {
  const { t } = useTheme();
  const [user, setUser] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const sinceRef = useRef(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    setUser(getStoredUser());
    api("/chat/channels").then((ch) => {
      setChannels(ch || []);
      if (ch?.length) setActiveId(ch[0].id);
    }).catch(() => null);
  }, []);

  // Load full history when channel changes
  useEffect(() => {
    if (!activeId) return;
    sinceRef.current = null;
    api(`/chat/channels/${activeId}/messages`).then((msgs) => {
      setMessages(msgs || []);
      if (msgs?.length) sinceRef.current = msgs[msgs.length - 1].createdAt;
      bottomRef.current?.scrollIntoView();
    }).catch(() => null);
  }, [activeId]);

  // Poll for new messages every 5s
  useEffect(() => {
    if (!activeId) return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
        const newMsgs = await api(`/chat/channels/${activeId}/messages${qs}`);
        if (newMsgs?.length) {
          setMessages((prev) => [...prev, ...newMsgs]);
          sinceRef.current = newMsgs[newMsgs.length - 1].createdAt;
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [activeId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeId) return;
    setSending(true);
    try {
      const msg = await api(`/chat/channels/${activeId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      setMessages((prev) => [...prev, msg]);
      sinceRef.current = msg.createdAt;
      setDraft("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (_) {}
    setSending(false);
  };

  const activeChannel = channels.find((c) => c.id === activeId);

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Channel list */}
      <div style={{ width: 220, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, background: t.sidebarBg }}>
        <div style={{ padding: "16px 16px 10px", fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Channels
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
          {channels.map((ch) => (
            <button key={ch.id} onClick={() => setActiveId(ch.id)}
              style={{ width: "100%", textAlign: "left", background: activeId === ch.id ? t.accentSoft : "none", border: `1px solid ${activeId === ch.id ? t.accent + "40" : "transparent"}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: activeId === ch.id ? t.accent : t.text2, fontSize: 13, fontWeight: activeId === ch.id ? 600 : 400, marginBottom: 2 }}>
              # {ch.client?.name || ch.name}
            </button>
          ))}
          {channels.length === 0 && (
            <div style={{ fontSize: 12, color: t.text3, padding: "8px 10px" }}>No channels yet. Create a client to get started.</div>
          )}
        </div>
      </div>

      {/* Message pane */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text1 }}>
            {activeChannel ? `# ${activeChannel.client?.name || activeChannel.name}` : "Select a channel"}
          </div>
          {activeChannel && (
            <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>Client channel</div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                <div style={{ fontSize: 11, color: t.text3, marginBottom: 3 }}>
                  {isMe ? "You" : msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ maxWidth: "70%", background: isMe ? t.accent : t.surfaceBg, border: isMe ? "none" : `1px solid ${t.border}`, borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "9px 13px", fontSize: 13, color: isMe ? "#fff" : t.text1, lineHeight: 1.5, wordBreak: "break-word" }}>
                  {msg.body}
                </div>
              </div>
            );
          })}
          {messages.length === 0 && activeId && (
            <div style={{ textAlign: "center", color: t.text3, fontSize: 13, marginTop: 40 }}>No messages yet. Say hello!</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        {activeId && (
          <form onSubmit={sendMessage} style={{ padding: "12px 20px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Type a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
              autoFocus
            />
            <button type="submit" disabled={sending || !draft.trim()}
              style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: (sending || !draft.trim()) ? "not-allowed" : "pointer", opacity: (sending || !draft.trim()) ? 0.6 : 1, flexShrink: 0 }}>
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
