# Buffer Time Design Brief

## Summary

This feature gives business owners a simple way to add breathing room after appointments so customers cannot book back-to-back times that are unrealistic in real life.

Design should support three user-facing ideas:

- A business owner can set a buffer for each service.
- A business owner can set a default buffer for the whole business.
- Customers do not see the word "buffer" during booking. They simply see fewer available times.

The design goal is trust and clarity: if an owner sets a 10 minute gap, the system should feel like it genuinely protects that time.

## What Needs Designing

### 1. Service settings page

This is where owners manage individual services.

Design for:

- A buffer choice inside each service form.
- Four options:
  - Shop default
  - None
  - 5 min
  - 10 min
- Clear explanation in plain language:
  - "Extra time after this service before the next booking can start."
- This should feel like part of service setup, alongside duration and deposit.

Key behavior to support:

- If the owner picks a specific value, that service uses it.
- If the owner picks "Shop default", the service follows the business-wide setting.
- If the owner picks "None", no extra gap is added after that service.

### 2. Availability settings page

This is where owners control business-wide booking rules.

Design for:

- A default buffer control near slot length and business hours.
- Three options:
  - None
  - 5 min
  - 10 min
- Helper text in plain language:
  - "Used for services that do not have their own buffer setting."

Key behavior to support:

- This is a fallback, not a forced override.
- A service-specific buffer always wins over the default.
- Owners should understand that this setting affects future bookings, not old ones.

### 3. Public booking page

This is the customer-facing booking flow.

Design for:

- No special buffer messaging.
- Available times should simply reflect the protected gap.
- The page should feel normal and uncluttered.

Key behavior to support:

- If an appointment ends at 2:00 PM and a 10 minute buffer applies, the next available start time should be 2:10 PM or later.
- Customers should never be asked to understand or choose a buffer.
- If a service is selected, the available times should reflect that service's rules.

### 4. Conflict surfaces

This is secondary, but relevant for design consistency.

Design should account for:

- More calendar conflicts may appear when a booking overlaps with protected buffer time.
- Existing conflict warning surfaces may need copy that still makes sense when the conflict is caused by the extra protected gap after an appointment.

Relevant surfaces:

- Appointments page warning banner
- Conflicts page list and empty states

## Functional Rules in Plain Language

- Buffer time means extra blocked time after an appointment.
- It is not shown as part of the customer's appointment length.
- It only affects when the next booking can start.
- Service-level setting comes first.
- If a service has no specific setting, use the business default.
- If neither is set, there is no extra gap.
- Existing booked appointments keep the buffer they were created with.
- Changing the setting only affects future bookings.
- Customers should never see technical wording or system logic.

## States and Content to Design For

### Service settings

- Service uses business default
- Service uses no buffer
- Service uses 5 min
- Service uses 10 min

### Availability settings

- No default buffer selected
- 5 min selected
- 10 min selected
- Saved confirmation state
- Validation/error state for failed save

### Booking page

- Normal list of available times
- Fewer times available because gaps are protected
- No available times for a date
- Service change causes time list to refresh

### Conflict surfaces

- No conflicts
- One or more conflicts
- Conflict caused by time immediately after an appointment

## Copy Direction

Use plain language. Avoid terms like:

- inheritance
- fallback resolution
- effective buffer
- overlap guard
- snapshot

Prefer:

- extra time after appointments
- gap between bookings
- uses your default setting
- blocks the next booking from starting too soon

## Assumptions

- The available options remain `None`, `5 min`, and `10 min`.
- Buffer is after the appointment only, not before.
- The customer booking flow stays quiet about the feature and only changes available times.
- No redesign is needed for payment, duration, or booking confirmation beyond reflecting reduced availability.
