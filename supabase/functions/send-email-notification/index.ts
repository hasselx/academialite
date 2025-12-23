import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  reminder_title: string;
  reminder_type: string;
  due_date: string;
  priority_level: string;
  priority_icon: string;
  description: string;
  timing_text: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      reminder_title, 
      reminder_type, 
      due_date, 
      priority_level, 
      priority_icon, 
      description, 
      timing_text 
    }: EmailRequest = await req.json();
    
    console.log(`Sending email to: ${to}, reminder: ${reminder_title}`);

    const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
    const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID");
    const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
    const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY");

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
      console.error("Missing EmailJS configuration");
      throw new Error("Email configuration is incomplete");
    }

    // EmailJS API endpoint
    const emailjsUrl = "https://api.emailjs.com/api/v1.0/email/send";

    const templateParams = {
      email: to,
      reminder_title,
      reminder_type,
      due_date,
      priority_level,
      priority_icon,
      description: description || "No description provided",
      timing_text,
      settings_link: "https://academialite.lovable.app/dashboard/reminders"
    };

    const response = await fetch(emailjsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: templateParams,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("EmailJS error:", errorText);
      throw new Error(`EmailJS failed: ${errorText}`);
    }

    console.log("Email sent successfully via EmailJS");

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
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
