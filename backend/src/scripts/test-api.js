/**
 * Thinking Pixel IMS — Comprehensive API Test Script
 *
 * Tests all major API endpoints for correctness, RBAC, and error handling.
 * Run against a live server:
 *   API_BASE=http://localhost:4000/api node src/scripts/test-api.js
 */

const API_BASE = process.env.API_BASE || "http://localhost:4000/api";
const TEST_EMAIL = process.env.ADMIN_EMAIL || "admin@thinkingpixel.com";
const TEST_PASS = process.env.ADMIN_PASS || "Admin@123";

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    errors.push(label);
    console.log(`  ❌ ${label}`);
  }
}

async function req(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  try {
    const res = await fetch(url, { ...opts, headers });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON response */ }
    return { status: res.status, data, ok: res.ok };
  } catch (err) {
    return { status: 0, data: null, ok: false, error: err.message };
  }
}

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Suites
// ═══════════════════════════════════════════════════════════════════════════

async function testHealth() {
  console.log("\n🏥 HEALTH CHECK");
  const { status } = await req("/../../health");
  // Health endpoint is at /health not /api/health, try direct
  const r2 = await fetch(`${API_BASE.replace("/api", "")}/health`).then(r => r.json()).catch(() => null);
  assert(r2?.status === "ok" || status === 200, "Health endpoint responds");
}

async function testAuthLogin() {
  console.log("\n🔐 AUTH — Login");

  // Missing fields
  const r1 = await req("/auth/login", { method: "POST", body: JSON.stringify({}) });
  assert(r1.status === 400, "Rejects empty login body");

  // Bad credentials
  const r2 = await req("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "bad@test.com", password: "wrong" }),
  });
  assert(r2.status === 401, "Rejects invalid credentials");

  // Valid admin login
  const r3 = await req("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
  });
  assert(r3.ok && r3.data?.token, "Admin login succeeds and returns token");
  assert(r3.data?.user?.role === "ADMIN", "Admin has correct role");

  return r3.data?.token;
}

async function testAuthMe(token) {
  console.log("\n👤 AUTH — /me");

  const r1 = await req("/auth/me");
  assert(r1.status === 401, "Rejects unauthenticated /me");

  const r2 = await req("/auth/me", auth(token));
  assert(r2.ok && r2.data?.email, "Authenticated /me returns user data");
}

