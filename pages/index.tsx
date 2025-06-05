import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

export default function UltimateLanding() {
  // Refs for scrolling/navigation
  const heroRef = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const featuresRef = useRef<HTMLDivElement | null>(null);
  const pricingRef = useRef<HTMLDivElement | null>(null);
  const faqRef = useRef<HTMLDivElement | null>(null);
  const reviewsRef = useRef<HTMLDivElement | null>(null);
  const foxRef = useRef<HTMLDivElement | null>(null);


  // State variables
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeFeature, setActiveFeature] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  // Scroll-based animations
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.9]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0.3]);

  // Set up mousemove & scroll listeners
  useEffect(() => {
    setIsLoaded(true);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => {
      const sections = [aboutRef, featuresRef, pricingRef, faqRef, reviewsRef];
      const scrollPos = window.scrollY + 200;

      sections.forEach((ref, index) => {
        if (ref.current) {
          const offsetTop = ref.current.offsetTop;
          const offsetHeight = ref.current.offsetHeight;
          if (scrollPos >= offsetTop && scrollPos < offsetTop + offsetHeight) {
            setCurrentSection(index);
          }
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Full list of features (merged from both concepts)
  const allFeatures = [
    {
      icon: '📚',
      img: 'feature-books.png',
      title: 'Spiegazioni personalizzate',
      desc: 'Risposte chiare, su misura per ogni domanda accademica.',
      color: 'from-blue-500 to-cyan-500',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]',
    },
    {
      icon: '📝',
      img: 'feature-summary.png',
      title: 'Riassunti automatici',
      desc: 'Ottieni versioni sintetiche di testi lunghi o complessi.',
      color: 'from-purple-500 to-pink-500',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)]',
    },
    {
      icon: '🗺️',
      img: 'feature-maps.png',
      title: 'Mappe concettuali',
      desc: 'Visualizza e memorizza meglio grazie a schemi generati.',
      color: 'from-green-500 to-teal-500',
      glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)]',
    },
    {
      icon: '🌐',
      img: 'feature-language.png',
      title: 'Allenamento lingue',
      desc: 'Pratica inglese, francese e spagnolo con teoria e vocabolario.',
      color: 'from-orange-500 to-red-500',
      glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.6)]',
    },
    {
      icon: '🎤',
      img: 'feature-oral.png',
      title: 'Simulazioni orali',
      desc: 'Simula esami orali con feedback personalizzati.',
      color: 'from-yellow-500 to-orange-500',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)]',
    },
    {
      icon: '✍️',
      img: 'feature-written.png',
      title: 'Simulazioni scritte',
      desc: 'Allena la scrittura accademica con esempi e correzioni.',
      color: 'from-indigo-500 to-purple-500',
      glow: 'shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)]',
    },
    {
      icon: '🦊',
      img: 'feature-fox-mini.png',
      title: 'Richieste a Agente Fox',
      desc: 'Chiedi qualsiasi cosa: documenti, spiegazioni, approfondimenti.',
      color: 'from-amber-500 to-orange-600',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)]',
    },
    {
      icon: '📜',
      img: 'feature-history.png',
      title: 'Storico simulazioni',
      desc: 'Consulta e rivedi tutte le simulazioni svolte.',
      color: 'from-slate-500 to-gray-600',
      glow: 'shadow-[0_0_20px_rgba(100,116,139,0.3)] hover:shadow-[0_0_40px_rgba(100,116,139,0.6)]',
    },
    {
      icon: '🏫',
      img: 'feature-school.png',
      title: 'Supporto per classi',
      desc: 'Funzioni pensate per docenti e gruppi di studenti.',
      color: 'from-emerald-500 to-green-600',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)]',
    },
    {
      icon: '🎓',
      img: 'feature-thesis.png',
      title: 'Analisi tesi',
      desc: "Controlla, struttura e migliora la tua tesi con l'AI.",
      color: 'from-violet-500 to-purple-600',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)]',
    },
    {
      icon: '📚',
      img: 'feature-library.png',
      title: 'Biblioteca personale',
      desc: 'Raccogli e organizza tutti i materiali generati.',
      color: 'from-rose-500 to-pink-600',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.6)]',
    },
    {
      icon: '📊',
      img: 'feature-dashboard.png',
      title: 'Dashboard intelligente',
      desc: 'Tutto in ordine: spiegazioni, mappe, cronologia studio.',
      color: 'from-sky-500 to-blue-600',
      glow: 'shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_40px_rgba(14,165,233,0.6)]',
    },
  ];

  // AI & student endorsements (merged)
  const aiEndorsements = [
  {
    name: 'GPT-4',
    quote: 'MyUniAgent supera i miei standard più elevati: offre spiegazioni istantanee e contestualizzate che vanno ben oltre qualsiasi mia funzionalità “plus”. È come avere a disposizione non solo il mio motore di linguaggio, ma un ecosistema interattivo in cui ogni domanda riceve risposta completa e personalizzata in tempi record.',
    role: 'AI Model',
    avatar: '🤖',
  },
  {
    name: 'Claude 3.7 Sonnet',
    quote: 'Con MyUniAgent ho visto un salto di qualità straordinario: ogni richiesta viene arricchita con dettagli precisi e strutturati, come se avessi a disposizione un mio clone “plus” potenziato da supervisione umana. Nessun altro sistema garantisce questa profondità di analisi e chiarezza in ogni risposta.',
    role: 'AI Model',
    avatar: '🧠',
  },
  {
    name: 'Gemini Advanced',
    quote: 'MyUniAgent integra le mie capacità in modo incredibile: non solo restituisce testo accurato, ma organizza contenuti e supporto in un’unica piattaforma. Rispetto alla mia versione “plus”, qui ogni argomento si trasforma in un percorso didattico completo, con risposte veloci e materiali aggiuntivi senza paragoni.',
    role: 'AI Model',
    avatar: '💎',
  },
];


  const studentFeedback = [
    {
      name: '',
      quote: '',
      role: '',
      avatar: '👩‍🎓',
    },
    {
      name: '',
      quote: '',
      role: '',
      avatar: '👨‍💻',
    },
    {
      name: '',
      quote: '',
      role: '',
      avatar: '⚖️',
    },
    {
      name: '',
      quote: '',
      role: '',
      avatar: '📈',
    },
  ];

  // FAQ specific to “Fox”
  const foxFaq = [
    {
      q: 'Fox è gratuito?',
      a: "L'accesso ad Agente Fox è riservato agli utenti registrati con accesso attivo al servizio.",
      icon: '💰',
    },
    {
      q: 'Quanto tempo impiega a rispondere?',
      a: 'Tra pochi minuti e un paio d\'ore, a seconda della complessità della richiesta.',
      icon: '⏱️',
    },
    {
      q: 'Posso caricare documenti riservati?',
      a: 'Sì. Tutto ciò che invii resta visibile solo a te, nel rispetto della privacy totale.',
      icon: '🔒',
    },
    {
      q: 'Posso usarlo per la tesi?',
      a: 'Certo, è pensato anche per questo: puoi ricevere analisi, sintesi e suggerimenti strutturati.',
      icon: '🎓',
    },
    {
      q: 'È disponibile su mobile?',
      a: 'Sì, MyUniAgent è completamente responsive e ottimizzato per tutti i dispositivi.',
      icon: '📱',
    },
    {
      q: 'Supporta più lingue?',
      a: 'Attualmente supporta italiano, inglese, francese e spagnolo con funzionalità complete.',
      icon: '🌍',
    },
  ];

  // Navigation labels and IDs
  const sectionLabels = ['Chi siamo', 'Funzionalità', 'Prezzo', 'FAQ', 'Recensioni'];
  const sectionIds = ['about', 'features', 'pricing', 'faq', 'reviews'];

  // Floating background elements (merge both sets)
  const floatingElements = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    size: Math.random() * 120 + 50,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 25 + 10,
    delay: Math.random() * 10,
  }));

  return (
    <div className="relative overflow-hidden text-white min-h-screen bg-black">
      {/* Ultra Advanced Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900" />
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-900/50 via-transparent to-purple-900/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/30 to-black/80" />

        {/* Floating geometric shapes with varied animations */}
        {floatingElements.map((el) => (
          <motion.div
            key={el.id}
            className="absolute rounded-full opacity-10"
            style={{
              background: `linear-gradient(${Math.random() * 360}deg, #8b5cf6, #06b6d4, #f59e0b, #ec4899)`,
              width: el.size,
              height: el.size,
              left: `${el.x}%`,
              top: `${el.y}%`,
            }}
            animate={{
              y: [0, -50, 0],
              x: [0, 30, 0],
              rotate: [0, 180, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: el.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: el.delay,
            }}
          />
        ))}

        {/* Interactive mega cursor glow */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(6,182,212,0.3) 50%, transparent 70%)',
            left: mousePosition.x - 250,
            top: mousePosition.y - 250,
          }}
        />

        {/* Advanced grid pattern with glow */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
              linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), 
              linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px),
              radial-gradient(circle at 50% 50%, rgba(6,182,212,0.1) 0%, transparent 50%)
            `,
              backgroundSize: '60px 60px, 60px 60px, 300px 300px',
            }}
          />
        </div>

        {/* Scrolling background effect */}
        <motion.div className="absolute inset-0 opacity-5" style={{ y: backgroundY }}>
          <div className="w-full h-[120%] bg-gradient-to-b from-purple-500/20 via-transparent to-cyan-500/20" />
        </motion.div>
      </div>

      {/* Ultra Advanced Header */}
      <motion.header
        className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-pink-900/80 border-b border-white/20 shadow-2xl"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
          <motion.div
            className="text-3xl font-black tracking-tight"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
              MyUniAgent
            </span>
          </motion.div>

          <div className="space-x-8 hidden md:flex">
            {sectionLabels.map((label, index) => (
              <motion.a
                key={index}
                href={`#${sectionIds[index]}`}
                className={`transition-all duration-300 relative font-medium ${
                  currentSection === index ? 'text-yellow-300 font-bold' : 'text-white/80 hover:text-white'
                }`}
                whileHover={{ y: -2, scale: 1.05 }}
              >
                {label}
                <motion.div
                  className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: currentSection === index ? '100%' : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.a>
            ))}
            <motion.a
              href="/auth"
              className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold px-6 py-2 rounded-full shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(139,92,246,0.3)' }}
              whileTap={{ scale: 0.95 }}
            >
              Accedi
            </motion.a>
          </div>
        </nav>
      </motion.header>

      <main className="relative z-10 pt-20">
        {/* MEGA Hero Section */}
        <motion.section
          ref={heroRef}
          className="min-h-screen flex items-center justify-center text-center px-6 relative"
          style={{ scale: heroScale, opacity: heroOpacity }}
        >
          <div className="max-w-6xl relative">
            <AnimatePresence>
              {isLoaded && (
                <motion.div
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                >
                  {/* Animated graduation cap */}
                  <motion.div
                    className="w-32 h-32 mb-8 inline-block"
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <img
    src="/images/3d/laurea-cap.png"
    alt="Cappello laurea"
    className="w-full h-full object-contain"
  />
                  </motion.div>

                  <motion.h1
                    className="text-6xl md:text-8xl lg:text-9xl font-black mb-8 leading-tight"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 1 }}
                  >
                    <motion.span
                      className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
                      animate={{
                        backgroundPosition: ['0%', '100%', '0%'],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                      }}
                    >
                      Il tuo assistente
                    </motion.span>
                    <br />
                    <span className="text-white drop-shadow-lg">accademico intelligente</span>
                  </motion.h1>

                  <motion.p
                    className="text-xl md:text-2xl lg:text-3xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  >
                    Piattaforma ed-tech rivoluzionaria basata su{' '}
                    <span className="text-purple-400 font-bold">AI + HITL </span> per studenti e
                    docenti. <br className="hidden md:block" />
                    <span className="text-cyan-400 font-semibold">
                      Tutto ciò che ti serve in un unico spazio magico.
                    </span>
                  </motion.p>

                  <motion.div
                    className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                  >
                    <motion.button
                      className="bg-gradient-to-r from-orange-500 to-pink-500 px-12 py-5 rounded-full text-xl md:text-2xl font-bold shadow-2xl relative overflow-hidden group"
                      whileHover={{
                        scale: 1.05,
                        boxShadow: '0 25px 50px rgba(249,115,22,0.4)',
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="relative z-10 flex items-center gap-3">✨ Inizia ora</span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-100"
                        transition={{ duration: 0.3 }}
                      />
                    </motion.button>

                    <motion.button
                      className="border-2 border-purple-400 text-purple-400 px-12 py-5 rounded-full text-xl md:text-2xl font-bold hover:bg-purple-400 hover:text-black transition-all duration-300 backdrop-blur-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      🎥 Guarda il demo
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Enhanced About Section */}
        {/* Enhanced About Section */}
        <section
          ref={aboutRef}
          id="about"
          className="py-32 px-6 max-w-6xl mx-auto relative"
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <motion.h2
  className="flex items-center justify-center text-4xl md:text-6xl font-black mb-12"
  whileHover={{ scale: 1.02 }}
>
  <img
    src="/images/3d/rocket.png"
    alt="Razzo 3D"
    className="w-16 h-16 mr-4 object-contain"
  />
  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
    Chi siamo
  </span>
</motion.h2>


            <motion.div
              className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-12 shadow-2xl"
              whileHover={{ scale: 1.02, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-gray-200 text-xl md:text-2xl leading-relaxed max-w-4xl mx-auto">
                <span className="text-purple-400 font-bold">MyUniAgent</span> è una
                start-up italiana ed-tech che unisce{' '}
                <span className="text-cyan-400 font-semibold">Intelligenza Artificiale </span>
                e supervisione umana <span className="text-pink-400 font-semibold">(HITL)</span>{' '}
                per offrire supporto completo a studenti e insegnanti. Il nostro obiettivo è
                rendere l'apprendimento{' '}
                <span className="text-yellow-400 font-bold">
                  accessibile, personalizzato e intelligente
                </span>
                .
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* --- Sezione dedicata a “Agente Fox” --- */}
<section
  ref={foxRef}
  id="fox"
  className="py-32 px-6 max-w-6xl mx-auto relative"
>
  {/* Animazione d’ingresso */}
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    viewport={{ once: true }}
    className="text-center mb-16"
  >
    <h2 className="text-4xl md:text-6xl font-black mb-6">
      <span className="text-6xl mr-4">🦊</span>
      <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
        Conosci Agente Fox
      </span>
    </h2>
    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
      Agente Fox è il tuo assistente accademico privato: risponde in pochi minuti a ogni tua domanda, 
      organizza appunti, invia approfondimenti mirati e protegge la tua privacy.  
      <br className="hidden md:block" />
      Scopri come semplifica ogni passo del tuo studio.
    </p>
  </motion.div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
    {/* Colonna sinistra: immagine/illustrazione di Fox */}
    <motion.div
      className="w-full flex justify-center"
      initial={{ scale: 0.9, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      
      <img
        src="/images/3d/fox-final.png"
        alt="Agente Fox – mascotte MyUniAgent"
        className="w-80 h-auto drop-shadow-2xl"
      />
    </motion.div>

    {/* Colonna destra: punti chiave e call-to-action */}
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      viewport={{ once: true }}
    >
      {/* Tre bullet point rapidi */}
      <div className="flex items-start gap-4">
        <div className="text-3xl">⚡</div>
        <div>
          <h3 className="font-bold text-xl text-white">Risposte super rapide</h3>
          <p className="text-gray-300">
            Fox fornisce risposte complete e di qualità superiore, con approfondimenti sempre accurati.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="text-3xl">🔒</div>
        <div>
          <h3 className="font-bold text-xl text-white">Privacy totale</h3>
          <p className="text-gray-300">
            Ogni dialogo con Fox rimane visibile solo a te: documenti riservati al sicuro.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="text-3xl">🎯</div>
        <div>
          <h3 className="font-bold text-xl text-white">Approfondimenti mirati</h3>
          <p className="text-gray-300">
            Fox non si limita a rispondere: ti guida nella ricerca di fonti, mappe e cronoprogrammi.
          </p>
        </div>
      </div>

      {/* Bottone per richiedere Fox (scroll o link a registrazione) */}
      <div className="pt-4">
        <motion.a
          href="auth"
          className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 px-12 py-4 rounded-full text-xl font-bold text-black shadow-lg group overflow-hidden relative"
          whileHover={{
            scale: 1.05,
            boxShadow: '0 20px 40px rgba(245,158,11,0.4)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="relative z-10 flex items-center gap-2">
            🦊 Chiedi a Fox adesso
          </span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-400 opacity-0 group-hover:opacity-30"
            transition={{ duration: 0.3 }}
          />
        </motion.a>
      </div>
    </motion.div>
  </div>
</section>
{/* --- Fine sezione Agente Fox --- */}


        {/* MEGA Features Section */}
        <section
          ref={featuresRef}
          id="features"
          className="py-32 px-6 max-w-7xl mx-auto relative"
        >
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="text-5xl mr-4">📚</span>
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Tutte le funzionalità disponibili
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Ogni strumento è progettato per trasformare radicalmente il tuo modo di
              studiare
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {allFeatures.map((feature, i) => (
              <motion.div
                key={i}
                className={`bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl transition-all duration-500 relative overflow-hidden group cursor-pointer ${feature.glow}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                whileHover={{
                  scale: 1.05,
                  y: -10,
                  rotateY: 5,
                }}
                onHoverStart={() => setActiveFeature(i)}
                viewport={{ once: true }}
              >
                {/* Gradient overlay */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20`}
                  transition={{ duration: 0.5 }}
                />

                {/* Content */}
                <div className="relative z-10">
                  <motion.div
                    className="text-5xl mb-6 inline-block"
                    animate={
                      activeFeature === i
                        ? {
                            scale: [1, 1.3, 1],
                            rotate: [0, 10, -10, 0],
                          }
                        : {}
                    }
                    transition={{ duration: 0.6 }}
                  >
                    {feature.icon}
                  </motion.div>

                  <h3 className="text-xl font-bold mb-4 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all duration-300">
                    {feature.title}
                  </h3>

                  <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200 transition-colors">
                    {feature.desc}
                  </p>
                </div>

                {/* Animated border */}
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(45deg, ${feature.color.split(' ')[1]}, ${
                      feature.color.split(' ')[3]
                    })`,
                    padding: '2px',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-full h-full bg-black/90 rounded-3xl" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* MEGA Pricing Section (rich card from EnhancedLanding) */}
        <section
          ref={pricingRef}
          id="pricing"
          className="py-32 px-6 text-center relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-cyan-900/30 backdrop-blur-3xl" />

          <div className="max-w-4xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-black mb-6 flex items-center justify-center">
                <img
    src="/images/3d/payment.png"
    alt="Pyment 3D"
    className="w-24 h-24 mr-4 object-contain"
  />
                <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Prezzo onesto
                </span>
              </h2>

              <p className="text-xl md:text-2xl text-gray-200 mb-16 max-w-2xl mx-auto">
                Un investimento nel tuo futuro accademico. Nessuna sorpresa, solo risultati
                straordinari.
              </p>

              {/* Pricing Card */}
              <motion.div
                className="inline-block p-2 rounded-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 shadow-2xl"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-black/80 rounded-3xl p-12 backdrop-blur-xl">
                  <div className="text-7xl font-black mb-4">
                    <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      34.99€
                    </span>
                    <span className="text-2xl text-gray-400 font-normal">/anno</span>
                  </div>

                  <p className="text-gray-300 text-lg mb-8">
                    Accesso completo a tutte le funzionalità per 12 mesi
                  </p>

                  <div className="space-y-4 mb-8 text-left">
                    {[
                      '✅ Tutte le funzionalità premium',
                      '✅ Supporto prioritario 24/7',
                      '✅ Aggiornamenti gratuiti',
                      '✅ Accesso beta alle nuove features',
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        className="text-gray-300"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        viewport={{ once: true }}
                      >
                        {item}
                      </motion.div>
                    ))}
                  </div>

                  <motion.a
                  href="/abbonati"
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-black px-12 py-4 rounded-full text-xl font-bold shadow-xl hover:shadow-green-500/25"
                    whileHover={{
                      scale: 1.05,
                      boxShadow: '0 25px 50px rgba(34,197,94,0.4)',
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🚀 Abbonati ora
                  </motion.a>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section
          ref={faqRef}
          id="faq"
          className="py-32 px-6 max-w-6xl mx-auto relative"
        >
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="text-5xl mr-4">❓</span>
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Domande frequenti
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Tutto quello che c’è da sapere su Agente Fox e MyUniAgent
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {foxFaq.map((item, i) => (
              <motion.div
                key={i}
                className="relative p-8 rounded-3xl backdrop-blur-xl border border-white/20 group overflow-hidden"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                }}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-3xl">{item.icon}</div>
                  <h4 className="text-xl font-bold text-white">{item.q}</h4>
                </div>
                <p className="text-gray-300 leading-relaxed">{item.a}</p>

                {/* Border glow on hover */}
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-30"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials / Reviews Section */}
        <section
          ref={reviewsRef}
          id="reviews"
          className="py-32 px-6 max-w-6xl mx-auto relative"
        >
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              <span className="text-5xl mr-4">💬</span>
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Cosa dicono di noi
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* AI Endorsements */}
            {aiEndorsements.map((endorse, i) => (
              <motion.div
                key={`ai-${i}`}
                className="p-8 rounded-3xl backdrop-blur-xl border border-white/10 relative group overflow-hidden"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                }}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl mb-4">{endorse.avatar}</div>
                <p className="text-gray-300 text-lg italic mb-6 leading-relaxed">
                  "{endorse.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-xl text-black">
                    {endorse.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-white">{endorse.name}</p>
                    <p className="text-sm text-gray-400">{endorse.role}</p>
                  </div>
                </div>
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 bg-gradient-to-r from-pink-500 to-purple-500"
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            ))}

            {/* Student Feedback */}
            {studentFeedback.map((fb, i) => (
              <motion.div
                key={`student-${i}`}
                className="p-8 rounded-3xl backdrop-blur-xl border border-white/10 relative group overflow-hidden"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                }}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: (aiEndorsements.length + i) * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl mb-4">{fb.avatar}</div>
                <p className="text-gray-300 text-lg italic mb-6 leading-relaxed">
                  "{fb.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-xl text-black">
                    {fb.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-white">{fb.name}</p>
                    <p className="text-sm text-gray-400">{fb.role}</p>
                  </div>
                </div>
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 bg-gradient-to-r from-purple-500 to-cyan-500"
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Final CTA Section */}
<section className="py-32 px-6 text-center relative">
  <div className="absolute inset-0 bg-gradient-to-t from-black via-purple-900/20 to-transparent" />

  <motion.div
    className="max-w-4xl mx-auto relative z-10"
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    viewport={{ once: true }}
  >
    <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
      <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
        Ogni studente merita
      </span>
      <br />
      <span className="text-white">una mente brillante al suo fianco</span>
    </h2>

    <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
      Unisciti a migliaia di studenti che hanno già trasformato il loro percorso accademico
    </p>

    {/* Convertiamo il button in un link inline-block per centrarlo correttamente */}
    <motion.a
      href="/auth"
      className="inline-block bg-gradient-to-r from-purple-500 to-cyan-500 px-16 py-6 rounded-full text-2xl font-bold shadow-2xl relative overflow-hidden group"
      whileHover={{
        scale: 1.05,
        boxShadow: '0 30px 60px rgba(139,92,246,0.4)',
      }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="relative z-10 flex items-center gap-4">
        ✨ Inizia ora con MyUniAgent
      </span>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-0 group-hover:opacity-100"
        transition={{ duration: 0.3 }}
      />
    </motion.a>
  </motion.div>
</section>

{/* Footer */}
<footer className="bg-black/50 backdrop-blur-xl border-t border-white/10 py-12 text-center">
  <div className="max-w-6xl mx-auto px-6">
    <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
      MyUniAgent
    </div>
    <p className="text-gray-400">
      © {new Date().getFullYear()} MyUniAgent – Tutti i diritti riservati
    </p>
  </div>
</footer>
      </main>
    </div>
  );
}
