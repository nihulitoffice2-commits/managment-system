# ניהולית - Campaign Manager System Prompt

## 📋 System Overview
**Nihulit** is a comprehensive campaign & project management application built with React + TypeScript + Vite. It's designed for Israeli non-profits and organizations to manage campaigns, projects, tasks, finances, and team members.

---

## 🏗️ Architecture & Structure

### Technology Stack
- **Frontend Framework**: React 19.2.3
- **Routing**: React Router DOM 6.22.3
- **Build Tool**: Vite 6.2.0
- **Charts & Visualization**: Recharts 2.12.2
- **Styling**: Tailwind CSS
- **Language**: TypeScript 5.8
- **Direction**: RTL (Hebrew support)

### Project Structure
```
nihulit-campaign-manager/
├── App.tsx                    # Main app component with routing & sidebar
├── DataContext.tsx            # Global state management using React Context
├── types.ts                   # TypeScript interfaces & enums
├── constants.tsx              # Icons & color constants
├── firebase.ts                # Firebase configuration (if needed)
├── dateUtils.ts               # Date utility functions
├── metadata.json              # App metadata
├── index.tsx                  # Entry point
├── index.html                 # HTML template
├── components/
│   └── Modal.tsx              # Reusable modal component
├── pages/                     # Page components
│   ├── Dashboard.tsx          # Main dashboard with KPIs
│   ├── Projects.tsx           # Project management
│   ├── Tasks.tsx              # Task management
│   ├── Kanban.tsx             # Kanban board view
│   ├── Calendar.tsx           # Calendar view of tasks
│   ├── Gantt.tsx              # Gantt chart view
│   ├── Payments.tsx           # Financial tracking
│   ├── Reports.tsx            # Reports & analytics
│   ├── Contacts.tsx           # Contact management
│   ├── Organizations.tsx      # Organization management
│   ├── UsersManagement.tsx    # User access control
│   └── Settings.tsx           # App settings
└── utils/
    └── dateUtils.ts           # Date manipulation utilities
```

---

## 🔑 Core Data Models

### 1. **User** (Auth & Permissions)
```typescript
User {
  id: string
  name: string
  username: string
  email: string
  role: UserRole (sys_admin | pm_admin | worker | viewer)
  organizationId: string
  active: boolean
  accessibleProjects?: string[]  // Project IDs user can access
}
```

### 2. **Organization**
```typescript
Organization {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  status: 'active' | 'inactive'
  notes?: string
}
```

### 3. **Project** (Campaign)
```typescript
Project {
  id: string
  organizationId: string
  name: string
  managerId: string
  
  // Manager Details
  orgManagerName?: string
  orgManagerPhone?: string
  orgManagerEmail?: string
  
  // Project Type & Status
  type: ProjectType (גיוס תרומות | דיגיטל | טלפוני | מדיה | משולב | אסטרטגיה)
  status: ProjectStatus (בתכנון | פעיל | בהשהיה | הושלם | בוטל)
  
  // Scheduling
  plannedStartDate: string
  plannedEndDate: string
  actualStartDate?: string
  actualEndDate?: string
  
  // Financial Tracking
  financialGoal: number           // Target donation amount
  projectTotalCost: number        // Total project cost
  projectPaidAmount: number       // Already paid amount
  projectPaymentNotes?: string
  plannedBudget: number
  actualBudget: number
  
  // Metadata
  description?: string
  projectNotes?: string
  isDeleted?: boolean
}
```

### 4. **Task** (Item/Phase/Subtask)
```typescript
Task {
  id: string
  projectId: string
  organizationId: string
  parentId?: string              // For hierarchies
  
  // Task Definition
  itemType: TaskItemType (שלב | משימה | תת-משימה)
  name: string
  role?: string
  category: TaskCategory (אסטרטגיה | אפיון קמפיין | קריאייטיב | תוכן | מדיה | ספקים | תפעול | כספים | דוחות | בקרה)
  
  // Assignment & Performance
  assignees: string[]            // User IDs
  performerContactId?: string    // From Contacts list
  priority: TaskPriority (נמוכה | בינונית | גבוהה | דחוף)
  status: TaskStatus (טרם התחיל | בתהליך | תקוע | הושלם | בוטל)
  progress: number               // 0-100%
  
  // Dependencies & Scheduling
  dependencies: string[]         // Task IDs this depends on
  schedulingMode: SchedulingMode (תאריך קבוע | לאחר סיום משימה | יחד עם התחלת משימה)
  workDays: number              // Estimated duration
  
  // Dates
  plannedStartDate: string
  plannedEndDate: string
  actualStartDate?: string
  actualEndDate?: string
  
  // Issues & Notes
  hasIssue: boolean
  issueDetail?: string
  notes?: string
}
```

### 5. **Payment** (Financial Record)
```typescript
Payment {
  id: string
  projectId: string
  organizationId: string
  taskId?: string
  
  type: PaymentType (הכנסה | הוצאה)
  category: string
  plannedAmount: number
  actualAmount: number
  plannedDate: string
  actualDate?: string
  status: PaymentStatus (מתוכנן | חשבונית הוצאה | שולם | שולם חלקית | באיחור | בוטל)
  
  reference?: string
  notes?: string
}
```

### 6. **Contact** (Team Member/Supplier)
```typescript
Contact {
  id: string
  projectId: string
  organizationId: string
  name: string
  phone: string
  email: string
  title: string
  notes?: string
}
```

---

## 🌐 Global State Management (DataContext)

