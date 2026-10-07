# Tooth Fairy AI synthetic dental claims

500 made-up dental insurance claims for building, testing, and demoing Tooth Fairy AI. Each one is
an unpaid claim sitting on a dental office's follow-up list. **They are synthetic, so there is no real
patient data (PHI) here.** Every patient, practice, dentist, member ID and NPI is fake.

The payer names and payer IDs (MetLife 65978, Cigna 62308, Delta Dental of Utah DDUT1, and others) are
real. **Never call a real insurer about these claims.**

## Quick start: putting the claims on a website

Use **`data/claims.json`**. It's one array with one object per claim, ready to load:

```js
const claims = await fetch("/claims.json").then((r) => r.json());
claims[0].patientName;        // "Oliver Green"
claims[0].payerName;          // "United Concordia Companies, Inc."
claims[0].procedures[0].code; // "D0120"
```

To open the claims in Excel or Google Sheets, use **`data/claims.csv`**. It has one row per claim.
**`data/procedures.csv`** has one row per procedure line, joined to the claim on `claimId`.

### Loading them into Tooth Fairy AI

The claims API on `voice.toothfairyaiapp.com` takes these directly. Create an API key in the
dashboard under **Manage Team → API Keys**, then run:

```bash
TF_API_KEY=tf_... node scripts/send-to-toothfairy.mjs --limit 10
```

The script sends only what an office would know. Every claim is marked `synthetic: true` and no insurer phone numbers are included.
It's safe to re-run, because claims are keyed by `id`.

## What's in each claim (`data/claims.json`)

| Field | Example |
| --- | --- |
| `id` | `case-00001` (stable ID; the same ID is used in every file) |
| `practice`, `provider`, `providerNpi` | Layton Family Dental, Abigail Tolman, DDS |
| `patientName`, `patientDob`, `relationshipToSubscriber` | self / spouse / child |
| `subscriberName`, `memberId`, `groupNumber`, `employer` | The insurance card details |
| `payerName`, `payerId` | Insurer and its electronic payer ID |
| `dateOfService`, `submittedDate`, `daysOutstanding` | Dates are `YYYY-MM-DD` |
| `totalCharge`, `estimatedInsurance`, `estimatedPatientPortion` | Dollars |
| `procedures[]` | `code` (CDT), `description`, `tooth`, `surfaces`, `area` (quadrant/arch), `fee` |
| `officeStatus`, `whyFollowingUp`, `officeNotes` | What the office's software shows |

## The answer key

**`data/answers.json`** says what actually happened to each claim. Some were paid, some pended for
x-rays, some denied for frequency, and so on. It also gives the right next step. Use it to check
whether the agent's call got the right answer.

**Keep it out of anything the agent sees before the call.**

## Full detail (for training and evals)

| File | What it is |
| --- | --- |
| `data/full/cases.jsonl` | Everything about each case: plan benefits, prior visits, timeline, payer record, adjudication with real denial codes (CARC/RARC), and payments |
| `data/full/tasks.jsonl` | Each case split into `office_view` (what the caller knows), `payer_view` (what the insurance rep sees), and `expected` (the answers) |
| `data/full/summary.json` | Counts by scenario, insurer, and status |
| `data/x12/*.837`, `*.835` | Each claim as an X12 837D file, and each remittance as an X12 835 file when one exists |

All data was generated on 2026-09-28 (seed 20260928) by the `tools/claims-synth` generator in the
dental-claims-agent repo.

CDT procedure codes are copyrighted by the ADA. The descriptions here are paraphrases.
