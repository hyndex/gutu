export const businessGoalRequiredHeadings = [
  "# Gutu Business Plugin Goal",
  "## Target Architecture",
  "## Domain Ownership Rules",
  "## Program Stages",
  "## First-Party Business Repo Map",
  "## Current Implementation Truth"
];

export const businessTodoRequiredHeadings = [
  "# Gutu Business Plugin TODO",
  "## Stage 0",
  "## Stage 1",
  "## Stage 2",
  "## Stage 3",
  "## Stage 4",
  "## Stage 5",
  "## Stage 6"
];

function businessSpec(input) {
  const normalizedInput = withSharedLifecycleSurface(input);
  return {
    kind: "plugin",
    trustTier: "first-party",
    reviewTier: "R1",
    isolationProfile: "same-process-trusted",
    compatibility: {
      framework: "^0.1.0",
      runtime: "bun>=1.3.12",
      db: ["postgres", "sqlite"]
    },
    ...normalizedInput
  };
}

function dedupeList(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function deriveLifecycleNamespace(input) {
  const command =
    input.publicCommands?.[0] ??
    input.actions?.[0]?.id ??
    input.id ??
    "business.records.create";
  const tokens = String(command).split(".");
  return tokens.length > 1 ? tokens.slice(0, -1).join(".") : command;
}

function deriveLifecyclePermission(input) {
  const seedPermission = input.actions?.[0]?.permission ?? "business.records.write";
  const tokens = String(seedPermission).split(".");
  tokens[tokens.length - 1] = "write";
  return tokens.join(".");
}

function withSharedLifecycleSurface(input) {
  const baseActions = (input.actions ?? []).map((action, index) => ({
    phase: action.phase ?? ["create", "advance", "reconcile"][index] ?? "reconcile",
    ...action
  }));
  const lifecycleNamespace = deriveLifecycleNamespace(input);
  const lifecyclePermission = deriveLifecyclePermission(input);
  const sharedActions = [
    {
      id: `${lifecycleNamespace}.hold`,
      permission: lifecyclePermission,
      label: "Place Record On Hold",
      phase: "hold"
    },
    {
      id: `${lifecycleNamespace}.release`,
      permission: lifecyclePermission,
      label: "Release Record Hold",
      phase: "release"
    },
    {
      id: `${lifecycleNamespace}.amend`,
      permission: lifecyclePermission,
      label: "Amend Record",
      phase: "amend"
    },
    {
      id: `${lifecycleNamespace}.reverse`,
      permission: lifecyclePermission,
      label: "Reverse Record",
      phase: "reverse"
    }
  ];

  const actionMap = new Map();
  for (const action of [...baseActions, ...sharedActions]) {
    if (!actionMap.has(action.id)) {
      actionMap.set(action.id, action);
    }
  }

  const actions = [...actionMap.values()];
  return {
    ...input,
    actions,
    publicCommands: dedupeList([
      ...(input.publicCommands ?? baseActions.map((action) => action.id)),
      ...sharedActions.map((action) => action.id)
    ])
  };
}

function mergeDomainCatalog(base = {}, extra = {}) {
  return {
    erpnextModules: dedupeList([...(base.erpnextModules ?? []), ...(extra.erpnextModules ?? [])]),
    erpnextDoctypes: dedupeList([...(base.erpnextDoctypes ?? []), ...(extra.erpnextDoctypes ?? [])]),
    ownedEntities: dedupeList([...(base.ownedEntities ?? []), ...(extra.ownedEntities ?? [])]),
    reports: dedupeList([...(base.reports ?? []), ...(extra.reports ?? [])]),
    exceptionQueues: dedupeList([...(base.exceptionQueues ?? []), ...(extra.exceptionQueues ?? [])]),
    operationalScenarios: dedupeList([...(base.operationalScenarios ?? []), ...(extra.operationalScenarios ?? [])]),
    settingsSurfaces: dedupeList([...(base.settingsSurfaces ?? []), ...(extra.settingsSurfaces ?? [])]),
    edgeCases: dedupeList([...(base.edgeCases ?? []), ...(extra.edgeCases ?? [])])
  };
}

const businessParityCatalog = {
  "party-relationships-core": {
    erpnextModules: ["CRM", "Selling", "Buying"],
    erpnextDoctypes: ["Customer", "Supplier", "Lead", "Prospect", "Contact", "Address", "Customer Group Item"],
    ownedEntities: ["Party", "Party Role Facet", "Contact", "Address", "Relationship Hierarchy", "Bank Account Reference"],
    reports: ["Lead Details", "Opportunity Summary", "Prospect Pipeline", "Customer Contact Audit"],
    exceptionQueues: ["party-dedupe-review", "contact-validation-failures", "role-activation-holds"],
    operationalScenarios: ["party-onboarding", "party-deduplication-merge", "customer-supplier-cross-role-activation"],
    settingsSurfaces: ["CRM Settings", "Selling Settings", "Buying Settings"],
    edgeCases: ["duplicate identities across customer and supplier roles", "invalid address hierarchy", "party merge with downstream references"]
  },
  "product-catalog-core": {
    erpnextModules: ["Stock", "Selling", "Buying", "Manufacturing"],
    erpnextDoctypes: ["Item", "Item Variant", "Item Attribute", "Item Price", "UOM Category", "Item Alternative", "Product Bundle"],
    ownedEntities: ["Product", "Variant Matrix", "UOM Conversion", "Catalog Policy", "Bundle Definition", "Substitution Mapping"],
    reports: ["Item Price Report", "Item Variant Matrix", "Product Bundle Usage", "Catalog Obsolescence Review"],
    exceptionQueues: ["variant-generation-conflicts", "uom-conversion-mismatches", "catalog-policy-review"],
    operationalScenarios: ["item-lifecycle", "variant-generation", "substitution-and-obsolescence"],
    settingsSurfaces: ["Stock Settings", "Selling Settings", "Buying Settings"],
    edgeCases: ["variant attribute conflicts", "stockable to service policy changes", "bundle substitutions across active orders"]
  },
  "pricing-tax-core": {
    erpnextModules: ["Accounts", "Selling", "Buying", "Stock"],
    erpnextDoctypes: ["Price List", "Item Price", "Pricing Rule", "Tax Rule", "Item Tax Template", "Payment Term", "Payment Terms Template"],
    ownedEntities: ["Price List", "Pricing Rule", "Tax Rule", "Commercial Policy", "Payment Terms Template", "Withholding Policy"],
    reports: ["Item Price Register", "Pricing Rule Summary", "Tax Rule Coverage", "Payment Terms Adoption"],
    exceptionQueues: ["pricing-override-review", "tax-rule-conflicts", "currency-rounding-exceptions"],
    operationalScenarios: ["price-list-publication", "quote-pricing-evaluation", "tax-determination-and-withholding"],
    settingsSurfaces: ["Accounts Settings", "Selling Settings", "Buying Settings", "Currency Exchange Settings"],
    edgeCases: ["overlapping promotions", "inclusive versus exclusive tax conflicts", "multi-currency rounding drift"]
  },
  "traceability-core": {
    erpnextModules: ["Stock", "Accounts", "Selling", "Buying", "Support"],
    erpnextDoctypes: ["Serial No", "Batch", "Stock Ledger Entry", "Stock Reservation Entry", "Delivery Note", "Purchase Receipt"],
    ownedEntities: ["Document Link", "Traceability Dimension", "Lineage Snapshot", "Reconciliation Surface", "Correlation Graph"],
    reports: ["Document Traceability Graph", "Reconciliation Queue Summary", "Serial or Batch Genealogy", "Downstream Failure Audit"],
    exceptionQueues: ["broken-lineage-links", "reconciliation-backlog", "missing-upstream-correlation"],
    operationalScenarios: ["lead-to-cash-lineage", "procure-to-pay-lineage", "plan-to-produce-genealogy"],
    settingsSurfaces: ["Stock Settings", "Accounts Settings", "Support Settings"],
    edgeCases: ["missing upstream references", "cyclic document linkage", "partial reconciliation across modules"]
  },
  "accounting-core": {
    erpnextModules: ["Accounts"],
    erpnextDoctypes: ["Account", "Accounting Period", "Journal Entry", "Payment Entry", "Sales Invoice", "Purchase Invoice", "GL Entry", "Bank Reconciliation Tool", "Exchange Rate Revaluation", "Dunning", "Budget", "Period Closing Voucher", "POS Invoice"],
    ownedEntities: ["Chart of Accounts", "Journal", "Billing Document", "Payment Allocation", "GL Entry", "Bank Reconciliation", "Accounting Period", "Budget", "Dunning Case"],
    reports: ["Trial Balance", "General Ledger", "Balance Sheet", "Profit and Loss Statement", "Accounts Receivable", "Accounts Payable", "Cash Flow", "Bank Clearance Summary"],
    exceptionQueues: ["period-close-blockers", "bank-reconciliation-breaks", "subledger-gl-mismatches", "over-billing-review", "stale-exchange-rates"],
    operationalScenarios: ["invoice-to-payment", "purchase-bill-to-payment", "credit-note-reversal", "bank-import-to-reconciliation", "period-close"],
    settingsSurfaces: ["Accounts Settings", "Fiscal Year", "Payment Terms Template", "Mode of Payment", "Finance Book", "Accounting Period"],
    edgeCases: ["partial allocation", "multi-currency revaluation", "advance payment adjustment", "cancellation with linked payments", "closed-period reopening"]
  },
  "crm-core": {
    erpnextModules: ["CRM"],
    erpnextDoctypes: ["Lead", "Opportunity", "Prospect", "Appointment", "Campaign", "Sales Stage"],
    ownedEntities: ["Lead", "Opportunity", "Prospect", "Campaign", "Stage History", "Forecast Snapshot"],
    reports: ["Lead Details", "Opportunity Summary", "Pipeline by Stage", "Sales Stage Analysis"],
    exceptionQueues: ["lead-dedupe-review", "handoff-readiness-blockers", "stale-opportunity-followups"],
    operationalScenarios: ["lead-capture", "qualification-and-scoring", "opportunity-handoff-to-sales"],
    settingsSurfaces: ["CRM Settings", "Appointment Booking Settings"],
    edgeCases: ["duplicate lead conversion", "opportunity reopen after loss", "handoff without commercial context"]
  },
  "sales-core": {
    erpnextModules: ["Selling"],
    erpnextDoctypes: ["Quotation", "Sales Order", "Delivery Note", "Installation Note", "Product Bundle", "Delivery Schedule Item"],
    ownedEntities: ["Quotation", "Sales Order", "Fulfillment Request", "Billing Request", "Return Authorization", "Margin Snapshot"],
    reports: ["Sales Register", "Quotation Trends", "Delivery Performance", "Sales Order Backlog"],
    exceptionQueues: ["credit-hold-orders", "partial-fulfillment-review", "billing-request-failures", "return-authorization-review"],
    operationalScenarios: ["quote-to-order", "order-to-fulfillment-request", "return-to-credit-flow", "milestone-or-delivered-only-billing"],
    settingsSurfaces: ["Selling Settings", "POS Settings", "Price List"],
    edgeCases: ["partial deliveries", "partial invoicing", "drop shipment", "sales returns", "discount approval breach"]
  },
  "procurement-core": {
    erpnextModules: ["Buying", "Subcontracting"],
    erpnextDoctypes: ["Supplier", "Request for Quotation", "Supplier Quotation", "Purchase Order", "Purchase Receipt", "Supplier Scorecard", "Subcontracting Order"],
    ownedEntities: ["Purchase Requisition", "RFQ", "Supplier Quote", "Purchase Order", "Receipt Request", "Supplier Return", "Supplier Scorecard"],
    reports: ["Purchase Register", "Supplier Scorecard Summary", "Purchase Order Trends", "Receipt versus Bill Variance"],
    exceptionQueues: ["price-variance-review", "short-receipt-review", "over-receipt-review", "supplier-delay-replan"],
    operationalScenarios: ["requisition-to-rfq", "award-to-purchase-order", "receipt-request-to-bill-suggestion", "subcontract-procurement"],
    settingsSurfaces: ["Buying Settings", "Supplier Scorecard", "Request for Quotation"],
    edgeCases: ["substitute items", "rejected goods billing policy", "PO closure without full receipt", "three-way-match variance"]
  },
  "inventory-core": {
    erpnextModules: ["Stock"],
    erpnextDoctypes: ["Warehouse", "Bin", "Batch", "Serial No", "Stock Entry", "Stock Reconciliation", "Stock Ledger Entry", "Stock Reservation Entry", "Pick List", "Packing Slip", "Shipment", "Landed Cost Voucher"],
    ownedEntities: ["Warehouse", "Location", "Stock Ledger", "Reservation", "Transfer", "Pick Wave", "Batch or Serial Genealogy", "Valuation Layer"],
    reports: ["Stock Ledger", "Stock Balance", "Projected Quantity", "Batch-Wise Balance History", "Warehouse Wise Item Balance Age and Value", "BOM Stock Report"],
    exceptionQueues: ["negative-stock-blocks", "cycle-count-differences", "transfer-discrepancies", "valuation-reposting-review"],
    operationalScenarios: ["receipt-to-putaway", "reservation-to-pick-pack-ship", "transfer-in-transit", "cycle-count-and-recount"],
    settingsSurfaces: ["Stock Settings", "Delivery Settings", "Putaway Rule"],
    edgeCases: ["serial-batch mismatch", "negative stock prevention", "partial transfer receipt", "valuation corrections after backdated entry"]
  },
  "projects-core": {
    erpnextModules: ["Projects"],
    erpnextDoctypes: ["Project", "Task", "Timesheet", "Activity Cost", "Project Update", "Project Template"],
    ownedEntities: ["Project", "Task", "Milestone", "Timesheet", "Budget", "Change Request", "Billing Rule"],
    reports: ["Project Wise Stock Tracking", "Daily Timesheet Summary", "Project Budget Burn", "Milestone Billing Status"],
    exceptionQueues: ["budget-overrun-review", "timesheet-approval-backlog", "change-request-certification"],
    operationalScenarios: ["project-setup", "time-and-expense-capture", "milestone-billing-request", "change-order-governance"],
    settingsSurfaces: ["Projects Settings", "Activity Cost", "Project Template"],
    edgeCases: ["hard-stop budget policy", "retention billing", "reopened projects after closure", "unapproved timesheet billing"]
  },
  "support-service-core": {
    erpnextModules: ["Support", "Maintenance"],
    erpnextDoctypes: ["Issue", "Issue Type", "Issue Priority", "Service Level Agreement", "Warranty Claim", "Maintenance Visit"],
    ownedEntities: ["Ticket", "Queue", "SLA Clock", "Service Order", "Entitlement Check", "Resolution Survey"],
    reports: ["Issue Summary", "SLA Breach Dashboard", "Warranty Claim Status", "Service Billing Backlog"],
    exceptionQueues: ["sla-breach-review", "reopen-review", "spare-parts-request-backlog", "warranty-eligibility-review"],
    operationalScenarios: ["ticket-intake", "triage-to-service-order", "warranty-validation", "service-to-bill"],
    settingsSurfaces: ["Support Settings", "Service Level Agreement", "Issue Priority"],
    edgeCases: ["pause-resume SLA", "reopened tickets after closure", "customer-wait state", "ticket to spare issue without stock confirmation"]
  },
  "pos-core": {
    erpnextModules: ["Accounts", "Selling"],
    erpnextDoctypes: ["POS Profile", "POS Settings", "POS Opening Entry", "POS Closing Entry", "POS Invoice", "Cashier Closing"],
    ownedEntities: ["POS Session", "Receipt Journal", "Offline Sync Record", "Shift Close", "Cashier Variance", "Tender Reconciliation"],
    reports: ["POS Shift Summary", "Cashier Variance", "POS Closing Summary", "Offline Sync Exceptions"],
    exceptionQueues: ["offline-sync-conflicts", "cashier-variance-review", "duplicate-receipt-replay"],
    operationalScenarios: ["register-open-to-close", "offline-sale-replay", "refund-or-exchange", "cashier-close-reconciliation"],
    settingsSurfaces: ["POS Settings", "POS Profile", "Mode of Payment"],
    edgeCases: ["offline duplicate prevention", "cashier close while central unavailable", "multi-tender refund", "delayed stock settlement"]
  },
  "manufacturing-core": {
    erpnextModules: ["Manufacturing", "Subcontracting"],
    erpnextDoctypes: ["BOM", "Routing", "Operation", "Work Order", "Job Card", "Production Plan", "Workstation", "Downtime Entry", "Subcontracting BOM"],
    ownedEntities: ["BOM Revision", "Routing", "Work Center", "Production Plan", "Work Order", "Operation Log", "Scrap Record", "Rework Order", "WIP Snapshot"],
    reports: ["BOM Stock Report", "Production Plan Summary", "Work Order Variance", "Capacity and Downtime Summary"],
    exceptionQueues: ["material-shortage-review", "scrap-variance-review", "capacity-overload-review", "subcontract-output-hold"],
    operationalScenarios: ["mrp-to-production-plan", "work-order-release", "issue-to-production-to-finished-goods", "scrap-and-rework", "subcontract-manufacturing"],
    settingsSurfaces: ["Manufacturing Settings", "Workstation", "Routing", "Operation"],
    edgeCases: ["backflushed variances", "scrap and by-product capture", "operation quality hold", "subcontract partial receipt", "serial genealogy across rework"]
  },
  "quality-core": {
    erpnextModules: ["Quality Management", "Stock"],
    erpnextDoctypes: ["Quality Inspection", "Quality Inspection Template", "Non Conformance", "Quality Action", "Quality Review", "Quality Feedback"],
    ownedEntities: ["Inspection", "Quality Template", "Nonconformance", "CAPA", "Quality Review", "Release Decision"],
    reports: ["Quality Inspection Summary", "Nonconformance Summary", "CAPA Backlog", "Release Hold Dashboard"],
    exceptionQueues: ["failed-inspection-review", "capa-overdue", "partial-lot-release-review"],
    operationalScenarios: ["incoming-inspection", "in-process-inspection", "quality-hold-and-release", "nonconformance-to-capa"],
    settingsSurfaces: ["Quality Inspection Template", "Quality Action", "Quality Review"],
    edgeCases: ["partial lot release", "deviation approval", "quarantine transfer mismatch", "inspection after return"]
  },
  "assets-core": {
    erpnextModules: ["Assets", "Maintenance"],
    erpnextDoctypes: ["Asset", "Asset Category", "Asset Capitalization", "Asset Movement", "Asset Value Adjustment", "Depreciation Schedule", "Asset Repair", "Asset Maintenance"],
    ownedEntities: ["Asset Register", "Capitalization Request", "Depreciation Schedule", "Custody Assignment", "Asset Transfer", "Impairment or Revaluation", "Disposal"],
    reports: ["Asset Register", "Depreciation Schedule", "Asset Movement Summary", "Physical Verification Exceptions"],
    exceptionQueues: ["capitalization-review", "depreciation-failure-review", "physical-verification-mismatch", "early-disposal-review"],
    operationalScenarios: ["acquire-to-capitalize", "depreciation-run", "transfer-and-custody", "disposal-or-write-off"],
    settingsSurfaces: ["Asset Category", "Depreciation Schedule", "Asset Maintenance Team"],
    edgeCases: ["partial capitalization", "asset split or merge", "cross-branch transfer", "impairment after depreciation"]
  },
  "hr-payroll-core": {
    erpnextModules: ["HR", "Payroll", "Projects", "Manufacturing"],
    erpnextDoctypes: ["Employee", "Payroll Entry", "Salary Slip", "Salary Structure", "Leave Application", "Expense Claim", "Shift Assignment", "Attendance"],
    ownedEntities: ["Employee", "Attendance", "Leave Ledger", "Payroll Run", "Salary Structure", "Expense Claim", "Loan or Advance"],
    reports: ["Payroll Register", "Salary Register", "Leave Ledger", "Expense Claim Summary", "Attendance Summary"],
    exceptionQueues: ["payroll-lock-review", "retro-pay-adjustments", "leave-balance-corrections", "payout-failure-review"],
    operationalScenarios: ["employee-onboarding", "leave-approval", "payroll-processing", "expense-claim-reimbursement", "off-cycle-payroll"],
    settingsSurfaces: ["Payroll Settings", "Salary Structure", "Leave Type", "Shift Type"],
    edgeCases: ["retro salary changes", "off-cycle payroll", "unpaid leave correction", "bank payout failure", "payroll reversal and rerun"]
  },
  "contracts-core": {
    erpnextModules: ["CRM", "Selling"],
    erpnextDoctypes: ["Contract", "Contract Template", "Contract Fulfilment Checklist"],
    ownedEntities: ["Contract Register", "Entitlement Rule", "Billing Schedule", "Renewal Reminder", "Contract Amendment"],
    reports: ["Contract Renewal Summary", "Entitlement Coverage", "Billing Schedule Forecast"],
    exceptionQueues: ["renewal-review", "entitlement-conflict-review", "contract-amendment-approval"],
    operationalScenarios: ["contract-activation", "schedule-publication", "renewal-or-amendment"],
    settingsSurfaces: ["Contract Template", "Sales Settings"],
    edgeCases: ["contract supersession", "renewal without revised pricing", "entitlement overlap"]
  },
  "subscriptions-core": {
    erpnextModules: ["Accounts"],
    erpnextDoctypes: ["Subscription Settings", "Payment Request", "Sales Invoice", "Purchase Invoice"],
    ownedEntities: ["Subscription Plan", "Billing Cycle", "Renewal Run", "Subscription Exception", "Usage Accrual"],
    reports: ["Subscription Renewal Summary", "MRR Snapshot", "Failed Renewal Queue"],
    exceptionQueues: ["renewal-failure-review", "payment-timeout-review", "plan-change-proration-review"],
    operationalScenarios: ["plan-publication", "renewal-cycle-generation", "proration-and-retry"],
    settingsSurfaces: ["Subscription Settings", "Payment Terms Template"],
    edgeCases: ["failed auto-renewal", "mid-cycle plan change", "duplicate renewal replay"]
  },
  "business-portals-core": {
    erpnextModules: ["Portal", "Support", "Selling", "Buying"],
    erpnextDoctypes: ["Portal", "Issue", "Quotation", "Request for Quotation"],
    ownedEntities: ["Customer Workspace", "Vendor Workspace", "Employee Workspace", "Portal Action Capture"],
    reports: ["Self-Service Activity Summary", "Portal Adoption", "Portal Exception Queue"],
    exceptionQueues: ["portal-access-review", "self-service-action-failures", "portal-identity-link-review"],
    operationalScenarios: ["customer-self-service", "vendor-response-flow", "employee-request-flow"],
    settingsSurfaces: ["Portal Settings", "Support Settings"],
    edgeCases: ["expired shared access", "cross-role portal identity conflicts", "portal action replay"]
  },
  "field-service-core": {
    erpnextModules: ["Support", "Maintenance", "Projects"],
    erpnextDoctypes: ["Issue", "Maintenance Visit", "Project", "Task"],
    ownedEntities: ["Dispatch", "Visit", "Parts Request", "Technician Timeline", "Field Billing Request"],
    reports: ["Dispatch Summary", "Visit Completion", "Parts Consumption Backlog"],
    exceptionQueues: ["dispatch-overdue", "parts-request-backlog", "visit-reconciliation-review"],
    operationalScenarios: ["dispatch-scheduling", "visit-execution", "parts-request-to-billing"],
    settingsSurfaces: ["Support Settings", "Maintenance Schedule"],
    edgeCases: ["disconnected field execution", "technician reassignment after start", "spare request without entitlement"]
  },
  "maintenance-cmms-core": {
    erpnextModules: ["Maintenance", "Assets"],
    erpnextDoctypes: ["Maintenance Schedule", "Maintenance Visit", "Asset Maintenance", "Asset Repair"],
    ownedEntities: ["Maintenance Plan", "Work Order", "Downtime Event", "Asset Health Record", "Preventive Schedule"],
    reports: ["Maintenance Plan Summary", "Downtime Summary", "Preventive Compliance"],
    exceptionQueues: ["overdue-maintenance", "downtime-escalation", "maintenance-plan-review"],
    operationalScenarios: ["preventive-plan-publication", "work-order-release", "downtime-recording"],
    settingsSurfaces: ["Maintenance Schedule", "Asset Maintenance Team"],
    edgeCases: ["missed preventive schedule", "asset under repair during active assignment", "downtime overlap"]
  },
  "treasury-core": {
    erpnextModules: ["Accounts"],
    erpnextDoctypes: ["Bank", "Bank Account", "Bank Transaction", "Bank Statement Import", "Bank Reconciliation Tool", "Payment Order"],
    ownedEntities: ["Cash Position", "Banking Setup", "Forecast", "Reconciliation Session", "Payout Batch"],
    reports: ["Cash Position Summary", "Bank Reconciliation Overview", "Treasury Forecast"],
    exceptionQueues: ["unmatched-bank-transactions", "payout-failure-review", "forecast-variance-review"],
    operationalScenarios: ["bank-import", "payment-order-execution", "cash-forecast-refresh"],
    settingsSurfaces: ["Bank", "Bank Account", "Bank Statement Import"],
    edgeCases: ["duplicate statement import", "partial bank match", "payment-order rejection"]
  },
  "e-invoicing-core": {
    erpnextModules: ["EDI", "Accounts", "Regional"],
    erpnextDoctypes: ["Sales Invoice", "Purchase Invoice", "POS Invoice", "Payment Request"],
    ownedEntities: ["Submission Document", "E-Invoice Payload", "Submission Attempt", "Tax Reconciliation Result", "Government Response"],
    reports: ["Submission Summary", "Government Error Summary", "Reconciliation Status"],
    exceptionQueues: ["submission-failures", "schema-validation-errors", "government-response-review"],
    operationalScenarios: ["invoice-preparation", "submission-and-retry", "reconciliation-to-accounting"],
    settingsSurfaces: ["E-Invoicing Settings", "Regional Tax Configuration"],
    edgeCases: ["duplicate submission replay", "late government acknowledgement", "canceled invoice already submitted"]
  },
  "analytics-bi-core": {
    erpnextModules: ["Report Center", "Accounts", "Selling", "Buying", "Stock", "Projects"],
    erpnextDoctypes: ["Financial Report Template", "Ledger Health Monitor", "Quick Stock Balance", "Project Update"],
    ownedEntities: ["Dataset", "KPI Definition", "Warehouse Sync Job", "Analytics Exception", "Derived Snapshot"],
    reports: ["Executive KPI Summary", "Dataset Freshness", "Cross-Domain Exception Dashboard"],
    exceptionQueues: ["warehouse-sync-failures", "stale-kpi-refresh", "dataset-contract-drift"],
    operationalScenarios: ["dataset-publication", "kpi-refresh", "warehouse-sync-enqueue"],
    settingsSurfaces: ["Report Center", "Financial Report Template"],
    edgeCases: ["stale projections", "cross-domain schema drift", "late-arriving facts"]
  },
  "ai-assist-core": {
    erpnextModules: ["CRM", "Support", "Projects"],
    erpnextDoctypes: ["Lead", "Opportunity", "Issue", "Project"],
    ownedEntities: ["Summary Log", "Triage Suggestion", "Anomaly Review", "Feedback Record"],
    reports: ["Summary Generation Log", "Anomaly Review Summary", "AI Assist Adoption"],
    exceptionQueues: ["low-confidence-triage-review", "anomaly-false-positive-review", "assistant-feedback-backlog"],
    operationalScenarios: ["summary-generation", "triage-routing", "anomaly-review-with-human-approval"],
    settingsSurfaces: ["AI Assist Policy", "Support Settings", "CRM Settings"],
    edgeCases: ["assistant suggestion conflicts with policy", "duplicate AI output replay", "human override after automated suggestion"]
  }
};

function applyBusinessParity(spec) {
  return {
    ...spec,
    domainCatalog: mergeDomainCatalog(spec.domainCatalog, businessParityCatalog[spec.id])
  };
}

export const businessPluginSpecs = [
  businessSpec({
    stage: "P0",
    id: "party-relationships-core",
    repoName: "gutu-plugin-party-relationships-core",
    packageDir: "party-relationships-core",
    displayName: "Party & Relationships Core",
    description: "Canonical party, contact, address, relationship, and role-facet records for customer, supplier, prospect, and multi-role business identity flows.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "party_relationships",
      subcategoryLabel: "Party & Relationships"
    },
    dependsOn: ["auth-core", "org-tenant-core", "role-policy-core", "audit-core", "workflow-core"],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.party", "events.publish.party"],
    providesCapabilities: ["party.parties", "party.contacts", "party.relationships"],
    ownsData: ["party.parties", "party.contacts", "party.relationships", "party.role-facets"],
    publicCommands: ["party.parties.create", "party.parties.merge", "party.roles.activate"],
    publicQueries: ["party.party-summary", "party.relationship-graph"],
    publicEvents: ["party.created.v1", "party.merged.v1", "party.role-activated.v1"],
    route: "/admin/business/parties",
    workspace: {
      id: "business-foundations",
      label: "Business Foundations",
      icon: "briefcase-business",
      description: "Canonical shared masters and governed reference data."
    },
    pageTitle: "Party Control Room",
    pageSummary: "Canonical parties, contacts, and relationship facets with merge-safe business identity tracking.",
    resources: [
      {
        id: "party.parties",
        description: "Canonical parties with multi-role lifecycle metadata and traceability fields.",
        businessPurpose: "Provide one governed write model for customers, suppliers, prospects, and related external entities."
      },
      {
        id: "party.contacts",
        description: "Contact and address records attached to canonical parties.",
        businessPurpose: "Keep communication endpoints and jurisdiction-sensitive address data aligned to party truth."
      },
      {
        id: "party.relationships",
        description: "Parent-child and commercial relationships between parties.",
        businessPurpose: "Model hierarchies, account ownership, and cross-party commercial context without duplicating master records."
      }
    ],
    actions: [
      { id: "party.parties.create", permission: "party.parties.write", label: "Create Party Record" },
      { id: "party.parties.merge", permission: "party.parties.write", label: "Merge Party Records" },
      { id: "party.roles.activate", permission: "party.roles.write", label: "Activate Party Role" }
    ],
    jobs: [
      { id: "party.projections.refresh", queue: "party-projections" },
      { id: "party.reconciliation.run", queue: "party-reconciliation" }
    ],
    workflow: {
      id: "party-onboarding",
      description: "Onboard, approve, activate, and archive canonical party records.",
      businessPurpose: "Keep party onboarding governed, deduplicated, and auditable before downstream domains depend on it.",
      actors: ["operations", "compliance", "commercial-owner"]
    },
    packType: "base-template"
  }),
  businessSpec({
    stage: "P0",
    id: "product-catalog-core",
    repoName: "gutu-plugin-product-catalog-core",
    packageDir: "product-catalog-core",
    displayName: "Product & Catalog Core",
    description: "Canonical product, variant, UOM, and policy metadata for goods, services, assets, subscriptions, and kit-style catalog composition.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "product_catalog",
      subcategoryLabel: "Product & Catalog"
    },
    dependsOn: ["auth-core", "org-tenant-core", "role-policy-core", "audit-core", "workflow-core"],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.catalog", "events.publish.catalog"],
    providesCapabilities: ["catalog.products", "catalog.variants", "catalog.policies"],
    ownsData: ["catalog.products", "catalog.variants", "catalog.uoms", "catalog.policies"],
    publicCommands: ["catalog.products.create", "catalog.products.revise", "catalog.products.substitute"],
    publicQueries: ["catalog.product-summary", "catalog.variant-matrix"],
    publicEvents: ["catalog.product-created.v1", "catalog.product-revised.v1", "catalog.substitute-declared.v1"],
    route: "/admin/business/catalog",
    workspace: {
      id: "business-foundations",
      label: "Business Foundations",
      icon: "briefcase-business",
      description: "Canonical shared masters and governed reference data."
    },
    pageTitle: "Catalog Control Room",
    pageSummary: "Products, variants, and policy defaults that the rest of the suite can compose safely.",
    resources: [
      {
        id: "catalog.products",
        description: "Canonical products with behavior flags and revision-safe metadata.",
        businessPurpose: "Give every business plugin one governed catalog truth instead of disconnected product masters."
      },
      {
        id: "catalog.variants",
        description: "Variant combinations, identifiers, and conversion-friendly item detail.",
        businessPurpose: "Keep purchasable and sellable product permutations traceable without forking the core catalog."
      },
      {
        id: "catalog.policies",
        description: "Procurement, manufacturing, valuation, and quality defaults for catalog records.",
        businessPurpose: "Publish reusable commercial and operational defaults to downstream domains."
      }
    ],
    actions: [
      { id: "catalog.products.create", permission: "catalog.products.write", label: "Create Catalog Product" },
      { id: "catalog.products.revise", permission: "catalog.products.write", label: "Revise Catalog Product" },
      { id: "catalog.products.substitute", permission: "catalog.products.write", label: "Declare Product Substitute" }
    ],
    jobs: [
      { id: "catalog.projections.refresh", queue: "catalog-projections" },
      { id: "catalog.reconciliation.run", queue: "catalog-reconciliation" }
    ],
    workflow: {
      id: "catalog-lifecycle",
      description: "Create, review, activate, revise, and retire governed catalog records.",
      businessPurpose: "Keep catalog lifecycle changes explicit so downstream planning, selling, and buying flows stay stable.",
      actors: ["catalog-manager", "approver", "operations"]
    },
    packType: "base-template"
  }),
  businessSpec({
    stage: "P0",
    id: "pricing-tax-core",
    repoName: "gutu-plugin-pricing-tax-core",
    packageDir: "pricing-tax-core",
    displayName: "Pricing & Tax Core",
    description: "Shared price lists, discount rules, tax determination, withholding rules, and commercial policy precedence for every order and billing flow.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "pricing_tax",
      subcategoryLabel: "Pricing & Tax"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "party-relationships-core",
      "product-catalog-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.pricing", "events.publish.pricing"],
    providesCapabilities: ["pricing.price-lists", "pricing.tax-rules", "pricing.commercial-policies"],
    ownsData: ["pricing.price-lists", "pricing.tax-rules", "pricing.commercial-policies", "pricing.payment-terms"],
    publicCommands: ["pricing.price-lists.publish", "pricing.tax-rules.publish", "pricing.policies.evaluate"],
    publicQueries: ["pricing.quote-context", "pricing.tax-context"],
    publicEvents: ["pricing.price-list-published.v1", "pricing.tax-rules-published.v1", "pricing.policy-overridden.v1"],
    route: "/admin/business/pricing",
    workspace: {
      id: "business-foundations",
      label: "Business Foundations",
      icon: "briefcase-business",
      description: "Canonical shared masters and governed reference data."
    },
    pageTitle: "Pricing & Tax Control Room",
    pageSummary: "Commercial rules, tax policy, and effective-date governance for quote, order, and billing lifecycles.",
    resources: [
      {
        id: "pricing.price-lists",
        description: "Versioned price lists, discount rules, and commercial overrides.",
        businessPurpose: "Keep commercial demand and procurement policy evaluation consistent across the suite."
      },
      {
        id: "pricing.tax-rules",
        description: "Tax categories, jurisdiction rules, and withholding configurations.",
        businessPurpose: "Provide one shared tax-determination layer instead of burying fiscal logic in every plugin."
      },
      {
        id: "pricing.commercial-policies",
        description: "Rounding, precedence, payment terms, and segment-specific pricing policies.",
        businessPurpose: "Make commercial decision logic visible, configurable, and packable."
      }
    ],
    actions: [
      { id: "pricing.price-lists.publish", permission: "pricing.price-lists.write", label: "Publish Price List" },
      { id: "pricing.tax-rules.publish", permission: "pricing.tax-rules.write", label: "Publish Tax Rules" },
      { id: "pricing.policies.evaluate", permission: "pricing.commercial-policies.read", label: "Evaluate Commercial Policy" }
    ],
    jobs: [
      { id: "pricing.projections.refresh", queue: "pricing-projections" },
      { id: "pricing.reconciliation.run", queue: "pricing-reconciliation" }
    ],
    workflow: {
      id: "pricing-policy-lifecycle",
      description: "Draft, approve, publish, supersede, and retire pricing and tax policy changes.",
      businessPurpose: "Keep tax and pricing changes reviewable before they affect live demand or financial flows.",
      actors: ["pricing-analyst", "finance", "approver"]
    },
    packType: "base-template"
  }),
  businessSpec({
    stage: "P0",
    id: "traceability-core",
    repoName: "gutu-plugin-traceability-core",
    packageDir: "traceability-core",
    displayName: "Traceability & Dimensions Core",
    description: "Document lineage, correlation IDs, upstream/downstream references, reconciliation surfaces, and common operating dimensions for cross-plugin traceability.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "traceability_dimensions",
      subcategoryLabel: "Traceability & Dimensions"
    },
    dependsOn: ["auth-core", "org-tenant-core", "role-policy-core", "audit-core", "workflow-core", "document-core"],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.traceability", "events.publish.traceability"],
    providesCapabilities: ["traceability.links", "traceability.dimensions", "traceability.reconciliation"],
    ownsData: ["traceability.links", "traceability.dimensions", "traceability.reconciliation", "traceability.snapshots"],
    publicCommands: ["traceability.links.record", "traceability.dimensions.publish", "traceability.reconciliation.queue"],
    publicQueries: ["traceability.document-graph", "traceability.reconciliation-summary"],
    publicEvents: ["traceability.link-recorded.v1", "traceability.dimension-published.v1", "traceability.reconciliation-queued.v1"],
    route: "/admin/business/traceability",
    workspace: {
      id: "business-foundations",
      label: "Business Foundations",
      icon: "briefcase-business",
      description: "Canonical shared masters and governed reference data."
    },
    pageTitle: "Traceability Control Room",
    pageSummary: "Document lineage, common dimensions, and visible reconciliation queues for cross-plugin business effects.",
    resources: [
      {
        id: "traceability.links",
        description: "Typed upstream and downstream document links with correlation metadata.",
        businessPurpose: "Expose business lineage instead of hiding cross-plugin effects inside private tables."
      },
      {
        id: "traceability.dimensions",
        description: "Shared company, branch, warehouse, project, and cost dimensions used across plugins.",
        businessPurpose: "Keep operating dimensions reusable and permission-aware without duplicating scope metadata."
      },
      {
        id: "traceability.reconciliation",
        description: "Exception queues and reconciliation checkpoints for downstream business flows.",
        businessPurpose: "Provide a durable place to surface partial failure, drift, and repair work."
      }
    ],
    actions: [
      { id: "traceability.links.record", permission: "traceability.links.write", label: "Record Traceability Link" },
      { id: "traceability.dimensions.publish", permission: "traceability.dimensions.write", label: "Publish Common Dimension" },
      { id: "traceability.reconciliation.queue", permission: "traceability.reconciliation.write", label: "Queue Reconciliation Item" }
    ],
    jobs: [
      { id: "traceability.projections.refresh", queue: "traceability-projections" },
      { id: "traceability.reconciliation.run", queue: "traceability-reconciliation" }
    ],
    workflow: {
      id: "traceability-reconciliation",
      description: "Open, review, repair, and close cross-plugin reconciliation items.",
      businessPurpose: "Make downstream repair work explicit whenever plugin-local truth and shared projections diverge.",
      actors: ["operator", "approver", "controller"]
    },
    packType: "base-template"
  }),
  businessSpec({
    stage: "P1",
    id: "accounting-core",
    repoName: "gutu-plugin-accounting-core",
    packageDir: "accounting-core",
    displayName: "Accounting Core",
    description: "General ledger, receivable, payable, billing, payment allocation, and close-oriented accounting truth with append-only posting discipline.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "accounting_finance",
      subcategoryLabel: "Accounting & Finance"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "party-relationships-core",
      "pricing-tax-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.accounting", "events.publish.accounting"],
    providesCapabilities: ["accounting.journals", "accounting.billing", "accounting.reconciliation"],
    ownsData: ["accounting.journals", "accounting.billing", "accounting.allocations", "accounting.reconciliation"],
    publicCommands: ["accounting.billing.post", "accounting.payments.allocate", "accounting.periods.close"],
    publicQueries: ["accounting.trial-balance", "accounting.subledger-reconciliation"],
    publicEvents: ["accounting.billing-posted.v1", "accounting.payment-allocated.v1", "accounting.period-closed.v1"],
    route: "/admin/business/accounting",
    workspace: {
      id: "accounting",
      label: "Accounting",
      icon: "scale",
      description: "Ledger truth, billing, and financial close operations."
    },
    pageTitle: "Accounting Control Room",
    pageSummary: "Ledger truth, posting intent handling, billing posture, and reconciliation visibility.",
    resources: [
      {
        id: "accounting.journals",
        description: "Journal batches, posting states, and append-only accounting headers.",
        businessPurpose: "Keep financial truth inside the accounting boundary instead of allowing raw cross-plugin ledger writes."
      },
      {
        id: "accounting.billing",
        description: "Billing documents, allocations, and receivable or payable lifecycle state.",
        businessPurpose: "Translate validated upstream intents into receivable and payable truth."
      },
      {
        id: "accounting.reconciliation",
        description: "Subledger, bank, and period-close reconciliation queues.",
        businessPurpose: "Surface financial drift, posting delays, and operator repair work explicitly."
      }
    ],
    actions: [
      { id: "accounting.billing.post", permission: "accounting.billing.write", label: "Post Billing Document" },
      { id: "accounting.payments.allocate", permission: "accounting.payments.write", label: "Allocate Payment" },
      { id: "accounting.periods.close", permission: "accounting.periods.close", label: "Close Accounting Period" }
    ],
    jobs: [
      { id: "accounting.projections.refresh", queue: "accounting-projections" },
      { id: "accounting.reconciliation.run", queue: "accounting-reconciliation" }
    ],
    workflow: {
      id: "accounting-posting-lifecycle",
      description: "Review, approve, post, reverse, and close accounting documents.",
      businessPurpose: "Keep posting, reversal, and close logic explicit for ledgers, bills, and invoices.",
      actors: ["accountant", "approver", "controller"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P1",
    id: "crm-core",
    repoName: "gutu-plugin-crm-core",
    packageDir: "crm-core",
    displayName: "CRM Core",
    description: "Lead, opportunity, campaign, and pre-sales engagement records with governed handoff readiness before sales takes commercial truth ownership.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "crm_pipeline",
      subcategoryLabel: "CRM & Pipeline"
    },
    dependsOn: ["auth-core", "org-tenant-core", "role-policy-core", "audit-core", "workflow-core", "party-relationships-core"],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.crm", "events.publish.crm"],
    providesCapabilities: ["crm.leads", "crm.opportunities", "crm.forecasts"],
    ownsData: ["crm.leads", "crm.opportunities", "crm.activities", "crm.forecasts"],
    publicCommands: ["crm.leads.capture", "crm.opportunities.advance", "crm.handoffs.prepare"],
    publicQueries: ["crm.pipeline-summary", "crm.handoff-readiness"],
    publicEvents: ["crm.lead-captured.v1", "crm.opportunity-advanced.v1", "crm.handoff-ready.v1"],
    route: "/admin/business/crm",
    workspace: {
      id: "crm",
      label: "CRM",
      icon: "network",
      description: "Pre-sales pipeline, forecasting, and commercial handoff readiness."
    },
    pageTitle: "CRM Control Room",
    pageSummary: "Lead capture, opportunity posture, and governed handoff readiness into quote and order flows.",
    resources: [
      {
        id: "crm.leads",
        description: "Lead records with routing, qualification, and dedupe-ready state.",
        businessPurpose: "Keep pre-sales intake governed before a commercial commitment exists."
      },
      {
        id: "crm.opportunities",
        description: "Opportunities, stages, and pre-sales commercial context.",
        businessPurpose: "Track demand readiness before Sales becomes the commercial source of truth."
      },
      {
        id: "crm.forecasts",
        description: "Forecast and handoff-readiness views derived from active pipeline state.",
        businessPurpose: "Give operators and leadership a stable pre-sales projection surface."
      }
    ],
    actions: [
      { id: "crm.leads.capture", permission: "crm.leads.write", label: "Capture CRM Lead" },
      { id: "crm.opportunities.advance", permission: "crm.opportunities.write", label: "Advance Opportunity" },
      { id: "crm.handoffs.prepare", permission: "crm.opportunities.write", label: "Prepare Sales Handoff" }
    ],
    jobs: [
      { id: "crm.projections.refresh", queue: "crm-projections" },
      { id: "crm.reconciliation.run", queue: "crm-reconciliation" }
    ],
    workflow: {
      id: "crm-opportunity-lifecycle",
      description: "Qualify, advance, approve, hand off, and close pre-sales opportunities.",
      businessPurpose: "Keep lead-to-opportunity and handoff state explicit before quote or order creation.",
      actors: ["sales-rep", "manager", "revops"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P1",
    id: "sales-core",
    repoName: "gutu-plugin-sales-core",
    packageDir: "sales-core",
    displayName: "Sales Core",
    description: "Quote-to-order demand truth, commercial approvals, fulfillment requests, billing intents, and return initiation for customer-facing sales flows.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "sales_commerce",
      subcategoryLabel: "Sales & Commerce"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "party-relationships-core",
      "product-catalog-core",
      "pricing-tax-core",
      "traceability-core",
      "crm-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.sales", "events.publish.sales"],
    providesCapabilities: ["sales.quotes", "sales.orders", "sales.billing-requests"],
    ownsData: ["sales.quotes", "sales.orders", "sales.fulfillment-requests", "sales.billing-requests"],
    publicCommands: ["sales.quotes.create", "sales.orders.confirm", "sales.billing.request"],
    publicQueries: ["sales.order-summary", "sales.order-traceability"],
    publicEvents: ["sales.quote-created.v1", "sales.order-confirmed.v1", "sales.billing-requested.v1"],
    route: "/admin/business/sales",
    workspace: {
      id: "sales",
      label: "Sales",
      icon: "hand-coins",
      description: "Commercial demand, order commitments, and downstream billing or fulfillment requests."
    },
    pageTitle: "Sales Control Room",
    pageSummary: "Quotes, sales orders, downstream billing requests, and partial-fulfillment visibility.",
    resources: [
      {
        id: "sales.quotes",
        description: "Customer-facing quotations with approval and discount governance.",
        businessPurpose: "Keep commercial offer creation explicit before demand is committed as an order."
      },
      {
        id: "sales.orders",
        description: "Sales order commitments and amendment-safe commercial demand records.",
        businessPurpose: "Own the commercial order truth without mutating inventory or accounting directly."
      },
      {
        id: "sales.billing-requests",
        description: "Billing requests emitted from governed sales demand state.",
        businessPurpose: "Request downstream financial action without bypassing accounting ownership."
      }
    ],
    actions: [
      { id: "sales.quotes.create", permission: "sales.quotes.write", label: "Create Sales Quote" },
      { id: "sales.orders.confirm", permission: "sales.orders.write", label: "Confirm Sales Order" },
      { id: "sales.billing.request", permission: "sales.billing.request", label: "Request Sales Billing" }
    ],
    jobs: [
      { id: "sales.projections.refresh", queue: "sales-projections" },
      { id: "sales.reconciliation.run", queue: "sales-reconciliation" }
    ],
    workflow: {
      id: "sales-order-lifecycle",
      description: "Draft, approve, confirm, bill, amend, return, and close sales demand records.",
      businessPurpose: "Keep quote-to-order and order-to-billing flows explicit and recoverable.",
      actors: ["sales-rep", "approver", "ops"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P1",
    id: "procurement-core",
    repoName: "gutu-plugin-procurement-core",
    packageDir: "procurement-core",
    displayName: "Procurement Core",
    description: "Source-to-procure commitments including requisitions, sourcing outcomes, purchase orders, receipt expectations, and supplier exception management.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "procurement_sourcing",
      subcategoryLabel: "Procurement & Sourcing"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "party-relationships-core",
      "product-catalog-core",
      "pricing-tax-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.procurement", "events.publish.procurement"],
    providesCapabilities: ["procurement.requisitions", "procurement.purchase-orders", "procurement.receipt-requests"],
    ownsData: ["procurement.requisitions", "procurement.sourcing-events", "procurement.purchase-orders", "procurement.receipt-requests"],
    publicCommands: ["procurement.requisitions.create", "procurement.purchase-orders.issue", "procurement.receipts.request"],
    publicQueries: ["procurement.commitment-summary", "procurement.source-award-summary"],
    publicEvents: ["procurement.requisition-created.v1", "procurement.purchase-order-issued.v1", "procurement.receipt-requested.v1"],
    route: "/admin/business/procurement",
    workspace: {
      id: "procurement",
      label: "Procurement",
      icon: "shopping-cart",
      description: "Sourcing, purchasing, supplier commitments, and receipt expectation control."
    },
    pageTitle: "Procurement Control Room",
    pageSummary: "Requisitions, purchase commitments, receipt expectations, and supplier-side exception posture.",
    resources: [
      {
        id: "procurement.requisitions",
        description: "Internal purchase needs and sourcing initiation records.",
        businessPurpose: "Capture demand for external supply without jumping directly to stock or accounting side effects."
      },
      {
        id: "procurement.purchase-orders",
        description: "Commercial commitments issued to suppliers.",
        businessPurpose: "Own the commercial source-to-procure commitment boundary."
      },
      {
        id: "procurement.receipt-requests",
        description: "Expected inbound receipt and receiving request records.",
        businessPurpose: "Request downstream warehouse handling without directly mutating stock truth."
      }
    ],
    actions: [
      { id: "procurement.requisitions.create", permission: "procurement.requisitions.write", label: "Create Requisition" },
      { id: "procurement.purchase-orders.issue", permission: "procurement.purchase-orders.write", label: "Issue Purchase Order" },
      { id: "procurement.receipts.request", permission: "procurement.receipt-requests.write", label: "Request Receipt" }
    ],
    jobs: [
      { id: "procurement.projections.refresh", queue: "procurement-projections" },
      { id: "procurement.reconciliation.run", queue: "procurement-reconciliation" }
    ],
    workflow: {
      id: "procurement-order-lifecycle",
      description: "Draft, approve, issue, receive, return, and close procurement commitments.",
      businessPurpose: "Keep source-to-procure commitments recoverable and visible through partial and exception-heavy flows.",
      actors: ["buyer", "approver", "receiving"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P1",
    id: "inventory-core",
    repoName: "gutu-plugin-inventory-core",
    packageDir: "inventory-core",
    displayName: "Inventory Core",
    description: "Warehouse truth, stock ledger state, reservation visibility, transfer execution, and physical reconciliation for inventory-controlled operations.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "inventory_warehouse",
      subcategoryLabel: "Inventory & Warehouse"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "product-catalog-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.inventory", "events.publish.inventory"],
    providesCapabilities: ["inventory.stock-ledger", "inventory.reservations", "inventory.transfers"],
    ownsData: ["inventory.stock-ledger", "inventory.reservations", "inventory.transfers", "inventory.reconciliation"],
    publicCommands: ["inventory.receipts.record", "inventory.reservations.allocate", "inventory.transfers.request"],
    publicQueries: ["inventory.stock-summary", "inventory.transfer-summary"],
    publicEvents: ["inventory.receipt-recorded.v1", "inventory.reservation-allocated.v1", "inventory.transfer-requested.v1"],
    route: "/admin/business/inventory",
    workspace: {
      id: "inventory",
      label: "Inventory",
      icon: "package",
      description: "Warehouse truth, reservations, transfers, and physical reconciliation."
    },
    pageTitle: "Inventory Control Room",
    pageSummary: "Stock truth, reservation state, transfers, and reconciliation queues for physical inventory operations.",
    resources: [
      {
        id: "inventory.stock-ledger",
        description: "Inventory-ledger records for on-hand, in-transit, and quality-segregated stock.",
        businessPurpose: "Keep physical truth authoritative inside the inventory boundary."
      },
      {
        id: "inventory.reservations",
        description: "Reservation and allocation records linked to downstream demand.",
        businessPurpose: "Expose promise and allocation state without letting upstream demand mutate stock balances directly."
      },
      {
        id: "inventory.transfers",
        description: "Internal transfer and movement records with discrepancy visibility.",
        businessPurpose: "Make multi-branch and multi-warehouse movement state durable and auditable."
      }
    ],
    actions: [
      { id: "inventory.receipts.record", permission: "inventory.stock-ledger.write", label: "Record Inventory Receipt" },
      { id: "inventory.reservations.allocate", permission: "inventory.reservations.write", label: "Allocate Reservation" },
      { id: "inventory.transfers.request", permission: "inventory.transfers.write", label: "Request Stock Transfer" }
    ],
    jobs: [
      { id: "inventory.projections.refresh", queue: "inventory-projections" },
      { id: "inventory.reconciliation.run", queue: "inventory-reconciliation" }
    ],
    workflow: {
      id: "inventory-movement-lifecycle",
      description: "Request, approve, execute, reconcile, and close stock movement state.",
      businessPurpose: "Keep physical movement, reservation, and reconciliation logic explicit through partial and discrepancy-heavy flows.",
      actors: ["warehouse", "approver", "controller"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P1",
    id: "projects-core",
    repoName: "gutu-plugin-projects-core",
    packageDir: "projects-core",
    displayName: "Projects Core",
    description: "Project plans, milestones, budget posture, execution visibility, and project-driven billing readiness for delivery-centric work.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "projects_delivery",
      subcategoryLabel: "Projects & Delivery"
    },
    dependsOn: ["auth-core", "org-tenant-core", "role-policy-core", "audit-core", "workflow-core", "traceability-core", "party-relationships-core"],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.projects", "events.publish.projects"],
    providesCapabilities: ["projects.projects", "projects.milestones", "projects.billing-requests"],
    ownsData: ["projects.projects", "projects.tasks", "projects.milestones", "projects.billing-requests"],
    publicCommands: ["projects.projects.create", "projects.milestones.complete", "projects.billing.request"],
    publicQueries: ["projects.delivery-summary", "projects.budget-summary"],
    publicEvents: ["projects.project-created.v1", "projects.milestone-completed.v1", "projects.billing-requested.v1"],
    route: "/admin/business/projects",
    workspace: {
      id: "projects",
      label: "Projects",
      icon: "kanban",
      description: "Project execution, milestones, and budget-aware delivery tracking."
    },
    pageTitle: "Projects Control Room",
    pageSummary: "Project execution truth, milestone posture, and billing readiness for delivery-led work.",
    resources: [
      {
        id: "projects.projects",
        description: "Project headers, budgets, and delivery lifecycle state.",
        businessPurpose: "Own execution truth for project-backed delivery without borrowing order or ledger ownership."
      },
      {
        id: "projects.milestones",
        description: "Milestones, progress gates, and completion state.",
        businessPurpose: "Track project execution and completion posture as a distinct operational truth."
      },
      {
        id: "projects.billing-requests",
        description: "Billing readiness and milestone-billing request records.",
        businessPurpose: "Request downstream invoicing without letting project execution mutate finance directly."
      }
    ],
    actions: [
      { id: "projects.projects.create", permission: "projects.projects.write", label: "Create Project" },
      { id: "projects.milestones.complete", permission: "projects.milestones.write", label: "Complete Milestone" },
      { id: "projects.billing.request", permission: "projects.billing.request", label: "Request Project Billing" }
    ],
    jobs: [
      { id: "projects.projections.refresh", queue: "projects-projections" },
      { id: "projects.reconciliation.run", queue: "projects-reconciliation" }
    ],
    workflow: {
      id: "project-delivery-lifecycle",
      description: "Create, approve, deliver, bill, amend, and close project execution records.",
      businessPurpose: "Keep project execution and billing readiness explicit across long-running delivery work.",
      actors: ["project-manager", "approver", "delivery-lead"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P1",
    id: "support-service-core",
    repoName: "gutu-plugin-support-service-core",
    packageDir: "support-service-core",
    displayName: "Support & Service Core",
    description: "Tickets, service execution posture, SLA state, entitlement-friendly routing, and service billing requests for customer support operations.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "support_service",
      subcategoryLabel: "Support & Service"
    },
    dependsOn: ["auth-core", "org-tenant-core", "role-policy-core", "audit-core", "workflow-core", "party-relationships-core", "traceability-core"],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.support", "events.publish.support"],
    providesCapabilities: ["support.tickets", "support.service-orders", "support.sla-state"],
    ownsData: ["support.tickets", "support.service-orders", "support.sla-state", "support.billing-requests"],
    publicCommands: ["support.tickets.create", "support.service-orders.dispatch", "support.billing.request"],
    publicQueries: ["support.queue-summary", "support.sla-summary"],
    publicEvents: ["support.ticket-created.v1", "support.service-dispatched.v1", "support.billing-requested.v1"],
    route: "/admin/business/support",
    workspace: {
      id: "support",
      label: "Support",
      icon: "lifebuoy",
      description: "Service desk, SLA posture, and downstream service execution tracking."
    },
    pageTitle: "Support Control Room",
    pageSummary: "Ticket truth, service execution posture, and SLA-aware follow-up across customer support flows.",
    resources: [
      {
        id: "support.tickets",
        description: "Ticket intake, triage, and resolution records.",
        businessPurpose: "Own customer issue truth without hiding execution state in email-only workflows."
      },
      {
        id: "support.service-orders",
        description: "Dispatchable service tasks and field or back-office execution records.",
        businessPurpose: "Track service execution separately from intake and billing boundaries."
      },
      {
        id: "support.sla-state",
        description: "SLA timers, breach posture, and escalation-friendly service state.",
        businessPurpose: "Make service timing and breach management explicit and auditable."
      }
    ],
    actions: [
      { id: "support.tickets.create", permission: "support.tickets.write", label: "Create Support Ticket" },
      { id: "support.service-orders.dispatch", permission: "support.service-orders.write", label: "Dispatch Service Order" },
      { id: "support.billing.request", permission: "support.billing.request", label: "Request Service Billing" }
    ],
    jobs: [
      { id: "support.projections.refresh", queue: "support-projections" },
      { id: "support.reconciliation.run", queue: "support-reconciliation" }
    ],
    workflow: {
      id: "support-service-lifecycle",
      description: "Open, assign, dispatch, resolve, bill, and close service operations.",
      businessPurpose: "Keep support intake, service execution, and SLA state coordinated without crossing ownership boundaries.",
      actors: ["agent", "dispatcher", "service-lead"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P1",
    id: "pos-core",
    repoName: "gutu-plugin-pos-core",
    packageDir: "pos-core",
    displayName: "POS Core",
    description: "Retail session, till state, receipt journals, cashier shifts, and offline-tolerant POS execution surfaces that settle into inventory and accounting through explicit handoff.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "pos_retail",
      subcategoryLabel: "POS & Retail"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "sales-core",
      "pricing-tax-core",
      "inventory-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.pos", "events.publish.pos"],
    providesCapabilities: ["pos.sessions", "pos.receipts", "pos.reconciliation"],
    ownsData: ["pos.sessions", "pos.receipts", "pos.cashier-shifts", "pos.reconciliation"],
    publicCommands: ["pos.sessions.open", "pos.receipts.record", "pos.sessions.close"],
    publicQueries: ["pos.shift-summary", "pos.sync-summary"],
    publicEvents: ["pos.session-opened.v1", "pos.receipt-recorded.v1", "pos.session-closed.v1"],
    route: "/admin/business/pos",
    workspace: {
      id: "pos",
      label: "POS",
      icon: "receipt",
      description: "Store sessions, cashier posture, and offline-tolerant receipt execution."
    },
    pageTitle: "POS Control Room",
    pageSummary: "Store sessions, receipt journals, cashier shift posture, and offline reconciliation visibility.",
    resources: [
      {
        id: "pos.sessions",
        description: "Store or register session lifecycle with cashier and shift metadata.",
        businessPurpose: "Own high-speed retail session truth without collapsing stock and finance into the till runtime."
      },
      {
        id: "pos.receipts",
        description: "Receipt and retail transaction journals for settled POS activity.",
        businessPurpose: "Persist front-counter execution safely before downstream settlement applies."
      },
      {
        id: "pos.reconciliation",
        description: "Offline replay, duplicate prevention, and cashier reconciliation queues.",
        businessPurpose: "Expose POS sync and closeout exceptions instead of hiding them in local device state."
      }
    ],
    actions: [
      { id: "pos.sessions.open", permission: "pos.sessions.write", label: "Open POS Session" },
      { id: "pos.receipts.record", permission: "pos.receipts.write", label: "Record POS Receipt" },
      { id: "pos.sessions.close", permission: "pos.sessions.write", label: "Close POS Session" }
    ],
    jobs: [
      { id: "pos.projections.refresh", queue: "pos-projections" },
      { id: "pos.reconciliation.run", queue: "pos-reconciliation" }
    ],
    workflow: {
      id: "pos-session-lifecycle",
      description: "Open, trade, reconcile, sync, and close POS sessions.",
      businessPurpose: "Keep store execution, cashier variance, and replay-safe settlement explicit.",
      actors: ["cashier", "store-manager", "controller"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P2",
    id: "manufacturing-core",
    repoName: "gutu-plugin-manufacturing-core",
    packageDir: "manufacturing-core",
    displayName: "Manufacturing Core",
    description: "BOM, routing, work order, production execution, WIP posture, and subcontract-friendly production truth with explicit inventory and accounting handoff.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "manufacturing_production",
      subcategoryLabel: "Manufacturing & Production"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "product-catalog-core",
      "inventory-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.manufacturing", "events.publish.manufacturing"],
    providesCapabilities: ["manufacturing.boms", "manufacturing.work-orders", "manufacturing.wip"],
    ownsData: ["manufacturing.boms", "manufacturing.work-orders", "manufacturing.operation-logs", "manufacturing.wip"],
    publicCommands: ["manufacturing.boms.publish", "manufacturing.work-orders.release", "manufacturing.outputs.record"],
    publicQueries: ["manufacturing.plan-summary", "manufacturing.variance-summary"],
    publicEvents: ["manufacturing.bom-published.v1", "manufacturing.work-order-released.v1", "manufacturing.output-recorded.v1"],
    route: "/admin/business/manufacturing",
    workspace: {
      id: "manufacturing",
      label: "Manufacturing",
      icon: "factory",
      description: "Production plans, work orders, and WIP-aware manufacturing execution."
    },
    pageTitle: "Manufacturing Control Room",
    pageSummary: "BOMs, work orders, WIP posture, and production variance visibility.",
    resources: [
      {
        id: "manufacturing.boms",
        description: "Bills of material and routing-ready manufacturing definitions.",
        businessPurpose: "Own what should be made and how it should be made."
      },
      {
        id: "manufacturing.work-orders",
        description: "Released work orders and operation execution records.",
        businessPurpose: "Track production execution without directly mutating stock or ledger truth."
      },
      {
        id: "manufacturing.wip",
        description: "WIP posture, variances, and production exception records.",
        businessPurpose: "Expose in-flight production state and variance handling as first-class operational truth."
      }
    ],
    actions: [
      { id: "manufacturing.boms.publish", permission: "manufacturing.boms.write", label: "Publish BOM" },
      { id: "manufacturing.work-orders.release", permission: "manufacturing.work-orders.write", label: "Release Work Order" },
      { id: "manufacturing.outputs.record", permission: "manufacturing.outputs.write", label: "Record Manufacturing Output" }
    ],
    jobs: [
      { id: "manufacturing.projections.refresh", queue: "manufacturing-projections" },
      { id: "manufacturing.reconciliation.run", queue: "manufacturing-reconciliation" }
    ],
    workflow: {
      id: "manufacturing-work-order-lifecycle",
      description: "Approve, release, execute, inspect, reconcile, and close production work.",
      businessPurpose: "Keep production planning and execution explicit through scrap, rework, and variance-heavy flows.",
      actors: ["planner", "supervisor", "operator"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P2",
    id: "quality-core",
    repoName: "gutu-plugin-quality-core",
    packageDir: "quality-core",
    displayName: "Quality Core",
    description: "Inspection, hold and release state, deviation handling, CAPA tracking, and quality-oriented exception truth across inbound, in-process, and outbound flows.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "quality_compliance",
      subcategoryLabel: "Quality & Compliance"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "inventory-core",
      "traceability-core",
      "product-catalog-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.quality", "events.publish.quality"],
    providesCapabilities: ["quality.inspections", "quality.nonconformance", "quality.capa"],
    ownsData: ["quality.inspections", "quality.nonconformance", "quality.capa", "quality.release-decisions"],
    publicCommands: ["quality.inspections.record", "quality.holds.apply", "quality.capa.open"],
    publicQueries: ["quality.release-summary", "quality.ncr-summary"],
    publicEvents: ["quality.inspection-recorded.v1", "quality.hold-applied.v1", "quality.capa-opened.v1"],
    route: "/admin/business/quality",
    workspace: {
      id: "quality",
      label: "Quality",
      icon: "shield-check",
      description: "Inspection, release, and corrective-action control for quality-managed flows."
    },
    pageTitle: "Quality Control Room",
    pageSummary: "Inspection posture, hold or release decisions, and CAPA visibility across operational flows.",
    resources: [
      {
        id: "quality.inspections",
        description: "Inspection execution and result records.",
        businessPurpose: "Own conformity decisions and test execution truth."
      },
      {
        id: "quality.nonconformance",
        description: "Deviation, nonconformance, and hold state records.",
        businessPurpose: "Surface quality exceptions explicitly instead of burying them in stock or production state."
      },
      {
        id: "quality.capa",
        description: "Corrective and preventive action records tied to quality events.",
        businessPurpose: "Track remediation and closure work as a first-class quality process."
      }
    ],
    actions: [
      { id: "quality.inspections.record", permission: "quality.inspections.write", label: "Record Inspection" },
      { id: "quality.holds.apply", permission: "quality.nonconformance.write", label: "Apply Quality Hold" },
      { id: "quality.capa.open", permission: "quality.capa.write", label: "Open CAPA" }
    ],
    jobs: [
      { id: "quality.projections.refresh", queue: "quality-projections" },
      { id: "quality.reconciliation.run", queue: "quality-reconciliation" }
    ],
    workflow: {
      id: "quality-release-lifecycle",
      description: "Inspect, hold, release, remediate, and close quality events.",
      businessPurpose: "Keep conformity decisions, deviations, and corrective action explicit.",
      actors: ["inspector", "quality-lead", "approver"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P2",
    id: "assets-core",
    repoName: "gutu-plugin-assets-core",
    packageDir: "assets-core",
    displayName: "Assets Core",
    description: "Fixed asset register, capitalization posture, custody, transfer, depreciation scheduling, and asset exception tracking with explicit accounting handoff.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "assets_lifecycle",
      subcategoryLabel: "Assets & Lifecycle"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "traceability-core",
      "accounting-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.assets", "events.publish.assets"],
    providesCapabilities: ["assets.register", "assets.depreciation", "assets.transfers"],
    ownsData: ["assets.register", "assets.depreciation", "assets.transfers", "assets.reconciliation"],
    publicCommands: ["assets.register.create", "assets.capitalization.request", "assets.transfers.issue"],
    publicQueries: ["assets.register-summary", "assets.custody-summary"],
    publicEvents: ["assets.register-created.v1", "assets.capitalization-requested.v1", "assets.transfer-issued.v1"],
    route: "/admin/business/assets",
    workspace: {
      id: "assets",
      label: "Assets",
      icon: "building-2",
      description: "Asset register, capitalization posture, and lifecycle control."
    },
    pageTitle: "Assets Control Room",
    pageSummary: "Asset register truth, custody posture, and capitalization or depreciation visibility.",
    resources: [
      {
        id: "assets.register",
        description: "Asset master and lifecycle records.",
        businessPurpose: "Own fixed-asset truth separately from stock, payroll, or project execution state."
      },
      {
        id: "assets.depreciation",
        description: "Depreciation schedule and book posture records.",
        businessPurpose: "Track lifecycle-driven financial posture without posting ledger truth directly."
      },
      {
        id: "assets.transfers",
        description: "Custody, branch transfer, and disposal-ready asset movement records.",
        businessPurpose: "Expose transfer and custody flows as first-class operational state."
      }
    ],
    actions: [
      { id: "assets.register.create", permission: "assets.register.write", label: "Create Asset Record" },
      { id: "assets.capitalization.request", permission: "assets.depreciation.write", label: "Request Asset Capitalization" },
      { id: "assets.transfers.issue", permission: "assets.transfers.write", label: "Issue Asset Transfer" }
    ],
    jobs: [
      { id: "assets.projections.refresh", queue: "assets-projections" },
      { id: "assets.reconciliation.run", queue: "assets-reconciliation" }
    ],
    workflow: {
      id: "asset-lifecycle",
      description: "Register, capitalize, assign, transfer, depreciate, and close asset records.",
      businessPurpose: "Keep asset lifecycle work explicit through transfer, impairment, and disposal flows.",
      actors: ["asset-manager", "approver", "controller"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P2",
    id: "hr-payroll-core",
    repoName: "gutu-plugin-hr-payroll-core",
    packageDir: "hr-payroll-core",
    displayName: "HR & Payroll Core",
    description: "Employee lifecycle, attendance posture, leave and claims, payroll processing, and payout exception truth with governed accounting handoff.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "hr_payroll",
      subcategoryLabel: "HR & Payroll"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "traceability-core",
      "accounting-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.hr", "events.publish.hr"],
    providesCapabilities: ["hr.employees", "hr.payroll-runs", "hr.leave-state"],
    ownsData: ["hr.employees", "hr.payroll-runs", "hr.leave-state", "hr.claims"],
    publicCommands: ["hr.employees.onboard", "hr.payroll.process", "hr.leave.approve"],
    publicQueries: ["hr.workforce-summary", "hr.payroll-summary"],
    publicEvents: ["hr.employee-onboarded.v1", "hr.payroll-processed.v1", "hr.leave-approved.v1"],
    route: "/admin/business/hr",
    workspace: {
      id: "hr",
      label: "HR & Payroll",
      icon: "users",
      description: "Workforce lifecycle, leave posture, and payroll operations."
    },
    pageTitle: "HR & Payroll Control Room",
    pageSummary: "Workforce truth, leave posture, payroll runs, and payout or correction visibility.",
    resources: [
      {
        id: "hr.employees",
        description: "Employee core and employment lifecycle records.",
        businessPurpose: "Own workforce truth separately from projects, assets, or accounting."
      },
      {
        id: "hr.payroll-runs",
        description: "Payroll calendars, run posture, and rerun-safe payroll records.",
        businessPurpose: "Track payroll truth and correction state before financial posting occurs downstream."
      },
      {
        id: "hr.leave-state",
        description: "Leave balances, approval posture, and exception records.",
        businessPurpose: "Expose attendance and leave state explicitly for workforce operations."
      }
    ],
    actions: [
      { id: "hr.employees.onboard", permission: "hr.employees.write", label: "Onboard Employee" },
      { id: "hr.payroll.process", permission: "hr.payroll.write", label: "Process Payroll Run" },
      { id: "hr.leave.approve", permission: "hr.leave.write", label: "Approve Leave" }
    ],
    jobs: [
      { id: "hr.projections.refresh", queue: "hr-projections" },
      { id: "hr.reconciliation.run", queue: "hr-reconciliation" }
    ],
    workflow: {
      id: "hr-payroll-lifecycle",
      description: "Onboard, approve, process, correct, and close HR and payroll work.",
      businessPurpose: "Keep payroll and workforce lifecycle state explicit through retro, rerun, and payout-exception scenarios.",
      actors: ["hr-operator", "approver", "payroll-lead"]
    },
    packType: "starter-pack"
  }),
  businessSpec({
    stage: "P3",
    id: "contracts-core",
    repoName: "gutu-plugin-contracts-core",
    packageDir: "contracts-core",
    displayName: "Contracts Core",
    description: "Contract register, commercial or service entitlements, renewal posture, and governed billing schedule truth for long-running business agreements.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "sales_commerce",
      subcategoryLabel: "Sales & Commerce"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "party-relationships-core",
      "sales-core",
      "support-service-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.contracts", "events.publish.contracts"],
    providesCapabilities: ["contracts.registry", "contracts.entitlements", "contracts.billing-schedules"],
    ownsData: ["contracts.registry", "contracts.entitlements", "contracts.billing-schedules", "contracts.renewals"],
    publicCommands: ["contracts.registry.create", "contracts.entitlements.activate", "contracts.billing-schedules.publish"],
    publicQueries: ["contracts.registry-summary", "contracts.entitlement-summary"],
    publicEvents: ["contracts.registered.v1", "contracts.entitlement-activated.v1", "contracts.billing-schedule-published.v1"],
    route: "/admin/business/contracts",
    workspace: {
      id: "contracts",
      label: "Contracts",
      icon: "file-signature",
      description: "Agreement lifecycle, entitlements, and long-running billing posture."
    },
    pageTitle: "Contracts Control Room",
    pageSummary: "Contract truth, entitlement posture, renewal timing, and governed billing schedule requests.",
    resources: [
      {
        id: "contracts.registry",
        description: "Contract headers, commercial terms, and amendment-safe lifecycle records.",
        businessPurpose: "Own agreement truth without burying long-running commitments inside orders or tickets."
      },
      {
        id: "contracts.entitlements",
        description: "Entitlement and coverage records tied to live agreements.",
        businessPurpose: "Make service and commercial rights explicit before downstream execution occurs."
      },
      {
        id: "contracts.billing-schedules",
        description: "Recurring and milestone billing schedule records derived from governed contracts.",
        businessPurpose: "Request downstream financial work without letting agreements mutate accounting truth directly."
      }
    ],
    actions: [
      { id: "contracts.registry.create", permission: "contracts.registry.write", label: "Create Contract" },
      { id: "contracts.entitlements.activate", permission: "contracts.entitlements.write", label: "Activate Entitlement" },
      { id: "contracts.billing-schedules.publish", permission: "contracts.billing-schedules.write", label: "Publish Billing Schedule" }
    ],
    jobs: [
      { id: "contracts.projections.refresh", queue: "contracts-projections" },
      { id: "contracts.reconciliation.run", queue: "contracts-reconciliation" }
    ],
    workflow: {
      id: "contracts-lifecycle",
      description: "Draft, approve, activate, renew, amend, bill, and close long-running agreements.",
      businessPurpose: "Keep agreement and entitlement state explicit across renewals, amendments, and downstream billing.",
      actors: ["commercial-owner", "approver", "controller"]
    },
    packType: "addon-pack"
  }),
  businessSpec({
    stage: "P3",
    id: "subscriptions-core",
    repoName: "gutu-plugin-subscriptions-core",
    packageDir: "subscriptions-core",
    displayName: "Subscriptions Core",
    description: "Subscription plans, billing cycles, renewals, pauses, and service-period truth for recurring commercial models.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "sales_commerce",
      subcategoryLabel: "Sales & Commerce"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "party-relationships-core",
      "pricing-tax-core",
      "contracts-core",
      "accounting-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.subscriptions", "events.publish.subscriptions"],
    providesCapabilities: ["subscriptions.plans", "subscriptions.cycles", "subscriptions.renewals"],
    ownsData: ["subscriptions.plans", "subscriptions.cycles", "subscriptions.renewals", "subscriptions.exceptions"],
    publicCommands: ["subscriptions.plans.publish", "subscriptions.cycles.generate", "subscriptions.renewals.process"],
    publicQueries: ["subscriptions.plan-summary", "subscriptions.renewal-summary"],
    publicEvents: ["subscriptions.plan-published.v1", "subscriptions.cycle-generated.v1", "subscriptions.renewal-processed.v1"],
    route: "/admin/business/subscriptions",
    workspace: {
      id: "subscriptions",
      label: "Subscriptions",
      icon: "repeat",
      description: "Recurring commercial plans, cycles, and renewal operations."
    },
    pageTitle: "Subscriptions Control Room",
    pageSummary: "Plan truth, recurring billing cycles, renewal posture, and subscription-side exceptions.",
    resources: [
      {
        id: "subscriptions.plans",
        description: "Subscription plan definitions and effective-date policy records.",
        businessPurpose: "Own recurring commercial plan truth outside of order-only flows."
      },
      {
        id: "subscriptions.cycles",
        description: "Generated billing or service cycles for active subscriptions.",
        businessPurpose: "Expose recurring commercial obligations explicitly before downstream billing."
      },
      {
        id: "subscriptions.renewals",
        description: "Renewal, pause, resume, and expiry handling records.",
        businessPurpose: "Keep renewal state visible and repairable instead of implicit."
      }
    ],
    actions: [
      { id: "subscriptions.plans.publish", permission: "subscriptions.plans.write", label: "Publish Subscription Plan" },
      { id: "subscriptions.cycles.generate", permission: "subscriptions.cycles.write", label: "Generate Billing Cycle" },
      { id: "subscriptions.renewals.process", permission: "subscriptions.renewals.write", label: "Process Renewal" }
    ],
    jobs: [
      { id: "subscriptions.projections.refresh", queue: "subscriptions-projections" },
      { id: "subscriptions.reconciliation.run", queue: "subscriptions-reconciliation" }
    ],
    workflow: {
      id: "subscriptions-lifecycle",
      description: "Publish plans, activate subscriptions, generate cycles, renew, pause, and close recurring agreements.",
      businessPurpose: "Keep recurring commercial operations explicit through renewals, pauses, and billing handoff.",
      actors: ["revenue-ops", "approver", "controller"]
    },
    packType: "addon-pack"
  }),
  businessSpec({
    stage: "P3",
    id: "business-portals-core",
    repoName: "gutu-plugin-business-portals-core",
    packageDir: "business-portals-core",
    displayName: "Business Portals Core",
    description: "Customer, vendor, and employee self-service portal workspaces that project governed business records without taking ownership away from source plugins.",
    defaultCategory: {
      id: "content_experience",
      label: "Content & Experience",
      subcategoryId: "portal_experience",
      subcategoryLabel: "Portal Experience"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "workflow-core",
      "portal-core",
      "party-relationships-core",
      "sales-core",
      "support-service-core",
      "contracts-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.portals", "events.publish.portals"],
    providesCapabilities: ["portals.customer-workspaces", "portals.vendor-workspaces", "portals.employee-workspaces"],
    ownsData: ["portals.customer-workspaces", "portals.vendor-workspaces", "portals.employee-workspaces", "portals.portal-actions"],
    publicCommands: ["portals.customer-workspaces.publish", "portals.portal-actions.capture", "portals.employee-workspaces.publish"],
    publicQueries: ["portals.workspace-summary", "portals.self-service-summary"],
    publicEvents: ["portals.workspace-published.v1", "portals.portal-action-captured.v1", "portals.self-service-updated.v1"],
    route: "/admin/business/portals",
    workspace: {
      id: "business-portals",
      label: "Business Portals",
      icon: "monitor-smartphone",
      description: "Self-service workspaces for customers, vendors, and employees."
    },
    pageTitle: "Business Portals Control Room",
    pageSummary: "Governed self-service workspaces, projected business data, and explicit portal-driven requests.",
    resources: [
      {
        id: "portals.customer-workspaces",
        description: "Customer-facing portal workspace definitions and projection rules.",
        businessPurpose: "Expose customer self-service without making the portal the source of business truth."
      },
      {
        id: "portals.vendor-workspaces",
        description: "Vendor and supplier portal workspace definitions.",
        businessPurpose: "Support supplier-facing workflows while preserving procurement ownership."
      },
      {
        id: "portals.employee-workspaces",
        description: "Employee self-service portal workspace definitions and actions.",
        businessPurpose: "Project HR-safe self-service experiences without bypassing workforce governance."
      }
    ],
    actions: [
      { id: "portals.customer-workspaces.publish", permission: "portals.customer-workspaces.write", label: "Publish Customer Portal" },
      { id: "portals.portal-actions.capture", permission: "portals.portal-actions.write", label: "Capture Portal Action" },
      { id: "portals.employee-workspaces.publish", permission: "portals.employee-workspaces.write", label: "Publish Employee Portal" }
    ],
    jobs: [
      { id: "portals.projections.refresh", queue: "portals-projections" },
      { id: "portals.reconciliation.run", queue: "portals-reconciliation" }
    ],
    workflow: {
      id: "business-portals-lifecycle",
      description: "Publish portal projections, capture self-service actions, route requests, and reconcile projected state.",
      businessPurpose: "Keep portal activity explicit and governable without leaking ownership away from source plugins.",
      actors: ["portal-admin", "ops", "approver"]
    },
    packType: "addon-pack"
  }),
  businessSpec({
    stage: "P3",
    id: "field-service-core",
    repoName: "gutu-plugin-field-service-core",
    packageDir: "field-service-core",
    displayName: "Field Service Core",
    description: "Dispatch, visit execution, technician posture, and spare-parts request orchestration for field service and on-site delivery operations.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "support_service",
      subcategoryLabel: "Support & Service"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "support-service-core",
      "inventory-core",
      "party-relationships-core",
      "contracts-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.field-service", "events.publish.field-service"],
    providesCapabilities: ["field-service.dispatches", "field-service.visits", "field-service.parts-requests"],
    ownsData: ["field-service.dispatches", "field-service.visits", "field-service.parts-requests", "field-service.reconciliation"],
    publicCommands: ["field-service.dispatches.schedule", "field-service.visits.start", "field-service.parts.request"],
    publicQueries: ["field-service.dispatch-summary", "field-service.visit-summary"],
    publicEvents: ["field-service.dispatch-scheduled.v1", "field-service.visit-started.v1", "field-service.parts-requested.v1"],
    route: "/admin/business/field-service",
    workspace: {
      id: "field-service",
      label: "Field Service",
      icon: "truck",
      description: "Dispatch, on-site execution, and spare-parts coordination."
    },
    pageTitle: "Field Service Control Room",
    pageSummary: "Dispatch truth, visit posture, technician actions, and spare-parts requests for field operations.",
    resources: [
      {
        id: "field-service.dispatches",
        description: "Dispatch and technician assignment records.",
        businessPurpose: "Own dispatch truth separately from tickets, stock, and billing state."
      },
      {
        id: "field-service.visits",
        description: "On-site visit execution and completion records.",
        businessPurpose: "Track field execution as a first-class operational boundary."
      },
      {
        id: "field-service.parts-requests",
        description: "Spare-parts and material requests linked to field work.",
        businessPurpose: "Request downstream inventory handling without mutating stock truth directly."
      }
    ],
    actions: [
      { id: "field-service.dispatches.schedule", permission: "field-service.dispatches.write", label: "Schedule Dispatch" },
      { id: "field-service.visits.start", permission: "field-service.visits.write", label: "Start Field Visit" },
      { id: "field-service.parts.request", permission: "field-service.parts-requests.write", label: "Request Spare Parts" }
    ],
    jobs: [
      { id: "field-service.projections.refresh", queue: "field-service-projections" },
      { id: "field-service.reconciliation.run", queue: "field-service-reconciliation" }
    ],
    workflow: {
      id: "field-service-lifecycle",
      description: "Schedule, dispatch, execute, bill, and reconcile on-site service operations.",
      businessPurpose: "Keep technician execution, spare-parts requests, and service billing follow-up explicit.",
      actors: ["dispatcher", "technician", "service-lead"]
    },
    packType: "addon-pack"
  }),
  businessSpec({
    stage: "P3",
    id: "maintenance-cmms-core",
    repoName: "gutu-plugin-maintenance-cmms-core",
    packageDir: "maintenance-cmms-core",
    displayName: "Maintenance & CMMS Core",
    description: "Preventive maintenance plans, asset work orders, inspections, and downtime-aware service coordination for asset-intensive operations.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "assets_lifecycle",
      subcategoryLabel: "Assets & Lifecycle"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "assets-core",
      "inventory-core",
      "support-service-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.maintenance", "events.publish.maintenance"],
    providesCapabilities: ["maintenance.plans", "maintenance.work-orders", "maintenance.asset-health"],
    ownsData: ["maintenance.plans", "maintenance.work-orders", "maintenance.asset-health", "maintenance.downtime-events"],
    publicCommands: ["maintenance.plans.publish", "maintenance.work-orders.release", "maintenance.asset-health.record"],
    publicQueries: ["maintenance.plan-summary", "maintenance.downtime-summary"],
    publicEvents: ["maintenance.plan-published.v1", "maintenance.work-order-released.v1", "maintenance.asset-health-recorded.v1"],
    route: "/admin/business/maintenance",
    workspace: {
      id: "maintenance",
      label: "Maintenance",
      icon: "wrench",
      description: "Preventive maintenance, asset work orders, and downtime tracking."
    },
    pageTitle: "Maintenance Control Room",
    pageSummary: "Maintenance plans, asset work orders, asset health posture, and downtime-aware follow-up.",
    resources: [
      {
        id: "maintenance.plans",
        description: "Preventive and corrective maintenance planning records.",
        businessPurpose: "Own maintenance planning separately from assets, inventory, and support truth."
      },
      {
        id: "maintenance.work-orders",
        description: "Maintenance work orders, execution posture, and follow-up records.",
        businessPurpose: "Track maintenance execution explicitly across preventive and corrective work."
      },
      {
        id: "maintenance.asset-health",
        description: "Condition, downtime, and serviceability records linked to maintained assets.",
        businessPurpose: "Make asset-health posture explicit for planning and operational repair."
      }
    ],
    actions: [
      { id: "maintenance.plans.publish", permission: "maintenance.plans.write", label: "Publish Maintenance Plan" },
      { id: "maintenance.work-orders.release", permission: "maintenance.work-orders.write", label: "Release Maintenance Work Order" },
      { id: "maintenance.asset-health.record", permission: "maintenance.asset-health.write", label: "Record Asset Health" }
    ],
    jobs: [
      { id: "maintenance.projections.refresh", queue: "maintenance-projections" },
      { id: "maintenance.reconciliation.run", queue: "maintenance-reconciliation" }
    ],
    workflow: {
      id: "maintenance-lifecycle",
      description: "Plan, release, inspect, repair, and close maintenance work.",
      businessPurpose: "Keep maintenance work and downtime-aware repair cycles explicit and governable.",
      actors: ["planner", "maintenance-lead", "technician"]
    },
    packType: "addon-pack"
  }),
  businessSpec({
    stage: "P3",
    id: "treasury-core",
    repoName: "gutu-plugin-treasury-core",
    packageDir: "treasury-core",
    displayName: "Treasury Core",
    description: "Cash-position tracking, banking operations, liquidity forecasting, and treasury-side reconciliation for finance teams.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "accounting_finance",
      subcategoryLabel: "Accounting & Finance"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "accounting-core",
      "payments-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.treasury", "events.publish.treasury"],
    providesCapabilities: ["treasury.cash-position", "treasury.banking", "treasury.forecasts"],
    ownsData: ["treasury.cash-position", "treasury.banking", "treasury.forecasts", "treasury.reconciliation"],
    publicCommands: ["treasury.cash-position.capture", "treasury.banking.publish", "treasury.forecasts.refresh"],
    publicQueries: ["treasury.cash-summary", "treasury.forecast-summary"],
    publicEvents: ["treasury.cash-position-captured.v1", "treasury.banking-published.v1", "treasury.forecast-refreshed.v1"],
    route: "/admin/business/treasury",
    workspace: {
      id: "treasury",
      label: "Treasury",
      icon: "landmark",
      description: "Cash posture, liquidity, and banking operations."
    },
    pageTitle: "Treasury Control Room",
    pageSummary: "Cash-position truth, banking posture, forecast refreshes, and treasury-side reconciliation visibility.",
    resources: [
      {
        id: "treasury.cash-position",
        description: "Cash and liquidity position records across accounts and entities.",
        businessPurpose: "Own treasury-side cash posture without mutating ledger truth directly."
      },
      {
        id: "treasury.banking",
        description: "Banking relationship and treasury instruction records.",
        businessPurpose: "Coordinate treasury operations as a distinct finance boundary."
      },
      {
        id: "treasury.forecasts",
        description: "Cash forecast and liquidity planning projections.",
        businessPurpose: "Expose treasury planning and reconciliation posture explicitly."
      }
    ],
    actions: [
      { id: "treasury.cash-position.capture", permission: "treasury.cash-position.write", label: "Capture Cash Position" },
      { id: "treasury.banking.publish", permission: "treasury.banking.write", label: "Publish Banking Instruction" },
      { id: "treasury.forecasts.refresh", permission: "treasury.forecasts.write", label: "Refresh Treasury Forecast" }
    ],
    jobs: [
      { id: "treasury.projections.refresh", queue: "treasury-projections" },
      { id: "treasury.reconciliation.run", queue: "treasury-reconciliation" }
    ],
    workflow: {
      id: "treasury-lifecycle",
      description: "Capture cash posture, publish treasury instructions, reconcile, and close treasury work.",
      businessPurpose: "Keep liquidity planning, bank coordination, and treasury exceptions explicit.",
      actors: ["treasurer", "controller", "approver"]
    },
    packType: "addon-pack"
  }),
  businessSpec({
    stage: "P3",
    id: "e-invoicing-core",
    repoName: "gutu-plugin-e-invoicing-core",
    packageDir: "e-invoicing-core",
    displayName: "E-Invoicing Core",
    description: "Jurisdiction-aware electronic invoicing, submission posture, and clearance or compliance reconciliation for statutory finance flows.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "accounting_finance",
      subcategoryLabel: "Accounting & Finance"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "accounting-core",
      "pricing-tax-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.e-invoicing", "events.publish.e-invoicing"],
    providesCapabilities: ["e-invoicing.documents", "e-invoicing.submissions", "e-invoicing.reconciliation"],
    ownsData: ["e-invoicing.documents", "e-invoicing.submissions", "e-invoicing.reconciliation", "e-invoicing.errors"],
    publicCommands: ["e-invoicing.documents.prepare", "e-invoicing.submissions.submit", "e-invoicing.reconciliation.run"],
    publicQueries: ["e-invoicing.submission-summary", "e-invoicing.error-summary"],
    publicEvents: ["e-invoicing.document-prepared.v1", "e-invoicing.submission-submitted.v1", "e-invoicing.reconciliation-completed.v1"],
    route: "/admin/business/e-invoicing",
    workspace: {
      id: "e-invoicing",
      label: "E-Invoicing",
      icon: "receipt-text",
      description: "Jurisdiction-aware invoice clearance and submission posture."
    },
    pageTitle: "E-Invoicing Control Room",
    pageSummary: "Electronic invoice preparation, submission posture, and compliance-side reconciliation visibility.",
    resources: [
      {
        id: "e-invoicing.documents",
        description: "Prepared electronic invoice payloads and jurisdiction-specific document metadata.",
        businessPurpose: "Own statutory e-invoice preparation without moving financial ownership away from accounting."
      },
      {
        id: "e-invoicing.submissions",
        description: "Submission status, clearance posture, and external reference records.",
        businessPurpose: "Make compliance submission progress explicit and recoverable."
      },
      {
        id: "e-invoicing.reconciliation",
        description: "Mismatch and statutory follow-up queues.",
        businessPurpose: "Surface e-invoicing drift, rejection, and repair work explicitly."
      }
    ],
    actions: [
      { id: "e-invoicing.documents.prepare", permission: "e-invoicing.documents.write", label: "Prepare Electronic Invoice" },
      { id: "e-invoicing.submissions.submit", permission: "e-invoicing.submissions.write", label: "Submit Electronic Invoice" },
      { id: "e-invoicing.reconciliation.run", permission: "e-invoicing.reconciliation.write", label: "Run E-Invoicing Reconciliation" }
    ],
    jobs: [
      { id: "e-invoicing.projections.refresh", queue: "e-invoicing-projections" },
      { id: "e-invoicing.reconciliation.run", queue: "e-invoicing-reconciliation" }
    ],
    workflow: {
      id: "e-invoicing-lifecycle",
      description: "Prepare, submit, clear, reject, repair, and close electronic invoice flows.",
      businessPurpose: "Keep statutory submission posture explicit across acceptance, rejection, and replay scenarios.",
      actors: ["finance-operator", "controller", "approver"]
    },
    packType: "addon-pack"
  }),
  businessSpec({
    stage: "P3",
    id: "analytics-bi-core",
    repoName: "gutu-plugin-analytics-bi-core",
    packageDir: "analytics-bi-core",
    displayName: "Analytics & BI Core",
    description: "Business datasets, KPI models, warehouse-sync posture, and governed analytics projections across the full operating suite.",
    defaultCategory: {
      id: "business",
      label: "Business",
      subcategoryId: "analytics_reporting",
      subcategoryLabel: "Analytics & Reporting"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "dashboard-core",
      "traceability-core",
      "accounting-core",
      "sales-core",
      "procurement-core",
      "inventory-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.analytics", "events.publish.analytics"],
    providesCapabilities: ["analytics.datasets", "analytics.kpis", "analytics.warehouse-sync"],
    ownsData: ["analytics.datasets", "analytics.kpis", "analytics.warehouse-sync", "analytics.exceptions"],
    publicCommands: ["analytics.datasets.publish", "analytics.kpis.refresh", "analytics.warehouse-sync.enqueue"],
    publicQueries: ["analytics.dataset-summary", "analytics.kpi-summary"],
    publicEvents: ["analytics.dataset-published.v1", "analytics.kpi-refreshed.v1", "analytics.warehouse-sync-enqueued.v1"],
    route: "/admin/business/analytics",
    workspace: {
      id: "analytics",
      label: "Analytics & BI",
      icon: "chart-column",
      description: "Business datasets, KPIs, and warehouse sync posture."
    },
    pageTitle: "Analytics & BI Control Room",
    pageSummary: "Governed business datasets, KPI posture, and warehouse-sync exception visibility.",
    resources: [
      {
        id: "analytics.datasets",
        description: "Dataset definitions, governed exports, and projection-ready analytics records.",
        businessPurpose: "Own business-facing datasets without coupling reporting logic into transactional domains."
      },
      {
        id: "analytics.kpis",
        description: "KPI definitions, refresh posture, and threshold records.",
        businessPurpose: "Keep executive and operational metrics explicit, versioned, and reviewable."
      },
      {
        id: "analytics.warehouse-sync",
        description: "Warehouse or BI sync queues and exception records.",
        businessPurpose: "Expose heavy analytics sync work and repair state explicitly."
      }
    ],
    actions: [
      { id: "analytics.datasets.publish", permission: "analytics.datasets.write", label: "Publish Analytics Dataset" },
      { id: "analytics.kpis.refresh", permission: "analytics.kpis.write", label: "Refresh KPI Definitions" },
      { id: "analytics.warehouse-sync.enqueue", permission: "analytics.warehouse-sync.write", label: "Enqueue Warehouse Sync" }
    ],
    jobs: [
      { id: "analytics.projections.refresh", queue: "analytics-projections" },
      { id: "analytics.reconciliation.run", queue: "analytics-reconciliation" }
    ],
    workflow: {
      id: "analytics-bi-lifecycle",
      description: "Publish datasets, refresh KPIs, sync analytics surfaces, and reconcile reporting drift.",
      businessPurpose: "Keep analytics projection and sync work explicit across warehouse and dashboard surfaces.",
      actors: ["analyst", "revops", "controller"]
    },
    packType: "addon-pack"
  }),
  businessSpec({
    stage: "P3",
    id: "ai-assist-core",
    repoName: "gutu-plugin-ai-assist-core",
    packageDir: "ai-assist-core",
    displayName: "AI Assist Core",
    description: "Guardrailed AI summaries, triage suggestions, anomaly detection, and operator-assist workflows for business teams.",
    defaultCategory: {
      id: "ai_automation",
      label: "AI & Automation",
      subcategoryId: "operating_models",
      subcategoryLabel: "Operating Models"
    },
    dependsOn: [
      "auth-core",
      "org-tenant-core",
      "role-policy-core",
      "audit-core",
      "workflow-core",
      "ai-core",
      "ai-rag",
      "crm-core",
      "support-service-core",
      "sales-core",
      "traceability-core"
    ],
    requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.ai-assist", "events.publish.ai-assist"],
    providesCapabilities: ["ai-assist.summaries", "ai-assist.triage", "ai-assist.anomalies"],
    ownsData: ["ai-assist.summaries", "ai-assist.triage", "ai-assist.anomalies", "ai-assist.feedback"],
    publicCommands: ["ai-assist.summaries.generate", "ai-assist.triage.route", "ai-assist.anomalies.review"],
    publicQueries: ["ai-assist.summary-log", "ai-assist.anomaly-summary"],
    publicEvents: ["ai-assist.summary-generated.v1", "ai-assist.triage-routed.v1", "ai-assist.anomaly-reviewed.v1"],
    route: "/admin/business/ai-assist",
    workspace: {
      id: "ai-assist",
      label: "AI Assist",
      icon: "sparkles",
      description: "Guardrailed AI assistance for commercial, support, and operations work."
    },
    pageTitle: "AI Assist Control Room",
    pageSummary: "AI-generated summaries, routing suggestions, anomaly posture, and operator-review visibility.",
    resources: [
      {
        id: "ai-assist.summaries",
        description: "Generated summaries and operator-reviewed assist artifacts.",
        businessPurpose: "Provide bounded AI assistance without making AI the source of business truth."
      },
      {
        id: "ai-assist.triage",
        description: "AI-generated triage and routing suggestions for business workflows.",
        businessPurpose: "Surface assistive routing suggestions that operators can review and accept."
      },
      {
        id: "ai-assist.anomalies",
        description: "Anomaly detection records and operator-review state.",
        businessPurpose: "Track suspicious operational patterns and approval-gated follow-up explicitly."
      }
    ],
    actions: [
      { id: "ai-assist.summaries.generate", permission: "ai-assist.summaries.write", label: "Generate Summary" },
      { id: "ai-assist.triage.route", permission: "ai-assist.triage.write", label: "Route Triage Suggestion" },
      { id: "ai-assist.anomalies.review", permission: "ai-assist.anomalies.write", label: "Review AI Anomaly" }
    ],
    jobs: [
      { id: "ai-assist.projections.refresh", queue: "ai-assist-projections" },
      { id: "ai-assist.reconciliation.run", queue: "ai-assist-reconciliation" }
    ],
    workflow: {
      id: "ai-assist-lifecycle",
      description: "Generate, review, accept, reject, and reconcile bounded AI assistance across business teams.",
      businessPurpose: "Keep AI-generated assistance reviewable, reversible, and explicit before downstream action occurs.",
      actors: ["operator", "reviewer", "approver"]
    },
    packType: "addon-pack"
  })
].map(applyBusinessParity);

export const businessPackCatalogSpec = {
  repoName: "gutu-business-packs",
  displayName: "Gutu Business Packs",
  description: "First-party localization and sector packs that turn the Business OS scaffold into installable, channel-governed business templates."
};

const packDefaultCategory = {
  id: "content_experience",
  label: "Content & Experience",
  subcategoryId: "templates",
  subcategoryLabel: "Templates"
};

function businessPackSpec(input) {
  return {
    version: "0.1.0",
    publisher: "gutula",
    platformVersion: ">=0.1.0 <1.0.0",
    compatibilityChannel: "next",
    trustTier: "internal-signed",
    defaultCategory: packDefaultCategory,
    domainGroup: "Business Packs",
    ...input
  };
}

export const businessPackSpecs = [
  businessPackSpec({
    id: "localization-global-base",
    displayName: "Localization Global Base",
    description: "Baseline numbering, currency, translation, and common fiscal-policy overlays shared by localized business deployments.",
    kind: "localization-pack",
    packType: "localization-pack",
    group: "Localization",
    environmentScope: "localization",
    pluginConstraints: {
      "party-relationships-core": "^0.1.0",
      "product-catalog-core": "^0.1.0",
      "pricing-tax-core": "^0.1.0",
      "traceability-core": "^0.1.0",
      "accounting-core": "^0.1.0"
    },
    requiredPlugins: ["party-relationships-core", "product-catalog-core", "pricing-tax-core", "traceability-core", "accounting-core"],
    dependsOnPacks: [],
    settingDefaults: {
      numberingSeries: "GLOBAL-{{company}}-{{fiscalYear}}",
      baseCurrencyPolicy: "multi-currency",
      translationProfile: "global-default",
      taxRoundingMode: "commercial"
    },
    workflowTemplate: {
      workflowId: "global-localization-governance",
      actors: ["localization-admin", "finance", "approver"]
    },
    dashboardTemplate: {
      id: "global-localization-overview",
      title: "Global Localization Overview",
      widgets: ["currencies", "translations", "tax-rules", "numbering-series"]
    }
  }),
  businessPackSpec({
    id: "localization-india",
    displayName: "Localization India",
    description: "India-focused GST, withholding, statutory numbering, and e-invoicing overlays for Gutu business deployments.",
    kind: "localization-pack",
    packType: "localization-pack",
    group: "Localization",
    environmentScope: "localization",
    pluginConstraints: {
      "pricing-tax-core": "^0.1.0",
      "accounting-core": "^0.1.0",
      "e-invoicing-core": "^0.1.0",
      "hr-payroll-core": "^0.1.0"
    },
    requiredPlugins: ["pricing-tax-core", "accounting-core", "e-invoicing-core", "hr-payroll-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      numberingSeries: "IN-{{company}}-{{fiscalYear}}",
      taxRegime: "gst",
      withholdingMode: "tds-tcs",
      statutoryLanguage: "en-IN"
    },
    workflowTemplate: {
      workflowId: "india-localization-governance",
      actors: ["localization-admin", "finance", "compliance"]
    },
    dashboardTemplate: {
      id: "india-localization-overview",
      title: "India Localization Overview",
      widgets: ["gst-registrations", "withholding-rules", "e-invoicing", "statutory-reports"]
    }
  }),
  businessPackSpec({
    id: "localization-united-states",
    displayName: "Localization United States",
    description: "United States fiscal, withholding, sales-tax, and payroll-oriented localization overlays for Gutu business deployments.",
    kind: "localization-pack",
    packType: "localization-pack",
    group: "Localization",
    environmentScope: "localization",
    pluginConstraints: {
      "pricing-tax-core": "^0.1.0",
      "accounting-core": "^0.1.0",
      "hr-payroll-core": "^0.1.0",
      "treasury-core": "^0.1.0"
    },
    requiredPlugins: ["pricing-tax-core", "accounting-core", "hr-payroll-core", "treasury-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      numberingSeries: "US-{{company}}-{{fiscalYear}}",
      taxRegime: "sales-tax",
      withholdingMode: "federal-state",
      statutoryLanguage: "en-US"
    },
    workflowTemplate: {
      workflowId: "us-localization-governance",
      actors: ["localization-admin", "finance", "controller"]
    },
    dashboardTemplate: {
      id: "us-localization-overview",
      title: "US Localization Overview",
      widgets: ["sales-tax", "banking", "payroll-rules", "statutory-exports"]
    }
  }),
  businessPackSpec({
    id: "sector-manufacturing",
    displayName: "Sector Pack Manufacturing",
    description: "Discrete manufacturing overlays for production, quality, inventory, and accounting-heavy operational flows.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "accounting-core": "^0.1.0",
      "procurement-core": "^0.1.0",
      "sales-core": "^0.1.0",
      "inventory-core": "^0.1.0",
      "manufacturing-core": "^0.1.0",
      "quality-core": "^0.1.0",
      "assets-core": "^0.1.0"
    },
    requiredPlugins: ["accounting-core", "procurement-core", "sales-core", "inventory-core", "manufacturing-core", "quality-core", "assets-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "manufacturing",
      qualityMode: "mandatory-gates",
      stockValuation: "fifo",
      mrpPolicy: "make-and-buy"
    },
    workflowTemplate: {
      workflowId: "manufacturing-sector-governance",
      actors: ["planner", "quality-lead", "controller"]
    },
    dashboardTemplate: {
      id: "manufacturing-sector-overview",
      title: "Manufacturing Sector Overview",
      widgets: ["wip", "scrap", "quality-holds", "production-variance"]
    }
  }),
  businessPackSpec({
    id: "sector-trading-distribution",
    displayName: "Sector Pack Trading & Distribution",
    description: "Trading and distribution overlays for sourcing, multi-warehouse fulfillment, pricing, and channel operations.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "accounting-core": "^0.1.0",
      "procurement-core": "^0.1.0",
      "sales-core": "^0.1.0",
      "inventory-core": "^0.1.0",
      "crm-core": "^0.1.0"
    },
    requiredPlugins: ["accounting-core", "procurement-core", "sales-core", "inventory-core", "crm-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "trading-distribution",
      replenishmentMode: "reorder-point",
      pricingMode: "channel-aware",
      warehouseTopology: "multi-warehouse"
    },
    workflowTemplate: {
      workflowId: "trading-distribution-governance",
      actors: ["buyer", "sales-ops", "warehouse-lead"]
    },
    dashboardTemplate: {
      id: "trading-distribution-overview",
      title: "Trading & Distribution Overview",
      widgets: ["backlog", "otif", "replenishment", "price-variance"]
    }
  }),
  businessPackSpec({
    id: "sector-retail",
    displayName: "Sector Pack Retail",
    description: "Retail overlays for POS, promotions, cashier control, omnichannel fulfillment, and return-heavy store execution.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "accounting-core": "^0.1.0",
      "sales-core": "^0.1.0",
      "inventory-core": "^0.1.0",
      "pos-core": "^0.1.0",
      "crm-core": "^0.1.0",
      "procurement-core": "^0.1.0"
    },
    requiredPlugins: ["accounting-core", "sales-core", "inventory-core", "pos-core", "crm-core", "procurement-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "retail",
      loyaltyMode: "optional",
      syncMode: "offline-tolerant",
      returnWindowDays: 30
    },
    workflowTemplate: {
      workflowId: "retail-sector-governance",
      actors: ["store-manager", "controller", "retail-ops"]
    },
    dashboardTemplate: {
      id: "retail-sector-overview",
      title: "Retail Sector Overview",
      widgets: ["store-sales", "cashier-variance", "offline-sync", "returns"]
    }
  }),
  businessPackSpec({
    id: "sector-epc-professional-delivery",
    displayName: "Sector Pack EPC & Professional Delivery",
    description: "Project-heavy EPC and delivery overlays for milestones, BOQ-style structures, procurement packages, and progress billing.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "projects-core": "^0.1.0",
      "procurement-core": "^0.1.0",
      "sales-core": "^0.1.0",
      "accounting-core": "^0.1.0",
      "contracts-core": "^0.1.0"
    },
    requiredPlugins: ["projects-core", "procurement-core", "sales-core", "accounting-core", "contracts-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "epc-professional-delivery",
      billingMode: "milestone",
      budgetControl: "commitment-aware",
      documentControl: "enabled"
    },
    workflowTemplate: {
      workflowId: "epc-sector-governance",
      actors: ["project-manager", "commercial-owner", "controller"]
    },
    dashboardTemplate: {
      id: "epc-sector-overview",
      title: "EPC & Professional Delivery Overview",
      widgets: ["milestones", "commitments", "change-orders", "budget-burn"]
    }
  }),
  businessPackSpec({
    id: "sector-ecommerce",
    displayName: "Sector Pack E-Commerce",
    description: "E-commerce overlays for web or marketplace orders, payment timeout handling, RMA posture, and self-service returns.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "sales-core": "^0.1.0",
      "inventory-core": "^0.1.0",
      "accounting-core": "^0.1.0",
      "crm-core": "^0.1.0",
      "support-service-core": "^0.1.0",
      "business-portals-core": "^0.1.0"
    },
    requiredPlugins: ["sales-core", "inventory-core", "accounting-core", "crm-core", "support-service-core", "business-portals-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "ecommerce",
      paymentTimeoutMinutes: 30,
      returnAuthorization: "required",
      fulfillmentSla: "two-day"
    },
    workflowTemplate: {
      workflowId: "ecommerce-sector-governance",
      actors: ["commerce-ops", "fraud-reviewer", "support-lead"]
    },
    dashboardTemplate: {
      id: "ecommerce-sector-overview",
      title: "E-Commerce Overview",
      widgets: ["orders", "returns", "payment-timeouts", "fulfillment-sla"]
    }
  }),
  businessPackSpec({
    id: "sector-education",
    displayName: "Sector Pack Education",
    description: "Education overlays for student, guardian, fees, academic exception handling, and institution-focused workflows.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "accounting-core": "^0.1.0",
      "crm-core": "^0.1.0",
      "support-service-core": "^0.1.0",
      "hr-payroll-core": "^0.1.0",
      "business-portals-core": "^0.1.0"
    },
    requiredPlugins: ["accounting-core", "crm-core", "support-service-core", "hr-payroll-core", "business-portals-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "education",
      admissionsMode: "governed",
      feePolicy: "term-based",
      guardianPortal: "enabled"
    },
    workflowTemplate: {
      workflowId: "education-sector-governance",
      actors: ["registrar", "finance", "student-services"]
    },
    dashboardTemplate: {
      id: "education-sector-overview",
      title: "Education Overview",
      widgets: ["admissions", "fees", "student-cases", "academic-exceptions"]
    }
  }),
  businessPackSpec({
    id: "sector-healthcare",
    displayName: "Sector Pack Healthcare",
    description: "Healthcare overlays for patient-facing intake, encounter support, pharmacy or consumable inventory, and regulated billing or consent posture.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "accounting-core": "^0.1.0",
      "inventory-core": "^0.1.0",
      "support-service-core": "^0.1.0",
      "crm-core": "^0.1.0",
      "hr-payroll-core": "^0.1.0",
      "business-portals-core": "^0.1.0"
    },
    requiredPlugins: ["accounting-core", "inventory-core", "support-service-core", "crm-core", "hr-payroll-core", "business-portals-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "healthcare",
      consentChecks: "mandatory",
      stockMode: "consumables",
      privacyProfile: "regulated"
    },
    workflowTemplate: {
      workflowId: "healthcare-sector-governance",
      actors: ["care-ops", "finance", "compliance"]
    },
    dashboardTemplate: {
      id: "healthcare-sector-overview",
      title: "Healthcare Overview",
      widgets: ["encounters", "consents", "consumables", "billing-posture"]
    }
  }),
  businessPackSpec({
    id: "sector-professional-services",
    displayName: "Sector Pack Professional Services",
    description: "Professional-services overlays for resource planning, retainers, timesheet billing, and client-service profitability.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "crm-core": "^0.1.0",
      "sales-core": "^0.1.0",
      "projects-core": "^0.1.0",
      "accounting-core": "^0.1.0",
      "support-service-core": "^0.1.0",
      "hr-payroll-core": "^0.1.0",
      "contracts-core": "^0.1.0"
    },
    requiredPlugins: ["crm-core", "sales-core", "projects-core", "accounting-core", "support-service-core", "hr-payroll-core", "contracts-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "professional-services",
      billingMode: "time-and-materials",
      resourcePlanning: "enabled",
      retainerPolicy: "supported"
    },
    workflowTemplate: {
      workflowId: "professional-services-sector-governance",
      actors: ["practice-lead", "project-manager", "controller"]
    },
    dashboardTemplate: {
      id: "professional-services-sector-overview",
      title: "Professional Services Overview",
      widgets: ["utilization", "billable-time", "client-profitability", "retainers"]
    }
  }),
  businessPackSpec({
    id: "sector-financial-services-compliance",
    displayName: "Sector Pack Financial Services Compliance",
    description: "Financial-services compliance overlays for onboarding, case posture, retention, evidence, and regulated review workflows.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "crm-core": "^0.1.0",
      "accounting-core": "^0.1.0",
      "support-service-core": "^0.1.0",
      "contracts-core": "^0.1.0",
      "business-portals-core": "^0.1.0"
    },
    requiredPlugins: ["crm-core", "accounting-core", "support-service-core", "contracts-core", "business-portals-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "financial-services-compliance",
      onboardingMode: "kyc-governed",
      evidenceRetention: "extended",
      reviewProfile: "regulated"
    },
    workflowTemplate: {
      workflowId: "financial-services-sector-governance",
      actors: ["compliance-officer", "ops", "approver"]
    },
    dashboardTemplate: {
      id: "financial-services-sector-overview",
      title: "Financial Services Compliance Overview",
      widgets: ["kyc", "case-backlog", "evidence-retention", "exceptions"]
    }
  }),
  businessPackSpec({
    id: "sector-nonprofit",
    displayName: "Sector Pack Nonprofit",
    description: "Nonprofit overlays for donor, grant, fund, program, and impact-oriented accounting and case workflows.",
    kind: "sector-pack",
    packType: "sector-template",
    group: "Sector",
    environmentScope: "sector",
    pluginConstraints: {
      "accounting-core": "^0.1.0",
      "crm-core": "^0.1.0",
      "projects-core": "^0.1.0",
      "support-service-core": "^0.1.0",
      "business-portals-core": "^0.1.0"
    },
    requiredPlugins: ["accounting-core", "crm-core", "projects-core", "support-service-core", "business-portals-core"],
    dependsOnPacks: ["localization-global-base@^0.1.0"],
    settingDefaults: {
      starterProfile: "nonprofit",
      fundMode: "restricted-and-unrestricted",
      grantControls: "enabled",
      donorPortal: "enabled"
    },
    workflowTemplate: {
      workflowId: "nonprofit-sector-governance",
      actors: ["program-owner", "finance", "fund-manager"]
    },
    dashboardTemplate: {
      id: "nonprofit-sector-overview",
      title: "Nonprofit Overview",
      widgets: ["donors", "grants", "fund-usage", "program-outcomes"]
    }
  })
];

