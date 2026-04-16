# 🔐 Village API - Authentication & Usage Guide

## Phase 1: Authentication Foundation ✅ COMPLETE

Your API now includes a full authentication system with JWT tokens and API keys.

---

## 📌 Quick Start

### 1. Register a New Account

**Endpoint:** `POST /auth/register`

**Request:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "fullName": "John Doe",
    "companyName": "My Tech Company"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please wait for admin approval.",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Note:** Account starts in `pending` status. Admin must approve before it becomes `active`.

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Request:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "client",
    "subscriptionTier": "free"
  }
}
```

**Token Expiry:** 7 days

---

### 3. Create API Key

**Endpoint:** `POST /auth/api-keys`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN_FROM_LOGIN>
Content-Type: application/json
```

**Request:**
```bash
curl -X POST http://localhost:3000/auth/api-keys \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Production App"
  }'
```

**Response:**
```json
{
  "success": true,
  "apiKey": {
    "id": 5,
    "name": "My Production App",
    "created_at": "2026-04-10T14:30:00Z"
  },
  "key": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "secret": "x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3",
  "message": "Save this key and secret securely. They will not be shown again."
}
```

⚠️ **IMPORTANT:** Save the `key` and `secret` immediately. They are only shown once!

---

### 4. Use API Key for Requests

Now use your API key and secret to call protected endpoints:

**Headers:**
```
X-API-Key: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
X-API-Secret: x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/states \
  -H "X-API-Key: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "X-API-Secret: x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3"
```

---

### 5. List Your API Keys

**Endpoint:** `GET /auth/api-keys`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request:**
```bash
curl -X GET http://localhost:3000/auth/api-keys \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "apiKeys": [
    {
      "id": 5,
      "name": "My Production App",
      "key_hash": "abc123...",
      "is_active": true,
      "rate_limit": 1000,
      "created_at": "2026-04-10T14:30:00Z",
      "last_used": "2026-04-10T18:45:00Z",
      "expires_at": null
    }
  ]
}
```

---

### 6. Disable API Key

**Endpoint:** `DELETE /auth/api-keys/:id`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request:**
```bash
curl -X DELETE http://localhost:3000/auth/api-keys/5 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "message": "API key disabled"
}
```

---

### 7. Verify JWT Token

**Endpoint:** `GET /auth/verify`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request:**
```bash
curl -X GET http://localhost:3000/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "client",
    "subscription_tier": "free"
  }
}
```

---

## 📊 Data API Endpoints (Public)

All data endpoints remain public but will track usage when using API keys:

### Browse States
```bash
GET /states?limit=50&offset=0
```

### Get Districts by State
```bash
GET /states/:id/districts?limit=50&offset=0
```

### Get Subdistricts by District
```bash
GET /districts/:id/subdistricts?limit=50&offset=0
```

### Get Villages by Subdistrict
```bash
GET /subdistricts/:id/villages?limit=50&offset=0
```

### Search
```bash
GET /search?q=village_name&limit=50&offset=0
```

---

## 🔒 Authentication Methods

### Method 1: JWT Token (for portal/admin)
```
Header: Authorization: Bearer <TOKEN>
```

### Method 2: API Key + Secret (for clients)
```
Header: X-API-Key: <KEY>
Header: X-API-Secret: <SECRET>
```

---

## 📈 Subscription Tiers

| Tier | Price/Month | Daily Requests | Max API Keys | Features |
|------|-------------|-----------------|---|----------|
| **Free** | $0 | 1,000 | 1 | Basic browsing |
| **Premium** | $29.99 | 50,000 | 5 | + Advanced search, webhooks |
| **Pro** | $99.99 | 500,000 | 25 | + Custom fields, SSO |
| **Unlimited** | $299.99 | Unlimited | 100 | All features |

---

## 🛡️ Security Best Practices

1. **Never share your API secret** in client-side code
2. **Regenerate keys** if compromised
3. **Use HTTPS only** in production (we use it already)
4. **Rotate keys regularly** (quarterly recommended)
5. **Monitor usage** in your dashboard
6. **Set token expiry** appropriately (current: 7 days)

---

## 🔧 Database Tables

### `users`
Stores user accounts with authentication info

### `api_keys`
Stores API key pairs for programmatic access

### `api_usage_logs`
Tracks every API call (endpoint, response time, status)

### `subscription_plans`
Defines the 4 tier levels (Free, Premium, Pro, Unlimited)

### `billing`
Monthly billing records and invoices

### `audit_log`
Admin actions and account changes

---

## 🚀 What's Next?

**Phase 2:** Admin Dashboard
- User management
- Approve/suspend accounts
- Analytics dashboard
- Revenue tracking

**Phase 3:** B2B Client Portal
- Self-service dashboard
- Usage monitoring
- Billing history

**Phase 4:** Rate Limiting & Caching
- Redis caching (sub-100ms response)
- Tier-based rate limits

**Phase 5:** Production Deployment
- NeonDB cloud migration
- Vercel deployment
- Monitoring & logging

---

## ❓ Troubleshooting

### "Email already exists"
Register with a different email or reset password

### "Account is pending"
Wait for admin approval (check your email)

### "Invalid API credentials"
Check that X-API-Key and X-API-Secret are correct

### "Token expired"
Login again to get a new token

---

## 📞 Support

For issues or questions:
1. Check the docs above
2. Review the curl examples
3. Check error messages in response
