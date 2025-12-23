import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, Calculator, Save, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AttendanceRecord {
  id: string;
  subject: string;
  attended: number;
  total: number;
  required: number;
}

const Attendance = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [subject, setSubject] = useState("");
  const [attended, setAttended] = useState("");
  const [total, setTotal] = useState("");
  const [required, setRequired] = useState("75");
  const [loading, setLoading] = useState(true);
  const [currentResult, setCurrentResult] = useState<{
    percentage: number;
    status: string;
    canSkip: number;
    needToAttend: number;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRecords(data?.map(r => ({
        id: r.id,
        subject: r.subject,
        attended: r.attended,
        total: r.total,
        required: r.required
      })) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching records",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendance = () => {
    const attendedNum = parseInt(attended);
    const totalNum = parseInt(total);
    const requiredNum = parseInt(required);

    if (isNaN(attendedNum) || isNaN(totalNum) || isNaN(requiredNum)) {
      toast({
        title: "Invalid input",
        description: "Please enter valid numbers.",
        variant: "destructive"
      });
      return;
    }

    if (attendedNum > totalNum) {
      toast({
        title: "Invalid input",
        description: "Attended classes cannot exceed total classes.",
        variant: "destructive"
      });
      return;
    }

    const percentage = (attendedNum / totalNum) * 100;
    let status = "";
    let canSkip = 0;
    let needToAttend = 0;

    if (percentage >= requiredNum) {
      status = "safe";
      canSkip = Math.floor((attendedNum * 100 / requiredNum) - totalNum);
    } else {
      status = "danger";
      needToAttend = Math.ceil((requiredNum * totalNum - attendedNum * 100) / (100 - requiredNum));
    }

    setCurrentResult({
      percentage,
      status,
      canSkip: Math.max(0, canSkip),
      needToAttend: Math.max(0, needToAttend)
    });
  };

  const handleSaveRecord = async () => {
    if (!subject || !attended || !total) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          user_id: user?.id,
          subject,
          attended: parseInt(attended),
          total: parseInt(total),
          required: parseInt(required)
        })
        .select()
        .single();

      if (error) throw error;

      setRecords([{
        id: data.id,
        subject: data.subject,
        attended: data.attended,
        total: data.total,
        required: data.required
      }, ...records]);
      
      toast({
        title: "Record saved",
        description: `Attendance for ${subject} has been saved.`
      });
      
      handleReset();
    } catch (error: any) {
      toast({
        title: "Error saving record",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecords(records.filter(r => r.id !== id));
      toast({
        title: "Record deleted",
        description: "The attendance record has been removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting record",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setSubject("");
    setAttended("");
    setTotal("");
    setRequired("75");
    setCurrentResult(null);
  };

  const getAttendanceStatus = (attended: number, total: number, required: number) => {
    const percentage = (attended / total) * 100;
    if (percentage >= required + 10) return { color: "text-success", bg: "bg-success", label: "Excellent" };
    if (percentage >= required) return { color: "text-success", bg: "bg-success", label: "Safe" };
    if (percentage >= required - 5) return { color: "text-warning", bg: "bg-warning", label: "Warning" };
    return { color: "text-destructive", bg: "bg-destructive", label: "Critical" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Formula Banner */}
      <div className="bg-gradient-to-r from-accent via-accent/50 to-accent/30 rounded-xl p-4 text-center">
        <p className="text-lg font-medium text-foreground">
          <span className="font-bold">Attendance Formula:</span> Attendance % = (Classes Attended / Total Classes) × 100
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-success to-success/70">
            <CardTitle className="text-success-foreground flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Attendance Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="font-medium mb-2 block">Subject Name</label>
              <Input 
                placeholder="e.g., Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium mb-2 block">Classes Attended</label>
                <Input 
                  type="number"
                  placeholder="e.g., 45"
                  value={attended}
                  onChange={(e) => setAttended(e.target.value)}
                />
              </div>
              <div>
                <label className="font-medium mb-2 block">Total Classes</label>
                <Input 
                  type="number"
                  placeholder="e.g., 60"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="font-medium mb-2 block">Minimum Required Percentage</label>
              <Input 
                type="number"
                value={required}
                onChange={(e) => setRequired(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={calculateAttendance} className="bg-primary hover:bg-primary/90">
                <Calculator className="w-4 h-4 mr-2" />
                Calculate
              </Button>
              <Button onClick={handleSaveRecord} className="bg-success hover:bg-success/90">
                <Save className="w-4 h-4 mr-2" />
                Save Record
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-chart-4/80 to-primary/80">
            <CardTitle className="text-primary-foreground flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Attendance Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!currentResult ? (
              <div className="text-center py-12">
                <CheckSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your attendance details to see your status and recommendations
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Percentage Display */}
                <div className="text-center">
                  <div className={`text-6xl font-bold mb-2 ${
                    currentResult.status === "safe" ? "text-success" : "text-destructive"
                  }`}>
                    {currentResult.percentage.toFixed(1)}%
                  </div>
                  <p className="text-muted-foreground">Current Attendance</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{parseInt(required)}% Required</span>
                  </div>
                  <Progress 
                    value={currentResult.percentage} 
                    className="h-3"
                  />
                </div>

                {/* Status Cards */}
                {currentResult.status === "safe" ? (
                  <Card className="bg-success/10 border-success/30">
                    <CardContent className="p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-success">You're Safe!</h4>
                        <p className="text-sm text-muted-foreground">
                          You can skip up to <span className="font-bold text-success">{currentResult.canSkip} classes</span> and still maintain {required}% attendance.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-destructive/10 border-destructive/30">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-destructive">Attendance Low!</h4>
                        <p className="text-sm text-muted-foreground">
                          You need to attend <span className="font-bold text-destructive">{currentResult.needToAttend} more classes</span> consecutively to reach {required}% attendance.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Note: Saved attendance records are available in the History tab */}
    </div>
  );
};

export default Attendance;
