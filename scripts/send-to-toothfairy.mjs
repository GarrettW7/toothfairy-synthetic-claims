// Sends generated cases into Tooth Fairy AI through the claims API (docs/claims-api.md in the
// ToothFairyAI repo). Only `office_view` is sent — what a practice actually knows when it follows
// up — never the payer's side or the expected answers. Every claim is marked synthetic.
//
// Usage:
//   TF_API_KEY=tf_... node scripts/send-to-toothfairy.mjs [data/full/tasks.jsonl] [--limit N] [--url https://voice.toothfairyaiapp.com]
//
// No insurer phone numbers are sent: the payer names are real companies, so a "Call insurer"
// on these claims must not dial them. Add your own number to an insurer in the dashboard to test calls.
// Re-running is safe: claims are keyed by case id, so a second run updates instead of duplicating.
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const limit = Number(flag("--limit") ?? Infinity);
const url = flag("--url") ?? "https://voice.toothfairyaiapp.com";
const file = args[0] ?? "data/full/tasks.jsonl";
const apiKey = process.env.TF_API_KEY;
if (!apiKey) {
  console.error("Set TF_API_KEY (create one in the dashboard: Manage Team -> API Keys).");
  process.exit(1);
}

function toClaim({ id, office_view: o }) {
  const dentist = o.renderingDentist;
  const notes = [
    o.officeRecord.whyFollowingUp,
    ...o.officeRecord.officeNotes,
    `Synthetic case ${id} from ${o.practice.name}. Office claim #${o.claim.officeClaimId}.`,
  ].join("\n");
  return {
    externalId: id,
    synthetic: true,
    patientName: o.patient.name,
    patientDob: o.patient.dob,
    memberId: o.subscriber.memberId,
    payerName: o.payer.name,
    providerName: dentist && `${dentist.firstName} ${dentist.lastName}, ${dentist.credential}`,
    dateOfService: o.claim.dateOfService,
    procedures: o.claim.lines.map((line) => ({
      code: line.code,
      description: (line.surfaces ? `${line.description} (${line.surfaces})` : line.description).slice(0, 200),
      ...(line.tooth !== undefined ? { tooth: String(line.tooth) } : {}),
      amount: line.fee,
    })),
    submittedAt: o.officeRecord.submittedDate,
    notes: notes.slice(0, 2000),
  };
}

const claims = readFileSync(file, "utf8")
  .split("\n")
  .filter(Boolean)
  .slice(0, limit)
  .map((line) => toClaim(JSON.parse(line)));

let created = 0;
let updated = 0;
let failed = 0;
for (let i = 0; i < claims.length; i += 100) {
  const batch = claims.slice(i, i + 100);
  const res = await fetch(`${url}/api/claims`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ claims: batch }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Batch ${i / 100 + 1} failed (${res.status}): ${body.error ?? JSON.stringify(body)}`);
    process.exit(1);
  }
  for (const r of body.results) {
    if (!r.ok) {
      failed++;
      console.error(`  ${batch[r.index].externalId}: ${r.error}`);
    } else if (r.created) created++;
    else updated++;
  }
  console.log(`Batch ${i / 100 + 1}: ${batch.length} sent`);
}
console.log(`Done. Created ${created}, updated ${updated}, failed ${failed}.`);
