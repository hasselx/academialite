import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body }: EmailRequest = await req.json();
    console.log(`Sending email to: ${to}, subject: ${subject}`);

    const SMTP_SERVER = Deno.env.get("SMTP_SERVER");
    const SMTP_PORT = Deno.env.get("SMTP_PORT");
    const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL");
    const SENDER_PASSWORD = Deno.env.get("SENDER_PASSWORD");

    if (!SMTP_SERVER || !SMTP_PORT || !SENDER_EMAIL || !SENDER_PASSWORD) {
      console.error("Missing SMTP configuration");
      throw new Error("Email configuration is incomplete");
    }

    const client = new SmtpClient();

    const port = parseInt(SMTP_PORT);
    const useTLS = port === 465;

    if (useTLS) {
      await client.connectTLS({
        hostname: SMTP_SERVER,
        port: port,
        username: SENDER_EMAIL,
        password: SENDER_PASSWORD,
      });
    } else {
      await client.connect({
        hostname: SMTP_SERVER,
        port: port,
        username: SENDER_EMAIL,
        password: SENDER_PASSWORD,
      });
    }

    await client.send({
      from: SENDER_EMAIL,
      to: to,
      subject: subject,
      content: body,
      html: body,
    });

    await client.close();
    console.log("Email sent successfully");

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
