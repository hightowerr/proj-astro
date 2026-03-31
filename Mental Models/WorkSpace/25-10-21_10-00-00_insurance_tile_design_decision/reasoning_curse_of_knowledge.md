# Reasoning: Curse of Knowledge

## Application to the Insurance Tile Design Decision

This mental model is crucial for understanding how the differing levels of knowledge between internal stakeholders (product manager, designer) and the customer can impact the effectiveness and compliance of the insurance tile design.

### 1. Gauge prior knowledge:

*   **Internal Stakeholders (User & Designer):** Possess high prior knowledge. They are intimately familiar with the product details of Term Care and Monthly Care, their respective benefits, pricing, and the underlying compliance regulations (advertising standards). They understand the nuances and the business rationale behind each offering.
*   **Customers:** Have "okay, not great" prior knowledge. They are likely focused on their primary purchase, may not be actively seeking insurance, and are unlikely to understand the subtle distinctions between "Term Care" and "Monthly Care" without clear, concise, and unbiased explanation. They are prone to misinterpretation or being overwhelmed by jargon.

### 2. Define the goal and scope:

*   **Goal:** To present insurance options in the shopping basket in a manner that is clear, compliant (adhering to advertising standards), encourages informed customer choice, and contributes positively to CLV, all while maintaining a clean user interface.
*   **Scope:** The visual presentation and accompanying messaging for Term Care and Monthly Care within the basket.

### 3. Establish common ground:

*   The common ground for customers is the general concept of "product protection" or "insurance." The specific product names ("Term Care," "Monthly Care") are likely internal jargon that needs to be translated into customer-centric benefits.
*   The design should start from this common ground of general protection and then clearly differentiate the options, rather than assuming prior understanding of the product names.

### 4. Chunk and translate:

*   **Jargon Translation:** The terms "Term Care" and "Monthly Care" should be accompanied by clear, simple explanations of what they mean for the customer (e.g., "Upfront payment for X years of cover" vs. "Pay monthly, cancel anytime").
*   **Complexity Reduction:** The differences in payment structure, duration, and product specificity need to be broken down into easily digestible "chunks" of information. Overloading the initial tile with too much detail will increase cognitive load.
*   **Neutral Messaging:** The current messaging, "get protection with monthly care cancel any time," is a prime example of the curse of knowledge. It highlights a specific feature (monthly payment) and benefit (cancel anytime) of one option, likely because internal teams know it's the cheapest or most flexible. However, to a customer, this could be perceived as favoring Monthly Care, leading to compliance issues and potentially obscuring the value of Term Care.

### 5. Pace and signal:

*   The initial tile (whether one or two) acts as a signal. This signal must be clear, inviting, and neutral. The side drawer then provides the necessary detailed information at a pace the customer can control.
*   If a single tile is used, its primary signal should be about the *availability* of protection options, leading to a clear choice within the side drawer.
*   If two tiles are used, each tile's signal must clearly and concisely differentiate its offering without requiring a click to understand the basic premise.

### 6. Show, don’t tour your analysis:

*   The design should focus on presenting the *customer benefit* and the *choice* clearly, rather than exposing the internal complexities of the insurance products or the compliance decision-making process.
*   Avoid language that reflects internal product categorizations if it doesn't resonate with customer understanding.

### 7. Check comprehension live:

*   Given the "okay, not great" customer understanding and the compliance concerns, direct user testing (even informal) is critical. This involves observing how actual customers interact with the proposed designs and asking targeted questions.
*   **Coaching Questions for User Testing:**
    *   "What do you understand these protection options to be?"
    *   "Do you feel like one option is being recommended or pushed more than the other?"
    *   "What are the main differences between these two options, as you understand them?"
    *   "What questions do you have after seeing this?"

### 8. Iterate with feedback:

*   The insights gained from user comprehension checks should directly inform iterations on the messaging, visual design, and interaction flow to ensure clarity, neutrality, and effectiveness.

## Evidence Gathered:
*   **Customer Understanding:** The user's input that customer understanding is "okay, not great" is a direct indicator that the internal team likely suffers from the curse of knowledge. What is obvious internally is not obvious externally.
*   **Compliance (Advertising Standards):** The designer's concern about favoring one option stems from the recognition that the current messaging, influenced by internal knowledge (e.g., Monthly Care is cheaper), might be perceived as biased by an external audience, thus violating advertising standards.
*   **Current Messaging:** The phrase "get protection with monthly care cancel any time" exemplifies how internal knowledge can lead to messaging that, while factually correct, might not be perceived as neutral or comprehensive by a customer who is unaware of the full range of options or their relative costs.
