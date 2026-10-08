# CRM Sales Management System — Backend API

A production-ready RESTful API for managing the full sales process:
**Lead Generation → Qualification → Customer Conversion → Deal Management → Closure**

---

## Project Overview

The backend exposes **44 endpoints** across authentication, user management, leads, customers, deals, activities, timeline/audit trail, analytics dashboard, and CRM configuration. All business logic is isolated in the service layer; controllers handle only HTTP request/response.

---

## Technologies Used

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Runtime      | Node.js 18+                         |
| Framework    | Express 4                           |
| Database     | MongoDB 6+ (via Mongoose 7)         |
| Auth         | JWT access tokens + refresh tokens  |
| Validation   | Zod                                 |
| Security     | Helmet, CORS, express-rate-limit    |
| Password     | bcryptjs (rounds: 12)               |
| Logging      | Morgan                              |
| API Docs     | Swagger UI (swagger-jsdoc)          |

---

## Installation & Setup

### Prerequisites

- Node.js 18 or higher
- npm 9+
- MongoDB 6+ (local or Atlas)

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd backend

# 2. Install dependencies
npm install

# 3. Copy environment file and fill in values
cp .env.example .env

# 4. Start development server (with auto-reload)
npm run dev

# 5. Start production server
npm start
```

---

## Environment Variables

Copy `.env.example` to `.env` and set the following:

| Variable                  | Required | Description                                                | Default |
|---------------------------|----------|------------------------------------------------------------|---------|
| `PORT`                    | No       | Server port                                                | `5000`  |
| `MONGODB_URI`             | **Yes**  | MongoDB connection string (local or Atlas)                 | —       |
| `JWT_ACCESS_SECRET`       | **Yes**  | Secret for signing access tokens (use 32+ random chars)    | —       |
| `JWT_ACCESS_EXPIRES_IN`   | No       | Access token lifetime                                       | `15m`   |
| `JWT_REFRESH_SECRET`      | **Yes**  | Secret for signing refresh tokens (different from access)  | —       |
| `JWT_REFRESH_EXPIRES_IN`  | No       | Refresh token lifetime                                      | `7d`    |
| `NODE_ENV`                | No       | `development` or `production`                              | `development` |
| `ALLOWED_ORIGINS`         | No       | Comma-separated CORS origins. Unset = block all cross-origin | — |

> **Production note:** Set `NODE_ENV=production` to enable secure cookies, mask server error details, and use combined Morgan logging.

---

## Database Setup

### Local MongoDB

```bash
# Start MongoDB (if running locally)
mongod --dbpath /data/db

# The application creates the database and collections automatically on first run.
# No manual schema creation is needed.
```

### MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with read/write permissions
3. Whitelist your IP (or use `0.0.0.0/0` for development)
4. Copy the connection string and set it as `MONGODB_URI` in `.env`

---

## Running the Server

```bash
# Development (nodemon auto-reload)
npm run dev

# Production
npm start

# Verify the server is running
curl http://localhost:5000/health
# Response: { "success": true, "message": "CRM API is running" }
```

**API Documentation (Swagger UI):**  
`http://localhost:5000/api/docs`

**Raw OpenAPI JSON** (for Postman import):  
`http://localhost:5000/api/docs.json`

---

## Authentication Mechanism

The API uses **JWT with dual-token rotation**:

| Token | Lifetime | Where stored | Purpose |
|---|---|---|---|
| Access token | 15 minutes | Response body | Authenticate API requests |
| Refresh token | 7 days | HTTP-only cookie | Rotate access tokens without re-login |

### Flow

```
1. POST /api/auth/login  →  returns accessToken (body) + sets refreshToken cookie
2. Include header on protected requests:
   Authorization: Bearer <accessToken>
3. When access token expires:
   POST /api/auth/refresh-token  →  new accessToken + rotated refreshToken cookie
4. POST /api/auth/logout  →  clears refreshToken from DB + clears cookie
```

