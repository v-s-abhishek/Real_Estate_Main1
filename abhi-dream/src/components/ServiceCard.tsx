import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Info } from "lucide-react";
import { useState } from "react";
import ServiceDetailsDialog from "./ServiceDetailsDialog";

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

interface ServiceCardProps {
  service: Service;
  onEnquire: (service: Service) => void;
}

const serviceTypeLabels: Record<string, string> = {
  property: "Property",
  renovation: "Renovation",
  packers_movers: "Packers & Movers",
  painting: "Painting",
  cleaning: "Cleaning",
  advertising: "Advertising"
};

export default function ServiceCard({ service, onEnquire }: ServiceCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-primary/10 group">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img
            src={service.images?.[0] || "/placeholder.svg"}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <button
            onClick={() => setShowDetails(true)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
            aria-label="View details"
          >
            <Info className="w-4 h-4 text-primary" />
          </button>
        </div>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{service.title}</CardTitle>
            <CardDescription className="flex items-center mt-2">
              {service.address && (
                <>
                  <MapPin className="w-4 h-4 mr-1" />
                  {service.address}
                </>
              )}
            </CardDescription>
          </div>
          <Badge variant={service.status === "available" ? "default" : "secondary"}>
            {service.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {service.description}
        </p>
        <Badge variant="outline" className="mt-2">
          {serviceTypeLabels[service.service_type] || service.service_type}
        </Badge>
      </CardContent>
      <CardFooter>
        <Button onClick={() => onEnquire(service)} className="w-full" size="lg">
          Enquire Now
        </Button>
      </CardFooter>
    </Card>
    
    <ServiceDetailsDialog
      service={service}
      open={showDetails}
      onOpenChange={setShowDetails}
    />
    </>
  );
}
