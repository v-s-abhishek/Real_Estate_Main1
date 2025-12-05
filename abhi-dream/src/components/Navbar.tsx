import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, User, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsGuest(session?.user?.is_anonymous || false);
      if (session?.user && !session.user.is_anonymous) {
        checkUserRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsGuest(session?.user?.is_anonymous || false);
      if (session?.user && !session.user.is_anonymous) {
        checkUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      setUserRole(data.role);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setIsGuest(false);
    toast({
      title: "Logged out",
      description: isGuest ? "Guest session ended." : "You've been successfully logged out.",
    });
    navigate(isGuest ? "/auth" : "/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="p-2 bg-primary rounded-lg">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl hidden sm:inline-block">Elite Properties</span>
          </Link>

          <div className="flex items-center space-x-4">
            {user && !isGuest && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/chat")}
                className="hidden sm:flex"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat Assistant
              </Button>
            )}

            {(user || isGuest) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    Browse Properties
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/services")}>
                    Featured Services
                  </DropdownMenuItem>
                  {(userRole === "admin" || userRole === "employee") && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        Manage Properties
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/manage-services")}>
                        Manage Services
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/enquiries")}>
                        View Enquiries
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isGuest && (
                    <DropdownMenuItem onClick={() => navigate("/chat")} className="sm:hidden">
                      Chat Assistant
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/auth")} size="sm">
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}