import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell, RefreshCw, Trash2, Plus, Mail, AlertTriangle, Clock, CheckCircle2, Loader2, Sparkles, Calendar, Send, GraduationCap, X, Settings, ChevronDown, Pencil, PieChart, CalendarDays, Search } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, isBefore, isAfter, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTimeSettings } from "@/hooks/useTimeSettings";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Label, Sector } from "recharts";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

interface Reminder {
  id: string;
  title: string;
  type: "assignment" | "exam" | "project" | "other";
  dueDate: string;
  dueTime: string | null;
  description: string;
  priority: "critical" | "urgent" | "normal";
  completed: boolean;
  updatedAt?: string;
}

interface Exam {
  id: string;
  subject: string;
  date: string;
  startTime: string;
}

const Reminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [completedReminders, setCompletedReminders] = useState<Reminder[]>([]);
  const [messageText, setMessageText] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("assignment");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [dueTimePeriod, setDueTimePeriod] = useState<'AM' | 'PM'>('AM');
  const [description, setDescription] = useState("");
  const [emailSettingsOpen, setEmailSettingsOpen] = useState(false);
  const [priority, setPriority] = useState<string>("normal");
  const [emailEnabled, setEmailEnabled] = useState(() => {
    const saved = localStorage.getItem('emailNotificationsEnabled');
    return saved === 'true';
  });
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showExamPopup, setShowExamPopup] = useState(true);
  const [upcomingExam, setUpcomingExam] = useState<Exam | null>(null);
  
  // Edit/Delete state
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editTimePeriod, setEditTimePeriod] = useState<'AM' | 'PM'>('AM');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteReminderId, setDeleteReminderId] = useState<string | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatTime, timezoneOffset, timeFormat } = useTimeSettings();
  
  // Helper: Convert 24hr time to 12hr format for input
  const to12HourFormat = (time24: string): { time12: string; period: 'AM' | 'PM' } => {
    if (!time24) return { time12: '', period: 'AM' };
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return { time12: `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, period };
  };
  
  // Helper: Convert 12hr time + period to 24hr format for storage
  const to24HourFormat = (time12: string, period: 'AM' | 'PM'): string => {
    if (!time12) return '';
    const [hours, minutes] = time12.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 = hours + 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // Email settings state
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notify24Hours, setNotify24Hours] = useState(() => {
    const saved = localStorage.getItem('notify24Hours');
    return saved !== 'false'; // Default true
  });
  const [notify1Hour, setNotify1Hour] = useState(() => {
    const saved = localStorage.getItem('notify1Hour');
    return saved !== 'false'; // Default true
  });
  const [notifyOverdue, setNotifyOverdue] = useState(() => {
    const saved = localStorage.getItem('notifyOverdue');
    return saved !== 'false'; // Default true
  });
  const [notify48Hours, setNotify48Hours] = useState(() => {
    const saved = localStorage.getItem('notify48Hours');
    return saved === 'true'; // Default false
  });
  const [notify72Hours, setNotify72Hours] = useState(() => {
    const saved = localStorage.getItem('notify72Hours');
    return saved === 'true'; // Default false
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [checkingNotifications, setCheckingNotifications] = useState(false);

  useEffect(() => {
    localStorage.setItem('emailNotificationsEnabled', emailEnabled.toString());
    localStorage.setItem('notify24Hours', notify24Hours.toString());
    localStorage.setItem('notify1Hour', notify1Hour.toString());
    localStorage.setItem('notifyOverdue', notifyOverdue.toString());
    localStorage.setItem('notify48Hours', notify48Hours.toString());
    localStorage.setItem('notify72Hours', notify72Hours.toString());
  }, [emailEnabled, notify24Hours, notify1Hour, notifyOverdue, notify48Hours, notify72Hours]);
  
  useEffect(() => {
    if (user?.email && !notifyEmail) {
      setNotifyEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    if (user) {
      fetchReminders();
      fetchCompletedReminders();
      fetchUpcomingExam();
    }
  }, [user]);

  const fetchCompletedReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user?.id)
        .eq('completed', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCompletedReminders(data?.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description || "",
        type: r.type as Reminder['type'],
        dueDate: r.due_date,
        dueTime: r.due_time || null,
        priority: r.priority as Reminder['priority'],
        completed: r.completed,
        updatedAt: r.created_at // Use created_at as completion timestamp proxy
      })) || []);
    } catch (error: any) {
      console.error("Error fetching completed reminders:", error.message);
    }
  };

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user?.id)
        .eq('completed', false)
        .order('due_date', { ascending: true });

      if (error) throw error;

      setReminders(data?.map(r => ({
        id: r.id,
        title: r.title,
        type: r.type as Reminder['type'],
        dueDate: r.due_date,
        dueTime: r.due_time || null,
        description: r.description || '',
        priority: r.priority as Reminder['priority'],
        completed: r.completed
      })) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching reminders",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingExam = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('exams')
        .select('id, subject, date, start_time')
        .eq('user_id', user?.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUpcomingExam({
          id: data.id,
          subject: data.subject,
          date: data.date,
          startTime: data.start_time.slice(0, 5)
        });
      } else {
        setUpcomingExam(null);
      }
    } catch (error) {
      console.error('Error fetching upcoming exam:', error);
    }
  };

  const stats = {
    critical: reminders.filter(r => r.priority === "critical").length,
    urgent: reminders.filter(r => r.priority === "urgent").length,
    overdue: reminders.filter(r => new Date(r.dueDate) < new Date()).length,
    dueToday: reminders.filter(r => {
      const today = new Date().toISOString().split('T')[0];
      return r.dueDate === today;
    }).length,
    total: reminders.length
  };

  // Type-based statistics for pie chart (completed reminders)
  const completedTypeStats = {
    assignment: completedReminders.filter(r => r.type === "assignment").length,
    exam: completedReminders.filter(r => r.type === "exam").length,
    project: completedReminders.filter(r => r.type === "project").length,
    other: completedReminders.filter(r => r.type === "other").length,
    total: completedReminders.length,
  };

  // Type-based statistics for ongoing reminders
  const ongoingTypeStats = {
    assignment: reminders.filter(r => r.type === "assignment").length,
    exam: reminders.filter(r => r.type === "exam").length,
    project: reminders.filter(r => r.type === "project").length,
    other: reminders.filter(r => r.type === "other").length,
    total: reminders.length,
  };

  // State for record view
  const [recordViewType, setRecordViewType] = useState<"completed" | "ongoing" | "inspect">("completed");
  const [activeType, setActiveType] = useState<string>("assignment");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "week" | "month" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showInspect, setShowInspect] = useState(false);

  // Filter reminders by date range
  const filterByDateRange = (remindersList: Reminder[]) => {
    if (dateRangeFilter === "all") return remindersList;
    
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    
    if (dateRangeFilter === "week") {
      startDate = startOfWeek(today, { weekStartsOn: 1 });
      endDate = endOfWeek(today, { weekStartsOn: 1 });
    } else if (dateRangeFilter === "month") {
      startDate = startOfMonth(today);
      endDate = endOfMonth(today);
    } else if (dateRangeFilter === "custom" && customStartDate && customEndDate) {
      startDate = parseISO(customStartDate);
      endDate = parseISO(customEndDate);
    } else {
      return remindersList;
    }
    
    return remindersList.filter(r => {
      const reminderDate = parseISO(r.dueDate);
      return isWithinInterval(reminderDate, { start: startDate, end: endDate });
    });
  };

  // Filtered reminders based on date range
  const filteredCompletedReminders = filterByDateRange(completedReminders);
  const filteredOngoingReminders = filterByDateRange(reminders);

  // Calculate on-time vs late completion stats
  const completionStats = useMemo(() => {
    let onTime = 0;
    let late = 0;
    
    filteredCompletedReminders.forEach(reminder => {
      const dueDate = parseISO(reminder.dueDate);
      const completedAt = reminder.updatedAt ? new Date(reminder.updatedAt) : new Date();
      
      // Set due date to end of day for fair comparison
      dueDate.setHours(23, 59, 59, 999);
      
      if (isAfter(completedAt, dueDate)) {
        late++;
      } else {
        onTime++;
      }
    });
    
    return { onTime, late, total: onTime + late };
  }, [filteredCompletedReminders]);

  // Get current stats based on view type with date filter
  const currentTypeStats = recordViewType === "ongoing" 
    ? {
        assignment: filteredOngoingReminders.filter(r => r.type === "assignment").length,
        exam: filteredOngoingReminders.filter(r => r.type === "exam").length,
        project: filteredOngoingReminders.filter(r => r.type === "project").length,
        other: filteredOngoingReminders.filter(r => r.type === "other").length,
        total: filteredOngoingReminders.length,
      }
    : {
        assignment: filteredCompletedReminders.filter(r => r.type === "assignment").length,
        exam: filteredCompletedReminders.filter(r => r.type === "exam").length,
        project: filteredCompletedReminders.filter(r => r.type === "project").length,
        other: filteredCompletedReminders.filter(r => r.type === "other").length,
        total: filteredCompletedReminders.length,
      };

  // Chart config for interactive pie
  const chartConfig = {
    count: { label: "Count" },
    assignment: { label: "Assignments", color: "hsl(var(--primary))" },
    exam: { label: "Exams", color: "hsl(var(--destructive))" },
    project: { label: "Projects", color: "hsl(var(--success))" },
    other: { label: "Other", color: "hsl(var(--muted-foreground))" },
    onTime: { label: "On Time", color: "hsl(var(--success))" },
    afterDue: { label: "After Due", color: "hsl(var(--destructive))" },
  } satisfies ChartConfig;

  const pieChartData = recordViewType === "inspect" 
    ? [
        { type: "onTime", count: completionStats.onTime, fill: "var(--color-onTime)" },
        { type: "afterDue", count: completionStats.late, fill: "var(--color-afterDue)" },
      ].filter(item => item.count > 0)
    : [
        { type: "assignment", count: currentTypeStats.assignment, fill: "var(--color-assignment)" },
        { type: "exam", count: currentTypeStats.exam, fill: "var(--color-exam)" },
        { type: "project", count: currentTypeStats.project, fill: "var(--color-project)" },
        { type: "other", count: currentTypeStats.other, fill: "var(--color-other)" },
      ].filter(item => item.count > 0);

  const activeIndex = React.useMemo(
    () => pieChartData.findIndex((item) => item.type === activeType),
    [activeType, pieChartData]
  );

  const types = React.useMemo(() => pieChartData.map((item) => item.type), [pieChartData]);

  // Calculate time left for next exam
  const getTimeLeft = (dueDate: string) => {
    const now = new Date();
    const examDate = new Date(dueDate);
    const diffMs = examDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Now!";
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    return `${hours}h left`;
  };

  // Get days left for color coding
  const getDaysLeft = (dueDate: string) => {
    const now = new Date();
    const examDate = new Date(dueDate);
    const diffMs = examDate.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  // Get popup color based on time left
  const getExamPopupColor = (dueDate: string) => {
    const days = getDaysLeft(dueDate);
    if (days <= 1) return "from-destructive to-destructive/80"; // Red - 1 day or less
    if (days <= 5) return "from-warning to-warning/80"; // Orange - 2-5 days
    return "from-success to-success/80"; // Green - more than 5 days
  };

  const handleParseMessage = async () => {
    if (!messageText.trim()) {
      toast({
        title: "No message to parse",
        description: "Please paste a message first.",
        variant: "destructive"
      });
      return;
    }

    setParsing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ message: messageText })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse message');
      }

      const data = await response.json();
      const parsed = data.parsed;

      setTitle(parsed.title || '');
      setType(parsed.type || 'assignment');
      setDueDate(parsed.dueDate || '');
      
      // Handle time based on format preference
      if (parsed.dueTime && timeFormat === '12hr') {
        const { time12, period } = to12HourFormat(parsed.dueTime);
        setDueTime(time12);
        setDueTimePeriod(period);
      } else {
        setDueTime(parsed.dueTime || '');
      }
      
      setPriority(parsed.priority || 'normal');
      setDescription(parsed.description || '');

      toast({
        title: "Message Parsed with AI!",
        description: "Review the extracted information below."
      });
    } catch (error: any) {
      console.error('Parse error:', error);
      toast({
        title: "Failed to parse message",
        description: error.message || "Please try again or enter details manually.",
        variant: "destructive"
      });
    } finally {
      setParsing(false);
    }
  };

  const getPriorityIcon = (priorityLevel: string) => {
    switch (priorityLevel) {
      case "critical": return "🔴";
      case "urgent": return "🟠";
      default: return "🟢";
    }
  };

  const sendEmailNotification = async (
    reminderTitle: string, 
    reminderDueDate: string,
    reminderType: string = "assignment",
    reminderPriority: string = "normal",
    reminderDescription: string = "",
    timingText: string = "New Reminder Created",
    reminderDueTime: string | null = null
  ) => {
    const emailTo = notifyEmail || user?.email;
    if (!emailTo) return;
    
    setSendingEmail(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          to: emailTo,
          reminder_title: reminderTitle,
          reminder_type: reminderType.charAt(0).toUpperCase() + reminderType.slice(1),
          due_date: new Date(reminderDueDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          due_time: reminderDueTime ? formatTime(reminderDueTime) : undefined,
          priority_level: reminderPriority.charAt(0).toUpperCase() + reminderPriority.slice(1),
          priority_icon: getPriorityIcon(reminderPriority),
          description: reminderDescription || "No description provided",
          timing_text: timingText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      toast({
        title: "Email sent!",
        description: "You'll receive a reminder email shortly."
      });
    } catch (error: any) {
      console.error('Email error:', error);
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSaveReminder = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your reminder.",
        variant: "destructive"
      });
      return;
    }

    try {
      const reminderDueDate = dueDate || new Date().toISOString().split('T')[0];
      
      // Convert time to 24hr format for storage if using 12hr format
      const timeToSave = timeFormat === '12hr' && dueTime 
        ? to24HourFormat(dueTime, dueTimePeriod) 
        : dueTime;
      
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: user?.id,
          title,
          type,
          due_date: reminderDueDate,
          due_time: timeToSave || null,
          description: description || null,
          priority,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;

      setReminders([{
        id: data.id,
        title: data.title,
        type: data.type as Reminder['type'],
        dueDate: data.due_date,
        dueTime: data.due_time || null,
        description: data.description || '',
        priority: data.priority as Reminder['priority'],
        completed: data.completed
      }, ...reminders]);

      // Send email if checkbox is checked
      if (sendEmail) {
        await sendEmailNotification(title, reminderDueDate, type, priority, description, "🔔 New Reminder Created", timeToSave || null);
      }

      setTitle("");
      setType("assignment");
      setDueDate("");
      setDueTime("");
      setDueTimePeriod('AM');
      setDescription("");
      setPriority("normal");
      setSendEmail(false);
      
      toast({
        title: "Reminder saved!",
        description: "Your reminder has been added successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error saving reminder",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReminders(reminders.filter(r => r.id !== id));
      setShowDeleteAlert(false);
      setDeleteReminderId(null);
      toast({
        title: "Reminder deleted",
        description: "The reminder has been removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting reminder",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditReminder = async () => {
    if (!editingReminder) return;
    
    try {
      // Convert time to 24hr format for storage if using 12hr format
      const timeToSave = timeFormat === '12hr' && editingReminder.dueTime 
        ? to24HourFormat(editingReminder.dueTime, editTimePeriod) 
        : editingReminder.dueTime;
      
      const { error } = await supabase
        .from('reminders')
        .update({
          title: editingReminder.title,
          type: editingReminder.type,
          due_date: editingReminder.dueDate,
          due_time: timeToSave || null,
          description: editingReminder.description || null,
          priority: editingReminder.priority,
        })
        .eq('id', editingReminder.id);

      if (error) throw error;

      // Store the 24hr version in local state
      const updatedReminder = { ...editingReminder, dueTime: timeToSave || null };
      setReminders(reminders.map(r => r.id === editingReminder.id ? updatedReminder : r));
      setShowEditDialog(false);
      setEditingReminder(null);
      toast({
        title: "Reminder updated",
        description: "Your changes have been saved."
      });
    } catch (error: any) {
      toast({
        title: "Error updating reminder",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (reminder: Reminder) => {
    if (timeFormat === '12hr' && reminder.dueTime) {
      const { time12, period } = to12HourFormat(reminder.dueTime);
      setEditingReminder({ ...reminder, dueTime: time12 });
      setEditTimePeriod(period);
    } else {
      setEditingReminder({ ...reminder });
      setEditTimePeriod('AM');
    }
    setShowEditDialog(true);
  };

  const confirmDeleteReminder = (id: string) => {
    setDeleteReminderId(id);
    setShowDeleteAlert(true);
  };

  const handleCompleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed: true })
        .eq('id', id);

      if (error) throw error;

      const completedReminder = reminders.find(r => r.id === id);
      if (completedReminder) {
        setCompletedReminders(prev => [{ ...completedReminder, completed: true }, ...prev]);
      }
      setReminders(reminders.filter(r => r.id !== id));
      toast({
        title: "Reminder completed!",
        description: "Great job finishing this task."
      });
    } catch (error: any) {
      toast({
        title: "Error updating reminder",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-destructive/10 text-destructive border-destructive/30";
      case "urgent": return "bg-warning/10 text-warning border-warning/30";
      default: return "bg-info/10 text-info border-info/30";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "assignment": return "bg-primary";
      case "exam": return "bg-destructive";
      case "project": return "bg-success";
      default: return "bg-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in relative overflow-x-hidden">
      {/* Header with Refresh & Email Toggle + Exam Popup above it */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-primary">
          <Bell className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
          <h1 className="text-xl sm:text-3xl font-bold">Smart Reminders</h1>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          {/* Upcoming Exam Popup - Above email notifications */}
          <AnimatePresence>
            {upcomingExam && showExamPopup && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full sm:w-auto"
              >
                <Card className={`bg-gradient-to-br ${getExamPopupColor(upcomingExam.date)} border-none shadow-lg w-full sm:w-72`}>
                  <CardContent className="p-3 text-white relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5 text-white/70 hover:text-white hover:bg-white/20"
                      onClick={() => setShowExamPopup(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider opacity-90">Upcoming Exam</span>
                    </div>
                    <h4 className="font-bold text-base mb-1 pr-5">{upcomingExam.subject}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-90">
                        {new Date(upcomingExam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTime(upcomingExam.startTime)}
                      </span>
                      <Badge className="bg-white/20 text-white border-none text-xs">
                        {getTimeLeft(upcomingExam.date)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Record Button with Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                  <PieChart className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Record</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:w-[400px] md:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    Tasks Record
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6 pb-8">
                  {/* View Type & Date Range Selectors */}
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={recordViewType} onValueChange={(v) => {
                      setRecordViewType(v as "completed" | "ongoing" | "inspect");
                      if (v === "inspect") {
                        setShowInspect(true);
                      } else {
                        setShowInspect(false);
                      }
                    }}>
                      <SelectTrigger aria-label="Select view type">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="inspect">
                          <span className="flex items-center gap-2">
                            <Search className="w-3 h-3" />
                            Inspect
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as "all" | "week" | "month" | "custom")}>
                      <SelectTrigger aria-label="Select date range">
                        <CalendarDays className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range Inputs */}
                  {dateRangeFilter === "custom" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Start Date</label>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full date-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">End Date</label>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full date-input"
                        />
                      </div>
                    </div>
                  )}

                  {/* Interactive Pie Chart */}
                  {pieChartData.length > 0 ? (
                    <Card className="flex flex-col">
                      <CardHeader className="items-center pb-0">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {recordViewType === "inspect" && <Clock className="w-5 h-5 text-primary" />}
                          {recordViewType === "completed" ? "Completed Tasks" : recordViewType === "ongoing" ? "Ongoing Tasks" : "Completion Analysis"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col items-center pb-4">
                        <ChartContainer
                          config={chartConfig}
                          className="mx-auto aspect-square w-full max-w-[300px]"
                        >
                          <RechartsPieChart>
                            <Pie
                              data={pieChartData}
                              dataKey="count"
                              nameKey="type"
                              innerRadius={60}
                              outerRadius={100}
                              strokeWidth={5}
                            >
                              <Label
                                content={({ viewBox }) => {
                                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                    const centerValue = recordViewType === "inspect" 
                                      ? completionStats.total 
                                      : currentTypeStats.total;
                                    const centerLabel = recordViewType === "inspect" 
                                      ? "Analyzed" 
                                      : recordViewType === "ongoing" 
                                        ? "Ongoing" 
                                        : "Completed";
                                    return (
                                      <text
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                      >
                                        <tspan
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          className="fill-foreground text-3xl font-bold"
                                        >
                                          {centerValue.toLocaleString()}
                                        </tspan>
                                        <tspan
                                          x={viewBox.cx}
                                          y={(viewBox.cy || 0) + 24}
                                          className="fill-muted-foreground text-sm"
                                        >
                                          {centerLabel}
                                        </tspan>
                                      </text>
                                    );
                                  }
                                }}
                              />
                            </Pie>
                          </RechartsPieChart>
                        </ChartContainer>

                        {/* Completion Analysis (shown for inspect mode) */}
                        {recordViewType === "inspect" && (
                          <div className="w-full space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 rounded-xl bg-success/10 border border-success/30">
                                <div className="text-4xl font-bold text-success">{completionStats.onTime}</div>
                                <div className="text-sm text-muted-foreground mt-1">On Time</div>
                              </div>
                              <div className="text-center p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                                <div className="text-4xl font-bold text-destructive">{completionStats.late}</div>
                                <div className="text-sm text-muted-foreground mt-1">After Due</div>
                              </div>
                            </div>
                            {completionStats.total > 0 && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">On-time rate</span>
                                  <span className="font-semibold">
                                    {Math.round((completionStats.onTime / completionStats.total) * 100)}%
                                  </span>
                                </div>
                                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-success rounded-full transition-all duration-300"
                                    style={{ width: `${(completionStats.onTime / completionStats.total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {completionStats.total === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No completed tasks to analyze
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-muted-foreground">
                        {recordViewType === "ongoing" ? "No ongoing tasks" : "No completed tasks yet"}
                      </p>
                    </div>
                  )}

                  {/* Statistics Cards (hidden for inspect mode) */}
                  {recordViewType !== "inspect" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="border-primary/30">
                          <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-primary">{currentTypeStats.assignment}</div>
                            <div className="text-sm text-muted-foreground">Assignments</div>
                          </CardContent>
                        </Card>
                        <Card className="border-destructive/30">
                          <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-destructive">{currentTypeStats.exam}</div>
                            <div className="text-sm text-muted-foreground">Exams</div>
                          </CardContent>
                        </Card>
                        <Card className="border-success/30">
                          <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-success">{currentTypeStats.project}</div>
                            <div className="text-sm text-muted-foreground">Projects</div>
                          </CardContent>
                        </Card>
                        <Card className="border-muted-foreground/30">
                          <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-muted-foreground">{currentTypeStats.other}</div>
                            <div className="text-sm text-muted-foreground">Other</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Total */}
                      <Card className="border-info/30 bg-gradient-to-br from-info/10 to-info/5">
                        <CardContent className="p-4 text-center">
                          <div className="text-4xl font-bold text-info">{currentTypeStats.total}</div>
                          <div className="text-sm text-muted-foreground">
                            {recordViewType === "completed" ? "Total Completed" : "Total Ongoing"}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="outline" size="sm" onClick={fetchReminders} className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Refresh</span>
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2 border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm hidden sm:inline">Email Notifications</span>
              <span className="text-xs sm:hidden">Email</span>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} className="scale-90 sm:scale-100" />
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-center sm:text-left text-sm sm:text-base">
        Paste messages to automatically create smart reminders with AI
      </p>

      {/* 5 Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
        <Card className="border-2 border-destructive/30">
          <CardContent className="p-2 sm:p-4 text-center">
            <AlertTriangle className="w-5 h-5 sm:w-8 sm:h-8 text-destructive mx-auto mb-1 sm:mb-2" />
            <div className="text-xl sm:text-3xl font-bold text-destructive">{stats.critical}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Critical</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-warning/30">
          <CardContent className="p-2 sm:p-4 text-center">
            <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-warning mx-auto mb-1 sm:mb-2" />
            <div className="text-xl sm:text-3xl font-bold text-warning">{stats.urgent}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Urgent</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-destructive/30">
          <CardContent className="p-2 sm:p-4 text-center">
            <Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-destructive mx-auto mb-1 sm:mb-2" />
            <div className="text-xl sm:text-3xl font-bold text-destructive">{stats.overdue}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-2 sm:p-4 text-center">
            <Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-warning mx-auto mb-1 sm:mb-2" />
            <div className="text-xl sm:text-3xl font-bold text-warning">{stats.dueToday}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Due Today</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-info/30 col-span-2 sm:col-span-1">
          <CardContent className="p-2 sm:p-4 text-center">
            <CheckCircle2 className="w-5 h-5 sm:w-8 sm:h-8 text-info mx-auto mb-1 sm:mb-2" />
            <div className="text-xl sm:text-3xl font-bold text-info">{stats.total}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Reminders Section */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Active Reminders
        </h3>
        
        {reminders.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reminders yet. Create one below!</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reminders.map((reminder) => (
              <Card key={reminder.id} className="overflow-hidden hover:shadow-soft transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(reminder.type)}>
                        {reminder.type}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(reminder.priority)}>
                        {reminder.priority}
                      </Badge>
                    </div>
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{reminder.title}</h4>
                  {reminder.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{reminder.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {new Date(reminder.dueDate).toLocaleDateString()}
                      {reminder.dueTime && ` at ${formatTime(reminder.dueTime)}`}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => openEditDialog(reminder)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-success hover:text-success hover:bg-success/10"
                        onClick={() => handleCompleteReminder(reminder.id)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => confirmDeleteReminder(reminder.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Message Parser & Create Reminder Section */}
      <div className="grid grid-cols-12 gap-4">
        {/* AI Parse Section */}
        <Card className="col-span-12 lg:col-span-7 overflow-hidden">
          <CardHeader className="gradient-header py-3">
            <CardTitle className="text-primary-foreground flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5" />
              AI Message Parser
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste messages from WhatsApp, emails, or any text
            </p>
            <Textarea
              placeholder="Paste your message here...

Example:
'Hi students, your Data Structures assignment is due on 20th July 2025.'"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="min-h-[200px]"
            />
            <div className="flex gap-2">
              <Button onClick={handleParseMessage} className="gradient-primary flex-1" disabled={parsing}>
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Parse with AI
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setMessageText("")} disabled={parsing}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Reminder Card */}
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div>
              <Input 
                placeholder="Title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">📋 Assignment</SelectItem>
                  <SelectItem value="exam">📝 Exam</SelectItem>
                  <SelectItem value="project">🎯 Project</SelectItem>
                  <SelectItem value="other">📌 Other</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-1">
                <Input 
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="date-input flex-1"
                />
                {timeFormat === '12hr' && (
                  <Select value={dueTimePeriod} onValueChange={(val) => setDueTimePeriod(val as 'AM' | 'PM')}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">🔵 Normal</SelectItem>
                  <SelectItem value="urgent">🟡 Urgent</SelectItem>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea 
              placeholder="Description (optional) - Room number, other details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px]"
            />
            
            {/* Send Email Checkbox */}
            <div className="flex items-center gap-2 p-2 border rounded-lg">
              <input
                type="checkbox"
                id="sendEmail"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="sendEmail" className="text-sm flex items-center gap-2 cursor-pointer">
                <Send className="w-4 h-4 text-primary" />
                Send email notification
              </label>
            </div>

            <Button 
              onClick={handleSaveReminder} 
              className="w-full bg-success hover:bg-success/90"
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Save Reminder"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Email Settings Section - Collapsible */}
      <Collapsible open={emailSettingsOpen} onOpenChange={setEmailSettingsOpen}>
        <Card className="border-2 border-primary/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Email Notification Settings
                </span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${emailSettingsOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 space-y-4 border-t">
              <div>
                <Input
                  type="email"
                  placeholder="Email address for notifications"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Notification Timing</h4>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notify72h"
                      checked={notify72Hours}
                      onCheckedChange={(checked) => setNotify72Hours(checked as boolean)}
                    />
                    <label htmlFor="notify72h" className="text-sm cursor-pointer">
                      3 days before due date
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notify48h"
                      checked={notify48Hours}
                      onCheckedChange={(checked) => setNotify48Hours(checked as boolean)}
                    />
                    <label htmlFor="notify48h" className="text-sm cursor-pointer">
                      2 days before due date
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notify24h"
                      checked={notify24Hours}
                      onCheckedChange={(checked) => setNotify24Hours(checked as boolean)}
                    />
                    <label htmlFor="notify24h" className="text-sm cursor-pointer">
                      24 hours before due date
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notify1h"
                      checked={notify1Hour}
                      onCheckedChange={(checked) => setNotify1Hour(checked as boolean)}
                    />
                    <label htmlFor="notify1h" className="text-sm cursor-pointer">
                      1 hour before due date
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notifyOverdue"
                      checked={notifyOverdue}
                      onCheckedChange={(checked) => setNotifyOverdue(checked as boolean)}
                    />
                    <label htmlFor="notifyOverdue" className="text-sm cursor-pointer">
                      When overdue
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setSavingSettings(true);
                    localStorage.setItem('notifyEmail', notifyEmail);
                    setTimeout(() => {
                      setSavingSettings(false);
                      toast({
                        title: "Settings saved",
                        description: "Your email notification preferences have been saved."
                      });
                    }, 500);
                  }}
                  className="bg-success hover:bg-success/90"
                  disabled={savingSettings}
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
                
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!notifyEmail) {
                      toast({
                        title: "Email required",
                        description: "Please enter an email address first.",
                        variant: "destructive"
                      });
                      return;
                    }
                    setSendingTestEmail(true);
                    try {
                      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-notification`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
                        },
                        body: JSON.stringify({
                          to: notifyEmail,
                          reminder_title: "Test Notification",
                          reminder_type: "System",
                          due_date: new Date().toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          }),
                          priority_level: "Normal",
                          priority_icon: "🟢",
                          description: "This is a test email from Smart Reminders. If you received this, your email notifications are working correctly!",
                          timing_text: "🔔 Test Email - Smart Reminders"
                        })
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to send test email');
                      }

                      toast({
                        title: "Test email sent!",
                        description: `A test email was sent to ${notifyEmail}`
                      });
                    } catch (error: any) {
                      toast({
                        title: "Failed to send test email",
                        description: error.message,
                        variant: "destructive"
                      });
                    } finally {
                      setSendingTestEmail(false);
                    }
                  }}
                  disabled={sendingTestEmail}
                >
                  {sendingTestEmail ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Test Email
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setCheckingNotifications(true);
                    setTimeout(() => {
                      setCheckingNotifications(false);
                      const activeSettings = [];
                      if (notify24Hours) activeSettings.push("24h before");
                      if (notify1Hour) activeSettings.push("1h before");
                      if (notifyOverdue) activeSettings.push("on overdue");
                      
                      toast({
                        title: "Notification Status",
                        description: emailEnabled 
                          ? `Email notifications enabled for: ${notifyEmail || "No email set"}. Timing: ${activeSettings.length > 0 ? activeSettings.join(", ") : "None selected"}`
                          : "Email notifications are currently disabled. Enable them using the toggle above."
                      });
                    }, 500);
                  }}
                  disabled={checkingNotifications}
                >
                  {checkingNotifications ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4 mr-2" />
                  )}
                  Check Email Notifications
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Edit Reminder Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
            <DialogDescription>Make changes to your reminder.</DialogDescription>
          </DialogHeader>
          {editingReminder && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="font-medium mb-2 block text-sm">Title</label>
                <Input 
                  value={editingReminder.title}
                  onChange={(e) => setEditingReminder({ ...editingReminder, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium mb-2 block text-sm">Type</label>
                  <Select 
                    value={editingReminder.type} 
                    onValueChange={(val) => setEditingReminder({ ...editingReminder, type: val as Reminder['type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assignment">📋 Assignment</SelectItem>
                      <SelectItem value="exam">📝 Exam</SelectItem>
                      <SelectItem value="project">🎯 Project</SelectItem>
                      <SelectItem value="other">📌 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="font-medium mb-2 block text-sm">Priority</label>
                  <Select 
                    value={editingReminder.priority} 
                    onValueChange={(val) => setEditingReminder({ ...editingReminder, priority: val as Reminder['priority'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">🔵 Normal</SelectItem>
                      <SelectItem value="urgent">🟡 Urgent</SelectItem>
                      <SelectItem value="critical">🔴 Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium mb-2 block text-sm">Due Date</label>
                  <Input 
                    type="date"
                    value={editingReminder.dueDate}
                    onChange={(e) => setEditingReminder({ ...editingReminder, dueDate: e.target.value })}
                    className="date-input"
                  />
                </div>
                <div>
                  <label className="font-medium mb-2 block text-sm">Time</label>
                  <div className="flex gap-1">
                    <Input 
                      type="time"
                      value={editingReminder.dueTime || ''}
                      onChange={(e) => setEditingReminder({ ...editingReminder, dueTime: e.target.value || null })}
                      className="date-input flex-1"
                    />
                    {timeFormat === '12hr' && (
                      <Select value={editTimePeriod} onValueChange={(val) => setEditTimePeriod(val as 'AM' | 'PM')}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="font-medium mb-2 block text-sm">Description</label>
                <Textarea 
                  value={editingReminder.description}
                  onChange={(e) => setEditingReminder({ ...editingReminder, description: e.target.value })}
                  className="min-h-[60px]"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button onClick={handleEditReminder} className="bg-success hover:bg-success/90">Save Changes</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the reminder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteReminderId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteReminderId && handleDeleteReminder(deleteReminderId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reminders;
