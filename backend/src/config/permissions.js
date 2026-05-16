// Central RBAC config — single source of truth for backend authorization.
// Each role maps to a set of capabilities. Route guards check capabilities
// via requireCap(), not hard-coded role lists.

// All known capabilities (kept here for reference / validation).
const CAPS = [
  "manageClients", "deleteClients", "manageJobs", "approveTasks",
  "uploadCreative", "manageFolders", "manageInvoices", "recordPayments",
  "viewFinance", "manageHR", "viewLeadership", "viewAudit",
  "createChatChannel", "viewTeamWorkload",
  // Universal — granted to every internal (non-CLIENT) role below.
  "viewJobsheet", "updateTaskStatus",
];

// Departments → roles (used for grouped role pickers).
const DEPARTMENTS = {
  "Account & Finance": ["FINANCE_MANAGER"],
  "Account Management": ["ACCOUNT_DIRECTOR", "ACCOUNT_MANAGER", "ACCOUNT_EXECUTIVE"],
  "Content & Strategy": ["STRATEGY_HEAD", "CONTENT_STRATEGIST"],
  "Creative": ["CREATIVE_DIRECTOR", "ART_DIRECTOR", "SENIOR_GRAPHIC_DESIGNER", "GRAPHIC_DESIGNER", "JUNIOR_GRAPHIC_DESIGNER", "ILLUSTRATOR"],
  "Motion Graphics / Video Editing": ["VIDEO_EDITOR"],
};

// Role → capabilities. ADMIN gets everything. CLIENT gets nothing internal.
// STAFF/HOD are legacy roles kept so pre-existing accounts keep working.
const ROLE_CAPS = {
  ADMIN: [...CAPS],
  CLIENT: [],

  // Legacy (pre-redesign accounts) — union of what they used to be allowed.
  STAFF: ["manageClients", "manageJobs", "manageInvoices", "recordPayments", "viewFinance", "uploadCreative"],
  HOD: ["manageClients", "manageJobs", "approveTasks", "uploadCreative", "manageFolders", "manageInvoices", "recordPayments", "viewFinance", "viewLeadership", "viewAudit", "createChatChannel", "viewTeamWorkload"],

  // Account & Finance
  FINANCE_MANAGER: ["manageInvoices", "recordPayments", "viewFinance", "viewAudit"],

  // Account Management
  ACCOUNT_DIRECTOR: ["manageClients", "manageJobs", "approveTasks", "viewFinance", "viewLeadership", "viewTeamWorkload", "createChatChannel"],
  ACCOUNT_MANAGER: ["manageClients", "manageJobs", "viewFinance"],
  ACCOUNT_EXECUTIVE: ["manageJobs"],

  // Content & Strategy
  STRATEGY_HEAD: ["manageJobs", "approveTasks", "viewLeadership", "createChatChannel"],
  CONTENT_STRATEGIST: ["manageJobs", "uploadCreative"],

  // Creative
  CREATIVE_DIRECTOR: ["approveTasks", "manageFolders", "uploadCreative", "viewTeamWorkload", "createChatChannel"],
  ART_DIRECTOR: ["approveTasks", "manageFolders", "uploadCreative"],
  SENIOR_GRAPHIC_DESIGNER: ["uploadCreative", "manageFolders"],
  GRAPHIC_DESIGNER: ["uploadCreative"],
  JUNIOR_GRAPHIC_DESIGNER: ["uploadCreative"],
  ILLUSTRATOR: ["uploadCreative"],

  // Motion Graphics / Video Editing
  VIDEO_EDITOR: ["uploadCreative"],
};

// Every internal role can view the job sheet and move their own task status.
for (const role of Object.keys(ROLE_CAPS)) {
  if (role !== "CLIENT") ROLE_CAPS[role].push("viewJobsheet", "updateTaskStatus");
}

const hasCap = (role, cap) => (ROLE_CAPS[role] || []).includes(cap);

module.exports = { CAPS, DEPARTMENTS, ROLE_CAPS, hasCap };
