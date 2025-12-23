import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Calculator, 
  Calendar, 
  Bell, 
  Wallet, 
  Clock, 
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Users
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "CGPA Calculator",
    description: "Calculate your cumulative GPA with support for multiple semesters and grading scales.",
    color: "bg-primary/10 text-primary"
  },
  {
    icon: CheckCircle2,
    title: "Attendance Tracker",
    description: "Monitor your class attendance and get alerts when you're falling below requirements.",
    color: "bg-success/10 text-success"
  },
  {
    icon: Clock,
    title: "Timetable Manager",
    description: "Organize your class schedule with an intuitive calendar interface.",
    color: "bg-info/10 text-info"
  },
  {
    icon: Calendar,
    title: "Holiday Calendar",
    description: "Keep track of academic holidays and important dates throughout the year.",
    color: "bg-warning/10 text-warning"
  },
  {
    icon: Wallet,
    title: "Expense Tracking",
    description: "Manage your student budget with detailed expense categorization and charts.",
    color: "bg-chart-4/10 text-chart-4"
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Never miss a deadline with intelligent reminder parsing from messages.",
    color: "bg-destructive/10 text-destructive"
  }
];

const stats = [
  { value: "10K+", label: "Active Students" },
  { value: "50K+", label: "Tasks Tracked" },
  { value: "98%", label: "Satisfaction" },
  { value: "24/7", label: "Available" }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">StudySync</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="font-medium">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button className="gradient-primary font-medium">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Your Ultimate Student Companion
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-foreground mb-6 leading-tight animate-slide-up">
            Manage Your
            <span className="block bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">
              Academic Life
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Track your grades, manage attendance, organize expenses, and never miss a deadline. 
            All your student tools in one beautiful place.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/login">
              <Button size="lg" className="gradient-primary text-lg px-8 py-6 shadow-glow">
                Start Free Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed specifically for students to excel in their academic journey.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="card-elevated p-8 hover:shadow-soft transition-all duration-300 group animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="gradient-primary rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
                Ready to Excel?
              </h2>
              <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
                Join thousands of students who are already using StudySync to manage their academic life more effectively.
              </p>
              <Link to="/login">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6 font-semibold">
                  Get Started for Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">StudySync</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 StudySync. Built for students, by students.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
