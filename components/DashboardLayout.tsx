import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { User } from '@supabase/supabase-js';
import { 
  Home, 
  FileText, 
  BookOpen, 
  Brain, 
  Search, 
  Languages, 
  Edit, 
  Mic, 
  BarChart3, 
  Users, 
  Library, 
  Bot, 
  User as UserIcon, 
  HelpCircle,
  Bell,
  ChevronDown,
  Settings,
  Zap,
  Menu,
  X
} from "lucide-react";

// Definizione delle categorie e items di navigazione
const navigationCategories = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    href: "/dashboard",
    type: "single"
  },
  {
    id: "ai-tools",
    label: "Strumenti AI",
    icon: Brain,
    type: "dropdown",
    items: [
      { href: "/tools/riassunto", label: "Riassunto", icon: FileText, description: "Genera riassunti automatici" },
      { href: "/tools/dashboard-bulk", label: "Dashboard Riassunti Bulk", icon: FileText, description: "Riassumi più documenti contemporaneamente." },
      { href: "/tools/spiegazione", label: "Spiegazione", icon: BookOpen, description: "Spiegazioni dettagliate" },
      { href: "/tools/mappa", label: "Mappa Concettuale", icon: Brain, description: "Crea mappe concettuali" },
      { href: "/tools/analisi-tesi", label: "Analisi Tesi", icon: Search, description: "Analizza documenti di tesi" },
    ]
  },
  {
    id: "training",
    label: "Allenamento",
    icon: Zap,
    type: "dropdown",
    items: [
      { href: "/tools/home-lingue", label: "Lingue", icon: Languages, description: "Pratica le lingue straniere" },
      { href: "/tools/simulazioni-scritte", label: "Simulazioni Scritte", icon: Edit, description: "Esercitazioni scritte" },
      { href: "/tools/simulazioni-orali", label: "Simulazioni Orali", icon: Mic, description: "Preparazione esami orali" },
    ]
  },
  {
    id: "performance",
    label: "Performance",
    icon: BarChart3,
    href: "/tools/storico-simulazioni",
    type: "single"
  },
  {
    id: "management",
    label: "Classi",
    icon: Users,
    href: "/tools/classi",
    type: "single"
  },
  {
    id: "library",
    label: "Biblioteca",
    icon: Library,
    href: "/tools/biblioteca",
    type: "single"
  },
  {
    id: "assistant",
    label: "Agente Fox",
    icon: Bot,
    href: "/tools/richieste-fox",
    type: "single"
  },
];

const accountItems = [
  { href: "/dashboard/profilo", label: "Profilo", icon: UserIcon },
  { href: "/tools/supporto", label: "Supporto", icon: HelpCircle },
];

// Tipo per il profilo utente
type UserProfile = {
  id: string;
  email: string | null;
  name: string | null;
  ruolo: 'studente' | 'docente' | 'staff' | null;
  is_verified: boolean;
  abbonamento_attivo: boolean;
  bio: string | null;
  badge_certificazione: boolean;
  abbonamento_scadenza: string | null;
  lingua_preferita: string | null;
  ultimo_accesso: string | null;
  created_at: string;
};

type DashboardLayoutProps = {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
};

