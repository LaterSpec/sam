import assert from "node:assert/strict";
import { test } from "node:test";
import { toolOutputStatus, toolProgressLabel, updateToolProgress, type ToolProgress } from "../lib/samy/progress";
import { readSamySse } from "../lib/samy/sse";

test("parallel calls remain independent, including repeated tool names", () => {
  let steps: ToolProgress[] = [];
  steps = updateToolProgress(steps, { id: "a", name: "sam_list_transactions", status: "running" });
  steps = updateToolProgress(steps, { id: "b", name: "sam_list_transactions", status: "running" });
  steps = updateToolProgress(steps, { id: "b", name: "sam_list_transactions", status: "done" });
  assert.equal(steps.length, 2);
  assert.equal(steps[0].status, "running");
  assert.equal(steps[1].status, "done");
});
test("errors and confirmation requests are never successful completions", () => {
  assert.equal(toolOutputStatus({ error: "confirmation_required" }), "confirmation");
  assert.equal(toolOutputStatus({ error: "quota_exceeded" }), "error");
  assert.equal(toolOutputStatus({ total: 0 }), "done");
});
test("tool labels localize actions without revealing internal names", () => {
  assert.equal(toolProgressLabel("sam_get_latest_transaction", "es"), "Consultando el último movimiento");
  assert.equal(toolProgressLabel("sam_get_cashflow", "en"), "Checking income and expenses");
  assert.equal(toolProgressLabel("unknown", "es"), "Procesando acción en SAM");
});
test("SSE handles split UTF-8, CRLF, multiple events and malformed frames", async () => {
  const raw = 'event: tool-call\r\ndata: {"id":"a","name":"sam_list_transactions"}\r\n\r\nevent: text-delta\ndata: {"text":"último"}\n\nevent: ignored\ndata: invalid\n\nevent: done\ndata: {}\n\n';
  const bytes = new TextEncoder().encode(raw);
  const response = new Response(new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    controller.close();
  } }));
  const events: [string, unknown][] = [];
  await readSamySse(response, (event, data) => events.push([event, data]));
  assert.deepEqual(events.map(([event]) => event), ["tool-call", "text-delta", "done"]);
  assert.deepEqual(events[1][1], { text: "último" });
});
test("SSE does not dispatch a callback twice if it throws", async () => {
  let calls = 0;
  await assert.rejects(readSamySse(new Response('event: done\ndata: {}\n\n'), () => { calls++; throw new Error("callback"); }), /callback/);
  assert.equal(calls, 1);
});
