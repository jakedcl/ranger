import { useState } from "react";
import { Link } from "react-router";
import { authClient } from "../lib/auth-client.ts";

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [startTour, setStartTour] = useState(false);

  return (
    <div className="auth-screen">
      <form
        className="auth-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const data = new FormData(event.currentTarget);
          const result = await authClient.signIn.email({
            email: String(data.get("email") ?? ""),
            password: String(data.get("password") ?? ""),
          });
          setPending(false);
          if (result.error) {
            setError(result.error.message ?? "Sign in failed");
            return;
          }
          if (startTour) sessionStorage.setItem("ranger-start-tour", "1");
          window.location.assign("/");
        }}
      >
        <h1>RANGER</h1>
        <p>Staff sign-in to the full Northstar development seed.</p>
        <p className="empty">
          Prefer the visitor walkthrough?{" "}
          <Link to="/demo">Enter guided demo</Link> — isolated copy + spotlights, no staff password.
        </p>
        <p className="empty">
          Seed staff (password from <code>SEED_STAFF_PASSWORD</code>):{" "}
          <code>admin@northstar.example</code>, <code>technician@northstar.example</code>,{" "}
          <code>viewer@northstar.example</code>
        </p>
        {error ? <div className="banner error">{error}</div> : null}
        <label className="required" htmlFor="email">
          Staff email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue="admin@northstar.example"
        />
        <label className="required" htmlFor="password">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <label className="tour-check">
          <input
            type="checkbox"
            checked={startTour}
            onChange={(event) => setStartTour(event.target.checked)}
          />{" "}
          Start guided tour after sign-in
        </label>
        <div className="actions">
          <button className="button" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <Link className="button secondary" to="/demo">
            Guided demo
          </Link>
        </div>
      </form>
    </div>
  );
}
