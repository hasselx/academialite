import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sanitize = (s: string) => s.replace(/[<>"']/g, "").slice(0, 200);

// Allowed origins for verification links — prevents phishing via attacker-controlled URLs
const ALLOWED_ORIGINS = [
  "https://academialite.lovable.app",
  "https://id-preview--a6495585-1eca-485b-8609-4c3fff25d197.lovable.app",
];

interface VerificationEmailRequest {
  to: string;
  user_name: string;
  verification_link: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, user_name, verification_link }: VerificationEmailRequest = await req.json();

    // Strict input validation
    if (!to || typeof to !== "string" || !EMAIL_RE.test(to) || to.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!user_name || typeof user_name !== "string" || user_name.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid name" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate verification_link is one of our trusted origins (prevents phishing relay)
    let safeLink = "https://academialite.lovable.app/auth";
    if (verification_link && typeof verification_link === "string") {
      try {
        const parsed = new URL(verification_link);
        if (ALLOWED_ORIGINS.includes(parsed.origin)) {
          safeLink = parsed.toString();
        }
      } catch {
        // ignore invalid URL, fall back to default
      }
    }

    const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
    const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID");
    const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
    const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY");

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
      throw new Error("Email configuration is incomplete");
    }

    const safeName = sanitize(user_name);

    const templateParams = {
      email: to,
      to_email: to,
      reminder_title: `Welcome to Academia, ${safeName}!`,
      reminder_type: "Account Verification",
      due_date: new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      priority_level: "Important",
      priority_icon: "✉️",
      description: `Your account has been created successfully. Please click the link below to verify your email and start using Academia.\n\nVerification Link: ${safeLink}`,
      timing_text: "🎉 Welcome to Academia!",
      settings_link: safeLink,
    };

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("EmailJS error:", errorText);
      throw new Error("Email send failed");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
