import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import { motion } from "framer-motion";


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

type DashboardLayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 dark:bg-gray-900 shadow-md border-r border-gray-200 dark:border-gray-800">
  <div className="p-6 text-center border-b dark:border-gray-800">
    <Image
      src="/logo-myuniagent.png"
      alt="Logo MyUniAgent"
      width={120}
      height={120}
      className="mx-auto"
    />
  </div>

        <nav className="p-4 space-y-2">
          {navItems.map(({ href, label }) => {
            const isActive = router.pathname === href;
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 p-2 rounded transition cursor-pointer
                    ${isActive
                      ? "bg-blue-100 dark:bg-blue-900 font-semibold border-l-4 border-blue-600 dark:border-blue-400 pl-4"
                      : "hover:bg-blue-100 dark:hover:bg-gray-800 pl-4"
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
      <main className="flex-1 overflow-auto bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
        <div className="w-full max-w-6xl mx-auto">
          <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
  className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-2xl space-y-6"
>
  {title && (
    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
      {title}
    </h1>
  )}
  {children}
</motion.div>
        </div>
      </main>
    </div>
  );
}
