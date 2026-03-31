**Description: Core concept explanation**
The Strangler Pattern is a migration strategy where you incrementally “grow” a new system around the edges of a legacy one, intercepting and replacing parts of its behavior until the old system can be safely turned off—no big-bang cutover required. It reduces risk by keeping the existing system running while new capabilities are delivered and gradually take over traffic or events. 

* In practice, you capture changes or requests at the boundary (e.g., via a proxy, gateway, or event stream), route some to the legacy and some to the new component, and increase the share handled by the new component as confidence grows. 
* Event-first approaches wrap legacy systems with an anti-corruption layer that emits and consumes domain events, allowing side-by-side operation and eventual retirement of the legacy without invasive changes. 
* On the UI side, micro-frontend “headless” wrapping can embed legacy screens behind a new shell to keep user experience seamless during migration. 

**When to Avoid (or Use with Caution): Situations where the model may mislead or fail**

* When the organization is pushing for a full rewrite (“demolisher”) with tight deadlines and zero viable interfaces for interception; strangling may be too slow or impractical. 
* If legacy systems cannot be observed or intercepted at safe seams (no proxyable boundary, no CDC on the database, no API to front), the technique becomes invasive and loses its risk-mitigation benefits. 
* When teams weave the new implementation *inside* the legacy codebase (breaking Open-Closed), creating toggles in the old system rather than wrapping it at the boundary—this raises risk and coupling. 
* If governance or tooling cannot support gradual traffic shifting, canarying, or feature-flagging, you lose the incremental safety net the pattern relies on. 

**Keywords for Situations: Common contexts or triggers where it applies**

* Legacy modernization; risk-controlled migration; microservices carve-out; anti-corruption layer; event-first migration; change data capture (CDC); proxy/router at ingress; load balancer traffic splitting; micro-frontends; incremental retirement. 

**Thinking Steps: Step-by-step reasoning process to apply the model effectively**

1. **Find the seams.** Identify stable interception points: HTTP gateway/proxy, message bus, ESG (External Service Gateway), or CDC on the legacy DB’s transaction log. Prefer non-invasive wrapping. 
2. **Choose the first slice.** Select a thin, high-value capability (domain slice, endpoint group, or UI feature) whose inputs/outputs you can observe and test independently. 
3. **Stand up the new capability.** Build the replacement as an autonomous service/micro-app with its own model and store; publish/consume events to keep states aligned (avoid shared DB). 
4. **Intercept and route.** At the boundary, start directing a small percentage of calls/events to the new service (or mirror traffic). Validate behavior, performance, and observability. Increase gradually (e.g., 10% → 30% → 50% → 100%). 
5. **Keep the experience seamless.** If UI is involved, wrap legacy screens as micro-frontends (headless mode) inside the new shell so users have a single entry point during transition. 
6. **De-risk with flags and canaries.** Use feature flags and canary releases to decouple deployment from release and roll back quickly on defects. 
7. **Retire what you’ve replaced.** Once traffic/event flow and KPIs match targets, turn off the legacy slice, de-provision resources, and capture learnings. Repeat for the next slice. 

**Coaching Questions: Reflective prompts to help someone use or practice this model**

* Where is the cleanest interception point (proxy, event bus, CDC) to strangle our first capability without touching legacy internals? 
* What is the smallest user-visible outcome we can deliver while keeping both systems in parallel—API endpoint, workflow step, or screen? 
* How will we synchronize state between old and new (events over an ESG, read models, or temporary dual-writes) and verify consistency? 
* Which metrics (latency, error rate, business KPIs) and guardrails (feature flags, canaries) will govern our ramp-up from 0% to 100%? 
* How will we keep the UX seamless (micro-frontend wrapper, headless legacy mode) and plan the formal retirement of each legacy slice? 

**Assigned Category:** Systems Thinking