### Context Type
```typescript
DataContextType {
  // State
  currentUser: User | null
  projects: Project[]            // Filtered by user access
  tasks: Task[]                  // Filtered by accessible projects
  payments: Payment[]
  users: User[]
  contacts: Contact[]
  
  // Operations
  addProject(p: Project): Promise<void>
  updateProject(id: string, p: Partial<Project>): Promise<void>
  deleteProject(id: string): Promise<void>
  
  addTask(t: Task): Promise<void>
  updateTask(id: string, t: Partial<Task>): Promise<void>
  delesk(id: string): Promise<void>
  
  addPayment(p: Payment): Promise<void>
  updatePayment(id: string, p: Partial<Payment>): Promise<void>
  deletePayment(id: string): Promise<void>
  
  addUser(u: User): Promise<void>
  updateUser(id: string, u: Partial<User>): Promise<void>
  deleteUser(id: string): Promise<void>
  
  addContact(c: Contact): Promise<void>
  updateContact(id: string, c: Partial<Contact>): Promise<void>
  deleteContact(id: string): Promise<void>
}
```

### Features
- **Access Control**: Projects filtered by `currentUser.role` and `accessibleProjects`
- **Soft Deletes**: Projects use `isDeleted` flag
- **Task Hierarchies**: Tasks support parent-child relationships
- **Async Operations**: All mutations are async (prepared for backend integration)
- **Mock Data**: Initial seed data loaded on app startup

---

## 🎨 UI Components & Pages

### Sidebar Navigation
- 📊 Dashboard - Main KPI overview
- 📋 Projects - Campaign management
- ✓ Tasks - Task tracking
- 🗂️ Kanban - Kanban board view
- 📅 Calendar - Calendar view
- 📊 Gantt - Gantt chart
- 💰 Payments - Financial tracking
- 📈 Reports - Analytics & reporting
- 👥 Contacts - Contact management
- 🏢 Organizations - Org management
- 👤 Users Management - Access control (Admin only)
- ⚙️ Settings - App settings

### Layout
- **Sidebar**: 256px dark slate (RTL)
- **Main Header**: 64px white with dynamic page title
- **Content Area**: Flex-1 with custom scrollbar
- **User Profile**: Bottom sidebar with logout button

### Reusable Components
- `Modal.tsx` - Generic modal for forms/dialogs

### Design System
- **Primary Color**: #2563eb (Blue)
- **Secondary**: #64748b (Slate)
- **Success**: #22c55e (Green)
- **Warning**: #f59e0b (Amber)
- **Danger**: #ef4444 (Red)
- **Info**: #3b82f6 (Light Blue)

---

## 👥 User Roles & Permissions

| Role | Permissions |
|------|------------|
| **sys_admin** | Full access to all projects, user management |
| **pm_admin** | Full access to assigned projects |
| **worker** | Can view & edit assigned tasks |
| **viewer** | Read-only access to assigned projects |

---

## 🔄 Key Features & Workflows

### 1. Project Management
- Create, edit, delete campaigns/projects
- Track financial goals vs. actual costs
- Monitor project status and timeline
- Support multiple project types (fundraising, digital, etc.)

### 2. Task Management
- Hierarchical task structure (Phase → Task → Subtask)
- Task dependencies & scheduling modes
- Progress tracking and status updates
- Issue tracking with detail notes
- Multiple assignees per task
- Category-based organization

### 3. Financial Tracking
- Income & expense tracking
- Payment status management
- Invoice tracking
- Budget vs. actual comparison

### 4. Visualization
- **Dashboard**: KPI cards and charts
- **Kanban**: Task workflow board
- **Calendar**: Time-based task view
- **Gantt**: Project timeline view
- **Reports**: Analytics & reporting

### 5. Team Management
- User creation & role assignment
- Project access control
- Contact/supplier management

---

## 🔌 Integration Points

### Firebase (Ready for Integration)
- `firebase.ts` contains configuration
- Supports authentication & data persistence
- Ready to replace local state with Firestore

### API Pattern
```typescript
// All operations are prepared for async backend integration
const addProject = async (p: Project) => {
  // Currently: Local state update
  // Future: POST to backend
};
```

---

## 🎯 Current State (MVP)

### Implemented
✅ Routing structure  
✅ Role-based access control  
✅ Global state management  
✅ UI layout & sidebar  
✅ Data models & types  
✅ Mock data seeding  

### To Build
⏳ Page implementations  
⏳ Forms & CRUD operations  
⏳ Charts & visualizations  
⏳ Firebase integration  
⏳ Data validation  
⏳ Error handling  
⏳ Notifications  

---

## 📱 Responsive Design

- **Min Width**: Sidebar + Main content
- **Direction**: RTL (Hebrew text)
- **Tailwind CSS**: Utility-first styling
- **Custom Scrollbars**: `custom-scrollbar` class

---

## 🚀 Running the Application

```bash
# Install dependencies
npm install --legacy-peer-deps

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📝 Notes

- **Language**: Hebrew (עברית)
- **Direction**: Right-to-left (RTL)
- **Time Zone**: Israel Standard Time
- **Currency**: Israeli Shekel (₪)
- **Mock User**: ישראל ישראלי (admin@nihulit.co.il) with SYS_ADMIN role

---

## 🔐 Security Considerations

- Implement JWT authentication
- Secure Firebase rules
- Role-based access on backend
- Sanitize user input
- HTTPS in production
- CSRF protection

---

## 🎓 Development Guidelines

1. **Components**: Keep pages in `/pages`, reusables in `/components`
2. **State**: Use `useData()` hook from DataContext
3. **Types**: Import from `types.ts`
4. **Styling**: Use Tailwind CSS with RTL support
5. **Icons**: Use ICONS from `constants.tsx`
6. **Dates**: Use utilities from `dateUtils.ts`

