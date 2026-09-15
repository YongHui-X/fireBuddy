# Authenication:
User logs in
   ↓
Supabase Auth verifies username/password
   ↓
Supabase gives the frontend an access token (JWT)
   ↓
Frontend stores/uses that token
   ↓
Frontend calls your FastAPI backend
   ↓
It sends:

Authorization: Bearer <JWT>

Supabase Auth
├── User login
├── Verify email/password
├── Manage user accounts/sessions
└── Issue JWT access token
             ↓
Your FastAPI backend
├── Receive JWT
├── Verify signature
├── Check expiry / issuer / audience
├── Extract user ID (sub)
├── Reject invalid requests with 401
└── Protect API endpoints

A user can make up to 10 requests within the rolling 60-second window.

This is called a sliding-window rate limiter.