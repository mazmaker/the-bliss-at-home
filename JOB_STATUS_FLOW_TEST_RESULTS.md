# Job Status Flow Testing Report
**Testing Date:** 2026-05-21  
**Booking ID:** `5fafe8c9-8564-41cd-8b45-36c64f74ab6e`  
**Booking Number:** `BK20260517-0305`

## 🎯 Test Objective
Test the 22-status workflow system in The Bliss at Home platform, focusing on:
1. Status transitions from CONFIRMED → STAFF_MATCHING → ASSIGNED → STAFF_PREPARING → STAFF_EN_ROUTE
2. Map display logic (should show only during STAFF_EN_ROUTE)
3. UI updates across Customer App and Staff App

## 📋 Test Environment
- **Customer App:** http://localhost:3008 ✅ Running
- **Staff App:** https://wallet-rfc-kelly-part.trycloudflare.com ⚠️ Cloudflare tunnel
- **API Server:** http://localhost:3000 ✅ Running
- **Database:** Supabase Production (rbdvlfriqjnwpxmmgisf)

## 🔍 Initial State Analysis

### Current Booking Status
```json
{
  "id": "5fafe8c9-8564-41cd-8b45-36c64f74ab6e",
  "booking_number": "BK20260517-0305", 
  "status": "confirmed",
  "staff_id": "f393dff7-1699-4f2c-a03d-e64750865ef7",
  "customer_id": "49c16fec-99e5-4aac-981b-2f3007eb715e",
  "booking_date": "2026-05-26",
  "booking_time": "15:45:00",
  "duration": 60,
  "service": "Thai Massage (นวดแผนไทย)",
  "final_price": 799,
  "address": "เตย (0944444), 300, บางลำภูล่าง, คลองสาน, กรุงเทพมหานคร, 10600"
}
```

### Staff Assigned
- **Staff ID:** f393dff7-1699-4f2c-a03d-e64750865ef7
- **Name:** ดอกไม้ ทำเล็บสวย  
- **Phone:** 082-345-6789
- **Status:** Active, Available

### Status Flow Schema
The booking uses **TWO status systems**:

1. **Legacy Status** (`bookings.status`): 'confirmed'
2. **New State Machine** (`bookings.status_v2`): Using 22-step workflow

**22-Step Workflow:**
```
PENDING → PAYMENT_REQUIRED → CONFIRMED → STAFF_MATCHING → ASSIGNED → 
STAFF_PREPARING → STAFF_EN_ROUTE → STAFF_NEARBY → STAFF_ARRIVED → 
SERVICE_STARTING → SERVICE_IN_PROGRESS → SERVICE_PAUSED → SERVICE_COMPLETED → 
PAYMENT_PROCESSING → COMPLETED
```

**Branch paths:** CANCELLED, NO_STAFF_AVAILABLE

## 🧪 Test Execution

### Test 1: Customer App - Initial Status Display
**URL:** http://localhost:3008/bookings/5fafe8c9-8564-41cd-8b45-36c64f74ab6e

**Expected:**
- Show status as "ยืนยันแล้ว" (confirmed)  
- NO map should be visible (not in STAFF_EN_ROUTE yet)
- Display booking details correctly

**Result:** [TO BE TESTED]

### Test 2: Staff App - Job Management
**URL:** https://wallet-rfc-kelly-part.trycloudflare.com

**Expected:**
- Staff can see assigned job
- Available status transitions from current state
- GPS controls visible but not tracking yet

**Result:** [TO BE TESTED]

### Test 3: Status Transition Testing
Will test the following sequence:

#### 3a. CONFIRMED → STAFF_MATCHING
- **Trigger:** Auto/Manual assignment process
- **Expected:** Status changes, notifications sent

#### 3b. STAFF_MATCHING → ASSIGNED  
- **Trigger:** Staff accepts job
- **Expected:** Staff assignment confirmed

#### 3c. ASSIGNED → STAFF_PREPARING
- **Trigger:** Staff marks "preparing"
- **Expected:** Customer notified staff is preparing  

#### 3d. STAFF_PREPARING → STAFF_EN_ROUTE
- **Trigger:** Staff starts GPS tracking
- **Expected:** 
  - GPS tracking begins
  - Customer app shows MAP
  - Real-time location updates

#### 3e. STAFF_EN_ROUTE → STAFF_NEARBY
- **Trigger:** Staff within 200m radius
- **Expected:** Customer notified staff is nearby

#### 3f. Continue through remaining statuses...

### Test 4: Map Display Logic
**Critical Test:** Map should ONLY appear when status = 'STAFF_EN_ROUTE'

**Before STAFF_EN_ROUTE:** No map ❌  
**During STAFF_EN_ROUTE:** Show map ✅  
**After STAFF_EN_ROUTE:** No map ❌

### Test 5: Real-time Updates
- Test WebSocket/real-time subscriptions
- Status changes should reflect immediately in both apps
- GPS location updates should show on customer map

## 🐛 Issues Found
[TO BE FILLED DURING TESTING]

## ✅ Test Results Summary
[TO BE COMPLETED]

## 📊 Status Transition Validation
| From Status | To Status | Trigger | Result | Notes |
|-------------|-----------|---------|--------|-------|
| CONFIRMED | STAFF_MATCHING | Auto | ✅/❌ | |
| STAFF_MATCHING | ASSIGNED | Staff Accept | ✅/❌ | |
| ASSIGNED | STAFF_PREPARING | Staff Action | ✅/❌ | |
| STAFF_PREPARING | STAFF_EN_ROUTE | Start GPS | ✅/❌ | |
| STAFF_EN_ROUTE | STAFF_NEARBY | Proximity | ✅/❌ | |

## 🗺️ Map Display Tests
| Status | Should Show Map | Actual | Result |
|--------|----------------|--------|--------|
| CONFIRMED | ❌ | ❌/✅ | ✅/❌ |
| STAFF_MATCHING | ❌ | ❌/✅ | ✅/❌ |
| ASSIGNED | ❌ | ❌/✅ | ✅/❌ |
| STAFF_PREPARING | ❌ | ❌/✅ | ✅/❌ |
| STAFF_EN_ROUTE | ✅ | ❌/✅ | ✅/❌ |
| STAFF_NEARBY | ❌ | ❌/✅ | ✅/❌ |

---

**Tester:** Claude Agent  
**Report Generated:** $(date)