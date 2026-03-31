# Analysis using Opportunity Cost

This document applies the 'Opportunity Cost' mental model to the 'Interim Design Change Decision'. The analysis is based on the problem diagnosis and the thinking steps provided by the model.

---

## Application of Thinking Steps

### 1. What are we giving up by making this choice?

The immediate choice is to allocate development resources to the interim sign-in UI change. Based on the problem diagnosis, this involves not just coding but also QA, analytics implementation, and ticket writing.

*   **Explicit Cost:** The direct time and effort spent by developers, QA, and the PM on this task.
*   **Implicit Cost (The Opportunity Cost):** The value of the *next-best alternative* that could be accomplished with those same resources. This could include:
    *   Beginning foundational work for the upcoming strategic basket redesign.
    *   Addressing known bugs that have a measurable negative impact on users.
    *   Working on features that directly support the primary goal of the 'empty trolley' work, which is to improve product recommendation effectiveness.

### 2. Reframing the Choice

The current framing is, "Should we make this small UX improvement?" This is a narrow frame that hides the trade-off.

A better framing, which makes the opportunity cost explicit, is:

> "Should we dedicate X developer-days to implementing a temporary UI change with no validated user problem, OR should we dedicate those same X developer-days to a task that directly contributes to our primary metric of increasing add-to-basket from recommendations?"

This reframing shifts the debate from the subjective aesthetic value of the change to a strategic discussion about resource allocation and priorities.

### 3. What is the next-best use of this time?

This requires identifying what the team *would* be doing otherwise. The problem diagnosis strongly suggests that the proposed UI change is, at best, tangentially related to the project's core objective. The next-best use of the team's time is, therefore, any activity with a stronger link to that objective. Examples include:

*   A/B testing different recommendation layouts.
*   Improving the data source for the recommendation engine.
*   Conducting user research to understand why the current recommendations are not effective.

### 4. Bundling the Cost Difference

We can present the choice to stakeholders not as a simple 'yes' or 'no', but as a clear trade-off:

> "Would we, as a business, rather have:
> (A) A temporarily 'nicer' sign-in UI that will be replaced in the next major redesign?
> 
> OR
> 
> (B) A head start on the strategic redesign project and progress on our key results for this quarter?"

This makes the choice less about a designer's preference and more about strategic business priorities.

### 5. Analyzing Stakeholder Language

The designer's manager stated, "...the redesign itself will take some time and so could we apply this UX change in the interim." This language reveals a failure to consider opportunity cost. It frames the development team's time as a resource that is currently idle or free, which is incorrect. The manager presents a false dichotomy: (A) implement this change or (B) do nothing. The reality is a three-part choice: (A) implement this change, (B) do nothing, or (C) **do something else that is more valuable.**

## Conclusion from this Model

The Opportunity Cost model strongly suggests that proceeding with the interim UI change is a poor allocation of resources. The value of the next-best alternative (working on core project goals or the strategic redesign) is significantly higher than the temporary, non-validated benefit of the proposed change. This model provides a clear, rational basis for the PM's feeling of resentment and equips them with the language to articulate their position in strategic, rather than personal, terms.
