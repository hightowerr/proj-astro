# Spike: Calendar Event Caching Strategy (B3.5)

## Context

When checking availability for a date, we need to fetch Google Calendar events to detect conflicts. Without caching, every availability check makes a Google Calendar API call, which:
- Adds latency to the availability API response
- Risks hitting Google Calendar API rate limits (especially if multiple users browse the booking page)
- May cause availability checks to fail if Google Calendar API is temporarily unavailable

We need to cache calendar events with a TTL to balance freshness vs performance.

---

## Goal

Determine the concrete implementation for caching Google Calendar events, including:
- Where to cache (Redis vs in-memory vs other)
- Cache key design
- TTL strategy
- Cache invalidation rules
- Fallback behavior if cache/Redis unavailable

---

## Questions

| # | Question |
|---|----------|
| **B3.5-Q1** | Does the existing codebase already use Redis? If so, where and how is it configured? |
| **B3.5-Q2** | What should the cache key structure be to uniquely identify calendar events for a shop + date? |
| **B3.5-Q3** | What TTL (time-to-live) balances freshness with Google Calendar API rate limits? (5 min proposed, validate) |
| **B3.5-Q4** | When should we invalidate the cache early (before TTL expires)? |
| **B3.5-Q5** | What happens if Redis is unavailable or cache miss occurs - should we fail fast or fetch from Google Calendar API? |
| **B3.5-Q6** | Should we cache per-day or per-slot? What granularity minimizes cache misses while keeping data fresh? |
| **B3.5-Q7** | Do we need to cache the full event objects or just event IDs + start/end times? |

---

## Initial Findings

### B3.5-Q1: Redis already exists
✅ **Answer:** Yes, the codebase uses **Upstash Redis** with REST API.

**Location:** `src/lib/redis.ts`

**Configuration:**
- Environment variables: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Helper: `getRedisClient()` returns singleton Redis instance
- Package: `@upstash/redis`

**Existing patterns:**
- Distributed locks: `acquireLock(key, ttlSeconds)`, `releaseLock(key, lockId)`
- Cooldowns: `setCooldown(customerId, durationSeconds)`, `isInCooldown(customerId)`
- Example TTL usage: `client.setex(key, ttlSeconds, value)`

**Implication:** We can use the existing Redis infrastructure without additional setup.

---

### B3.5-Q2: Cache key structure (proposed)

```
calendar_events:{shopId}:{date}
```

**Example keys:**
- `calendar_events:550e8400-e29b-41d4-a716-446655440000:2024-03-15`
- `calendar_events:f47ac10b-58cc-4372-a567-0e02b2c3d479:2024-12-25`

**Rationale:**
- Shop-scoped: Different shops have different calendars
- Date-scoped: Availability API queries by date
- Simple: Easy to construct and invalidate

---

### B3.5-Q6: Cache per-day (recommended)

**Recommendation:** Cache per-day, not per-slot.

**Rationale:**
- Availability API already queries by full day: `getAvailabilityForDate(shopId, dateStr)`
- Google Calendar API query fetches all events for a day range (more efficient as single call)
- Slot-level caching would create many cache keys (e.g., 16 keys for 16 slots) and complicate invalidation
- Day-level caching aligns with existing availability query pattern

---

### B3.5-Q3: TTL value (decided)
✅ **Decision:** **3 minutes (180 seconds)**

**Analysis:**

Google Calendar API rate limits:
- Free tier: 1,000,000 queries per day
- Burst rate: ~10 requests/second sustained

Without cache (worst case):
- 10 customers browsing availability simultaneously
- Each checks 5 dates → 50 API calls in minutes
- Multiple shops → risk hitting rate limits

With 3-minute cache:
- First request: cache miss → Google Calendar API call
- Subsequent requests in 3 min window: cache hits
- ~90% reduction in API calls

**Rationale for 3 minutes (not 5):**
- Fresher data: Calendar changes visible within 3 minutes
- Better UX: Shop owner adds calendar event, customer sees it sooner
- Still excellent cache hit ratio
- Balances freshness with API efficiency

**Implementation:**
```typescript
const TTL_SECONDS = 180; // 3 minutes
await redis.setex(cacheKey, TTL_SECONDS, JSON.stringify(events));
```

---

### B3.5-Q4: Early invalidation rules (decided)
✅ **Decision:** Invalidate on **our write operations** only.

**Invalidate cache when:**

1. **After creating calendar event** (new booking)
   - Flow: `createAppointment()` → `createCalendarEvent()` → invalidate cache for affected date

2. **After updating calendar event** (reschedule)
   - Flow: reschedule API → `updateCalendarEvent()` → invalidate cache for old date AND new date

3. **After deleting calendar event** (cancellation)
   - Flow: cancel API → `deleteCalendarEvent()` → invalidate cache for affected date

4. **Manual refresh** (future: dashboard button)
   - Shop owner can force refresh if needed

**Do NOT invalidate when:**
- Shop owner adds/changes events directly in Google Calendar (wait for TTL to expire naturally)
- Background conflict scanning job runs (read-only operation)

**Rationale:**
- Write-through cache pattern: our writes immediately visible
- External changes (Google Calendar UI) eventually consistent via TTL
- Simpler implementation: no webhook setup needed

