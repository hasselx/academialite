import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, RefreshCw, Trash2, Plus, Mail, AlertTriangle, Clock, CheckCircle2, Loader2, Sparkles, Calendar, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Reminder {
  id: string;
  title: string;
  type: "assignment" | "exam" | "project" | "other";
  dueDate: string;
  description: string;
  priority: "critical" | "urgent" | "normal";
  completed: boolean;
}

const Reminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [messageText, setMessageText] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("assignment");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("normal");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

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

  const sendEmailNotification = async (reminderTitle: string, reminderDueDate: string) => {
    if (!user?.email) return;
    
    setSendingEmail(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          to: user.email,
          subject: `Reminder: ${reminderTitle}`,
          body: `
            <h2>🔔 New Reminder Created</h2>
            <p><strong>Title:</strong> ${reminderTitle}</p>
            <p><strong>Due Date:</strong> ${reminderDueDate}</p>
            <p>Don't forget to complete this task on time!</p>
            <br/>
            <p>Best regards,<br/>Student Tools App</p>
          `
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
      
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: user?.id,
          title,
          type,
          due_date: reminderDueDate,
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
        description: data.description || '',
        priority: data.priority as Reminder['priority'],
        completed: data.completed
      }, ...reminders]);

      // Send email if checkbox is checked
      if (sendEmail) {
        await sendEmailNotification(title, reminderDueDate);
      }

      setTitle("");
      setType("assignment");
      setDueDate("");
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

  const handleCompleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed: true })
        .eq('id', id);

      if (error) throw error;

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
    <div className="space-y-6 animate-fade-in">
      {/* Header with Refresh & Email Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-primary">
          <Bell className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Smart Reminders</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={fetchReminders} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-sm">Email Notifications</span>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-center md:text-left">
        Paste messages to automatically create smart reminders with AI
      </p>

      {/* 5 Summary Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-2 border-destructive/30">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <div className="text-3xl font-bold text-destructive">{stats.critical}</div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-warning/30">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-warning mx-auto mb-2" />
            <div className="text-3xl font-bold text-warning">{stats.urgent}</div>
            <div className="text-sm text-muted-foreground">Urgent</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-destructive/30">
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 text-destructive mx-auto mb-2" />
            <div className="text-3xl font-bold text-destructive">{stats.overdue}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 text-warning mx-auto mb-2" />
            <div className="text-3xl font-bold text-warning">{stats.dueToday}</div>
            <div className="text-sm text-muted-foreground">Due Today</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-info/30 col-span-2 md:col-span-1">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-info mx-auto mb-2" />
            <div className="text-3xl font-bold text-info">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
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
                    </div>
                    <div className="flex gap-1">
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
                        onClick={() => handleDeleteReminder(reminder.id)}
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
              className="min-h-[120px]"
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
              />
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
            <Input 
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
    </div>
  );
};

export default Reminders;
