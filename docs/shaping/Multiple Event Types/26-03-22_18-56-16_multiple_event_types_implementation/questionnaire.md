# Questionnaire: Multiple Event Types Implementation

1. **Transaction Scope**: Should a single booking allow for multiple different services (e.g., a "bundle" or "add-on" model), or will each booking always correspond to one selected service type? no
2. **Resource Constraints**: Beyond general shop availability, are there specific resources (staff, equipment, rooms) that are shared across event types but have their own individual capacities? no
3. **Migratory Strategy**: For existing shops with one service, should we auto-convert their current settings into the first "Event Type" record? Are there any legacy data concerns? no legacy data concerns
4. **Visibility/Access**: Should all event types be public on the booking page, or do we need features for "hidden" or "direct link only" services? need hidden and direct link services too
5. **Pricing Complexity**: Do different event types require different payment logic (e.g., some require full payment, others only a deposit, and some are free)? not for mvp
