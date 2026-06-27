# Future Tasks & Implementation Backlog

This document tracks the pending advanced features that are planned for future development.

## 1. Guest Checkout & Login (See `docs/guest_login_implementation_plan.md`)
- **Status**: Pending
- **Tasks**:
  - Make `passwordHash` optional in database (`schema.prisma`)
  - Implement `POST /api/v1/auth/guest-login` in backend
  - Add "Checkout as Guest" form on frontend (`AccountAuth.tsx`)
  - Support guest flow in checkout and order tracking

## 2. Returns & Refunds System with AI (See `docs/returns-system-architecture.md`)
- **Status**: Pending
- **Tasks**:
  - Add `ReturnRequest` model to database
  - Implement backend return API and AI vision analysis (fraud score)
  - Add frontend "Request Return" UI for customers
  - Add Admin UI to approve returns and trigger automated Stripe refunds

## 3. Advanced AI Features (See `docs/ai_powered_ecommerce_plan.md`)
- **Status**: Pending
- **Tasks**:
  - **AI Shopping Assistant**: Storefront RAG Chatbot
  - **Advanced Image Generation**: Background removal & Lifestyle placement via Image-to-Image API
  - **Meta Pixel & TikTok Live Analytics**: Dashboard integration for tracking events

---
*Note: The core platform including Admin panel, Storefront, CMS, Product Management, Cart, Checkout, and Sendcloud Live Labels are fully implemented and deployed.*
