# Village Data API - Complete Documentation

## 6. API Development Specifications

### 6.1 Base URL Structure

```
Production: https://api.villageapi.com/v1/
Staging:    https://staging-api.villageapi.com/v1/
Local:      http://localhost:3000/v1/
```

### 6.2 Authentication Method

All API requests require:

```
Header: X-API-Key: {api_key}
Header: X-API-Secret: {api_secret} (for write operations)
```

### 6.3 Standard Response Format

```json
{
  "success": true,
  "count": 25,
  "data": [...],
  "meta": {
    "requestId": "req_xxx",
    "responseTime": 47,
    "rateLimit": {
      "remaining": 4850,
      "limit": 5000,
      "reset": "2024-01-15T00:00:00Z"
    }
  }
}
```

### 6.4 API Endpoints Specification

| Method | Endpoint | Description | Query Parameters |
|---------|-----------|-------------|------------------|
| GET | /search | Search villages | q, state, district, subDistrict, limit |
| GET | /states | List all states | (none) |
| GET | /states/{id}/districts | Districts by state | (none) |
| GET | /districts/{id}/subdistricts | Sub-districts by district | (none) |
| GET | /subdistricts/{id}/villages | Villages by sub-district | page, limit |
| GET | /autocomplete | Typeahead suggestions | q, hierarchyLevel |

### 6.5 Response Format for Drop-Down Menus

The primary endpoint returns data in this structure for direct use in dropdowns:

```json
{
  "value": "village_id_525002",
  "label": "Manibeli",
  "fullAddress": "Manibeli, Akkalkuwa, Nandurbar, Maharashtra, India",
  "hierarchy": {
    "village": "Manibeli",
    "subDistrict": "Akkalkuwa", 
    "district": "Nandurbar",
    "state": "Maharashtra",
    "country": "India"
  }
}
```

### 6.6 Error Codes

| HTTP Code | Error Code | Description |
|-----------|-------------|-------------|
| 400 | INVALID_QUERY | Search query too short or invalid |
| 401 | INVALID_API_KEY | API key missing or invalid |
| 403 | ACCESS_DENIED | User not authorized for requested state |
| 404 | NOT_FOUND | Requested resource does not exist |
| 429 | RATE_LIMITED | Daily quota exceeded |
| 500 | INTERNAL_ERROR | Server-side error |

## 7. Frontend Dashboard Requirements

### 7.1 Technology Stack

- Framework: React 18+ with TypeScript
- Build Tool: Vite (faster builds than CRA)
- Styling: Tailwind CSS for utility-first styling
- Charts: Recharts for all visualizations
- State Management: Zustand (lightweight alternative to Redux)
- Data Fetching: React Query with built-in caching

### 7.2 Common Dashboard Components

**Navigation Layout:**
- Sidebar with collapsible menu
- Top bar with user profile and notifications
- Breadcrumb navigation for deep linking
- Responsive design for tablet and desktop

**Data Table Component:**
- Sortable columns
- Filterable by all fields
- Row selection for bulk operations
- Export to CSV/Excel functionality

### 7.3 Performance Requirements

- Initial load under 2 seconds
- Chart rendering under 500ms
- Table pagination under 300ms
- Optimistic UI updates for all actions

## 8. Admin Panel Specifications

### 8.1 Dashboard Analytics Visualizations

**Required Charts (All using Recharts):**

| Chart Type | Data Displayed | Update Frequency |
|-------------|------------------|------------------|
| Bar Chart | Top 10 states by village count | Daily |
| Line Chart | API requests over last 30 days | Real-time |
| Pie Chart | User distribution by plan type | Hourly |
| Area Chart | Response time trends (p95, p99) | Real-time |
| Stacked Bar | Requests by endpoint | Daily |
| Heat Map | Usage by hour of day | Real-time |

**Key Metrics Cards:**
- Total Villages (with change percentage)
- Active Users (today vs yesterday)
- Today's API Requests (with hourly breakdown)
- Average Response Time (with SLA indicator)
- Total Revenue (if payment integration added)

### 8.2 User Management Features

**User List View:**
- Search by email, business name, or API key
- Filter by status (Pending, Active, Suspended)
- Filter by plan type (Free, Premium, Pro, Unlimited)
- Sort by registration date, last active, request count
- Bulk actions: approve, suspend, delete

**User Detail View:**
- Complete profile information
- Current plan and usage statistics
- State access matrix (which states they can query)
- API keys management (create, revoke, rotate)
- Request history with drill-down capability
- Notes/comments section for admin communication

