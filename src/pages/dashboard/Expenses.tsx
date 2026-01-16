import { useState, useEffect, useMemo, useCallback } from "react";

const ITEMS_PER_PAGE = 15;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wallet, Plus, Trash2, PieChart, TrendingUp, DollarSign, Loader2, Filter, Target, ArrowDownCircle, Calendar as CalendarIcon, Pencil, RefreshCw, Power, PowerOff, Settings, Tag, BarChart3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimeSettings } from "@/hooks/useTimeSettings";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfWeek, getDay, getWeek, getMonth, subMonths } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import ExpenseAnalytics from "@/components/ExpenseAnalytics";

const frequencies = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface RecurringExpense {
  id: string;
  category: string;
  amount: number;
  description: string;
  frequency: string;
  day_of_month: number;
  is_active: boolean;
  last_generated: string | null;
}

interface Category {
  value: string;
  label: string;
  emoji: string;
  color: string;
  id?: string;
  is_default?: boolean;
}

const defaultCategories: Category[] = [
  { value: "food", label: "Food", emoji: "🍔", color: "#344e41", is_default: true },
  { value: "transport", label: "Transport", emoji: "🚗", color: "#ffb703", is_default: true },
  { value: "education", label: "Education", emoji: "📚", color: "#7b2cbf", is_default: true },
  { value: "entertainment", label: "Entertainment", emoji: "🎬", color: "#d90429", is_default: true },
  { value: "shopping", label: "Shopping", emoji: "🛍️", color: "#3d348b", is_default: true },
  { value: "health", label: "Health", emoji: "🏥", color: "#72808a", is_default: true },
  { value: "bills", label: "Bills", emoji: "💡", color: "#0096c7", is_default: true },
  { value: "other", label: "Other", emoji: "📌", color: "#2d6a4f", is_default: true },
];

