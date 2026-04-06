---
model: Prisoner's Dilemma
category:
  - Behavioral Economics
detectors:
  - Individual rational choices leading to collectively suboptimal outcomes
  - Dominant strategy to defect regardless of other's choice
  - T > R > P > S payoff structure
  - Temptation to defect exceeds reward for mutual cooperation
triggers:
  - Isolated decision-making without communication
  - Repeated interactions with 'shadow of the future'
  - Presence of dominant strategy to defect
  - Potential for mutual benefit through cooperation
failure_modes:
  - When players can communicate and make binding agreements
  - When the game is repeated with known endpoint
  - When payoffs don't match T > R > P > S structure
  - When players have altruistic preferences or care about fairness
  - When players are related or share utility functions
aliases:
  - PD
  - Social Dilemma
  - Coordination Problem
  - Prisoners' Dilemma
core_mechanics:
  - Individual rationality leading to collectively suboptimal outcomes in non-cooperative games
  - Dominant strategy causing mutual defection
  - Tension between individual and collective rationality
---

**Description**: 
Prisoner’s Dilemma describes a situation where each side has a strong personal incentive to “defect” (cheat, free-ride, betray), even though both sides would be better off if they both “cooperated.” The trap is that _doing the sensible thing for yourself, given uncertainty about the other side, produces a worse result for everyone_.

It usually fits when the payoff ranking looks like this:

- **Temptation (T):** I defect while you cooperate → I do best
- **Reward (R):** We both cooperate → we both do well
- **Punishment (P):** We both defect → we both do poorly
- **Sucker (S):** I cooperate while you defect → I do worst  
    …and the key ordering holds: **T > R > P > S**, plus the extra constraint **2R > T + S** (so alternating “taking turns cheating” isn’t better than stable cooperation).
---

**When to Avoid (or Use with Caution)**:
- When analyzing situations where trust, communication, and long-term relationships significantly influence behavior
- When players have mechanisms for enforcing cooperation or punishing defection
- When the game is repeated multiple times (as strategies like "Tit-for-Tat" can promote cooperation)
- When players have altruistic preferences or care about fairness beyond their own material gain
- When the payoffs don't accurately reflect the true preferences of the players
- When the game structure doesn't match the strict T > R > P > S > 2R > T + S requirements
- When players can make binding commitments or enforceable agreements
- When players have incomplete information about each other's payoffs or strategies
- When the game is played by "transparent" agents who can predict each other's behavior
- When players are genetically related or share utility functions (kin selection scenarios)

---

**Keywords for Situations**:
- Price wars, ad-spend races, arms races
- Public goods, free-riding, tax compliance
- Overfishing/pollution/commons problems
- Trust breakdowns in partnerships, vendor/client games
- “Everyone optimises locally and the system gets worse”

---

**Thinking Steps**: 

- **Name the players.** Who makes independent choices that affect each other’s outcome?
    
    m01_prisoners_dilemma
    
- **Define the actions.** What counts as “cooperate” vs “defect” in this context? Be concrete (behaviours, not intentions).
    
- **Write the four outcomes.** (C,C), (C,D), (D,C), (D,D).
    
- **Assign payoffs that reflect real preferences.** If you can’t quantify, rank them honestly.
    
- **Check it’s truly PD:** confirm **T > R > P > S** and ideally **2R > T + S**. If not, stop and reclassify the game.
    
    m01_prisoners_dilemma
    
- **Locate the “dominant move.”** Is defection better no matter what the other does? If yes, you’re in the trap.
    
    m01_prisoners_dilemma
    
- **Decide if it’s one-shot or repeated.** Repetition creates leverage via reputation and retaliation.
    
    m01_prisoners_dilemma
    
- **List cooperation enablers available:** monitoring, credible punishment, reputation, escrow, contracts, shared standards, third-party enforcement.
    
    m01_prisoners_dilemma
    
- **Change the game (don’t just preach cooperation):**
    
    - Raise the cost of defection (penalties, detection, enforcement)
        
    - Increase the reward of cooperation (shared upside, bonuses)
        
    - Reduce the sucker risk (guarantees, staged commitments, escrow)
        
    - Increase future weight (repeat interactions, longer horizon)
        
        m01_prisoners_dilemma
        
- **Sanity-check failure modes:** if communication or binding commitments exist, you may be solving the wrong problem.

---

**Coaching Questions**:
- Are you in a situation where your individually rational choice might lead to a worse collective outcome?
- What are the payoffs for cooperation vs. defection in your scenario?
- How would the other party's behavior change if they knew your strategy?
- Could this interaction be repeated in the future, and how might that change your approach?
- What mechanisms exist (or could be created) to encourage cooperation?
- How might your decision affect future interactions with these parties?
- Are there ways to change the payoffs to make cooperation more attractive?
- How important is trust and communication in this situation?
- What would happen if everyone acted the same way you're considering?
- Are there external factors (reputation, enforcement, social norms) that could influence the outcome?
- Is this a one-shot game or repeated interaction?
- Could you commit to a strategy in advance that would change the incentives?
- Are there ways to make agreements binding or enforceable?
- How do social preferences (fairness, reciprocity, altruism) factor into the decision?
- Would transparency about your strategy change the dynamics?
- Are there ways to transform this from a Prisoner's Dilemma to a different type of game?
- What are the long-term consequences of your choice versus the short-term benefits?
- How might the presence of multiple players change the dynamics?
- Could reputation effects in a larger community influence the outcome?
- Are there ways to implement monitoring and punishment mechanisms?
- How might cultural or social norms affect the players' behavior?
- What would happen if you could change the game structure to make cooperation the dominant strategy?
- Are there third-party interventions that could align individual and collective incentives?