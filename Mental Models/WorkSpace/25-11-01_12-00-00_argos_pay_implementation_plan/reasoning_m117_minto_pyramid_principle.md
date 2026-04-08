# Reasoning using Minto Pyramid Principle

This document applies the Minto Pyramid Principle to structure the analysis of the Argos Pay implementation transcript.

## Step 1: Clarify the Ask with SCQA

This step frames the core problem discussed in the transcript.

*   **Situation:** The team is implementing a new "Argos Pay" financing feature, which was expected to be a relatively straightforward set of UI changes on the basket and order summary pages.
*   **Complication:** A major complexity has been discovered: the logic for calculating the order total, which determines credit eligibility, is flawed. The system includes all items in the total, regardless of stock status or fulfillment eligibility (collection vs. delivery). This issue is especially problematic on the desktop view, where the user's fulfillment choice is unknown, making it impossible to show an accurate, single total.
*   **Question:** How should the team proceed with the Argos Pay implementation, given the unforeseen complexity of accurately calculating the basket total for financing offers, especially on the desktop view?
*   **Answer (Governing Thought):** The team must first resolve the basket total calculation ambiguity by defining a clear UX for desktop and securing the necessary backend logic, while in parallel, continuing with the known, independent UI work to de-risk the project timeline.

## Step 2: Draft the Key Line (Level 2 Supporting Points)

These are the main arguments that support the governing thought. They are structured by priority/sequence.

1.  **Acknowledge the Flawed "Map":** The initial project plan is misaligned with the complex reality of the basket logic.
2.  **Isolate and Define the Core Problem:** The central issue is the ambiguity of the basket total on desktop, which is a blocker for the financing feature.
3.  **Identify and Manage Bottlenecks:** Progress is constrained by dependencies on Design (Leo), the CPMS backend, and the PvP component team.
4.  **Formulate an Actionable Path Forward:** A two-track plan is needed to tackle the known and unknown parts of the project simultaneously.

## Step 3: Build Down Each Branch (Evidence from Transcript)

### Branch 1: Acknowledge the Flawed "Map"
*   **Why/How?** The initial perception was of a simple project, but reality is different.
    *   **Evidence:** "I thought it was going to be super straightforward there we go this well there just paper but the the link or yeah I think so"
    *   **Evidence:** "it looks like the side draws the most complex but again a lot of that will be components that were being handed" - shows an initial belief that complexity was contained.
    *   **Evidence:** The surprise discovery of the basket total issue: "that could be the problem actually 'cause we need to fix that then first yeah that's kind of an obvious glare and kind of thing isn't it"

### Branch 2: Isolate and Define the Core Problem
*   **Why/How?** The basket total calculation is the main blocker.
    *   **Problem Definition:** "we've got this problem in a minute with the order summary it shows the total for all items in the basket even if it's out of stock and also we show the total based on regardless of your fulfilment type"
    *   **Desktop Complexity:** "how do we decide on the desktop then 'cause if this is the basket you're looking at but you want to get it collected... we need to think about this then from a design perspective what we want to do because it's not super clear"
    *   **Impact:** "once this now starts displaying specific plans and stuff like the erase before then yeah that's a big problem then yeah big issue to solve"

### Branch 3: Identify and Manage Bottlenecks
*   **Why/How?** Progress depends on external teams and decisions.
    *   **Design Dependency (Leo):** "question for Leo against against too noisy doesn't if you start adding like so tools for collection some talks for delivery" and "I'll make a note of that where is my to chase up with Leo"
    *   **Backend/CPMS Dependency:** "we need to send them they need to know what's eligible or so what's in the basket so can decide what's eligible" and "is the CPMS endpoint setup and what's needed to to get that text"
    *   **Component Team (PvP) Dependency:** "the components I think each of these like classes of component different sections is being dealt with is being built by shaban is team PvP... they're not filling the drawer itself but the individual components"

### Branch 4: Formulate an Actionable Path Forward
*   **Why/How?** The team needs a concrete plan.
    *   **Clarify the Desktop UX:** "what do we do for desktop 'cause we we have this this use case we need to think about" -> This needs to be the first priority.
    *   **Investigate Backend Solutions:** The discussion about what "apps do" (sending fulfillment choice to get a specific total) is a potential solution path to investigate for the web.
    *   **Continue Independent Work:** The transcript implies some work is straightforward: "the bits are basket very basic I'd say", "we're switching from Argos card where we're removing the Argos cards section completely Argos big so that again pretty basic". This work can proceed.
    *   **Formalize Communication:** The idea of the "handover document" is a key action: "it just gives us a single point of truth on what we agreed to put into the application".

## Steps 4 & 5: Check Vertical and Horizontal Logic

*   **Vertical Logic:** Each point is a summary of the points beneath it. The Governing Thought is a summary of the four key-line points. The evidence points directly support their parent branches. The logic holds.
*   **Horizontal Logic:** The four key-line points are MECE (Mutually Exclusive, Collectively Exhaustive) for structuring the problem. They follow a logical sequence: Understand the situation -> Define the core problem -> Identify blockers -> Create a plan. The logic holds.

## Step 6: Eliminate "News"

The transcript contains a lot of conversational filler and side topics (e.g., chimney sweeps, Apple devices). This analysis has filtered those out to focus only on the information that supports the logical pyramid structure.

## Step 7: Present Top-Down

The final `analysis_report.md` will be structured starting with the Governing Thought (the "Answer") and then expanding on each of the four key supporting points, using the evidence gathered here. This ensures the reader gets the most important information first.
