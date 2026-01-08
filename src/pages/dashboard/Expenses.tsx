import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Plus, Trash2, PieChart, TrendingUp, DollarSign, Loader2, Filter, Target, ArrowDownCircle, Calendar as CalendarIcon, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimeSettings } from "@/hooks/useTimeSettings";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

const categories = [
  { value: "food", label: "🍔 Food", color: "#10b981" },
  { value: "transport", label: "🚗 Transport", color: "#14b8a6" },
  { value: "education", label: "📚 Education", color: "#f59e0b" },
  { value: "entertainment", label: "🎬 Entertainment", color: "#ef4444" },
  { value: "shopping", label: "🛍️ Shopping", color: "#ec4899" },
  { value: "health", label: "🏥 Health", color: "#f97316" },
  { value: "bills", label: "💡 Bills", color: "#22c55e" },
  { value: "other", label: "📌 Other", color: "#6366f1" },
];

// Currency mapping based on country code
const currencyMap: { [key: string]: { symbol: string; code: string } } = {
  "IN": { symbol: "₹", code: "INR" },
  "DE": { symbol: "€", code: "EUR" },
  "US-EST": { symbol: "$", code: "USD" },
  "US-PST": { symbol: "$", code: "USD" },
  "GB": { symbol: "£", code: "GBP" },
  "JP": { symbol: "¥", code: "JPY" },
  "AU-SYD": { symbol: "A$", code: "AUD" },
  "SG": { symbol: "S$", code: "SGD" },
  "AE": { symbol: "د.إ", code: "AED" },
  "CA-TOR": { symbol: "C$", code: "CAD" },
};

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("month");
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const saved = localStorage.getItem('monthlyBudget');
    return saved ? parseFloat(saved) : 0;
  });
  const [budgetInput, setBudgetInput] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { countryCode } = useTimeSettings();

  const currency = currencyMap[countryCode] || currencyMap["IN"];

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;

      setExpenses(data?.map(e => ({
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        description: e.description || '',
        date: e.date
      })) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching expenses",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses based on category and period
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return expenses.filter(expense => {
      // Category filter
      if (filterCategory !== "all" && expense.category !== filterCategory) {
        return false;
      }

      // Period filter
      if (filterPeriod === "month") {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
      }

      return true;
    });
  }, [expenses, filterCategory, filterPeriod]);

  // Current month expenses for stats
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.date);
      return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
    });
  }, [expenses]);

  const currentMonthTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const filteredTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balance = monthlyBudget - currentMonthTotal;

  const getCategoryData = () => {
    const categoryTotals: { [key: string]: number } = {};
    
    filteredExpenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    return categories
      .filter(cat => categoryTotals[cat.value])
      .map(cat => ({
        name: cat.label.split(' ')[1],
        value: categoryTotals[cat.value],
        color: cat.color,
        percentage: filteredTotal > 0 ? ((categoryTotals[cat.value] / filteredTotal) * 100).toFixed(1) : "0"
      }));
  };

  const pieData = getCategoryData();

  const resetForm = () => {
    setCategory("");
    setAmount("");
    setDescription("");
    setExpenseDate(new Date());
  };

  const handleAddExpense = async () => {
    if (!category || !amount) {
      toast({
        title: "Missing information",
        description: "Please select a category and enter an amount.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user?.id,
          category,
          amount: parseFloat(amount),
          description: description || null,
          date: format(expenseDate, 'yyyy-MM-dd')
        })
        .select()
        .single();

      if (error) throw error;

      setExpenses([{
        id: data.id,
        category: data.category,
        amount: Number(data.amount),
        description: data.description || '',
        date: data.date
      }, ...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      resetForm();
      setShowAddDialog(false);

      toast({
        title: "Expense added",
        description: `${currency.symbol}${amount} added to ${category}.`
      });
    } catch (error: any) {
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setCategory(expense.category);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setExpenseDate(parseISO(expense.date));
    setShowEditDialog(true);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !category || !amount) {
      toast({
        title: "Missing information",
        description: "Please select a category and enter an amount.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          category,
          amount: parseFloat(amount),
          description: description || null,
          date: format(expenseDate, 'yyyy-MM-dd')
        })
        .eq('id', editingExpense.id);

      if (error) throw error;

      setExpenses(expenses.map(e => 
        e.id === editingExpense.id 
          ? { ...e, category, amount: parseFloat(amount), description, date: format(expenseDate, 'yyyy-MM-dd') }
          : e
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      resetForm();
      setEditingExpense(null);
      setShowEditDialog(false);

      toast({
        title: "Expense updated",
        description: "Your expense has been updated successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error updating expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExpenses(expenses.filter(e => e.id !== id));
      toast({
        title: "Expense deleted",
        description: "The expense has been removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveBudget = () => {
    const budget = parseFloat(budgetInput);
    if (isNaN(budget) || budget < 0) {
      toast({
        title: "Invalid budget",
        description: "Please enter a valid budget amount.",
        variant: "destructive"
      });
      return;
    }
    setMonthlyBudget(budget);
    localStorage.setItem('monthlyBudget', budget.toString());
    setShowBudgetDialog(false);
    setBudgetInput("");
    toast({
      title: "Budget set",
      description: `Monthly budget set to ${currency.symbol}${budget.toLocaleString()}`
    });
  };

  const getCategoryInfo = (value: string) => {
    return categories.find(c => c.value === value) || categories[categories.length - 1];
  };

  const formatCurrency = (value: number) => {
    return `${currency.symbol}${value.toLocaleString()}`;
  };

  const currentMonth = format(new Date(), 'MMMM yyyy');

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-7 h-7 text-primary" />
            Your Expenses
          </h1>
          <p className="text-muted-foreground">Track and manage your spending • {currentMonth}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Target className="w-4 h-4 mr-2" />
                Set Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Monthly Budget</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="font-medium mb-2 block">Budget Amount ({currency.code})</label>
                  <Input 
                    type="number"
                    placeholder={`e.g., 10000`}
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                  />
                  {monthlyBudget > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Current budget: {formatCurrency(monthlyBudget)}
                    </p>
                  )}
                </div>
                <Button onClick={handleSaveBudget} className="w-full gradient-primary">
                  Save Budget
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="font-medium mb-2 block">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="font-medium mb-2 block">Amount ({currency.code})</label>
                  <Input 
                    type="number"
                    placeholder="e.g., 500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-medium mb-2 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !expenseDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expenseDate}
                        onSelect={(date) => date && setExpenseDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="font-medium mb-2 block">Description (optional)</label>
                  <Input 
                    placeholder="e.g., Lunch at cafeteria"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddExpense} className="w-full gradient-primary">
                  Add Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Expense Dialog */}
          <Dialog open={showEditDialog} onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) {
              resetForm();
              setEditingExpense(null);
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="font-medium mb-2 block">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="font-medium mb-2 block">Amount ({currency.code})</label>
                  <Input 
                    type="number"
                    placeholder="e.g., 500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-medium mb-2 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !expenseDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expenseDate}
                        onSelect={(date) => date && setExpenseDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="font-medium mb-2 block">Description (optional)</label>
                  <Input 
                    placeholder="e.g., Lunch at cafeteria"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button onClick={handleUpdateExpense} className="w-full gradient-primary">
                  Update Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget & Stats Row */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {monthlyBudget > 0 ? formatCurrency(monthlyBudget) : "Not Set"}
              </div>
              <div className="text-sm text-muted-foreground">Monthly Budget</div>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <ArrowDownCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(currentMonthTotal)}</div>
              <div className="text-sm text-muted-foreground">This Month's Expenses</div>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${balance >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <DollarSign className={`w-6 h-6 ${balance >= 0 ? 'text-success' : 'text-destructive'}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {monthlyBudget > 0 ? formatCurrency(Math.abs(balance)) : "—"}
              </div>
              <div className="text-sm text-muted-foreground">
                {balance >= 0 ? "Remaining" : "Over Budget"}
              </div>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-warning" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{currentMonthExpenses.length}</div>
              <div className="text-sm text-muted-foreground">Transactions This Month</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Budget Progress Bar */}
      {monthlyBudget > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Budget Progress</span>
            <span className="text-sm text-muted-foreground">
              {((currentMonthTotal / monthlyBudget) * 100).toFixed(1)}% used
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                currentMonthTotal / monthlyBudget > 1 
                  ? 'bg-destructive' 
                  : currentMonthTotal / monthlyBudget > 0.8 
                    ? 'bg-warning' 
                    : 'bg-success'
              }`}
              style={{ width: `${Math.min((currentMonthTotal / monthlyBudget) * 100, 100)}%` }}
            />
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[150px]">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterCategory !== "all" || filterPeriod !== "month") && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFilterCategory("all");
                setFilterPeriod("month");
              }}
            >
              Clear Filters
            </Button>
          )}
          <div className="ml-auto text-sm text-muted-foreground">
            Showing: {formatCurrency(filteredTotal)} ({filteredExpenses.length} transactions)
          </div>
        </div>
      </Card>

      {expenses.length === 0 ? (
        <Card className="p-12 text-center">
          <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No expenses recorded yet. Add your first expense above!</p>
        </Card>
      ) : filteredExpenses.length === 0 ? (
        <Card className="p-12 text-center">
          <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No expenses match your filters. Try adjusting them.</p>
        </Card>
      ) : (
        <>
          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Expense Distribution
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Amount']}
                    />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Category Breakdown */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Category Breakdown</h3>
              <div className="grid grid-cols-2 gap-4">
                {pieData.map((item) => (
                  <div key={item.name} className="p-4 rounded-xl border border-border/50 hover:border-border transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: item.color }}>
                      {formatCurrency(item.value)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.percentage}% of total
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>
                {filterPeriod === "month" ? "This Month's Transactions" : "All Transactions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredExpenses.slice(0, 15).map((expense) => {
                  const catInfo = getCategoryInfo(expense.category);
                  return (
                    <div 
                      key={expense.id} 
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${catInfo.color}20` }}
                        >
                          {catInfo.label.split(' ')[0]}
                        </div>
                        <div>
                          <div className="font-medium">{catInfo.label.split(' ')[1]}</div>
                          <div className="text-sm text-muted-foreground">
                            {expense.description || 'No description'} • {new Date(expense.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold" style={{ color: catInfo.color }}>
                          {formatCurrency(expense.amount)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => handleEditExpense(expense)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Expenses;
