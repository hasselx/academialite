## Goal
Transform the Expenses page into a two-column **Income (+) / Expense (−)** tracker with a clear net balance, while preserving all existing analytics, recurring, categories, and filters.

## Database
- Add `type` column (`text`, check constraint `'income' | 'expense'`, default `'expense'`) to:
  - `public.expenses`
  - `public.recurring_expenses`
- Backfill all existing rows as `'expense'` (no behavior change for current data).

## UI changes (`src/pages/dashboard/Expenses.tsx`)
1. **Add Transaction dialog** — a Type toggle (Income / Expense) at the top. Same flow for recurring.
2. **Stat cards row** restructured into two prominent columns:
   - Green **Income** card with `+` total for the period.
   - Red **Expense** card with `−` total.
   - Plus a **Net Balance** card (income − expense) and **Budget** card.
3. **Transactions list** — each row shows `+₹X` (green) or `−₹X` (red) with the category emoji. Two filter chips added: All / Income / Expense.
4. **Add Income** quick-action button (in addition to Add Expense) — both open the same dialog with the toggle pre-selected.
5. **Pie chart & analytics** — continue using expense data only (income excluded from spending breakdown). Income shown separately in the top cards.
6. **Mobile** — the two columns stack as a 2-col grid on small screens (`grid-cols-2`) so income & expense stay side-by-side without horizontal scroll.

## Categories
Reuse existing categories for both types. (No separate income-category table — keeps scope tight; users can name a category "Salary", "Freelance", etc.)

## Out of scope
- Income forecasting / separate income analytics tab.
- Migrating recurring generation logic beyond honoring the new `type` field.
