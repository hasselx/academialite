import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, Plus, Trash2, Edit2, BarChart3, TrendingUp, Target, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

interface Semester {
  id: string;
  name: string;
  sgpa: number;
  credits: number;
}

const gradeScales = [
  { value: "10", label: "10 Point Scale (Indian Universities)", range: "Range: 0.0 - 10.0 | Excellent: 9.0+, Good: 7.0-8.9, Average: 6.0-6.9" },
  { value: "4", label: "4.0 Scale (US)", range: "Range: 0.0 - 4.0 | Excellent: 3.7+, Good: 3.0-3.6, Average: 2.0-2.9" },
  { value: "5", label: "5.0 Scale", range: "Range: 0.0 - 5.0" },
];

const initialSemesters: Semester[] = [
  { id: "1", name: "Semester 1", sgpa: 8.28, credits: 25 },
  { id: "2", name: "Semester 2", sgpa: 7.46, credits: 24 },
  { id: "3", name: "Semester 3", sgpa: 8.3, credits: 25 },
  { id: "4", name: "Semester 4", sgpa: 8.56, credits: 26 },
  { id: "5", name: "Semester 5", sgpa: 7.74, credits: 23 },
  { id: "6", name: "Semester 6", sgpa: 7.57, credits: 21 },
  { id: "7", name: "Semester 7", sgpa: 7.55, credits: 22 },
  { id: "8", name: "Semester 8", sgpa: 7.0, credits: 18 },
];

