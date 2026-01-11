import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_MESSAGE_LENGTH = 5000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated request from user: ${user.id}`);

    const { message } = await req.json();
    
    // Input validation
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input - message is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Message too long - maximum ${MAX_MESSAGE_LENGTH} characters allowed` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a smart assistant that extracts reminder information from messages. 
    Parse the given text (which could be from WhatsApp, email, or any communication) and extract:
    1. title: A clear, concise title for the reminder
    2. type: One of "assignment", "exam", "project", or "other"
    3. dueDate: The due date in YYYY-MM-DD format. If only a day/month is mentioned, assume the current or next year.
    4. dueTime: The time in HH:MM format (24-hour). 
       TIME PARSING RULES (CRITICAL - FOLLOW EXACTLY):
       - If user says "pm", "PM", "afternoon", "evening", or "night" -> use PM time (add 12 to hour if < 12)
       - If user says "am", "AM", or "morning" -> use AM time (hour as-is)
       - If NO AM/PM indicator is present AT ALL (e.g., "at 1.30", "at 2", "at 3:00") -> ALWAYS use AM (hour as-is, do NOT add 12)
       - Examples: "at 1.30" = 01:30, "at 2" = 02:00, "at 10" = 10:00, "at 2.30 pm" = 14:30
       - Return null if no time mentioned at all.
    5. priority: "critical" for exams/finals, "urgent" for assignments due within 3 days, "normal" otherwise
    6. description: Any additional relevant details (room number, location, etc.)
    
    Today's date is ${new Date().toISOString().split('T')[0]}.
    
    Respond ONLY with a valid JSON object in this exact format:
    {"title": "...", "type": "...", "dueDate": "YYYY-MM-DD", "dueTime": "HH:MM" or null, "priority": "...", "description": "..."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse message");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract parsed data from AI response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log("Parsed reminder data:", parsed);

    return new Response(
      JSON.stringify({ parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in parse-message function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
