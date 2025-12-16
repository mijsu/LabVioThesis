import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, Home, Upload, LayoutDashboard, Heart, AlertCircle, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Topbar() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    ...(user ? [] : [{ href: "/", label: "Home", icon: Home }]),
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/tips", label: "Health Tips", icon: Heart },
    { href: "/emergency", label: "Emergency", icon: AlertCircle },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <>
      {/* Topbar - Desktop & Mobile */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-md bg-background/70 border-b border-border/40 transition-all duration-200"
        data-testid="topbar"
      >
        <div className="container mx-auto px-4 h-full flex items-center justify-between max-w-7xl">
          {/* Logo & Brand */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-foreground" data-testid="link-home-logo">
            <div className="w-11 h-11 rounded-xl shadow-lg shadow-primary-500/40 flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-600 overflow-hidden">
              <div className="w-full h-full p-1 rounded-md flex items-center justify-center" style={{backgroundColor: '#efe8ff'}}>
                <div className="rounded-sm flex items-center justify-center" style={{width: '92%', height: '92%', backgroundColor: '#efe8ff'}}>
                  <img
                    src="/labvio-high-resolution-logo.png?v=3"
                    alt="LabVio Logo"
                    className="w-12 h-12 object-contain"
                  />
                </div>
              </div>
            </div>
            <span className="font-bold text-xl text-foreground hidden sm:inline drop-shadow">
              LabVio
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 font-medium transition-all ${
                      active
                        ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted"
                    }`}
                    data-testid={`nav-link-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* User Profile - Desktop */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="hidden md:flex">
                  <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary-500 text-white text-sm">
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium max-w-32 truncate">
                      {user.email?.split("@")[0] || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.email?.split("@")[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="gap-2" data-testid="button-sign-out">
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/signin" className="hidden md:inline-block">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600"
                  data-testid="button-sign-in"
                >
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          data-testid="mobile-menu-overlay"
        >
          <nav className="pt-20 px-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    className="w-full justify-start gap-3 h-12 text-base"
                    data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            <div className="pt-4 pb-2">
              <div className="h-px bg-border" />
            </div>
            
            {user ? (
              <>
                <div className="px-4 py-2">
                  <p className="text-sm font-medium">{user.email?.split("@")[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 text-base text-destructive hover:text-destructive"
                  onClick={signOut}
                  data-testid="mobile-button-sign-out"
                >
                  <LogOut className="w-5 h-5" />
                  Sign out
                </Button>
              </>
            ) : (
              <Link href="/signin" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 h-12"
                  data-testid="mobile-button-sign-in"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* Spacer to prevent content from going under fixed topbar */}
      <div className="h-16" />
    </>
  );
}
