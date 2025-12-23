import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Plus, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClassItem {
  id: string;
  subject: string;
  time: string;
  room: string;
  day: string;
  color: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const timeSlots = [
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
  "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00",
  "16:00 - 17:00", "17:00 - 18:00"
];

const colors = [
  "bg-primary/20 border-primary text-primary",
  "bg-success/20 border-success text-success",
  "bg-warning/20 border-warning text-warning",
  "bg-info/20 border-info text-info",
  "bg-chart-4/20 border-chart-4 text-chart-4",
  "bg-destructive/20 border-destructive text-destructive",
];

const mockClasses: ClassItem[] = [
  { id: "1", subject: "Data Structures", time: "09:00 - 10:00", room: "Room 101", day: "Monday", color: colors[0] },
  { id: "2", subject: "Machine Learning", time: "10:00 - 11:00", room: "Room 202", day: "Monday", color: colors[1] },
  { id: "3", subject: "Computer Networks", time: "11:00 - 12:00", room: "Room 103", day: "Tuesday", color: colors[2] },
  { id: "4", subject: "Database Systems", time: "09:00 - 10:00", room: "Lab 1", day: "Wednesday", color: colors[3] },
  { id: "5", subject: "Web Development", time: "14:00 - 15:00", room: "Lab 2", day: "Thursday", color: colors[4] },
  { id: "6", subject: "Software Engineering", time: "10:00 - 11:00", room: "Room 301", day: "Friday", color: colors[5] },
];

const Timetable = () => {
  const [classes, setClasses] = useState<ClassItem[]>(mockClasses);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClass, setNewClass] = useState({
    subject: "",
    time: "",
    room: "",
    day: "",
  });
  const { toast } = useToast();

  const handleAddClass = () => {
    if (!newClass.subject || !newClass.time || !newClass.day) {
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
      color: colors[classes.length % colors.length]
    };

    setClasses([...classes, newClassItem]);
    setNewClass({ subject: "", time: "", room: "", day: "" });
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

  const getClassForSlot = (day: string, time: string) => {
    return classes.find(c => c.day === day && c.time === time);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Timetable</h1>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="font-medium mb-2 block">Subject Name</label>
                <Input 
                  placeholder="e.g., Data Structures"
                  value={newClass.subject}
                  onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                />
              </div>
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
                <label className="font-medium mb-2 block">Time Slot</label>
                <Select 
                  value={newClass.time} 
                  onValueChange={(value) => setNewClass({ ...newClass, time: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-medium mb-2 block">Room (optional)</label>
                <Input 
                  placeholder="e.g., Room 101"
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

      {/* Timetable Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="gradient-header">
                <th className="py-3 px-4 text-left text-primary-foreground font-semibold w-24">Time</th>
                {daysOfWeek.map((day) => (
                  <th key={day} className="py-3 px-4 text-center text-primary-foreground font-semibold">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, index) => (
                <tr key={slot} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                  <td className="py-3 px-4 text-sm font-medium text-muted-foreground border-r border-border">
                    {slot}
                  </td>
                  {daysOfWeek.map((day) => {
                    const classItem = getClassForSlot(day, slot);
                    return (
                      <td key={`${day}-${slot}`} className="py-2 px-2 border-r border-border last:border-r-0">
                        {classItem ? (
                          <div className={`p-3 rounded-lg border ${classItem.color} relative group`}>
                            <div className="font-semibold text-sm">{classItem.subject}</div>
                            {classItem.room && (
                              <div className="text-xs mt-1 opacity-80">{classItem.room}</div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteClass(classItem.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="h-16" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Class List */}
      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classItem) => (
              <div 
                key={classItem.id}
                className={`p-4 rounded-xl border ${classItem.color} hover:shadow-soft transition-shadow`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{classItem.subject}</h3>
                    <p className="text-sm opacity-80 mt-1">
                      {classItem.day} • {classItem.time}
                    </p>
                    {classItem.room && (
                      <p className="text-sm opacity-80">{classItem.room}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteClass(classItem.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Timetable;
