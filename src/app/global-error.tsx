"use client";

// Last resort when the root layout itself fails: no providers, no fonts — plain markup.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F7F9FC", color: "#0F172A" }}>
        <main style={{ maxWidth: 420, margin: "20vh auto", padding: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 22 }}>Mendyr couldn&apos;t load</h1>
          <p style={{ color: "#475569" }}>Please check your connection and try again.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "10px 18px",
              borderRadius: 12,
              border: 0,
              background: "#1262E2",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
