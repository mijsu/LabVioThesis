import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Topbar from "@/components/Topbar";
import HomePage from "@/pages/HomePage";
import UploadPage from "@/pages/UploadPage";
import DashboardPage from "@/pages/DashboardPage";
import HealthTipsPage from "@/pages/HealthTipsPage";
import EmergencyPage from "@/pages/EmergencyPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import NotFoundPage from "@/pages/NotFoundPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/signin" component={SignInPage} />
      <Route path="/signup" component={SignUpPage} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/tips" component={HealthTipsPage} />
      <Route path="/emergency" component={EmergencyPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <Topbar />
              <main className="w-full">
                <Router />
              </main>
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
