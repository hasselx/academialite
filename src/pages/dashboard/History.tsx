import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  History as HistoryIcon, 
  Calculator, 
  CheckSquare, 
  Trash2, 
  RefreshCw, 
  BarChart3,
  TrendingUp,
  Target,
  Loader2,
  Eye,
  Edit2,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from "recharts";

interface Semester {
  id: string;
  name: string;
  sgpa: number;
  credits: number;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  subject: string;
  attended: number;
  total: number;
  required: number;
  updated_at: string;
}

const HistoryPage = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [editSgpa, setEditSgpa] = useState("");
  const [editCredits, setEditCredits] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const [semesterRes, attendanceRes] = await Promise.all([
        supabase
          .from('semesters')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('attendance_records')
          .select('*')
          .eq('user_id', user?.id)
          .order('updated_at', { ascending: false })
      ]);

      if (semesterRes.error) throw semesterRes.error;
      if (attendanceRes.error) throw attendanceRes.error;

      setSemesters(semesterRes.data?.map(s => ({
        id: s.id,
        name: s.name,
        sgpa: Number(s.sgpa),
        credits: s.credits,
        created_at: s.created_at
      })) || []);

      setAttendance(attendanceRes.data?.map(a => ({
        id: a.id,
        subject: a.subject,
        attended: a.attended,
        total: a.total,
        required: a.required,
        updated_at: a.updated_at
      })) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching history",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  const convert4Scale = () => (cgpa - 5) * 4 / 5;

  const handleDeleteSemester = async (id: string) => {
    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSemesters(semesters.filter(s => s.id !== id));
      toast({
        title: "Semester deleted",
        description: "The semester record has been removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAttendance(attendance.filter(a => a.id !== id));
      toast({
        title: "Record deleted",
        description: "The attendance record has been removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditSemester = (semester: Semester) => {
    setEditingSemester(semester);
    setEditSgpa(semester.sgpa.toString());
    setEditCredits(semester.credits.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingSemester) return;

    try {
      const { error } = await supabase
        .from('semesters')
        .update({
          sgpa: parseFloat(editSgpa),
          credits: parseInt(editCredits)
        })
        .eq('id', editingSemester.id);

      if (error) throw error;

      setSemesters(semesters.map(s => 
        s.id === editingSemester.id 
          ? { ...s, sgpa: parseFloat(editSgpa), credits: parseInt(editCredits) }
          : s
      ));

      setEditingSemester(null);
      toast({
        title: "Semester updated",
        description: "Changes saved successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error updating",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getAttendanceStatus = (attended: number, total: number, required: number) => {
    const percentage = (attended / total) * 100;
    if (percentage >= required) return { label: "safe", color: "text-success", bg: "border-success" };
    return { label: "low", color: "text-destructive", bg: "border-destructive" };
  };

  const getPerformance = (sgpa: number) => {
    if (sgpa >= 9.0) return { text: "EXCELLENT", class: "bg-success/20 text-success" };
    if (sgpa >= 7.0) return { text: "GOOD", class: "bg-primary/20 text-primary" };
    if (sgpa >= 6.0) return { text: "AVERAGE", class: "bg-warning/20 text-warning" };
    return { text: "NEEDS IMPROVEMENT", class: "bg-destructive/20 text-destructive" };
  };

  const getPerformanceColor = (sgpa: number) => {
    if (sgpa >= 9.0) return "#22c55e";
    if (sgpa >= 8.0) return "#84cc16";
    if (sgpa >= 7.0) return "#eab308";
    if (sgpa >= 6.0) return "#f97316";
    return "#ef4444";
  };

  const chartData = semesters.map((sem, index) => ({
    name: `Semester ${index + 1}`,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Activity History</h1>
        </div>
        <Button variant="outline" onClick={fetchHistory}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Load History
        </Button>
      </div>

      {/* CGPA Calculations Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          CGPA Calculations
        </h2>

        {semesters.length === 0 ? (
          <Card className="p-8 text-center">
            <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No CGPA records found. Add semesters in CGPA Calculator.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Summary Card */}
            <Card 
              className="border-2 border-primary/30 hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden"
              onClick={() => setShowAnalysis(true)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString()}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Could add bulk delete here
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="mt-2">
                  <div className="text-4xl font-bold text-primary">{cgpa.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    CGPA: {cgpa.toFixed(2)}/10.0
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Credits: {totalCredits}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    4.0 Scale: {convert4Scale().toFixed(2)}
                  </div>
                </div>

                <Button 
                  className="w-full mt-4 gradient-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  size="sm"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Click for detailed analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Attendance Records Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Attendance Records
        </h2>

        {attendance.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No attendance records found. Add subjects in Attendance tracker.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attendance.map((record) => {
              const percentage = (record.attended / record.total) * 100;
              const status = getAttendanceStatus(record.attended, record.total, record.required);

              return (
                <Card 
                  key={record.id} 
                  className={`border-2 ${status.bg} hover:shadow-soft transition-all group`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-sm text-muted-foreground">
                        {new Date(record.updated_at).toLocaleDateString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteAttendance(record.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className={`text-3xl font-bold ${status.color} mt-2`}>
                      {percentage.toFixed(2)}%
                    </div>
                    <div className="text-sm font-medium text-foreground mt-1">
                      Subject: {record.subject}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {record.attended}/{record.total} classes
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Status: {status.label}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* CGPA Analysis Dialog */}
      <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-6 h-6 text-primary" />
              CGPA Analysis & Trends
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 border-2 border-primary/20">
                <div className="flex items-center gap-3">
                  <Target className="w-10 h-10 text-primary" />
                  <div>
                    <div className="text-3xl font-bold text-foreground">{cgpa.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Overall CGPA</div>
                    <div className="text-xs text-primary">10.0 Scale</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-2 border-success/20">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-10 h-10 text-success" />
                  <div>
                    <div className="text-3xl font-bold text-foreground">{totalCredits}</div>
                    <div className="text-sm text-muted-foreground">Total Credits</div>
                    <div className="text-xs text-success">{semesters.length} Semesters</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-2 border-chart-4/20">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-10 h-10 text-chart-4" />
                  <div>
                    <div className="text-3xl font-bold text-foreground">{avgSgpa.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Average SGPA</div>
                    <div className="text-xs text-chart-4">{(cgpa * totalCredits).toFixed(2)} Points</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Scale Conversions */}
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
                  <div className="text-2xl font-bold text-success">{(cgpa / 2).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">5.0 Scale</div>
                  <div className="text-xs text-muted-foreground mt-1">Formula: CGPA / 2</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-chart-4">{((cgpa - 0.5) * 10).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Percentage</div>
                  <div className="text-xs text-muted-foreground mt-1">Formula: (CGPA - 0.5) × 10</div>
                </Card>
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
                      <XAxis dataKey="name" fontSize={10} />
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
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis domain={[0, 10]} fontSize={12} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="SGPA" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={({ cx, cy, payload }) => (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={getPerformanceColor(payload.SGPA)}
                            stroke="white"
                            strokeWidth={2}
                          />
                        )}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Performance Legend */}
                <div className="mt-4 text-center">
                  <div className="text-sm font-medium mb-2">Performance Gradient</div>
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span className="text-destructive">Low</span>
                    <div className="w-24 h-2 rounded-full bg-gradient-to-r from-destructive via-warning to-success" />
                    <span className="text-success">High</span>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      Needs Improvement
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      Below Average
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      Good
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Excellent
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Semester Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Semester-wise Breakdown
                </CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Semester
                </Button>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {semesters.map((sem) => {
                      const performance = getPerformance(sem.sgpa);
                      return (
                        <TableRow key={sem.id}>
                          <TableCell className="font-medium">{sem.name}</TableCell>
                          <TableCell>{sem.sgpa.toFixed(2)}</TableCell>
                          <TableCell>{sem.credits}</TableCell>
                          <TableCell>{(sem.sgpa * sem.credits).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={performance.class}>
                              {performance.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditSemester(sem)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteSemester(sem.id)}
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAnalysis(false)}>
                Close
              </Button>
              <Button className="gradient-primary">
                Export Analysis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Semester Dialog */}
      <Dialog open={!!editingSemester} onOpenChange={(open) => !open && setEditingSemester(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingSemester?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">SGPA</label>
              <Input
                type="number"
                step="0.01"
                value={editSgpa}
                onChange={(e) => setEditSgpa(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Credits</label>
              <Input
                type="number"
                value={editCredits}
                onChange={(e) => setEditCredits(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} className="flex-1 gradient-primary">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingSemester(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryPage;