### Security
- Passwords hashed with **bcryptjs** (rounds: 12), never returned in any response
- Refresh token stored in `httpOnly`, `secure` (production), `sameSite: strict` cookie
- Inactive users are rejected at authentication middleware
- Auth routes have a stricter rate limit: **10 failed requests / 15 minutes**

---

## User Roles & Permissions

| Capability | admin | sales_manager | sales_executive |
|---|:---:|:---:|:---:|
| Manage users (CRUD, activate/deactivate) | ✅ | ❌ | ❌ |
| View **all** leads / customers / deals | ✅ | team only | own only |
| Create leads / activities | ✅ | ✅ | ✅ |
| Update leads / customers / deals | ✅ | ✅ | own only |
| Delete leads / customers / deals | ✅ | ✅ | ❌ |
| Assign / reassign leads | ✅ | own team only | ❌ |
| Convert qualified leads | ✅ | ✅ | own assigned only |
| Transition deal stages | ✅ | ✅ | own assigned only |
| Re-open won / lost deals | ✅ | ❌ | ❌ |
| View team performance dashboard | ✅ | ✅ | ❌ |
| Manage CRM configuration | ✅ | ❌ | ❌ |

> **Team scoping:** A sales manager sees only leads/customers/deals assigned to users where `user.manager = manager._id`. Set the `manager` field when creating a sales executive to link them to their manager.

---

## API Endpoints Reference

### Authentication — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Register a new user |
| POST | `/api/auth/login` | None | Login — returns accessToken + sets cookie |
| POST | `/api/auth/logout` | Bearer | Logout — clears refresh token |
| POST | `/api/auth/refresh-token` | Cookie/Body | Rotate tokens |
| GET | `/api/auth/me` | Bearer | Get current user profile |

### Users — `/api/users` *(Admin only)*

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Bearer + admin | List users (search, filter, paginate) |
| POST | `/api/users` | Bearer + admin | Create user |
| GET | `/api/users/:id` | Bearer + admin | Get user by ID |
| PUT | `/api/users/:id` | Bearer + admin | Update user |
| PATCH | `/api/users/:id/status` | Bearer + admin | Activate / deactivate user |
| DELETE | `/api/users/:id` | Bearer + admin | Soft-delete user |

### Leads — `/api/leads`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/leads` | Bearer | List leads (search, filter, paginate) |
| POST | `/api/leads` | Bearer | Create lead |
| GET | `/api/leads/:id` | Bearer | Get lead by ID |
| PUT | `/api/leads/:id` | Bearer | Update lead |
| DELETE | `/api/leads/:id` | Bearer + admin | Delete lead |
| PATCH | `/api/leads/:id/status` | Bearer | Update lead status |
| PATCH | `/api/leads/:id/assign` | Bearer + admin/manager | Assign / reassign lead |
| POST | `/api/leads/:id/convert` | Bearer | Convert qualified lead → customer + deal |

### Customers — `/api/customers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/customers` | Bearer | List customers (search, filter, paginate) |
| POST | `/api/customers` | Bearer | Create customer |
| GET | `/api/customers/:id` | Bearer | Get customer + associated deals |
| PUT | `/api/customers/:id` | Bearer | Update customer |
| DELETE | `/api/customers/:id` | Bearer + admin/manager | Delete customer |

### Deals — `/api/deals`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/deals` | Bearer | List deals (filter by stage, value, date) |
| POST | `/api/deals` | Bearer | Create deal |
| GET | `/api/deals/:id` | Bearer | Get deal by ID |
| PUT | `/api/deals/:id` | Bearer | Update deal fields |
| DELETE | `/api/deals/:id` | Bearer + admin/manager | Delete deal |
| PATCH | `/api/deals/:id/stage` | Bearer | Transition deal stage (business rules enforced) |

