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
  Moon,
  Settings,
  Globe,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

import { countries, getOffsetForTimezone, getTimezoneForCountry } from "@/hooks/useTimeSettings";

const formatOffset = (offset: number) => {
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return m === 0 ? `${sign}${h}` : `${sign}${h}:${m.toString().padStart(2, '0')}`;
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [savingTimeSettings, setSavingTimeSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [timeFormat, setTimeFormat] = useState<'12hr' | '24hr'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('timeFormat') as '12hr' | '24hr') || '12hr';
    }
    return '12hr';
  });
  const [selectedCountry, setSelectedCountry] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userCountry') || 'IN';
    }
    return 'IN';
  });
  const [selectedTimezone, setSelectedTimezone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userTimezone');
      if (saved) return saved;
      const code = localStorage.getItem('userCountry') || 'IN';
      return getTimezoneForCountry(code);
    }
    return 'Asia/Kolkata';
  });
  const [tzPickerOpen, setTzPickerOpen] = useState(false);

  // Full list of IANA timezones (browser-provided, fallback to common list)
  const allTimezones = (() => {
    try {
      // @ts-ignore - supportedValuesOf is supported in modern browsers
      const list = (Intl as any).supportedValuesOf?.('timeZone') as string[] | undefined;
      if (list && list.length) return list;
    } catch {}
    return countries.map(c => c.tz);
  })();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Update current time every second when time sheet is open
  useEffect(() => {
    if (!timeSheetOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [timeSheetOpen]);

  // Get formatted time for selected timezone (DST-aware via Intl)
  const getLocalTimeForTimezone = () => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: selectedTimezone,
      hour: timeFormat === '24hr' ? '2-digit' : 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: timeFormat !== '24hr',
    }).format(currentTime);
  };

  // Fetch user's time settings from database on load
  useEffect(() => {
    const fetchUserTimeSettings = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('timezone_offset, time_format, timezone')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching time settings:', error);
          return;
        }
        
        if (data) {
          const tz = (data as any).timezone as string | null | undefined;
          if (tz) {
            setSelectedTimezone(tz);
            localStorage.setItem('userTimezone', tz);
            const country = countries.find(c => c.tz === tz);
            if (country) {
              setSelectedCountry(country.code);
              localStorage.setItem('userCountry', country.code);
            }
          } else if (data.timezone_offset !== null && data.timezone_offset !== undefined) {
            const offsetNum = Number(data.timezone_offset);
            const country = countries.find(c => getOffsetForTimezone(c.tz) === offsetNum);
            if (country) {
              setSelectedCountry(country.code);
              setSelectedTimezone(country.tz);
              localStorage.setItem('userCountry', country.code);
              localStorage.setItem('userTimezone', country.tz);
            }
          }
          if (data.time_format) {
            setTimeFormat(data.time_format as '12hr' | '24hr');
            localStorage.setItem('timeFormat', data.time_format);
          }
        }
      } catch (error) {
        console.error('Error fetching time settings:', error);
      }
    };
    
    fetchUserTimeSettings();
  }, [user?.id]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('timeFormat', timeFormat);
  }, [timeFormat]);

  useEffect(() => {
    localStorage.setItem('userCountry', selectedCountry);
  }, [selectedCountry]);

  useEffect(() => {
    localStorage.setItem('userTimezone', selectedTimezone);
  }, [selectedTimezone]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleSaveTimeSettings = async () => {
    const country = countries.find(c => c.code === selectedCountry);
    const tz = selectedTimezone || country?.tz || 'Asia/Kolkata';
    const tzLabel = country?.tz === tz ? (country?.name || tz) : tz;
    const currentOffset = getOffsetForTimezone(tz);

    if (!user?.id) {
      toast({
        title: "Time settings saved locally",
        description: `${timeFormat === '12hr' ? '12-hour' : '24-hour'} format, ${tzLabel} timezone`
      });
      setTimeSheetOpen(false);
      return;
    }

    setSavingTimeSettings(true);
    try {
      // Save to database for email notifications (store IANA tz for DST-aware delivery)
      const { error } = await supabase
        .from('profiles')
        .update({
          timezone_offset: currentOffset,
          timezone: tz,
          time_format: timeFormat,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Time settings saved",
        description: `${timeFormat === '12hr' ? '12-hour' : '24-hour'} format, ${tzLabel} timezone. Email notifications will now use your timezone.`
      });
    } catch (error: any) {
      console.error('Error saving time settings:', error);
      toast({
        title: "Settings saved locally",
        description: "Could not sync to server. Email notifications may use default timezone.",
        variant: "destructive"
      });
    } finally {
      setSavingTimeSettings(false);
      setTimeSheetOpen(false);
    }
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
            "p-3 border-b border-sidebar-border",
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
                  <h3 className="font-semibold text-sidebar-foreground truncate">{getUserName()}</h3>
                  <p className="text-sm text-sidebar-foreground/70 truncate">{getMemberSince()}</p>
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
            "flex-1 p-3 space-y-4",
            collapsed && "px-2"
          )}>
            {/* Academic Tools */}
            <div>
              {!collapsed && <h4 className="section-header px-3 mb-2">Academic Tools</h4>}
              <div className="space-y-0.5">
                {navigation.academic.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            </div>

            {/* Organization */}
            <div>
              {!collapsed && <h4 className="section-header px-3 mb-2">Organization</h4>}
              <div className="space-y-0.5">
                {navigation.organization.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
                
                {/* Time Settings Button */}
                <Sheet open={timeSheetOpen} onOpenChange={setTimeSheetOpen}>
                  <SheetTrigger asChild>
                    {collapsed ? (
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button
                            className="nav-link nav-link-inactive w-full justify-center px-2"
                          >
                            <Settings className="w-5 h-5 shrink-0" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          Time Settings
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        className="nav-link nav-link-inactive w-full"
                      >
                        <Settings className="w-5 h-5 shrink-0" />
                        <span>Time</span>
                      </button>
                    )}
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[350px] sm:w-[400px]">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Time Settings
                      </SheetTitle>
                      <SheetDescription>
                        Configure your time format and timezone preferences
                      </SheetDescription>
                    </SheetHeader>
                    
                    <div className="mt-4 space-y-4">
                      {/* Time Format - Side by side */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Time Format</Label>
                        <RadioGroup
                          value={timeFormat}
                          onValueChange={(value) => setTimeFormat(value as '12hr' | '24hr')}
                          className="grid grid-cols-2 gap-2"
                        >
                          <div className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${timeFormat === '12hr' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}>
                            <RadioGroupItem value="12hr" id="12hr" />
                            <Label htmlFor="12hr" className="flex-1 cursor-pointer text-xs">
                              <span className="font-medium">12-hour</span>
                              <p className="text-[10px] text-muted-foreground">2:30 PM</p>
                            </Label>
                          </div>
                          <div className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${timeFormat === '24hr' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}>
                            <RadioGroupItem value="24hr" id="24hr" />
                            <Label htmlFor="24hr" className="flex-1 cursor-pointer text-xs">
                              <span className="font-medium">24-hour</span>
                              <p className="text-[10px] text-muted-foreground">14:30</p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Country/Timezone */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          Country / Timezone
                        </Label>
                        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                          <SelectTrigger className="w-full h-9 text-sm">
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => {
                              const off = getOffsetForTimezone(country.tz);
                              return (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name} (UTC{formatOffset(off)})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Used for reminder notification timing
                        </p>
                      </div>

                      {/* Live Clock Preview - Compact */}
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Current Local Time</Label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="text-xl font-mono font-semibold text-foreground tabular-nums">
                            {getLocalTimeForTimezone()}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {countries.find(c => c.code === selectedCountry)?.name || 'Unknown'}
                        </p>
                      </div>

                      {/* Save Button */}
                      <Button onClick={handleSaveTimeSettings} className="w-full h-9" disabled={savingTimeSettings}>
                        {savingTimeSettings ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Settings"
                        )}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className={cn(
            "p-3 border-t border-sidebar-border space-y-2",
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
