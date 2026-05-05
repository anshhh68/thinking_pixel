"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Badge from "../../components/Badge";

const emptyEmployee = { userId: "", department: "", joinDate: "" };
const emptyAttendance = { employeeId: "", date: "", status: "PRESENT" };
const emptyLeave = { employeeId: "", startDate: "", endDate: "", reason: "" };

export default function HrPage() {
  const [employees, setEmployees] = useState([]);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendance);
  const [leaveForm, setLeaveForm] = useState(emptyLeave);

  const load = async () => {
    const data = await api("/hr/employees");
    setEmployees(data);
  };

  useEffect(() => {
    load();
  }, []);

  const createEmployee = async (e) => {
    e.preventDefault();
    await api("/hr/employees", { method: "POST", body: JSON.stringify(employeeForm) });
    setEmployeeForm(emptyEmployee);
    load();
  };

  const markAttendance = async (e) => {
    e.preventDefault();
    await api("/hr/attendance", { method: "POST", body: JSON.stringify(attendanceForm) });
    setAttendanceForm(emptyAttendance);
  };

  const requestLeave = async (e) => {
    e.preventDefault();
    await api("/hr/leave-requests", { method: "POST", body: JSON.stringify(leaveForm) });
    setLeaveForm(emptyLeave);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="panel" style={{ padding: 18 }}>
        <h1 style={{ fontSize: 56 }}>Creative Roster</h1>
        <p className="text-muted" style={{ marginTop: 6 }}>
          The collective intelligence and artistic force behind the Digital Atelier.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 14 }}>
        <div className="panel" style={{ padding: 14, display: "grid", gap: 10, height: "fit-content" }}>
          <h3 style={{ fontSize: 30 }}>Culture Pulse</h3>
          <p className="text-muted">Creative energy and alignment indicators.</p>
          <div style={{ display: "grid", gap: 8 }}>
            <Badge tone="primary">Creative Energy 85</Badge>
            <Badge tone="secondary">Team Alignment 92</Badge>
          </div>
          <h4 style={{ marginTop: 8 }}>Filter by Discipline</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Badge tone="primary">All Creators</Badge>
            <Badge>Visual Design</Badge>
            <Badge>Motion</Badge>
            <Badge>Creative Code</Badge>
            <Badge>Strategy</Badge>
          </div>
        </div>

        <div className="card-grid" style={{ gridTemplateColumns: "repeat(3, minmax(180px, 1fr))" }}>
          {employees.map((e) => (
            <article key={e.id} className="panel" style={{ padding: 12, display: "grid", gap: 8 }}>
              <Badge tone="secondary">{e.department || "Creative"}</Badge>
              <h3 style={{ fontSize: 30 }}>{e.user?.name || e.userId}</h3>
              <p className="text-muted">Crafting high-fidelity interfaces and campaign outputs.</p>
              <p className="text-muted" style={{ fontSize: 12 }}>
                Velocity: 84%
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 14 }}>
        <form className="panel" onSubmit={createEmployee} style={{ padding: 12, display: "grid", gap: 8 }}>
          <h3>Add Employee</h3>
          <input className="field" placeholder="User ID" value={employeeForm.userId} onChange={(e) => setEmployeeForm({ ...employeeForm, userId: e.target.value })} />
          <input className="field" placeholder="Department" value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} />
          <input className="field" type="date" value={employeeForm.joinDate} onChange={(e) => setEmployeeForm({ ...employeeForm, joinDate: e.target.value })} />
          <button className="btn-primary" type="submit">Add Employee</button>
        </form>

        <form className="panel" onSubmit={markAttendance} style={{ padding: 12, display: "grid", gap: 8 }}>
          <h3>Attendance</h3>
          <input className="field" placeholder="Employee ID" value={attendanceForm.employeeId} onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })} />
          <input className="field" type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })} />
          <select className="select" value={attendanceForm.status} onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}>
            <option>PRESENT</option>
            <option>ABSENT</option>
            <option>LEAVE</option>
          </select>
          <button className="btn-primary" type="submit">Mark Attendance</button>
        </form>

        <form className="panel" onSubmit={requestLeave} style={{ padding: 12, display: "grid", gap: 8 }}>
          <h3>Leave Request</h3>
          <input className="field" placeholder="Employee ID" value={leaveForm.employeeId} onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })} />
          <input className="field" type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
          <input className="field" type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
          <textarea className="textarea" placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
          <button className="btn-primary" type="submit">Submit Leave</button>
        </form>
      </section>
    </div>
  );
}