### Activities — `/api/activities`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/activities` | Bearer | List activities (filter by type, status, date) |
| POST | `/api/activities` | Bearer | Create activity |
| GET | `/api/activities/:id` | Bearer | Get activity by ID |
| PUT | `/api/activities/:id` | Bearer | Update activity |
| DELETE | `/api/activities/:id` | Bearer | Delete activity |
| PATCH | `/api/activities/:id/complete` | Bearer | Mark activity as completed |

### Timeline — `/api/timeline`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/timeline/lead/:id` | Bearer | Audit trail for a lead |
| GET | `/api/timeline/customer/:id` | Bearer | Audit trail for a customer |
| GET | `/api/timeline/deal/:id` | Bearer | Audit trail for a deal |

### Dashboard — `/api/dashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard/stats` | Bearer | Overall CRM stats (leads, deals, revenue, activities) |
| GET | `/api/dashboard/pipeline` | Bearer | Deal pipeline by stage (count + value) |
| GET | `/api/dashboard/team-performance` | Bearer + admin/manager | Per-user performance metrics |
| GET | `/api/dashboard/team-activities` | Bearer + admin/manager | Pending/overdue activities for team |
| GET | `/api/dashboard/recent-activities` | Bearer | Most recent activities |

### Config — `/api/config` *(Admin only)*

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/config` | Bearer + admin | List all CRM config settings |
| POST | `/api/config` | Bearer + admin | Create or update a config key |
| GET | `/api/config/:key` | Bearer + admin | Get config by key |
| DELETE | `/api/config/:key` | Bearer + admin | Delete config by key |

---

## Sample API Requests & Responses

### Register

```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "Alice Admin",
  "email": "alice@company.com",
  "password": "Admin123",
  "role": "admin"
}
```
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "_id": "...", "name": "Alice Admin", "email": "alice@company.com", "role": "admin", "isActive": true },
    "accessToken": "eyJhbGci..."
  }
}
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{ "email": "alice@company.com", "password": "Admin123" }
```
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "...", "name": "Alice Admin", "role": "admin" },
    "accessToken": "eyJhbGci..."
  }
}
```
> Refresh token is set automatically as an HTTP-only cookie.

### Create Lead

```bash
POST /api/leads
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Bob Smith",
  "email": "bob@acme.com",
  "phone": "+1-555-0199",
  "company": "Acme Corp",
  "source": "website",
  "priority": "high"
}
```
```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "lead": { "_id": "...", "name": "Bob Smith", "status": "new", "priority": "high", "source": "website" }
  }
}
```

### Convert Lead

```bash
POST /api/leads/:id/convert
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "dealTitle": "Acme Enterprise License",
  "dealValue": 25000,
  "dealStage": "proposal",
  "expectedCloseDate": "2027-03-31T00:00:00.000Z"
}
```
```json
{
  "success": true,
  "message": "Lead converted successfully",
  "data": {
    "lead":     { "_id": "...", "status": "converted", "convertedAt": "2026-10-08T..." },
    "customer": { "_id": "...", "name": "Bob Smith", "originalLead": { "_id": "...", "name": "Bob Smith" } },
    "deal":     { "_id": "...", "title": "Acme Enterprise License", "stage": "proposal", "value": 25000 }
  }
}
```

### Update Deal Stage

```bash
PATCH /api/deals/:id/stage
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "stage": "won",
  "probability": 100,
  "expectedCloseDate": "2027-03-31T00:00:00.000Z"
}
```
```json
{
  "success": true,
  "message": "Deal stage updated to \"won\"",
  "data": {
    "deal": { "_id": "...", "stage": "won", "wonAt": "2026-10-08T...", "expectedRevenue": 25000 }
  }
}
```

### Error Response (Validation Failure)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" },
    { "field": "value", "message": "Deal value must be greater than 0" }
  ]
}
```

### Error Response (Not Found)

```json
{
  "success": false,
  "message": "Lead not found"
}
```

### Error Response (Unauthorized)

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

## Important Business Rules

### Lead Management
- Only **qualified** leads can be converted — other statuses return 400
- A converted lead cannot be converted again
- Lead status **`converted`** can only be set by the conversion endpoint, not the status update endpoint
- Sales executives can only update status on leads assigned to them
- Managers can only assign leads to executives on their own team

