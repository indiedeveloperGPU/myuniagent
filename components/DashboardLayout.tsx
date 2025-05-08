import Link from "next/link";
import { useRouter } from "next/router";
import {
  FaHome,
  FaBookOpen,
  FaLightbulb,
  FaQuestionCircle,
  FaProjectDiagram,
  FaLanguage,
  FaUpload,
  FaSearch,
  FaTasks,
  FaUserCircle,
  FaPenFancy,
  FaMicrophoneAlt,
} from "react-icons/fa";

const navItems = [
  { href: "/dashboard", label: "🏠 Home" },
  { href: "/tools/riassunto", label: "📝 Riassunto" },
  { href: "/tools/spiegazione", label: "📚 Spiegazione" },
  { href: "/tools/mappa", label: "🧠 Mappa" },
  { href: "/tools/home-lingue", label: "🌍 Allenamento Lingue" }, 
  { href: "/tools/simulazioni-scritte", label: "✍️ Simulazioni Scritte" },
  { href: "/tools/simulazioni-orali", label: "🎤 Simulazioni Orali" },
  { href: "/tools/richieste-fox", label: "🦊 Richieste Agente Fox" },
  { href: "/tools/storico-simulazioni", label: "📊 Storico Simulazioni" },
  { href: "/tools/classi", label: "🏫 Classi" },
  { href: "/tools/analyze-tesi", label: "🔍 Analisi Tesi" },
  { href: "/tools/biblioteca", label: "📚 Biblioteca" },
  { href: "/tools/supporto", label: "🆘 Supporto" },
  { href: "/dashboard/profilo", label: "👤 Profilo" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-950 shadow-lg border-r dark:border-gray-800">
        <div className="p-6 text-lg font-bold text-center border-b dark:border-gray-800">
          🎓 MyUniAgent
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map(({ href, label }) => {
            const isActive = router.pathname === href;
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 p-2 rounded transition cursor-pointer
                    ${isActive
                      ? "bg-blue-100 dark:bg-blue-900 font-semibold"
                      : "hover:bg-blue-100 dark:hover:bg-gray-800"
                    }`}
                >
                  <span>{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}

