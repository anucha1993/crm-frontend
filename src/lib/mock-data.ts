// ===== MOCK DATA FOR CRM SYSTEM =====

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "active" | "inactive" | "lead";
  createdAt: string;
  avatar: string;
  totalDeals: number;
  totalValue: number;
}

export interface Deal {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  value: number;
  stage: "lead" | "contact" | "proposal" | "negotiation" | "closed-won" | "closed-lost";
  probability: number;
  createdAt: string;
  expectedCloseDate: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in-progress" | "done";
  dueDate: string;
  relatedCustomer?: string;
}

export interface Activity {
  id: string;
  type: "call" | "email" | "meeting" | "note" | "deal";
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

// ----- Customers -----
export const customers: Customer[] = [
  { id: "C001", name: "สมชาย วงศ์สวัสดิ์", email: "somchai@example.com", phone: "081-234-5678", company: "บริษัท เอบีซี จำกัด", status: "active", createdAt: "2025-12-01", avatar: "SC", totalDeals: 3, totalValue: 1500000 },
  { id: "C002", name: "สุดา พรหมรักษ์", email: "suda@example.com", phone: "089-876-5432", company: "บริษัท ดีอีเอฟ จำกัด", status: "active", createdAt: "2025-11-15", avatar: "SP", totalDeals: 2, totalValue: 850000 },
  { id: "C003", name: "วิชัย ศรีสุข", email: "wichai@example.com", phone: "062-345-6789", company: "บริษัท จีเอชไอ จำกัด", status: "lead", createdAt: "2026-01-10", avatar: "WS", totalDeals: 1, totalValue: 320000 },
  { id: "C004", name: "นิตยา แก้วมณี", email: "nittaya@example.com", phone: "095-111-2233", company: "บริษัท เจเคแอล จำกัด", status: "active", createdAt: "2025-10-20", avatar: "NK", totalDeals: 5, totalValue: 2800000 },
  { id: "C005", name: "ประเสริฐ จันทร์ดี", email: "prasert@example.com", phone: "084-555-6677", company: "บริษัท เอ็มเอ็นโอ จำกัด", status: "inactive", createdAt: "2025-08-05", avatar: "PJ", totalDeals: 1, totalValue: 150000 },
  { id: "C006", name: "อรุณี ภูมิพัฒน์", email: "arunee@example.com", phone: "091-222-3344", company: "บริษัท พีคิวอาร์ จำกัด", status: "lead", createdAt: "2026-02-14", avatar: "AP", totalDeals: 0, totalValue: 0 },
  { id: "C007", name: "ธนากร เลิศวิทย์", email: "thanakorn@example.com", phone: "086-999-8877", company: "บริษัท เอสทียู จำกัด", status: "active", createdAt: "2025-09-25", avatar: "TL", totalDeals: 4, totalValue: 1950000 },
  { id: "C008", name: "พิมพ์ใจ รัตนวงศ์", email: "pimjai@example.com", phone: "063-444-5566", company: "บริษัท วีดับเบิ้ลยูเอ็กซ์ จำกัด", status: "active", createdAt: "2025-11-30", avatar: "PR", totalDeals: 2, totalValue: 720000 },
];

// ----- Deals -----
export const deals: Deal[] = [
  { id: "D001", title: "ระบบ ERP สำหรับบริษัท ABC", customerId: "C001", customerName: "สมชาย วงศ์สวัสดิ์", value: 750000, stage: "negotiation", probability: 70, createdAt: "2026-01-05", expectedCloseDate: "2026-04-15" },
  { id: "D002", title: "อัพเกรดระบบ CRM", customerId: "C002", customerName: "สุดา พรหมรักษ์", value: 450000, stage: "proposal", probability: 50, createdAt: "2026-01-20", expectedCloseDate: "2026-05-01" },
  { id: "D003", title: "พัฒนาเว็บไซต์ใหม่", customerId: "C003", customerName: "วิชัย ศรีสุข", value: 320000, stage: "lead", probability: 20, createdAt: "2026-02-01", expectedCloseDate: "2026-06-30" },
  { id: "D004", title: "ระบบจัดการคลังสินค้า", customerId: "C004", customerName: "นิตยา แก้วมณี", value: 1200000, stage: "closed-won", probability: 100, createdAt: "2025-10-15", expectedCloseDate: "2026-02-28" },
  { id: "D005", title: "แอปพลิเคชันมือถือ", customerId: "C001", customerName: "สมชาย วงศ์สวัสดิ์", value: 500000, stage: "contact", probability: 30, createdAt: "2026-02-10", expectedCloseDate: "2026-07-15" },
  { id: "D006", title: "ระบบ BI Dashboard", customerId: "C007", customerName: "ธนากร เลิศวิทย์", value: 680000, stage: "proposal", probability: 60, createdAt: "2026-01-25", expectedCloseDate: "2026-04-30" },
  { id: "D007", title: "ระบบ POS", customerId: "C004", customerName: "นิตยา แก้วมณี", value: 380000, stage: "negotiation", probability: 80, createdAt: "2026-02-05", expectedCloseDate: "2026-03-31" },
  { id: "D008", title: "ที่ปรึกษาไอที", customerId: "C008", customerName: "พิมพ์ใจ รัตนวงศ์", value: 200000, stage: "closed-lost", probability: 0, createdAt: "2025-11-10", expectedCloseDate: "2026-01-31" },
  { id: "D009", title: "ระบบ HR Online", customerId: "C002", customerName: "สุดา พรหมรักษ์", value: 400000, stage: "lead", probability: 15, createdAt: "2026-03-01", expectedCloseDate: "2026-08-15" },
  { id: "D010", title: "Cloud Migration", customerId: "C007", customerName: "ธนากร เลิศวิทย์", value: 900000, stage: "contact", probability: 40, createdAt: "2026-02-20", expectedCloseDate: "2026-06-30" },
];

// ----- Tasks -----
export const tasks: Task[] = [
  { id: "T001", title: "โทรติดตามลูกค้า ABC", description: "โทรสอบถามความคืบหน้าเรื่อง ERP", assignee: "สมศักดิ์", priority: "high", status: "todo", dueDate: "2026-03-12", relatedCustomer: "สมชาย วงศ์สวัสดิ์" },
  { id: "T002", title: "เตรียมเอกสาร Proposal", description: "จัดทำ proposal สำหรับโปรเจกต์ CRM อัพเกรด", assignee: "วรรณา", priority: "urgent", status: "in-progress", dueDate: "2026-03-11", relatedCustomer: "สุดา พรหมรักษ์" },
  { id: "T003", title: "ประชุมทีมขาย", description: "ประชุมสรุปยอดขายประจำเดือน", assignee: "สมศักดิ์", priority: "medium", status: "todo", dueDate: "2026-03-15" },
  { id: "T004", title: "ส่งใบเสนอราคา POS", description: "ส่งใบเสนอราคาระบบ POS ให้ลูกค้า", assignee: "อนุชา", priority: "high", status: "in-progress", dueDate: "2026-03-10", relatedCustomer: "นิตยา แก้วมณี" },
  { id: "T005", title: "อัพเดทข้อมูลลูกค้า", description: "อัพเดทข้อมูลติดต่อลูกค้ากลุ่ม inactive", assignee: "วรรณา", priority: "low", status: "done", dueDate: "2026-03-08" },
  { id: "T006", title: "Demo ระบบ BI", description: "นำเสนอ demo ระบบ BI Dashboard", assignee: "สมศักดิ์", priority: "high", status: "todo", dueDate: "2026-03-18", relatedCustomer: "ธนากร เลิศวิทย์" },
  { id: "T007", title: "ติดตามการชำระเงิน", description: "ติดตามเรื่องการชำระเงินงวดแรก", assignee: "อนุชา", priority: "medium", status: "todo", dueDate: "2026-03-20", relatedCustomer: "นิตยา แก้วมณี" },
  { id: "T008", title: "จัดทำรายงานรายเดือน", description: "สรุปรายงานยอดขายเดือนกุมภาพันธ์", assignee: "วรรณา", priority: "medium", status: "done", dueDate: "2026-03-05" },
];

// ----- Activities -----
export const activities: Activity[] = [
  { id: "A001", type: "call", title: "โทรหา สมชาย วงศ์สวัสดิ์", description: "พูดคุยเรื่องความต้องการระบบ ERP เพิ่มเติม", timestamp: "2026-03-10T09:30:00", user: "สมศักดิ์" },
  { id: "A002", type: "email", title: "ส่งอีเมลเสนอราคา", description: "ส่งใบเสนอราคาระบบ CRM อัพเกรดให้ สุดา", timestamp: "2026-03-09T14:15:00", user: "วรรณา" },
  { id: "A003", type: "meeting", title: "ประชุมกับทีม GHI", description: "ประชุมเพื่อรับ requirement เว็บไซต์ใหม่", timestamp: "2026-03-08T10:00:00", user: "สมศักดิ์" },
  { id: "A004", type: "deal", title: "ปิดดีล ระบบคลังสินค้า", description: "ปิดดีลสำเร็จ มูลค่า 1,200,000 บาท", timestamp: "2026-03-07T16:45:00", user: "อนุชา" },
  { id: "A005", type: "note", title: "บันทึกข้อมูลลูกค้าใหม่", description: "บันทึกข้อมูล อรุณี ภูมิพัฒน์ จากงาน Tech Expo", timestamp: "2026-03-06T11:20:00", user: "วรรณา" },
  { id: "A006", type: "call", title: "โทรหา ธนากร เลิศวิทย์", description: "นัดหมาย demo ระบบ BI Dashboard", timestamp: "2026-03-05T15:00:00", user: "สมศักดิ์" },
];

// ----- Dashboard Stats -----
export const dashboardStats = {
  totalCustomers: customers.length,
  activeCustomers: customers.filter((c) => c.status === "active").length,
  totalDeals: deals.length,
  openDeals: deals.filter((d) => !d.stage.startsWith("closed")).length,
  totalRevenue: deals.filter((d) => d.stage === "closed-won").reduce((sum, d) => sum + d.value, 0),
  pipelineValue: deals.filter((d) => !d.stage.startsWith("closed")).reduce((sum, d) => sum + d.value, 0),
  tasksDue: tasks.filter((t) => t.status !== "done").length,
  conversionRate: Math.round((deals.filter((d) => d.stage === "closed-won").length / deals.length) * 100),
};

// ----- Pipeline stages for Kanban -----
export const pipelineStages = [
  { key: "lead", label: "Lead", color: "bg-gray-400" },
  { key: "contact", label: "ติดต่อแล้ว", color: "bg-blue-400" },
  { key: "proposal", label: "เสนอราคา", color: "bg-yellow-400" },
  { key: "negotiation", label: "เจรจาต่อรอง", color: "bg-orange-400" },
  { key: "closed-won", label: "ปิดดีลสำเร็จ", color: "bg-green-500" },
  { key: "closed-lost", label: "ปิดดีลไม่สำเร็จ", color: "bg-red-400" },
] as const;

// ----- Helper functions -----
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "bg-green-100 text-green-700";
    case "inactive": return "bg-gray-100 text-gray-600";
    case "lead": return "bg-blue-100 text-blue-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "active": return "ใช้งาน";
    case "inactive": return "ไม่ใช้งาน";
    case "lead": return "ลูกค้าเป้าหมาย";
    default: return status;
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "urgent": return "bg-red-100 text-red-700";
    case "high": return "bg-orange-100 text-orange-700";
    case "medium": return "bg-yellow-100 text-yellow-700";
    case "low": return "bg-green-100 text-green-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case "urgent": return "เร่งด่วน";
    case "high": return "สูง";
    case "medium": return "ปานกลาง";
    case "low": return "ต่ำ";
    default: return priority;
  }
}

export function getTaskStatusLabel(status: string): string {
  switch (status) {
    case "todo": return "รอดำเนินการ";
    case "in-progress": return "กำลังดำเนินการ";
    case "done": return "เสร็จแล้ว";
    default: return status;
  }
}

export function getTaskStatusColor(status: string): string {
  switch (status) {
    case "todo": return "bg-gray-100 text-gray-700";
    case "in-progress": return "bg-blue-100 text-blue-700";
    case "done": return "bg-green-100 text-green-700";
    default: return "bg-gray-100 text-gray-600";
  }
}
