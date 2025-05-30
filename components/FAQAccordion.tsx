import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

// Tipi e dati
const faqData = [
  {
    domanda: "Il pagamento è una tantum?",
    risposta: "Sì, 30€ per 12 mesi. Nessun costo ricorrente automatico.",
  },
  {
    domanda: "Posso usare MyUniAgent su più dispositivi?",
    risposta: "Certamente, basta accedere con lo stesso account.",
  },
  {
    domanda: "Il contenuto è adatto a studenti universitari e superiori?",
    risposta: "Sì, supportiamo entrambe le fasce con strumenti personalizzati.",
  },
  {
    domanda: "Il rinnovo è automatico?",
    risposta: "No, ti invieremo un promemoria prima della scadenza.",
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg sm:text-xl font-semibold text-center text-blue-700 dark:text-blue-300 mb-4">
        Domande frequenti (FAQ)
      </h3>
      {faqData.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden transition-all duration-300"
          >
            <button
              onClick={() => toggle(i)}
              className={`w-full flex justify-between items-center px-6 py-4 text-left font-medium text-lg transition-colors duration-300 ${
                isOpen
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200"
              }`}
            >
              <span>{faq.domanda}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="px-6 pb-6 pt-0 text-base text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-700"
                >
                  {faq.risposta}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
