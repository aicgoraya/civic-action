import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "./e2e-shots";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const errors = [];
async function page(w = 390, h = 844) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`pageerror ${p.url()}: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error" && !/tile|cartocdn|fonts\.g|net::ERR|Failed to load resource/i.test(m.text())) errors.push(`console ${p.url()}: ${m.text()}`); });
  return p;
}
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const ok = (c, m) => { if (!c) throw new Error("ASSERT: " + m); console.log("✓", m); };

// ---------- 1. Partner submits a tree project (mobile) ----------
let m = await page();
await m.goto(BASE + "/");
await m.waitForLoadState("networkidle").catch(() => {});
await shot(m, "01-home-mobile");
await m.goto(BASE + "/submit");
await m.fill('[name=title]', "Third Ward Emancipation Park shade trees");
await m.selectOption('[name=type]', "TREE_PLANTING");
await m.fill('[name=address]', "3018 Emancipation Ave, Houston, TX 77004");
// drop a pin
await m.waitForSelector(".leaflet-container");
await m.waitForTimeout(800);
const map = await m.$(".leaflet-container");
const box = await map.boundingBox();
await m.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.6);
await m.waitForTimeout(300);
ok((await m.inputValue('[name=lat]')) !== "", "map pin sets lat/lng");
await m.fill('textarea[name=description]', "Plant six native shade trees along the Emancipation Ave sidewalk by the pool entrance where there is no canopy. The civic club will recruit neighbor stewards.");
await m.fill('[name=siteOwnerNote]', "Houston Parks & Rec — permit requested");
await m.fill('[name=submitterName]', "Test Partner");
await m.fill('[name=submitterOrg]', "Third Ward Civic Club");
await m.fill('[name=submitterEmail]', "partner@test.example");
await m.fill('[name=eventDate]', "2026-11-07T09:00");
await m.fill('[name=volunteerEstimate]', "20");
await m.fill('[name=treeCount]', "3");
await m.fill('[name=stewardName]', "Nia Steward");
await m.fill('[name=stewardEmail]', "nia@test.example");
await m.fill('[name=safetyNotes]', "Call 811 before digging.");
await shot(m, "02-submit-form-mobile");
await m.click('button[type=submit]');
await m.waitForURL(/\/projects\/[^/?]+\?submitted=1/);
const projectId = m.url().match(/projects\/([^/?]+)/)[1];
ok(await m.locator("text=Received.").count(), "submission ack shown");
ok(await m.locator("text=not public").count(), "project is not public before review");
await shot(m, "03-submitted-mobile");

// public directory must NOT show it
await m.goto(BASE + "/projects");
ok(!(await m.locator("text=Emancipation Park shade trees").count()), "unreviewed project hidden from directory");

// ---------- 2. Steward accepts commitment ----------
await m.goto(`${BASE}/projects/${projectId}/steward`);
await m.check('[name=pledge]');
await m.click('button[type=submit]');
await m.waitForURL(/steward=1/);
ok(await m.locator("text=stewardship commitment is recorded").count(), "steward accepted");

// ---------- 3. KHB review (desktop) ----------
const a = await page(1280, 900);
await a.goto(BASE + "/admin");
await a.waitForURL(/admin\/login/);
await a.fill('[name=password]', "wrong");
await a.click('button[type=submit]');
await a.waitForSelector('text=Wrong password');
await a.fill('[name=password]', "khb-demo");
await a.click('button[type=submit]');
await a.waitForURL(/\/admin$/);
await shot(a, "04-admin-queue");
await a.goto(`${BASE}/admin/projects/${projectId}`);
await shot(a, "05-admin-review-before");
// Approve disabled until verified
ok(await a.locator('button:has-text("Approve")').isDisabled(), "approve disabled before verification");
await a.locator('form:has-text("Submitter verified") button').click();
await a.waitForSelector('text=✓ Submitter verified');
await a.locator('form:has-text("Site permission confirmed") button').click();
await a.waitForSelector('text=✓ Site permission confirmed');
// add logistics
await a.fill('[name=toolsNeeded]', "6 shovels, mulch, stakes (ToolBank)");
await a.fill('[name=wasteHandling]', "Pots returned to nursery");
await a.locator('button:has-text("Save details")').click();
await a.waitForTimeout(800);
await a.locator('button:has-text("Approve")').click();
await a.waitForSelector('text=Approved · unpublished');
await shot(a, "06-admin-approved-checks");
const publishBtn = a.locator('button:has-text("Publish to directory")');
ok(await publishBtn.isEnabled(), "all publication checks pass → publish enabled");
await publishBtn.click();
await a.waitForSelector('text=Live since');
await shot(a, "07-admin-published");

// publication check gating: unpublish, clear waste handling, re-check
await a.locator('button:has-text("Unpublish")').click();
await a.waitForSelector('text=Publication checks');
await a.fill('[name=wasteHandling]', "");
await a.locator('button:has-text("Save details")').click();
await a.waitForTimeout(800);
ok(await a.locator('button:has-text("Publish to directory")').isDisabled(), "publish blocked when a check fails");
await a.fill('[name=wasteHandling]', "Pots returned to nursery");
await a.locator('button:has-text("Save details")').click();
await a.waitForTimeout(800);
await a.locator('button:has-text("Publish to directory")').click();
await a.waitForSelector('text=Live since');

// ---------- 4. Volunteer joins (mobile) ----------
await m.goto(BASE + "/projects");
ok(await m.locator("text=Emancipation Park shade trees").count(), "published project appears in directory");
await shot(m, "08-directory-mobile");
await m.goto(`${BASE}/projects/${projectId}`);
await shot(m, "09-project-public-mobile");
await m.click('text=Join as a volunteer');
await m.fill('[name=name]', "Vol Unteer");
await m.fill('[name=email]', "vol@test.example");
await m.check('[name=waiver]');
await m.click('button[type=submit]');
await m.waitForURL(/joined=1/);
ok(await m.locator("text=You're signed up").count(), "volunteer signup works");

// ---------- 5. Group adopts ----------
await m.goto(`${BASE}/projects/${projectId}/adopt`);
await m.fill('[name=orgName]', "UHnder Pressure");
await m.fill('[name=contactName]', "Chloe");
await m.fill('[name=contactEmail]', "chloe@test.example");
await m.fill('[name=groupSize]', "6");
await m.click('button[type=submit]');
await m.waitForURL(/adopted=1/);
await a.goto(`${BASE}/admin/projects/${projectId}`);
await a.locator('button:has-text("Approve as lead")').click();
await a.waitForSelector('text=Currently led by');
ok(true, "adoption approved");

// ---------- 6. NFC tap: volunteer check-in (mobile) ----------
await m.goto(`${BASE}/t/gulfton-sign`);
await shot(m, "10-tag-checkin-mobile");
await m.fill('[name=name]', "Tapper One");
await m.click('button:has-text("I\'m here")');
await m.waitForURL(/done=VOLUNTEER_CHECKIN/);
ok(await m.locator("text=Checked in.").count(), "NFC volunteer check-in works");

// ---------- 7. NFC tap: overdue tree watering ----------
await m.goto(`${BASE}/t/tree-5`);
ok(await m.locator("text=overdue").count(), "overdue tree shows overdue state");
await shot(m, "11-tag-tree-overdue-mobile");
await m.fill('[name=name]', "Ms. Evelyn Price");
await m.locator('form:has(input[value=TREE_WATERING]) button').click();
await m.waitForURL(/done=TREE_WATERING/);
await m.goto(`${BASE}/t/tree-5`);
ok(await m.locator("text=On schedule").count(), "watering log flips tree to on schedule");
await shot(m, "12-tag-tree-ontrack-mobile");
// issue report
await m.locator('summary:has-text("Something")').click();
await m.fill('form:has(input[value=ISSUE_REPORT]) [name=name]', "Neighbor");
await m.fill('form:has(input[value=ISSUE_REPORT]) [name=note]', "Stake snapped in wind");
await m.locator('form:has(input[value=ISSUE_REPORT]) button').click();
await m.waitForURL(/done=ISSUE_REPORT/);

// ---------- 8. Impact + admin dashboards ----------
await m.goto(BASE + "/impact");
await m.waitForTimeout(800);
await shot(m, "13-impact-mobile");
await a.goto(BASE + "/admin/stewardship");
await shot(a, "14-admin-stewardship");
await a.goto(BASE + "/admin/outbox");
await a.locator('button:has-text("Run scheduled checks now")').click();
await a.waitForSelector('text=Ran scheduled checks');
await shot(a, "15-admin-outbox");
ok(await a.locator('text=Reviewer alert').count() > 0, "reviewer alerts in outbox");
ok(await a.locator('text=Stake snapped').count() > 0, "issue report reached KHB outbox");
await a.goto(BASE + "/admin/tags");
await shot(a, "16-admin-tags");
await a.goto(BASE + "/projects?view=map");
await a.waitForTimeout(1200);
await shot(a, "17-map-desktop");
await a.goto(BASE + "/");
await a.waitForTimeout(1200);
await shot(a, "18-home-desktop");

// cron endpoint auth
const r1 = await fetch(BASE + "/api/cron");
ok(r1.status === 401, "cron rejects missing secret");
const r2 = await fetch(BASE + "/api/cron", { headers: { authorization: "Bearer change-me" } });
ok(r2.status === 200, "cron runs with secret");

// 404
const r3 = await fetch(BASE + "/t/nope");
ok(r3.status === 404, "unknown tag 404s");

await browser.close();
if (errors.length) { console.log("\nBROWSER ERRORS:\n" + errors.join("\n")); process.exit(1); }
console.log("\nALL PASSED");
