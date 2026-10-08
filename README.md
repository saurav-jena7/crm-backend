# CRM Sales Management System — Backend API

A RESTful API for a full-featured Customer Relationship Management system, built with Node.js, Express, and MongoDB.

---

## Overview

The backend exposes 40+ endpoints covering authentication, user management, lead lifecycle, customer records, deal pipeline, activity tracking, timeline history, and dashboard analytics. Business logic lives in services; controllers are thin HTTP wrappers.

---

## Tech Stack

| Layer        | Technology                     |
|--------------|-------------------------------|
| Runtime      | Node.js 18+                   |
| Framework    | Express 4                     |
| Database     | MongoDB (via Mongoose 7)      |
| Auth         | JWT (access + refresh tokens) |
| Validation   | Zod                           |
| Security     | Helmet, CORS, express-rate-limit |
| Logging      | Morgan                        |
| Password     | bcryptjs                      |

---

## Prerequisites

- Node.js 18 or higher
- npm 9+
- MongoDB 6+ (local instance or Atlas URI)

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd backend

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env and fill in the required values (see Environment Variables below)

# 4. Start in development mode
npm run dev

# 5. (Optional) Start in production mode
npm start
```

---

## Environment Variables

| Variable              | Required | Description                                          | Example                                    |
|-----------------------|----------|------------------------------------------------------|--------------------------------------------|
| `PORT`                | No       | Port the server listens on (default: 5000)           | `5000`                                     |
| `MONGODB_URI`         | Yes      | Full MongoDB connection string                       | `mongodb://localhost:27017/crm_db`         |
| `JWT_ACCESS_SECRET`   | Yes      | Secret key for signing access tokens                 | `a-long-random-string`                     |
| `JWT_ACCESS_EXPIRES_IN` | No     | Access token TTL (default: 15m)                      | `15m`                                      |
| `JWT_REFRESH_SECRET`  | Yes      | Secret key for signing refresh tokens                | `another-long-random-string`               |
| `JWT_REFRESH_EXPIRES_IN` | No    | Refresh token TTL (default: 7d)                      | `7d`                                       |
| `NODE_ENV`            | No       | Runtime environment (`development` / `production`)   | `development`                              |
| `ALLOWED_ORIGINS`     | No       | Comma-separated list of allowed CORS origins         | `http://localhost:3000,https://example.com` |

---

## API Endpoints Reference

### Authentication — `/api/auth`

| Method | Path                     | Auth Required | Description                              |
|--------|--------------------------|---------------|------------------------------------------|
| POST   | `/api/auth/register`     | No            | Register a new user                      |
| POST   | `/api/auth/login`        | No            | Log in and receive tokens                |
| POST   | `/api/auth/logout`       | Bearer token  | Invalidate refresh token & clear cookie  |
| POST   | `/api/auth/refresh-token`| Cookie/Body   | Rotate access + refresh tokens           |
| GET    | `/api/auth/me`           | Bearer token  | Return current authenticated user        |

### Users — `/api/users` (Admin only)

| Method | Path             | Auth Required       | Description              |
|--------|------------------|---------------------|--------------------------|
| GET    | `/api/users`     | Bearer + admin      | List users (paginated)   |
| POST   | `/api/users`     | Bearer + admin      | Create a new user        |
| GET    | `/api/users/:id` | Bearer + admin      | Get user by ID           |
| PUT    | `/api/users/:id` | Bearer + admin      | Update user              |
| DELETE | `/api/users/:id` | Bearer + admin      | Soft-delete user         |

### Leads — `/api/leads`

| Method | Path                    | Auth Required                   | Description                      |
|--------|-------------------------|---------------------------------|----------------------------------|
| GET    | `/api/leads`            | Bearer                          | List leads (paginated)           |
| POST   | `/api/leads`            | Bearer                          | Create a lead                    |
| GET    | `/api/leads/:id`        | Bearer                          | Get lead by ID                   |
| PUT    | `/api/leads/:id`        | Bearer                          | Update lead                      |
| DELETE | `/api/leads/:id`        | Bearer + admin/sales_manager    | Delete lead                      |
| PATCH  | `/api/leads/:id/status` | Bearer                          | Update lead status               |
| PATCH  | `/api/leads/:id/assign` | Bearer + admin/sales_manager    | Assign lead to a user            |
| POST   | `/api/leads/:id/convert`| Bearer + admin/sales_manager    | Convert lead → customer + deal   |

### Customers — `/api/customers`

