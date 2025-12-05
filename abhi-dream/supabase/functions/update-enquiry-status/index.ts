import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const statusUpdateSchema = z.object({
  enquiry_id: z.string().uuid("Invalid enquiry ID"),
  status: z.enum(["pending", "accepted", "rejected"], { errorMap: () => ({ message: "Status must be pending, accepted, or rejected" }) })
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
    const validationResult = statusUpdateSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.errors }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    const { enquiry_id, status } = validationResult.data;
    
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // Authorization check: verify user has admin or employee role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'employee')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin or employee role required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    // Use admin client to update enquiry (bypasses RLS since we've already verified the user)
    const { data: enquiry, error: updateError } = await supabaseAdmin
      .from('enquiries')
      .update({ status })
      .eq('id', enquiry_id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating enquiry:', updateError);
      throw updateError;
    }

    // Create notification for user
    const notificationMessage = status === 'accepted' 
      ? 'Your enquiry has been accepted! We will contact you soon.'
      : 'Your enquiry status has been updated.';

    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: enquiry.user_id,
        title: `Enquiry ${status}`,
        message: notificationMessage,
        type: status === 'accepted' ? 'enquiry_accepted' : 'enquiry_rejected',
        related_id: enquiry_id
      });

    console.log(`Enquiry ${enquiry_id} status updated to ${status}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enquiry status updated successfully',
        enquiry
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in update-enquiry-status function:', error);
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
