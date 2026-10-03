# NIRMALTAG — TAG LIFECYCLE STATE MACHINE SPECIFICATION

## 1. Lifecycle State Machine Diagram

```
[ CREATED ]
    │
    ▼
[ REGISTERED ] ──► [ IN_INVENTORY ]
                          │
                          ▼
                     [ ASSIGNED ]
                          │
                          ▼
                      [ ACTIVE ]
                          │
                          ▼
                     [ SCANNED ] ──► [ PICKUP_PENDING ]
                                            │
                                            ▼
                                       [ VERIFIED ]
                                            │
                                            ▼
                                        [ CLOSED ] (TERMINAL SINGLE-USE INVARIANT)

Exceptions/Admin:
[ ANY STATE ] ──► [ SUSPENDED ] / [ INVALIDATED ] / [ LOST ] / [ DAMAGED ] ──► [ REPLACED ]
```

---

## 2. Invariant Rules & Transition Table

| Current State | Next Allowed States | Forbidden Transitions | Transition Actor / Trigger |
| :--- | :--- | :--- | :--- |
| `CREATED` | `REGISTERED`, `INVALIDATED` | `ACTIVE`, `CLOSED`, `SCANNED` | Tag Officer / Batch Generator |
| `REGISTERED` | `IN_INVENTORY`, `ASSIGNED`, `INVALIDATED` | `CLOSED`, `VERIFIED` | Tag Officer / Batch System |
| `IN_INVENTORY` | `ASSIGNED`, `SUSPENDED`, `INVALIDATED` | `CLOSED`, `SCANNED` | Tag Officer / Dispatch |
| `ASSIGNED` | `ACTIVE`, `SUSPENDED`, `LOST` | `CLOSED`, `VERIFIED` | Household Pouch Request |
| `ACTIVE` | `SCANNED`, `SUSPENDED`, `LOST` | `CLOSED` (without scan) | Household AI Camera Scan |
| `SCANNED` | `PICKUP_PENDING`, `VERIFIED`, `REJECTED` | `ACTIVE`, `CREATED` | Collector Scanner App |
| `PICKUP_PENDING` | `VERIFIED`, `REJECTED`, `DISPUTED` | `ACTIVE`, `ASSIGNED` | AI Verification Pipeline |
| `VERIFIED` | `CLOSED` | `ACTIVE`, `SCANNED` | System / Collector Transaction |
| `CLOSED` | **NONE (TERMINAL)** | **`ACTIVE`, `ASSIGNED`, `SCANNED`, `CREATED`** | Server Transition Function |

> [!CRITICAL]
> **CLOSED → ACTIVE IS STRICTLY FORBIDDEN**. Single-use tamper-evident QR pouch tags CANNOT be re-activated or re-scanned once transitioned to `CLOSED`. Attempting to process a closed tag throws a database exception (`Tag Invariant Violation`).

---

## 3. Database Enforcement Function

Transitions are executed exclusively via PostgreSQL function `transition_tag_state(p_tag_id, p_new_status, p_actor_profile_id, p_actor_role, p_reason, p_idempotency_key)`.
