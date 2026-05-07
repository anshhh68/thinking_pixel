"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { Badge } from "../../components/ui";

const EMPTY_INVOICE = { jobId: "", amount: "", dueDate: "", notes: "" };

const INVOICE_STATUS_COLOR = {
  PENDING: { color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
  PAID:    { color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  OVERDUE: { color: "#F87171", soft: "rgba(248,113,113,0.13)" },
};

export default function AccountsPage() {
  const { t } = useTheme();
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoiceMeta, setInvoiceMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [invoicePage, setInvoicePage] = useState(1);
  const [outstanding, setOutstanding] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE);
  const [paymentInputs, setPaymentInputs] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = (p = invoicePage) =>
    Promise.all([
      api("/jobs?paginated=true&page=1&pageSize=100").then((r) => setJobs(r?.items || [])).catch(() => null),
      api(`/accounts/invoices?paginated=true&page=${p}&pageSize=10`).then((d) => { setInvoices(d.items || []); setInvoiceMeta(d.meta || {}); }).catch(() => null),
      api("/accounts/outstanding").then(setOutstanding).catch(() => null),
    ]);

  useEffect(() => { load(invoicePage); }, [invoicePage]);

  const createInvoice = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await api("/accounts/invoices", { method: "POST", body: JSON.stringify(invoiceForm) });
      setInvoiceForm(EMPTY_INVOICE); setShowForm(false); load(invoicePage);
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const recordPayment = async (invoiceId) => {
    const paidAmount = Number(paymentInputs[invoiceId] || 0);
    await api(`/accounts/invoices/${invoiceId}/payment`, { method: "PATCH", body: JSON.stringify({ paidAmount }) });
    setPaymentInputs((prev) => ({ ...prev, [invoiceId]: "" }));
    load(invoicePage);
  };

  const sendReminder = async (invoiceId) => {
    await api(`/accounts/invoices/${invoiceId}/reminder`, { method: "POST" });
  };

  const approvedJobs = jobs.filter((j) => j.clientApprovalStatus === "APPROVED");
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalCollected = invoices.reduce((sum, i) => sum + Number(i.amountPaid || 0), 0);
  const totalOutstanding = outstanding.reduce((s, x) => s + Number(x.outstandingAmount || 0), 0);

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Accounts</div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>Invoicing and financial overview</div>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showForm ? "Cancel" : "+ New Invoice"}
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: "flex", gap: 14 }}>
        {[
          { label: "Total Invoiced",   value: `₹${totalInvoiced.toLocaleString()}`,   color: t.indigo },
          { label: "Collected",        value: `₹${totalCollected.toLocaleString()}`,  color: t.emerald },
          { label: "Outstanding",      value: `₹${totalOutstanding.toLocaleString()}`, color: t.red },
          { label: "Invoices",         value: invoiceMeta.total || invoices.length,    color: t.text1 },
        ].map((k) => (
          <div key={k.label} style={{ flex: 1, background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: t.text3, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Create invoice form */}
      {showForm && (
        <form onSubmit={createInvoice}
          style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>New Invoice</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Approved Job *</label>
              <select style={inputStyle} required value={invoiceForm.jobId}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, jobId: e.target.value })}>
                <option value="">Select approved job…</option>
                {approvedJobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title} ({job.client?.name})</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Amount (₹) *</label>
              <input style={inputStyle} required type="number" step="0.01" min="0" placeholder="50000"
                value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Due Date *</label>
              <input style={inputStyle} required type="date" value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2}
              placeholder="Invoice notes…" value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
          </div>
          {error && <div style={{ fontSize: 13, color: t.red, background: "rgba(248,113,113,0.1)", borderRadius: 7, padding: "8px 12px" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => { setShowForm(false); setInvoiceForm(EMPTY_INVOICE); setError(""); }}
              style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 18px", color: t.text2, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Creating…" : "Create Invoice"}
            </button>
          </div>
        </form>
      )}

      {/* Invoice list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Invoices</div>
        {invoices.map((invoice) => {
          const sc = INVOICE_STATUS_COLOR[invoice.status] || INVOICE_STATUS_COLOR.PENDING;
          return (
            <div key={invoice.id} style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text1, fontFamily: "var(--font-mono),monospace" }}>{invoice.invoiceNumber}</span>
                    <Badge label={invoice.status} color={sc.color} soft={sc.soft} />
                  </div>
                  <div style={{ fontSize: 13, color: t.text2 }}>{invoice.client?.name} · {invoice.job?.title}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: t.text1 }}>₹{Number(invoice.amount || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: t.text3 }}>Paid: ₹{Number(invoice.amountPaid || 0).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: t.text3, marginBottom: 12 }}>Due: {new Date(invoice.dueDate).toLocaleDateString()}</div>
              {invoice.status !== "PAID" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" step="0.01" min="0" placeholder="Payment amount"
                    value={paymentInputs[invoice.id] || ""}
                    onChange={(e) => setPaymentInputs((prev) => ({ ...prev, [invoice.id]: e.target.value }))}
                    style={{ ...inputStyle, maxWidth: 200 }} />
                  <button onClick={() => recordPayment(invoice.id)}
                    style={{ background: t.emerald, border: "none", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 12, cursor: "pointer" }}>
                    Record Payment
                  </button>
                  <button onClick={() => sendReminder(invoice.id)}
                    style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 14px", color: t.text2, fontSize: 12, cursor: "pointer" }}>
                    Send Reminder
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {invoices.length === 0 && (
          <div style={{ textAlign: "center", color: t.text3, fontSize: 13, padding: 32 }}>No invoices yet.</div>
        )}
      </div>

      {/* Pagination */}
      {invoiceMeta.totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: t.text2 }}>
          <button disabled={invoicePage <= 1} onClick={() => setInvoicePage((p) => p - 1)}
            style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 14px", cursor: invoicePage <= 1 ? "not-allowed" : "pointer", opacity: invoicePage <= 1 ? 0.4 : 1, color: t.text2 }}>← Prev</button>
          <span>Page {invoiceMeta.page} / {invoiceMeta.totalPages}</span>
          <button disabled={invoicePage >= invoiceMeta.totalPages} onClick={() => setInvoicePage((p) => p + 1)}
            style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 14px", cursor: invoicePage >= invoiceMeta.totalPages ? "not-allowed" : "pointer", opacity: invoicePage >= invoiceMeta.totalPages ? 0.4 : 1, color: t.text2 }}>Next →</button>
        </div>
      )}

      {/* Outstanding aging */}
      {outstanding.length > 0 && (
        <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 14 }}>Outstanding Aging</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {outstanding.map((row) => (
              <div key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, color: t.text1, fontFamily: "var(--font-mono),monospace" }}>{row.invoiceNumber}</span>
                  <span style={{ fontSize: 13, color: t.text2 }}> · {row.client?.name}</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.red }}>₹{Number(row.outstandingAmount || 0).toLocaleString()}</span>
                  {row.daysOverdue > 0 && (
                    <Badge label={`${row.daysOverdue}d overdue`} color="#F87171" soft="rgba(248,113,113,0.13)" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
