export const DEPARTMENTS = {
  "Account & Finance": ["FINANCE_MANAGER"],
  "Account Management": ["ACCOUNT_DIRECTOR", "ACCOUNT_MANAGER", "ACCOUNT_EXECUTIVE"],
  "Content & Strategy": ["STRATEGY_HEAD", "CONTENT_STRATEGIST"],
  "Creative": ["CREATIVE_DIRECTOR", "ART_DIRECTOR", "SENIOR_GRAPHIC_DESIGNER", "GRAPHIC_DESIGNER", "JUNIOR_GRAPHIC_DESIGNER", "ILLUSTRATOR"],
  "Motion Graphics / Video Editing": ["VIDEO_EDITOR"],
};

const ALL_TABS = ["dashboard", "clients", "jobs", "creative", "hr", "accounts", "notifications", "leadership", "approvals", "audit", "chat", "jobsheet"];

export const ROLE_TABS = {
  ADMIN: ALL_TABS,
  HOD: ALL_TABS,
  STAFF: ["dashboard", "clients", "jobs", "creative", "accounts", "notifications", "chat"],
  CLIENT: [],
  FINANCE_MANAGER: ["dashboard", "accounts", "clients", "jobs", "audit", "notifications", "chat"],
  ACCOUNT_DIRECTOR: ["dashboard", "clients", "jobs", "accounts", "leadership", "approvals", "notifications", "chat", "jobsheet"],
  ACCOUNT_MANAGER: ["dashboard", "clients", "jobs", "accounts", "notifications", "chat", "jobsheet"],
  ACCOUNT_EXECUTIVE: ["dashboard", "clients", "jobs", "notifications", "chat"],
  STRATEGY_HEAD: ["dashboard", "clients", "jobs", "creative", "leadership", "approvals", "notifications", "chat", "jobsheet"],
  CONTENT_STRATEGIST: ["dashboard", "clients", "jobs", "creative", "notifications", "chat"],
  CREATIVE_DIRECTOR: ["dashboard", "jobs", "creative", "approvals", "leadership", "notifications", "chat", "jobsheet"],
  ART_DIRECTOR: ["dashboard", "jobs", "creative", "approvals", "notifications", "chat", "jobsheet"],
  SENIOR_GRAPHIC_DESIGNER: ["dashboard", "jobs", "creative", "notifications", "chat"],
  GRAPHIC_DESIGNER: ["dashboard", "jobs", "creative", "notifications", "chat"],
  JUNIOR_GRAPHIC_DESIGNER: ["dashboard", "jobs", "creative", "notifications", "chat"],
  ILLUSTRATOR: ["dashboard", "jobs", "creative", "notifications", "chat"],
  VIDEO_EDITOR: ["dashboard", "jobs", "creative", "notifications", "chat"],
};

const ALL_CAPS = ["manageClients","deleteClients","manageJobs","approveTasks","uploadCreative","manageFolders","manageInvoices","recordPayments","viewFinance","manageHR","viewLeadership","viewAudit","createChatChannel","viewTeamWorkload","viewJobsheet","updateTaskStatus"];

export const ROLE_CAPS = {
  ADMIN: [...ALL_CAPS],
  CLIENT: [],
  STAFF: ["manageClients","manageJobs","manageInvoices","recordPayments","viewFinance","uploadCreative","viewJobsheet","updateTaskStatus"],
  HOD: ["manageClients","manageJobs","approveTasks","uploadCreative","manageFolders","manageInvoices","recordPayments","viewFinance","viewLeadership","viewAudit","createChatChannel","viewTeamWorkload","viewJobsheet","updateTaskStatus"],
  FINANCE_MANAGER: ["manageInvoices","recordPayments","viewFinance","viewAudit","viewJobsheet","updateTaskStatus"],
  ACCOUNT_DIRECTOR: ["manageClients","manageJobs","approveTasks","viewFinance","viewLeadership","viewTeamWorkload","createChatChannel","viewJobsheet","updateTaskStatus"],
  ACCOUNT_MANAGER: ["manageClients","manageJobs","viewFinance","viewJobsheet","updateTaskStatus"],
  ACCOUNT_EXECUTIVE: ["manageJobs","viewJobsheet","updateTaskStatus"],
  STRATEGY_HEAD: ["manageJobs","approveTasks","viewLeadership","createChatChannel","viewJobsheet","updateTaskStatus"],
  CONTENT_STRATEGIST: ["manageJobs","uploadCreative","viewJobsheet","updateTaskStatus"],
  CREATIVE_DIRECTOR: ["approveTasks","manageFolders","uploadCreative","viewTeamWorkload","createChatChannel","viewJobsheet","updateTaskStatus"],
  ART_DIRECTOR: ["approveTasks","manageFolders","uploadCreative","viewJobsheet","updateTaskStatus"],
  SENIOR_GRAPHIC_DESIGNER: ["uploadCreative","manageFolders","viewJobsheet","updateTaskStatus"],
  GRAPHIC_DESIGNER: ["uploadCreative","viewJobsheet","updateTaskStatus"],
  JUNIOR_GRAPHIC_DESIGNER: ["uploadCreative","viewJobsheet","updateTaskStatus"],
  ILLUSTRATOR: ["uploadCreative","viewJobsheet","updateTaskStatus"],
  VIDEO_EDITOR: ["uploadCreative","viewJobsheet","updateTaskStatus"],
};

export const canSee = (role, tab) => (ROLE_TABS[role] || []).includes(tab);
export const hasCap = (role, cap) => (ROLE_CAPS[role] || []).includes(cap);
