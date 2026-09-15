import { useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api.ts";

/**
 * Public synthetic demo entry — creates an isolated visitor workspace with a
 * Harbor story (Alex, Casey, license incident), then starts the guided tour.
 */
export function DemoPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>RANGER</h1>
        <p className="brand-sub">Synthetic guided demo</p>
        <p>
          Creates an isolated visitor workspace with Harbor Architecture sample people (Alex, Casey),
          an ended SketchUp seat, and a license incident — then opens the spotlight tour. No Microsoft
          credentials. Live connectors are disabled.
        </p>
        <p className="empty">Expires in ~8 hours. Not the same as staff sign-in to the full Northstar seed.</p>
        {error ? <div className="banner error">{error}</div> : null}
        <div className="actions">
          <button
            className="button"
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                await api.enterDemo();
                sessionStorage.setItem("ranger-start-tour", "1");
                window.location.assign("/");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Demo entry failed");
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Preparing workspace…" : "Enter guided demo"}
          </button>
          <Link className="button secondary" to="/login">
            Staff sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
