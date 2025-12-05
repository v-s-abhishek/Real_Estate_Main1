import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Square, MapPin, Info } from "lucide-react";
import { useState } from "react";
import PropertyDetailsDialog from "./PropertyDetailsDialog";

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

interface PropertyCardProps {
  property: Property;
  onEnquire: (property: Property) => void;
}

export default function PropertyCard({ property, onEnquire }: PropertyCardProps) {
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
            src={property.images?.[0] || "/placeholder.svg"}
            alt={property.title}
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
            <CardTitle className="text-xl">{property.title}</CardTitle>
            <CardDescription className="flex items-center mt-2">
              <MapPin className="w-4 h-4 mr-1" />
              {property.address}
            </CardDescription>
          </div>
          <Badge variant={property.status === "available" ? "default" : "secondary"}>
            {property.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-primary mb-4">
          {formatPrice(property.price)}
        </p>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {property.description}
        </p>
        <div className="flex gap-4 text-sm">
          {property.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-muted-foreground" />
              <span>{property.bedrooms} Beds</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-muted-foreground" />
              <span>{property.bathrooms} Baths</span>
            </div>
          )}
          {property.area_sqft && (
            <div className="flex items-center gap-1">
              <Square className="w-4 h-4 text-muted-foreground" />
              <span>{property.area_sqft} sqft</span>
            </div>
          )}
        </div>
        {property.property_type && (
          <p className="text-xs text-muted-foreground mt-2">
            Type: {property.property_type}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={() => onEnquire(property)} className="w-full" size="lg">
          Enquire Now
        </Button>
      </CardFooter>
    </Card>
    
    <PropertyDetailsDialog
      property={property}
      open={showDetails}
      onOpenChange={setShowDetails}
    />
    </>
  );
}