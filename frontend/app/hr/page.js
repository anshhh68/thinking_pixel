"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { Badge } from "../../components/ui";

const EMPTY_EMPLOYEE = { userId: "", department: "", joinDate: "" };
const EMPTY_ATTENDANCE = { employeeId: "", date: "", status: "PRESENT" };
const EMPTY_LEAVE = { employeeId: "", startDate: "", endDate: "", reason: "" };

const LEAVE_STATUS_COLOR = {
  PENDING:  { color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
  APPROVED: { color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  REJECTED: { color: "#F87171", soft: "rgba(248,113,113,0.13)" },
};

export default function HrPage() {
  const { t } = useTheme();
  const [tab, setTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE);
  const [attendanceForm, setAttendanceForm] = useState(EMPTY_ATTENDANCE);
  const [leaveForm, setLeaveForm] = useState(EMPTY_LEAVE);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => Promise.all([
    api("/hr/employees").then(setEmployees).catch(() => null),
    api("/hr/leave-requests").then(setLeaveRequests).catch(() => null),
    api("/hr/attendance").then(setAttendance).catch(() => null),
  ]);

  useEffect(() => { load(); }, []);

  const withMsg = async (fn, successMsg) => {
    setSaving(true); setMsg("");
    try { await fn(); setMsg(successMsg); load(); }
    catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  const createEmployee = (e) => { e.preventDefault(); withMsg(() => api("/hr/employees", { method: "POST", body: JSON.stringify(employeeForm) }).then(() => setEmployeeForm(EMPTY_EMPLOYEE)), "Employee added."); };
  const markAttendance = (e) => { e.preventDefault(); withMsg(() => api("/hr/attendance", { method: "POST", body: JSON.stringify(attendanceForm) }).then(() => setAttendanceForm(EMPTY_ATTENDANCE)), "Attendance recorded."); };
  const requestLeave = (e) => { e.preventDefault(); withMsg(() => api("/hr/leave-requests", { method: "POST", body: JSON.stringify(leaveForm) }).then(() => setLeaveForm(EMPTY_LEAVE)), "Leave request submitted."); };

  const approveLeave = (id) => withMsg(() => api(`/hr/leave-requests/${id}/approve`, { method: "PATCH" }), "Leave approved.");
  const rejectLeave = (id) => withMsg(() => api(`/hr/leave-requests/${id}/reject`, { method: "PATCH" }), "Leave rejected.");

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" };
  const tabStyle = (active) => ({
    background: active ? t.accent : "none", border: active ? "none" : `1px solid ${t.border}`,
    borderRadius: 8, padding: "7px 16px", color: active ? "#fff" : t.text2,
    fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer",
  });

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>HR</div>
        <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>Team management, attendance, and leave</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {["employees", "attendance", "leave"].map((tab_key) => (
          <button key={tab_key} onClick={() => setTab(tab_key)} style={tabStyle(tab === tab_key)}>
            {tab_key.charAt(0).toUpperCase() + tab_key.slice(1)}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ fontSize: 13, color: t.emerald, background: "rgba(16,185,129,0.1)", borderRadius: 7, padding: "8px 12px" }}>
          {msg}
        </div>
      )}

      {/* Employees tab */}
      {tab === "employees" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Add employee form */}
          <form onSubmit={createEmployee}
            style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Add Employee</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>User ID *</label>
                <input style={inputStyle} required placeholder="user-id" value={employeeForm.userId}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, userId: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Department</label>
                <input style={inputStyle} placeholder="Creative" value={employeeForm.department}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Join Date</label>
                <input style={inputStyle} type="date" value={employeeForm.joinDate}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, joinDate: e.target.value })} />
              </div>
            </div>
            <div>
              <button type="submit" disabled={saving}
                style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                Add Employee
              </button>
            </div>
          </form>

          {/* Employee list */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {employees.map((emp) => (
              <div key={emp.id} style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 4 }}>{emp.user?.name || emp.userId}</div>
                {emp.department && <div style={{ fontSize: 12, color: t.accent, marginBottom: 4 }}>{emp.department}</div>}
                {emp.joinDate && <div style={{ fontSize: 12, color: t.text3 }}>Joined {new Date(emp.joinDate).toLocaleDateString()}</div>}
              </div>
            ))}
            {employees.length === 0 && <div style={{ color: t.text3, fontSize: 13 }}>No employees yet.</div>}
          </div>
        </div>
      )}

      {/* Attendance tab */}
      {tab === "attendance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <form onSubmit={markAttendance}
          style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Mark Attendance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Employee *</label>
              <select style={inputStyle} required value={attendanceForm.employeeId}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })}>
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.user?.name || emp.id}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Date *</label>
              <input style={inputStyle} type="date" required value={attendanceForm.date}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={attendanceForm.status}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">Leave</option>
              </select>
            </div>
          </div>
          <div>
            <button type="submit" disabled={saving}
              style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              Mark Attendance
            </button>
          </div>
        </form>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Recent Attendance</div>
          {attendance.length === 0 && <div style={{ fontSize: 13, color: t.text3 }}>No records yet.</div>}
          {attendance.map((a) => (
            <div key={a.id} style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.text1 }}>{a.employee?.user?.name || a.employeeId}</div>
                <div style={{ fontSize: 12, color: t.text2 }}>{new Date(a.date).toLocaleDateString()}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: a.status === "PRESENT" ? t.emerald : a.status === "ABSENT" ? t.red : t.text2 }}>{a.status}</span>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Leave tab */}
      {tab === "leave" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Leave request form */}
          <form onSubmit={requestLeave}
            style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Submit Leave Request</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Employee *</label>
                <select style={inputStyle} required value={leaveForm.employeeId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}>
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.user?.name || emp.id}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Start Date *</label>
                <input style={inputStyle} type="date" required value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>End Date *</label>
                <input style={inputStyle} type="date" required value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Reason</label>
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3}
                placeholder="Reason for leave…" value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            </div>
            <div>
              <button type="submit" disabled={saving}
                style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                Submit Request
              </button>
            </div>
          </form>

          {/* Leave requests list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Leave Requests</div>
            {leaveRequests.map((lr) => {
              const sc = LEAVE_STATUS_COLOR[lr.status] || LEAVE_STATUS_COLOR.PENDING;
              return (
                <div key={lr.id} style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: t.text1, marginBottom: 4 }}>
                      {lr.employee?.user?.name || lr.employeeId}
                    </div>
                    <div style={{ fontSize: 12, color: t.text2 }}>
                      {new Date(lr.startDate).toLocaleDateString()} – {new Date(lr.endDate).toLocaleDateString()}
                    </div>
                    {lr.reason && <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>{lr.reason}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge label={lr.status} color={sc.color} soft={sc.soft} />
                    {lr.status === "PENDING" && (
                      <>
                        <button onClick={() => approveLeave(lr.id)}
                          style={{ background: "none", border: `1px solid ${t.emerald}`, borderRadius: 7, padding: "5px 12px", fontSize: 12, color: t.emerald, cursor: "pointer" }}>
                          Approve
                        </button>
                        <button onClick={() => rejectLeave(lr.id)}
                          style={{ background: "none", border: `1px solid ${t.red}`, borderRadius: 7, padding: "5px 12px", fontSize: 12, color: t.red, cursor: "pointer" }}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {leaveRequests.length === 0 && <div style={{ color: t.text3, fontSize: 13 }}>No leave requests.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
