import { test, expect, type Page } from "@playwright/test";

// Helper: wait for the DHT to be ready (create-room button becomes enabled).
// This means relay is connected and the DHT routing table is populated.
async function waitForDhtReady(page: Page) {
  await expect(page.locator("#relay-status")).toHaveText("connected", {
    timeout: 30_000,
  });
  await expect(page.locator("#create-room-btn")).toBeEnabled({
    timeout: 30_000,
  });
}

// Helper: wait for a log entry matching a pattern.
async function waitForLog(page: Page, pattern: RegExp, timeout = 60_000) {
  await expect(page.locator("#log")).toContainText(pattern, { timeout });
}

test.describe("Room messaging", () => {
  test("two browsers exchange messages through a room", async ({ browser }) => {
    // Two separate browser contexts = two separate identities (separate localStorage)
    const contextA = await browser.newContext({ ignoreHTTPSErrors: true });
    const contextB = await browser.newContext({ ignoreHTTPSErrors: true });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Both navigate to the app
      await pageA.goto("/");
      await pageB.goto("/");

      // Wait for both to connect to the relay and have DHT ready
      await Promise.all([waitForDhtReady(pageA), waitForDhtReady(pageB)]);

      // Browser A creates a room
      await pageA.locator("#room-name").fill("e2e-test-room");
      await pageA.locator("#create-room-btn").click();

      // Wait for room ID to appear
      await expect(pageA.locator("#room-info")).toBeVisible();
      const roomId = await pageA.locator("#room-id").textContent();
      expect(roomId).toBeTruthy();

      // Wait for DHT announcement to complete
      await waitForLog(pageA, /Announced on DHT/);

      // Browser B joins the room
      await pageB.locator("#room-id-input").fill(roomId!);
      await pageB.locator("#join-room-btn").click();

      // Wait for peer discovery and WebRTC connection on both sides
      await waitForLog(pageB, /Found peer via DHT/);

      // Wait for WebRTC connection to establish (either side may identify first)
      // The identify log shows connection type: "webrtc limited=false" means direct
      await Promise.all([
        waitForLog(pageA, /Identify:.*webrtc/),
        waitForLog(pageB, /Identify:.*webrtc/),
      ]);

      // Give GossipSub a moment to form the mesh after WebRTC connects
      await pageA.waitForTimeout(2_000);

      // Browser A sends a message
      await pageA.locator("#message-input").fill("hello from A");
      await pageA.locator("#send-btn").click();

      // Verify A sees it as sent
      await expect(
        pageA.locator("#log div.log-sent").last(),
      ).toContainText("hello from A");

      // Verify B receives it
      await expect(
        pageB.locator("#log div.log-received").last(),
      ).toContainText("hello from A");

      // Browser B sends a message back
      await pageB.locator("#message-input").fill("hello from B");
      await pageB.locator("#send-btn").click();

      // Verify B sees it as sent
      await expect(
        pageB.locator("#log div.log-sent").last(),
      ).toContainText("hello from B");

      // Verify A receives it
      await expect(
        pageA.locator("#log div.log-received").last(),
      ).toContainText("hello from B");
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
