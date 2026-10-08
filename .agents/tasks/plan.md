# CRM Sales Management System — Backend Implementation Plan

## Overview

Greenfield Node.js + Express + MongoDB backend. The backend/ directory is currently empty.
All files must be created from scratch following the ordered dependency list below.

---

## Implementation Order

- [ ] 1. **package.json** — project manifest
      `backend/package.json`
      Purpose: Declares all dependencies (express, mongoose, jsonwebtoken, bcryptjs, zod, swagger-ui-express, swagger-jsdoc, helmet, cors, express-rate-limit, morgan, dotenv) and devDependencies (nodemon). Scripts: `start`, `dev`, `test`.

- [ ] 2. **.env.example** — environment variable template
      `backend/.env.example`
      Purpose: Documents all required env vars: PORT, MONGODB_URI, JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN, NODE_ENV, ALLOWED_ORIGINS.

- [ ] 3. **src/config/database.js** — MongoDB connection
      `backend/src/config/database.js`
      Purpose: Exports `connectDB()` using mongoose.connect(). Handles connection errors, logs connection status. Uses MONGODB_URI from env.

- [ ] 4. **src/config/jwt.js** — JWT configuration
      `backend/src/config/jwt.js`
      Purpose: Exports `generateAccessToken(payload)`, `generateRefreshToken(payload)`, `verifyAccessToken(token)`, `verifyRefreshToken(token)`. Uses secrets and expiry from env. Access token: 15m, refresh token: 7d.

- [ ] 5. **src/utils/AppError.js** — custom error class
      `backend/src/utils/AppError.js`
      Purpose: Extends Error. Constructor takes `(message, statusCode, errors=[])`. Sets `this.isOperational = true` to distinguish from programmer errors in errorHandler.

- [ ] 6. **src/utils/helpers.js** — shared utility functions
      `backend/src/utils/helpers.js`
      Purpose: Exports `paginate(query, page, limit)`, `buildSortObject(sortStr)`, `sanitizeUser(userDoc)` (strips password field), `generateSlug(str)`, `isOverdue(dueDate, status)` (returns true if dueDate < Date.now() && status === 'pending').

- [ ] 7. **All 6 Mongoose models**
      Files:
      - `backend/src/models/User.model.js` — fields: name, email (unique, indexed, lowercase), phone, password (select:false), role (enum: admin/sales_manager/sales_executive, default: sales_executive), isActive (default: true), refreshToken (select:false). Pre-save hook hashes password with bcrypt (rounds=12). Instance method `comparePassword(candidate)`.
      - `backend/src/models/Lead.model.js` — fields: name, email, phone, company, source (enum), status (enum, default: new), priority (enum, default: medium), assignedTo (ref: User), description, createdBy (ref: User), convertedAt, convertedCustomer (ref: Customer), convertedDeal (ref: Deal). Timestamps: true. Index on status+assignedTo.
      - `backend/src/models/Customer.model.js` — fields: name, email, phone, company, address (subdocument: street/city/state/country/zip), originalLead (ref: Lead), assignedTo (ref: User), status (enum: active/inactive, default: active), createdBy (ref: User). Timestamps: true.
      - `backend/src/models/Deal.model.js` — fields: title, lead (ref: Lead), customer (ref: Customer), assignedTo (ref: User), value (Number, min:0), probability (Number, 0-100), expectedRevenue (virtual: value * probability/100), expectedCloseDate, stage (enum: qualification/discovery/proposal/negotiation/won/lost, default: qualification), description, lostReason, wonAt, lostAt, createdBy (ref: User). Timestamps: true. Pre-save sets wonAt/lostAt when stage changes.
      - `backend/src/models/Activity.model.js` — fields: type (enum: call/email/meeting/demo/follow_up/reminder/note), title, description, assignedTo (ref: User), dueDate, status (enum: pending/completed/overdue, default: pending), relatedTo: { entityId (ObjectId, required), entityType (enum: lead/customer/deal, required) }, createdBy (ref: User), completedAt. Timestamps: true. Index on status+dueDate.
      - `backend/src/models/Timeline.model.js` — fields: action (String, required), entityType (enum: lead/customer/deal/user), entityId (ObjectId, required, indexed), performedBy (ref: User), previousValue (Mixed), newValue (Mixed), description. Timestamps: true (createdAt only used). Index on entityType+entityId.

