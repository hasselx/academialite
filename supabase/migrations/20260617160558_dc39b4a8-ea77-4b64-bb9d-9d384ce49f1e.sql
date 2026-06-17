
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income','expense'));
ALTER TABLE public.recurring_expenses ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income','expense'));
UPDATE public.expenses SET type = 'expense' WHERE type IS NULL;
UPDATE public.recurring_expenses SET type = 'expense' WHERE type IS NULL;
