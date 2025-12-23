import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Plus, Trash2, ChevronLeft, ChevronRight, MapPin, Calendar, GraduationCap } from "lucide-react";
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

interface ExamItem {
  id: string;
  subject: string;
  code: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  type: "Midterm" | "Final" | "Quiz" | "Practical";
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

const examColors = [
  "bg-[#E74C3C]", // Red
  "bg-[#9B59B6]", // Purple
  "bg-[#3498DB]", // Blue
  "bg-[#1ABC9C]", // Turquoise
];

const Timetable = () => {
  const [activeTab, setActiveTab] = useState("timetable");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddExamDialog, setShowAddExamDialog] = useState(false);
  const [newClass, setNewClass] = useState({
    subject: "",
    code: "",
    startTime: "09:00",
    endTime: "10:00",
    room: "",
    day: "Monday",
    type: "Lecture" as "Lecture" | "Lab" | "Tutorial",
  });
  const [newExam, setNewExam] = useState({
    subject: "",
    code: "",
    date: "",
    startTime: "09:00",
    endTime: "11:00",
    room: "",
    type: "Midterm" as "Midterm" | "Final" | "Quiz" | "Practical",
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

  const handleAddExam = () => {
    if (!newExam.subject || !newExam.date || !newExam.startTime || !newExam.endTime) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newExamItem: ExamItem = {
      id: Date.now().toString(),
      ...newExam,
    };

    setExams([...exams, newExamItem]);
    setNewExam({ 
      subject: "", 
      code: "",
      date: "",
      startTime: "09:00", 
      endTime: "11:00", 
      room: "",
      type: "Midterm"
    });
    setShowAddExamDialog(false);

    toast({
      title: "Exam added",
      description: `${newExam.subject} exam has been added.`
    });
  };

  const handleDeleteExam = (id: string) => {
    setExams(exams.filter(e => e.id !== id));
    toast({
      title: "Exam removed",
      description: "The exam has been deleted."
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

  const getColorForExam = (index: number) => {
    return examColors[index % examColors.length];
  };

  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
            <p className="text-sm text-muted-foreground">Manage your class schedule & exams</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="timetable" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timetable
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Exams
          </TabsTrigger>
        </TabsList>

        {/* Timetable Tab */}
        <TabsContent value="timetable" className="space-y-6">
          {/* Add Class Button */}
          <div className="flex justify-end">
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
                      <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 text-white">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-lg font-bold">{classItem.startTime}</span>
                          <span className="text-sm opacity-80">to</span>
                        </div>
                        <div className="text-sm opacity-80 mb-3">{classItem.endTime}</div>
                        <h3 className="text-xl font-bold uppercase mb-1">{classItem.subject}</h3>
                        {classItem.code && (
                          <p className="text-sm opacity-90 mb-2">{classItem.code}</p>
                        )}
                        {classItem.room && (
                          <div className="flex items-center gap-1 text-sm opacity-90 mb-2">
                            <MapPin className="w-4 h-4" />
                            {classItem.room}
                          </div>
                        )}
                        <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                          {classItem.type}
                        </span>
                      </div>
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
        </TabsContent>

        {/* Exams Tab */}
        <TabsContent value="exams" className="space-y-6">
          {/* Add Exam Button */}
          <div className="flex justify-end">
            <Dialog open={showAddExamDialog} onOpenChange={setShowAddExamDialog}>
              <DialogTrigger asChild>
                <Button className="gradient-primary rounded-full w-12 h-12 p-0">
                  <Plus className="w-6 h-6" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Exam</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="font-medium mb-2 block">Subject Name *</label>
                    <Input 
                      placeholder="e.g., Data Structures"
                      value={newExam.subject}
                      onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-medium mb-2 block">Course Code</label>
                    <Input 
                      placeholder="e.g., CS201"
                      value={newExam.code}
                      onChange={(e) => setNewExam({ ...newExam, code: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium mb-2 block">Exam Date *</label>
                      <Input 
                        type="date"
                        value={newExam.date}
                        onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-medium mb-2 block">Type</label>
                      <Select 
                        value={newExam.type} 
                        onValueChange={(value: "Midterm" | "Final" | "Quiz" | "Practical") => setNewExam({ ...newExam, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Midterm">Midterm</SelectItem>
                          <SelectItem value="Final">Final</SelectItem>
                          <SelectItem value="Quiz">Quiz</SelectItem>
                          <SelectItem value="Practical">Practical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium mb-2 block">Start Time *</label>
                      <Select 
                        value={newExam.startTime} 
                        onValueChange={(value) => setNewExam({ ...newExam, startTime: value })}
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
                        value={newExam.endTime} 
                        onValueChange={(value) => setNewExam({ ...newExam, endTime: value })}
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
                      placeholder="e.g., Exam Hall A"
                      value={newExam.room}
                      onChange={(e) => setNewExam({ ...newExam, room: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddExam} className="w-full gradient-primary">
                    Add Exam
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Exams List */}
          <div className="space-y-4">
            {sortedExams.length === 0 ? (
              <Card className="p-12 text-center">
                <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No exams scheduled</h3>
                <p className="text-muted-foreground mb-4">
                  Add your upcoming exams to stay prepared.
                </p>
                <Button onClick={() => setShowAddExamDialog(true)} className="gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Exam
                </Button>
              </Card>
            ) : (
              sortedExams.map((exam, index) => {
                const examDate = new Date(exam.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffTime = examDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <Card 
                    key={exam.id} 
                    className={`${getColorForExam(index)} border-none overflow-hidden group relative`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/30 flex flex-col items-center justify-center text-white flex-shrink-0">
                          <span className="text-xs font-medium uppercase">{format(examDate, "MMM")}</span>
                          <span className="text-xl font-bold">{format(examDate, "d")}</span>
                        </div>
                        <div className="flex-1 text-white">
                          <h3 className="text-xl font-bold uppercase mb-1">{exam.subject}</h3>
                          {exam.code && (
                            <p className="text-sm opacity-90 mb-2">{exam.code}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm opacity-90 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {exam.startTime} - {exam.endTime}
                            </div>
                            {exam.room && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {exam.room}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                              {exam.type}
                            </span>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              diffDays < 0 ? 'bg-red-500/50' : diffDays <= 7 ? 'bg-yellow-500/50' : 'bg-white/20'
                            }`}>
                              {diffDays < 0 ? 'Passed' : diffDays === 0 ? 'Today!' : diffDays === 1 ? 'Tomorrow' : `${diffDays} days left`}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 bg-white/20 hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteExam(exam.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Timetable;