- [ ] 8. **Middleware files**
      Files:
      - `backend/src/middleware/auth.js` — `authenticate`: verifies JWT access token from Authorization header (Bearer), attaches `req.user`. `authorize(...roles)`: factory returning middleware that checks `req.user.role` is in the allowed list. Returns 401/403 via AppError.
      - `backend/src/middleware/errorHandler.js` — global Express error handler. Handles: AppError (operational), Mongoose ValidationError (400), Mongoose CastError (400 invalid ID), Mongoose duplicate key 11000 (409), JWT errors (401). In production strips stack traces.
      - `backend/src/middleware/validate.js` — `validate(schema)`: middleware factory that runs `schema.parseAsync(req.body)` with Zod; on failure maps ZodError issues to `{ field, message }` array and throws AppError(400).

- [ ] 9. **All Zod validators**
      Files:
      - `backend/src/validators/auth.validators.js` — registerSchema (name required, email valid, password min 8 with complexity, role optional), loginSchema (email, password), refreshTokenSchema.
      - `backend/src/validators/user.validators.js` — createUserSchema, updateUserSchema (all fields optional), changePasswordSchema.
      - `backend/src/validators/lead.validators.js` — createLeadSchema, updateLeadSchema, assignLeadSchema (assignedTo required ObjectId), convertLeadSchema (dealTitle, dealValue required).
      - `backend/src/validators/customer.validators.js` — createCustomerSchema, updateCustomerSchema.
      - `backend/src/validators/deal.validators.js` — createDealSchema (title, value>0, stage), updateDealSchema, updateStageSchema (stage + conditional: if won → value>0+probability=100+expectedCloseDate required; if lost → lostReason required).
      - `backend/src/validators/activity.validators.js` — createActivitySchema (type, title, relatedTo.entityId, relatedTo.entityType required), updateActivitySchema.

- [ ] 10. **Timeline service**
       `backend/src/services/timeline.service.js`
       Purpose: Exports `createTimelineEntry({ action, entityType, entityId, performedBy, previousValue, newValue, description, session })`. Accepts optional mongoose session for transaction support. Used by all other services.

- [ ] 11. **All other services**
       Files:
       - `backend/src/services/auth.service.js` — `register(data)`: creates User, returns tokens. `login(email, password)`: finds user (select +password), compares, generates tokens, saves refreshToken on user. `logout(userId)`: clears refreshToken. `refreshTokens(token)`: verifies refresh token, finds user by stored token match, returns new token pair.
       - `backend/src/services/user.service.js` — CRUD wrappers around User model with pagination. `getAllUsers(filters, page, limit)`, `getUserById(id)`, `createUser(data)`, `updateUser(id, data)`, `deleteUser(id)` (soft-delete: isActive=false).
       - `backend/src/services/lead.service.js` — `getAllLeads(filters, user, page, limit)`: if role=sales_executive, filter by assignedTo=user._id. `createLead`, `updateLead`, `deleteLead`, `updateLeadStatus(id, status, performedBy)` (creates Timeline entry), `assignLead(id, assigneeId, performedBy)` (creates Timeline entry), `convertLead(id, dealData, performedBy)`: **uses mongoose session/transaction** — creates Customer, creates Deal, updates Lead.status='converted'+convertedAt+refs, creates Timeline entries for all three, commits session.
       - `backend/src/services/customer.service.js` — CRUD with pagination, Timeline entries on create/update.
       - `backend/src/services/deal.service.js` — CRUD with pagination. `updateDealStage(id, stage, extraData, performedBy)`: validates transition rules (won needs value>0, probability=100, expectedCloseDate; lost needs lostReason; won/lost cannot go back to earlier stage unless admin), sets wonAt/lostAt, creates Timeline entry.
       - `backend/src/services/activity.service.js` — CRUD. `completeActivity(id, performedBy)`: sets status=completed, completedAt=now, creates Timeline. `markOverdueActivities()`: finds all activities where dueDate < now && status=pending, bulk-updates to overdue (can be called by a cron or at request time).
       - `backend/src/services/dashboard.service.js` — `getStats()`: aggregations for total leads by status, total deals value, win rate, conversion rate. `getPipeline()`: deals grouped by stage with total value. `getTeamPerformance(startDate, endDate)`: per-user deals won + leads converted. `getRecentActivities(limit)`: latest N activities with populate.

- [ ] 12. **All controllers**
       Files:
       - `backend/src/controllers/auth.controller.js` — thin: calls auth.service methods, sets httpOnly refresh-token cookie, responds with access token.
       - `backend/src/controllers/user.controller.js`
       - `backend/src/controllers/lead.controller.js` — includes convert endpoint calling lead.service.convertLead.
       - `backend/src/controllers/customer.controller.js`
       - `backend/src/controllers/deal.controller.js`
       - `backend/src/controllers/activity.controller.js`
       - `backend/src/controllers/timeline.controller.js` — GET by entityType+entityId.
       - `backend/src/controllers/dashboard.controller.js`

