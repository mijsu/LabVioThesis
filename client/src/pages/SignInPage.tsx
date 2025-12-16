import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Activity, Mail, Lock, Loader2 } from "lucide-react";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already signed in
  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      setLocation("/dashboard");
    } catch (error) {
      // Error handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary-50 dark:to-primary-950">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8 text-foreground">
          <div className="flex items-center gap-2.5">
            <div className="w-14 h-14 rounded-xl shadow-lg shadow-primary-500/40 flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-600 overflow-hidden">
              <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{backgroundColor: '#efe8ff'}}>
                <div className="rounded-sm flex items-center justify-center" style={{width: '92%', height: '92%', backgroundColor: '#efe8ff'}}>
                  <img src="/labvio-high-resolution-logo.png?v=3" alt="LabVio Logo" className="w-12 h-12 object-contain" />
                </div>
              </div>
            </div>
            <span className="font-bold text-2xl text-foreground drop-shadow">
              LabVio
            </span>
          </div>
        </div>

        {/* Sign In Card */}
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                    data-testid="input-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600"
                disabled={loading}
                data-testid="button-sign-in"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/signup">
                <a className="text-primary-600 hover:text-primary-700 font-medium" data-testid="link-sign-up">
                  Sign up
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
