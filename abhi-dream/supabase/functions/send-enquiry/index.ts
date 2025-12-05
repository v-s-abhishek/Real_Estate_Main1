import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const enquirySchema = z.object({
  service_id: z.string().uuid("Invalid service ID"),
  service_type: z.enum(["property", "renovation", "packers_movers", "painting", "cleaning", "advertising"]).optional(),
  service_title: z.string().optional(),
  message: z.string().trim().max(2000, "Message too long")
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Validate input
    const validationResult = enquirySchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.errors }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    const { service_id, service_title, service_type, message } = validationResult.data;
    
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client with service role to verify the token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the user's JWT token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('Auth error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    if (!user) {
      console.error('No user found in token');
      throw new Error('Not authenticated - no user found');
    }

    console.log('User authenticated:', user.id);

    // Use admin client to fetch profile (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('Profile not found');
    }

    // Use admin client to insert enquiry (bypasses RLS since we've already verified the user)
    const { data: enquiry, error: enquiryError } = await supabaseAdmin
      .from('enquiries')
      .insert({
        service_id,
        service_type: service_type || 'property',
        user_id: user.id,
        user_name: profile.full_name,
        user_email: profile.email,
        user_phone: profile.phone,
        message: message || ''
      })
      .select()
      .single();

    if (enquiryError) {
      console.error('Error creating enquiry:', enquiryError);
      throw enquiryError;
    }

    // Create notification for admins/employees (they'll see it in their dashboard)
    console.log(`New enquiry for ${service_type}: ${service_title}`);
    console.log(`From: ${profile.full_name} (${profile.email}, ${profile.phone})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enquiry submitted successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-enquiry function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});