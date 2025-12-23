import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Plus, Trash2, PieChart, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

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

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const getCategoryData = () => {
    const categoryTotals: { [key: string]: number } = {};
    
    expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    return categories
      .filter(cat => categoryTotals[cat.value])
      .map(cat => ({
        name: cat.label.split(' ')[1],
        value: categoryTotals[cat.value],
        color: cat.color,
        percentage: ((categoryTotals[cat.value] / totalExpenses) * 100).toFixed(1)
      }));
  };

  const pieData = getCategoryData();

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
          date: new Date().toISOString().split('T')[0]
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
      }, ...expenses]);

      setCategory("");
      setAmount("");
      setDescription("");
      setShowAddDialog(false);

      toast({
        title: "Expense added",
        description: `₹${amount} added to ${category}.`
      });
    } catch (error: any) {
      toast({
        title: "Error adding expense",
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

  const getCategoryInfo = (value: string) => {
    return categories.find(c => c.value === value) || categories[categories.length - 1];
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-7 h-7 text-primary" />
            Your Expenses
          </h1>
          <p className="text-muted-foreground">Track and manage your spending</p>
        </div>
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
                <label className="font-medium mb-2 block">Amount (₹)</label>
                <Input 
                  type="number"
                  placeholder="e.g., 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
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
      </div>

      {/* Stats Row */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">₹{totalExpenses.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Expenses</div>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{expenses.length}</div>
              <div className="text-sm text-muted-foreground">Transactions</div>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <PieChart className="w-6 h-6 text-warning" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{pieData.length}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </div>
        </Card>
      </div>

      {expenses.length === 0 ? (
        <Card className="p-12 text-center">
          <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No expenses recorded yet. Add your first expense above!</p>
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
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
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
                      ₹{item.value.toLocaleString()}
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
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenses.slice(0, 10).map((expense) => {
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
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-semibold" style={{ color: catInfo.color }}>
                          ₹{expense.amount.toLocaleString()}
                        </div>
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
