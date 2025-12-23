import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Plus, Trash2, BarChart3, TrendingUp, Target, Award, Loader2, Sparkles, Zap, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

interface QuickSemester {
  id: string;
  name: string;
  sgpa: number;
  credits: number;
}

const CGPACalculator = () => {
  const [mode, setMode] = useState<"quick" | "detailed">("quick");
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [quickSemesters, setQuickSemesters] = useState<QuickSemester[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Quick mode inputs
  const [quickCredits, setQuickCredits] = useState("");
  const [quickSgpa, setQuickSgpa] = useState("");
  
  // Detailed mode inputs
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

      // Separate quick semesters (no courses) from detailed semesters (with courses)
      const detailed = semestersWithCourses.filter(s => s.courses.length > 0);
      const quick = semestersWithCourses.filter(s => s.courses.length === 0).map(s => ({
        id: s.id,
        name: s.name,
        sgpa: s.sgpa,
        credits: s.credits
      }));

      setSemesters(detailed);
      setQuickSemesters(quick);
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
    // Combine both quick and detailed semesters
    const allSemesters = [
      ...quickSemesters.map(s => ({ sgpa: s.sgpa, credits: s.credits })),
      ...semesters.map(s => ({ sgpa: s.sgpa, credits: s.credits }))
    ];
    
    if (allSemesters.length === 0) return 0;
    
    const totalWeightedPoints = allSemesters.reduce((sum, s) => sum + (s.sgpa * s.credits), 0);
    const totalCredits = allSemesters.reduce((sum, s) => sum + s.credits, 0);
    return totalCredits > 0 ? totalWeightedPoints / totalCredits : 0;
  };

  const cgpa = calculateCGPA();
  const totalCredits = [...quickSemesters, ...semesters].reduce((sum, sem) => sum + sem.credits, 0);
  const totalSemesters = quickSemesters.length + semesters.length;
  const percentage = cgpa * 10;

  const getPerformance = (sgpa: number) => {
    if (sgpa >= 9.0) return { text: "EXCELLENT", class: "bg-success text-success-foreground" };
    if (sgpa >= 7.0) return { text: "GOOD", class: "bg-info text-info-foreground" };
    if (sgpa >= 6.0) return { text: "AVERAGE", class: "bg-warning text-warning-foreground" };
    return { text: "NEEDS IMPROVEMENT", class: "bg-destructive text-destructive-foreground" };
  };

  // Quick Mode Handlers
  const handleAddQuickSemester = async () => {
    if (!quickCredits || !quickSgpa) {
      toast({
        title: "Invalid input",
        description: "Please enter credits and SGPA.",
        variant: "destructive"
      });
      return;
    }

    const credits = parseInt(quickCredits);
    const sgpa = parseFloat(quickSgpa);

    if (isNaN(credits) || credits <= 0) {
      toast({
        title: "Invalid credits",
        description: "Credits must be a positive number.",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(sgpa) || sgpa < 0 || sgpa > 10) {
      toast({
        title: "Invalid SGPA",
        description: "SGPA must be between 0 and 10.",
        variant: "destructive"
      });
      return;
    }

    const semesterNumber = quickSemesters.length + semesters.length + 1;
    const semesterName = `Semester ${semesterNumber}`;

    try {
      const { data, error } = await supabase
        .from('semesters')
        .insert({
          user_id: user?.id,
          name: semesterName,
          sgpa,
          credits
        })
        .select()
        .single();

      if (error) throw error;

      setQuickSemesters([...quickSemesters, {
        id: data.id,
        name: data.name,
        sgpa: Number(data.sgpa),
        credits: data.credits
      }]);

      setQuickCredits("");
      setQuickSgpa("");
      
      toast({
        title: "Semester added",
        description: `${semesterName} has been saved.`
      });
    } catch (error: any) {
      toast({
        title: "Error saving semester",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteQuickSemester = async (id: string) => {
    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setQuickSemesters(quickSemesters.filter(s => s.id !== id));
      toast({
        title: "Semester removed",
        description: "The semester has been deleted."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting semester",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Detailed Mode Handlers
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

  const handleSaveDetailedSemester = async () => {
    if (tempCourses.length === 0) {
      toast({
        title: "Invalid semester",
        description: "Please add at least one course.",
        variant: "destructive"
      });
      return;
    }

    const sgpa = calculateSGPA(tempCourses);
    const totalCreditsForSem = tempCourses.reduce((sum, c) => sum + c.credits, 0);
    const semesterNumber = quickSemesters.length + semesters.length + 1;
    const semesterName = `Semester ${semesterNumber}`;

    try {
      const { data: semesterData, error: semError } = await supabase
        .from('semesters')
        .insert({
          user_id: user?.id,
          name: semesterName,
          sgpa,
          credits: totalCreditsForSem
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

      setTempCourses([]);
      toast({
        title: "Semester saved",
        description: `${semesterName} has been saved successfully.`
      });
    } catch (error: any) {
      toast({
        title: "Error saving semester",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteDetailedSemester = async (id: string) => {
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
      setQuickSemesters([]);
      setShowResults(false);
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

  const fetchAIMotivation = async () => {
    if (totalSemesters === 0) return;
    
    setAiLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-motivation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cgpa,
          percentage,
          semesters: totalSemesters,
          totalCredits,
          type: "motivation"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get AI message");
      }

      const data = await response.json();
      setAiMessage(data.message);
    } catch (error: any) {
      console.error("AI motivation error:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCalculateCGPA = async () => {
    if (totalSemesters === 0) {
      toast({
        title: "No data",
        description: "Please add at least one semester to calculate CGPA.",
        variant: "destructive"
      });
      return;
    }
    setShowResults(true);
    await fetchAIMotivation();
  };

  const chartData = [
    ...quickSemesters.map((sem, index) => ({
      name: `Sem ${index + 1}`,
      SGPA: sem.sgpa,
      Credits: sem.credits,
      type: "quick"
    })),
    ...semesters.map((sem, index) => ({
      name: `Sem ${quickSemesters.length + index + 1}`,
      SGPA: sem.sgpa,
      Credits: sem.credits,
      type: "detailed"
    }))
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-primary">
          <Calculator className="w-8 h-8" />
          <h1 className="text-3xl font-bold">CGPA Calculator</h1>
        </div>
      </div>

      <p className="text-muted-foreground text-center md:text-left">
        Calculate your cumulative GPA with quick entry or detailed course input
      </p>

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
            <strong>Formula:</strong> CGPA = Σ(Credits × SGPA) / Σ(Credits) | <strong>Percentage:</strong> CGPA × 10
          </p>
        </CardContent>
      </Card>

      {/* Mode Selection Tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "quick" | "detailed")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Quick Mode
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Detailed Mode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Quick Input Section */}
            <Card className="overflow-hidden">
              <CardHeader className="gradient-header">
                <CardTitle className="text-primary-foreground flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Add Semester
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <p className="text-sm text-muted-foreground">
                  Enter your semester's total credits and SGPA directly for quick CGPA calculation.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-medium">Total Credits</label>
                      <Input
                        type="number"
                        placeholder="e.g., 24"
                        value={quickCredits}
                        onChange={(e) => setQuickCredits(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-medium">SGPA</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        placeholder="e.g., 8.5"
                        value={quickSgpa}
                        onChange={(e) => setQuickSgpa(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button onClick={handleAddQuickSemester} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Semester
                  </Button>
                </div>


                <Button 
                  className="w-full gradient-primary"
                  onClick={handleCalculateCGPA}
                  disabled={totalSemesters === 0}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate CGPA
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            <ResultsCard
              showResults={showResults}
              totalSemesters={totalSemesters}
              cgpa={cgpa}
              totalCredits={totalCredits}
              percentage={percentage}
              aiLoading={aiLoading}
              aiMessage={aiMessage}
              onViewAnalysis={() => setShowAnalysis(true)}
              onReset={handleResetAll}
            />
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Detailed Input Section */}
            <Card className="overflow-hidden">
              <CardHeader className="gradient-header">
                <CardTitle className="text-primary-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Add Semester with Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <p className="text-sm text-muted-foreground">
                  Add individual courses with grades for detailed CGPA calculation and analysis.
                </p>

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
                        <span className="text-muted-foreground">SGPA:</span>{" "}
                        <span className="font-semibold text-primary">{calculateSGPA(tempCourses).toFixed(2)}</span>
                      </div>
                      <Button onClick={handleSaveDetailedSemester}>
                        Save Semester
                      </Button>
                    </div>
                  </div>
                )}


                <Button 
                  className="w-full gradient-primary"
                  onClick={handleCalculateCGPA}
                  disabled={totalSemesters === 0}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate CGPA
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            <ResultsCard
              showResults={showResults}
              totalSemesters={totalSemesters}
              cgpa={cgpa}
              totalCredits={totalCredits}
              percentage={percentage}
              aiLoading={aiLoading}
              aiMessage={aiMessage}
              onViewAnalysis={() => setShowAnalysis(true)}
              onReset={handleResetAll}
            />
          </div>
        </TabsContent>
      </Tabs>

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
                    <div className="text-xs text-success">{totalSemesters} Semesters</div>
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
            {chartData.length > 0 && (
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
            )}

            {/* Detailed Courses Table (only for detailed mode semesters) */}
            {semesters.length > 0 && (
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
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Results Card Component
const ResultsCard = ({
  showResults,
  totalSemesters,
  cgpa,
  totalCredits,
  percentage,
  aiLoading,
  aiMessage,
  onViewAnalysis,
  onReset
}: {
  showResults: boolean;
  totalSemesters: number;
  cgpa: number;
  totalCredits: number;
  percentage: number;
  aiLoading: boolean;
  aiMessage: string | null;
  onViewAnalysis: () => void;
  onReset: () => void;
}) => (
  <Card className="overflow-hidden">
    <CardHeader className="bg-gradient-to-r from-chart-4/20 to-primary/20">
      <CardTitle className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Results
      </CardTitle>
    </CardHeader>
    <CardContent className="p-6">
      {!showResults || totalSemesters === 0 ? (
        <div className="text-center py-12">
          <Calculator className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Add your semester details and click "Calculate CGPA" to see your results
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Motivation Message */}
          {aiLoading ? (
            <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating personalized message...</span>
            </div>
          ) : aiMessage && (
            <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/20 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm leading-relaxed">{aiMessage}</p>
              </div>
            </div>
          )}

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
            onClick={onViewAnalysis}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Detailed Analysis
          </Button>

          {totalSemesters > 0 && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onReset}
            >
              Reset All Data
            </Button>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export default CGPACalculator;
