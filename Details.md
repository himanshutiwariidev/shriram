# Bharat Bizmart CRM — Features & Functions Reference

## Application Overview

**Bharat Bizmart CRM** is a full-stack internal CRM built on the MERN stack (MongoDB, Express 5, React/Vite, Node.js). It manages clients, projects, tasks, attendance, leaves, and salaries for the Bharat Bizmart team.

- **Backend**: Node.js + Express 5, running on port `4050`
- **Frontend**: React 18 + Vite, running on port `5173`
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT (HttpOnly cookie + Bearer token, dual-source)

---

## User Roles

| Role | Access Level |
|---|---|
| `admin` | Full access — all modules, all data |
| `hr` | Users, attendance, leaves, salary |
| `sales` | Only their assigned clients |
| `user` | Their tasks, assigned client work, leave, salary slips |
| `client` | Read-only portal view of their own project |

---

## Authentication

- **Login endpoint**: `POST /api/login` (also `POST /api/users/login` for backward compat)
- **Admin login**: Hardcoded credentials via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars. Admin DB record is auto-created on first login.
- **Normal users**: bcrypt-verified (12 rounds) against MongoDB record
- **Token**: JWT signed with `JWT_SECRET`, 1-day expiry
- **Token delivery**: HttpOnly cookie `access_token` (secure, sameSite strict) + JSON body `{ token }` for frontend localStorage (backward compatible)
- **Auth middleware**: checks cookie first, falls back to `Authorization: Bearer <token>` header
- **Timing-safe login**: dummy hash comparison prevents user-enumeration timing attacks
- **Logout**: clears the httpOnly cookie; triggers attendance logout
- **Auto-attendance**: login creates an attendance record; logout closes it

---

## Pages & Routes

| URL | Component | Roles |
|---|---|---|
| `/` | Login | Public |
| `/admin` | AdminDashboard | admin |
| `/hr` | HrDashboard (renders AdminDashboard) | hr |
| `/sales` | SalesDashboard (renders ClientsPage) | sales |
| `/dashboard` | UserDashboard | user |
| `/clients` | ClientsPage | admin, sales, user |
| `/clients/:clientId` | ClientDetailPage | admin, sales, user |
| `/client/dashboard` | ClientDashboard | client |

---

## 1. Client Management

### Client List (`/clients`)

- KPI summary cards: Total Clients, Active, Inactive
- Clickable client cards with company name, status badge, and key details
- Create new client via modal form (admin/sales only)
- Search and filter by status
- Role-scoped: `sales` sees only clients where they are the sales person; `user` sees only clients assigned to them; `admin`/`hr` sees all

### Client Form Fields

`clientName`, `companyName`, `clientEmail`, `clientPhone`, `projectName`, `address`, `city`, `state`, `country`, `website`, `projectScope`, `budgetRange`, `currency`, `projectAmount`, `projectStatus`, `salesPerson` (dropdown of real sales-role users), `assignedUser`

### Client Detail Page (`/clients/:clientId`)

Header bar: status dropdown (Active/Inactive/Lead/Prospect/Churned), active/inactive toggle, quick-action buttons (Edit, Delete, Email).

**Tabs:**

#### Overview Tab
- Full client profile card (all fields, editable inline by admin)
- Assigned user display with admin-only "Assign Task" reassignment control
- Activity log feed (mini version)

#### Proposals Tab
- List of proposals linked to this client
- Create/edit proposals with: `proposalNumber`, `projectName`, `projectDescription`, `projectScope`, `timeline`, `projectAmount`, `currency`, `paymentTerms`, `validUntil`, `proposalStatus` (draft/sent/accepted/rejected/expired)
- Deliverables sub-list per proposal
- Payment schedule sub-list per proposal
- Status workflow: Draft → Sent → Accepted/Rejected/Expired

#### Payment Reminders Tab
- Schedule and view payment reminders for the client

#### Deliverables Tab
- Track project deliverables: title, description, due date, status

