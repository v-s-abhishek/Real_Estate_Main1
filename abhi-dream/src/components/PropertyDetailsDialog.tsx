import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bed, Bath, Square, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const guestEnquirySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  phone: z.string().trim().regex(/^[0-9+\s()-]{10,15}$/, "Invalid phone number format"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message too long")
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

interface PropertyDetailsDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PropertyDetailsDialog({
  property,
  open,
  onOpenChange,
}: PropertyDetailsDialogProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enquiryData, setEnquiryData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  useEffect(() => {
    const checkGuestMode = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsGuest(session?.user?.is_anonymous || false);
    };
    checkGuestMode();
  }, []);

  if (!property) return null;

  const handleEnquiry = () => {
    setShowEnquiryForm(true);
  };

  const handleSubmitEnquiry = async () => {
    if (isGuest) {
      // Validate guest form with zod schema
      try {
        guestEnquirySchema.parse(enquiryData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: error.errors[0].message,
          });
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      if (isGuest) {
        // Guest enquiry - direct insert
        const { error } = await supabase.from("enquiries").insert({
          user_id: null,
          user_name: enquiryData.name,
          user_phone: enquiryData.phone,
          user_email: enquiryData.email,
          message: enquiryData.message,
          service_type: "property",
          service_id: property.id,
          is_guest: true,
          status: "pending",
        });

        if (error) throw error;
      } else {
        // Authenticated user - use edge function
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!profile) throw new Error("Profile not found");

        const { error } = await supabase.functions.invoke("send-enquiry", {
          body: {
            serviceId: property.id,
            serviceType: "property",
            message: enquiryData.message || "I'm interested in this property",
          },
        });

        if (error) throw error;
      }

      toast({
        title: "Enquiry Sent!",
        description: "We'll get back to you soon.",
      });
      setShowEnquiryForm(false);
      setEnquiryData({ name: "", phone: "", email: "", message: "" });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send enquiry",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const images = property.images && property.images.length > 0 
    ? property.images 
    : ["/placeholder.svg"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{property.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Image Gallery */}
          <div className="space-y-2">
            <div className="aspect-video overflow-hidden rounded-lg bg-muted">
              <img
                src={images[currentImageIndex]}
                alt={`${property.title} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                      currentImageIndex === idx
                        ? "border-primary"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price and Status */}
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-primary">
              {formatPrice(property.price)}
            </p>
            <Badge variant={property.status === "available" ? "default" : "secondary"}>
              {property.status}
            </Badge>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {property.bedrooms && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Bed className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="font-semibold">{property.bedrooms}</p>
                </div>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Bath className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="font-semibold">{property.bathrooms}</p>
                </div>
              </div>
            )}
            {property.area_sqft && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Square className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="font-semibold">{property.area_sqft} sqft</p>
                </div>
              </div>
            )}
            {property.property_type && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-semibold">{property.property_type}</p>
                </div>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 p-4 bg-muted rounded-lg">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{property.address}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground leading-relaxed">
              {property.description}
            </p>
          </div>

          {/* Enquiry Section */}
          {!showEnquiryForm ? (
            <Button onClick={handleEnquiry} className="w-full" size="lg">
              Enquire Now
            </Button>
          ) : (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-lg font-semibold">Send Enquiry</h3>
              
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
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={enquiryData.message}
                  onChange={(e) => setEnquiryData({ ...enquiryData, message: e.target.value })}
                  placeholder="Tell us about your requirements..."
                  rows={4}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleSubmitEnquiry} 
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Sending..." : "Submit Enquiry"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEnquiryForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
