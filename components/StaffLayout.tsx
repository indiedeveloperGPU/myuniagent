import Link from "next/link";
import { useRouter } from "next/router";

const navItems = [
  { href: "/staff/dashboard", label: "🏠 Dashboard" },
  { href: "/staff/gestione-utenti", label: "👥 Gestione Utenti" },
  { href: "/staff/supporto", label: "🆘  Richieste Supporto" },
  { href: "/staff/contenuti", label: "🧠 Genera contenuto" },
  { href: "/staff/agente-fox", label: "🦊 Richieste Fox" },
  { href: "/staff/lingue-fox", label: "🦊 Lingue Fox" },
  { href: "/staff/fox-genera-contenuto", label: "🧠 Genera Contenuto Lingue" },
  // Puoi aggiungere altre sezioni in futuro...
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white shadow-lg border-r">
        <div className="p-6 font-bold text-lg text-center border-b">🎯 Staff Panel</div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 p-2 rounded hover:bg-blue-100 transition ${
                  router.pathname === item.href ? "bg-blue-100 font-semibold" : ""
                }`}
              >
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