#### Payments Tab
- Payment records with amount, date, payment method, status
- **PI Attachments** section at the bottom:
  - Upload button (admin only) — accepts PDF, PNG, JPG, JPEG, DOC, DOCX, XLS, XLSX (max 10 MB)
  - Attachment list showing: file type icon, original filename, size (KB), uploader name, upload date
  - Download link for each attachment
  - Delete button (admin only) — removes from disk and database

#### Remarks Tab
- Discussion feed, newest first
- Each remark: author name, role badge, timestamp, message
- Add remark form — visible only to: `admin`, the client's `salesPerson`, and the client's `assignedUser`
- Others get a 403 response from the backend

#### Work Progress Tab
- Timeline of progress updates, newest first
- Each entry: title, description, colored status badge, percentage progress bar, author, date
- Statuses: Pending / In Progress / On Hold / Waiting for Client / Completed
- Add form (admin or assigned user only): Title, Description, Status select, Percentage (0–100)
- Edit (pencil icon) — only on the **latest** entry, only by its original author or admin
- No delete — historical record is preserved

#### Activity Timeline Tab
- Chronological log of every change made to the client record
- Entry types: `created`, `updated`, `status_changed`, `proposal_added`, `payment_added`, `reminder_added`, `pi_uploaded`, `pi_deleted`, `user_assigned`, `remark_added`, `progress_updated`

---

## 2. Client Portal (`/client/dashboard`)

Read-only view for clients (role: `client`):
- Project scope and timeline
- Payment overview with amounts and status
- Latest Work Progress entry (title, status badge, percentage bar, date)
- No edit controls anywhere

---

## 3. Task Management

### Admin Side
- Create tasks: `title`, `description`, `assignedTo` (user dropdown), `priority` (low/medium/high), `dueDate`
- View all tasks in the admin dashboard
- Filter by status and priority

### User Side (UserDashboard → My Tasks tab)
- Lists all tasks assigned to the logged-in user
- Status can be updated inline: Pending → In Progress → Completed
- Overdue badge shown if `dueDate` passed and task is not completed
- **Assigned Client Work** section below tasks — clients assigned via "Assign Task" on the Client Detail page; clicking opens a `ClientTaskDetail` modal with full remarks/progress view

### Dashboard Stats (UserDashboard)
- KPI cards: Total Tasks, Completed, In Progress, Pending, Overdue
- Completion rate progress bar
- Status breakdown pie chart (Recharts)
- Tasks by priority bar chart

---

## 4. Project Management

Projects are independent of clients. Admin manages four categories:

| Category | Description |
|---|---|
| All Projects | General project listing |
| Ongoing Projects | Currently active projects |
| Credentials | Stored login credentials for client systems |
| Domain Details | Domain and hosting management |

**Project fields**: `projectCategory`, `companyName`, `domain`, `handoverdate`, `salesPerson`, `businesstype`, `assignTo`, `technology`, `deployedDate`, `developer`, `websiteDueDate`, `domainDueDate`, `platform`, `domainProvider`, `hostingProvider`, `domainOwnership`, `hostingOwnership`, `status`, `credentials[]` (userId, password, credentialType)

**CSV Export**: Admin can export any project category to CSV.

---

## 5. Attendance System

- **Auto-tracked**: attendance record opens on login, closes on logout
- Supports multiple sessions per day (`sessionId` UUID)
- Late detection: `isLate`, `lateByMinutes` fields
- `totalSessionTime` calculated on logout

### Admin / HR Features
- Dashboard view with charts
- Filter by date range and employee
- Export full attendance report to Excel (`.xlsx`)

