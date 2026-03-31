**Category:** Systems Thinking

---

## **Description: Core concept explanation**

Decision Trees provide a structured way to break complex decisions into sequential, discriminating questions. Each question forms a node, and each answer produces a branch that narrows the decision space until reaching a final outcome.  
The model rests on three principles:

1. **Decomposition** — reducing a large decision into smaller, testable steps.  
2. **Explicit structure** — visualising assumptions, dependencies, and criteria.  
3. **Probabilistic reasoning** — assigning likelihoods and computing expected values rather than treating outcomes as certain.

A decision tree externalises reasoning, making implicit assumptions visible, testable, and comparable. It is useful for classification, forecasting, multi-criteria choices, and any context requiring sequential clarification.

---

## **When to Avoid (or Use with Caution): Situations where the model may mislead or fail**

- **Irreducible uncertainty** where probabilities cannot be meaningfully estimated.  
- **Deeply interdependent systems** with feedback loops that violate the tree’s independence assumption.  
- **Strategic or adversarial settings** where counterparties adapt (game theory is more suitable).  
- **Imbalanced or biased datasets** that distort tree splits.  
- **Overfitting risk** when trees grow too deep relative to the dataset.  
- **Contexts lacking objective criteria**, where forcing thresholds creates false precision.  
- **Continuous relationships** better captured by smooth models than discrete splits.

---

## **Keywords for Situations**

- Classification  
- Multi-criteria evaluation  
- Risk and scenario analysis  
- Resource allocation under uncertainty  
- Diagnostic reasoning  
- Sequential decisions  
- Business rules / automation  
- Expected value comparison  
- Contingency planning  
- Stakeholder alignment  
- Customer segmentation  

---

## **Thinking Steps**

1. **Clarify the core problem and objective**  
   State the specific decision. Define what constitutes an outcome at the leaf nodes.

2. **List all potentially relevant criteria or questions**  
   Generate a wide set of discriminating tests without filtering prematurely.

3. **Select the most clarifying root question**  
   Choose the criterion that splits the problem most meaningfully.

4. **Expand secondary branches**  
   For each path, add the next most informative questions. Stop when a branch is directly actionable.

5. **Mark event nodes and assign probabilities**  
   Estimate likelihoods explicitly. Perform sensitivity checks on uncertain values.

6. **Assign outcomes, payoffs, or costs at leaf nodes**  
   Quantify consequences in terms relevant to the decision.

7. **Compute expected values**  
   Combine probabilities and payoffs to compare branches objectively.

8. **Roll back from leaves to the root**  
   At decision nodes select the highest-EV branch; at event nodes aggregate.

9. **Pressure-test assumptions**  
   Challenge the independence, realism, and completeness of the structure.

10. **Define contingency plans**  
    Use the tree’s alternative branches to prepare pivots if initial assumptions fail.

---

## **Coaching Questions**

### **Problem Framing**
- Is the decision clearly stated, or am I working from a vague problem?  
- How would reframing the question change the structure of the tree?  
- Whose perspective am I missing?

### **Criteria and Decomposition**
- What single question would most reduce uncertainty right now?  
- Am I addressing root causes or symptoms?  
- Which criteria are genuinely independent?

### **Uncertainty and Probability**
- Where are my least confident estimates?  
- What base rates or historical data contradict my assumptions?  
- What am I treating as certain that is not?

### **Bias and Assumptions**
- Which outcome am I subconsciously favouring?  
- What data would change my mind?  
- What branch makes me uncomfortable and why?

### **Outcomes and Second-Order Effects**
- What happens after each leaf-node outcome?  
- Which outcome would surprise me most (indicating a weak assumption)?  
- What unmeasured consequences exist?

### **Implementation and Contingency**
- What would trigger a pivot from the chosen branch?  
- How often should this tree be revisited with new information?  
- Have I communicated the logic clearly to stakeholders?

### **Meta-Learning**
- Where have past decisions failed because assumptions weren’t explicit?  
- What recurring assumptions of mine tend to be wrong?  
- Am I using the tree to think, or to justify a decision already made?

---
