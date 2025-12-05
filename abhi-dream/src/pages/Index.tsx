import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import { Building2, Search, MapPin, Wrench, Truck, Paintbrush, Sparkles, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
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

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  property_type?: string;
  status: string;
  images?: string[];
}

export default function Index() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [isEnquiring, setIsEnquiring] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [enquiryData, setEnquiryData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  useEffect(() => {
    checkUser();
    loadProperties();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    setIsGuest(session?.user?.is_anonymous || false);
  };

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load properties",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnquire = (property: Property) => {
    setSelectedProperty(property);
  };

  const submitEnquiry = async () => {
    if (!selectedProperty) return;

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
          service_id: selectedProperty.id,
          service_type: "property",
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
            service_id: selectedProperty.id,
            service_title: selectedProperty.title,
            service_type: "property",
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

      setSelectedProperty(null);
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

  const filteredProperties = properties.filter((property) =>
    property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent py-20 px-4">
        <div className="container mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Building2 className="w-5 h-5" />
            <span className="text-sm font-medium">Premium Real Estate</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Find Your Dream Property
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            Discover the finest properties in prime locations
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by location, property type, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg bg-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We offer comprehensive real estate solutions and related services
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <Link
              to="/services"
              className="group flex flex-col items-center p-6 bg-background rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border hover:border-primary"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Building2 className="w-8 h-8 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-center">Properties</h3>
            </Link>

            <Link
              to="/services"
              className="group flex flex-col items-center p-6 bg-background rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border hover:border-primary"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Wrench className="w-8 h-8 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-center">Renovation</h3>
            </Link>

            <Link
              to="/services"
              className="group flex flex-col items-center p-6 bg-background rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border hover:border-primary"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Truck className="w-8 h-8 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-center">Packers & Movers</h3>
            </Link>

            <Link
              to="/services"
              className="group flex flex-col items-center p-6 bg-background rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border hover:border-primary"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Paintbrush className="w-8 h-8 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-center">Painting</h3>
            </Link>

            <Link
              to="/services"
              className="group flex flex-col items-center p-6 bg-background rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border hover:border-primary"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Sparkles className="w-8 h-8 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-center">Cleaning</h3>
            </Link>

            <Link
              to="/services"
              className="group flex flex-col items-center p-6 bg-background rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border hover:border-primary"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Megaphone className="w-8 h-8 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-center">Advertising</h3>
            </Link>
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Featured Properties</h2>
            <p className="text-muted-foreground mt-2">
              Explore our curated collection of premium properties
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading properties...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-lg">
              {searchQuery ? "No properties found matching your search" : "No properties available"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onEnquire={handleEnquire}
              />
            ))}
          </div>
        )}
      </section>

      {/* Enquiry Dialog */}
      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enquire About Property</DialogTitle>
            <DialogDescription>
              {selectedProperty?.title}
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
                Your contact details will be shared with the property manager who will get back to you shortly.
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
