import assert from "node:assert/strict";
import test from "node:test";
import { resolveSamExperience } from "../lib/presentation/experience";

function requestHeaders(values: Record<string, string>): Headers {
  return new Headers(values);
}

test("client hint selects the phone experience", () => {
  assert.equal(resolveSamExperience(requestHeaders({ "sec-ch-ua-mobile": "?1" })), "mobile");
});
test("desktop client hint wins over a phone-shaped fallback user agent", () => {
  assert.equal(
    resolveSamExperience(
      requestHeaders({
        "sec-ch-ua-mobile": "?0",
        "user-agent": "Mozilla/5.0 (Linux; Android 14; Mobile)",
      })
    ),
    "desktop"
  );
});

test("iPhone and Android Mobile use the phone experience", () => {
  assert.equal(
    resolveSamExperience(requestHeaders({ "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" })),
    "mobile"
  );
  assert.equal(
    resolveSamExperience(requestHeaders({ "user-agent": "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit Mobile" })),
    "mobile"
  );
});

test("iPad, Android tablets and desktop systems use desktop", () => {
  for (const userAgent of [
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)",
    "Mozilla/5.0 (Linux; Android 14; Pixel Tablet)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  ]) {
    assert.equal(resolveSamExperience(requestHeaders({ "user-agent": userAgent })), "desktop");
  }
});
