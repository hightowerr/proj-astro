# Mental Model Selection Rationale

This document outlines the selection process for the mental models chosen to analyze the promo code implementation strategy.

## Selection Process Summary

From an initial scan of all available mental models, a candidate list of 11 potentially relevant models was created. This list included models related to decision-making, systems thinking, and product strategy (e.g., Trade-offs, Second-Order Thinking, Occam's Razor, Technical Debt, Leverage, Inversion, Minimum Viable Task).

Each of these 11 candidates was then evaluated against the core problem: choosing between a simple, fast-to-market solution and a more complex, robust one under a tight deadline. The final three models were selected for their combined power in structuring the decision, clarifying its long-term consequences, and providing a clear language to discuss the chosen path.

## Final Ranked List of Selected Models

1.  **Trade-Offs** (`m51_trade-offs.md`)
2.  **Second-Order Thinking** (`m05_second-order_thinking.md`)
3.  **Technical Debt** (`m17_technical_debt.md`)

## Rationale for Selection

### 1. Trade-Offs
*   **Reason for Selection:** The entire problem is a classic case of making trade-offs. This model is essential because it provides a direct framework to explicitly map out the pros and cons of each implementation path (Simple vs. Robust). It moves the discussion from a general debate to a structured analysis of what is being gained and what is being given up in terms of user experience, technical implementation, and business risk.

### 2. Second-Order Thinking
*   **Reason for Selection:** The team is already implicitly using second-order thinking when they worry about customer confusion from disappearing promos. This model will formalize that process. It is crucial for evaluating the long-term consequences of the trade-offs identified. For example, what are the second- and third-order effects of choosing the simple path? (e.g., Increased customer support calls -> damaged brand trust -> lower long-term conversion). It forces a deeper, more strategic consideration beyond just meeting the Q4 deadline.

### 3. Technical Debt
*   **Reason for Selection:** The "simple and fast" path is a textbook example of intentionally taking on technical debt. This model is vital for framing that decision correctly. It allows the team to acknowledge that they are not just picking a "simpler" option, but are borrowing from the future to pay for speed today. It provides a vocabulary to discuss, document, and plan for the eventual "repayment" of this debt, ensuring the short-term fix doesn't become a permanent, unmanageable problem.