**User Approval Workflow:**
- User registers with business email
- Admin receives notification (email/dashboard)
- Admin reviews business details
- Admin approves or rejects with reason
- Approved user receives email notification
- User can generate API keys after approval

### 8.3 State Access Management

Admin can grant/revoke state-level access:
- Option 1: Grant all states (full India access)
- Option 2: Select specific states from dropdown
- Option 3: Grant by region (North, South, East, West)
- Audit log of all access changes

### 8.4 Village Master List (Data Browser)

**Purpose:** Admin interface to explore and verify imported data

**Filter Options:**
- State dropdown (required filter)
- District dropdown (dependent on state)
- Sub-district dropdown (dependent on district)
- Village name search (partial match)

**Pagination Configuration:**
- Page size options: 500, 5,000, 10,000 rows
- Jump to specific page number
- Previous/Next navigation
- Total record count display

**Column Display:**

| Column | Source Field |
|---------|--------------|
| State Name | State.name |
| District Name | District.name |
| Sub-District Name | SubDistrict.name |
| Village Code | village.code |
| Village Name | village.name |

### 8.5 API Logs Viewer

**Purpose:** Monitor and debug API usage

**Columns:**
- Timestamp (with timezone)
- API Key (masked for security)
- User/Business Name
- Endpoint called
- Response Time (ms)
- Status Code
- IP Address (masked)

**Filters:**
- Date range picker (last hour, day, week, month, custom)
- User selection
- Endpoint filter
- Status code filter (2xx, 4xx, 5xx)
- Minimum response time threshold

**Export Options:**
- Download as CSV
- Download as JSON
- Email weekly digest

## 9. B2B User Portal Specifications

### 9.1 Self-Registration Process

**Registration Form Fields:**
- Business Email (no free email providers allowed)
- Business Name (registered company name)
- GST Number (optional, for future invoicing)
- Phone Number (with country code)
- Password (minimum 8 chars, with complexity)
- Confirm Password

**Post-Registration:**
- Account status: PENDING_APPROVAL
- Email sent to user confirming submission
- Admin notification for review
- User cannot generate API keys until approved

### 9.2 User Dashboard Components

**Usage Summary Cards:**
- Today's Requests / Daily Limit
- This Month's Total Requests
- Average Response Time (last 24 hours)
- Successful Requests Percentage

**Usage Chart (Recharts Line Chart):**
- X-axis: Last 7 days or 30 days
- Y-axis: Request count
- Tooltip showing exact count per day
- Color-coded by endpoint type

### 9.3 API Key Management

**Key Creation:**
- User provides key name (e.g., "Production Server", "Staging")
- System generates API Key and Secret
- Secret displayed ONLY once (with warning)
- User must store secret securely

**Key Display Table:**

| Key Name | API Key (masked) | Created Date | Last Used | Status |
|-----------|-------------------|--------------|-----------|--------|
| Prodak_****abcd | 2024-01-01 | 2024-01-15 | Active |

**Key Actions:**
- Copy API Key to clipboard
- Regenerate Secret (invalidates old secret)
- Revoke Key (immediate deactivation)
- View usage per key (drill-down)

### 9.4 API Documentation Access

**Interactive Documentation:**
- Built-in Swagger/OpenAPI UI
- Try-it-out functionality with live API key
- Code examples in multiple languages (cURL, Python, JavaScript, PHP)
- Response schema documentation

**Quick Start Guide:**
- Copy your API key from dashboard
- Make your first request
- Integrate into your application
- Monitor usage in dashboard

## 10. Authentication & Security

### 10.1 Authentication Layers

| Layer | Method | Purpose |
|--------|-----------|---------|
| User Login | JWT (expires 24 hours) | Dashboard access |
| API Access | API Key + Secret | Programmatic access |
| Admin Actions | JWT + 2FA (optional) | Sensitive operations |

### 10.2 API Key Format

```
API Key:    ak_[32 characters hex]     Example: ak_a1b2c3d4e5f67890abcdef12345678
API Secret: as_[32 characters hex]     Example: as_1234567890abcdef1234567890abcdef
```

### 10.3 Security Rules

- Secrets are hashed with bcrypt (never stored plaintext)
- API keys can be revoked instantly
- Keys can have expiration dates
- Each user can have up to 5 active keys

### 10.4 Security Headers (All Responses)

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

### 10.4 Rate Limiting Strategy

**Per-API-Key Limits (Daily):**

| Plan Type | Daily Requests | Burst Limit (per minute) |
|-------------|-----------------|-------------------------|
| Free | 5,000 | 100 |
| Premium | 50,000 | 500 |
| Pro | 300,000 | 2,000 |
| Unlimited | 1,000,000 | 5,000 |

