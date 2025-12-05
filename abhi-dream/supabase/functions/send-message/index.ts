import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const messageSchema = z.object({
  enquiry_id: z.string().uuid("Invalid enquiry ID"),
  message: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message too long")
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
    const validationResult = messageSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.errors }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    const { enquiry_id, message } = validationResult.data;
    
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

    // Now use regular client for data operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Check user role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const senderRole = roleData?.role || 'user';

    // Get enquiry to find the other party for notification
    const { data: enquiry } = await supabaseClient
      .from('enquiries')
      .select('user_id')
      .eq('id', enquiry_id)
      .single();

    // Authorization check: verify user is participant in enquiry or is admin/employee
    if (senderRole === 'user') {
      if (!enquiry || enquiry.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: You can only send messages to your own enquiries' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403 
          }
        );
      }
    }

    // Insert message
    const { data: newMessage, error: messageError } = await supabaseClient
      .from('enquiry_messages')
      .insert({
        enquiry_id,
        sender_id: user.id,
        sender_role: senderRole,
        message
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      throw messageError;
    }

    // Create notification for the other party
    const notifyUserId = senderRole === 'user' ? null : enquiry?.user_id;
    
    if (notifyUserId) {
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: notifyUserId,
          title: 'New message',
          message: 'You have a new message regarding your enquiry',
          type: 'new_message',
          related_id: enquiry_id
        });
    }

    console.log(`Message sent for enquiry ${enquiry_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Message sent successfully',
        data: newMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-message function:', error);
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
