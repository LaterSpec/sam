import { SamThemeProvider } from "@/lib/theme/sam-theme";
import { Mono, Comment } from "@/components/ui/sam-primitives";

export default function CanvasPage() {
  return (
    <SamThemeProvider theme="dark">
      <div
        className="min-h-dvh px-4 py-8"
        style={{
          background: "#f0eee9",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      >
        <Mono c="#1f2328" b style={{ fontSize: 20 }}>
          SAM Design Canvas
        </Mono>
        <Comment style={{ color: "#57606a" }}>
          legacy design reference — interactive mocks archived. use /app for the live product.
        </Comment>
        <div
          className="mt-6 border p-4"
          style={{ borderColor: "rgba(0,0,0,0.12)", background: "#fff", color: "#1f2328" }}
        >
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            This route replaces SAM.html. Full artboard gallery can be restored from{" "}
            <code>docs/legacy/</code> if needed for design review.
          </p>
        </div>
      </div>
    </SamThemeProvider>
  );
}
