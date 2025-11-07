import fs from "node:fs";

// ---- load Firefoo export ----
const RAW = JSON.parse(fs.readFileSync("./treescout-cloud-1762464092.json","utf8"));
const root = RAW.__collections__ ? RAW.__collections__ : RAW; // Firefoo variants

// helper to list docs in a collection
const docsOf = (coll) => {
  const d = root[coll];
  if (!d || typeof d !== "object") return {};
  return d;
};

// helper: union of field keys across first N docs
const fieldUnion = (docs, N=50) => {
  const keys = new Set();
  let i=0;
  for (const id of Object.keys(docs)) {
    if (i++ >= N) break;
    const body = docs[id] || {};
    Object.keys(body).forEach(k => {
      if (k !== "__collections__") keys.add(k);
    });
  }
  return [...keys].sort();
};

// helper: quick field existence check
const hasField = (docBody, path) => {
  const parts = path.split(".");
  let cur = docBody;
  for (const p of parts) {
    if (!cur || typeof cur !== "object" || !(p in cur)) return false;
    cur = cur[p];
  }
  return true;
};

function checkCollection(name, requiredFields = []) {
  const docs = docsOf(name);
  const present = Object.keys(docs).length;
  const union = fieldUnion(docs);

  const problems = [];
  if (!present) problems.push(`Collection "${name}" has 0 docs.`);

  // look at a few sample docs to see if required fields exist
  const sampleIds = Object.keys(docs).slice(0, 10);
  for (const rf of requiredFields) {
    const missingAll = sampleIds.every(id => !hasField(docs[id], rf));
    if (missingAll) problems.push(`Missing field "${rf}" in first ${sampleIds.length || 0} ${name} docs.`);
  }

  return { name, present, sampleFields: union.slice(0, 15), problems };
}

// ---- checks based on your code (services/data.ts & pages) ----
const checks = [
  ["clients", ["name"]],
  ["properties", ["clientId","name","location"]],
  ["trees", ["propertyId","location"]],
  ["recommendations", ["propertyId","status"]],
  ["planItems", ["propertyId","schedule.year","schedule.quarter"]],
  ["recTemplates", ["serviceCode"]],
  ["plans", ["propertyId","name"]],
  ["targetSets", ["propertyId","treeIds"]],
  ["scans", ["treeId","propertyId","createdAt"]],
  ["sections", ["propertyId","coords"]],
  ["scoutReports", ["propertyId","name"]],
  ["scoutItems", ["scoutReportId","title","estimatedBudget"]],
  ["portalMessages", ["reportId","text","author","createdAt"]],
  // read-only catalogs you referenced:
  ["rsaPrograms", []],
  ["servicesCatalog", []],
  ["species", []],
  ["tagOptions", []],
];

// per-user settings + root settings
function checkSettings() {
  const settingsRoot = root.settings && root.settings.default;
  const hasRootProfile = !!settingsRoot;
  // Users collection (users/{uid}/settings/profile)
  const users = root.users || {};
  let foundUserProfiles = 0;
  for (const uid of Object.keys(users)) {
    const sub = users[uid].__collections__ || {};
    if (sub.settings && sub.settings.profile) foundUserProfiles++;
  }
  const probs = [];
  if (!hasRootProfile && foundUserProfiles === 0) {
    probs.push("No root settings (settings/default) and no user settings (users/{uid}/settings/profile) found.");
  }
  return {
    name: "settings",
    present: hasRootProfile || foundUserProfiles > 0,
    sampleFields: hasRootProfile ? Object.keys(settingsRoot).sort().slice(0,15) : [],
    problems: probs,
  };
}

const results = [
  ...checks.map(([c, req]) => checkCollection(c, req)),
  checkSettings(),
];

// ---- report ----
let missing = 0;
for (const r of results) {
  const status = r.present ? "OK" : "MISSING";
  if (!r.present || r.problems.length) missing++;
  console.log(`\n=== ${r.name} :: ${status} (docs: ${r.present ? ">=1" : "0"}) ===`);
  if (r.sampleFields.length) console.log("  sample fields:", r.sampleFields.join(", "));
  r.problems.forEach(p => console.log("  ⚠", p));
}

if (!missing) {
  console.log("\n✅ Schema looks compatible with the app code.");
} else {
  console.log(`\nDone. ⚠ Found ${missing} collections with issues—see warnings above.`);
}