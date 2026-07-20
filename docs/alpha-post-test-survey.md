# Debrief Alpha post-test survey

Estimated time: 3–5 minutes  
Use only fictional testing information.

## Introduction for the tester

Thank you for testing Debrief. Please answer based only on the fictional scenario you used. Do not include real medical information, claim details, government identifiers, Google account details, passwords, authentication codes, or another person's information.

## Questions

1. **Did you use fictional information and fictional documents only?**  
   `Yes` / `No — stop and contact the Alpha administrator privately`

2. **What device and browser did you primarily use?**  
   Device: `Desktop` / `Tablet` / `Mobile`  
   Browser: `Chrome` / `Safari` / `Edge` / `Firefox` / `Other`

3. **How far did you get?**  
   `Splash page` / `Login` / `Dashboard` / `Workspace` / `Upload` / `Claim Builder` / `Review` / `Claim package` / `Export` / `Completed the test`

4. **Were you able to produce a statement you considered usable after reviewing or editing it?**  
   `Yes` / `No` / `I did not reach that step`

5. **Approximately how long did it take from the first Claim Builder question to a usable statement?**  
   Enter minutes, or `Not reached`.

6. **Did save and resume work when you tried it?**  
   `Yes` / `No` / `I did not try it`

7. **Did export work when you tried it?**  
   `Yes` / `No` / `I did not try it`

8. **Rate this statement: “I understand what I should do next with this fictional claim package.”**  
   `1 — Strongly disagree` / `2` / `3` / `4` / `5 — Strongly agree`

9. **Which one stage was the most confusing or frustrating?**  
   Choose one stage from Question 3, or `None`.

10. **What is the single most important improvement you would make?**  
    Keep the answer about the product experience. Do not include personal, medical, account, or real claim information.

## Administrator handling

- Assign the session an `AS-####` code and the tester a neutral `T-###` code.
- Put structured numeric/boolean results in `evals/alpha-session-results.json`.
- Convert actionable qualitative feedback into a sanitized `AF-####` record in `docs/alpha-feedback-register.md`.
- Do not store the tester's contact details in either file.
- If Question 1 is `No`, do not copy the response into project files. Follow the privacy/security escalation process.
