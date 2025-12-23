import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  date: string;
  type: "event" | "holiday";
  color?: string;
}

const holidays: Event[] = [
  { id: "h1", title: "New Year's Day", date: "2025-01-01", type: "holiday" },
  { id: "h2", title: "Republic Day", date: "2025-01-26", type: "holiday" },
  { id: "h3", title: "Holi", date: "2025-03-14", type: "holiday" },
  { id: "h4", title: "Independence Day", date: "2025-08-15", type: "holiday" },
  { id: "h5", title: "Gandhi Jayanti", date: "2025-10-02", type: "holiday" },
  { id: "h6", title: "Diwali", date: "2025-11-01", type: "holiday" },
  { id: "h7", title: "Christmas", date: "2025-12-25", type: "holiday" },
];

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const { toast } = useToast();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return [...events, ...holidays].filter(e => e.date === dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleAddEvent = () => {
    if (!newEventTitle || !newEventDate) {
      toast({
        title: "Missing information",
        description: "Please enter a title and date.",
        variant: "destructive"
      });
      return;
    }

    const newEvent: Event = {
      id: Date.now().toString(),
      title: newEventTitle,
      date: newEventDate,
      type: "event"
    };

    setEvents([...events, newEvent]);
    setNewEventTitle("");
    setNewEventDate("");
    setShowAddEvent(false);

    toast({
      title: "Event added",
      description: `${newEventTitle} has been added to your calendar.`
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Calendar</h1>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="gradient-primary">
          <TabsTrigger value="calendar" className="data-[state=active]:bg-background/20 text-primary-foreground">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="holidays" className="data-[state=active]:bg-background/20 text-primary-foreground">
            <Star className="w-4 h-4 mr-2" />
            Holidays
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-xl font-bold min-w-[200px] text-center">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Today
                  </Button>
                  <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gradient-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Event</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label className="font-medium mb-2 block">Event Title</label>
                          <Input 
                            placeholder="e.g., Team Meeting"
                            value={newEventTitle}
                            onChange={(e) => setNewEventTitle(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="font-medium mb-2 block">Date</label>
                          <Input 
                            type="date"
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleAddEvent} className="w-full gradient-primary">
                          Add Event
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 mb-2">
                {daysOfWeek.map((day) => (
                  <div 
                    key={day} 
                    className="text-center py-3 font-semibold text-primary-foreground bg-gradient-to-r from-primary/90 to-info/90 first:rounded-tl-lg last:rounded-tr-lg"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 border-l border-t border-border">
                {days.map((day, index) => {
                  const dayEvents = getEventsForDate(day.date);
                  const hasEvents = dayEvents.length > 0;
                  
                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[100px] p-2 border-r border-b border-border relative
                        ${!day.isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''}
                        ${isToday(day.date) ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''}
                        hover:bg-muted/50 transition-colors
                      `}
                    >
                      <span className={`
                        inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                        ${isToday(day.date) ? 'bg-primary text-primary-foreground' : ''}
                      `}>
                        {day.day}
                      </span>
                      
                      {hasEvents && (
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className={`
                                text-xs px-2 py-1 rounded truncate
                                ${event.type === 'holiday' 
                                  ? 'bg-warning/20 text-warning' 
                                  : 'bg-primary/20 text-primary'}
                              `}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground px-2">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-warning" />
                Academic Holidays 2025
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="p-4 rounded-xl border border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{holiday.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(holiday.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <Star className="w-5 h-5 text-warning" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalendarPage;
