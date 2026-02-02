
export enum UserRole {
  SYS_ADMIN = 'sys_admin',
  PM_ADMIN = 'pm_admin',
  WORKER = 'worker',
  VIEWER = 'viewer'
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string; // Hashed password (optional for backward compatibility)
  role: UserRole;
  organizationId: string;
  active: boolean;
  accessibleProjects?: string[]; // Project IDs user can see/edit
}

export interface Organization {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  notes?: string;
}

export enum ProjectType {
  FUNDRAISING = 'גיוס תרומות',
  DIGITAL = 'דיגיטל',
  TELEPHONE = 'טלפוני',
  MEDIA = 'מדיה',
  COMBINED = 'משולב',
  STRATEGY = 'אסטרטגיה / תכנון'
}

export enum ProjectStatus {
  PLANNING = 'בתכנון',
  ACTIVE = 'פעיל',
  ON_HOLD = 'בהשהיה',
  COMPLETED = 'הושלם',
  CANCELLED = 'בוטל'
}

export interface Contact {
  id: string;
  projectId?: string;
  projectIds?: string[]; // Multiple project associations (or ['all'])
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  title: string;
  notes?: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  managerId: string;
  
  // New Fields Requested
  orgManagerName?: string;
  orgManagerPhone?: string;
  orgManagerEmail?: string;
  
  type: ProjectType;
  status: ProjectStatus;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  financialGoal: number;
  projectTotalCost: number;     
  projectPaidAmount: number;    
  projectPaymentNotes?: string; 
  projectNotes?: string;        
  plannedBudget: number; 
  actualBudget: number;  
  description?: string;
  color?: string; // Hex color for the project (e.g., '#FF6B6B')
  isDeleted?: boolean;
}

export enum TaskItemType {
  PHASE = 'שלב',
  TASK = 'משימה',
  SUB_TASK = 'תת-משימה'
}

export enum TaskCategory {
  STRATEGY = 'אסטרטגיה',
  SPECIFICATION = 'אפיון קמפיין',
  CREATIVE = 'קריאייטיב',
  CONTENT = 'תוכן',
  MEDIA = 'מדיה / פרסום',
  SUPPLIERS = 'ספקים',
  OPERATIONS = 'תפעול',
  FINANCE = 'כספים',
  REPORTS = 'דוחות',
  CONTROL = 'בקרה'
}

export enum TaskStatus {
  NOT_STARTED = 'טרם התחיל',
  IN_PROGRESS = 'בתהליך',
  BLOCKED = 'תקוע',
  DONE = 'הושלם',
  CANCELLED = 'בוטל'
}

export enum TaskPriority {
  LOW = 'נמוכה',
  MEDIUM = 'בינונית',
  HIGH = 'גבוהה',
  URGENT = 'דחוף'
}

export enum SchedulingMode {
  FIXED = 'תאריך קבוע', 
  AFTER_PARENT_FINISH = 'לאחר סיום משימה', 
  WITH_PARENT_START = 'יחד עם התחלת משימה' 
}

export interface Task {
  id: string;
  projectId: string;
  organizationId: string;
  parentId?: string;
  itemType: TaskItemType;
  name: string;
  description?: string;
  role?: string;
  category: TaskCategory;
  assignees: string[]; 
  performerContactId?: string; // New: Performer from Contacts list
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  dependencies: string[];
  
  schedulingMode: SchedulingMode;
  parentTaskId?: string;
  dependsOnTaskId?: string; // ID של המשימה הקודמת שעל השלמתה תלויה משימה זו
  workDays: number;
  
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  notes?: string;

  hasIssue: boolean;
  issueDetail?: string;
}

export enum PaymentType {
  INCOME = 'הכנסה',
  EXPENSE = 'הוצאה'
}

export enum PaymentStatus {
  PLANNED = 'מתוכנן',
  INVOICED = 'חשבונית הוצאה',
  PAID = 'שולם',
  PARTIALLY_PAID = 'שולם חלקית',
  OVERDUE = 'באיחור',
  CANCELLED = 'בוטל'
}

export interface Payment {
  id: string;
  projectId: string;
  organizationId: string;
  taskId?: string;
  type: PaymentType;
  category: string;
  plannedAmount: number;
  actualAmount: number;
  plannedDate: string;
  actualDate?: string;
  status: PaymentStatus;
  reference?: string;
  notes?: string;
}

export interface Meeting {
  id: string;
  projectId?: string;
  organizationId: string;
  contactId?: string;
  title: string;
  date: string;
  time?: string;
  notes?: string;
}
