import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Plus, Trash2, ChevronLeft, ChevronRight, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, subDays, startOfWeek } from "date-fns";

interface ClassItem {
  id: string;
  subject: string;
  code: string;
  startTime: string;
  endTime: string;
  room: string;
  day: string;
  type: "Lecture" | "Lab" | "Tutorial";
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const timeOptions = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
];

const classColors = [
  "bg-[#FF6B6B]", // Coral red
  "bg-[#4ECDC4]", // Teal
  "bg-[#45B7D1]", // Sky blue
  "bg-[#96CEB4]", // Sage green
  "bg-[#FFEAA7]", // Pale yellow
  "bg-[#DDA0DD]", // Plum
  "bg-[#98D8C8]", // Mint
  "bg-[#F7DC6F]", // Soft yellow
];

const Timetable = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClass, setNewClass] = useState({
    subject: "",
    code: "",
    startTime: "09:00",
    endTime: "10:00",
    room: "",
    day: "Monday",
    type: "Lecture" as "Lecture" | "Lab" | "Tutorial",
  });
  const { toast } = useToast();

  const getDayName = (date: Date) => {
    return format(date, "EEEE");
  };

  const currentDayName = getDayName(selectedDate);

  const handlePrevDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleAddClass = () => {
    if (!newClass.subject || !newClass.startTime || !newClass.endTime) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newClassItem: ClassItem = {
      id: Date.now().toString(),
      ...newClass,
    };

    setClasses([...classes, newClassItem]);
    setNewClass({ 
      subject: "", 
      code: "",
      startTime: "09:00", 
      endTime: "10:00", 
      room: "", 
      day: "Monday",
      type: "Lecture"
    });
    setShowAddDialog(false);

    toast({
      title: "Class added",
      description: `${newClass.subject} has been added to your timetable.`
    });
  };

  const handleDeleteClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
    toast({
      title: "Class removed",
      description: "The class has been deleted from your timetable."
    });
  };

  const getClassesForDay = (day: string) => {
    return classes
      .filter(c => c.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getColorForClass = (index: number) => {
    return classColors[index % classColors.length];
  };

  const todayClasses = getClassesForDay(currentDayName);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Calendar className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Timetable</h1>
            <p className="text-sm text-muted-foreground">Manage your class schedule</p>
          </div>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-primary rounded-full w-12 h-12 p-0">
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="font-medium mb-2 block">Subject Name *</label>
                <Input 
                  placeholder="e.g., CYBER LAB"
                  value={newClass.subject}
                  onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                />
              </div>
              <div>
                <label className="font-medium mb-2 block">Course Code</label>
                <Input 
                  placeholder="e.g., 19EAC401"
                  value={newClass.code}
                  onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium mb-2 block">Day</label>
                  <Select 
                    value={newClass.day} 
                    onValueChange={(value) => setNewClass({ ...newClass, day: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="font-medium mb-2 block">Type</label>
                  <Select 
                    value={newClass.type} 
                    onValueChange={(value: "Lecture" | "Lab" | "Tutorial") => setNewClass({ ...newClass, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lecture">Lecture</SelectItem>
                      <SelectItem value="Lab">Lab</SelectItem>
                      <SelectItem value="Tutorial">Tutorial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium mb-2 block">Start Time *</label>
                  <Select 
                    value={newClass.startTime} 
                    onValueChange={(value) => setNewClass({ ...newClass, startTime: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Start" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="font-medium mb-2 block">End Time *</label>
                  <Select 
                    value={newClass.endTime} 
                    onValueChange={(value) => setNewClass({ ...newClass, endTime: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="End" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="font-medium mb-2 block">Room</label>
                <Input 
                  placeholder="e.g., N 307"
                  value={newClass.room}
                  onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                />
              </div>
              <Button onClick={handleAddClass} className="w-full gradient-primary">
                Add Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Day Navigation */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <h2 className="text-2xl font-bold">{currentDayName}</h2>
              <p className="text-primary font-medium">{format(selectedDate, "d MMMM")}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextDay}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Classes */}
      <div className="space-y-4">
        {todayClasses.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No classes scheduled</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any classes on {currentDayName}.
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Class
            </Button>
          </Card>
        ) : (
          todayClasses.map((classItem, index) => (
            <Card 
              key={classItem.id} 
              className={`${getColorForClass(index)} border-none overflow-hidden group relative`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Class Number */}
                  <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  {/* Class Details */}
                  <div className="flex-1 text-white">
                    {/* Time */}
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-lg font-bold">{classItem.startTime}</span>
                      <span className="text-sm opacity-80">to</span>
                    </div>
                    <div className="text-sm opacity-80 mb-3">{classItem.endTime}</div>
                    
                    {/* Subject */}
                    <h3 className="text-xl font-bold uppercase mb-1">{classItem.subject}</h3>
                    {classItem.code && (
                      <p className="text-sm opacity-90 mb-2">{classItem.code}</p>
                    )}
                    
                    {/* Room */}
                    {classItem.room && (
                      <div className="flex items-center gap-1 text-sm opacity-90 mb-2">
                        <MapPin className="w-4 h-4" />
                        {classItem.room}
                      </div>
                    )}
                    
                    {/* Type Badge */}
                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      {classItem.type}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 bg-white/20 hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteClass(classItem.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Week Overview */}
      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Week Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {daysOfWeek.map((day) => {
                const dayClasses = getClassesForDay(day);
                return (
                  <div 
                    key={day}
                    className={`p-3 rounded-lg border text-center cursor-pointer transition-all hover:border-primary ${
                      day === currentDayName ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
                      const dayIndex = daysOfWeek.indexOf(day);
                      setSelectedDate(addDays(weekStart, dayIndex));
                    }}
                  >
                    <div className="font-medium text-sm">{day.slice(0, 3)}</div>
                    <div className="text-2xl font-bold text-primary mt-1">{dayClasses.length}</div>
                    <div className="text-xs text-muted-foreground">classes</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Timetable;
