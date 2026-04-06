# Reasoning via Five Whys

This document applies the "Five Whys" mental model to the production incident to trace the event from its surface symptoms to its systemic root cause.

### 1. Why were customers unable to access the basket page?

Because the service was either behind a manually activated holding page or returning "no healthy upstream" errors. The underlying platform had no healthy application instances available to serve user requests.

### 2. Why were there no healthy application instances available?

Because the application's containers were being "instantly killed" and restarting at a rate faster than new ones could become available. Metrics showed service availability dropping below 80% and a high number of "non-ready replicas."

### 3. Why were the containers being killed?

They were hitting an "out of memory" (OOM) condition. The Kubernetes platform was terminating the containers to protect the node, a standard behavior when a process exceeds its allocated memory limit. The transcript states, "if you hit an out of memory condition is like the container is instantly killed."

### 4. Why were the containers running out of memory?

The application has a known, long-standing memory leak. While it was previously "limping along," a recent feature deployment appears to have exacerbated the issue, causing memory usage to spike dramatically under production traffic. This new code "pushed it over a threshold," turning a chronic, low-level problem into an acute, service-breaking failure.

### 5. Why was a fragile application with a known memory leak operating so close to its resource limits in production?

This is the systemic root cause, stemming from several organizational and technical factors:

*   **Normalization of Deviance:** The team had accepted the regular, low-level crashes as normal because the platform's auto-restarts kept the service *mostly* available. This created a false sense of security and normalized a fragile state.
*   **Symptom-Based Fixes:** Previous mitigation efforts focused on workarounds (e.g., increasing replica counts) rather than fixing the underlying leak. These patches treated the symptom (instability) without curing the disease (the bug).
*   **Unaddressed Technical Debt:** The core problem—the memory leak itself—was never fixed. The transcript notes that "multiple senior engineers could not understand where the leak was coming from," so the difficult task was deprioritized in favor of easier, but ineffective, workarounds.
*   **Lost Institutional Knowledge:** The delicate balance of the previous configuration was tuned by an engineer who has since left the company. This suggests that the deep, tacit knowledge of how to manage this fragile system was not effectively transferred or documented.

### Conclusion

The incident was not caused by the feature deployment alone. The deployment was merely the trigger. **The root cause was the organizational decision to tolerate a critical piece of technical debt (the memory leak) for years, managing it with brittle workarounds that provided no margin of safety.**
