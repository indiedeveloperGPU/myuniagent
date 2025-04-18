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
  { href: "/lingue", label: "🌍 Allenamento Lingue" }, 
  { href: "/tools/simulazioni-scritte", label: "✍️ Simulazioni Scritte" },
  { href: "/tools/simulazioni-orali", label: "🎤 Simulazioni Orali" },
  { href: "/tools/richieste-fox", label: "🦊 Richieste Agente Fox" },
  { href: "/tools/classi", label: "🏫 Classi" },
  { href: "/tools/upload-tesi", label: "📤 Upload Tesi" },
  { href: "/tools/analyze-tesi", label: "🔍 Analisi Tesi" },
  { href: "/tools/biblioteca", label: "📚 Biblioteca" },
  { href: "/tools/supporto", label: "🆘 Supporto" },
  { href: "/dashboard/profilo", label: "👤 Profilo" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white shadow-lg border-r">
        <div className="p-6 font-bold text-lg text-center border-b">🎓 MyUniAgent</div>
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