export const businessContractScenarios = [
  {
    id: "crm-handoff-to-sales",
    sourcePluginId: "crm-core",
    operation: "reconcile",
    expectedTargets: ["sales.quotes.create", "traceability.links.record"]
  },
  {
    id: "sales-order-to-inventory",
    sourcePluginId: "sales-core",
    operation: "advance",
    expectedTargets: ["inventory.reservations.allocate", "traceability.links.record"]
  },
  {
    id: "sales-billing-to-accounting",
    sourcePluginId: "sales-core",
    operation: "reconcile",
    expectedTargets: ["accounting.billing.post", "traceability.reconciliation.queue"]
  },
  {
    id: "procurement-receipt-to-inventory",
    sourcePluginId: "procurement-core",
    operation: "advance",
    expectedTargets: ["inventory.receipts.record", "traceability.links.record"]
  },
  {
    id: "procurement-bill-to-accounting",
    sourcePluginId: "procurement-core",
    operation: "reconcile",
    expectedTargets: ["accounting.billing.post", "traceability.reconciliation.queue"]
  },
  {
    id: "projects-billing-to-accounting",
    sourcePluginId: "projects-core",
    operation: "reconcile",
    expectedTargets: ["accounting.billing.post", "traceability.reconciliation.queue"]
  },
  {
    id: "support-parts-to-inventory",
    sourcePluginId: "support-service-core",
    operation: "reconcile",
    expectedTargets: ["inventory.transfers.request", "traceability.reconciliation.queue"]
  },
  {
    id: "pos-close-to-accounting",
    sourcePluginId: "pos-core",
    operation: "reconcile",
    expectedTargets: ["accounting.billing.post", "traceability.reconciliation.queue"]
  },
  {
    id: "manufacturing-output-to-inventory",
    sourcePluginId: "manufacturing-core",
    operation: "advance",
    expectedTargets: ["inventory.transfers.request", "traceability.links.record"]
  },
  {
    id: "hr-payroll-to-accounting",
    sourcePluginId: "hr-payroll-core",
    operation: "reconcile",
    expectedTargets: ["accounting.billing.post", "traceability.reconciliation.queue"]
  },
  {
    id: "contracts-schedule-to-accounting",
    sourcePluginId: "contracts-core",
    operation: "reconcile",
    expectedTargets: ["accounting.billing.post", "traceability.reconciliation.queue"]
  },
  {
    id: "subscriptions-renewal-to-accounting",
    sourcePluginId: "subscriptions-core",
    operation: "reconcile",
    expectedTargets: ["accounting.billing.post", "traceability.reconciliation.queue"]
  },
  {
    id: "field-service-dispatch-to-support-and-inventory",
    sourcePluginId: "field-service-core",
    operation: "advance",
    expectedTargets: ["support.service-orders.dispatch", "inventory.transfers.request"]
  },
  {
    id: "business-portals-self-service-routing",
    sourcePluginId: "business-portals-core",
    operation: "advance",
    expectedTargets: ["sales.quotes.create", "support.tickets.create"]
  },
  {
    id: "maintenance-cmms-work-order-to-support-and-inventory",
    sourcePluginId: "maintenance-cmms-core",
    operation: "advance",
    expectedTargets: ["support.service-orders.dispatch", "inventory.transfers.request"]
  },
  {
    id: "treasury-reconciliation-to-accounting",
    sourcePluginId: "treasury-core",
    operation: "reconcile",
    expectedTargets: ["accounting.payments.allocate", "traceability.reconciliation.queue"]
  },
  {
    id: "e-invoicing-to-accounting",
    sourcePluginId: "e-invoicing-core",
    operation: "reconcile",
    expectedTargets: ["accounting.billing.post", "traceability.reconciliation.queue"]
  },
  {
    id: "analytics-bi-refresh-to-traceability",
    sourcePluginId: "analytics-bi-core",
    operation: "reconcile",
    expectedTargets: ["traceability.reconciliation.queue"]
  },
  {
    id: "ai-assist-to-crm-support-traceability",
    sourcePluginId: "ai-assist-core",
    operation: "reconcile",
    expectedTargets: ["crm.handoffs.prepare", "support.tickets.create", "traceability.links.record"]
  }
];