async function testClients(token) {
  console.log("\n📋 CLIENTS — CRUD");

  // List
  const r1 = await req("/clients", auth(token));
  assert(r1.ok && Array.isArray(r1.data), "List clients returns array");

  // Create
  const r2 = await req("/clients", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Client",
      contactInfo: "test@example.com",
      requirements: "Test requirements",
      scope: "Test scope",
      timeline: "30 days",
      priority: "MEDIUM",
    }),
    ...auth(token),
  });
  assert(r2.ok && r2.data?.id, "Create client succeeds");
  const clientId = r2.data?.id;

  // Get by ID
  if (clientId) {
    const r3 = await req(`/clients/${clientId}`, auth(token));
    assert(r3.ok && r3.data?.name === "Test Client", "Get client by ID succeeds");

    // Update
    const r4 = await req(`/clients/${clientId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Client" }),
      ...auth(token),
    });
    assert(r4.ok && r4.data?.name === "Updated Client", "Update client succeeds");

    // Delete
    const r5 = await req(`/clients/${clientId}`, {
      method: "DELETE",
      ...auth(token),
    });
    assert(r5.ok, "Delete client succeeds");
  }
}

async function testHR(token) {
  console.log("\n👥 HR — Employees");

  // List employees
  const r1 = await req("/hr/employees", auth(token));
  assert(r1.ok && Array.isArray(r1.data), "List employees returns array");

  // Users without employee records
  const r2 = await req("/hr/users-without-employee", auth(token));
  assert(r2.ok && Array.isArray(r2.data), "Users without employee returns array");

  // Try creating employee with bad userId
  const r3 = await req("/hr/employees", {
    method: "POST",
    body: JSON.stringify({ userId: "nonexistent-uuid", department: "Test" }),
    ...auth(token),
  });
  assert(r3.status === 400, "Rejects employee with invalid userId (no FK crash)");

  // Try creating employee without userId
  const r4 = await req("/hr/employees", {
    method: "POST",
    body: JSON.stringify({ department: "Test" }),
    ...auth(token),
  });
  assert(r4.status === 400, "Rejects employee without userId");

  console.log("\n📅 HR — Attendance");

  // List attendance
  const r5 = await req("/hr/attendance", auth(token));
  assert(r5.ok && Array.isArray(r5.data), "List attendance returns array");

  // Missing fields
  const r6 = await req("/hr/attendance", {
    method: "POST",
    body: JSON.stringify({}),
    ...auth(token),
  });
  assert(r6.status === 400, "Rejects attendance with missing fields");

  console.log("\n🏖️ HR — Leave Requests");

  const r7 = await req("/hr/leave-requests", auth(token));
  assert(r7.ok && Array.isArray(r7.data), "List leave requests returns array");
}

async function testJobs(token) {
  console.log("\n📁 JOBS — CRUD");

  const r1 = await req("/jobs", auth(token));
  assert(r1.ok, "List jobs succeeds");
}

async function testNotifications(token) {
  console.log("\n🔔 NOTIFICATIONS");

  const r1 = await req("/notifications/unread-count", auth(token));
  assert(r1.ok && typeof r1.data?.count === "number", "Unread count returns number");

  const r2 = await req("/notifications/recent", auth(token));
  assert(r2.ok && Array.isArray(r2.data), "Recent notifications returns array");

  const r3 = await req("/notifications", auth(token));
  assert(r3.ok, "Full notification list succeeds");

  // Mark all read
  const r4 = await req("/notifications/read-all", { method: "PATCH", ...auth(token) });
  assert(r4.ok, "Mark all read succeeds");
}

async function testInvites(token) {
  console.log("\n📨 INVITES");

  // List invites (admin only)
  const r1 = await req("/invites", auth(token));
  assert(r1.ok && Array.isArray(r1.data), "List invites returns array");

  // Create invite
  const r2 = await req("/invites", {
    method: "POST",
    body: JSON.stringify({
      email: `test-${Date.now()}@example.com`,
      role: "STAFF",
    }),
    ...auth(token),
  });
  assert(r2.ok && r2.data?.id, "Create invite succeeds");

  if (r2.data?.token) {
    // Validate token
    const r3 = await req(`/invites/validate/${r2.data.token}`);
    assert(r3.ok && r3.data?.email, "Validate invite token succeeds");
  }
}

async function testRBAC(token) {
  console.log("\n🛡️ RBAC — Unauthorized access");

  // Leadership (admin-only) without auth
  const r1 = await req("/leadership/kpis");
  assert(r1.status === 401, "Leadership KPIs blocked without auth");

  // Audit logs without auth
  const r2 = await req("/audit-logs");
  assert(r2.status === 401, "Audit logs blocked without auth");

  // Create invite without auth
  const r3 = await req("/invites", {
    method: "POST",
    body: JSON.stringify({ email: "hack@test.com", role: "ADMIN" }),
  });
  assert(r3.status === 401, "Create invite blocked without auth");
}

async function testLeadership(token) {
  console.log("\n📊 LEADERSHIP — KPIs");

  const r1 = await req("/leadership/kpis", auth(token));
  assert(r1.ok && r1.data?.hr, "Leadership KPIs return HR data");
  assert(r1.ok && r1.data?.jobs, "Leadership KPIs return jobs data");
  assert(r1.ok && r1.data?.finance, "Leadership KPIs return finance data");
}

async function testChat(token) {
  console.log("\n💬 CHAT");

  const r1 = await req("/chat/channels", auth(token));
  assert(r1.ok && Array.isArray(r1.data), "List channels returns array");
}

async function testJobsheet(token) {
  console.log("\n📄 JOBSHEET");

  const r1 = await req("/jobsheet", auth(token));
  assert(r1.ok && Array.isArray(r1.data), "Jobsheet returns array");

  const r2 = await req("/jobsheet/workload", auth(token));
  assert(r2.ok && Array.isArray(r2.data), "Workload returns array");
}

// ═══════════════════════════════════════════════════════════════════════════
// Runner
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n🧪 Thinking Pixel IMS — API Test Suite`);
  console.log(`   Target: ${API_BASE}\n`);

  await testHealth();

  const adminToken = await testAuthLogin();
  if (!adminToken) {
    console.error("\n💀 Cannot proceed without admin token. Run seed:prod first.");
    process.exit(1);
  }

  await testAuthMe(adminToken);
  await testRBAC(adminToken);
  await testClients(adminToken);
  await testJobs(adminToken);
  await testHR(adminToken);
  await testNotifications(adminToken);
  await testInvites(adminToken);
  await testLeadership(adminToken);
  await testChat(adminToken);
  await testJobsheet(adminToken);

  // ── Summary ──
  console.log("\n" + "═".repeat(60));
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log("═".repeat(60));

  if (errors.length > 0) {
    console.log("\n   Failures:");
    errors.forEach((e) => console.log(`     • ${e}`));
  }

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

main();
