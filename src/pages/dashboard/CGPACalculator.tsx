import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Calculator, Plus, Trash2, BarChart3, TrendingUp, Target, Award, Loader2, Sparkles, Zap, BookOpen, Eye, ChevronRight, Settings, Save, Crosshair, ChevronDown, Copy, Database } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Default grade scale mapping
const defaultGradePoints: Record<string, number> = {
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

// Load custom grade points from localStorage
const loadCustomGradePoints = (): Record<string, number> => {
  try {
    const saved = localStorage.getItem('customGradePoints');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading custom grade points:', e);
  }
  return { ...defaultGradePoints };
};

// Load custom max CGPA from localStorage
const loadMaxCGPA = (): number => {
  try {
    const saved = localStorage.getItem('maxCGPA');
    if (saved) {
      return parseFloat(saved);
    }
  } catch (e) {
    console.error('Error loading max CGPA:', e);
  }
  return 10;
};

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
  
  // Grade system customization
  const [gradePoints, setGradePoints] = useState<Record<string, number>>(loadCustomGradePoints);
  const [maxCGPA, setMaxCGPA] = useState<number>(loadMaxCGPA);
  const [editGradePoints, setEditGradePoints] = useState<Record<string, number>>({});
  const [editMaxCGPA, setEditMaxCGPA] = useState<number>(10);
  const [newGradeName, setNewGradeName] = useState("");
  const [newGradeValue, setNewGradeValue] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Session-only entered data (not yet calculated/saved to history view)
  const [sessionQuickSemesters, setSessionQuickSemesters] = useState<QuickSemester[]>([]);
  const [sessionDetailedSemesters, setSessionDetailedSemesters] = useState<Semester[]>([]);
  
  // Target CGPA mode
  const [targetMode, setTargetMode] = useState(false);
  const [totalSemestersTarget, setTotalSemestersTarget] = useState("");
  const [targetCGPA, setTargetCGPA] = useState("");
  const [predictionResult, setPredictionResult] = useState<{ requiredSGPA: number; remainingSemesters: number; achievable: boolean } | null>(null);
  const [savedRecords, setSavedRecords] = useState<{ semesters: QuickSemester[]; totalCredits: number; cgpa: number; date: string; semesterCount: number }[]>([]);
  const [loadingSavedRecords, setLoadingSavedRecords] = useState(false);
  
  // Quick mode inputs
  const [quickCredits, setQuickCredits] = useState("");
  const [quickSgpa, setQuickSgpa] = useState("");
  
  // Detailed mode inputs
  const [newCourse, setNewCourse] = useState({ name: "", credits: "", grade: "O" });
  const [tempCourses, setTempCourses] = useState<Omit<Course, 'id'>[]>([]);
  
  // Compute gradeOptions from current gradePoints
  const gradeOptions = Object.keys(gradePoints);
  
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

  // Fetch saved CGPA records for the dropdown
  const fetchSavedRecords = async () => {
    if (!user) return;
    
    setLoadingSavedRecords(true);
    try {
      const { data: semesterData, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (semesterData && semesterData.length > 0) {
        // Group semesters and calculate CGPA
        const allSems = semesterData.map(s => ({
          id: s.id,
          name: s.name,
          sgpa: Number(s.sgpa),
          credits: s.credits
        }));
        
        const totalCreditsCalc = allSems.reduce((sum, sem) => sum + sem.credits, 0);
        const totalWeighted = allSems.reduce((sum, sem) => sum + (sem.sgpa * sem.credits), 0);
        const cgpaCalc = totalCreditsCalc > 0 ? totalWeighted / totalCreditsCalc : 0;
        
        setSavedRecords([{
          semesters: allSems,
          totalCredits: totalCreditsCalc,
          cgpa: cgpaCalc,
          date: new Date().toLocaleDateString(),
          semesterCount: allSems.length
        }]);
      } else {
        setSavedRecords([]);
      }
    } catch (error: any) {
      console.error("Error fetching saved records:", error);
    } finally {
      setLoadingSavedRecords(false);
    }
  };

  // Load a saved record as duplicate for target calculation
  const handleLoadSavedRecord = (record: { semesters: QuickSemester[]; totalCredits: number; cgpa: number }) => {
    // Create duplicates with new IDs (session-only, not saved to DB)
    const duplicatedSemesters = record.semesters.map(sem => ({
      ...sem,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    // Clear existing data and load duplicated data
    setQuickSemesters(duplicatedSemesters);
    setSemesters([]);
    setSessionQuickSemesters(duplicatedSemesters);
    setSessionDetailedSemesters([]);
    setShowResults(false);
    setPredictionResult(null);
    
    toast({
      title: "Data loaded",
      description: `Loaded ${record.semesters.length} semesters (CGPA: ${record.cgpa.toFixed(2)}) for target calculation. Original data is preserved.`
    });
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

  // Grade Settings Handlers
  const handleOpenSettings = () => {
    setEditGradePoints({ ...gradePoints });
    setEditMaxCGPA(maxCGPA);
    setNewGradeName("");
    setNewGradeValue("");
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    setGradePoints(editGradePoints);
    setMaxCGPA(editMaxCGPA);
    localStorage.setItem('customGradePoints', JSON.stringify(editGradePoints));
    localStorage.setItem('maxCGPA', editMaxCGPA.toString());
    setIsSettingsOpen(false);
    toast({
      title: "Settings saved",
      description: "Your grade system has been updated."
    });
  };

  const handleResetToDefault = () => {
    setEditGradePoints({ ...defaultGradePoints });
    setEditMaxCGPA(10);
  };

  const handleUpdateGradeValue = (grade: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setEditGradePoints({ ...editGradePoints, [grade]: numValue });
    }
  };

  const handleDeleteGrade = (grade: string) => {
    const updated = { ...editGradePoints };
    delete updated[grade];
    setEditGradePoints(updated);
  };

  const handleAddNewGrade = () => {
    if (!newGradeName.trim() || !newGradeValue) {
      toast({
        title: "Invalid input",
        description: "Please enter both grade name and value.",
        variant: "destructive"
      });
      return;
    }
    const numValue = parseFloat(newGradeValue);
    if (isNaN(numValue) || numValue < 0) {
      toast({
        title: "Invalid value",
        description: "Grade value must be a positive number.",
        variant: "destructive"
      });
      return;
    }
    setEditGradePoints({ ...editGradePoints, [newGradeName.trim().toUpperCase()]: numValue });
    setNewGradeName("");
    setNewGradeValue("");
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

      const newSem = {
        id: data.id,
        name: data.name,
        sgpa: Number(data.sgpa),
        credits: data.credits
      };

      setQuickSemesters([...quickSemesters, newSem]);
      // Also add to session semesters to show in EnteredData
      setSessionQuickSemesters([...sessionQuickSemesters, newSem]);

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
      setSessionQuickSemesters(sessionQuickSemesters.filter(s => s.id !== id));
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

      const newSem = {
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
      };

      setSemesters([...semesters, newSem]);
      // Also add to session semesters to show in EnteredData
      setSessionDetailedSemesters([...sessionDetailedSemesters, newSem]);

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
      setSessionDetailedSemesters(sessionDetailedSemesters.filter(s => s.id !== id));
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
      setSessionQuickSemesters([]);
      setSessionDetailedSemesters([]);
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
    
    // Target mode prediction
    if (targetMode) {
      const totalSems = parseInt(totalSemestersTarget);
      const target = parseFloat(targetCGPA);
      
      if (isNaN(totalSems) || totalSems <= totalSemesters) {
        toast({
          title: "Invalid total semesters",
          description: `Total semesters must be greater than current semesters (${totalSemesters}).`,
          variant: "destructive"
        });
        return;
      }
      
      if (isNaN(target) || target <= 0 || target > maxCGPA) {
        toast({
          title: "Invalid target CGPA",
          description: `Target CGPA must be between 0 and ${maxCGPA}.`,
          variant: "destructive"
        });
        return;
      }
      
      // Calculate required SGPA for remaining semesters
      // Assuming equal credits per semester (using average)
      const avgCreditsPerSem = totalCredits / totalSemesters;
      const remainingSems = totalSems - totalSemesters;
      const remainingCredits = avgCreditsPerSem * remainingSems;
      const totalCreditsAtEnd = totalCredits + remainingCredits;
      
      // Target CGPA = (currentWeighted + remainingWeighted) / totalCredits
      // target * totalCreditsAtEnd = cgpa * totalCredits + requiredSGPA * remainingCredits
      // requiredSGPA = (target * totalCreditsAtEnd - cgpa * totalCredits) / remainingCredits
      const currentWeighted = cgpa * totalCredits;
      const requiredWeighted = target * totalCreditsAtEnd - currentWeighted;
      const requiredSGPA = requiredWeighted / remainingCredits;
      
      const achievable = requiredSGPA <= maxCGPA && requiredSGPA >= 0;
      
      setPredictionResult({
        requiredSGPA: Math.max(0, requiredSGPA),
        remainingSemesters: remainingSems,
        achievable
      });
    } else {
      setPredictionResult(null);
    }
    
    setShowResults(true);
    // Clear session data after calculating (it's now "calculated" and visible in results/history)
    setSessionQuickSemesters([]);
    setSessionDetailedSemesters([]);
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
        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" onClick={handleOpenSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Grade Settings
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Grade System Settings</SheetTitle>
              <SheetDescription>
                Customize your grade scale and CGPA formula
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              {/* Max CGPA Setting */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Maximum CGPA Scale</label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="10"
                  value={editMaxCGPA}
                  onChange={(e) => setEditMaxCGPA(parseFloat(e.target.value) || 10)}
                  placeholder="e.g., 10"
                />
                <p className="text-xs text-muted-foreground">
                  Set the maximum CGPA scale (e.g., 10 for 10-point, 4 for 4-point)
                </p>
              </div>

              {/* Grade Points List */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Grade Points</label>
                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  {Object.entries(editGradePoints).map(([grade, points]) => (
                    <div key={grade} className="flex items-center gap-3 p-3">
                      <span className="font-medium w-12">{grade}</span>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={points}
                        onChange={(e) => handleUpdateGradeValue(grade, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGrade(grade)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Grade */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Add New Grade</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Grade (e.g., S)"
                    value={newGradeName}
                    onChange={(e) => setNewGradeName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Points"
                    value={newGradeValue}
                    onChange={(e) => setNewGradeValue(e.target.value)}
                    className="w-24"
                  />
                  <Button variant="outline" size="icon" onClick={handleAddNewGrade}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-4">
                <Button onClick={handleSaveSettings} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleResetToDefault} className="w-full">
                  Reset to Default
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
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
            <strong>Formula:</strong> CGPA = Σ(Credits × SGPA) / Σ(Credits) | <strong>Percentage:</strong> CGPA × {maxCGPA}
          </p>
        </CardContent>
      </Card>

      {/* Target CGPA Toggle */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div 
                className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${targetMode ? 'bg-primary' : 'bg-muted'}`}
                onClick={() => {
                  setTargetMode(!targetMode);
                  setPredictionResult(null);
                  setShowResults(false);
                }}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-background transition-transform ${targetMode ? 'translate-x-7' : 'translate-x-1'}`} />
              </div>
              <div className="flex items-center gap-2">
                <Crosshair className={`w-5 h-5 ${targetMode ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`font-medium ${targetMode ? 'text-primary' : 'text-muted-foreground'}`}>Target CGPA Mode</span>
              </div>
            </div>
            
            {/* Dropdown to load saved records */}
            {targetMode && (
              <DropdownMenu onOpenChange={(open) => { if (open) fetchSavedRecords(); }}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Database className="w-4 h-4" />
                    Load Saved Data
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 bg-popover border border-border z-50">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Use Saved Record (Duplicate)
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {loadingSavedRecords ? (
                    <DropdownMenuItem disabled>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </DropdownMenuItem>
                  ) : savedRecords.length === 0 ? (
                    <DropdownMenuItem disabled>
                      No saved records found
                    </DropdownMenuItem>
                  ) : (
                    savedRecords.map((record, index) => (
                      <DropdownMenuItem 
                        key={index}
                        onClick={() => handleLoadSavedRecord(record)}
                        className="cursor-pointer flex flex-col items-start gap-1"
                      >
                        <div className="font-medium">
                          {record.semesterCount} Semesters • CGPA: {record.cgpa.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.totalCredits} credits • Click to use as base
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {targetMode && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Total Semesters:</label>
                  <Input
                    type="number"
                    placeholder="e.g., 8"
                    value={totalSemestersTarget}
                    onChange={(e) => setTotalSemestersTarget(e.target.value)}
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Target CGPA:</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={maxCGPA}
                    placeholder="e.g., 8.5"
                    value={targetCGPA}
                    onChange={(e) => setTargetCGPA(e.target.value)}
                    className="w-20"
                  />
                </div>
              </div>
            )}
          </div>
          
          {targetMode && (
            <p className="text-xs text-muted-foreground mt-3">
              Enter your completed semester data below, or load from saved records. Data is duplicated - deleting originals won't affect this calculation.
            </p>
          )}
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

            {/* Side Display - Entered Data or Results */}
            {showResults ? (
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
                predictionResult={predictionResult}
                maxCGPA={maxCGPA}
              />
            ) : (
              <EnteredDataCard
                quickSemesters={sessionQuickSemesters}
                semesters={sessionDetailedSemesters}
                mode="quick"
                onDeleteQuick={handleDeleteQuickSemester}
                onDeleteDetailed={handleDeleteDetailedSemester}
                getPerformance={getPerformance}
              />
            )}
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleAddCourseToTemp}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Course
                    </Button>
                    {tempCourses.length > 0 && (
                      <Button variant="secondary" size="sm" onClick={handleSaveDetailedSemester}>
                        <ChevronRight className="w-4 h-4 mr-1" />
                        Next Semester
                      </Button>
                    )}
                  </div>
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

            {/* Side Display - Entered Data or Results */}
            {showResults ? (
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
                predictionResult={predictionResult}
                maxCGPA={maxCGPA}
              />
            ) : (
              <EnteredDataCard
                quickSemesters={sessionQuickSemesters}
                semesters={sessionDetailedSemesters}
                mode="detailed"
                onDeleteQuick={handleDeleteQuickSemester}
                onDeleteDetailed={handleDeleteDetailedSemester}
                getPerformance={getPerformance}
              />
            )}
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
  onReset,
  predictionResult,
  maxCGPA
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
  predictionResult?: { requiredSGPA: number; remainingSemesters: number; achievable: boolean } | null;
  maxCGPA?: number;
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

          {/* Target CGPA Prediction Result */}
          {predictionResult && (
            <div className={`p-4 rounded-lg border ${predictionResult.achievable ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
              <div className="flex items-start gap-3">
                <Crosshair className={`w-5 h-5 mt-0.5 flex-shrink-0 ${predictionResult.achievable ? 'text-success' : 'text-destructive'}`} />
                <div className="space-y-2">
                  <p className={`font-semibold ${predictionResult.achievable ? 'text-success' : 'text-destructive'}`}>
                    {predictionResult.achievable ? 'Target Achievable!' : 'Target May Be Difficult'}
                  </p>
                  <p className="text-sm">
                    You need a minimum SGPA of{' '}
                    <span className={`font-bold ${predictionResult.achievable ? 'text-success' : 'text-destructive'}`}>
                      {predictionResult.requiredSGPA.toFixed(2)}
                    </span>{' '}
                    in your remaining{' '}
                    <span className="font-semibold">{predictionResult.remainingSemesters} semester{predictionResult.remainingSemesters > 1 ? 's' : ''}</span>{' '}
                    to achieve your target.
                  </p>
                  {!predictionResult.achievable && (
                    <p className="text-xs text-muted-foreground">
                      The required SGPA exceeds the maximum possible ({maxCGPA}). Consider adjusting your target.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* View Analysis Button */}
          <Button
            className="w-full gradient-primary"
            onClick={onViewAnalysis}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Detailed Analysis
          </Button>

          {totalSemesters > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All CGPA Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your
                    semester data and CGPA calculations from your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

// Entered Data Card Component - Shows entered semesters before calculating
const EnteredDataCard = ({
  quickSemesters,
  semesters,
  mode,
  onDeleteQuick,
  onDeleteDetailed,
  getPerformance
}: {
  quickSemesters: QuickSemester[];
  semesters: Semester[];
  mode: "quick" | "detailed";
  onDeleteQuick: (id: string) => void;
  onDeleteDetailed: (id: string) => void;
  getPerformance: (sgpa: number) => { text: string; class: string };
}) => {
  const allSemesters = [
    ...quickSemesters.map((s, idx) => ({ ...s, type: 'quick' as const, displayNum: idx + 1 })),
    ...semesters.map((s, idx) => ({ ...s, type: 'detailed' as const, displayNum: quickSemesters.length + idx + 1 }))
  ];

  const totalCredits = [...quickSemesters, ...semesters].reduce((sum, s) => sum + s.credits, 0);
  const cgpaPreview = allSemesters.length > 0
    ? allSemesters.reduce((sum, s) => sum + (s.sgpa * s.credits), 0) / totalCredits
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-info/20 to-primary/20">
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Entered Data
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {allSemesters.length === 0 ? (
          <div className="text-center py-12">
            <Plus className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No semesters added yet. Add semesters on the left to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview Stats */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{cgpaPreview.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">CGPA Preview</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{totalCredits}</div>
                <div className="text-xs text-muted-foreground">Total Credits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-chart-4">{allSemesters.length}</div>
                <div className="text-xs text-muted-foreground">Semesters</div>
              </div>
            </div>

            {/* Semester List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {allSemesters.map((sem) => {
                const performance = getPerformance(sem.sgpa);
                return (
                  <div
                    key={sem.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                        {sem.displayNum}
                      </div>
                      <div>
                        <div className="font-medium text-sm">Semester {sem.displayNum}</div>
                        <div className="text-xs text-muted-foreground">
                          SGPA: {sem.sgpa.toFixed(2)} • {sem.credits} credits
                          {sem.type === 'detailed' && ' • Detailed'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${performance.class} text-xs`}>
                        {performance.text}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => sem.type === 'quick' ? onDeleteQuick(sem.id) : onDeleteDetailed(sem.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              Click "Calculate CGPA" to see detailed results and AI insights
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CGPACalculator;
