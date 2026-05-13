"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { Badge } from "../../components/ui";

const GST_RATES = [0, 5, 12, 18, 28];
const STATE_CODES = [
  { code: "01", name: "J&K" }, { code: "02", name: "HP" }, { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" }, { code: "06", name: "Haryana" }, { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" }, { code: "09", name: "UP" }, { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" }, { code: "12", name: "Arunachal" }, { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" }, { code: "15", name: "Mizoram" }, { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" }, { code: "18", name: "Assam" }, { code: "19", name: "WB" },
  { code: "20", name: "Jharkhand" }, { code: "21", name: "Odisha" }, { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "MP" }, { code: "24", name: "Gujarat" }, { code: "26", name: "D&NH" },
  { code: "27", name: "Maharashtra" }, { code: "28", name: "Andhra" }, { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" }, { code: "31", name: "Lakshadweep" }, { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" }, { code: "34", name: "Puducherry" }, { code: "35", name: "A&N" },
  { code: "36", name: "Telangana" }, { code: "37", name: "Andhra (new)" },
];

const EMPTY_INVOICE = { jobId: "", amount: "", dueDate: "", notes: "", gstRate: 18, sacCode: "998361", placeOfSupply: "27" };

const INVOICE_STATUS_COLOR = {
  PENDING: { color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
  PARTIAL: { color: "#7C7FF5", soft: "rgba(124,127,245,0.13)" },
  PAID:    { color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  OVERDUE: { color: "#F87171", soft: "rgba(248,113,113,0.13)" },
};

function calcGst(amount, gstRate, placeOfSupply, orgStateCode = "27") {
  const subtotal = parseFloat(amount) || 0;
  const rate = parseFloat(gstRate) || 0;
  const isIntra = placeOfSupply === orgStateCode;
  const taxAmt = Math.round((subtotal * rate / 100) * 100) / 100;
  const cgst = isIntra ? Math.round(taxAmt / 2 * 100) / 100 : 0;
  const sgst = isIntra ? Math.round(taxAmt / 2 * 100) / 100 : 0;
  const igst = isIntra ? 0 : taxAmt;
  const grandTotal = subtotal + taxAmt;
  return { subtotal, cgst, sgst, igst, grandTotal, isIntra };
}

export default function AccountsPage() {
  const { t } = useTheme();
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoiceMeta, setInvoiceMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [invoicePage, setInvoicePage] = useState(1);
  const [outstanding, setOutstanding] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE);
  const [paymentInputs, setPaymentInputs] = useState({});
  const [paymentError, setPaymentError] = useState({});
  const [reminderMsg, setReminderMsg] = useState({});
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

  const gst = calcGst(invoiceForm.amount, invoiceForm.gstRate, invoiceForm.placeOfSupply);

  const createInvoice = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await api("/accounts/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...invoiceForm,
          subtotal: gst.subtotal,
          cgst: gst.cgst,
          sgst: gst.sgst,
          igst: gst.igst,
          grandTotal: gst.grandTotal,
          supplyType: gst.isIntra ? "INTRA" : "INTER",
        }),
      });
      setInvoiceForm(EMPTY_INVOICE); setShowForm(false); load(invoicePage);
    } catch (err) {
      setError(err.message || "Failed to create invoice.");
    } finally { setSaving(false); }
  };

  const recordPayment = async (invoiceId) => {
    const paidAmount = Number(paymentInputs[invoiceId] || 0);
    if (!paidAmount) return;
    setPaymentError((p) => ({ ...p, [invoiceId]: "" }));
    try {
      await api(`/accounts/invoices/${invoiceId}/payment`, { method: "PATCH", body: JSON.stringify({ paidAmount }) });
      setPaymentInputs((prev) => ({ ...prev, [invoiceId]: "" }));
      load(invoicePage);
    } catch (err) {
      setPaymentError((p) => ({ ...p, [invoiceId]: err.message || "Payment failed." }));
    }
  };

  const sendReminder = async (invoiceId) => {
    setReminderMsg((m) => ({ ...m, [invoiceId]: "Sending…" }));
    try {
      await api(`/accounts/invoices/${invoiceId}/reminder`, { method: "POST" });
      setReminderMsg((m) => ({ ...m, [invoiceId]: "Sent ✓" }));
      setTimeout(() => setReminderMsg((m) => ({ ...m, [invoiceId]: "" })), 3000);
    } catch (err) {
      setReminderMsg((m) => ({ ...m, [invoiceId]: "Failed" }));
    }
  };

  const approvedJobs = jobs.filter((j) => j.clientApprovalStatus === "APPROVED");
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.grandTotal || i.amount || 0), 0);
  const totalCollected = invoices.reduce((sum, i) => sum + Number(i.amountPaid || 0), 0);
  const totalOutstanding = outstanding.reduce((s, x) => s + Number(x.outstandingAmount || 0), 0);

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" };
  const gstCellStyle = { fontSize: 12, color: t.text2, display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${t.border + "50"}` };

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
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {[
          { label: "Total Invoiced",  value: `₹${totalInvoiced.toLocaleString("en-IN")}`,   color: t.indigo },
          { label: "Collected",       value: `₹${totalCollected.toLocaleString("en-IN")}`,  color: t.emerald },
          { label: "Outstanding",     value: `₹${totalOutstanding.toLocaleString("en-IN")}`, color: t.red },
          { label: "Invoices",        value: invoiceMeta.total || invoices.length,           color: t.text1 },
        ].map((k) => (
          <div key={k.label} style={{ flex: 1, minWidth: 130, background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: t.text3, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Create invoice form */}
      {showForm && (
        <form onSubmit={createInvoice}
          style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text1 }}>New Invoice</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
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
              <label style={labelStyle}>Taxable Amount (₹) *</label>
              <input style={inputStyle} required type="number" step="0.01" min="0" placeholder="50000"
                value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>GST Rate (%)</label>
              <select style={inputStyle} value={invoiceForm.gstRate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, gstRate: Number(e.target.value) })}>
                {GST_RATES.map((r) => <option key={r} value={r}>{r}% GST</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Place of Supply</label>
              <select style={inputStyle} value={invoiceForm.placeOfSupply}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, placeOfSupply: e.target.value })}>
                {STATE_CODES.map((s) => <option key={s.code} value={s.code}>{s.code} – {s.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>SAC Code</label>
              <input style={inputStyle} placeholder="998361" value={invoiceForm.sacCode}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, sacCode: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Due Date *</label>
              <input style={inputStyle} required type="date" value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
            </div>
          </div>

          {/* GST Preview */}
          {invoiceForm.amount && (
            <div style={{ background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Tax Breakdown — {gst.isIntra ? "INTRA-STATE (CGST + SGST)" : "INTER-STATE (IGST)"}
              </div>
              <div style={gstCellStyle}><span>Taxable Amount</span><span style={{ fontWeight: 600 }}>₹{gst.subtotal.toLocaleString("en-IN")}</span></div>
              {gst.isIntra ? (
                <>
                  <div style={gstCellStyle}><span>CGST @ {invoiceForm.gstRate / 2}%</span><span>₹{gst.cgst.toLocaleString("en-IN")}</span></div>
                  <div style={gstCellStyle}><span>SGST @ {invoiceForm.gstRate / 2}%</span><span>₹{gst.sgst.toLocaleString("en-IN")}</span></div>
                </>
              ) : (
                <div style={gstCellStyle}><span>IGST @ {invoiceForm.gstRate}%</span><span>₹{gst.igst.toLocaleString("en-IN")}</span></div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontWeight: 700, fontSize: 14, color: t.text1 }}>
                <span>Grand Total</span><span style={{ color: t.accent }}>₹{gst.grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} placeholder="Invoice notes…"
              value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
          </div>

          {error && <div style={{ fontSize: 13, color: t.red, background: "rgba(248,113,113,0.1)", borderRadius: 7, padding: "8px 12px" }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => { setShowForm(false); setInvoiceForm(EMPTY_INVOICE); setError(""); }}
              style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 18px", color: t.text2, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Creating…" : `Create Invoice — ₹${(gst.grandTotal || 0).toLocaleString("en-IN")}`}
            </button>
          </div>
        </form>
      )}

      {/* Invoice list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Invoices</div>
        {invoices.map((invoice) => {
          const sc = INVOICE_STATUS_COLOR[invoice.status] || INVOICE_STATUS_COLOR.PENDING;
          const total = invoice.grandTotal || invoice.amount || 0;
          const hasGst = invoice.cgst || invoice.igst;
          return (
            <div key={invoice.id} style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text1, fontFamily: "var(--font-mono),monospace" }}>{invoice.invoiceNumber}</span>
                    <Badge label={invoice.status} color={sc.color} soft={sc.soft} />
                    {invoice.supplyType && <Badge label={invoice.supplyType} color={t.text3} soft={t.border} />}
                  </div>
                  <div style={{ fontSize: 13, color: t.text2 }}>{invoice.client?.name} · {invoice.job?.title}</div>
                  {hasGst && (
                    <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>
                      Subtotal ₹{Number(invoice.amount || 0).toLocaleString("en-IN")}
                      {invoice.cgst ? ` · CGST ₹${Number(invoice.cgst).toLocaleString("en-IN")} · SGST ₹${Number(invoice.sgst).toLocaleString("en-IN")}` : ""}
                      {invoice.igst ? ` · IGST ₹${Number(invoice.igst).toLocaleString("en-IN")}` : ""}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: t.text1 }}>₹{Number(total).toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: 12, color: t.text3 }}>Paid: ₹{Number(invoice.amountPaid || 0).toLocaleString("en-IN")}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: t.text3, marginBottom: 12 }}>Due: {new Date(invoice.dueDate).toLocaleDateString()}</div>
              {invoice.status !== "PAID" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="number" step="0.01" min="0" placeholder="Payment amount (₹)"
                      value={paymentInputs[invoice.id] || ""}
                      onChange={(e) => setPaymentInputs((prev) => ({ ...prev, [invoice.id]: e.target.value }))}
                      style={{ ...inputStyle, maxWidth: 220 }} />
                    <button onClick={() => recordPayment(invoice.id)}
                      style={{ background: t.emerald, border: "none", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Record Payment
                    </button>
                    <button onClick={() => sendReminder(invoice.id)}
                      style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 14px", color: reminderMsg[invoice.id] ? t.emerald : t.text2, fontSize: 12, cursor: "pointer" }}>
                      {reminderMsg[invoice.id] || "Send Reminder"}
                    </button>
                  </div>
                  {paymentError[invoice.id] && (
                    <div style={{ fontSize: 12, color: t.red }}>{paymentError[invoice.id]}</div>
                  )}
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.red }}>₹{Number(row.outstandingAmount || 0).toLocaleString("en-IN")}</span>
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
