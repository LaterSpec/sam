import { writeFile } from "node:fs/promises";

const baseUrl = process.env.SAM_VISUAL_URL ?? "http://localhost:3000";
const debugUrl = process.env.SAM_CHROME_DEBUG_URL ?? "http://127.0.0.1:9222";
const output = process.argv[2] ?? "/tmp/sam-desktop-app.png";
const pathname = process.argv[3] ?? "/app";
const device = process.argv[4] ?? "desktop";
const email = process.env.SAM_VISUAL_EMAIL ?? "alex@sam.app";
const password = process.env.SAM_VISUAL_PASSWORD ?? "sam12345";

const authResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email, password }),
});
if (!authResponse.ok) throw new Error(`Visual login failed: ${authResponse.status}`);
const cookieHeader = authResponse.headers.get("set-cookie");
if (!cookieHeader) throw new Error("Visual login did not return a session cookie");
const [cookiePair] = cookieHeader.split(";");
const separator = cookiePair.indexOf("=");
const cookieName = cookiePair.slice(0, separator);
const cookieValue = cookiePair.slice(separator + 1);

const targets = await fetch(`${debugUrl}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
if (!target) throw new Error("No debuggable Chromium page found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});

function command(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await command("Network.enable");
await command("Network.setCookie", {
  name: cookieName,
  value: cookieValue,
  domain: "localhost",
  path: "/",
  httpOnly: true,
  sameSite: "Lax",
});
const mobile = device === "mobile";
if (mobile) {
  await command("Emulation.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    platform: "Android",
    userAgentMetadata: {
      brands: [{ brand: "Chromium", version: "126" }],
      fullVersionList: [{ brand: "Chromium", version: "126.0.0.0" }],
      fullVersion: "126.0.0.0",
      platform: "Android",
      platformVersion: "14",
      architecture: "",
      model: "Pixel 8",
      mobile: true,
      bitness: "",
      wow64: false,
    },
  });
}
await command("Emulation.setDeviceMetricsOverride", {
  width: mobile ? 390 : 1440,
  height: mobile ? 844 : 1000,
  deviceScaleFactor: 1,
  mobile,
});
await command("Page.enable");
await command("Page.navigate", { url: `${baseUrl}${pathname}` });
await new Promise((resolve) => setTimeout(resolve, 2200));
const screenshot = await command("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
});
await writeFile(output, Buffer.from(screenshot.data, "base64"));
socket.close();

process.stdout.write(`${output}\n`);
