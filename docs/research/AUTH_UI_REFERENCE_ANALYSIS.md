# Auth UI — reference analysis

Scope: `/phase1/login`, `/phase1/signup`, `/phase1/forgot`, `/phase1/reset`.
Input: the 99.co agent-packages page (copied text + 5 screenshots), the PropertyGuru
login pattern named in the brief, and the existing V-RENT UI. No Figma files were
attached, so no Figma-specific patterns are used below.

## What V-RENT already has (and keeps)

| Fact | Consequence for the UI |
|---|---|
| Accounts are for **CEA-registered agents only** (`role: 'agent'`), plus seeded admin accounts. Renters browse and save homes without an account. | No role picker: there is only one role anyone can sign up for. Tell renters they don't need an account, the way PropertyGuru keeps consumer and AgentNet logins apart. |
| Email + password, scrypt, one failure message for unknown email / wrong password / locked. | Login stays email → password. No "account not found" step, because the backend deliberately never reveals whether an account exists. |
| No OAuth, OTP or Singpass. | No Google button. A decorative one would be fake auth. |
| Signup re-checks the CEA number against data.gov.sg on the server, and returns error `code`s (`email_taken`, `cea_taken`, `bad_mobile`, `weak_password`, …). | The CEA check stays first, since it is the only thing that can disqualify someone. Each error code sends the user back to the step that owns the field. |
| Forgot is enumeration-safe; reset tokens report `unknown` / `expired` / `address_changed` / `weak`. | Show exactly those states, with no invented ones. |
| Brand: navy night hero, drawn Singapore skyline (`landing/Skyline`), blue primary, Inter/Manrope, `.p1` tokens. | Reuse the skyline and gradient, so the first auth screen looks like the landing page the user just came from. |

## Reference → pattern → decision

| Reference | Observed pattern | Why it works | Use? | V-RENT adaptation |
|---|---|---|---|---|
| 99.co header | "Sign up" / "Log in" sit at the far right of a property-first nav; the account is secondary to search. | The account is a means to a property task, never the headline. | Yes | Auth screens keep a clear "Browse homes" exit and the V-RENT mark links back to `/phase1`. |
| 99.co hero | Deep navy block, one bold headline, one line of support, a product visual (phone mock with a real listing) instead of an illustration. | The product is the proof, and it takes about 2 s to read. | Yes | The navy panel shows **one** product visual: a listing card whose agent strip is the account's CEA credential, with no marketing bullets. |
| 99.co tier cards | Soft blue-tinted inner panels, green check icons, one solid blue CTA per card. | Only one action colour, and success is shown by a small green check. | Yes | One primary blue CTA per step. A green check marks a verified field or the CEA record. |
| 99.co agent-profile copy ("CEA-verified profile") | Trust is a concrete credential, not a badge wall. | Agents in Singapore already treat the CEA number as their identity. | Yes | The credential card fills in with the agent's **real** register record the moment the lookup succeeds (signup). Before that it shows placeholders ("Your name"), never invented values. |
| 99.co pricing / stats / account-manager wall | Dense commercial content. | It sells packages, which is not the job of an auth screen. | No | No stats, counts, testimonials or plans on auth screens. |
| PropertyGuru login | Email first, then the next factor. Short title, one field, full-width CTA. Legal text is small and at the foot of the page. | Only one decision per screen, which also suits password managers doing username-first flows. | Yes | Login: step 1 email, step 2 password under an email chip with "Change". A hidden `username` field keeps password-manager autofill working. |
| PropertyGuru consumer vs AgentNet split | Agents get a separate door. | Stops consumers creating the wrong account. | Adapted | V-RENT *is* the agent door. A single line says "Looking for a home? You don't need an account." |
| Previous V-RENT auth | A card floating on a grey page, 3 paragraphs of pitch, a signup form with every field on one screen. | It worked, but read as a template. | Replace | Full-height split on desktop. On mobile, a navy skyline band with the form in a sheet over it. Signup becomes 3 short steps. |

## Resulting structure

- **Desktop (≥1024)**: navy panel (46%, sticky) with the skyline, headline and credential card on the left; the form column on the right, top-aligned so step changes never jump the page.
- **Mobile (<1024)**: short navy band (mark + skyline) with a rounded form sheet overlapping it. 16px inputs so iOS does not zoom, and no side panel.
- **Signup**: CEA registration → contact (email, mobile) → password + confirmation. Progress reads "Step n of 3".
- **Motion**: page entrance with a stagger, direction-aware step slides, a check mark drawn on success, one short shake on a form error, and a cross-fade on the password toggle. All of it is disabled by `prefers-reduced-motion`.
