import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import ServiceCard from "@/components/ServiceCard";
import { Briefcase, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { z } from "zod";

const guestEnquirySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(10, "Valid phone number is required").max(15),
  email: z.string().trim().email("Valid email is required").max(255),
  message: z.string().trim().max(1000, "Message must be less than 1000 characters"),
});

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  service_type: string;
  status: string;
  images?: string[];
  address?: string;
}

export default function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [isEnquiring, setIsEnquiring] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isGuest, setIsGuest] = useState(false);
  const [enquiryData, setEnquiryData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  useEffect(() => {
    checkUser();
    loadServices();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    setIsGuest(session?.user?.is_anonymous || false);
  };

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load services",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnquire = (service: Service) => {
    setSelectedService(service);
  };

  const submitEnquiry = async () => {
    if (!selectedService) return;

    setIsEnquiring(true);
    try {
      if (isGuest) {
        // Validate guest data
        const validation = guestEnquirySchema.safeParse(enquiryData);
        if (!validation.success) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: validation.error.errors[0].message,
          });
          setIsEnquiring(false);
          return;
        }

        // Insert directly for guests
        const { error } = await supabase.from("enquiries").insert({
          service_id: selectedService.id,
          service_type: selectedService.service_type,
          user_name: enquiryData.name,
          user_email: enquiryData.email,
          user_phone: enquiryData.phone,
          message: enquiryData.message,
          is_guest: true,
        });

        if (error) throw error;
      } else {
        // Regular user flow
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Not authenticated");

        const response = await supabase.functions.invoke("send-enquiry", {
          body: {
            service_id: selectedService.id,
            service_title: selectedService.title,
            service_type: selectedService.service_type,
            message: enquiryMessage,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.error) throw response.error;
      }

      toast({
        title: "Enquiry Submitted!",
        description: "Our team will contact you soon.",
      });

      setSelectedService(null);
      setEnquiryMessage("");
      setEnquiryData({ name: "", phone: "", email: "", message: "" });
    } catch (error: any) {
      console.error("Enquiry error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit enquiry",
      });
    } finally {
      setIsEnquiring(false);
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || service.service_type === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent py-20 px-4">
        <div className="container mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Briefcase className="w-5 h-5" />
            <span className="text-sm font-medium">Featured Services</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Featured Services
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            From properties to renovation, moving, and more
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg bg-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="container mx-auto px-4 py-16">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="inline-flex w-full overflow-x-auto justify-start md:grid md:grid-cols-7 md:justify-center">
            <TabsTrigger value="all" className="flex-shrink-0">All</TabsTrigger>
            <TabsTrigger value="property" className="flex-shrink-0">Property</TabsTrigger>
            <TabsTrigger value="renovation" className="flex-shrink-0">Renovation</TabsTrigger>
            <TabsTrigger value="packers_movers" className="flex-shrink-0">Movers</TabsTrigger>
            <TabsTrigger value="painting" className="flex-shrink-0">Painting</TabsTrigger>
            <TabsTrigger value="cleaning" className="flex-shrink-0">Cleaning</TabsTrigger>
            <TabsTrigger value="advertising" className="flex-shrink-0">Advertising</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-lg">
              {searchQuery ? "No services found matching your search" : "No services available"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEnquire={handleEnquire}
              />
            ))}
          </div>
        )}
      </section>

      {/* Enquiry Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enquire About Service</DialogTitle>
            <DialogDescription>
              {selectedService?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isGuest && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="guest-name">Full Name *</Label>
                  <Input
                    id="guest-name"
                    value={enquiryData.name}
                    onChange={(e) => setEnquiryData({ ...enquiryData, name: e.target.value })}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-phone">Phone Number *</Label>
                  <Input
                    id="guest-phone"
                    value={enquiryData.phone}
                    onChange={(e) => setEnquiryData({ ...enquiryData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-email">Email *</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={enquiryData.email}
                    onChange={(e) => setEnquiryData({ ...enquiryData, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="message">{isGuest ? "Message *" : "Message (Optional)"}</Label>
              <Textarea
                id="message"
                value={isGuest ? enquiryData.message : enquiryMessage}
                onChange={(e) => 
                  isGuest 
                    ? setEnquiryData({ ...enquiryData, message: e.target.value })
                    : setEnquiryMessage(e.target.value)
                }
                placeholder="Any specific questions or requirements..."
                rows={4}
              />
            </div>
            {!isGuest && (
              <p className="text-sm text-muted-foreground">
                Your contact details will be shared with our team who will get back to you shortly.
              </p>
            )}
            <Button
              onClick={submitEnquiry}
              className="w-full"
              size="lg"
              disabled={isEnquiring}
            >
              {isEnquiring ? "Submitting..." : "Submit Enquiry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
