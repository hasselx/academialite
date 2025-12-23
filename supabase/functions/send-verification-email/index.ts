import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  to: string;
  user_name: string;
  verification_link: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-verification-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, user_name, verification_link }: VerificationEmailRequest = await req.json();
    
    console.log(`Sending verification email to: ${to}, user: ${user_name}`);

    const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
    const EMAILJS_VERIFICATION_TEMPLATE_ID = Deno.env.get("EMAILJS_VERIFICATION_TEMPLATE_ID") || Deno.env.get("EMAILJS_TEMPLATE_ID");
    const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
    const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY");

    if (!EMAILJS_SERVICE_ID || !EMAILJS_VERIFICATION_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
      console.error("Missing EmailJS configuration");
      throw new Error("Email configuration is incomplete");
    }

    const emailjsUrl = "https://api.emailjs.com/api/v1.0/email/send";

    const templateParams = {
      email: to,
      to_email: to,
      user_name: user_name,
      verification_link: verification_link,
    };

    const emailPayload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_VERIFICATION_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: templateParams,
    };

    console.log("Sending to EmailJS with payload:", JSON.stringify({ ...emailPayload, accessToken: "[REDACTED]" }));

    const response = await fetch(emailjsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://academialite.lovable.app",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("EmailJS error:", errorText);
      throw new Error(`EmailJS failed: ${errorText}`);
    }

    console.log("Verification email sent successfully via EmailJS");

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending verification email:", error);
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