| Method | Path                  | Auth Required                | Description               |
|--------|-----------------------|------------------------------|---------------------------|
| GET    | `/api/customers`      | Bearer                       | List customers (paginated)|
| POST   | `/api/customers`      | Bearer                       | Create a customer         |
| GET    | `/api/customers/:id`  | Bearer                       | Get customer by ID        |
| PUT    | `/api/customers/:id`  | Bearer                       | Update customer           |
| DELETE | `/api/customers/:id`  | Bearer + admin/sales_manager | Delete customer           |

### Deals — `/api/deals`

| Method | Path                   | Auth Required                | Description               |
|--------|------------------------|------------------------------|---------------------------|
| GET    | `/api/deals`           | Bearer                       | List deals (paginated)    |
| POST   | `/api/deals`           | Bearer                       | Create a deal             |
| GET    | `/api/deals/:id`       | Bearer                       | Get deal by ID            |
| PUT    | `/api/deals/:id`       | Bearer                       | Update deal               |
| DELETE | `/api/deals/:id`       | Bearer + admin/sales_manager | Delete deal               |
| PATCH  | `/api/deals/:id/stage` | Bearer                       | Transition deal stage     |

### Activities — `/api/activities`

| Method | Path                        | Auth Required                | Description                  |
|--------|-----------------------------|------------------------------|------------------------------|
| GET    | `/api/activities`           | Bearer                       | List activities (paginated)  |
| POST   | `/api/activities`           | Bearer                       | Create an activity           |
| GET    | `/api/activities/:id`       | Bearer                       | Get activity by ID           |
| PUT    | `/api/activities/:id`       | Bearer                       | Update activity              |
| DELETE | `/api/activities/:id`       | Bearer + admin/sales_manager | Delete activity              |
| PATCH  | `/api/activities/:id/complete` | Bearer                    | Mark activity as completed   |

### Timeline — `/api/timeline`

| Method | Path                          | Auth Required | Description                    |
|--------|-------------------------------|---------------|--------------------------------|
| GET    | `/api/timeline/lead/:id`      | Bearer        | Get timeline for a lead        |
| GET    | `/api/timeline/customer/:id`  | Bearer        | Get timeline for a customer    |
| GET    | `/api/timeline/deal/:id`      | Bearer        | Get timeline for a deal        |

### Dashboard — `/api/dashboard`

| Method | Path                              | Auth Required                | Description                    |
|--------|-----------------------------------|------------------------------|--------------------------------|
| GET    | `/api/dashboard/stats`            | Bearer                       | Overall CRM statistics         |
| GET    | `/api/dashboard/pipeline`         | Bearer                       | Active deal pipeline by stage  |
| GET    | `/api/dashboard/team-performance` | Bearer + admin/sales_manager | Per-user won deal performance  |
| GET    | `/api/dashboard/recent-activities`| Bearer                       | Most recent activities         |

---

## Role Permissions

| Capability                        | admin | sales_manager | sales_executive |
|-----------------------------------|:-----:|:-------------:|:---------------:|
| Manage users (CRUD)               | ✅    | ❌            | ❌              |
| View all leads/customers/deals    | ✅    | ✅            | own only        |
| Create leads/customers/deals      | ✅    | ✅            | ✅              |
| Delete leads/customers/deals      | ✅    | ✅            | ❌              |
| Assign leads                      | ✅    | ✅            | ❌              |
| Convert leads                     | ✅    | ✅            | ❌              |
| Transition deal stages            | ✅    | ✅            | ✅              |
| Re-open won/lost deals            | ✅    | ❌            | ❌              |
| View team performance dashboard   | ✅    | ✅            | ❌              |

---

## Data Models

| Model    | Key Fields                                                     |
|----------|----------------------------------------------------------------|
| User     | name, email, password (hashed), role, isActive, refreshToken  |
| Lead     | name, email, phone, company, source, status, priority, assignedTo, createdBy |
| Customer | name, email, phone, company, address, originalLead, assignedTo, createdBy |
| Deal     | title, lead, customer, stage, value, probability, expectedCloseDate, wonAt, lostAt |
| Activity | type, title, description, status, dueDate, completedAt, relatedTo, assignedTo |
| Timeline | action, entityType, entityId, performedBy, previousValue, newValue |

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

The `errors` array is only present for validation failures (HTTP 400). The `stack` property is included only in `development` mode.

### Common HTTP Status Codes

| Code | Meaning                  |
|------|--------------------------|
| 200  | OK                       |
| 201  | Created                  |
| 204  | No Content (delete)      |
| 400  | Bad Request / Validation |
| 401  | Unauthorized             |
| 403  | Forbidden                |
| 404  | Not Found                |
| 409  | Conflict (duplicate key) |
| 429  | Too Many Requests        |
| 500  | Internal Server Error    |
