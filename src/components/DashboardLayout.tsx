import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  Bell, 
  Calculator, 
  Calendar, 
  CheckSquare, 
  Clock,
  Wallet,
  History,
  MessageSquare,
  Users,
  UserPlus,
  GraduationCap,
  Menu,
  X,
  LogOut,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  const NavItem = ({ item }: { item: typeof navigation.academic[0] }) => (
    <Link
      to={item.href}
      onClick={() => setSidebarOpen(false)}
      className={cn(
        "nav-link",
        isActive(item.href) ? "nav-link-active" : "nav-link-inactive"
      )}
    >
      <item.icon className="w-5 h-5" />
      <span>{item.name}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* User Profile */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 ring-2 ring-primary/20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                ST
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">Student</h3>
              <p className="text-sm text-muted-foreground">Member since 01/01/2024</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Academic Tools */}
          <div>
            <h4 className="section-header px-3 mb-3">Academic Tools</h4>
            <div className="space-y-1">
              {navigation.academic.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </div>

          {/* Organization */}
          <div>
            <h4 className="section-header px-3 mb-3">Organization</h4>
            <div className="space-y-1">
              {navigation.organization.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-1">
          <Link 
            to="/dashboard/settings"
            className="nav-link nav-link-inactive"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <Link 
            to="/"
            className="nav-link nav-link-inactive text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 lg:px-8 py-4">
          <div className="flex items-center gap-4">
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
              <span className="font-bold text-foreground">StudySync</span>
            </Link>

            <div className="flex-1" />

            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
