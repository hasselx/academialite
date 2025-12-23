import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, Plus, Trash2, BarChart3, TrendingUp, Target, Award, Loader2, ChevronDown, ChevronUp, Edit2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Grade scale mapping
const gradePoints: Record<string, number> = {
  "O": 10,
  "A+": 9.5,
  "A": 9,
  "B+": 8,
  "B": 7,
  "C": 6,
  "P": 5,
  "F": 0,
  "W": 0,
  "I": 0,
  "FA": 0
};

const gradeOptions = Object.keys(gradePoints);

interface Course {
  id: string;
  name: string;
  credits: number;
  grade: string;
  gradePoint: number;
}

interface Semester {
  id: string;
  name: string;
  sgpa: number;
  credits: number;
  courses: Course[];
}

const CGPACalculator = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [expandedSemester, setExpandedSemester] = useState<string | null>(null);
  const [editingSemester, setEditingSemester] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [newCourse, setNewCourse] = useState({ name: "", credits: "", grade: "O" });
  const [tempCourses, setTempCourses] = useState<Omit<Course, 'id'>[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSemesters();
    }
  }, [user]);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const { data: semesterData, error: semError } = await supabase
        .from('semesters')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (semError) throw semError;

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user?.id);

      if (courseError) throw courseError;

      const semestersWithCourses = semesterData?.map(s => ({
        id: s.id,
        name: s.name,
        sgpa: Number(s.sgpa),
        credits: s.credits,
        courses: courseData?.filter(c => c.semester_id === s.id).map(c => ({
          id: c.id,
          name: c.name,
          credits: c.credits,
          grade: c.grade,
          gradePoint: Number(c.grade_point)
        })) || []
      })) || [];

      setSemesters(semestersWithCourses);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSGPA = (courses: Omit<Course, 'id'>[]) => {
    if (courses.length === 0) return 0;
    const totalGradePoints = courses.reduce((sum, c) => sum + (c.gradePoint * c.credits), 0);
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    return totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  };

  const calculateCGPA = () => {
    if (semesters.length === 0) return 0;
    const allCourses = semesters.flatMap(s => s.courses);
    const totalGradePoints = allCourses.reduce((sum, c) => sum + (c.gradePoint * c.credits), 0);
    const totalCredits = allCourses.reduce((sum, c) => sum + c.credits, 0);
    return totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  };

  const cgpa = calculateCGPA();
  const totalCredits = semesters.reduce((sum, sem) => sum + sem.credits, 0);
  const percentage = cgpa * 10;

  const getPerformance = (sgpa: number) => {
    if (sgpa >= 9.0) return { text: "EXCELLENT", class: "bg-success text-success-foreground" };
    if (sgpa >= 7.0) return { text: "GOOD", class: "bg-info text-info-foreground" };
    if (sgpa >= 6.0) return { text: "AVERAGE", class: "bg-warning text-warning-foreground" };
    return { text: "NEEDS IMPROVEMENT", class: "bg-destructive text-destructive-foreground" };
  };

  const handleAddCourseToTemp = () => {
    if (!newCourse.name.trim() || !newCourse.credits || !newCourse.grade) {
      toast({
        title: "Invalid input",
        description: "Please enter course name, credits, and grade.",
        variant: "destructive"
      });
      return;
    }

    const credits = parseInt(newCourse.credits);
    if (isNaN(credits) || credits <= 0) {
      toast({
        title: "Invalid credits",
        description: "Credits must be a positive number.",
        variant: "destructive"
      });
      return;
    }

    setTempCourses([...tempCourses, {
      name: newCourse.name.trim(),
      credits,
      grade: newCourse.grade,
      gradePoint: gradePoints[newCourse.grade]
    }]);
    setNewCourse({ name: "", credits: "", grade: "O" });
  };

  const handleRemoveTempCourse = (index: number) => {
    setTempCourses(tempCourses.filter((_, i) => i !== index));
  };

  const handleSaveSemester = async () => {
    if (!newSemesterName.trim() || tempCourses.length === 0) {
      toast({
        title: "Invalid semester",
        description: "Please enter a semester name and add at least one course.",
        variant: "destructive"
      });
      return;
    }

    const sgpa = calculateSGPA(tempCourses);
    const totalCredits = tempCourses.reduce((sum, c) => sum + c.credits, 0);

    try {
      const { data: semesterData, error: semError } = await supabase
        .from('semesters')
        .insert({
          user_id: user?.id,
          name: newSemesterName.trim(),
          sgpa,
          credits: totalCredits
        })
        .select()
        .single();

      if (semError) throw semError;

      const coursesToInsert = tempCourses.map(c => ({
        user_id: user?.id,
        semester_id: semesterData.id,
        name: c.name,
        credits: c.credits,
        grade: c.grade,
        grade_point: c.gradePoint
      }));

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert(coursesToInsert)
        .select();

      if (courseError) throw courseError;

      setSemesters([...semesters, {
        id: semesterData.id,
        name: semesterData.name,
        sgpa: Number(semesterData.sgpa),
        credits: semesterData.credits,
        courses: courseData.map(c => ({
          id: c.id,
          name: c.name,
          credits: c.credits,
          grade: c.grade,
          gradePoint: Number(c.grade_point)
        }))
      }]);

      setNewSemesterName("");
      setTempCourses([]);
      toast({
        title: "Semester saved",
        description: `${newSemesterName} has been saved successfully.`
      });
    } catch (error: any) {
      toast({
        title: "Error saving semester",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteSemester = async (id: string) => {
    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSemesters(semesters.filter(s => s.id !== id));
      toast({
        title: "Semester removed",
        description: "The semester and its courses have been deleted."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting semester",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleResetAll = async () => {
    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      setSemesters([]);
      toast({
        title: "All semesters cleared",
        description: "Your CGPA data has been reset."
      });
    } catch (error: any) {
      toast({
        title: "Error resetting data",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const chartData = semesters.map((sem, index) => ({
    name: `Sem ${index + 1}`,
    SGPA: sem.sgpa,
    Credits: sem.credits
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Grade Scale Reference */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/30 py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4" />
            Grade Point Scale
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(gradePoints).map(([grade, points]) => (
              <Badge key={grade} variant="outline" className="text-xs">
                {grade} = {points}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            <strong>Formula:</strong> SGPA = Σ(Credits × Grade Points) / Σ(Credits) | <strong>Percentage:</strong> CGPA × 10
          </p>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card className="overflow-hidden">
          <CardHeader className="gradient-header">
            <CardTitle className="text-primary-foreground flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Add Semester
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Semester Name */}
            <div className="space-y-2">
              <label className="font-medium">Semester Name</label>
              <Input
                placeholder="e.g., Semester 1"
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
              />
            </div>

            {/* Add Course Form */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Add Course</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Course Name</label>
                  <Input
                    placeholder="e.g., Maths"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Credits</label>
                  <Input
                    type="number"
                    placeholder="e.g., 4"
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Grade</label>
                  <Select value={newCourse.grade} onValueChange={(v) => setNewCourse({ ...newCourse, grade: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g} ({gradePoints[g]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddCourseToTemp}>
                <Plus className="w-4 h-4 mr-1" />
                Add Course
              </Button>
            </div>

            {/* Temp Courses List */}
            {tempCourses.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Courses to Add ({tempCourses.length})</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>C×G</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tempCourses.map((c, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.credits}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.grade}</Badge>
                          </TableCell>
                          <TableCell>{c.gradePoint}</TableCell>
                          <TableCell className="font-semibold">{(c.credits * c.gradePoint).toFixed(1)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveTempCourse(idx)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Credits:</span>{" "}
                    <span className="font-semibold">{tempCourses.reduce((s, c) => s + c.credits, 0)}</span>
                    {" | "}
                    <span className="text-muted-foreground">SGPA:</span>{" "}
                    <span className="font-semibold text-primary">{calculateSGPA(tempCourses).toFixed(2)}</span>
                  </div>
                  <Button onClick={handleSaveSemester}>
                    Save Semester
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-chart-4/20 to-primary/20">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {semesters.length === 0 ? (
              <div className="text-center py-12">
                <Calculator className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Add your semester details to see your CGPA results
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="stat-card text-center">
                    <div className="text-3xl font-bold text-primary">{cgpa.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Overall CGPA</div>
                  </div>
                  <div className="stat-card text-center">
                    <div className="text-3xl font-bold text-success">{totalCredits}</div>
                    <div className="text-sm text-muted-foreground">Total Credits</div>
                  </div>
                  <div className="stat-card text-center">
                    <div className="text-3xl font-bold text-chart-4">{percentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Percentage</div>
                  </div>
                </div>

                {/* View Analysis Button */}
                <Button
                  className="w-full gradient-primary"
                  onClick={() => setShowAnalysis(true)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Detailed Analysis
                </Button>

                {semesters.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleResetAll}
                  >
                    Reset All Data
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saved Semesters */}
      {semesters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Saved Semesters ({semesters.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {semesters.map((sem) => {
              const performance = getPerformance(sem.sgpa);
              return (
                <Collapsible
                  key={sem.id}
                  open={expandedSemester === sem.id}
                  onOpenChange={(open) => setExpandedSemester(open ? sem.id : null)}
                >
                  <div className="border rounded-lg overflow-hidden group hover:border-primary/50 transition-colors">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">{sem.name}</span>
                          <Badge className={performance.class}>{performance.text}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{sem.sgpa.toFixed(2)}</span> SGPA |{" "}
                            <span className="font-semibold text-foreground">{sem.credits}</span> Credits |{" "}
                            <span className="font-semibold text-foreground">{sem.courses.length}</span> Courses
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSemester(sem.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {expandedSemester === sem.id ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-4 bg-muted/30">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Course</TableHead>
                              <TableHead>Credits</TableHead>
                              <TableHead>Grade</TableHead>
                              <TableHead>Grade Point</TableHead>
                              <TableHead>Credit × GP</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sem.courses.map((course) => (
                              <TableRow key={course.id}>
                                <TableCell className="font-medium">{course.name}</TableCell>
                                <TableCell>{course.credits}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{course.grade}</Badge>
                                </TableCell>
                                <TableCell>{course.gradePoint}</TableCell>
                                <TableCell className="font-semibold">
                                  {(course.credits * course.gradePoint).toFixed(1)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-primary/5">
                              <TableCell className="font-bold">Total</TableCell>
                              <TableCell className="font-bold">
                                {sem.courses.reduce((s, c) => s + c.credits, 0)}
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell className="font-bold">
                                {sem.courses.reduce((s, c) => s + c.credits * c.gradePoint, 0).toFixed(1)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className="mt-3 text-right text-sm">
                          <span className="text-muted-foreground">SGPA:</span>{" "}
                          <span className="font-bold text-primary text-lg">{sem.sgpa.toFixed(2)}</span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Analysis Dialog */}
      <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-6 h-6 text-primary" />
              CGPA Analysis & Trends
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <Target className="w-10 h-10 text-primary" />
                  <div>
                    <div className="text-3xl font-bold text-primary">{cgpa.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Overall CGPA</div>
                  </div>
                </div>
              </div>
              <div className="stat-card bg-success/5">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-10 h-10 text-success" />
                  <div>
                    <div className="text-3xl font-bold text-success">{totalCredits}</div>
                    <div className="text-sm text-muted-foreground">Total Credits</div>
                    <div className="text-xs text-success">{semesters.length} Semesters</div>
                  </div>
                </div>
              </div>
              <div className="stat-card bg-chart-4/5">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-10 h-10 text-chart-4" />
                  <div>
                    <div className="text-3xl font-bold text-chart-4">{percentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Notional Percentage</div>
                    <div className="text-xs text-chart-4">CGPA × 10</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  SGPA vs Credits by Semester
                </h4>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis yAxisId="left" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="SGPA" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="Credits" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  SGPA Trend Over Semesters
                </h4>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis domain={[0, 10]} fontSize={12} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="SGPA"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* All Courses Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Complete Course Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semester</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Grade Point</TableHead>
                      <TableHead>Weighted Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {semesters.flatMap((sem) =>
                      sem.courses.map((course, idx) => (
                        <TableRow key={course.id}>
                          {idx === 0 && (
                            <TableCell rowSpan={sem.courses.length} className="font-medium border-r">
                              {sem.name}
                            </TableCell>
                          )}
                          <TableCell>{course.name}</TableCell>
                          <TableCell>{course.credits}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{course.grade}</Badge>
                          </TableCell>
                          <TableCell>{course.gradePoint}</TableCell>
                          <TableCell className="font-semibold">
                            {(course.credits * course.gradePoint).toFixed(1)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow className="bg-primary/10 font-bold">
                      <TableCell colSpan={2}>Grand Total</TableCell>
                      <TableCell>{totalCredits}</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        {semesters.flatMap(s => s.courses).reduce((sum, c) => sum + c.credits * c.gradePoint, 0).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CGPACalculator;
