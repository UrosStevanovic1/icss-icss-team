# AUTH_AND_RBAC.md

## Team workflow (read first)
Before starting any work, **always pull the latest version of the repository** to ensure you are working on the current codebase and to avoid merge conflicts.

All new or changed code must be:
1. **Implemented and verified on your personal deployment/environment first** (basic functional + permission checks).
2. **Communicated clearly to the team** (e.g., in the team group chat/channel), including:
   - what was changed,
   - which files/routers/components were affected,
   - any new endpoints or breaking changes,
   - and what sanity checks you ran.

This ensures changes remain traceable, testable, and safe to build on.

---

## Overview
This project uses **JWT-based authentication** and **role-based access control (RBAC)**.

### Key goals
- Enforce role permissions **server-side** (UI restrictions are not security).
- Support **scoped access** (“specific”, “own”) where data ownership applies.
- Keep auth rules consistent so the system remains safe while routers/components are refined.

---

## Roles

### 1) Student
**Philosophy:** Pure consumer (read-only).

**Intended permissions**
- `schedule:view:specific`  
  View schedule events where `student_group_id` matches the student’s enrollment.
- `module:view:specific`  
  View modules the student is enrolled in.

**Current note:** “specific” filtering for student requires enrollment tables (student ↔ group/module), which may be added later.

---

### 2) Lecturer
**Philosophy:** Contributor & self-manager.

**Permissions**
- `schedule:view:specific`  
  View schedule events where `lecturer_id == current_user.lecturer_id`.
- `module:view:specific`  
  View modules where the lecturer is assigned.
- `availability:all:own`  
  Full CRUD on lecturer availability where `lecturer_id == current_user.lecturer_id`.
- `lecturer:update:own (restricted)`  
  Lecturer can update **only** `personal_email` and `phone` on their own lecturer profile.  
  All other lecturer fields are PM/Admin-only.

**Current note:** module/schedule “specific” requires assignment/schedule tables to be fully enforceable.

---

### 3) Head of Study Program (HoSP)
**Philosophy:** Manager of a specific program domain.

**Permissions**
- `lecturer:view:global`  
  View all lecturers (to assign them to modules).
- `program:all:specific`  
  Update study programs only where:  
  `study_programs.head_of_program_id == current_user.lecturer_id`
- `module:all:specific`  
  Create/edit/delete modules only where `modules.program_id` is owned by HoSP.
- `specialization:all:specific`  
  Manage specializations only where `specializations.program_id` is owned by HoSP.
- `group:all:specific`  
  Manage student groups only within their program domain.
- `constraint:all:specific`  
  Manage constraints within program domain.  
  Recommended enforcement: `scope="Program"` and `target_id=<program_id>`.

---

### 4) PM / Admin
**Philosophy:** Full access / system owners.

**Permissions**
- Full CRUD across all resources.
- Assign HoSP by setting `study_programs.head_of_program_id`.

---

## Authentication

### Login
Client calls:
- `POST /api/auth/login` with `{ email, password }`

Response returns:
- `access_token`
- `role`
- `lecturer_id` (nullable)

### JWT claims (token payload)
The JWT contains:
- `sub` (email)
- `role` (`"pm" | "admin" | "hosp" | "lecturer" | "student"`)
- `lecturer_id` (0 if none)
- `exp` (expiry timestamp)

**Important:** `SECRET_KEY` must be set in deployment environment variables so tokens stay verifiable across serverless instances.

---

## Authorization rules (RBAC)

### Server-side enforcement
The backend must reject unauthorized actions with **403**, even if the UI hides buttons.

### “own”
Means: the resource belongs to the current lecturer identity. Examples:
- Lecturer availability “own”:  
  `lecturer_availabilities.lecturer_id == current_user.lecturer_id`
- Lecturer profile “own”:  
  `lecturers.id == current_user.lecturer_id`

### “specific”
Means: the resource is within the user’s domain. Examples:
- HoSP owns a program:  
  `study_programs.head_of_program_id == current_user.lecturer_id`
- HoSP owns a module:  
  `modules.program_id in hosp_program_ids(current_user)`




