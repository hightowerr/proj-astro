# Reasoning using Bottlenecks

This document applies the "Bottlenecks" model to analyze the strategic challenges discussed in the transcript, with a focus on team capacity and competing initiatives.

## Step 1: Map the Process Flow

The high-level process flow for delivering strategic value in the bottom-of-funnel is:

1.  **Ideation & Strategy:** Generate ideas for improvement (e.g., Basket Redesign, Tagstarr, Argos Pay).
2.  **Design & Scoping:** Create designs and define the technical scope for these ideas.
3.  **Prioritization:** Decide which initiatives to commit to, given their value and cost.
4.  **Development:** The engineering team builds, tests, and releases the feature.
5.  **Value Realization:** The feature is live and generating impact.

## Step 2: Identify the Constraint

The transcript makes it explicitly clear where the primary constraint lies. It is not in Ideation (many ideas exist) or even Prioritization (a meeting is planned for this). The fundamental bottleneck is **Step 4: Development**, specifically the engineering team's limited capacity.

*   **Primary Bottleneck: Engineering Capacity.** The team's ability to build is the single greatest constraint on the entire system's throughput.
    *   **Evidence:** "we haven't got the capacity to be able to do that they wish we the sorry the basket redesign"
    *   **Evidence:** "in our team we also manage the fulfilment service...so actually we've got quite a lot of things that aren't like specifically basket...meaning that we can't get through things as quickly"
    *   **Evidence:** "we've got no chance unless we get some extras also" (referring to doing a full redesign like the PDP team did).

*   **Secondary Bottleneck: Design Capacity.** The speaker notes that with multiple large redesigns happening at once, their own time is also a bottleneck.
    *   **Evidence:** "there's only one of me yeah yeah I do maybe yeah maybe have my needs some like extra support then"

## Step 3: Exploit the Bottleneck

"Exploiting the bottleneck" means ensuring that the limited development capacity is *never wasted*. It should only ever be applied to the highest-value, correctly-prioritized work.

*   **Current Waste:** The conversation implies a risk of wasting development capacity on the wrong things. For example, spending "too much time trying to address" the desktop subtotal issue if a full redesign is coming, or working on features that aren't the highest priority.
*   **Exploitation Strategy:** The upcoming prioritization meeting is the key mechanism to exploit the bottleneck. Its goal must be to produce a single, non-negotiable priority list so that every hour of development time is spent on the most critical task.

## Step 4: Subordinate Everything Else

All other parts of the process must be paced to the reality of the development bottleneck.

*   **Subordinating Design:** The design work should be subordinated to the development capacity. This means not creating detailed designs for three major redesigns at once. Instead, design work should focus *only* on the initiative that is chosen as the top priority in the meeting. Designing for projects that cannot be built is waste.
*   **Subordinating Strategy/Ideation:** The team should be realistic about the number of new ideas (like Tagstarr) they can seriously consider. The flow of new ideas must be paced to the team's ability to deliver them. The current situation of having three major redesigns plus new ideas competing for resources is a failure to subordinate.

## Step 5: Elevate the Bottleneck

This means finding ways to increase development capacity. The transcript shows the team is aware of this but sees it as difficult.

*   **Direct Elevation:** Getting "extras also" (extra resources/engineers) is the most direct way to elevate the bottleneck. The conversation suggests this is unlikely.
*   **Indirect Elevation (Improving Efficiency):** The engineers' preference to "rebuild it from scratch" instead of patching the old system can be seen as a strategy to elevate the bottleneck *in the long term*. A clean, modern stack would increase future development velocity, even if it's a larger initial investment. This is a crucial point for the prioritization discussion.

## Conclusion from this Model

The team's core challenge is not a lack of ideas but a severe **capacity bottleneck** in development. The most critical strategic imperative is to **subordinate all other activities** (design, planning) to this reality. The upcoming prioritization meeting must not be a brainstorming session; it must be a ruthless decision-making forum to protect the team's limited capacity and direct it at the single most important objective. Any work done on initiatives that are not the #1 priority is waste that the system cannot afford.
