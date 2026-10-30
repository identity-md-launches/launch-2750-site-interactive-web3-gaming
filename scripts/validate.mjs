// Bounded, self-contained checks against the built export at a static-hosting subpath.
// Synthetic hardware/economy responses below exist only in this test process.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const out = resolve("test/scratch/validation");
await mkdir(out, { recursive: true });
const root = resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/preview/")) {
      res.writeHead(404).end();
      return;
    }
    const path = resolve(
      root,
      decodeURIComponent(url.pathname.slice(9)) || "index.html",
    );
    if (!path.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const bytes = await readFile(path);
    res
      .writeHead(200, {
        "Content-Type": types[extname(path)] || "application/octet-stream",
        "Cache-Control": "no-store",
      })
      .end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const results = [];
let browser;
const check = async (name, fn) => {
  try {
    const evidence = await fn();
    results.push({ name, passed: true, evidence: evidence ?? "passed" });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, evidence: error.stack });
    console.log(`FAIL ${name}: ${error.message}`);
  }
};
const wait = (page, ms = 100) => page.waitForTimeout(ms);
const statusFixture = (stale = false) => ({
  generatedAt: new Date().toISOString(),
  measurement: {
    freshness: "online",
    observedAt: new Date(Date.now() - (stale ? 300000 : 0)).toISOString(),
    staleAfterSeconds: 120,
    cumulativeWorkUnits: "45957",
    coreStatus: "ACTIVE",
    rpmMilli: 120000,
    speedMmPerSecond: 420,
    provenance: "hardware",
  },
  builder: {
    status: "available",
    projected: {
      blockHeight: "4135",
      blockProgress: "500000000",
      lifecycle: "optimistic",
    },
  },
});
const economyFixture = () => ({
  status: "available",
  generatedAt: new Date().toISOString(),
  chain: {
    chainId: "11155111",
    indexedThroughBlock: "12029224",
    safeThroughBlock: "12029213",
  },
  asset: { decimals: 18, symbol: "SQK" },
  supply: { miningMintedBaseUnits: "16455437093891105632782688" },
  staking: {
    totalNftPower: "70400000000000000000000",
    totalSqkPower: "0",
    sqkPerPower: "40000000000000000000",
    referencePower: "1000000000000000000000",
    paused: false,
    rewards: {
      streamRateBaseUnitsPerSecond: "1000000000000000000",
      remainingBaseUnits: "86400000000000000000000",
      streamEndsAt: String(Math.floor(Date.now() / 1000) + 86401),
    },
  },
  nft: {
    maximumLevel: 10,
    mergesOpen: true,
    cooldownBlocks: [
      "0",
      "3000",
      "7000",
      "14000",
      "21000",
      "28000",
      "35000",
      "42000",
      "49000",
      "0",
    ],
    basePower: [
      "1000",
      "2200",
      "4840",
      "10648",
      "23426",
      "51536",
      "113380",
      "249436",
      "548759",
      "1207269",
    ],
  },
});
async function fixture(page, mode = "online") {
  await page.route("https://api.squeekchain.com/**", async (route) => {
    if (mode === "offline") return route.fulfill({ status: 503, body: "{}" });
    const data = route.request().url().endsWith("/v1/status")
      ? statusFixture(mode === "stale")
      : economyFixture();
    if (mode === "fault" && data.measurement)
      data.measurement.coreStatus = "COUNTER_FAULT";
    return route.fulfill({ json: data });
  });
}
async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  assert.ok(dimensions.scroll <= dimensions.client, JSON.stringify(dimensions));
}
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [],
    localFailures = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(url) && r.status() >= 400)
      localFailures.push(`${r.status()} ${r.url()}`);
  });
  await fixture(page);
  await page.goto(url);
  await page.getByText("SPINNING 🔥", { exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await check("Production subpath, assets and metadata", async () => {
    assert.equal(
      await page.title(),
      "Squeek Play | A little hamster. A whole chain.",
    );
    assert.equal(
      await page.locator('meta[property="og:image"]').getAttribute("content"),
      "./social-card.png",
    );
    const imageUrl = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    assert.equal(
      (await page.request.get(new URL(imageUrl, url).href)).status(),
      200,
    );
    assert.deepEqual(localFailures, []);
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(() =>
        document.fonts.check('600 16px "Space Grotesk"'),
      ),
      true,
    );
  });
  await check("Live schema mapping and accessible progress", async () => {
    assert.equal(
      await page.getByRole("progressbar").getAttribute("aria-valuenow"),
      "50",
    );
    assert.match(await page.locator(".metrics").innerText(), /120/);
    assert.match(await page.locator(".metrics").innerText(), /420/);
    assert.match(await page.locator(".metrics").innerText(), /16,455,437/);
  });
  await check(
    "Race start, keyboard sprint, hardware lane, pause, resume and reset",
    async () => {
      await page
        .getByRole("button", { name: "Start race", exact: true })
        .click();
      assert.equal(
        await page
          .locator(".track")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press("Space");
        await wait(page, 65);
      }
      assert.ok(
        Number(await page.locator(".speed-readout strong").innerText()) > 100,
      );
      assert.ok(
        parseFloat(await page.locator(".hardware .lane-distance").innerText()) >
          0,
      );
      await page
        .getByRole("button", { name: "Pause race", exact: true })
        .click();
      const elapsed = await page.locator(".race-timer").innerText();
      await wait(page, 150);
      assert.equal(await page.locator(".race-timer").innerText(), elapsed);
      await page
        .getByRole("button", { name: "Resume race", exact: true })
        .click();
      await wait(page, 100);
      await page
        .getByRole("button", { name: "Reset race", exact: true })
        .click();
      assert.match(await page.locator(".race-timer").innerText(), /0.0/);
      assert.equal(
        await page
          .getByRole("button", { name: "Sprint", exact: false })
          .isDisabled(),
        true,
      );
      assert.equal(
        await page.locator(".derby-bottom p").innerText(),
        "Live wheel data. Local races. No on-chain scores.",
      );
    },
  );
  await check(
    "Tab keyboard navigation and formula/reward calculation",
    async () => {
      await page.getByRole("tab", { name: /Squeek Derby/ }).focus();
      await page.keyboard.press("ArrowRight");
      await page.getByRole("heading", { name: "Find your power" }).waitFor();
      await page.getByRole("link", { name: "Skip to playground" }).focus();
      await page.keyboard.press("Enter");
      assert.match(page.url(), /tab=fi/);
      assert.equal(
        await page
          .locator("#content")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      await page.getByRole("heading", { name: "Find your power" }).waitFor();
      assert.equal(
        await page.getByLabel("Total power weight").innerText(),
        "1,500W",
      );
      assert.equal(await page.getByTestId("pool-share").innerText(), "2.086%");
      const daily = Number(
        (await page.getByTestId("daily-reward").innerText())
          .replaceAll(",", "")
          .replace(" SQK", ""),
      );
      assert.ok(Math.abs(daily - 86400 * (1500 / 71900)) < 1);
      await page.locator("#nft-power").fill("2000");
      await page.locator("#staked-sqk").fill("20000");
      assert.equal(
        await page.getByLabel("Total power weight").innerText(),
        "3,500W",
      );
      await page.locator("#nft-power").fill("0");
      await page.locator("#staked-sqk").fill("0");
      assert.equal(
        await page.getByLabel("Total power weight").innerText(),
        "0W",
      );
      assert.equal(await page.getByTestId("pool-share").innerText(), "0%");
    },
  );
  await check("Merge tree tiers, cooldowns and maximum level", async () => {
    await page.getByRole("button", { name: "Level 9", exact: true }).click();
    assert.match(await page.locator(".merge-output").innerText(), /548,759/);
    assert.match(
      await page.locator(".merge-stats").innerText(),
      /49,000 blocks/,
    );
    await page.getByRole("button", { name: "Simulate next merge" }).click();
    assert.match(await page.locator(".merge-output").innerText(), /1,207,269/);
    assert.equal(
      await page
        .getByRole("button", { name: "Maximum level reached" })
        .isDisabled(),
      true,
    );
    await page.getByRole("button", { name: "Level 1", exact: true }).click();
    assert.equal(await page.locator(".merge-inputs").count(), 0);
    await page.getByRole("button", { name: "Level 2", exact: true }).click();
  });
  await check("Exact NFT tier powers, integer steps and numeric input bounds", async () => {
    const powers = economyFixture().nft.basePower;
    await page.locator("#staked-sqk").fill("0");
    assert.equal(await page.locator("#nft-power").getAttribute("max"), powers.at(-1));
    assert.equal(await page.locator("#nft-power").getAttribute("step"), "1");
    for (const [index, value] of powers.entries()) {
      await page.getByRole("button", { name: `Level ${index + 1}`, exact: true }).click();
      const formatted = Number(value).toLocaleString("en-US");
      assert.match(await page.locator(".merge-output").innerText(), new RegExp(formatted));
      await page.getByRole("spinbutton", { name: "NFT power (P)" }).fill(value);
      assert.equal(await page.locator("#nft-power").inputValue(), value);
      assert.equal(await page.getByLabel("Total power weight").innerText(), `${formatted}W`);
    }
    await page.locator("#nft-power").fill("4840");
    assert.equal(await page.locator("#nft-power-value").inputValue(), "4840");
    await page.locator("#nft-power").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#nft-power-value").inputValue(), "4841");
    await page.keyboard.press("End");
    assert.equal(await page.locator("#nft-power-value").inputValue(), powers.at(-1));
    await page.locator("#nft-power-value").fill("-1");
    assert.equal(await page.locator("#nft-power-value").inputValue(), "0");
    await page.locator("#nft-power-value").fill("9999999");
    assert.equal(await page.locator("#nft-power-value").inputValue(), powers.at(-1));
    await page.locator("#nft-power-value").fill("4840.5");
    assert.equal(await page.locator("#nft-power-value").inputValue(), "4841");
  });
  await check("Calculator result shares the panel edge without an inner card", async () => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      const style = await page.locator(".power-result").evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          background: cs.backgroundColor, padding: cs.padding, radius: cs.borderRadius,
          resultLeft: el.firstElementChild.getBoundingClientRect().left,
          labelLeft: document.querySelector(".input-heading label").getBoundingClientRect().left,
        };
      });
      assert.equal(style.background, "rgba(0, 0, 0, 0)");
      assert.equal(style.padding, "0px");
      assert.equal(style.radius, "0px");
      assert.equal(style.resultLeft, style.labelLeft);
      await noOverflow(page);
    }
  });
  await check("Automated accessibility: SqueekFi", async () => {
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      [],
    );
  });
  await page.screenshot({
    path: `${out}/squeekfi-desktop.png`,
    fullPage: true,
  });
  await check(
    "OBS configuration, copy action, overlay URL and standalone view",
    async () => {
      await page.getByRole("tab", { name: /Streamer HUD/ }).click();
      await page.getByRole("button", { name: "Light", exact: true }).click();
      await page.getByLabel("Compact layout").check();
      await page.getByLabel("Show Squeek block").uncheck();
      assert.equal(
        await page.locator(".hud-display.hud-light.hud-compact").count(),
        1,
      );
      assert.equal(await page.locator(".hud-numbers>div").count(), 2);
      const link = await page.getByLabel("Browser source URL").inputValue();
      assert.match(link, /overlay=1/);
      assert.match(link, /theme=light/);
      assert.match(link, /compact=1/);
      assert.match(link, /blocks=0/);
      await page.getByRole("button", { name: "Copy overlay link" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: /copied|Select and copy/ })
        .waitFor();
      const overlay = await context.newPage();
      await fixture(overlay);
      await overlay.goto(link);
      assert.equal(await overlay.locator(".site-header").count(), 0);
      await overlay.locator(".hud-display").waitFor();
      assert.equal(
        await overlay.locator("html").getAttribute("class"),
        "overlay-page",
      );
      assert.equal(await overlay.locator(".hud-numbers>div").count(), 2);
      await overlay.close();
      await page.getByRole("button", { name: "Dark", exact: true }).click();
      await page.getByLabel("Compact layout").uncheck();
      await page.getByLabel("Show Squeek block").check();
    },
  );
  await check("Automated accessibility: HUD settings", async () => {
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      [],
    );
  });
  await check("HUD copy feedback resets for every URL setting", async () => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    for (const change of [
      () => page.getByRole("button", { name: "Light", exact: true }).click(),
      () => page.getByLabel("Compact layout").check(),
      () => page.getByLabel("Show Squeek block").uncheck(),
    ]) {
      const oldUrl = await page.locator("#overlay-url").inputValue();
      await page.getByRole("button", { name: "Copy overlay link" }).click();
      await page.getByText("Overlay link copied.", { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), oldUrl);
      await change();
      assert.notEqual(await page.locator("#overlay-url").inputValue(), oldUrl);
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), oldUrl);
      await page.getByText("Add this URL as a Browser Source in OBS.", { exact: true }).waitFor();
    }
    await page.getByRole("button", { name: "Copy overlay link" }).click();
    await page.getByText("Overlay link copied.", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      await page.locator("#overlay-url").inputValue(),
    );
  });
  await page.screenshot({ path: `${out}/hud-desktop.png`, fullPage: true });
  await check(
    "Wallet sheet, unavailable provider, Escape and focus restoration",
    async () => {
      await page.getByRole("button", { name: "Connect wallet" }).click();
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await page.getByRole("button", { name: /Coinbase Wallet/ }).count(),
        1,
      );
      await page
        .getByRole("button", { name: "Browser wallet", exact: true })
        .click();
      await page.getByText(/No browser wallet found/).waitFor();
      const audit = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(
        audit.violations.map((v) => v.id),
        [],
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").isVisible(), false);
      assert.equal(
        await page
          .getByRole("button", { name: "Connect wallet" })
          .evaluate((el) => el === document.activeElement),
        true,
      );
    },
  );
  await check(
    "Responsive reflow on all sections at 320, 390, 768 and 1440",
    async () => {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width < 500 ? 844 : 1100 });
        for (const section of ["derby", "fi", "hud"]) {
          await page.goto(`${url}#tab=${section}`);
          await page.locator("main h2").first().waitFor();
          await noOverflow(page);
          await page.screenshot({
            path: `${out}/${section}-${width}.png`,
            fullPage: true,
          });
        }
      }
    },
  );
  await page.goto(`${url}#tab=derby`);
  await page.getByText("SPINNING 🔥", { exact: true }).waitFor();
  await check("Automated accessibility: Derby", async () => {
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      [],
    );
  });
  await page.screenshot({ path: `${out}/derby-desktop.png`, fullPage: true });
  await check(
    "First phone screen exposes all lanes, Start race and full touch Sprint",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => scrollTo(0, 0));
      const bounds = {};
      for (const selector of [".race-controls .button", ".hardware", ".cheddar", ".squeeks", ".player", ".sprint-button"]) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.y >= 0 && box.y + box.height <= 844, `${selector}: ${JSON.stringify(box)}`);
        bounds[selector] = box;
      }
      assert.ok(bounds[".sprint-button"].height >= 44);
      assert.equal(await page.getByRole("button", { name: "How to play" }).isVisible(), true);
      assert.equal(await page.locator(".metric-label").count(), 6);
      await page.getByRole("button", { name: "Start race", exact: true }).click();
      await wait(page, 300);
      assert.equal(await page.evaluate(() => scrollY), 0);
      const sprint = page.getByRole("button", { name: "Sprint", exact: false });
      const runningBounds = await sprint.boundingBox();
      assert.ok(runningBounds.y + runningBounds.height <= 844);
      await sprint.click();
      await wait(page, 100);
      assert.ok(Number(await page.locator(".speed-readout strong").innerText()) > 0);
      await page.screenshot({
        path: `${out}/derby-mobile.png`,
        fullPage: true,
      });
      await page.screenshot({ path: `${out}/derby-mobile-first-screen.png` });
      await page.getByRole("button", { name: "Reset race", exact: true }).click();
      return bounds;
    },
  );
  await check("Audio toggle is explicit and updates state", async () => {
    const toggle = page.getByRole("button", { name: "Audio SFX", exact: true });
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
  });
  await check("Reduced motion stops visual animation", async () => {
    await page.getByRole("button", { name: "Start race", exact: true }).click();
    assert.equal(await page.locator(".runner.running").count(), 0);
    assert.equal(
      await page
        .getByRole("button", { name: "Pause wheel animation" })
        .isDisabled(),
      true,
    );
    const shot1 = await page.locator("canvas").evaluate((c) => c.toDataURL());
    await wait(page, 150);
    assert.equal(
      await page.locator("canvas").evaluate((c) => c.toDataURL()),
      shot1,
    );
    await page.getByRole("button", { name: "Reset race", exact: true }).click();
  });
  await check("Mobile wallet links and all marks load", async () => {
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1",
      isMobile: true,
      hasTouch: true,
    });
    const mobile = await phone.newPage();
    await fixture(mobile);
    await mobile.goto(url);
    await mobile.getByRole("button", { name: "Connect wallet" }).click();
    for (const name of ["MetaMask", "Coinbase Wallet", "Rabby", "Phantom"])
      assert.equal(
        await mobile
          .getByRole("link", { name: `Open in ${name}`, exact: true })
          .count(),
        1,
      );
    assert.equal(
      await mobile
        .getByRole("button", { name: "Coinbase Smart Wallet", exact: true })
        .count(),
      1,
    );
    const rabby = new URL(
      await mobile
        .getByRole("link", { name: "Open in Rabby", exact: true })
        .getAttribute("href"),
    );
    assert.equal(rabby.origin, "https://go.rabby.io");
    assert.equal(rabby.pathname, "/mobile/");
    assert.equal(rabby.searchParams.get("_cmd"), "open-dapp");
    assert.equal(rabby.searchParams.get("dapp"), mobile.url());
    await mobile.waitForFunction(() =>
      [...document.querySelectorAll("dialog img")].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    await mobile.screenshot({ path: `${out}/wallet-mobile.png` });
    await phone.close();
  });
  await check(
    "Unavailable API is honest and local game remains playable",
    async () => {
      const offline = await context.newPage();
      await fixture(offline, "offline");
      await offline.goto(url);
      await offline
        .getByText(
          "Telemetry unavailable. The local race and simulator still work.",
        )
        .waitFor();
      assert.equal(
        await offline.locator(".metric-value").first().innerText(),
        "—",
      );
      await offline
        .getByRole("button", { name: "Start race", exact: true })
        .click();
      await offline
        .getByRole("button", { name: "Sprint", exact: false })
        .click();
      await wait(offline, 100);
      assert.ok(
        Number(await offline.locator(".speed-readout strong").innerText()) > 0,
      );
      await offline.getByRole("tab", { name: /SqueekFi/ }).click();
      assert.equal(
        await offline.getByTestId("daily-reward").innerText(),
        "— SQK",
      );
      assert.match(
        await offline.locator(".formula").innerText(),
        /reference parameters/,
      );
      await offline.getByRole("button", { name: "Retry feed" }).last().click();
      await offline.close();
    },
  );
  await check(
    "Stale or faulted hardware never advances the live lane",
    async () => {
      for (const mode of ["stale", "fault"]) {
        const stale = await context.newPage();
        await fixture(stale, mode);
        await stale.goto(url);
        await stale
          .getByText(
            mode === "fault"
              ? /Hardware counter reports a fault/
              : /Hardware feed is stale/,
          )
          .waitFor();
        await stale
          .getByRole("button", { name: "Start race", exact: true })
          .click();
        await wait(stale, 250);
        assert.equal(
          await stale.locator(".hardware .lane-distance").innerText(),
          "0.00 m",
        );
        assert.match(
          await stale.locator("canvas").getAttribute("aria-label"),
          /Visualization stopped/,
        );
        await stale.close();
      }
    },
  );
  await check("Race finish, announced winner and replay", async () => {
    const fast = await context.newPage();
    await fast.route("https://api.squeekchain.com/**", (route) => {
      const data = route.request().url().endsWith("/v1/status")
        ? statusFixture()
        : economyFixture();
      if (data.measurement) data.measurement.speedMmPerSecond = 10000;
      return route.fulfill({ json: data });
    });
    await fast.goto(url);
    await fast.getByText("SPINNING 🔥", { exact: true }).waitFor();
    await fast.getByRole("button", { name: "Start race", exact: true }).click();
    await fast
      .getByRole("status")
      .filter({ hasText: "Squeektoshi wins!" })
      .waitFor();
    assert.equal(
      await fast.locator(".hardware .lane-distance").innerText(),
      "5.00 m",
    );
    await fast.getByRole("button", { name: "Race again", exact: true }).click();
    assert.equal(
      await fast
        .getByRole("button", { name: "Pause race", exact: true })
        .isVisible(),
      true,
    );
    await fast.close();
  });
  await check(
    "EIP-6963 discovery names the wallet and handles rejection",
    async () => {
      const injectedPage = await context.newPage();
      await fixture(injectedPage);
      await injectedPage.addInitScript(() => {
        const provider = {
          on() {},
          removeListener() {},
          async request({ method }) {
            if (method === "eth_chainId") return "0xaa36a7";
            if (method === "eth_accounts") return [];
            throw Object.assign(new Error("User rejected the request"), {
              code: 4001,
            });
          },
        };
        const announce = () =>
          window.dispatchEvent(
            new CustomEvent("eip6963:announceProvider", {
              detail: {
                info: {
                  uuid: crypto.randomUUID(),
                  name: "Test discovery wallet",
                  icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="%23496044"/></svg>',
                  rdns: "test.squeek.wallet",
                },
                provider,
              },
            }),
          );
        window.addEventListener("eip6963:requestProvider", announce);
      });
      await injectedPage.goto(url);
      await injectedPage
        .getByRole("button", { name: "Connect wallet" })
        .click();
      await injectedPage
        .getByRole("button", { name: "Test discovery wallet", exact: true })
        .waitFor();
      assert.equal(
        await injectedPage
          .getByRole("button", { name: "Browser wallet", exact: true })
          .count(),
        0,
      );
      await injectedPage
        .getByRole("button", { name: "Test discovery wallet", exact: true })
        .click();
      await injectedPage
        .getByText(
          "Connection was not completed. Choose a wallet to try again.",
        )
        .waitFor();
      await injectedPage.close();
    },
  );
  await check("Canvas angular velocity matches physical RPM", async () => {
    const animated = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "no-preference",
    });
    const live = await animated.newPage();
    await fixture(live);
    await live.addInitScript(() => {
      window.__rotations = [];
      const original = CanvasRenderingContext2D.prototype.rotate;
      CanvasRenderingContext2D.prototype.rotate = function (angle) {
        window.__rotations.push({ angle, time: performance.now() });
        return original.call(this, angle);
      };
    });
    await live.goto(url);
    await live.getByText("SPINNING 🔥", { exact: true }).waitFor();
    await wait(live, 350);
    const points = await live.evaluate(() => window.__rotations.slice(-10));
    assert.ok(points.length > 5);
    const first = points[0],
      last = points.at(-1);
    const delta = (last.angle - first.angle + Math.PI * 2) % (Math.PI * 2);
    const expected =
      (((last.time - first.time) / 1000) * 120 * Math.PI * 2) / 60;
    assert.ok(Math.abs(delta - expected) < 0.08, `${delta} vs ${expected}`);
    await live.getByRole("button", { name: "Pause wheel animation" }).click();
    await wait(live, 100);
    const count = await live.evaluate(() => window.__rotations.length);
    await wait(live, 100);
    assert.equal(await live.evaluate(() => window.__rotations.length), count);
    await animated.close();
    return `Observed ${delta.toFixed(3)} rad; expected ${expected.toFixed(3)} rad at 120 RPM.`;
  });
  await check(
    "No runtime or local resource errors during core flows",
    async () => {
      assert.deepEqual(errors, []);
      assert.deepEqual(localFailures, []);
    },
  );
  await context.close();
  await check("WebKit race and tab interaction", async () => {
    const safari = await webkit.launch({ headless: true });
    try {
      const p = await safari.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
      await fixture(p);
      await p.goto(url);
      await p.getByText("SPINNING 🔥", { exact: true }).waitFor();
      await p.evaluate(() => document.fonts.ready);
      const sprint = await p.locator(".sprint-button").boundingBox();
      assert.ok(sprint.y + sprint.height <= 844 && sprint.height >= 44, JSON.stringify(sprint));
      await p.getByRole("button", { name: "Start race", exact: true }).click();
      await p.getByRole("button", { name: "Sprint", exact: false }).tap();
      await p.keyboard.press("Space");
      await wait(p, 150);
      assert.ok(
        Number(await p.locator(".speed-readout strong").innerText()) > 0,
      );
      await p.getByRole("tab", { name: /SqueekFi/ }).click();
      await p.getByRole("heading", { name: "Find your power" }).waitFor();
      await noOverflow(p);
      await p.screenshot({
        path: `${out}/squeekfi-webkit-mobile.png`,
        fullPage: true,
      });
    } finally {
      await safari.close();
    }
  });
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ date: new Date().toISOString(), results }, null, 2),
  );
}
const failed = results.filter((r) => !r.passed);
console.log(
  `${results.length - failed.length}/${results.length} checks passed. Results: ${out}/results.json`,
);
if (failed.length) process.exitCode = 1;
