import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History as HistoryIcon, Clock, CheckCircle2, XCircle } from "lucide-react";

interface HistoryItem {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  type: "success" | "info" | "warning";
}

const mockHistory: HistoryItem[] = [
  { id: "1", action: "CGPA Calculated", description: "Overall CGPA: 7.85 from 8 semesters", timestamp: "2024-12-23 10:30 AM", type: "success" },
  { id: "2", action: "Reminder Added", description: "Data Science Assignment - Due Dec 25", timestamp: "2024-12-23 09:15 AM", type: "info" },
  { id: "3", action: "Expense Added", description: "₹1,500 for Books", timestamp: "2024-12-22 04:45 PM", type: "info" },
  { id: "4", action: "Attendance Updated", description: "Machine Learning: 78% attendance", timestamp: "2024-12-22 02:00 PM", type: "success" },
  { id: "5", action: "Class Added", description: "Web Development - Thursday 2PM", timestamp: "2024-12-21 11:30 AM", type: "info" },
  { id: "6", action: "Semester Added", description: "Semester 8: SGPA 7.0, 18 credits", timestamp: "2024-12-20 03:20 PM", type: "success" },
  { id: "7", action: "Reminder Completed", description: "Database Assignment submitted", timestamp: "2024-12-19 11:59 PM", type: "success" },
  { id: "8", action: "Budget Alert", description: "Monthly budget exceeded by ₹2,000", timestamp: "2024-12-18 08:00 AM", type: "warning" },
];

const HistoryPage = () => {
  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" };
      case "warning":
        return { icon: XCircle, color: "text-warning", bg: "bg-warning/10" };
      default:
        return { icon: Clock, color: "text-info", bg: "bg-info/10" };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HistoryIcon className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Activity History</h1>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {mockHistory.map((item, index) => {
                const { icon: Icon, color, bg } = getTypeStyles(item.type);
                
                return (
                  <div key={item.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className={`relative z-10 w-12 h-12 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{item.action}</h3>
                          <p className="text-muted-foreground mt-1">{item.description}</p>
                        </div>
                        <time className="text-sm text-muted-foreground whitespace-nowrap">
                          {item.timestamp}
                        </time>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoryPage;
