"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import KpiCard from "../../components/KpiCard";
import Badge from "../../components/Badge";

const initialInvoice = { jobId: "", amount: "", dueDate: "", notes: "" };

export default function AccountsPage() {
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoiceMeta, setInvoiceMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [invoicePage, setInvoicePage] = useState(1);
  const [outstanding, setOutstanding] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState(initialInvoice);
  const [paymentInputs, setPaymentInputs] = useState({});
  const [error, setError] = useState("");

  const load = async (targetPage = invoicePage) => {
    try {
      const [jobsData, invoiceData, outstandingData] = await Promise.all([
        api("/jobs"),
        api(`/accounts/invoices?paginated=true&page=${targetPage}&pageSize=10`),
        api("/accounts/outstanding"),
      ]);
      setJobs(jobsData);
      setInvoices(invoiceData.items || []);
      setInvoiceMeta(invoiceData.meta || { page: targetPage, totalPages: 1, total: 0 });
      setOutstanding(outstandingData);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load(invoicePage);
  }, [invoicePage]);

  const createInvoice = async (e) => {
    e.preventDefault();
    await api("/accounts/invoices", { method: "POST", body: JSON.stringify(invoiceForm) });
    setInvoiceForm(initialInvoice);
    load(invoicePage);
  };

  const recordPayment = async (invoiceId) => {
    const paidAmount = Number(paymentInputs[invoiceId] || 0);
    await api(`/accounts/invoices/${invoiceId}/payment`, {
      method: "PATCH",
      body: JSON.stringify({ paidAmount }),
    });
    setPaymentInputs((prev) => ({ ...prev, [invoiceId]: "" }));
    load(invoicePage);
  };

  const sendReminder = async (invoiceId) => {
    await api(`/accounts/invoices/${invoiceId}/reminder`, { method: "POST" });
    load(invoicePage);
  };

  const approvedJobs = jobs.filter((j) => j.clientApprovalStatus === "APPROVED");
  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const retainers = jobs.length;
  const runway = Math.max(0, Math.round((totalRevenue - outstanding.reduce((s, x) => s + Number(x.outstandingAmount || 0), 0)) / 10000));

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="panel" style={{ padding: 18 }}>
        <h1 style={{ fontSize: 58 }}>Capital & Runways</h1>
        <p className="text-muted">Financial overview for atelier operations.</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 12 }}>
        <KpiCard title="Total Revenue YTD" value={`$${Math.round(totalRevenue).toLocaleString()}`} subtitle="+14.2% vs last quarter" accent="var(--primary)" />
        <KpiCard title="Active Retainers" value={`${retainers}`} subtitle="Generating recurring agency revenue" accent="var(--secondary)" />
        <KpiCard title="Projected Runway" value={`${runway} mo`} subtitle="Based on current burn estimate" accent="var(--tertiary)" />
      </section>

      <section className="panel" style={{ padding: 16 }}>
        <h3>Create Invoice (Approved Jobs Only)</h3>
        <form onSubmit={createInvoice} style={{ display: "grid", gap: 8, maxWidth: 500, marginTop: 8 }}>
          <select
            className="select"
            required
            value={invoiceForm.jobId}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, jobId: e.target.value })}
          >
            <option value="">Select approved job</option>
            {approvedJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({job.client?.name})
              </option>
            ))}
          </select>
          <input className="field" required type="number" step="0.01" placeholder="Amount" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
          <input className="field" required type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
          <textarea className="textarea" placeholder="Notes" value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
          <button className="btn-primary" type="submit">Create Invoice</button>
        </form>
      </section>

      <section className="panel" style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Invoices</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <button
            className="btn-outline"
            type="button"
            disabled={invoiceMeta.page <= 1}
            onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-muted">
            Page {invoiceMeta.page} / {invoiceMeta.totalPages} (Total invoices: {invoiceMeta.total})
          </span>
          <button
            className="btn-outline"
            type="button"
            disabled={invoiceMeta.page >= invoiceMeta.totalPages}
            onClick={() => setInvoicePage((p) => p + 1)}
          >
            Next
          </button>
        </div>
        <div className="card-grid">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="panel" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{invoice.invoiceNumber}</strong>
                <Badge tone={invoice.status === "PAID" ? "success" : invoice.status === "OVERDUE" ? "danger" : "secondary"}>
                  {invoice.status}
                </Badge>
              </div>
              <p className="text-muted">
                {invoice.client?.name} - {invoice.job?.title}
              </p>
              <p>
                Amount: {invoice.amount} | Paid: {invoice.amountPaid}
              </p>
              <p className="text-muted">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  className="field"
                  type="number"
                  step="0.01"
                  placeholder="Payment amount"
                  value={paymentInputs[invoice.id] || ""}
                  onChange={(e) => setPaymentInputs((prev) => ({ ...prev, [invoice.id]: e.target.value }))}
                />
                <button className="btn-outline" type="button" onClick={() => recordPayment(invoice.id)}>
                  Record
                </button>
                <button className="btn-outline" type="button" onClick={() => sendReminder(invoice.id)}>
                  Remind
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ padding: 14 }}>
        <h3>Outstanding Aging</h3>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {outstanding.map((row) => (
            <div key={row.id} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {row.invoiceNumber} - {row.client?.name}
              </span>
              <Badge tone={row.daysOverdue > 0 ? "danger" : "primary"}>
                Outstanding {row.outstandingAmount} | {row.daysOverdue}d overdue
              </Badge>
            </div>
          ))}
        </div>
      </section>
      {!!error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