const CGPACalculator = () => {
  const [scale, setScale] = useState("10");
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [newSgpa, setNewSgpa] = useState("");
  const [newCredits, setNewCredits] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const { toast } = useToast();

  const calculateCGPA = () => {
    if (semesters.length === 0) return 0;
    const totalGradePoints = semesters.reduce((sum, sem) => sum + (sem.sgpa * sem.credits), 0);
    const totalCredits = semesters.reduce((sum, sem) => sum + sem.credits, 0);
    return totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  };

  const cgpa = calculateCGPA();
  const totalCredits = semesters.reduce((sum, sem) => sum + sem.credits, 0);
  const avgSgpa = semesters.length > 0 
    ? semesters.reduce((sum, sem) => sum + sem.sgpa, 0) / semesters.length 
    : 0;

  const getPerformance = (sgpa: number) => {
    if (sgpa >= 9.0) return { text: "EXCELLENT", class: "status-excellent" };
    if (sgpa >= 7.0) return { text: "GOOD", class: "status-good" };
    if (sgpa >= 6.0) return { text: "AVERAGE", class: "status-average" };
    return { text: "NEEDS IMPROVEMENT", class: "status-poor" };
  };

  const handleAddSemester = () => {
    const sgpa = parseFloat(newSgpa);
    const credits = parseInt(newCredits);

    if (isNaN(sgpa) || isNaN(credits) || sgpa < 0 || sgpa > parseFloat(scale) || credits <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter valid SGPA and credits.",
        variant: "destructive"
      });
      return;
    }

    const newSemester: Semester = {
      id: Date.now().toString(),
      name: `Semester ${semesters.length + 1}`,
      sgpa,
      credits
    };

    setSemesters([...semesters, newSemester]);
    setNewSgpa("");
    setNewCredits("");

    toast({
      title: "Semester added",
      description: `${newSemester.name} has been added.`
    });
  };

  const handleDeleteSemester = (id: string) => {
    setSemesters(semesters.filter(s => s.id !== id));
    toast({
      title: "Semester removed",
      description: "The semester has been deleted."
    });
  };

  const chartData = semesters.map((sem, index) => ({
    name: `Sem ${index + 1}`,
    SGPA: sem.sgpa,
    Credits: sem.credits
  }));

  const convert4Scale = () => (cgpa - 5) * 4 / 5;
  const convert5Scale = () => cgpa / 2;
  const convertPercentage = () => (cgpa - 0.5) * 10;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Formula Banner */}
      <div className="bg-gradient-to-r from-accent via-accent/50 to-accent/30 rounded-xl p-4 text-center">
        <p className="text-lg font-medium text-foreground">
          <span className="font-bold">CGPA Formula:</span> CGPA = Σ(SGPA × Credits) / Σ(Credits)
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card className="overflow-hidden">
          <CardHeader className="gradient-header">
            <CardTitle className="text-primary-foreground flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Enter Semester Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Scale Selector */}
            <div className="space-y-2">
              <label className="font-medium">CGPA Scale</label>
              <Select value={scale} onValueChange={setScale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradeScales.map((gs) => (
                    <SelectItem key={gs.value} value={gs.value}>
                      {gs.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-info bg-info/10 p-3 rounded-lg">
                {gradeScales.find(g => g.value === scale)?.range}
              </p>
            </div>

            {/* Semesters List */}
            {semesters.length > 0 && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {semesters.map((sem, index) => (
                  <div key={sem.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium min-w-[100px]">{sem.name}</span>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">SGPA:</span>{" "}
                        <span className="font-semibold">{sem.sgpa}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Credits:</span>{" "}
                        <span className="font-semibold">{sem.credits}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteSemester(sem.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Semester */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Add New Semester</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">SGPA</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g., 8.5"
                    value={newSgpa}
                    onChange={(e) => setNewSgpa(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Credits</label>
                  <Input 
                    type="number"
                    placeholder="e.g., 23"
                    value={newCredits}
                    onChange={(e) => setNewCredits(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleAddSemester}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Semester
                </Button>
                <Button className="gradient-primary">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate CGPA
                </Button>
              </div>
              <Button 
                variant="ghost" 
                className="mt-2 text-muted-foreground"
                onClick={() => setSemesters([])}
              >
                Reset
              </Button>
            </div>
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
                  Enter your semester details and click "Calculate CGPA" to see your results
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="stat-card text-center">
                    <div className="text-3xl font-bold text-primary">{cgpa.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Overall CGPA</div>
                    <div className="text-xs text-primary mt-1">{scale}.0 Scale</div>
                  </div>
                  <div className="stat-card text-center">
                    <div className="text-3xl font-bold text-success">{totalCredits}</div>
                    <div className="text-sm text-muted-foreground">Total Credits</div>
                    <div className="text-xs text-success mt-1">{semesters.length} Semesters</div>
                  </div>
                  <div className="stat-card text-center">
                    <div className="text-3xl font-bold text-chart-4">{avgSgpa.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Average SGPA</div>
                    <div className="text-xs text-chart-4 mt-1">{(cgpa * totalCredits).toFixed(2)} Points</div>
                  </div>
                </div>

                {/* Scale Conversions */}
                {scale === "10" && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Scale Conversions
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-4 text-center">
                        <div className="text-2xl font-bold text-info">{convert4Scale().toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">4.0 Scale (US)</div>
                        <div className="text-xs text-muted-foreground mt-1">Formula: (CGPA - 5) × 4 / 5</div>
                      </Card>
                      <Card className="p-4 text-center">
                        <div className="text-2xl font-bold text-success">{convert5Scale().toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">5.0 Scale</div>
                        <div className="text-xs text-muted-foreground mt-1">Formula: CGPA / 2</div>
                      </Card>
                      <Card className="p-4 text-center">
                        <div className="text-2xl font-bold text-chart-4">{convertPercentage().toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">Percentage</div>
                        <div className="text-xs text-muted-foreground mt-1">Formula: (CGPA - 0.5) × 10</div>
                      </Card>
                    </div>
                  </div>
                )}

                {/* View Analysis Button */}
                <Button 
                  className="w-full gradient-primary"
                  onClick={() => setShowAnalysis(true)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Detailed Analysis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                    <div className="text-xs text-primary">{scale}.0 Scale</div>
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
                    <div className="text-3xl font-bold text-chart-4">{avgSgpa.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Average SGPA</div>
                    <div className="text-xs text-chart-4">{(cgpa * totalCredits).toFixed(2)} Points</div>
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

            {/* Semester Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Semester-wise Breakdown
                  </span>
                  <Button size="sm" className="bg-success hover:bg-success/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Semester
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semester</TableHead>
                      <TableHead>SGPA</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Grade Points</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {semesters.map((sem) => {
                      const perf = getPerformance(sem.sgpa);
                      return (
                        <TableRow key={sem.id}>
                          <TableCell className="font-medium">{sem.name}</TableCell>
                          <TableCell>{sem.sgpa.toFixed(2)}</TableCell>
                          <TableCell>{sem.credits}</TableCell>
                          <TableCell>{(sem.sgpa * sem.credits).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={perf.class}>{perf.text}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Edit2 className="w-4 h-4 text-primary" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => handleDeleteSemester(sem.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAnalysis(false)}>
                Close
              </Button>
              <Button className="bg-success hover:bg-success/90">
                Export Analysis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CGPACalculator;
