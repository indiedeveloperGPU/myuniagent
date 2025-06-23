// components/ProtectedRoute.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) return <p className="text-center mt-10">🔐 Verifica autenticazione...</p>;

  return <>{children}</>;
}
