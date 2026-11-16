export interface CompanyServiceArea {
  id: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  categoryType: string;
  parentId: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProduct {
  id: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  productCategoryId: string | null;
  sku: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyService {
  id: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  serviceCategoryId: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyIssueCategory {
  id: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  serviceId: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CompanyCatalogue {
  migrationRequired?: boolean;
  upgradeRequired?: boolean;
  serviceAreas: CompanyServiceArea[];
  products: CompanyProduct[];
  services: CompanyService[];
  issueCategories: CompanyIssueCategory[];
  isConfigured: boolean;
}

export interface IndustryStarterTemplate {
  id: string;
  name: string;
  description: string;
  serviceAreas: Array<{
    name: string;
    description: string;
    categoryType: string;
  }>;
  products: Array<{
    name: string;
    description: string;
    serviceAreaName?: string;
  }>;
  services: Array<{
    name: string;
    description: string;
    serviceAreaName?: string;
  }>;
  issueCategories: Array<{
    name: string;
    description: string;
    serviceName?: string;
  }>;
}

export const INDUSTRY_STARTER_TEMPLATES: Record<string, IndustryStarterTemplate> = {
  telecom: {
    id: "telecom",
    name: "Telecommunications",
    description: "Connectivity, Mobile Network, SIM Services, Data Bundles, and Field Dispatch.",
    serviceAreas: [
      { name: "Connectivity & Network", description: "Voice, 4G/5G data, transmission towers, fiber routes", categoryType: "network" },
      { name: "Mobile & SIM Services", description: "SIM registration, biometric KYC, roaming, PUK unlock", categoryType: "customer_service" },
      { name: "Data & Subscriptions", description: "Internet bundles, daily/monthly plans, bandwidth quotas", categoryType: "product" },
      { name: "Billing & Airtime", description: "Recharges, wallet deductions, tariff plans", categoryType: "billing" },
      { name: "Field Technical Support", description: "Technician visits, router installation, fiber splicing", categoryType: "operations" },
    ],
    products: [
      { name: "4G/5G Home WiFi Router", description: "Indoor CPE router for home broadband", serviceAreaName: "Connectivity & Network" },
      { name: "Postpaid Voice & Data SIM", description: "Monthly corporate and individual SIM card", serviceAreaName: "Mobile & SIM Services" },
      { name: "Prepaid 10GB Monthly Bundle", description: "Monthly mobile internet bundle", serviceAreaName: "Data & Subscriptions" },
      { name: "Optical Fiber ONT Terminal", description: "Fiber-to-the-home GPON optical unit", serviceAreaName: "Field Technical Support" },
    ],
    services: [
      { name: "SIM Card Replacement / Swap", description: "Damaged or lost SIM card reactivation", serviceAreaName: "Mobile & SIM Services" },
      { name: "Data Bundle Top-Up", description: "Purchasing and allocating internet data", serviceAreaName: "Data & Subscriptions" },
      { name: "Fiber Line Repair Dispatch", description: "Onsite technical technician troubleshooting", serviceAreaName: "Field Technical Support" },
      { name: "Airtime Balance Dispute Inquiry", description: "Investigation into unexpected balance deductions", serviceAreaName: "Billing & Airtime" },
    ],
    issueCategories: [
      { name: "Premature Data Bundle Expiry", description: "Bundle depleted quicker than expected", serviceName: "Data Bundle Top-Up" },
      { name: "SIM Registration Biometric Failure", description: "NIDA / Biometric fingerprint scan timeout", serviceName: "SIM Card Replacement / Swap" },
      { name: "Fiber Signal Loss / LOS Red Light", description: "Loss of optical signal on subscriber ONT", serviceName: "Fiber Line Repair Dispatch" },
      { name: "Recharge Timeout / Deducted without Airtime", description: "Payment gateway charged wallet but airtime not credited", serviceName: "Airtime Balance Dispute Inquiry" },
    ],
  },

  banking: {
    id: "banking",
    name: "Banking & Financial Services",
    description: "Accounts, Funds Transfers, Debit/Credit Cards, Mobile Banking, and Loans.",
    serviceAreas: [
      { name: "Accounts & Balances", description: "Savings, checking, fixed deposit, statements", categoryType: "core_banking" },
      { name: "Funds Transfers & Payments", description: "Interbank transfers, instant settlements, bill payments", categoryType: "payments" },
      { name: "Cards & ATMs", description: "Visa/Mastercard debit and credit cards, ATM cash dispensers", categoryType: "cards" },
      { name: "Digital & Mobile Banking", description: "Mobile app, USSD channel, internet banking portal", categoryType: "digital" },
      { name: "Loans & Credit Facilities", description: "Salary advances, personal loans, mortgage servicing", categoryType: "credit" },
    ],
    products: [
      { name: "Visa Gold Debit Card", description: "EMV chip debit card for POS and ATM", serviceAreaName: "Cards & ATMs" },
      { name: "Premier Savings Account", description: "High-yield interest bearing individual account", serviceAreaName: "Accounts & Balances" },
      { name: "Instant Salary Advance Loan", description: "Short-term digital credit facility", serviceAreaName: "Loans & Credit Facilities" },
    ],
    services: [
      { name: "Inter-Bank Instant Transfer", description: "Real-time payment to another banking institution", serviceAreaName: "Funds Transfers & Payments" },
      { name: "ATM Cash Withdrawal Reversal", description: "Failed cash dispensation dispute resolution", serviceAreaName: "Cards & ATMs" },
      { name: "Mobile Banking Password Reset", description: "Unlocking credentials for mobile app and USSD", serviceAreaName: "Digital & Mobile Banking" },
      { name: "Bank Statement Generation", description: "Official stamped statement for visa/audit", serviceAreaName: "Accounts & Balances" },
    ],
    issueCategories: [
      { name: "ATM Dispense Error / Cash Not Delivered", description: "Account debited but ATM cash shutter remained closed", serviceName: "ATM Cash Withdrawal Reversal" },
      { name: "Transfer Pending Settlement (> 24h)", description: "Sender debited but beneficiary not credited", serviceName: "Inter-Bank Instant Transfer" },
      { name: "Mobile App OTP SMS Timeout", description: "One-time password not received during login", serviceName: "Mobile Banking Password Reset" },
      { name: "Unexpected Monthly Maintenance Fee", description: "Ledger fee dispute on savings account", serviceName: "Bank Statement Generation" },
    ],
  },

  healthcare: {
    id: "healthcare",
    name: "Healthcare & Clinical Services",
    description: "Outpatient Appointments, Doctor Consultations, Laboratory Tests, and Pharmacy.",
    serviceAreas: [
      { name: "Appointments & Registration", description: "Patient booking, intake, medical record lookups", categoryType: "reception" },
      { name: "Clinical Consultations", description: "General practitioners, pediatricians, specialists", categoryType: "clinical" },
      { name: "Laboratory & Diagnostics", description: "Blood work, pathology, imaging, ultrasound, X-ray", categoryType: "diagnostics" },
      { name: "Pharmacy & Prescriptions", description: "Medication fulfillment, compounding, dosage counseling", categoryType: "pharmacy" },
      { name: "Medical Insurance & Billing", description: "NHIF and private insurer pre-authorization", categoryType: "billing" },
    ],
    products: [
      { name: "Comprehensive Health Check Package", description: "Annual preventative screening panel", serviceAreaName: "Laboratory & Diagnostics" },
      { name: "Monthly Maintenance Medication Pack", description: "Chronic illness prescription refill", serviceAreaName: "Pharmacy & Prescriptions" },
    ],
    services: [
      { name: "Specialist Doctor Consultation", description: "Scheduled in-person or telemedicine visit", serviceAreaName: "Clinical Consultations" },
      { name: "Diagnostic Blood Test", description: "Sample collection, analysis, and report release", serviceAreaName: "Laboratory & Diagnostics" },
      { name: "Insurance Pre-Authorization", description: "Approval request submitted to health insurance provider", serviceAreaName: "Medical Insurance & Billing" },
      { name: "Prescription Refill Fulfillment", description: "Dispensing authorized medications", serviceAreaName: "Pharmacy & Prescriptions" },
    ],
    issueCategories: [
      { name: "Insurance Approval Delayed / Patient Waiting", description: "Hospital visit delayed pending insurer clearance", serviceName: "Insurance Pre-Authorization" },
      { name: "Lab Results Delayed Beyond Turnaround SLA", description: "Pathology results not uploaded to patient portal", serviceName: "Diagnostic Blood Test" },
      { name: "Prescription Drug Out of Stock", description: "Prescribed medication unavailable at central dispensary", serviceName: "Prescription Refill Fulfillment" },
      { name: "Double Booked Specialist Appointment", description: "Patient arrived but doctor was double-scheduled", serviceName: "Specialist Doctor Consultation" },
    ],
  },

  logistics: {
    id: "logistics",
    name: "Logistics & Delivery",
    description: "Last-Mile Delivery, Freight Forwarding, Shipment Tracking, and Warehousing.",
    serviceAreas: [
      { name: "Parcel Delivery & Courier", description: "Last-mile door delivery and express dispatch", categoryType: "dispatch" },
      { name: "Shipment Tracking & Status", description: "Waybill tracking, hub milestones, exception alerts", categoryType: "tracking" },
      { name: "Pickup & Drop-off Stations", description: "PUDO locker and branch collection points", categoryType: "operations" },
      { name: "Returns & Reverse Logistics", description: "Product return collection, merchant refund return", categoryType: "returns" },
      { name: "Customs & Freight Clearance", description: "Cross-border tariffs, customs documentation", categoryType: "customs" },
    ],
    products: [
      { name: "Same-Day Express Parcel", description: "Guaranteed 4-hour intra-city delivery", serviceAreaName: "Parcel Delivery & Courier" },
      { name: "Standard Regional Freight", description: "Economical 48-hour road freight service", serviceAreaName: "Parcel Delivery & Courier" },
    ],
    services: [
      { name: "Doorstep Parcel Delivery", description: "Courier delivery to customer residential/business address", serviceAreaName: "Parcel Delivery & Courier" },
      { name: "Return Item Collection", description: "Courier pickup of returned merchandise", serviceAreaName: "Returns & Reverse Logistics" },
      { name: "Shipment Rerouting Request", description: "Updating delivery address after dispatch", serviceAreaName: "Shipment Tracking & Status" },
    ],
    issueCategories: [
      { name: "Delivery Delayed / Courier No-Show", description: "Driver missed scheduled delivery window without contact", serviceName: "Doorstep Parcel Delivery" },
      { name: "Package Marked Delivered but Not Received", description: "Tracking says completed but customer received nothing", serviceName: "Doorstep Parcel Delivery" },
      { name: "Item Damaged in Transit", description: "Contents broken or outer packaging torn upon arrival", serviceName: "Doorstep Parcel Delivery" },
      { name: "Failed Return Item Inspection", description: "Return collection rejected by warehouse", serviceName: "Return Item Collection" },
    ],
  },

  retail_ecommerce: {
    id: "retail_ecommerce",
    name: "Retail & E-commerce",
    description: "Orders, Product Catalogue, Payments, Order Shipping, and Returns/Refunds.",
    serviceAreas: [
      { name: "Order Processing & Checkout", description: "Cart checkout, payment gateway, order confirmation", categoryType: "sales" },
      { name: "Shipping & Fulfillment", description: "Warehouse picking, packing, and carrier handover", categoryType: "fulfillment" },
      { name: "Returns & Customer Refunds", description: "Return merchandise authorization, store credit, bank refund", categoryType: "returns" },
      { name: "Product Quality & Warranty", description: "Defective goods, replacements, manufacturer warranty", categoryType: "quality" },
    ],
    products: [
      { name: "Electronics & Smart Devices", description: "Consumer gadgets, chargers, headphones", serviceAreaName: "Product Quality & Warranty" },
      { name: "Apparel & Footwear", description: "Clothing, shoes, accessories", serviceAreaName: "Returns & Customer Refunds" },
    ],
    services: [
      { name: "Order Cancellation & Refund", description: "Canceling unfulfilled order and refunding funds", serviceAreaName: "Returns & Customer Refunds" },
      { name: "Warranty Replacement Processing", description: "Exchanging malfunctioning product within warranty", serviceAreaName: "Product Quality & Warranty" },
    ],
    issueCategories: [
      { name: "Refund Delayed to Original Payment Method", description: "Return accepted but funds not credited within SLA", serviceName: "Order Cancellation & Refund" },
      { name: "Wrong Size or Item Variant Delivered", description: "Received product does not match order specification", serviceName: "Warranty Replacement Processing" },
      { name: "Item Malfunction on Delivery (DOA)", description: "Product received defective right out of the box", serviceName: "Warranty Replacement Processing" },
    ],
  },

  utilities: {
    id: "utilities",
    name: "Utilities (Power & Water Supply)",
    description: "Grid Supply, Smart Meters, Token Vending, Pipe Repair, and Field Technicians.",
    serviceAreas: [
      { name: "Grid & Supply Continuity", description: "Feeder lines, transformers, main pipe lines, pressure", categoryType: "grid" },
      { name: "Metering & Token Vending", description: "Smart meters, prepayment vending, tariff tokens", categoryType: "metering" },
      { name: "New Connection & Meter Move", description: "Service installation, inspection, pole erection", categoryType: "connections" },
      { name: "Emergency Field Maintenance", description: "Repair crews for pipe burst, fallen pole, sparks", categoryType: "emergency" },
    ],
    products: [
      { name: "Single-Phase Smart Prepaid Meter", description: "Split-unit STS prepaid energy meter", serviceAreaName: "Metering & Token Vending" },
      { name: "Domestic Water Flow Meter", description: "Volumetric brass domestic water meter", serviceAreaName: "Metering & Token Vending" },
    ],
    services: [
      { name: "Prepaid Electricity Token Generation", description: "Vending 20-digit token against meter number", serviceAreaName: "Metering & Token Vending" },
      { name: "Emergency Outage Dispatch", description: "Deploying field crew to resolve blackout or burst", serviceAreaName: "Emergency Field Maintenance" },
      { name: "Tampered Meter Inspection", description: "Clearing tamper lockout error code", serviceAreaName: "Metering & Token Vending" },
    ],
    issueCategories: [
      { name: "Token Purchase Deduction without Token Code", description: "Customer charged on mobile money but received no STS token", serviceName: "Prepaid Electricity Token Generation" },
      { name: "Transformer Trip / Unplanned Area Blackout", description: "Entire neighborhood without power over 4 hours", serviceName: "Emergency Outage Dispatch" },
      { name: "Smart Meter Tamper Lock (Error 30)", description: "Meter display shows lockout and cuts supply", serviceName: "Tampered Meter Inspection" },
    ],
  },
};


export const CATALOGUE_ENTITIES = {
  service_area: { table: "company_service_areas", key: "serviceAreas", label: "Service area" },
  product: { table: "company_products", key: "products", label: "Product" },
  service: { table: "company_services", key: "services", label: "Service" },
  issue_category: { table: "issue_categories", key: "issueCategories", label: "Issue category" },
} as const;
export type CatalogueEntityType = keyof typeof CATALOGUE_ENTITIES;
export type CatalogueItem = CompanyServiceArea | CompanyProduct | CompanyService | CompanyIssueCategory;
export type CatalogueInput = {
  name?: string; description?: string | null; isActive?: boolean; categoryType?: string;
  parentId?: string | null; productCategoryId?: string | null; serviceCategoryId?: string | null;
  serviceId?: string | null; sku?: string | null; metadata?: Record<string, unknown>;
};
export function isCatalogueEntity(value: unknown): value is CatalogueEntityType {
  return typeof value === "string" && Object.hasOwn(CATALOGUE_ENTITIES, value);
}
export function catalogueInputError(value: unknown, creating = false): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Catalogue data must be an object.";
  const data = value as Record<string, unknown>;
  if (creating && (typeof data.name !== "string" || !data.name.trim())) return "Enter a name.";
  if (data.name !== undefined && (typeof data.name !== "string" || !data.name.trim() || data.name.trim().length > 160)) return "Names must contain 1–160 characters.";
  for (const key of ["description", "sku", "categoryType"]) {
    if (data[key] != null && (typeof data[key] !== "string" || (data[key] as string).length > 4000)) return "Descriptions and labels must be text, up to 4,000 characters.";
  }
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") return "Active status must be true or false.";
  for (const key of ["parentId", "productCategoryId", "serviceCategoryId", "serviceId"]) {
    if (data[key] != null && (typeof data[key] !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data[key] as string))) return "Choose a valid catalogue relationship.";
  }
  if (data.metadata !== undefined && (!data.metadata || typeof data.metadata !== "object" || Array.isArray(data.metadata))) return "Metadata must be an object.";
  if (!creating && !Object.keys(data).some(key => ["name","description","isActive","categoryType","parentId","productCategoryId","serviceCategoryId","serviceId","sku","metadata"].includes(key))) return "No catalogue changes supplied.";
  return null;
}

/** Active, scoped catalogue is the only authority for AI references. */
export function validateCatalogueClassification(catalogue: CompanyCatalogue, raw: unknown) {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  let invalid = false;
  const resolve = <T extends {id: string; name: string; isActive: boolean}>(rows: T[], input: unknown): T | null => {
    if (!input || typeof input !== "object") return null;
    const ref = input as {id?: unknown; name?: unknown};
    if (!ref.id && !ref.name) return null;
    const row = ref.id ? rows.find(row => row.id === ref.id && row.isActive)
      : rows.find(row => row.isActive && typeof ref.name === "string" && row.name.toLowerCase() === ref.name.trim().toLowerCase());
    if (!row) invalid = true;
    return row || null;
  };
  const resolveMany = <T extends {id: string; name: string; isActive: boolean}>(rows: T[], many: unknown, single: unknown) => {
    const refs = [single, ...(Array.isArray(many) ? many.slice(0, 20) : [])];
    return Array.from(new Map(refs.map(ref => resolve(rows, ref)).filter((row): row is T => Boolean(row)).map(row => [row.id,row])).values());
  };
  const products = resolveMany(catalogue.products, value.products, value.product);
  const services = resolveMany(catalogue.services, value.services, value.service);
  const serviceAreas = resolveMany(catalogue.serviceAreas, value.service_areas, value.service_area);
  for (const areaId of [...products.map(p => p.productCategoryId), ...services.map(s => s.serviceCategoryId)]) {
    const area = catalogue.serviceAreas.find(a => a.id === areaId && a.isActive);
    if (area && !serviceAreas.some(a => a.id === area.id)) serviceAreas.push(area);
  }
  const category = resolve(catalogue.issueCategories, value.issue_category_id ? {id: value.issue_category_id} : typeof value.issue_category === "string" ? {name: value.issue_category} : value.issue_category);
  const confidence = typeof value.classification_confidence === "number" && Number.isFinite(value.classification_confidence) ? Math.max(0,Math.min(1,value.classification_confidence)) : 0;
  const matched = Boolean(products.length || services.length || serviceAreas.length || category);
  const status = matched ? "classified" : value.classification_status === "general_inquiry" ? "general_inquiry" : "unknown";
  const suggestion = value.suggested_new_entry && typeof value.suggested_new_entry === "object" ? value.suggested_new_entry as Record<string,unknown> : null;
  return { products, services, serviceAreas, issueCategory: category, confidence, status,
    requiresReview: invalid || confidence < .65 || value.requires_review === true || status === "unknown",
    suggestedEntry: suggestion && ["product","service","service_area"].includes(String(suggestion.type)) && typeof suggestion.name === "string" ? {type:String(suggestion.type),name:suggestion.name.slice(0,160),description:typeof suggestion.description === "string" ? suggestion.description.slice(0,4000) : ""} : null };
}

function starter(id:string,name:string,areas:string[],services:string[]):IndustryStarterTemplate {
  return {id,name,description:`Optional suggestions for ${name.toLowerCase()}. Review and customize every entry.`,serviceAreas:areas.map(name=>({name,description:`${name} operations and customer requests.`,categoryType:"operations"})),products:[],services:services.map((name,index)=>({name,description:`Customer support for ${name.toLowerCase()}.`,serviceAreaName:areas[index%areas.length]})),issueCategories:[]};
}
INDUSTRY_STARTER_TEMPLATES.insurance=starter("insurance","Insurance",["Policies","Claims","Premiums","Renewals"],["Policy support","Claim processing","Premium payments","Policy renewal"]);
INDUSTRY_STARTER_TEMPLATES.hospitality=starter("hospitality","Hospitality",["Reservations","Guest services","Rooms","Dining"],["Booking support","Guest assistance","Housekeeping","Restaurant reservations"]);
