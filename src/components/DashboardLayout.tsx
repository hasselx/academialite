import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Bell, 
  Calculator, 
  Calendar, 
  CheckSquare, 
  Clock,
  Wallet,
  History,
  GraduationCap,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

const navigation = {
  academic: [
    { name: "Smart Reminders", href: "/dashboard", icon: Bell },
    { name: "CGPA Calculator", href: "/dashboard/cgpa", icon: Calculator },
    { name: "Attendance", href: "/dashboard/attendance", icon: CheckSquare },
    { name: "Timetable", href: "/dashboard/timetable", icon: Clock },
  ],
  organization: [
    { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
    { name: "Expenses", href: "/dashboard/expenses", icon: Wallet },
    { name: "History", href: "/dashboard/history", icon: History },
  ],
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully."
    });
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user) return "ST";
    const email = user.email || "";
    return email.substring(0, 2).toUpperCase();
  };

  const getUserName = () => {
    if (!user) return "Student";
    return user.user_metadata?.full_name || user.email?.split('@')[0] || "Student";
  };

  const getMemberSince = () => {
    if (!user?.created_at) return "";
    const date = new Date(user.created_at);
    return `Member since ${date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`;
  };

  const NavItem = ({ item }: { item: typeof navigation.academic[0] }) => {
    const content = (
      <Link
        to={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "nav-link",
          isActive(item.href) ? "nav-link-active" : "nav-link-inactive",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex w-full">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-16" : "w-72"
        )}>
          {/* Header with User Profile */}
          <div className={cn(
            "p-4 border-b border-sidebar-border",
            collapsed && "px-2"
          )}>
            <div className={cn(
              "flex items-center gap-3",
              collapsed && "flex-col gap-2"
            )}>
              <Avatar className={cn(
                "ring-2 ring-primary/20 shrink-0",
                collapsed ? "w-10 h-10" : "w-12 h-12"
              )}>
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{getUserName()}</h3>
                  <p className="text-sm text-muted-foreground truncate">{getMemberSince()}</p>
                </div>
              )}
              {/* Mobile Close Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden shrink-0"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 overflow-y-auto p-4 space-y-6",
            collapsed && "px-2"
          )}>
            {/* Academic Tools */}
            <div>
              {!collapsed && <h4 className="section-header px-3 mb-3">Academic Tools</h4>}
              <div className="space-y-1">
                {navigation.academic.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            </div>

            {/* Organization */}
            <div>
              {!collapsed && <h4 className="section-header px-3 mb-3">Organization</h4>}
              <div className="space-y-1">
                {navigation.organization.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className={cn(
            "p-4 border-t border-sidebar-border space-y-3",
            collapsed && "px-2"
          )}>
            {/* Theme Toggle */}
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button 
                    onClick={toggleTheme}
                    className="nav-link nav-link-inactive w-full justify-center px-2"
                  >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{isDark ? "Light Mode" : "Dark Mode"}</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span className="text-sm font-medium">{isDark ? "Dark" : "Light"}</span>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleTheme} />
              </div>
            )}

            {/* Sign Out */}
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleSignOut}
                    className="nav-link nav-link-inactive text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-center px-2"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            ) : (
              <button 
                onClick={handleSignOut}
                className="nav-link nav-link-inactive text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              {/* Desktop Collapse Button - outside sidebar */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hidden lg:flex shrink-0"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    {collapsed ? (
                      <PanelLeft className="w-5 h-5" />
                    ) : (
                      <PanelLeftClose className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {collapsed ? "Expand sidebar" : "Collapse sidebar"}
                </TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>
              
              <Link to="/" className="flex items-center gap-2 lg:hidden">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">Academia</span>
              </Link>

              <div className="flex-1" />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DashboardLayout;
