**Category: Systems Thinking**

## **Description: Core concept explanation**
Garbage In, Garbage Out (GIGO) is the principle that a system’s outputs cannot exceed the quality, correctness, or fitness of its inputs. Any process—analytic, organisational, computational, or cognitive—propagates whatever data, assumptions, or signals it receives. A sound process fed flawed inputs will still produce flawed outputs.

Design literature identifies two main input failure types:

1. **Problems of type** — the *wrong kind* of input (e.g., imperial units where metric is required, phone number in a credit-card field).  
2. **Problems of quality** — the *right kind* of input, but defective (e.g., typos, stale data, biased samples).

Because most systems are deterministic or rule-bound, they amplify or faithfully reproduce input errors unless explicit validation, constraints, or audits are in place. Modern ML/AI systems magnify this effect: biased or noisy training data often produce biased or unreliable behaviour, regardless of model sophistication.

A classic real-world example is the **1999 Mars Climate Orbiter** failure, where mismatched units (imperial vs metric) fed into navigation software caused the spacecraft to descend too low and disintegrate—pure GIGO.

A related concept is **“garbage in, gospel out”**, describing the tendency to over-trust outputs simply because they come from a machine or model, even when inputs are obviously questionable.

---

## **When to Avoid (or Use with Caution)**
- When input sources cannot be validated, audited, or independently verified.  
- When high uncertainty is inherent and delaying decisions for “perfect data” is unrealistic.  
- When incentives encourage manipulating or gaming inputs (e.g., KPI inflation).  
- When data definitions drift across time, teams, or systems—making “clean-looking” data incomparable.  
- When the logic/model itself is flawed; clean inputs cannot fix a broken process.  

---

## **Keywords for Situations**
data quality • input integrity • validation • schema enforcement • constraints • unit mismatch • sampling bias • noise • data drift • KPI distortion • training data • label noise • RAG context quality • automation risk • provenance

---

## **Thinking Steps**
1. **Define system boundaries**  
   Identify what decisions or outputs depend on this system and what inputs feed it.

2. **Map the input pipeline**  
   Trace where each input originates, who touches it, how it’s transformed, and its update frequency.

3. **Check for type mismatches**  
   Units, formats, data types, expected ranges. Enforce constraints to block invalid categories of input.

4. **Assess quality dimensions**  
   Accuracy, completeness, consistency, timeliness, representativeness. Prioritise the highest-impact fields.

5. **Assess sensitivity**  
   Identify which inputs disproportionately influence downstream outputs.

6. **Add preventive controls**  
   - For **type errors**: constraints, schemas, UI affordances.  
   - For **quality errors**: previews, confirmations, anomaly detection, sanity checks, dual-entry verification.

7. **Evaluate ML/AI-specific risks**  
   Check training data bias, label noise, retrieval quality (for RAG), and drift between training and deployment contexts.

8. **Run adversarial / failure tests**  
   Introduce deliberate “garbage” in a safe environment to see how errors propagate.

9. **Monitor outputs continuously**  
   Set up drift detection, error monitoring, and alerts for anomalous patterns.

10. **Guard against “gospel out”**  
   Make it culturally normal to question dashboards, models, and automated outputs—especially when inputs are uncertain.

---

## **Coaching Questions**
- Which three inputs have the highest leverage on the output?  
- If this output were disastrously wrong, which input is the most likely culprit?  
- Are the units, ranges, and data types explicitly enforced?  
- How stable are the definitions of these inputs across time and teams?  
- What bias or noise might exist in the sample or dataset being used?  
- What is the simplest validation or constraint that would prevent the worst mistakes?  
- How would a third-party auditor critique the provenance and integrity of our inputs?  
- Where might people have incentives to manipulate or “pretty up” inputs?  
- Does the team treat model or dashboard output as unquestionable? Why?  