const emojiOptions = ["🍔", "🚗", "📚", "🎬", "🛍️", "🏥", "💡", "📌", "💰", "🏠", "✈️", "🎮", "🎵", "📱", "💻", "🎁", "☕", "🍕", "🎨", "⚽"];
const colorOptions = ["#344e41", "#ffb703", "#7b2cbf", "#d90429", "#3d348b", "#72808a", "#8f2d56", "#2d6a4f", "#a1c6ea"];

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
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showManageRecurringDialog, setShowManageRecurringDialog] = useState(false);
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("month");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const saved = localStorage.getItem('monthlyBudget');
    return saved ? parseFloat(saved) : 0;
  });
  const [budgetInput, setBudgetInput] = useState("");
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState("1");
  const [recurringFrequency, setRecurringFrequency] = useState("monthly");
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState("1");
  const [recurringMonth, setRecurringMonth] = useState("1");
  // New category form state
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("📌");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366f1");
  const { toast } = useToast();
  const { user } = useAuth();
  const { countryCode } = useTimeSettings();

  const currency = currencyMap[countryCode] || currencyMap["IN"];

  // Combine default and custom categories
  const categories = useMemo(() => {
    const combined = [...defaultCategories];
    customCategories.forEach(cat => {
      const existingIndex = combined.findIndex(c => c.value === cat.value);
      if (existingIndex === -1) {
        combined.push(cat);
      }
    });
    return combined;
  }, [customCategories]);

  // Fetch custom categories
  const fetchCustomCategories = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setCustomCategories(data?.map(c => ({
        id: c.id,
        value: c.value,
        label: c.label,
        emoji: c.emoji,
        color: c.color,
        is_default: c.is_default
      })) || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  }, [user]);

  const fetchRecurringExpenses = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRecurringExpenses(data?.map(r => ({
        id: r.id,
        category: r.category,
        amount: Number(r.amount),
        description: r.description || '',
        frequency: r.frequency,
        day_of_month: r.day_of_month,
        is_active: r.is_active,
        last_generated: r.last_generated
      })) || []);
    } catch (error: any) {
      console.error('Error fetching recurring expenses:', error);
    }
  }, [user]);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
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
  }, [user, toast]);

  // Generate expenses from recurring templates
  const generateRecurringExpenses = useCallback(async () => {
    if (!user || recurringExpenses.length === 0) return;

    const today = new Date();
    const currentDay = today.getDate();
    const currentDayOfWeek = getDay(today);
    const currentWeek = getWeek(today);
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const currentMonthStr = format(today, 'yyyy-MM');
    const currentWeekStr = `${currentYear}-W${currentWeek}`;
    const currentYearStr = `${currentYear}`;

    for (const recurring of recurringExpenses) {
      if (!recurring.is_active) continue;

      const lastGen = recurring.last_generated ? parseISO(recurring.last_generated) : null;
      let shouldGenerate = false;
      let expenseDate = today;

      if (recurring.frequency === 'weekly') {
        // Generate weekly on the specified day of week
        const lastGenWeek = lastGen ? `${lastGen.getFullYear()}-W${getWeek(lastGen)}` : null;
        if (lastGenWeek !== currentWeekStr && currentDayOfWeek === recurring.day_of_month) {
          shouldGenerate = true;
          expenseDate = today;
        }
      } else if (recurring.frequency === 'monthly') {
        // Generate monthly on the specified day
        const lastGenMonth = lastGen ? format(lastGen, 'yyyy-MM') : null;
        if (lastGenMonth !== currentMonthStr && currentDay >= recurring.day_of_month) {
          shouldGenerate = true;
          expenseDate = new Date(today.getFullYear(), today.getMonth(), recurring.day_of_month);
        }
      } else if (recurring.frequency === 'yearly') {
        // Generate yearly on the specified month and day
        const lastGenYear = lastGen ? `${lastGen.getFullYear()}` : null;
        // day_of_month stores: month * 100 + day (e.g., 115 = Jan 15, 1225 = Dec 25)
        const targetMonth = Math.floor(recurring.day_of_month / 100);
        const targetDay = recurring.day_of_month % 100;
        if (lastGenYear !== currentYearStr && currentMonth >= targetMonth && (currentMonth > targetMonth || currentDay >= targetDay)) {
          shouldGenerate = true;
          expenseDate = new Date(today.getFullYear(), targetMonth - 1, targetDay);
        }
      }

      if (shouldGenerate) {
        try {
          const { error: insertError } = await supabase
            .from('expenses')
            .insert({
              user_id: user.id,
              category: recurring.category,
              amount: recurring.amount,
              description: `${recurring.description || ''} (Recurring)`.trim(),
              date: format(expenseDate, 'yyyy-MM-dd')
            });

          if (insertError) throw insertError;

          await supabase
            .from('recurring_expenses')
            .update({ last_generated: format(today, 'yyyy-MM-dd') })
            .eq('id', recurring.id);

        } catch (error) {
          console.error('Error generating recurring expense:', error);
        }
      }
    }

    fetchExpenses();
    fetchRecurringExpenses();
  }, [user, recurringExpenses, fetchExpenses, fetchRecurringExpenses]);

  useEffect(() => {
    if (user) {
      fetchCustomCategories();
      fetchExpenses();
      fetchRecurringExpenses();
    }
  }, [user, fetchCustomCategories, fetchExpenses, fetchRecurringExpenses]);

  // Auto-generate recurring expenses on load
  useEffect(() => {
    if (recurringExpenses.length > 0) {
      generateRecurringExpenses();
    }
  }, [recurringExpenses.length]);

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

  // Previous month expenses for comparison
  const previousMonthExpenses = useMemo(() => {
    const now = new Date();
    const prevMonth = subMonths(now, 1);
    const monthStart = startOfMonth(prevMonth);
    const monthEnd = endOfMonth(prevMonth);

    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.date);
      return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
    });
  }, [expenses]);

  const currentMonthTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const previousMonthTotal = previousMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const filteredTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balance = monthlyBudget - currentMonthTotal;

  // Calculate percentage changes
  const expenseChangePercent = previousMonthTotal > 0 
    ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 
    : 0;
  const transactionChangePercent = previousMonthExpenses.length > 0 
    ? ((currentMonthExpenses.length - previousMonthExpenses.length) / previousMonthExpenses.length) * 100 
    : 0;

  const getCategoryData = () => {
    const categoryTotals: { [key: string]: number } = {};
    
    filteredExpenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    return categories
      .filter(cat => categoryTotals[cat.value])
      .map(cat => ({
        name: cat.label,
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
    setRecurringDayOfMonth("1");
    setRecurringFrequency("monthly");
    setRecurringDayOfWeek("1");
    setRecurringMonth("1");
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

  const handleAddRecurringExpense = async () => {
    if (!category || !amount) {
      toast({
        title: "Missing information",
        description: "Please select a category and enter an amount.",
        variant: "destructive"
      });
      return;
    }

    let dayValue: number;
    
    if (recurringFrequency === 'weekly') {
      dayValue = parseInt(recurringDayOfWeek);
      if (isNaN(dayValue) || dayValue < 0 || dayValue > 6) {
        toast({
          title: "Invalid day",
          description: "Please select a valid day of the week.",
          variant: "destructive"
        });
        return;
      }
    } else if (recurringFrequency === 'yearly') {
      const monthNum = parseInt(recurringMonth);
      const dayNum = parseInt(recurringDayOfMonth);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(dayNum) || dayNum < 1 || dayNum > 28) {
        toast({
          title: "Invalid date",
          description: "Please select a valid month and day.",
          variant: "destructive"
        });
        return;
      }
      dayValue = monthNum * 100 + dayNum; // Encode as MMDD
    } else {
      dayValue = parseInt(recurringDayOfMonth);
      if (isNaN(dayValue) || dayValue < 1 || dayValue > 28) {
        toast({
          title: "Invalid day",
          description: "Day of month must be between 1 and 28.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
          user_id: user?.id,
          category,
          amount: parseFloat(amount),
          description: description || null,
          frequency: recurringFrequency,
          day_of_month: dayValue,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setRecurringExpenses([{
        id: data.id,
        category: data.category,
        amount: Number(data.amount),
        description: data.description || '',
        frequency: data.frequency,
        day_of_month: data.day_of_month,
        is_active: data.is_active,
        last_generated: data.last_generated
      }, ...recurringExpenses]);

      resetForm();
      setShowRecurringDialog(false);

      const frequencyLabel = recurringFrequency === 'weekly' ? 'week' : recurringFrequency === 'yearly' ? 'year' : 'month';
      toast({
        title: "Recurring expense added",
        description: `${currency.symbol}${amount} will be logged each ${frequencyLabel}.`
      });
    } catch (error: any) {
      toast({
        title: "Error adding recurring expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleToggleRecurring = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      setRecurringExpenses(recurringExpenses.map(r => 
        r.id === id ? { ...r, is_active: !isActive } : r
      ));

      toast({
        title: isActive ? "Recurring expense paused" : "Recurring expense activated",
        description: isActive ? "This expense won't be logged automatically." : "This expense will be logged automatically."
      });
    } catch (error: any) {
      toast({
        title: "Error updating recurring expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecurringExpenses(recurringExpenses.filter(r => r.id !== id));
      toast({
        title: "Recurring expense deleted",
        description: "The recurring expense has been removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting recurring expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditRecurring = (recurring: RecurringExpense) => {
    setEditingRecurring(recurring);
    setCategory(recurring.category);
    setAmount(recurring.amount.toString());
    setDescription(recurring.description);
    setRecurringFrequency(recurring.frequency);
    
    if (recurring.frequency === 'weekly') {
      setRecurringDayOfWeek(recurring.day_of_month.toString());
    } else if (recurring.frequency === 'yearly') {
      const month = Math.floor(recurring.day_of_month / 100);
      const day = recurring.day_of_month % 100;
      setRecurringMonth(month.toString());
      setRecurringDayOfMonth(day.toString());
    } else {
      setRecurringDayOfMonth(recurring.day_of_month.toString());
    }
    
    setShowManageRecurringDialog(false);
    setShowRecurringDialog(true);
  };

  const handleUpdateRecurringExpense = async () => {
    if (!editingRecurring || !category || !amount) {
      toast({
        title: "Missing information",
        description: "Please select a category and enter an amount.",
        variant: "destructive"
      });
      return;
    }

    let dayValue: number;
    
    if (recurringFrequency === 'weekly') {
      dayValue = parseInt(recurringDayOfWeek);
      if (isNaN(dayValue) || dayValue < 0 || dayValue > 6) {
        toast({
          title: "Invalid day",
          description: "Please select a valid day of the week.",
          variant: "destructive"
        });
        return;
      }
    } else if (recurringFrequency === 'yearly') {
      const monthNum = parseInt(recurringMonth);
      const dayNum = parseInt(recurringDayOfMonth);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(dayNum) || dayNum < 1 || dayNum > 28) {
        toast({
          title: "Invalid date",
          description: "Please select a valid month and day.",
          variant: "destructive"
        });
        return;
      }
      dayValue = monthNum * 100 + dayNum;
    } else {
      dayValue = parseInt(recurringDayOfMonth);
      if (isNaN(dayValue) || dayValue < 1 || dayValue > 28) {
        toast({
          title: "Invalid day",
          description: "Day of month must be between 1 and 28.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({
          category,
          amount: parseFloat(amount),
          description: description || null,
          frequency: recurringFrequency,
          day_of_month: dayValue
        })
        .eq('id', editingRecurring.id);

      if (error) throw error;

      setRecurringExpenses(recurringExpenses.map(r => 
        r.id === editingRecurring.id 
          ? { 
              ...r, 
              category, 
              amount: parseFloat(amount), 
              description: description || '', 
              frequency: recurringFrequency, 
              day_of_month: dayValue 
            } 
          : r
      ));

      resetForm();
      setEditingRecurring(null);
      setShowRecurringDialog(false);

      toast({
        title: "Recurring expense updated",
        description: "Your recurring expense has been updated."
      });
    } catch (error: any) {
      toast({
        title: "Error updating recurring expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Category management functions
  const handleAddCategory = async () => {
    if (!newCategoryLabel.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a category name.",
        variant: "destructive"
      });
      return;
    }

    const categoryValue = newCategoryLabel.toLowerCase().replace(/\s+/g, '_');
    
    // Check if category already exists
    if (categories.some(c => c.value === categoryValue)) {
      toast({
        title: "Category exists",
        description: "A category with this name already exists.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          user_id: user?.id,
          value: categoryValue,
          label: newCategoryLabel.trim(),
          emoji: newCategoryEmoji,
          color: newCategoryColor,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;

      setCustomCategories([...customCategories, {
        id: data.id,
        value: data.value,
        label: data.label,
        emoji: data.emoji,
        color: data.color,
        is_default: false
      }]);

      setNewCategoryLabel("");
      setNewCategoryEmoji("📌");
      setNewCategoryColor("#6366f1");
      setShowAddCategoryDialog(false);

      toast({
        title: "Category created",
        description: `${newCategoryEmoji} ${newCategoryLabel} has been added.`
      });
    } catch (error: any) {
      toast({
        title: "Error creating category",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryValue: string) => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCustomCategories(customCategories.filter(c => c.id !== categoryId));
      toast({
        title: "Category deleted",
        description: "The category has been removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getFrequencyLabel = (frequency: string, dayValue: number) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (frequency === 'weekly') {
      return `Every ${dayNames[dayValue]}`;
    } else if (frequency === 'yearly') {
      const month = Math.floor(dayValue / 100);
      const day = dayValue % 100;
      return `${monthNames[month - 1]} ${day}`;
    }
    return `Day ${dayValue}`;
  };

  const getCategoryInfo = (value: string): Category => {
    const found = categories.find(c => c.value === value);
    if (found) return found;
    // Fallback for unknown categories
    return { value, label: value, emoji: "📌", color: "#6366f1" };
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
        <div className="flex gap-2 flex-wrap">
          {/* Analytics Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Expense Analytics
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <ExpenseAnalytics 
                  expenses={expenses} 
                  categories={categories} 
                  currency={currency} 
                />
              </div>
            </SheetContent>
          </Sheet>

          <Dialog open={showManageRecurringDialog} onOpenChange={setShowManageRecurringDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="relative">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recurring
                {recurringExpenses.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {recurringExpenses.length}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Recurring Expenses
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                {recurringExpenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No recurring expenses set up yet.</p>
                  </div>
                ) : (
                  recurringExpenses.map((recurring) => {
                    const catInfo = getCategoryInfo(recurring.category);
                    return (
                      <div 
                        key={recurring.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-colors",
                          recurring.is_active ? "bg-muted/30 border-border" : "bg-muted/10 border-border/50 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${catInfo.color}20` }}
                          >
                            {catInfo.emoji}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {catInfo.label}
                              <span className="text-sm font-normal text-muted-foreground">
                                • {getFrequencyLabel(recurring.frequency, recurring.day_of_month)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {recurring.description || 'No description'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-semibold" style={{ color: catInfo.color }}>
                              {formatCurrency(recurring.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">{recurring.frequency}</div>
                          </div>
                          <Switch
                            checked={recurring.is_active}
                            onCheckedChange={() => handleToggleRecurring(recurring.id, recurring.is_active)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => handleEditRecurring(recurring)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this recurring expense? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRecurring(recurring.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })
                )}
                <Button 
                  onClick={() => {
                    setShowManageRecurringDialog(false);
                    setShowRecurringDialog(true);
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Recurring Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showRecurringDialog} onOpenChange={(open) => {
            setShowRecurringDialog(open);
            if (!open) {
              resetForm();
              setEditingRecurring(null);
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  {editingRecurring ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
                </DialogTitle>
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
                          {cat.emoji} {cat.label}
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
                  <label className="font-medium mb-2 block">Frequency</label>
                  <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {recurringFrequency === 'weekly' && (
                  <div>
                    <label className="font-medium mb-2 block">Day of Week</label>
                    <Select value={recurringDayOfWeek} onValueChange={setRecurringDayOfWeek}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {recurringFrequency === 'monthly' && (
                  <div>
                    <label className="font-medium mb-2 block">Day of Month (1-28)</label>
                    <Input 
                      type="number"
                      placeholder="e.g., 1"
                      min="1"
                      max="28"
                      value={recurringDayOfMonth}
                      onChange={(e) => setRecurringDayOfMonth(e.target.value)}
                    />
                  </div>
                )}
                {recurringFrequency === 'yearly' && (
                  <>
                    <div>
                      <label className="font-medium mb-2 block">Month</label>
                      <Select value={recurringMonth} onValueChange={setRecurringMonth}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">January</SelectItem>
                          <SelectItem value="2">February</SelectItem>
                          <SelectItem value="3">March</SelectItem>
                          <SelectItem value="4">April</SelectItem>
                          <SelectItem value="5">May</SelectItem>
                          <SelectItem value="6">June</SelectItem>
                          <SelectItem value="7">July</SelectItem>
                          <SelectItem value="8">August</SelectItem>
                          <SelectItem value="9">September</SelectItem>
                          <SelectItem value="10">October</SelectItem>
                          <SelectItem value="11">November</SelectItem>
                          <SelectItem value="12">December</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="font-medium mb-2 block">Day of Month (1-28)</label>
                      <Input 
                        type="number"
                        placeholder="e.g., 15"
                        min="1"
                        max="28"
                        value={recurringDayOfMonth}
                        onChange={(e) => setRecurringDayOfMonth(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="font-medium mb-2 block">Description (optional)</label>
                  <Input 
                    placeholder="e.g., Netflix subscription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={editingRecurring ? handleUpdateRecurringExpense : handleAddRecurringExpense} 
                  className="w-full gradient-primary"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {editingRecurring ? 'Update Recurring Expense' : 'Add Recurring Expense'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Categories Dialog */}
          <Dialog open={showCategoriesDialog} onOpenChange={setShowCategoriesDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="w-4 h-4 mr-2" />
                Categories
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Manage Categories
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Default Categories</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {defaultCategories.map((cat) => (
                      <div 
                        key={cat.value}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/20"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          {cat.emoji}
                        </div>
                        <span className="text-sm font-medium">{cat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {customCategories.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Custom Categories</h4>
                    <div className="space-y-2">
                      {customCategories.map((cat) => (
                        <div 
                          key={cat.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                              style={{ backgroundColor: `${cat.color}20` }}
                            >
                              {cat.emoji}
                            </div>
                            <div>
                              <div className="font-medium">{cat.label}</div>
                              <div className="text-xs text-muted-foreground">Custom category</div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => cat.id && handleDeleteCategory(cat.id, cat.value)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={() => {
                    setShowCategoriesDialog(false);
                    setShowAddCategoryDialog(true);
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Category Dialog */}
          <Dialog open={showAddCategoryDialog} onOpenChange={(open) => {
            setShowAddCategoryDialog(open);
            if (!open) {
              setNewCategoryLabel("");
              setNewCategoryEmoji("📌");
              setNewCategoryColor("#6366f1");
            }
          }}>
            <DialogContent className="max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Custom Category
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2 overflow-y-auto flex-1 pr-1">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category Name</label>
                  <Input 
                    placeholder="e.g., Groceries"
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Emoji</label>
                  <div className="flex flex-wrap gap-1.5">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCategoryEmoji(emoji)}
                        className={cn(
                          "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                          newCategoryEmoji === emoji 
                            ? "bg-primary/20 ring-2 ring-primary" 
                            : "bg-muted/50 hover:bg-muted"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Color</label>
                  <div className="flex flex-wrap gap-1.5">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCategoryColor(color)}
                        className={cn(
                          "w-9 h-9 rounded-lg transition-all",
                          newCategoryColor === color 
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                            : "hover:scale-110"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <label className="text-xs text-muted-foreground block mb-1.5">Preview</label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                      style={{ backgroundColor: `${newCategoryColor}20` }}
                    >
                      {newCategoryEmoji}
                    </div>
                    <span className="text-sm font-medium" style={{ color: newCategoryColor }}>
                      {newCategoryLabel || "Category Name"}
                    </span>
                  </div>
                </div>
                <Button onClick={handleAddCategory} className="w-full gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>

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
                          {cat.emoji} {cat.label}
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
                          {cat.emoji} {cat.label}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Monthly Budget */}
        <Card className="relative overflow-hidden border-2 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#219ebc]/20 flex items-center justify-center shrink-0 border border-[#219ebc]/30">
                <Target className="w-5 h-5 text-[#219ebc]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {monthlyBudget > 0 ? formatCurrency(monthlyBudget) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Monthly Budget</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Month's Expenses */}
        <Card className="relative overflow-hidden border-2 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="relative w-10 h-10 shrink-0">
                <div className="w-10 h-10 rounded-lg bg-[#d62828]/20 flex items-center justify-center border border-[#d62828]/30">
                  <ArrowDownCircle className="w-5 h-5 text-[#d62828]" />
                </div>
                {previousMonthTotal > 0 && (
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-card ${
                    expenseChangePercent > 0 ? 'bg-[#d62828] text-white' : 'bg-[#2d6a4f] text-white'
                  }`}>
                    {expenseChangePercent > 0 ? '↑' : '↓'}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {formatCurrency(currentMonthTotal)}
                </div>
                <div className="text-xs text-muted-foreground">This Month's Expenses</div>
                {previousMonthTotal > 0 && (
                  <div className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
                    expenseChangePercent > 0 ? 'text-[#d62828]' : 'text-[#2d6a4f]'
                  }`}>
                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded ${
                      expenseChangePercent > 0 ? 'bg-[#d62828]/20' : 'bg-[#2d6a4f]/20'
                    }`}>
                      {expenseChangePercent > 0 ? '↑' : '↓'}
                    </span>
                    {expenseChangePercent > 0 ? '+' : ''}{expenseChangePercent.toFixed(1)}% vs last month
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remaining/Balance */}
        <Card className={`relative overflow-hidden border-2 ${
          balance >= 0 ? 'border-[#2d6a4f]/40 bg-[#2d6a4f]/10' : 'border-[#d62828]/40 bg-[#d62828]/10'
        } backdrop-blur-sm`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                balance >= 0 ? 'bg-[#2d6a4f]/20 border-[#2d6a4f]/30' : 'bg-[#d62828]/20 border-[#d62828]/30'
              }`}>
                <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-[#2d6a4f]' : 'text-[#d62828]'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-xl sm:text-2xl font-bold truncate ${
                  balance >= 0 ? 'text-[#2d6a4f]' : 'text-[#d62828]'
                }`}>
                  {monthlyBudget > 0 ? formatCurrency(Math.abs(balance)) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {balance >= 0 ? "Remaining" : "Over Budget"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="relative overflow-hidden border-2 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="relative w-10 h-10 shrink-0">
                <div className="w-10 h-10 rounded-lg bg-[#ffb703]/20 flex items-center justify-center border border-[#ffb703]/30">
                  <TrendingUp className="w-5 h-5 text-[#ffb703]" />
                </div>
                {previousMonthExpenses.length > 0 && (
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-card ${
                    transactionChangePercent > 0 ? 'bg-[#ffb703] text-black' : 'bg-muted text-muted-foreground'
                  }`}>
                    {transactionChangePercent > 0 ? '↑' : '↓'}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {currentMonthExpenses.length}
                </div>
                <div className="text-xs text-muted-foreground">Transactions This Month</div>
                {previousMonthExpenses.length > 0 && (
                  <div className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
                    transactionChangePercent > 0 ? 'text-[#ffb703]' : 'text-muted-foreground'
                  }`}>
                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded ${
                      transactionChangePercent > 0 ? 'bg-[#ffb703]/20' : 'bg-muted/30'
                    }`}>
                      {transactionChangePercent > 0 ? '↑' : '↓'}
                    </span>
                    {transactionChangePercent > 0 ? '+' : ''}{transactionChangePercent.toFixed(1)}% vs last month
                  </div>
                )}
              </div>
            </div>
          </CardContent>
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
                  {cat.emoji} {cat.label}
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
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
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

          {/* Recent Transactions - Grid Layout */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                {filterPeriod === "month" ? "This Month's Transactions" : "All Transactions"}
              </h3>
              <span className="text-xs text-muted-foreground">
                {Math.min(visibleCount, filteredExpenses.length)} of {filteredExpenses.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredExpenses.slice(0, visibleCount).map((expense) => {
                const catInfo = getCategoryInfo(expense.category);
                return (
                  <div 
                    key={expense.id} 
                    className="flex items-center justify-between p-3 rounded-xl border-2 border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:bg-card transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm"
                        style={{ 
                          backgroundColor: `${catInfo.color}25`,
                          border: `1px solid ${catInfo.color}40`
                        }}
                      >
                        {catInfo.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-foreground truncate">{catInfo.label}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {expense.description || 'No description'}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {format(new Date(expense.date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div 
                        className="text-sm font-bold px-2 py-1 rounded-lg"
                        style={{ 
                          color: catInfo.color,
                          backgroundColor: `${catInfo.color}15`
                        }}
                      >
                        {formatCurrency(expense.amount)}
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                          onClick={() => handleEditExpense(expense)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredExpenses.length > visibleCount && (
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
              >
                Load More ({filteredExpenses.length - visibleCount} remaining)
              </Button>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Expenses;
