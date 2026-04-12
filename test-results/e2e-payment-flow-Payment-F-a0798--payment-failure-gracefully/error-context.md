# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - heading "What type of business do you run?" [level=1] [ref=e8]
        - paragraph [ref=e9]: Select your specialty to personalize your hub
      - generic [ref=e10]:
        - button "Beauty" [ref=e11] [cursor=pointer]:
          - img [ref=e13]
          - generic [ref=e16]: Beauty
        - button "Hair" [active] [pressed] [ref=e17] [cursor=pointer]:
          - img [ref=e19]
          - img [ref=e22]
          - generic [ref=e28]: Hair
        - button "Spa/Massage" [ref=e29] [cursor=pointer]:
          - img [ref=e31]
          - generic [ref=e33]: Spa/Massage
        - button "Health Clinic" [ref=e34] [cursor=pointer]:
          - img [ref=e36]
          - generic [ref=e40]: Health Clinic
        - button "Personal Trainer" [ref=e41] [cursor=pointer]:
          - img [ref=e43]
          - generic [ref=e49]: Personal Trainer
        - button "General Services" [ref=e50] [cursor=pointer]:
          - img [ref=e52]
          - generic [ref=e54]: General Services
      - generic [ref=e55]:
        - button "Continue" [ref=e56]
        - paragraph [ref=e57]: Step 1 of 3
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e63] [cursor=pointer]:
    - img [ref=e64]
  - alert [ref=e67]
```