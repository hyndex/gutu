import * as React from "react";
import { Globe, LogIn } from "lucide-react";
import {
  authStore,
  login,
  signup,
  verifySession,
  fetchMemberships,
  fetchPlatformConfig,
  ApiError,
} from "@/runtime/auth";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Checkbox } from "@/primitives/Checkbox";
import { FormField } from "@/admin-primitives/FormField";
import { Card, CardContent } from "@/admin-primitives/Card";
import { Spinner } from "@/primitives/Spinner";
import { cn } from "@/lib/cn";

/** Gates the admin behind sign-in. Keeps the user signed-in across reloads
 *  via localStorage. Verifies the token against the backend on mount, so a
 *  server-side session revocation takes effect on the next page load. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState(authStore.isSignedIn);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authStore.token) {
        await verifySession();
        if (authStore.isSignedIn) {
          // Load tenant memberships + platform config in parallel — populates
          // the WorkspaceSwitcher before the shell renders.
          await Promise.allSettled([fetchMemberships(), fetchPlatformConfig()]);
        }
      }
      if (!cancelled) {
        setSignedIn(authStore.isSignedIn);
        setReady(true);
      }
    })();
    const off = authStore.emitter.on("change", () => {
      setSignedIn(authStore.isSignedIn);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  if (!ready) {
    return (
      <div className="h-full w-full flex items-center justify-center gap-2 text-sm text-text-muted">
        <Spinner size={14} />
        Checking session…
      </div>
    );
  }
  if (!signedIn) return <SignInScreen />;
  return <>{children}</>;
}

function SignInScreen() {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("chinmoy@gutu.dev");
  const [password, setPassword] = React.useState("password");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await login(email.trim(), password);
      else await signup(email.trim(), name.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | null;
        setError(
          err.status === 401
            ? "Incorrect email or password."
            : body?.error ?? err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-6 bg-surface-1">
      <Card className="w-full max-w-sm">
        <CardContent className="py-8 px-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-md bg-accent text-accent-fg flex items-center justify-center font-bold"
                aria-hidden
              >
                G
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Gutu</div>
                <div className="text-xs text-text-muted">
                  {mode === "signin" ? "Sign in to your workspace" : "Create a new account"}
                </div>
              </div>
            </div>

            {mode === "signup" && (
              <FormField label="Full name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  required
                  autoComplete="name"
                />
              </FormField>
            )}
            <FormField label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete={mode === "signin" ? "username" : "email"}
              />
            </FormField>
            <FormField label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 6 : undefined}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
              />
            </FormField>

            {error && (
              <div className="text-xs text-intent-danger bg-intent-danger-bg border border-intent-danger/30 rounded-md px-2 py-1.5">
                {error}
              </div>
            )}

            {mode === "signin" && (
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <Checkbox defaultChecked /> Keep me signed in
              </label>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={busy}
              iconLeft={<LogIn className="h-3.5 w-3.5" />}
            >
              {mode === "signin" ? "Sign in" : "Create workspace"}
            </Button>

            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-xs text-text-muted">or</span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" type="button">
                <Globe className="h-3.5 w-3.5 mr-1" /> Google
              </Button>
              <Button variant="outline" size="sm" type="button">Okta</Button>
              <Button variant="outline" size="sm" type="button">SAML</Button>
            </div>

            <button
              type="button"
              className={cn(
                "text-xs text-text-muted hover:text-text-link hover:underline text-center mt-1",
              )}
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
            >
              {mode === "signin"
                ? "Don't have an account? Create one"
                : "Already have an account? Sign in"}
            </button>

            {mode === "signin" && (
              <div className="text-[11px] text-text-muted border-t border-border-subtle pt-3 mt-1">
                Demo creds: <span className="font-mono">chinmoy@gutu.dev / password</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