### User Features
- View own attendance records (non-admin cannot see other users' records)
- `GET /api/attendance/user/:userId` — backend enforces own-record-only for non-admin

---

## 6. Leave Management

### User Actions
- Apply leave: `fromDate`, `toDate`, `reason`
- View own leave history with status badges (Pending/Approved/Rejected)
- See admin comment when leave is reviewed

### Admin / HR Actions
- View all leave requests, filterable by status
- Approve or reject with optional `adminComment`
- `reviewedBy` and `reviewedAt` tracked

---

## 7. Salary Management

### Admin Actions
- Select employee and fill: `basicSalary`, `homeAllowance`, `travelAllowance`, `otherAllowance`, `pf`, `deductions`, `leaves`, `salaryMonth`
- Preview calculated `inHand` = basicSalary + allowances − pf − deductions
- Pay: generates PDF salary slip (PDFKit), emails it via Nodemailer (HTML body + PDF attachment), saves `SalarySlip` record to DB with unique `slipNumber`

### User Actions
- **Salary tab** in UserDashboard shows all received salary slips
- Each slip card: month, slip number, paid date badge, 4-column breakdown (Basic / Allowances / Deductions / In Hand), detail row (Home / Travel / Other / PF / Leaves)

---

## 8. User Management (Admin / HR)

- Create user: `name`, `email`, `password`, `role` (user/hr/sales/client — admin not creatable via UI)
- Edit user: any field including password (re-hashed with bcrypt 12 rounds)
- Delete user
- View all users (admin/hr)
- Get users by role: `GET /api/users/by-role/:role` (used by dropdowns in client forms)
- `/register-admin` route exists but is protected — admin-only

---

## 9. Admin Dashboard

Sidebar-based navigation with the following sections:

| Section | What it does |
|---|---|
| Overview | KPI cards: total users, clients, tasks, projects |
| Users | CRUD for all user accounts |
| Tasks | Create/assign/manage tasks across all users |
| Clients | Link to `/clients` list page |
| Projects | 4-category project CRUD + CSV export |
| Proposals | Manage all proposals across all clients |
| Attendance | Dashboard + filter + Excel export |
| Leaves | Approve / reject leave requests |
| Salary | Pay salary + generate/email PDF slip |
| Reminders | View/manage client payment reminders |

---

## 10. HR Dashboard

Renders `<AdminDashboard />` with filtered tabs — HR sees users, attendance, leaves, and salary, but not the full admin-only project/client management sections.

---

## 11. Sales Dashboard

Sticky header (logo + logout button) + embeds `<ClientsPage />`. The backend automatically scopes the client list to `salesPerson === currentUser`, so a sales login sees only their clients.

---

## 12. Security Features

| Feature | Implementation |
|---|---|
| Security headers | Helmet (CSP disabled for SPA, frameguard: deny, HSTS 1yr+preload) |
| CORS whitelist | Origins from `CLIENT_URL` / `ADMIN_URL` env vars only |
| General rate limiting | 100 requests / 15 min per IP |
| Login rate limiting | 5 attempts / 15 min (resets on success) |
| Create-user rate limiting | 20 requests / hour |
| Input validation | express-validator chains on login, createUser, updateUser |
| NoSQL injection prevention | express-mongo-sanitize (strips `$` and `.` keys) |
| XSS protection | xss-clean (HTML-encodes user strings) |
| HTTP Parameter Pollution | hpp (collapses duplicate query/body keys) |
| Timing-safe auth | Dummy bcrypt.compare when email not found |
| Password hashing | bcrypt 12 rounds (OWASP recommendation) |
| HttpOnly cookies | access_token cookie inaccessible to JavaScript |
| Gzip compression | compression middleware |
| Request logging | Morgan (combined in production; dev skips 304s) |
| Express 5 compatibility | `Object.defineProperty` patch so sanitize middleware can write `req.query` |
| Centralized error handler | Catches Mongoose errors, JWT errors, Multer errors, CORS, malformed JSON |
| asyncHandler | Wraps all controllers so unhandled rejections flow to error handler |

---

## 13. File Uploads

- **Location**: `backend/uploads/` (served statically at `/uploads`)
- **Library**: multer v2.2.0, disk storage
- **Filename**: UUID v4 + original extension (prevents collisions and path traversal)
- **Accepted types**: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.doc`, `.docx`, `.xls`, `.xlsx`
- **Size limit**: 10 MB per file
- **Access**: public URL via `<BACKEND_BASE>/uploads/<filename>`

---

## 14. Email / SMTP

- **Library**: Nodemailer
- **Provider**: Gmail SMTP (`smtp.gmail.com:587`)
- **Usage**: salary slip delivery (HTML email + PDF attachment)
- **Config**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` env vars

---

## 15. Real-time (Optional)

- **Library**: socket.io (graceful degradation — server starts normally if not installed)
- **Event**: `socket:connected` emitted on connection with `{ id: socket.id }`
- **CORS**: currently allows all origins on the socket server

---

## 16. API Endpoint Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/login` | Public | Login (rate-limited, validated) |
| POST | `/api/logout` | Required | Logout + clear cookie |
| GET | `/` | Public | Health check |

### Users (`/api/users`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/login` | Public | Login (compat alias) |
| POST | `/logout` | Required | Logout |
| POST | `/` | admin, hr | Create user |
| GET | `/` | admin, hr | List all users |
| GET | `/by-role/:role` | admin | Users filtered by role |
| DELETE | `/:id` | admin, hr | Delete user |
| PUT | `/:id` | admin, hr | Update user |
| POST | `/register-admin` | admin | Create admin user |

### Clients (`/api/clients`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | admin, sales, user | List clients (role-scoped) |
| POST | `/` | admin, sales | Create client |
| GET | `/:id` | admin, sales, user | Client detail (ownership-checked) |
| PUT | `/:id` | admin, sales | Update client |
| DELETE | `/:id` | admin | Delete client |
| GET | `/:id/activity` | admin, sales, user | Activity timeline |
| POST | `/:id/pi-attachments` | admin, sales, user | Upload PI file |
| DELETE | `/:id/pi-attachments/:attId` | admin | Delete PI file |
| GET | `/:id/remarks` | admin, sales, user | Get remarks |
| POST | `/:id/remarks` | admin, assigned sales/user | Add remark |
| GET | `/:id/work-progress` | admin, sales, user, client | Get work progress |
| POST | `/:id/work-progress` | admin, assigned user | Add progress entry |
| PUT | `/:id/work-progress/:entryId` | admin, entry author | Edit latest entry |
| PUT | `/:id/assign` | admin | Assign user to client |

### Tasks (`/api/tasks`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/my-tasks` | Required | Own tasks |
| POST | `/` | admin | Create task |
| GET | `/` | admin | All tasks |
| PUT | `/:id` | admin | Update task |
| DELETE | `/:id` | admin | Delete task |
| PATCH | `/update-status/:id` | Required | Update task status |

### Attendance (`/api/attendance`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | admin, hr | All attendance records |
| GET | `/today` | admin, hr | Today's attendance |
| GET | `/dashboard` | admin, hr | Dashboard stats |
| GET | `/user/:userId` | Required | Own records (non-admin restricted) |
| GET | `/export` | admin, hr | Export to Excel |

### Salary (`/api/salary`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/pay` | admin | Pay + generate slip |
| GET | `/my-slips` | Required | Own salary slips |

### Leaves (`/api/leaves`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Required | Apply for leave |
| GET | `/my` | Required | Own leave requests |
| GET | `/` | admin, hr | All leave requests |
| PUT | `/:id/status` | admin, hr | Approve / reject |

### Projects (`/api/projects`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | All projects |
| POST | `/` | admin | Create project |
| PUT | `/:id` | admin | Update project |
| DELETE | `/:id` | admin | Delete project |
| GET | `/export` | admin | Export to CSV |

---

## 17. Environment Variables

```env
PORT=4050
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/taskcrm
JWT_SECRET=...
JWT_EXPIRES_IN=1d
ADMIN_EMAIL=crmadmin@gmail.com
ADMIN_PASSWORD=...
CLIENT_URL=http://localhost:5173
ADMIN_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_SECURE=false
SMTP_FROM_NAME=...
SMTP_FROM_EMAIL=...
```

---

## 18. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, react-router-dom v6, Recharts, Lucide React, Axios |
| Backend | Node.js, Express 5, Mongoose 8 |
| Database | MongoDB |
| Auth | jsonwebtoken, bcryptjs, cookie-parser |
| File Upload | multer v2, uuid |
| PDF Generation | pdfkit |
| Excel Export | xlsx / exceljs |
| Email | Nodemailer |
| Security | helmet, cors, express-rate-limit, express-validator, express-mongo-sanitize, xss-clean, hpp, morgan, compression |
| Real-time | socket.io (optional) |
| Fonts | Syne (headings), Inter (body) — loaded from Google Fonts |
| Brand Color | `#f7931e` (orange) |