export default function DashboardLayout({ children, title, breadcrumbs }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Get current user and listen for auth changes
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user profile from Supabase
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Funzioni helper per i dati utente
  const getUserDisplayName = () => {
    if (!userProfile) return 'Utente';
    return userProfile.name || userProfile.email?.split('@')[0] || 'Utente';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserRole = () => {
    if (!userProfile?.ruolo) return 'Utente';
    const roles = {
      'studente': 'Studente',
      'docente': 'Docente', 
      'staff': 'Staff'
    };
    return roles[userProfile.ruolo] || 'Utente';
  };

  const getSubscriptionInfo = () => {
    if (!userProfile) return { plan: 'Free', status: 'inattivo' };
    
    if (userProfile.abbonamento_attivo) {
      return {
        plan: userProfile.badge_certificazione ? 'Premium' : 'Pro',
        status: 'attivo'
      };
    }
    
    return { plan: 'Free', status: 'inattivo' };
  };

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActiveRoute = (href: string) => {
    return router.pathname === href;
  };

  const hasActiveRoute = (items: any[]) => {
    return items?.some((item) => isActiveRoute(item.href));
  };

  const toggleDropdown = (categoryId: string) => {
    setActiveDropdown(activeDropdown === categoryId ? null : categoryId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Principal */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Brand */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image
                  src="/logo-myuniagent.png"
                  alt="MyUniAgent"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    MyUniAgent
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {userProfile?.ruolo === 'docente' ? 'Portale Docenti' : 'Portale Studenti'}
                  </p>
                </div>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca in riassunti, spiegazioni, mappe..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {loading ? 'Caricamento...' : getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {loading ? '' : `${getUserRole()} • ${getSubscriptionInfo().plan}`}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {loading ? '...' : getUserInitials()}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {/* User Dropdown */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {loading ? 'Caricamento...' : getUserDisplayName()}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {loading ? '' : (userProfile?.email || 'Email non disponibile')}
                        </p>
                        {!loading && userProfile && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                              getSubscriptionInfo().status === 'attivo' 
                                ? 'bg-green-50 dark:bg-green-900/20' 
                                : 'bg-gray-50 dark:bg-gray-700'
                            }`}>
                              <Zap className={`w-3 h-3 ${
                                getSubscriptionInfo().status === 'attivo'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`} />
                              <span className={`text-xs font-medium ${
                                getSubscriptionInfo().status === 'attivo'
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {getSubscriptionInfo().plan}
                              </span>
                            </div>
                            {userProfile.badge_certificazione && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
                                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                                  🏆 Certificato
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {!loading && accountItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link key={item.href} href={item.href}>
                            <div className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <Icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center h-14 space-x-1" ref={dropdownRef}>
            {navigationCategories.map((category) => {
              const Icon = category.icon;
              const isActive = category.type === "single" 
                ? isActiveRoute(category.href!)
                : hasActiveRoute(category.items || []);

              if (category.type === "single") {
                return (
                  <Link key={category.id} href={category.href!}>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}>
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{category.label}</span>
                    </div>
                  </Link>
                );
              }

              return (
                <div key={category.id} className="relative">
                  <button
                    onClick={() => toggleDropdown(category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive || activeDropdown === category.id
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{category.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      activeDropdown === category.id ? "rotate-180" : ""
                    }`} />
                  </button>

                  <AnimatePresence>
                    {activeDropdown === category.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                      >
                        {category.items?.map((item) => {
                          const ItemIcon = item.icon;
                          const itemIsActive = isActiveRoute(item.href);
                          return (
                            <Link key={item.href} href={item.href}>
                              <div className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                                itemIsActive
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}>
                                <ItemIcon className={`w-5 h-5 mt-0.5 ${
                                  itemIsActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                                }`} />
                                <div>
                                  <div className="font-medium">{item.label}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {item.description}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t border-gray-200 dark:border-gray-700 py-4"
              >
                <div className="space-y-2">
                  {navigationCategories.map((category) => {
                    const Icon = category.icon;
                    const isActive = category.type === "single" 
                      ? isActiveRoute(category.href!)
                      : hasActiveRoute(category.items || []);

                    if (category.type === "single") {
                      return (
                        <Link key={category.id} href={category.href!}>
                          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                            isActive
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                              : "text-gray-700 dark:text-gray-300"
                          }`}>
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{category.label}</span>
                          </div>
                        </Link>
                      );
                    }

                    return (
                      <div key={category.id}>
                        <div className={`flex items-center gap-3 px-4 py-3 font-medium ${
                          isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"
                        }`}>
                          <Icon className="w-5 h-5" />
                          <span>{category.label}</span>
                        </div>
                        <div className="ml-8 space-y-1">
                          {category.items?.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                              <Link key={item.href} href={item.href}>
                                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                                  isActiveRoute(item.href)
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                    : "text-gray-600 dark:text-gray-400"
                                }`}>
                                  <ItemIcon className="w-4 h-4" />
                                  <span>{item.label}</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Breadcrumbs */}
      {breadcrumbs && (
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && (
                    <span className="mx-2 text-gray-400">/</span>
                  )}
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-900 dark:text-white font-medium">
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8"
          >
            {title && (
              <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h1>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}