**Rate Limit Headers Returned:**

```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4850
X-RateLimit-Reset: 1705276800
```

## 11. Rate Limiting & Tier Management

### 11.1 Plan Definitions

| Plan | Price Point | Daily Requests | Ideal For | Features |
|-------|--------------|----------------|------------|----------|
| Free | $0 | 5,000 | Development, testing | Single state access |
| Premium | $49/month | 50,000 | Small businesses | Up to 5 states |
| Pro | $199/month | 300,000 | Mid-size enterprises | All states, priority support |
| Unlimited | $499/month | 1,000,000 | Large enterprises | All states, SLA, dedicated support |

### 11.2 Admin Plan Management

**Actions Available to Admin:**
- Manually upgrade/downgrade any user
- Grant temporary limit increases (holiday season)
- Set custom limits for enterprise clients
- View users approaching their limits
- Auto-suspend users exceeding limits (configurable)

### 11.3 Usage Alerting

**Automated Notifications to Users:**
- 80% of daily limit reached (email)
- 95% of daily limit reached (email + dashboard)
- Limit exceeded (email + temporary block)

**Admin Alerts:**
- Multiple users approaching limits
- Unusual usage patterns (possible abuse)
- System-wide rate limit approaching capacity

## 12. Deployment Strategy

### 12.1 Vercel Deployment Configuration

**Project Structure for Vercel:**

```
project-root/
├── api/              # Serverless functions (backend)
├── frontend/         # React dashboard (frontend)
├── prisma/           # Database schema
└── vercel.json       # Deployment configuration
```

**Environment Variables (Vercel):**

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | NeonDB connection string |
| REDIS_URL | Upstash Redis URL |
| JWT_SECRET | JWT signing key |
| ADMIN_EMAIL | Super admin login email |
| ADMIN_PASSWORD_HASH | Super admin password hash |
| SMTP_* | Email sending configuration |

### 12.2 Deployment Environments

| Environment | URL | Purpose |
|-------------|-------|---------|
| Auto-deploy | Preview{pr-number}.vercel.app | Code review |
| Staging | staging.villageapi.com | QA testing |
| Production | api.villageapi.com | Live traffic |

### 12.3 Database Migration Strategy

**Process:**
1. Create migration file: `npx prisma migrate dev --name description`
2. Test migration on staging database
3. Run migration on production during maintenance window
4. Verify data integrity with validation queries
5. Rollback plan documented for each migration

**Migration Safety:**
- All migrations are reversible
- Backups taken before production migrations
- Migration runs in transaction (all or nothing)

## 13. Demo Client Project

### 13.1 Purpose

Build a separate demonstration project to showcase API integration for potential B2B clients. This serves as both a sales tool and a reference implementation.

### 13.2 Demo Application Specifications

**Type:** Simple contact form web application

**Fields:**
- Full Name (text input)
- Email Address (email input)
- Phone Number (tel input)
- Address Section (using API for autocomplete):
  - Village/Area (dropdown, populated from API)
  - Sub-District (auto-filled after village selection)
  - District (auto-filled)
  - State (auto-filled)
  - Country (auto-filled as "India")
- Message (textarea)
- Submit Button

### 13.3 API Integration Flow

1. User starts typing in Village/Area field (minimum 2 characters)
2. Frontend calls `/api/v1/autocomplete?q={query}`
3. API returns matching villages with full hierarchy
4. Dropdown displays: Manibeli (Akkalkuwa, Nandurbar, Maharashtra)
5. User selects a village
6. All other address fields auto-populate
7. Form submission includes full address in standardized format

### 13.4 Demo Configuration

**Environment File (.env.local):**

```
VITE_API_URL=https://api.villageapi.com/v1
VITE_API_KEY=demo_public_key_for_presentations
```

**Note:** Demo uses a restricted API key with:
- Read-only access
- Limited to 100 requests per day
- Only Maharashtra state data
- Publicly shareable for presentations

### 13.5 Deployment (Separate from Main Platform)

Deploy demo client separately to:
- URL: demo.villageapi.com or village-api-demo.vercel.app
- No authentication required (uses demo API key)
- Clear labeling that this is a demonstration

---

## 🚀 Production Deployment Status

**Current Status:** Database connection issues being resolved
**Platform:** Complete SaaS infrastructure ready for B2B clients
**Next Steps:** Fix NeonDB SSL connection → Go live with full API platform

---

*This documentation covers the complete technical specifications for the Village Data API SaaS platform.*
