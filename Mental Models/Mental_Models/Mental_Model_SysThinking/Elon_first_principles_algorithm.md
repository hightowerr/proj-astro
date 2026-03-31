**Description**
This model is a disciplined sequence for improving a system: question requirements, delete what you can, then optimise/simplify what remains, then speed it up, and finally automate. The practical strength of this approach is its strict ordering: it forces the question “should this exist?” before “how do we do it better?”, serving as an effective counter to local optimisation and process creep.

A key heuristic within the deletion step is deliberate over-deletion: if you are never forced to put anything back, you likely did not remove enough. The intent is to create pressure to justify each step’s existence with concrete outcomes rather than acting with recklessness. The model becomes more reliable when paired with two practices: explicitly classifying requirements to avoid fighting real constraints, and personally running the frontline process to reveal the true workflow and hidden dependencies.

**When to Avoid (or Use with Caution)**
 * Safety-, security-, privacy-, or compliance-critical systems: Contexts where “delete first” can create unacceptable risk.
 * Environments with weak observability: Situations with poor rollback or unclear ownership where you won’t know what broke or how to recover.
 * Existential time-to-market pressure: Where speed is the immediate requirement and re-sequencing work is not realistic.
 * Early automation for control: Cases where automation is required for audit trails, monitoring, or guardrails rather than scaling an already-correct process.
 * Systems with hidden work: Processes such as fraud prevention or edge-case handling that may be lost if removed without full understanding.
 
**Keywords for Situations**
 * Local optimisation
 * Process creep
 * Requirement theatre
 * Over-engineering
 * “Let’s automate it”
 * Complexity-driven incidents
 * Cycle time
 * Hidden dependencies

**Thinking Steps**
 * Question the requirements: List requirements explicitly and classify them as hard constraints (law/physics/security), business constraints, or preference/legacy. Challenge preference and legacy first.
 * Delete steps and process parts: Identify steps that exist solely because “that’s the process” and remove candidates using the safest available methods, such as shadow paths.
 * Validate what deletion removed: For each removed step, identify what specific bad outcome it prevented; if no measurable outcome is found, keep it deleted.
 * Optimise or simplify what remains: Reduce complexity and collapse handoffs for steps that must exist, being explicit about what you are not optimising because it should be deleted.
 * Speed it up: Locate bottlenecks (approvals, build times) and improve throughput only after simplification to avoid accelerating waste.
 * Automate: Use automation for scale as the final step, ensuring it is separate from any automation required earlier for control or safety.
 * Do frontline work yourself: Run the end-to-end process personally a few times to update the map where reality contradicts assumptions.
 
**Coaching Questions**
 * Which “requirements” are actually preferences, habits, or risk theatre?
 * What problem would still exist if we built nothing?
 * If we removed this step, what specifically breaks, and how would we detect it?
 * What bad outcome does this step prevent (e.g., fraud, compliance breach, support load)?
 * What can we delete safely behind a flag or in a shadow path?
 * What are we currently optimising that should not exist at all?
 * Are we in exploration mode (delete/simplify first) or exploitation mode (speed now)?
 * Is the proposed automation for scale or for control/safety?
 * What is the ongoing maintenance and failure mode of this automation?
 * Have we personally run the frontline workflow end-to-end, and what surprised us?