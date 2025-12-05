import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Inbox, Mail, Phone, MessageSquare, Calendar, CheckCircle, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Enquiry {
  id: string;
  service_id: string;
  service_type: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  services?: {
    title?: string;
  };
}

export default function Enquiries() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState<{ id: string; action: 'accept' | 'reject' } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    checkAccessAndLoadEnquiries();
  }, []);

  const checkAccessAndLoadEnquiries = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Please login to access this page",
      });
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "employee")) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this page",
      });
      navigate("/");
      return;
    }

    loadEnquiries();
  };

  const loadEnquiries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("enquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch service titles for each enquiry
      const enrichedData = await Promise.all(
        (data || []).map(async (enquiry) => {
          if (enquiry.service_id) {
            const { data: service } = await supabase
              .from("services")
              .select("title")
              .eq("id", enquiry.service_id)
              .single();
            return { ...enquiry, services: service };
          }
          return enquiry;
        })
      );
      
      setEnquiries(enrichedData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load enquiries",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStatusUpdate = async () => {
    if (!selectedEnquiry) return;

    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const status = selectedEnquiry.action === 'accept' ? 'accepted' : 'rejected';

      const response = await supabase.functions.invoke("update-enquiry-status", {
        body: {
          enquiry_id: selectedEnquiry.id,
          status: status,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Status Updated",
        description: `Enquiry has been ${status}. User has been notified.`,
      });

      // Reload enquiries
      loadEnquiries();
      setSelectedEnquiry(null);
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update enquiry status",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Inbox className="w-6 h-6 mr-2 text-primary" />
              Property Enquiries
            </CardTitle>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading enquiries...</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No enquiries yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {enquiries.map((enquiry) => (
              <Card key={enquiry.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {enquiry.services?.title || 'Service'}
                      </h3>
                      <Badge variant="outline" className="mt-2">
                        {enquiry.service_type}
                      </Badge>
                      <p className="text-sm text-muted-foreground flex items-center mt-2">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(enquiry.created_at)}
                      </p>
                    </div>
                    <Badge variant={
                      enquiry.status === "pending" ? "default" : 
                      enquiry.status === "accepted" ? "default" : 
                      "secondary"
                    }>
                      {enquiry.status}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-sm mb-4">
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium text-base mb-2">Customer Details:</p>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Name:</span>
                          {enquiry.user_name}
                        </div>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                          <a 
                            href={`mailto:${enquiry.user_email}`}
                            className="text-primary hover:underline"
                          >
                            {enquiry.user_email}
                          </a>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                          <a 
                            href={`tel:${enquiry.user_phone}`}
                            className="text-primary hover:underline"
                          >
                            {enquiry.user_phone}
                          </a>
                        </div>
                      </div>
                    </div>

                    {enquiry.message && (
                      <div className="flex items-start p-3 bg-muted rounded-md">
                        <MessageSquare className="w-4 h-4 mr-2 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium mb-1">Message:</p>
                          <p className="text-muted-foreground">{enquiry.message}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {enquiry.status === "pending" && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        className="flex-1"
                        onClick={() => setSelectedEnquiry({ id: enquiry.id, action: 'accept' })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setSelectedEnquiry({ id: enquiry.id, action: 'reject' })}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedEnquiry} onOpenChange={() => setSelectedEnquiry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedEnquiry?.action === 'accept' ? 'Accept Enquiry' : 'Reject Enquiry'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedEnquiry?.action === 'accept' 
                ? 'Are you sure you want to accept this enquiry? The user will be notified via notification.'
                : 'Are you sure you want to reject this enquiry? The user will be notified.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusUpdate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}