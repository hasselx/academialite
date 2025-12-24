import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("check-scheduled-reminders function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const nowISO = now.toISOString();
    
    // Get reminders that are due within the next 24 hours or 1 hour
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    console.log(`Checking reminders. Current time: ${nowISO}`);

    // Fetch all incomplete reminders
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('completed', false);

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} incomplete reminders`);

    const emailsSent: string[] = [];

    for (const reminder of reminders || []) {
      const reminderDateTime = reminder.due_time 
        ? new Date(`${reminder.due_date}T${reminder.due_time}`)
        : new Date(`${reminder.due_date}T09:00:00`);

      const timeDiff = reminderDateTime.getTime() - now.getTime();
      const hoursUntilDue = timeDiff / (1000 * 60 * 60);

      // Get user email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(reminder.user_id);
      
      if (userError || !userData?.user?.email) {
        console.log(`Could not get email for user ${reminder.user_id}`);
        continue;
      }

      const userEmail = userData.user.email;
      let timingText = "";
      let shouldSend = false;

      // Check if we should send 24h notification (between 23-25 hours)
      if (hoursUntilDue >= 23 && hoursUntilDue <= 25) {
        timingText = "⏰ 24 Hours Until Due";
        shouldSend = true;
      }
      // Check if we should send 1h notification (between 0.5-1.5 hours)
      else if (hoursUntilDue >= 0.5 && hoursUntilDue <= 1.5) {
        timingText = "🚨 1 Hour Until Due!";
        shouldSend = true;
      }
      // Check for overdue (past due but within last hour)
      else if (hoursUntilDue < 0 && hoursUntilDue >= -1) {
        timingText = "⚠️ OVERDUE - Immediate Attention Required";
        shouldSend = true;
      }

      if (shouldSend) {
        console.log(`Sending notification for reminder: ${reminder.title} to ${userEmail}`);
        
        // Send the email notification
        const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
        const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID");
        const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
        const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY");

        if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
          console.error("Missing EmailJS configuration, skipping email");
          continue;
        }

        const priorityIcon = reminder.priority === "critical" ? "🔴" : reminder.priority === "urgent" ? "🟠" : "🟢";

        const templateParams = {
          email: userEmail,
          reminder_title: reminder.title,
          reminder_type: reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1),
          due_date: new Date(reminder.due_date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) + (reminder.due_time ? ` at ${reminder.due_time}` : ''),
          priority_level: reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1),
          priority_icon: priorityIcon,
          description: reminder.description || "No description provided",
          timing_text: timingText,
          settings_link: "https://academialite.lovable.app/dashboard/reminders"
        };

        try {
          const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Origin": "https://academialite.lovable.app",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({
              service_id: EMAILJS_SERVICE_ID,
              template_id: EMAILJS_TEMPLATE_ID,
              user_id: EMAILJS_PUBLIC_KEY,
              accessToken: EMAILJS_PRIVATE_KEY,
              template_params: templateParams,
            }),
          });

          if (response.ok) {
            emailsSent.push(`${reminder.title} -> ${userEmail}`);
            console.log(`Email sent for: ${reminder.title}`);
          } else {
            const errorText = await response.text();
            console.error(`Failed to send email for ${reminder.title}: ${errorText}`);
          }
        } catch (emailError) {
          console.error(`Error sending email for ${reminder.title}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: reminders?.length || 0,
        emailsSent: emailsSent.length,
        details: emailsSent 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-scheduled-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