### Deal Stage Transitions
| Transition | Requirements |
|---|---|
| Any → Won | `value > 0`, `probability = 100`, `expectedCloseDate` required |
| Any → Lost | `lostReason` required |
| Won/Lost → Active | Admin only — returns 403 for all other roles |
| `expectedCloseDate` | Cannot be in the past on create; max 30-day backdating allowed when marking Won |

### Lead Conversion (MongoDB Transaction)
1. Lead must be `qualified`
2. Creates `Customer` with `originalLead` reference (immutable after creation)
3. Creates `Deal` with both `lead` and `customer` references
4. Updates lead to `converted` with `convertedCustomer` and `convertedDeal` refs
5. Creates 3 timeline entries — all atomically inside a MongoDB transaction
6. If any step fails, the entire operation is rolled back

### Activities
- Backend auto-marks activities as **overdue** when `dueDate < now && status = pending`
- This check runs before every list or single-fetch operation

---

## Database & Indexing Decisions

### Reference vs Embedded
- **All cross-collection links use ObjectId references** — allows independent querying and avoids document size growth
- **Address on Customer is embedded** — tightly coupled data, never queried independently
- **Activity/Timeline use polymorphic refs** — `relatedTo.entityId` (ObjectId) + `relatedTo.entityType` (enum) — correct MongoDB pattern for multi-collection polymorphism

### Index Strategy
| Collection | Indexes |
|---|---|
| User | email (unique), isActive, manager, {role+isActive}, createdAt |
| Lead | email, source, status, priority, assignedTo, createdBy, {status+assignedTo}, {priority+status}, createdAt, text(name+email+company) |
| Customer | email, originalLead, assignedTo, status, {status+assignedTo}, createdAt, text(name+email+company) |
| Deal | lead, customer, assignedTo, stage, expectedCloseDate, {stage+assignedTo}, {customer+stage}, createdAt, {expectedCloseDate+stage} |
| Activity | type, assignedTo, dueDate, status, relatedTo.entityId, createdBy, {status+dueDate}, {assignedTo+status}, {relatedTo.entityId+entityType}, createdAt |
| Timeline | entityId, {entityType+entityId+createdAt}, {entityId+createdAt}, {performedBy+createdAt} |

### Performance Optimizations
- All list queries use `.lean()` to avoid Mongoose document hydration overhead
- Role-based scoping prevents full collection scans
- Dashboard uses `countDocuments()` with indexed filters + `$group` aggregation pipelines

---

## Assumptions Made

1. **Manager linking is explicit** — a sales executive must have their `manager` field set to a sales manager's ID for team-scoping to work. This is set via `POST/PUT /api/users`.
2. **Lead conversion requires `qualified` status** — leads must be moved to `qualified` before conversion. This is intentional to enforce a qualification step.
3. **Soft-delete for users** — deleting a user sets `isActive: false` rather than removing the document, preserving data integrity for assigned leads/deals.
4. **Single MongoDB instance assumed** — MongoDB transactions require a replica set. For local development without a replica set, the transaction in lead conversion will fail. Use MongoDB Atlas or run a local replica set.
5. **No email sending** — activity reminders and notifications are tracked in the database only. Email delivery is out of scope.
6. **`expectedRevenue` is a stored field** — calculated as `value × probability/100` and persisted (not virtual) so it can be sorted and filtered efficiently.
7. **Timeline is append-only** — no update or delete endpoints for timeline entries. This is intentional for audit integrity.

---

## Deployed Link

> **Note:** Add your deployment URL here after deploying to a cloud provider (Railway, Render, Heroku, etc.)
>
> Example: `https://crm-api.railway.app`

API Docs (after deployment): `https://<your-domain>/api/docs`

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (missing or expired token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource Not Found |
| 409 | Conflict (duplicate data) |
| 413 | Payload Too Large |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (database error) |
