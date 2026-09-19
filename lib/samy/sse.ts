/** Read finite SSE, including CRLF and frames split across network chunks. */
export async function readSamySse(response: Response, onEvent: (event: string, data: unknown) => void) {
  if (!response.body) throw new Error("no stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const dispatch = (chunk: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of chunk.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (!data.length) return;
    let parsed: unknown;
    try { parsed = JSON.parse(data.join("\n")); } catch { return; }
    onEvent(event, parsed);
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let separator: RegExpExecArray | null;
      while ((separator = /\r?\n\r?\n/.exec(buffer))) {
        dispatch(buffer.slice(0, separator.index));
        buffer = buffer.slice(separator.index + separator[0].length);
      }
      if (done) break;
    }
  } finally { reader.releaseLock(); }
}
