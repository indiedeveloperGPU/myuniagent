import Link from "next/link";
import { useRouter } from "next/router";

const docenteNavItems = [
  { href: "/docente/dashboard", label: "🏠 Dashboard" },
  { href: "/docente/classi", label: "🏫 Classi" },
  { href: "/docente/materiali", label: "📄 Materiali" },
  { href: "/docente/test", label: "🧪 Test ed Esercizi" },
  { href: "/docente/lezioni", label: "📚 Lezioni" },
  { href: "/docente/monitoraggio", label: "📊 Monitoraggio" },
  { href: "/dashboard", label: "🏠 Home" },
];

export default function DocenteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-gray-50 text-black">
      <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 font-bold text-lg text-center border-b border-gray-300">
          👨‍🏫 MyUniAgent Docente
        </div>

        <nav className="p-4 space-y-2">
          {docenteNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`block p-2 rounded hover:bg-blue-100 transition ${
                  router.pathname === item.href ? "bg-blue-100 font-semibold" : ""
                }`}
              >
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}

