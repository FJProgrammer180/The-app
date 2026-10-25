"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#080a0f",
          color: "#eef2f8",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "32rem" }}>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#f87171" }}>
            Fatal error
          </p>
          <h1 style={{ fontSize: "1.75rem", marginTop: "1rem", lineHeight: 1.2 }}>
            NEXORA could not render this page.
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#9aa7b8", fontSize: "0.9rem", lineHeight: 1.7 }}>
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              background: "#eef2f8",
              color: "#080a0f",
              border: 0,
              borderRadius: 999,
              padding: "0.65rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload the page
          </button>
        </main>
      </body>
    </html>
  );
}
