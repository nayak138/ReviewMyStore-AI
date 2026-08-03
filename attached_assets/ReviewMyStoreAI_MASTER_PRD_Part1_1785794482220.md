# ReviewMyStore.ai
## Engineering & Product Specification (EPS)
### Version 1.0
### Product Status: MVP
### Target Platform: Replit Agent
### Document Type: Engineering & Product Specification
### Last Updated: August 2026

---

# Executive Summary

## Overview

ReviewMyStore.ai is an AI-powered SaaS platform designed to help businesses generate more authentic Google Reviews using QR codes and NFC-enabled standees.

Unlike traditional review QR code generators that simply redirect customers to Google, ReviewMyStore.ai guides customers through a simple AI-assisted experience where they can quickly generate a natural, editable review before being redirected to Google's official review page.

The platform is designed from day one as a multi-tenant SaaS capable of supporting thousands of businesses while remaining simple enough for a small local café to start using within minutes.

The MVP focuses exclusively on Google Reviews. The architecture must remain flexible enough to support additional review platforms in the future without major redesign.

---

# Product Vision

## Mission

Help every local business collect more genuine Google Reviews with the least amount of effort for both the business owner and the customer.

## Vision

Become the leading AI-powered review generation and reputation growth platform for local businesses worldwide.

The long-term vision is not to become "another QR generator."

Instead, ReviewMyStore.ai should become the operating system businesses use to manage their customer review acquisition process.

---

# Problem Statement

Most businesses ask customers to:

> Please leave us a Google Review.

Customers must search, think, type and submit manually, creating friction and reducing review volume.

---

# Solution

Customer Journey

1. Scan QR Code or Tap NFC
2. Landing Page Opens
3. Select Keywords
4. AI Generates Review Draft
5. Customer Edits (Optional)
6. Copy Review
7. Redirect to Google Review Page
8. Paste & Submit

The AI assists the customer but never submits reviews on their behalf.

---

# Core Principles

1. Mobile First
2. Reduce Customer Effort
3. Premium SaaS Experience
4. Fast Performance
5. Secure by Default
6. Multi-Tenant from Day One

---

# Target Customers

- Restaurants
- Cafés
- Hotels
- Clinics
- Salons
- Gyms
- Retail Stores
- Service Businesses

---

# User Roles

## Super Admin
Platform-wide management.

## Business Owner
Manage only owned shops.

## Customer
No account required.

---

# Product Scope (MVP)

Included

- Google Reviews
- AI Review Generation
- QR Codes
- NFC Devices
- Multi-Shop Support
- Analytics
- Orders
- Super Admin
- Business Dashboard
- Authentication
- Responsive UI

Excluded (Future)

- Facebook Reviews
- TripAdvisor
- Zomato
- Stripe Billing
- White Label Domains

---

# High-Level Architecture

Customer Browser

↓

React Frontend

↓

Express API

↓

Gemini + PostgreSQL (Drizzle ORM)

---

# Technology Stack

Frontend

- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend

- Node.js
- Express
- TypeScript

Database

- PostgreSQL (Neon)

Authentication

- JWT
- Refresh Tokens
- bcrypt
- RBAC

AI

- Google Gemini

Deployment

- Replit Deployments

---

# Multi-Tenant Rules

- One owner can have many shops.
- Every shop has isolated data.
- Customers never authenticate.
- Every protected API verifies ownership.
- Business logic belongs in services, not UI components.

---

**End of Part 1**
