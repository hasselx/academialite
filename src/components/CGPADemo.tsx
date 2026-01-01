import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Trash2, Calculator, TrendingUp, Award, BarChart3, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts";

interface DemoSemester {
  id: string;
  sgpa: number;
  credits: number;
}

const defaultGradePoints: Record<string, number> = {
  "O": 10, "A+": 9.5, "A": 9, "B+": 8, "B": 7, "C": 6, "P": 5,
  "F": 0, "W": 0, "I": 0, "FA": 0
};

interface CGPADemoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CGPADemo = ({ open, onOpenChange }: CGPADemoProps) => {
  const [semesters, setSemesters] = useState<DemoSemester[]>([]);
  const [currentSGPA, setCurrentSGPA] = useState<string>("");
  const [currentCredits, setCurrentCredits] = useState<string>("");
  const [showResults, setShowResults] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const maxCGPA = 10;

  const addSemester = () => {
    const sgpa = parseFloat(currentSGPA);
    const credits = parseFloat(currentCredits);

    if (isNaN(sgpa) || isNaN(credits) || sgpa < 0 || sgpa > maxCGPA || credits <= 0) {
      toast({
        title: "Invalid Input",
        description: `Please enter valid SGPA (0-${maxCGPA}) and credits (> 0)`,
        variant: "destructive"
      });
      return;
    }

    setSemesters([...semesters, {
      id: crypto.randomUUID(),
      sgpa,
      credits
    }]);
    setCurrentSGPA("");
    setCurrentCredits("");
    toast({ title: "Semester Added", description: `Semester ${semesters.length + 1} added successfully` });
  };

  const removeSemester = (id: string) => {
    setSemesters(semesters.filter(s => s.id !== id));
  };

  const calculateCGPA = () => {
    if (semesters.length === 0) {
      toast({ title: "No Data", description: "Please add at least one semester", variant: "destructive" });
      return;
    }

    let totalWeightedPoints = 0;
    let totalCredits = 0;

    semesters.forEach(sem => {
      totalWeightedPoints += sem.sgpa * sem.credits;
      totalCredits += sem.credits;
    });

    setShowResults(true);
  };

  const cgpa = semesters.length > 0 
    ? semesters.reduce((acc, s) => acc + s.sgpa * s.credits, 0) / semesters.reduce((acc, s) => acc + s.credits, 0)
    : 0;

  const totalCredits = semesters.reduce((acc, s) => acc + s.credits, 0);
  const percentage = cgpa * 10;

  const getPerformance = (sgpa: number) => {
    if (sgpa >= 9) return { label: "Excellent", color: "text-success" };
    if (sgpa >= 8) return { label: "Very Good", color: "text-info" };
    if (sgpa >= 7) return { label: "Good", color: "text-primary" };
    if (sgpa >= 6) return { label: "Average", color: "text-warning" };
    return { label: "Needs Improvement", color: "text-destructive" };
  };

  const chartData = semesters.map((sem, index) => ({
    name: `Sem ${index + 1}`,
    sgpa: sem.sgpa,
    credits: sem.credits
  }));

  const chartConfig = {
    sgpa: { label: "SGPA", color: "hsl(var(--primary))" },
    credits: { label: "Credits", color: "hsl(var(--chart-4))" }
  };

  const resetDemo = () => {
    setSemesters([]);
    setCurrentSGPA("");
    setCurrentCredits("");
    setShowResults(false);
    setShowAnalysis(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              CGPA Calculator Demo
            </SheetTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Demo Mode - Data won't be saved
            </span>
          </div>
        </SheetHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Mode - Add Semester</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="demo-sgpa">SGPA</Label>
                    <Input
                      id="demo-sgpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max={maxCGPA}
                      placeholder={`0 - ${maxCGPA}`}
                      value={currentSGPA}
                      onChange={(e) => setCurrentSGPA(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-credits">Credits</Label>
                    <Input
                      id="demo-credits"
                      type="number"
                      min="1"
                      placeholder="e.g., 20"
                      value={currentCredits}
                      onChange={(e) => setCurrentCredits(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={addSemester} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Semester
                </Button>
              </CardContent>
            </Card>

            {/* Added Semesters */}
            {semesters.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Added Semesters ({semesters.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                  {semesters.map((sem, index) => (
                    <div key={sem.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Semester {index + 1}</span>
                        <span className="text-xs text-muted-foreground">
                          SGPA: {sem.sgpa.toFixed(2)} | Credits: {sem.credits}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSemester(sem.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Button 
              onClick={calculateCGPA} 
              className="w-full gradient-primary text-primary-foreground"
              disabled={semesters.length === 0}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculate CGPA
            </Button>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {showResults ? (
              <>
                <Card className="gradient-primary text-primary-foreground">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm opacity-80 mb-2">Your CGPA</p>
                      <p className="text-5xl font-bold mb-2">{cgpa.toFixed(2)}</p>
                      <p className={`text-sm ${getPerformance(cgpa).color} bg-background/20 inline-block px-3 py-1 rounded-full`}>
                        {getPerformance(cgpa).label}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Award className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{totalCredits}</p>
                      <p className="text-xs text-muted-foreground">Total Credits</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-success" />
                      <p className="text-2xl font-bold">{percentage.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Percentage</p>
                    </CardContent>
                  </Card>
                </div>

                <Button 
                  onClick={() => setShowAnalysis(true)} 
                  variant="outline" 
                  className="w-full"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Detailed Analysis
                </Button>

                <Button onClick={resetDemo} variant="ghost" className="w-full">
                  Reset Demo
                </Button>
              </>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[300px]">
                <CardContent className="text-center text-muted-foreground">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Add semesters and calculate to see results</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Analysis Dialog */}
        <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Detailed CGPA Analysis
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-primary">{cgpa.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">CGPA</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold">{totalCredits}</p>
                    <p className="text-sm text-muted-foreground">Total Credits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-success">{percentage.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Percentage</p>
                  </CardContent>
                </Card>
              </div>

              {/* SGPA Trend Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">SGPA Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <LineChart data={chartData}>
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, maxCGPA]} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="sgpa"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Credits Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Credits per Semester</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="credits" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Semester Breakdown Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Semester Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Semester</th>
                          <th className="text-center py-2 font-medium">SGPA</th>
                          <th className="text-center py-2 font-medium">Credits</th>
                          <th className="text-center py-2 font-medium">Weighted</th>
                          <th className="text-right py-2 font-medium">Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semesters.map((sem, index) => {
                          const perf = getPerformance(sem.sgpa);
                          return (
                            <tr key={sem.id} className="border-b last:border-0">
                              <td className="py-2">Semester {index + 1}</td>
                              <td className="text-center py-2 font-medium">{sem.sgpa.toFixed(2)}</td>
                              <td className="text-center py-2">{sem.credits}</td>
                              <td className="text-center py-2">{(sem.sgpa * sem.credits).toFixed(2)}</td>
                              <td className={`text-right py-2 ${perf.color}`}>{perf.label}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
};

export default CGPADemo;