**Implementation:**
```typescript
async function invalidateCalendarCache(shopId: string, dateStr: string): Promise<void> {
  const redis = getRedisClient();
  const key = `calendar_events:${shopId}:${dateStr}`;
  await redis.del(key);
}
```

---

### B3.5-Q5: Fallback behavior (decided)
✅ **Decision:** **Graceful degradation** - fetch from Google Calendar API directly if Redis unavailable.

**Behavior by scenario:**

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| **Cache hit** | Return cached events | Fast, no API call |
| **Cache miss** | Fetch from Google Calendar API → cache result | Normal operation |
| **Redis unavailable** | Fetch from Google Calendar API (don't cache) | Degrade gracefully, availability still works |
| **Google Calendar API unavailable** | Return error to client | Can't validate conflicts (R10 requirement) |

**Important distinction:**
- **READ operations** (availability check): Degrade gracefully
- **WRITE operations** (create event during booking): Fail booking if API unavailable (R10)

**Implementation pattern:**
```typescript
async function fetchCalendarEventsWithCache(
  connection: CalendarConnection,
  shopId: string,
  dateStr: string
): Promise<CalendarEvent[]> {
  const cacheKey = `calendar_events:${shopId}:${dateStr}`;

  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }
  } catch (error) {
    // Redis unavailable - log warning, continue to API fetch
    console.warn('[calendar-cache] Redis unavailable, fetching from API:', error);
  }

  // Cache miss or Redis unavailable → fetch from API
  const events = await fetchCalendarEventsFromGoogle(connection, dateStr);

  try {
    const redis = getRedisClient();
    await redis.setex(cacheKey, 180, JSON.stringify(events));
  } catch (error) {
    // Redis write failed - log warning, but return events
    console.warn('[calendar-cache] Failed to cache events:', error);
  }

  return events;
}
```

**Rationale:**
- Resilience: Availability API continues working even if Redis is down
- Aligns with existing system philosophy: degrade gracefully vs fail hard
- Better UX: Show availability with slower response rather than error

---

### B3.5-Q7: Data structure (decided)
✅ **Decision:** Store **minimal event data** - only fields needed for conflict detection.

**Cached structure:**
```typescript
interface CachedCalendarEvent {
  id: string;           // Google Calendar event ID (for tracking)
  start: string;        // ISO 8601 datetime (e.g., "2024-03-15T14:00:00Z")
  end: string;          // ISO 8601 datetime (e.g., "2024-03-15T15:00:00Z")
  isAllDay: boolean;    // True if all-day event (blocks entire day per R9)
}
```

**Example cached value:**
```json
[
  {
    "id": "abc123event",
    "start": "2024-03-15T14:00:00Z",
    "end": "2024-03-15T15:00:00Z",
    "isAllDay": false
  },
  {
    "id": "xyz456event",
    "start": "2024-03-16T00:00:00Z",
    "end": "2024-03-17T00:00:00Z",
    "isAllDay": true
  }
]
```

**Fields NOT cached:**
- `summary` (event title) - not needed for conflict detection
- `description` - not needed
- `attendees` - not needed
- `location` - not needed
- `organizer` - not needed

**Rationale:**
- **Minimal size:** Smaller Redis memory footprint, faster serialization
- **Sufficient data:** All we need is time range + all-day flag for conflict detection
- **Type safety:** Simple structure, easy to validate

**Transform from Google Calendar API:**
```typescript
function transformToCache(googleEvent: calendar_v3.Schema$Event): CachedCalendarEvent {
  return {
    id: googleEvent.id!,
    start: googleEvent.start?.dateTime || googleEvent.start?.date!,
    end: googleEvent.end?.dateTime || googleEvent.end?.date!,
    isAllDay: !!googleEvent.start?.date, // date field exists for all-day events
  };
}
```

---

## Acceptance

Spike is complete when we can describe:
- ✅ The exact Redis configuration needed (if using Redis)
- ✅ The cache key format and example keys
- ✅ The TTL value and rationale
- ✅ The cache invalidation rules (when to clear cache early)
- ✅ The fallback behavior if cache is unavailable
- ✅ The data structure stored in cache (what fields from calendar events we cache)

**Status:** ✅ **SPIKE COMPLETE**

---

## Summary: Complete Caching Strategy

**1. Infrastructure:** Upstash Redis (existing)

**2. Cache Key:** `calendar_events:{shopId}:{date}` (per-day granularity)

**3. TTL:** 180 seconds (3 minutes)

**4. Invalidation:**
   - On our writes: create/update/delete calendar events
   - Natural expiry: external changes (Google Calendar UI edits)

**5. Fallback:**
   - Redis unavailable → fetch from Google Calendar API directly
   - Google Calendar API unavailable → return error (can't validate conflicts)

**6. Data Structure:**
```typescript
interface CachedCalendarEvent {
  id: string;
  start: string;        // ISO 8601
  end: string;          // ISO 8601
  isAllDay: boolean;
}
```

**7. Implementation Location:**
   - New module: `src/lib/google-calendar-cache.ts`
   - Functions: `fetchCalendarEventsWithCache()`, `invalidateCalendarCache()`
