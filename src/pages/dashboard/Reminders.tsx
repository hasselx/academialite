import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, RefreshCw, Trash2, Edit2, Plus, Mail, AlertTriangle, Clock, CheckCircle2, Loader2, Sparkles } from "lucide-react";
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
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: user?.id,
          title,
          type,
          due_date: dueDate || new Date().toISOString().split('T')[0],
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

      setTitle("");
      setType("assignment");
      setDueDate("");
      setDescription("");
      setPriority("normal");
      
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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <Bell className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Smart Student Reminder System</h1>
        </div>
        <p className="text-muted-foreground">
          Paste messages from WhatsApp, emails, or any text to automatically create smart reminders!
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Your Reminders
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-success/10">Online</Badge>
          <Button size="sm" variant="outline" onClick={fetchReminders}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Critical", value: stats.critical, color: "border-destructive/50 text-destructive" },
          { label: "Urgent", value: stats.urgent, color: "border-warning/50 text-warning" },
          { label: "Overdue", value: stats.overdue, color: "border-destructive/50 text-destructive" },
          { label: "Due Today", value: stats.dueToday, color: "border-warning/50 text-warning" },
          { label: "Total", value: stats.total, color: "border-info/50 text-info" },
        ].map((stat, index) => (
          <Card key={index} className={`border-2 ${stat.color}`}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Parse Message Section */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="gradient-header">
              <CardTitle className="text-primary-foreground flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Paste Your Message
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy and paste messages from WhatsApp, emails, or any text containing assignment/exam information
              </p>
              <Textarea
                placeholder="Paste your message here...

Example:
'Hi students, your Data Structures assignment is due on 20th July 2025. Please submit before 11:59 PM.'"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="min-h-[150px]"
              />
              <div className="flex gap-2">
                <Button onClick={handleParseMessage} className="gradient-primary" disabled={parsing}>
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Parsing with AI...
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

          {/* Create Reminder Form */}
          <Card className="overflow-hidden">
            <CardHeader className="gradient-header">
              <CardTitle className="text-primary-foreground flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Reminder
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Review parsed information or create a reminder manually
              </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium mb-2 block">Title *</label>
                  <Input 
                    placeholder="e.g., Data Structures Assignment"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
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
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Due Date</label>
                  <Input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
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
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Input 
                    placeholder="Additional details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveReminder} className="bg-success hover:bg-success/90">
                  Save Reminder
                </Button>
                <Button variant="outline" onClick={() => {
                  setTitle("");
                  setType("assignment");
                  setDueDate("");
                  setDescription("");
                  setPriority("normal");
                }}>
                  Reset Form
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Notifications
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for upcoming deadlines
                  </p>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Active Reminders</h3>
          {reminders.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reminders yet. Create one above!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <Card key={reminder.id} className="overflow-hidden hover:shadow-soft transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getTypeColor(reminder.type)}>
                            {reminder.type}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(reminder.priority)}>
                            {reminder.priority}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-foreground">{reminder.title}</h4>
                        {reminder.description && (
                          <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Due: {new Date(reminder.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-success"
                          onClick={() => handleCompleteReminder(reminder.id)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-destructive"
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
      </div>
    </div>
  );
};

export default Reminders;
