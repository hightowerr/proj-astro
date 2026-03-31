---
model: Bayesian Thinking
category: Science
detectors: "uncertainty, probability, evidence evaluation, belief updating, likelihood assessment, base rate consideration, diagnostic reasoning"
triggers: "making decisions under uncertainty, evaluating evidence, updating beliefs with new information, medical diagnosis, legal reasoning, forecasting, risk assessment"
failure_modes: "when base rates are ignored (base rate fallacy), when prior beliefs are too extreme, when evidence is not independent, when people confuse conditional probabilities (prosecutor's fallacy)"
aliases: "Bayesian Reasoning, Bayes' Rule, Bayesian Inference, Conditional Probability, Evidence-Based Reasoning"
core_mechanics: "Uses conditional probability to update beliefs based on new evidence; combines prior beliefs (base rates) with likelihood of evidence to form posterior beliefs; belief is proportional to base rate × likelihood"
---

# Bayesian Thinking

## Description

Bayesian Thinking is a systematic approach to reasoning under uncertainty that uses Bayes' Rule to update beliefs based on new evidence. The core principle is that our beliefs should be updated rationally by combining what we already know (prior beliefs or base rates) with new evidence we encounter. The formula is: belief is proportional to base rate × likelihood. This approach forces us to explicitly consider alternative explanations, our initial beliefs about their plausibility, and how diagnostic the evidence is for each alternative.

Bayesian Thinking involves structuring problems using what can be called a "Bayes Grid" that forces us to answer key questions: What are the alternatives? What do I know already (base rates)? What evidence might I see? What did I see? What should I now believe? This framework helps us think more clearly about uncertainty and make better decisions when faced with incomplete information.

## When to Avoid (or Use with Caution)

- When base rates are ignored (base rate fallacy) - this is one of the most common errors in Bayesian reasoning
- When prior beliefs are too extreme (e.g., assigning 0% or 100% probability) as this prevents evidence from updating beliefs
- When evidence is not independent - incorrectly assuming independence can lead to overconfidence in conclusions
- When people confuse conditional probabilities (e.g., probability of evidence given guilt vs. probability of guilt given evidence - the prosecutor's fallacy)
- When there's no reliable data to establish likelihoods or base rates
- When the model assumes independence but evidence sources are actually correlated
- When the problem involves rare events with insufficient data to estimate probabilities accurately
- When priors are chosen arbitrarily without proper justification
- When computational methods (like MCMC) are used without verifying convergence
- When the likelihood function is misspecified
- When the prior distribution doesn't adequately cover the parameter space
- When subjective priors are used without acknowledging their influence on results

## Keywords for Situations

- Medical diagnosis and testing
- Legal reasoning and jury decisions
- Financial forecasting and investment decisions
- Scientific hypothesis testing
- Risk assessment and management
- Quality control and testing
- Market research and polling
- Ecological and environmental studies
- Archaeological dating and analysis
- Authorship attribution
- Decision making under uncertainty
- Evidence evaluation
- Belief updating

## Thinking Steps

1. **Identify the alternatives**: What are the possible explanations or outcomes you're considering? List all plausible alternatives, not just the ones that seem most likely.

2. **Establish base rates**: What do you know already about the relative likelihood of each alternative before considering the new evidence? These are your prior beliefs or base rates. Consider whether your prior is informative or non-informative.

3. **Identify the evidence**: What new information do you have that might help distinguish between the alternatives?

4. **Determine likelihoods**: For each alternative, how likely is it that you would observe this evidence? This requires considering the diagnostic power of the evidence for each alternative.

5. **Apply Bayes' Rule**: Update your beliefs by multiplying the base rate by the likelihood for each alternative, then rescaling so all probabilities sum to 100%.

6. **Calculate posterior beliefs**: What should you now believe about each alternative given both your prior knowledge and the new evidence?

7. **Consider the strength of evidence**: How much information did the evidence provide? Did it significantly change your beliefs or was it relatively uninformative?

8. **Evaluate sensitivity**: How robust are your conclusions to different assumptions about base rates or likelihoods? Consider how much weight the data receives versus your prior beliefs.

9. **Check for computational validity**: If using computational methods, verify that your approach (e.g., MCMC) has converged properly and that results are stable.

10. **Validate model assumptions**: Ensure that your likelihood function and prior distributions are appropriate for the problem and adequately cover the parameter space.

## Coaching Questions

1. What are all the possible explanations for what I'm observing, not just the most obvious one?

2. What do I already know about the relative likelihood of each alternative before considering this new evidence?

3. How diagnostic is this evidence? Could it occur under different scenarios, or does it strongly point to one alternative?

4. Am I confusing the probability of the evidence given a hypothesis with the probability of the hypothesis given the evidence?

5. Am I properly considering base rates, or am I focusing only on the new evidence?

6. Are my sources of evidence independent, or are they correlated in some way?

7. How would my conclusion change if I varied my assumptions about base rates or likelihoods?

8. What would it take for me to change my mind about this issue?

9. What evidence would falsify my current belief?

10. How confident am I in my probability estimates, and what data supports them?

11. Am I being overly influenced by recent or vivid evidence rather than considering the full context?

12. What are the costs and benefits of being wrong in each direction?

13. Is my prior belief informative or non-informative? How does this affect the weight I give to new evidence versus prior knowledge?

14. How much data do I need to overcome strong prior beliefs?

15. Have I considered the possibility that my likelihood function is misspecified?

16. Am I accounting for the possibility that different sources of evidence might be dependent rather than independent?

17. How would a different prior distribution affect my conclusions?

18. What is the expected value of additional information before I collect it?

19. Am I using appropriate computational methods if dealing with complex models?

20. How can I validate that my Bayesian model is performing as expected?