import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Minus
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO, isWithinInterval, subWeeks, eachMonthOfInterval, eachWeekOfInterval, getWeek } from "date-fns";

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface Category {
  value: string;
  label: string;
  emoji: string;
  color: string;
}

interface ExpenseAnalyticsProps {
  expenses: Expense[];
  categories: Category[];
  currency: { symbol: string; code: string };
}

const ExpenseAnalytics = ({ expenses, categories, currency }: ExpenseAnalyticsProps) => {
  const [timeRange, setTimeRange] = useState<"6months" | "12months">("6months");

  const formatCurrency = (value: number) => {
    return `${currency.symbol}${value.toLocaleString()}`;
  };

  const getCategoryInfo = (value: string): Category => {
    const found = categories.find(c => c.value === value);
    if (found) return found;
    return { value, label: value, emoji: "📌", color: "#6366f1" };
  };

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const now = new Date();
    const monthsBack = timeRange === "6months" ? 6 : 12;
    const startDate = startOfMonth(subMonths(now, monthsBack - 1));
    
    const months = eachMonthOfInterval({
      start: startDate,
      end: endOfMonth(now)
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthExpenses = expenses.filter(exp => {
        const expDate = parseISO(exp.date);
        return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
      });

      const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Category breakdown for this month
      const categoryTotals: { [key: string]: number } = {};
      monthExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      });

      return {
        month: format(month, "MMM"),
        fullMonth: format(month, "MMMM yyyy"),
        total,
        ...categoryTotals
      };
    });
  }, [expenses, timeRange]);

  // Weekly trend data (last 8 weeks)
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks = eachWeekOfInterval({
      start: subWeeks(now, 7),
      end: now
    }, { weekStartsOn: 1 });

    return weeks.map(week => {
      const weekStart = startOfWeek(week, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
      
      const weekExpenses = expenses.filter(exp => {
        const expDate = parseISO(exp.date);
        return isWithinInterval(expDate, { start: weekStart, end: weekEnd });
      });

      const total = weekExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      return {
        week: `W${getWeek(week)}`,
        weekRange: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
        total
      };
    });
  }, [expenses]);

  // Spending insights
  const insights = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthExpenses = expenses.filter(exp => {
      const expDate = parseISO(exp.date);
      return isWithinInterval(expDate, { start: currentMonthStart, end: currentMonthEnd });
    });

    const lastMonthExpenses = expenses.filter(exp => {
      const expDate = parseISO(exp.date);
      return isWithinInterval(expDate, { start: lastMonthStart, end: lastMonthEnd });
    });

    const currentTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const lastTotal = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const percentChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    // Top spending category this month
    const categoryTotals: { [key: string]: number } = {};
    currentMonthExpenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const topCategoryInfo = topCategory ? getCategoryInfo(topCategory[0]) : null;

    // Average daily spending this month
    const daysInMonth = now.getDate();
    const avgDaily = currentTotal / daysInMonth;

    // Most expensive day
    const dailyTotals: { [key: string]: number } = {};
    currentMonthExpenses.forEach(exp => {
      dailyTotals[exp.date] = (dailyTotals[exp.date] || 0) + exp.amount;
    });
    const mostExpensiveDay = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1])[0];

    // Spending streak (days with expenses)
    const uniqueDays = new Set(currentMonthExpenses.map(exp => exp.date)).size;

    return {
      currentTotal,
      lastTotal,
      percentChange,
      topCategory: topCategoryInfo,
      topCategoryAmount: topCategory ? topCategory[1] : 0,
      avgDaily,
      mostExpensiveDay: mostExpensiveDay ? {
        date: format(parseISO(mostExpensiveDay[0]), "MMM d"),
        amount: mostExpensiveDay[1]
      } : null,
      uniqueDays,
      transactionCount: currentMonthExpenses.length
    };
  }, [expenses, categories]);

  // Category comparison (this month vs last month)
  const categoryComparison = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const currentTotals: { [key: string]: number } = {};
    const lastTotals: { [key: string]: number } = {};

    expenses.forEach(exp => {
      const expDate = parseISO(exp.date);
      if (isWithinInterval(expDate, { start: currentMonthStart, end: currentMonthEnd })) {
        currentTotals[exp.category] = (currentTotals[exp.category] || 0) + exp.amount;
      } else if (isWithinInterval(expDate, { start: lastMonthStart, end: lastMonthEnd })) {
        lastTotals[exp.category] = (lastTotals[exp.category] || 0) + exp.amount;
      }
    });

    const allCategories = new Set([...Object.keys(currentTotals), ...Object.keys(lastTotals)]);
    
    return Array.from(allCategories).map(cat => {
      const catInfo = getCategoryInfo(cat);
      const current = currentTotals[cat] || 0;
      const last = lastTotals[cat] || 0;
      const change = last > 0 ? ((current - last) / last) * 100 : (current > 0 ? 100 : 0);

      return {
        category: catInfo.label,
        emoji: catInfo.emoji,
        color: catInfo.color,
        current,
        last,
        change
      };
    }).sort((a, b) => b.current - a.current);
  }, [expenses, categories]);

  // Get unique categories from monthly data for chart
  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    monthlyData.forEach(month => {
      Object.keys(month).forEach(key => {
        if (key !== 'month' && key !== 'fullMonth' && key !== 'total') {
          cats.add(key);
        }
      });
    });
    return Array.from(cats);
  }, [monthlyData]);

  return (
    <div className="space-y-6">
      {/* Insights Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">vs Last Month</p>
                <div className="flex items-center gap-2 mt-1">
                  {insights.percentChange > 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-destructive" />
                  ) : insights.percentChange < 0 ? (
                    <ArrowDownRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <Minus className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={`text-xl font-bold ${
                    insights.percentChange > 0 ? 'text-destructive' : 
                    insights.percentChange < 0 ? 'text-green-500' : 'text-muted-foreground'
                  }`}>
                    {Math.abs(insights.percentChange).toFixed(1)}%
                  </span>
                </div>
              </div>
              {insights.percentChange > 0 ? (
                <TrendingUp className="w-8 h-8 text-destructive/50" />
              ) : (
                <TrendingDown className="w-8 h-8 text-green-500/50" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Daily</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(Math.round(insights.avgDaily))}</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Top Category</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg">{insights.topCategory?.emoji || "📌"}</span>
              <span className="text-lg font-bold truncate">{insights.topCategory?.label || "None"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-xl font-bold mt-1">{insights.transactionCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Spending Trends
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={timeRange === "6months" ? "default" : "outline"} 
                size="sm"
                onClick={() => setTimeRange("6months")}
              >
                6 Months
              </Button>
              <Button 
                variant={timeRange === "12months" ? "default" : "outline"} 
                size="sm"
                onClick={() => setTimeRange("12months")}
              >
                12 Months
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full max-w-xs grid-cols-2 mb-4">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
            </TabsList>
            
            <TabsContent value="monthly" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${currency.symbol}${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Total"]}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullMonth || label}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#totalGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="weekly" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${currency.symbol}${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Total"]}
                    labelFormatter={(label, payload) => payload[0]?.payload?.weekRange || label}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Category Comparison */}
      {categoryComparison.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Category Comparison
              <span className="text-sm font-normal text-muted-foreground">
                (This Month vs Last Month)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryComparison.slice(0, 6).map((cat, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">{cat.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(cat.current)}</span>
                        {cat.change !== 0 && (
                          <span className={`text-xs flex items-center ${
                            cat.change > 0 ? 'text-destructive' : 'text-green-500'
                          }`}>
                            {cat.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(cat.change).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.min((cat.current / (categoryComparison[0]?.current || 1)) * 100, 100)}%`,
                          backgroundColor: cat.color 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Expensive Day */}
      {insights.mostExpensiveDay && (
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Highest Spending Day This Month</p>
                <p className="text-lg font-bold mt-1">{insights.mostExpensiveDay.date}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-500">
                  {formatCurrency(insights.mostExpensiveDay.amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExpenseAnalytics;