export const businessEndToEndScenarios = [
  {
    id: "quote-to-cash",
    label: "Quote to Cash",
    pluginIds: ["crm-core", "sales-core", "accounting-core"],
    steps: [
      { type: "action", pluginId: "crm-core", actionId: "crm.leads.capture", phase: "create", recordId: "crm-q2c" },
      {
        type: "action",
        pluginId: "crm-core",
        actionId: "crm.opportunities.advance",
        phase: "advance",
        recordId: "crm-q2c",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "none"
      },
      {
        type: "action",
        pluginId: "crm-core",
        actionId: "crm.handoffs.prepare",
        phase: "reconcile",
        recordId: "crm-q2c",
        exceptionId: "crm-q2c-handoff",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "sales-handoff"
      },
      { type: "action", pluginId: "sales-core", actionId: "sales.quotes.create", phase: "create", recordId: "sales-q2c" },
      {
        type: "resolve",
        pluginId: "crm-core",
        targets: ["sales.quotes.create", "traceability.links.record"],
        resolutionPrefix: "crm-q2c"
      },
      {
        type: "action",
        pluginId: "sales-core",
        actionId: "sales.orders.confirm",
        phase: "advance",
        recordId: "sales-q2c",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "sales-core",
        targets: ["inventory.reservations.allocate", "traceability.links.record"],
        resolutionPrefix: "sales-q2c-fulfillment"
      },
      {
        type: "action",
        pluginId: "sales-core",
        actionId: "sales.billing.request",
        phase: "reconcile",
        recordId: "sales-q2c",
        exceptionId: "sales-q2c-billing",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "billing-request"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-q2c"
      },
      {
        type: "resolve",
        pluginId: "sales-core",
        targets: ["accounting.billing.post", "traceability.reconciliation.queue"],
        resolutionPrefix: "sales-q2c-billing"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.payments.allocate",
        phase: "advance",
        recordId: "accounting-q2c",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "complete"
      },
      {
        type: "resolve",
        pluginId: "accounting-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "accounting-q2c"
      }
    ]
  },
  {
    id: "procure-to-pay",
    label: "Procure to Pay",
    pluginIds: ["procurement-core", "inventory-core", "accounting-core"],
    steps: [
      {
        type: "action",
        pluginId: "procurement-core",
        actionId: "procurement.requisitions.create",
        phase: "create",
        recordId: "procurement-p2p"
      },
      {
        type: "action",
        pluginId: "procurement-core",
        actionId: "procurement.purchase-orders.issue",
        phase: "advance",
        recordId: "procurement-p2p",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "action",
        pluginId: "inventory-core",
        actionId: "inventory.receipts.record",
        phase: "create",
        recordId: "inventory-p2p"
      },
      {
        type: "resolve",
        pluginId: "procurement-core",
        targets: ["inventory.receipts.record", "traceability.links.record"],
        resolutionPrefix: "procurement-p2p-receipt"
      },
      {
        type: "action",
        pluginId: "procurement-core",
        actionId: "procurement.receipts.request",
        phase: "reconcile",
        recordId: "procurement-p2p",
        exceptionId: "procurement-p2p-bill",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "vendor-bill-request"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-p2p"
      },
      {
        type: "resolve",
        pluginId: "procurement-core",
        targets: ["accounting.billing.post", "traceability.reconciliation.queue"],
        resolutionPrefix: "procurement-p2p-bill"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.payments.allocate",
        phase: "advance",
        recordId: "accounting-p2p",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "complete"
      },
      {
        type: "resolve",
        pluginId: "accounting-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "accounting-p2p"
      }
    ]
  },
  {
    id: "project-to-bill",
    label: "Project to Bill",
    pluginIds: ["projects-core", "accounting-core"],
    steps: [
      {
        type: "action",
        pluginId: "projects-core",
        actionId: "projects.projects.create",
        phase: "create",
        recordId: "projects-p2b"
      },
      {
        type: "action",
        pluginId: "projects-core",
        actionId: "projects.milestones.complete",
        phase: "advance",
        recordId: "projects-p2b",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "projects-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "projects-p2b-milestone"
      },
      {
        type: "action",
        pluginId: "projects-core",
        actionId: "projects.billing.request",
        phase: "reconcile",
        recordId: "projects-p2b",
        exceptionId: "projects-p2b-billing",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "project-billing"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-p2b"
      },
      {
        type: "resolve",
        pluginId: "projects-core",
        targets: ["accounting.billing.post", "traceability.reconciliation.queue"],
        resolutionPrefix: "projects-p2b-billing"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.payments.allocate",
        phase: "advance",
        recordId: "accounting-p2b",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "complete"
      },
      {
        type: "resolve",
        pluginId: "accounting-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "accounting-p2b"
      }
    ]
  },
  {
    id: "plan-to-produce",
    label: "Plan to Produce",
    pluginIds: ["manufacturing-core", "inventory-core"],
    steps: [
      {
        type: "action",
        pluginId: "manufacturing-core",
        actionId: "manufacturing.boms.publish",
        phase: "create",
        recordId: "manufacturing-p2p"
      },
      {
        type: "action",
        pluginId: "manufacturing-core",
        actionId: "manufacturing.work-orders.release",
        phase: "advance",
        recordId: "manufacturing-p2p",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "manufacturing-core",
        targets: ["inventory.transfers.request", "traceability.links.record"],
        resolutionPrefix: "manufacturing-p2p-material"
      },
      {
        type: "action",
        pluginId: "inventory-core",
        actionId: "inventory.receipts.record",
        phase: "create",
        recordId: "inventory-p2p"
      },
      {
        type: "action",
        pluginId: "inventory-core",
        actionId: "inventory.transfers.request",
        phase: "reconcile",
        recordId: "inventory-p2p",
        exceptionId: "inventory-p2p-transfer",
        expectedRevisionNo: 1,
        severity: "medium",
        reasonCode: "shop-floor-transfer"
      },
      {
        type: "resolve",
        pluginId: "inventory-core",
        targets: ["traceability.reconciliation.queue"],
        resolutionPrefix: "inventory-p2p-transfer"
      },
      {
        type: "action",
        pluginId: "manufacturing-core",
        actionId: "manufacturing.outputs.record",
        phase: "reconcile",
        recordId: "manufacturing-p2p",
        exceptionId: "manufacturing-p2p-output",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "finished-goods-output"
      },
      {
        type: "resolve",
        pluginId: "manufacturing-core",
        targets: ["traceability.reconciliation.queue"],
        resolutionPrefix: "manufacturing-p2p-output"
      }
    ]
  },
  {
    id: "service-dispatch-to-bill",
    label: "Service Dispatch to Bill",
    pluginIds: ["support-service-core", "field-service-core", "inventory-core", "accounting-core"],
    steps: [
      {
        type: "action",
        pluginId: "support-service-core",
        actionId: "support.tickets.create",
        phase: "create",
        recordId: "support-s2c"
      },
      {
        type: "action",
        pluginId: "support-service-core",
        actionId: "support.service-orders.dispatch",
        phase: "advance",
        recordId: "support-s2c",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "support-service-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "support-s2c-dispatch"
      },
      {
        type: "action",
        pluginId: "field-service-core",
        actionId: "field-service.dispatches.schedule",
        phase: "create",
        recordId: "field-s2c"
      },
      {
        type: "action",
        pluginId: "field-service-core",
        actionId: "field-service.visits.start",
        phase: "advance",
        recordId: "field-s2c",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "action",
        pluginId: "inventory-core",
        actionId: "inventory.receipts.record",
        phase: "create",
        recordId: "inventory-s2c"
      },
      {
        type: "action",
        pluginId: "inventory-core",
        actionId: "inventory.transfers.request",
        phase: "reconcile",
        recordId: "inventory-s2c",
        exceptionId: "inventory-s2c-transfer",
        expectedRevisionNo: 1,
        severity: "medium",
        reasonCode: "field-parts-transfer"
      },
      {
        type: "resolve",
        pluginId: "inventory-core",
        targets: ["traceability.reconciliation.queue"],
        resolutionPrefix: "inventory-s2c-transfer"
      },
      {
        type: "resolve",
        pluginId: "field-service-core",
        targets: ["support.service-orders.dispatch", "inventory.transfers.request"],
        resolutionPrefix: "field-s2c-dispatch"
      },
      {
        type: "action",
        pluginId: "field-service-core",
        actionId: "field-service.parts.request",
        phase: "reconcile",
        recordId: "field-s2c",
        exceptionId: "field-s2c-billing",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "service-billing"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-s2c"
      },
      {
        type: "resolve",
        pluginId: "field-service-core",
        targets: ["accounting.billing.post", "traceability.reconciliation.queue"],
        resolutionPrefix: "field-s2c-billing"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.payments.allocate",
        phase: "advance",
        recordId: "accounting-s2c",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "complete"
      },
      {
        type: "resolve",
        pluginId: "accounting-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "accounting-s2c"
      }
    ]
  },
  {
    id: "retail-pos-close",
    label: "Retail POS Close",
    pluginIds: ["pos-core", "accounting-core"],
    steps: [
      {
        type: "action",
        pluginId: "pos-core",
        actionId: "pos.sessions.open",
        phase: "create",
        recordId: "pos-retail"
      },
      {
        type: "action",
        pluginId: "pos-core",
        actionId: "pos.receipts.record",
        phase: "advance",
        recordId: "pos-retail",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "pos-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "pos-retail-receipt"
      },
      {
        type: "action",
        pluginId: "pos-core",
        actionId: "pos.sessions.close",
        phase: "reconcile",
        recordId: "pos-retail",
        exceptionId: "pos-retail-close",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "shift-close"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-retail"
      },
      {
        type: "resolve",
        pluginId: "pos-core",
        targets: ["accounting.billing.post", "traceability.reconciliation.queue"],
        resolutionPrefix: "pos-retail-close"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.payments.allocate",
        phase: "advance",
        recordId: "accounting-retail",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "complete"
      },
      {
        type: "resolve",
        pluginId: "accounting-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "accounting-retail"
      }
    ]
  },
  {
    id: "hire-to-payroll",
    label: "Hire to Payroll",
    pluginIds: ["hr-payroll-core", "accounting-core"],
    steps: [
      {
        type: "action",
        pluginId: "hr-payroll-core",
        actionId: "hr.employees.onboard",
        phase: "create",
        recordId: "hr-payroll"
      },
      {
        type: "action",
        pluginId: "hr-payroll-core",
        actionId: "hr.payroll.process",
        phase: "advance",
        recordId: "hr-payroll",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "hr-payroll-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "hr-payroll-run"
      },
      {
        type: "action",
        pluginId: "hr-payroll-core",
        actionId: "hr.leave.approve",
        phase: "reconcile",
        recordId: "hr-payroll",
        exceptionId: "hr-payroll-approval",
        expectedRevisionNo: 2,
        severity: "low",
        reasonCode: "leave-and-payroll-approved"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-payroll"
      },
      {
        type: "resolve",
        pluginId: "hr-payroll-core",
        targets: ["accounting.billing.post", "traceability.reconciliation.queue"],
        resolutionPrefix: "hr-payroll-close"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.payments.allocate",
        phase: "advance",
        recordId: "accounting-payroll",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "complete"
      },
      {
        type: "resolve",
        pluginId: "accounting-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "accounting-payroll"
      }
    ]
  },
  {
    id: "contract-to-renewal",
    label: "Contract to Renewal",
    pluginIds: ["contracts-core", "subscriptions-core", "accounting-core"],
    steps: [
      {
        type: "action",
        pluginId: "contracts-core",
        actionId: "contracts.registry.create",
        phase: "create",
        recordId: "contracts-renewal"
      },
      {
        type: "action",
        pluginId: "contracts-core",
        actionId: "contracts.entitlements.activate",
        phase: "advance",
        recordId: "contracts-renewal",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "contracts-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "contracts-renewal-entitlement"
      },
      {
        type: "action",
        pluginId: "subscriptions-core",
        actionId: "subscriptions.plans.publish",
        phase: "create",
        recordId: "subscriptions-renewal"
      },
      {
        type: "action",
        pluginId: "subscriptions-core",
        actionId: "subscriptions.cycles.generate",
        phase: "advance",
        recordId: "subscriptions-renewal",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "subscriptions-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "subscriptions-renewal-cycle"
      },
      {
        type: "action",
        pluginId: "contracts-core",
        actionId: "contracts.billing-schedules.publish",
        phase: "reconcile",
        recordId: "contracts-renewal",
        exceptionId: "contracts-renewal-billing",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "contract-billing-schedule"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-contracts"
      },
      {
        type: "resolve",
        pluginId: "contracts-core",
        targets: ["accounting.billing.post", "traceability.reconciliation.queue"],
        resolutionPrefix: "contracts-renewal-billing"
      },
      {
        type: "action",
        pluginId: "subscriptions-core",
        actionId: "subscriptions.renewals.process",
        phase: "reconcile",
        recordId: "subscriptions-renewal",
        exceptionId: "subscriptions-renewal-process",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "subscription-renewal"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-renewal"
      },
      {
        type: "resolve",
        pluginId: "subscriptions-core",
        targets: ["accounting.billing.post", "traceability.reconciliation.queue"],
        resolutionPrefix: "subscriptions-renewal-billing"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.payments.allocate",
        phase: "advance",
        recordId: "accounting-renewal",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "complete"
      },
      {
        type: "resolve",
        pluginId: "accounting-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "accounting-renewal"
      }
    ]
  },
  {
    id: "portal-self-service",
    label: "Portal Self Service",
    pluginIds: ["business-portals-core", "sales-core", "support-service-core"],
    steps: [
      {
        type: "action",
        pluginId: "business-portals-core",
        actionId: "portals.customer-workspaces.publish",
        phase: "create",
        recordId: "portals-self-service"
      },
      {
        type: "action",
        pluginId: "business-portals-core",
        actionId: "portals.portal-actions.capture",
        phase: "advance",
        recordId: "portals-self-service",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "action",
        pluginId: "sales-core",
        actionId: "sales.quotes.create",
        phase: "create",
        recordId: "sales-self-service"
      },
      {
        type: "action",
        pluginId: "support-service-core",
        actionId: "support.tickets.create",
        phase: "create",
        recordId: "support-self-service"
      },
      {
        type: "resolve",
        pluginId: "business-portals-core",
        targets: ["sales.quotes.create", "support.tickets.create"],
        resolutionPrefix: "portals-self-service"
      },
      {
        type: "action",
        pluginId: "business-portals-core",
        actionId: "portals.employee-workspaces.publish",
        phase: "reconcile",
        recordId: "portals-self-service",
        exceptionId: "portals-self-service-employee",
        expectedRevisionNo: 2,
        severity: "low",
        reasonCode: "employee-portal-ready"
      },
      {
        type: "resolve",
        pluginId: "business-portals-core",
        targets: ["traceability.reconciliation.queue"],
        resolutionPrefix: "portals-self-service-employee"
      }
    ]
  },
  {
    id: "treasury-settlement",
    label: "Treasury Settlement",
    pluginIds: ["treasury-core", "accounting-core"],
    steps: [
      {
        type: "action",
        pluginId: "treasury-core",
        actionId: "treasury.cash-position.capture",
        phase: "create",
        recordId: "treasury-settlement"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-settlement"
      },
      {
        type: "action",
        pluginId: "treasury-core",
        actionId: "treasury.banking.publish",
        phase: "advance",
        recordId: "treasury-settlement",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "treasury-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "treasury-settlement-banking"
      },
      {
        type: "action",
        pluginId: "treasury-core",
        actionId: "treasury.forecasts.refresh",
        phase: "reconcile",
        recordId: "treasury-settlement",
        exceptionId: "treasury-settlement-forecast",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "cash-forecast-refresh"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.payments.allocate",
        phase: "advance",
        recordId: "accounting-settlement",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "complete"
      },
      {
        type: "resolve",
        pluginId: "treasury-core",
        targets: ["accounting.payments.allocate", "traceability.reconciliation.queue"],
        resolutionPrefix: "treasury-settlement-close"
      },
      {
        type: "resolve",
        pluginId: "accounting-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "accounting-settlement"
      }
    ]
  },
  {
    id: "e-invoicing-cycle",
    label: "E-Invoicing Cycle",
    pluginIds: ["e-invoicing-core", "accounting-core"],
    steps: [
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-e-invoice-source"
      },
      {
        type: "action",
        pluginId: "e-invoicing-core",
        actionId: "e-invoicing.documents.prepare",
        phase: "create",
        recordId: "e-invoicing-cycle"
      },
      {
        type: "action",
        pluginId: "e-invoicing-core",
        actionId: "e-invoicing.submissions.submit",
        phase: "advance",
        recordId: "e-invoicing-cycle",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "partial"
      },
      {
        type: "resolve",
        pluginId: "e-invoicing-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "e-invoicing-cycle-submit"
      },
      {
        type: "action",
        pluginId: "e-invoicing-core",
        actionId: "e-invoicing.reconciliation.run",
        phase: "reconcile",
        recordId: "e-invoicing-cycle",
        exceptionId: "e-invoicing-cycle-reconciliation",
        expectedRevisionNo: 2,
        severity: "medium",
        reasonCode: "government-reconciliation"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.billing.post",
        phase: "create",
        recordId: "accounting-e-invoice-reconciliation"
      },
      {
        type: "resolve",
        pluginId: "e-invoicing-core",
        targets: ["accounting.billing.post", "traceability.reconciliation.queue"],
        resolutionPrefix: "e-invoicing-cycle-close"
      },
      {
        type: "action",
        pluginId: "accounting-core",
        actionId: "accounting.payments.allocate",
        phase: "advance",
        recordId: "accounting-e-invoice-reconciliation",
        expectedRevisionNo: 1,
        approvalState: "approved",
        postingState: "posted",
        fulfillmentState: "complete"
      },
      {
        type: "resolve",
        pluginId: "accounting-core",
        targets: ["traceability.links.record"],
        resolutionPrefix: "accounting-e-invoice"
      }
    ]
  }
];

export const businessPluginRepoNames = businessPluginSpecs.map((entry) => entry.repoName);
export const businessRepoNames = businessPluginRepoNames;
export const businessWorkspaceRepoPaths = [
  ...businessPluginRepoNames.map((entry) => `plugins/${entry}`),
  `catalogs/${businessPackCatalogSpec.repoName}`
];
export const businessPluginIds = businessPluginSpecs.map((entry) => entry.id);
