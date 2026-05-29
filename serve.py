#!/usr/bin/env python3
"""Local dev server for the static React app.

Plain `python3 -m http.server` lets the browser heuristically cache the
`.jsx` files, so edits often don't show up until a hard refresh. This server
sends `Cache-Control: no-store` so every reload picks up the latest source.

Usage:  python3 serve.py [port]   (defaults to 3000)
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    server = ThreadingHTTPServer(("", port), NoCacheHandler)
    print(f"SAM dev server (no-cache) on http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
