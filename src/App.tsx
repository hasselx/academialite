import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import Reminders from "./pages/dashboard/Reminders";
import CGPACalculator from "./pages/dashboard/CGPACalculator";
import Attendance from "./pages/dashboard/Attendance";
import Timetable from "./pages/dashboard/Timetable";
import CalendarPage from "./pages/dashboard/Calendar";
import Expenses from "./pages/dashboard/Expenses";
import HistoryPage from "./pages/dashboard/History";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Reminders />} />
            <Route path="cgpa" element={<CGPACalculator />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