- [ ] 13. **All route files**
       Files:
       - `backend/src/routes/auth.routes.js` — POST /register, POST /login, POST /logout, POST /refresh-token, GET /me (authenticated).
       - `backend/src/routes/user.routes.js` — all routes protected by authenticate + authorize('admin').
       - `backend/src/routes/lead.routes.js` — CRUD + PATCH /:id/status + PATCH /:id/assign + POST /:id/convert. sales_executive can read/update own; admin+sales_manager full access.
       - `backend/src/routes/customer.routes.js`
       - `backend/src/routes/deal.routes.js` — CRUD + PATCH /:id/stage.
       - `backend/src/routes/activity.routes.js` — CRUD + PATCH /:id/complete.
       - `backend/src/routes/timeline.routes.js` — GET /lead/:id, /customer/:id, /deal/:id.
       - `backend/src/routes/dashboard.routes.js` — GET /stats, /pipeline, /team-performance, /recent-activities.

- [ ] 14. **app.js** — Express application setup
       `backend/app.js`
       Purpose: Creates express app. Applies helmet, cors (ALLOWED_ORIGINS), morgan, express.json(), express-rate-limit (100 req/15min). Mounts all routes under /api. Mounts 404 handler and global errorHandler. Exports app.

- [ ] 15. **server.js** — HTTP server entry point
       `backend/server.js`
       Purpose: Imports app, calls connectDB(), then app.listen(PORT). Handles unhandledRejection and uncaughtException (logs + graceful shutdown).

- [ ] 16. **README.md**
       `backend/README.md`
       Purpose: Setup instructions, env var descriptions, API endpoint reference, role permissions table, running locally guide.

---

## Tricky Implementation Notes

### 1. Lead Conversion Transaction (lead.service.js → convertLead)
```
const session = await mongoose.startSession();
session.startTransaction();
try {
  const customer = await Customer.create([{ ...customerData }], { session });
  const deal = await Deal.create([{ ...dealData, customer: customer[0]._id }], { session });
  await Lead.findByIdAndUpdate(leadId, {
    status: 'converted', convertedAt: new Date(),
    convertedCustomer: customer[0]._id, convertedDeal: deal[0]._id
  }, { session });
  await TimelineService.createTimelineEntry({ ..., session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```
Note: `Model.create()` inside a session requires array form `[doc]` to return an array.

### 2. Deal Stage Transition Rules (deal.service.js → updateDealStage)
- If new stage = 'won': require value > 0, probability = 100, expectedCloseDate present; set wonAt = now.
- If new stage = 'lost': require lostReason present; set lostAt = now.
- If current stage is 'won' or 'lost', only admin role can revert (pass req.user.role into service).
- Throw AppError(400) for invalid transitions.

### 3. Polymorphic Activity.relatedTo
The `relatedTo` field is a subdocument `{ entityId: ObjectId, entityType: String }`. When populating, use:
```js
Activity.findById(id).populate({ path: 'relatedTo.entityId', ... })
```
— but since entityType varies, populate dynamically based on entityType value, or skip auto-populate and let clients resolve. Timeline uses the same pattern.

### 4. Overdue Activity Detection (activity.service.js)
`markOverdueActivities()` runs a bulk update:
```js
await Activity.updateMany(
  { dueDate: { $lt: new Date() }, status: 'pending' },
  { $set: { status: 'overdue' } }
);
```
Call this at the start of `getAllActivities()` so the list is always fresh without needing a cron job.

### 5. Role-Based Lead Filtering (lead.service.js → getAllLeads)
```js
if (user.role === 'sales_executive') {
  filters.assignedTo = user._id;
}
```
Apply before running the mongoose query so executives never see unassigned leads.

### 6. JWT Refresh Token Strategy
- Access token: short-lived (15m), sent in response body.
- Refresh token: long-lived (7d), stored in httpOnly cookie AND saved hashed/raw on User.refreshToken field.
- On refresh: verify the token signature, then confirm `user.refreshToken === token` (prevents replay after logout).
- On logout: set `user.refreshToken = null`.

### 7. Expected Revenue Virtual (Deal model)
```js
DealSchema.virtual('expectedRevenue').get(function () {
  return this.value * (this.probability / 100);
});
// Must include virtuals in toJSON/toObject:
DealSchema.set('toJSON', { virtuals: true });
```

### 8. Error Handler Middleware
Must be registered as the LAST middleware in app.js, after all routes:
```js
app.use(errorHandler); // 4-argument function (err, req, res, next)
```

---

## File Count Summary
| Category | Count |
|---|---|
| Config | 2 |
| Utils | 2 |
| Models | 6 |
| Middleware | 3 |
| Validators | 6 |
| Services | 8 |
| Controllers | 8 |
| Routes | 8 |
| Root files | 4 (app.js, server.js, package.json, .env.example, README.md) |
| **Total** | **~47 files** |
