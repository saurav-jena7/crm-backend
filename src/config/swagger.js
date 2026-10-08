'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CRM Sales Management System API',
      version: '1.0.0',
      description: `
## CRM Sales Management System

A RESTful backend for managing the complete sales process:
**Lead Generation → Lead Qualification → Customer Conversion → Deal Management → Deal Closure**

### Authentication
All protected routes require a **Bearer token** in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

The \`accessToken\` is obtained from \`POST /api/auth/login\` or \`POST /api/auth/register\`.
The \`refreshToken\` is stored as an HTTP-only cookie and rotated automatically.

### User Roles
| Role | Permissions |
|------|------------|
| \`admin\` | Full access — manage users, all data, config |
| \`sales_manager\` | Team leads/customers/deals, assign/reassign, team performance |
| \`sales_executive\` | Own assigned leads/customers/deals, create activities |

### Response Format
All responses follow a consistent structure:

**Success:**
\`\`\`json
{ "success": true, "message": "...", "data": {}, "pagination": {} }
\`\`\`

**Error:**
\`\`\`json
{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }
\`\`\`
      `,
      contact: {
        name: 'CRM API Support',
        email: 'support@crm.example.com',
      },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from /api/auth/login',
        },
      },
      schemas: {
        // ── Pagination ──────────────────────────────────────────────────────
        Pagination: {
          type: 'object',
          properties: {
            currentPage:  { type: 'integer', example: 1 },
            pageSize:     { type: 'integer', example: 10 },
            totalRecords: { type: 'integer', example: 47 },
            totalPages:   { type: 'integer', example: 5 },
          },
        },
        // ── Success Response ────────────────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string',  example: 'Operation successful' },
            data:    { type: 'object' },
          },
        },
        // ── Error Response ──────────────────────────────────────────────────
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'Error description' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field:   { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Invalid email address' },
                },
              },
            },
          },
        },
        // ── User ────────────────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            _id:       { type: 'string', example: '507f1f77bcf86cd799439011' },
            name:      { type: 'string', example: 'John Smith' },
            email:     { type: 'string', example: 'john@company.com' },
            phone:     { type: 'string', example: '+1-555-0123' },
            role:      { type: 'string', enum: ['admin','sales_manager','sales_executive'] },
            isActive:  { type: 'boolean', example: true },
            manager:   { type: 'string', example: '507f1f77bcf86cd799439012' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── Lead ────────────────────────────────────────────────────────────
        Lead: {
          type: 'object',
          properties: {
            _id:        { type: 'string' },
            name:       { type: 'string', example: 'Acme Corp Inquiry' },
            email:      { type: 'string', example: 'lead@acme.com' },
            phone:      { type: 'string', example: '+1-555-0199' },
            company:    { type: 'string', example: 'Acme Corp' },
            source:     { type: 'string', enum: ['website','referral','social_media','email','phone','other'] },
            status:     { type: 'string', enum: ['new','contacted','qualified','unqualified','converted','lost'] },
            priority:   { type: 'string', enum: ['low','medium','high'] },
            assignedTo: { $ref: '#/components/schemas/UserRef' },
            description: { type: 'string' },
            createdAt:  { type: 'string', format: 'date-time' },
            updatedAt:  { type: 'string', format: 'date-time' },
          },
        },
        // ── Customer ────────────────────────────────────────────────────────
        Customer: {
          type: 'object',
          properties: {
            _id:          { type: 'string' },
            name:         { type: 'string', example: 'Jane Doe' },
            email:        { type: 'string', example: 'jane@acme.com' },
            phone:        { type: 'string', example: '+1-555-0100' },
            company:      { type: 'string', example: 'Acme Corp' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' }, city: { type: 'string' },
                state:  { type: 'string' }, country: { type: 'string' },
                zip:    { type: 'string' },
              },
            },
            originalLead: { $ref: '#/components/schemas/LeadRef' },
            assignedTo:   { $ref: '#/components/schemas/UserRef' },
            status:       { type: 'string', enum: ['active','inactive'] },
            createdAt:    { type: 'string', format: 'date-time' },
            updatedAt:    { type: 'string', format: 'date-time' },
          },
        },
        // ── Deal ────────────────────────────────────────────────────────────
        Deal: {
          type: 'object',
          properties: {
            _id:               { type: 'string' },
            title:             { type: 'string', example: 'Enterprise License Q4' },
            lead:              { $ref: '#/components/schemas/LeadRef' },
            customer:          { $ref: '#/components/schemas/CustomerRef' },
            assignedTo:        { $ref: '#/components/schemas/UserRef' },
            value:             { type: 'number', example: 25000 },
            probability:       { type: 'number', minimum: 0, maximum: 100, example: 75 },
            expectedRevenue:   { type: 'number', example: 18750 },
            expectedCloseDate: { type: 'string', format: 'date-time' },
            stage:             { type: 'string', enum: ['qualification','discovery','proposal','negotiation','won','lost'] },
            description:       { type: 'string' },
            lostReason:        { type: 'string' },
            wonAt:             { type: 'string', format: 'date-time' },
            lostAt:            { type: 'string', format: 'date-time' },
            createdAt:         { type: 'string', format: 'date-time' },
            updatedAt:         { type: 'string', format: 'date-time' },
          },
        },
        // ── Activity ────────────────────────────────────────────────────────
        Activity: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            type:        { type: 'string', enum: ['call','email','meeting','demo','follow_up','reminder','note'] },
            title:       { type: 'string', example: 'Follow-up call' },
            description: { type: 'string' },
            assignedTo:  { $ref: '#/components/schemas/UserRef' },
            dueDate:     { type: 'string', format: 'date-time' },
            status:      { type: 'string', enum: ['pending','completed','overdue'] },
            relatedTo: {
              type: 'object',
              properties: {
                entityId:   { type: 'string' },
                entityType: { type: 'string', enum: ['lead','customer','deal','user'] },
              },
            },
            createdBy:   { $ref: '#/components/schemas/UserRef' },
            completedAt: { type: 'string', format: 'date-time' },
            createdAt:   { type: 'string', format: 'date-time' },
            updatedAt:   { type: 'string', format: 'date-time' },
          },
        },
        // ── Timeline ────────────────────────────────────────────────────────
        TimelineEntry: {
          type: 'object',
          properties: {
            _id:           { type: 'string' },
            action:        { type: 'string', example: 'Lead status changed' },
            entityType:    { type: 'string', enum: ['lead','customer','deal','user'] },
            entityId:      { type: 'string' },
            performedBy:   { $ref: '#/components/schemas/UserRef' },
            previousValue: { type: 'object' },
            newValue:      { type: 'object' },
            description:   { type: 'string' },
            createdAt:     { type: 'string', format: 'date-time' },
          },
        },
        // ── Compact refs ────────────────────────────────────────────────────
        UserRef:     { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' } } },
        LeadRef:     { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, status: { type: 'string' } } },
        CustomerRef: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } } },
      },
      // ── Reusable parameters ───────────────────────────────────────────────
      parameters: {
        PageParam:  { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 },  description: 'Page number (1-indexed)' },
        LimitParam: { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Items per page (max 100)' },
        SortParam:  { name: 'sort',  in: 'query', schema: { type: 'string',  default: '-createdAt' }, description: 'Sort field(s). Prefix with - for descending. E.g. -createdAt,name' },
        IdParam:    { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId (24-char hex)' },
      },
      // ── Reusable responses ────────────────────────────────────────────────
      responses: {
        Unauthorized: { description: 'Authentication token missing or invalid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        Forbidden:    { description: 'Insufficient permissions for this action', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        NotFound:     { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        BadRequest:   { description: 'Invalid request data or validation failure', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        Conflict:     { description: 'Duplicate data (e.g. email already exists)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        ServerError:  { description: 'Unexpected server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth',       description: 'Authentication — register, login, logout, token refresh, profile' },
      { name: 'Users',      description: 'User management (Admin only)' },
      { name: 'Leads',      description: 'Lead management, assignment, and conversion' },
      { name: 'Customers',  description: 'Customer management' },
      { name: 'Deals',      description: 'Deal management and stage transitions' },
      { name: 'Activities', description: 'Sales activities and follow-ups' },
      { name: 'Timeline',   description: 'Audit trail / timeline for leads, customers, and deals' },
      { name: 'Dashboard',  description: 'Sales analytics, pipeline, and team performance' },
      { name: 'Config',     description: 'CRM configuration (Admin only)' },
    ],
    paths: {
      // ════════════════════════════════════════════════════════════════════
      // AUTH
      // ════════════════════════════════════════════════════════════════════
      '/api/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Register a new user',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name','email','password'], properties: {
            name:     { type: 'string', example: 'John Smith' },
            email:    { type: 'string', format: 'email', example: 'john@company.com' },
            password: { type: 'string', minLength: 8, example: 'Secret123' },
            phone:    { type: 'string', example: '+1-555-0123' },
            role:     { type: 'string', enum: ['admin','sales_manager','sales_executive'], example: 'sales_executive' },
          }}}}},
          responses: {
            201: { description: 'User registered', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' }, accessToken: { type: 'string' } } } } } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            409: { $ref: '#/components/responses/Conflict' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Login with email and password',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email','password'], properties: {
            email:    { type: 'string', format: 'email', example: 'john@company.com' },
            password: { type: 'string', example: 'Secret123' },
          }}}}},
          responses: {
            200: { description: 'Login successful. refreshToken set as httpOnly cookie.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' }, accessToken: { type: 'string', description: 'Short-lived JWT (15m)' } } } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            400: { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'], summary: 'Logout — clears refresh token',
          responses: {
            200: { description: 'Logged out successfully' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/auth/refresh-token': {
        post: {
          tags: ['Auth'], summary: 'Refresh access token using httpOnly cookie or body',
          security: [],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string', description: 'Optional — omit if using cookie' } } } } } },
          responses: {
            200: { description: 'New access token issued', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { accessToken: { type: 'string' } } } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'], summary: 'Get current authenticated user profile',
          responses: {
            200: { description: 'Current user profile', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════
      // USERS (Admin only)
      // ════════════════════════════════════════════════════════════════════
      '/api/users': {
        get: {
          tags: ['Users'], summary: 'List all users',
          description: '**Admin only.** Supports search, filter by role/status, pagination, and sorting.',
          parameters: [
            { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { $ref: '#/components/parameters/SortParam' },
            { name: 'search',   in: 'query', schema: { type: 'string' }, description: 'Search name or email' },
            { name: 'role',     in: 'query', schema: { type: 'string', enum: ['admin','sales_manager','sales_executive'] } },
            { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: {
            200: { description: 'Users list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/User' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          tags: ['Users'], summary: 'Create a new user',
          description: '**Admin only.**',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name','email','password','role'], properties: {
            name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['admin','sales_manager','sales_executive'] },
            phone: { type: 'string' }, manager: { type: 'string', description: 'ObjectId of manager (for sales_executive)' },
          }}}}},
          responses: {
            201: { description: 'User created' }, 400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 409: { $ref: '#/components/responses/Conflict' },
          },
        },
      },
      '/api/users/{id}': {
        get: {
          tags: ['Users'], summary: 'Get user by ID', description: '**Admin only.**',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'User found' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
        put: {
          tags: ['Users'], summary: 'Update user', description: '**Admin only.** Password cannot be changed via this endpoint.',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' }, phone: { type: 'string' }, manager: { type: 'string' } } } } } },
          responses: { 200: { description: 'User updated' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
        delete: {
          tags: ['Users'], summary: 'Soft-delete user (sets isActive=false)', description: '**Admin only.** Cannot delete own account.',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'User deactivated' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/users/{id}/status': {
        patch: {
          tags: ['Users'], summary: 'Activate or deactivate a user', description: '**Admin only.**',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['isActive'], properties: { isActive: { type: 'boolean' } } } } } },
          responses: { 200: { description: 'Status updated' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },

      // ════════════════════════════════════════════════════════════════════
      // LEADS
      // ════════════════════════════════════════════════════════════════════
      '/api/leads': {
        get: {
          tags: ['Leads'], summary: 'List leads with filtering, search, and pagination',
          description: 'Role-scoped: executives see only assigned leads, managers see team leads, admin sees all.',
          parameters: [
            { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { $ref: '#/components/parameters/SortParam' },
            { name: 'status',     in: 'query', schema: { type: 'string', enum: ['new','contacted','qualified','unqualified','converted','lost'] } },
            { name: 'priority',   in: 'query', schema: { type: 'string', enum: ['low','medium','high'] } },
            { name: 'source',     in: 'query', schema: { type: 'string', enum: ['website','referral','social_media','email','phone','other'] } },
            { name: 'assignedTo', in: 'query', schema: { type: 'string' }, description: 'Filter by assigned user ID' },
            { name: 'search',     in: 'query', schema: { type: 'string' }, description: 'Keyword search on name, email, company' },
            { name: 'dateFrom',   in: 'query', schema: { type: 'string', format: 'date' }, description: 'Created date range start' },
            { name: 'dateTo',     in: 'query', schema: { type: 'string', format: 'date' }, description: 'Created date range end' },
          ],
          responses: {
            200: { description: 'Leads list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Lead' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Leads'], summary: 'Create a new lead',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: {
            name: { type: 'string' }, email: { type: 'string', format: 'email' }, phone: { type: 'string' },
            company: { type: 'string' }, source: { type: 'string', enum: ['website','referral','social_media','email','phone','other'] },
            priority: { type: 'string', enum: ['low','medium','high'] }, assignedTo: { type: 'string' }, description: { type: 'string' },
          }}}}},
          responses: { 201: { description: 'Lead created' }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
      },
      '/api/leads/{id}': {
        get: {
          tags: ['Leads'], summary: 'Get lead by ID',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Lead found', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { lead: { $ref: '#/components/schemas/Lead' } } } } } } } }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
        put: {
          tags: ['Leads'], summary: 'Update lead',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, company: { type: 'string' }, source: { type: 'string' }, priority: { type: 'string' }, description: { type: 'string' } } } } } },
          responses: { 200: { description: 'Lead updated' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
        delete: {
          tags: ['Leads'], summary: 'Delete lead', description: '**Admin only.**',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Lead deleted' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/leads/{id}/status': {
        patch: {
          tags: ['Leads'], summary: 'Update lead status',
          description: 'Executives can only update their own leads. Status "converted" is blocked — use /convert endpoint.',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['new','contacted','qualified','unqualified','lost'] } } } } } },
          responses: { 200: { description: 'Status updated' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/leads/{id}/assign': {
        patch: {
          tags: ['Leads'], summary: 'Assign or reassign a lead',
          description: '**Admin/Manager only.** Managers can only assign to their own team members.',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['assignedTo'], properties: { assignedTo: { type: 'string', description: 'User ObjectId to assign the lead to' } } } } } },
          responses: { 200: { description: 'Lead assigned' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/leads/{id}/convert': {
        post: {
          tags: ['Leads'], summary: 'Convert a qualified lead into a customer and deal',
          description: 'Uses a MongoDB transaction. Only qualified leads can be converted. Creates Customer + Deal atomically with 3 timeline entries.',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['dealTitle','dealValue'], properties: {
            dealTitle: { type: 'string', example: 'Enterprise License Q4' },
            dealValue: { type: 'number', example: 25000 },
            dealStage: { type: 'string', enum: ['qualification','discovery','proposal','negotiation'] },
            expectedCloseDate: { type: 'string', format: 'date-time' },
            customerData: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, company: { type: 'string' } } },
          }}}}},
          responses: {
            200: { description: 'Lead converted. Returns updated lead, new customer, and new deal.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { lead: { $ref: '#/components/schemas/Lead' }, customer: { $ref: '#/components/schemas/Customer' }, deal: { $ref: '#/components/schemas/Deal' } } } } } } } },
            400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════
      // CUSTOMERS
      // ════════════════════════════════════════════════════════════════════
      '/api/customers': {
        get: {
          tags: ['Customers'], summary: 'List customers',
          parameters: [
            { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { $ref: '#/components/parameters/SortParam' },
            { name: 'status',     in: 'query', schema: { type: 'string', enum: ['active','inactive'] } },
            { name: 'assignedTo', in: 'query', schema: { type: 'string' } },
            { name: 'search',     in: 'query', schema: { type: 'string' }, description: 'Search name, email, or company' },
            { name: 'dateFrom',   in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'dateTo',     in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: { 200: { description: 'Customers list with pagination' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
        post: {
          tags: ['Customers'], summary: 'Create a customer',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, company: { type: 'string' }, assignedTo: { type: 'string' }, status: { type: 'string', enum: ['active','inactive'] } } } } } },
          responses: { 201: { description: 'Customer created' }, 400: { $ref: '#/components/responses/BadRequest' } },
        },
      },
      '/api/customers/{id}': {
        get: {
          tags: ['Customers'], summary: 'Get customer by ID — includes associated deals',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Customer with originalLead and associated deals', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { customer: { $ref: '#/components/schemas/Customer' }, deals: { type: 'array', items: { $ref: '#/components/schemas/Deal' } } } } } } } } }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
        put: { tags: ['Customers'], summary: 'Update customer', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Customer updated' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } } },
        delete: { tags: ['Customers'], summary: 'Delete customer (Admin/Manager only)', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Customer deleted' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } } },
      },

      // ════════════════════════════════════════════════════════════════════
      // DEALS
      // ════════════════════════════════════════════════════════════════════
      '/api/deals': {
        get: {
          tags: ['Deals'], summary: 'List deals',
          parameters: [
            { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { $ref: '#/components/parameters/SortParam' },
            { name: 'stage',           in: 'query', schema: { type: 'string', enum: ['qualification','discovery','proposal','negotiation','won','lost'] } },
            { name: 'assignedTo',      in: 'query', schema: { type: 'string' } },
            { name: 'minValue',        in: 'query', schema: { type: 'number' } },
            { name: 'maxValue',        in: 'query', schema: { type: 'number' } },
            { name: 'closingDateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'closingDateTo',   in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'search',          in: 'query', schema: { type: 'string' }, description: 'Search deal title' },
          ],
          responses: { 200: { description: 'Deals list with pagination' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
        post: {
          tags: ['Deals'], summary: 'Create a deal',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title','value'], properties: {
            title: { type: 'string' }, lead: { type: 'string' }, customer: { type: 'string' }, assignedTo: { type: 'string' },
            value: { type: 'number', minimum: 0.01 }, probability: { type: 'number', minimum: 0, maximum: 100 },
            expectedCloseDate: { type: 'string', format: 'date-time' }, description: { type: 'string' },
          }}}}},
          responses: { 201: { description: 'Deal created' }, 400: { $ref: '#/components/responses/BadRequest' } },
        },
      },
      '/api/deals/{id}': {
        get: { tags: ['Deals'], summary: 'Get deal by ID', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Deal with populated lead and customer' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } } },
        put: { tags: ['Deals'], summary: 'Update deal fields (not stage)', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Deal updated' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' } } },
        delete: { tags: ['Deals'], summary: 'Delete deal (Admin/Manager only)', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Deal deleted' }, 403: { $ref: '#/components/responses/Forbidden' } } },
      },
      '/api/deals/{id}/stage': {
        patch: {
          tags: ['Deals'], summary: 'Update deal stage with business rule validation',
          description: `**Stage transition rules:**\n- Won: value > 0, probability = 100, expectedCloseDate required\n- Lost: lostReason required\n- Won/Lost deals can only be reopened by Admin`,
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['stage'], properties: {
            stage:             { type: 'string', enum: ['qualification','discovery','proposal','negotiation','won','lost'] },
            lostReason:        { type: 'string', description: 'Required when stage=lost' },
            value:             { type: 'number' },
            probability:       { type: 'number', minimum: 0, maximum: 100 },
            expectedCloseDate: { type: 'string', format: 'date-time', description: 'Required when stage=won' },
          }}}}},
          responses: { 200: { description: 'Stage updated' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },

      // ════════════════════════════════════════════════════════════════════
      // ACTIVITIES
      // ════════════════════════════════════════════════════════════════════
      '/api/activities': {
        get: {
          tags: ['Activities'], summary: 'List activities. Backend auto-marks overdue before returning.',
          parameters: [
            { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { $ref: '#/components/parameters/SortParam' },
            { name: 'type',        in: 'query', schema: { type: 'string', enum: ['call','email','meeting','demo','follow_up','reminder','note'] } },
            { name: 'status',      in: 'query', schema: { type: 'string', enum: ['pending','completed','overdue'] } },
            { name: 'assignedTo',  in: 'query', schema: { type: 'string' } },
            { name: 'dueDateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'dueDateTo',   in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'relatedId',   in: 'query', schema: { type: 'string' }, description: 'Filter by related entity ID' },
            { name: 'relatedType', in: 'query', schema: { type: 'string', enum: ['lead','customer','deal','user'] } },
          ],
          responses: { 200: { description: 'Activities list with pagination' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
        post: {
          tags: ['Activities'], summary: 'Create an activity',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['type','title'], properties: {
            type: { type: 'string', enum: ['call','email','meeting','demo','follow_up','reminder','note'] },
            title: { type: 'string' }, description: { type: 'string' },
            assignedTo: { type: 'string' }, dueDate: { type: 'string', format: 'date-time' },
            relatedTo: { type: 'object', properties: { entityId: { type: 'string' }, entityType: { type: 'string', enum: ['lead','customer','deal','user'] } } },
          }}}}},
          responses: { 201: { description: 'Activity created' }, 400: { $ref: '#/components/responses/BadRequest' } },
        },
      },
      '/api/activities/{id}': {
        get:    { tags: ['Activities'], summary: 'Get activity by ID', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Activity found' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } } },
        put:    { tags: ['Activities'], summary: 'Update activity',    parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Activity updated' }, 403: { $ref: '#/components/responses/Forbidden' } } },
        delete: { tags: ['Activities'], summary: 'Delete activity (exec can only delete own)', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Activity deleted' }, 403: { $ref: '#/components/responses/Forbidden' } } },
      },
      '/api/activities/{id}/complete': {
        patch: {
          tags: ['Activities'], summary: 'Mark activity as completed',
          parameters: [{ $ref: '#/components/parameters/IdParam' }],
          responses: { 200: { description: 'Activity completed with completedAt timestamp' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },

      // ════════════════════════════════════════════════════════════════════
      // TIMELINE
      // ════════════════════════════════════════════════════════════════════
      '/api/timeline/lead/{id}':     { get: { tags: ['Timeline'], summary: 'Get timeline for a lead',     parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }], responses: { 200: { description: 'Timeline entries' } } } },
      '/api/timeline/customer/{id}': { get: { tags: ['Timeline'], summary: 'Get timeline for a customer', parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }], responses: { 200: { description: 'Timeline entries' } } } },
      '/api/timeline/deal/{id}':     { get: { tags: ['Timeline'], summary: 'Get timeline for a deal',     parameters: [{ $ref: '#/components/parameters/IdParam' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }], responses: { 200: { description: 'Timeline entries' } } } },

      // ════════════════════════════════════════════════════════════════════
      // DASHBOARD
      // ════════════════════════════════════════════════════════════════════
      '/api/dashboard/stats': {
        get: {
          tags: ['Dashboard'], summary: 'Overall CRM statistics',
          description: 'Returns total/new/qualified/converted leads, customers, total/open/won/lost deals, total revenue, expected revenue, conversion rate, win rate, pending/overdue activities.',
          responses: { 200: { description: 'Stats object with leads, customers, deals, revenue, activities, rates' } },
        },
      },
      '/api/dashboard/pipeline': {
        get: {
          tags: ['Dashboard'], summary: 'Deal pipeline by stage',
          description: 'All 6 stages with count, totalValue, expectedRevenue, and avgProbability.',
          responses: { 200: { description: 'Pipeline array of 6 stages' } },
        },
      },
      '/api/dashboard/team-performance': {
        get: {
          tags: ['Dashboard'], summary: 'Team performance metrics (Admin/Manager only)',
          description: 'Per-user: leadsAssigned, leadsConverted, conversionRate, dealsTotal, dealsWon, openDeals, totalWonValue, pendingActivities, overdueActivities.',
          parameters: [
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate',   in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: { 200: { description: 'Team performance array' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/dashboard/team-activities': {
        get: {
          tags: ['Dashboard'], summary: 'Pending/overdue activities for manager team (Admin/Manager only)',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending','overdue','completed'] } },
            { name: 'type',   in: 'query', schema: { type: 'string', enum: ['call','email','meeting','demo','follow_up','reminder','note'] } },
            { name: 'managerId', in: 'query', schema: { type: 'string' }, description: 'Admin only — scope to specific manager team' },
          ],
          responses: { 200: { description: 'Activities list' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/dashboard/recent-activities': {
        get: {
          tags: ['Dashboard'], summary: 'Most recent activities',
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
          responses: { 200: { description: 'Recent activities array' } },
        },
      },

      // ════════════════════════════════════════════════════════════════════
      // CONFIG (Admin only)
      // ════════════════════════════════════════════════════════════════════
      '/api/config': {
        get:  { tags: ['Config'], summary: 'List all CRM config settings (Admin only)', responses: { 200: { description: 'Config list' }, 403: { $ref: '#/components/responses/Forbidden' } } },
        post: { tags: ['Config'], summary: 'Create or update a config setting (Admin only)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['key','value'], properties: { key: { type: 'string', example: 'max_leads_per_exec' }, value: {}, description: { type: 'string' } } } } } }, responses: { 200: { description: 'Config saved' }, 400: { $ref: '#/components/responses/BadRequest' }, 403: { $ref: '#/components/responses/Forbidden' } } },
      },
      '/api/config/{key}': {
        get:    { tags: ['Config'], summary: 'Get config by key (Admin only)', parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Config entry' }, 404: { $ref: '#/components/responses/NotFound' } } },
        delete: { tags: ['Config'], summary: 'Delete config by key (Admin only)', parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Config deleted' }, 404: { $ref: '#/components/responses/NotFound' } } },
      },
    },
  },
  apis: [], // paths defined inline above, not via JSDoc annotations
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
