import { Dialog } from "@headlessui/react";
import { useState } from "react";
import {
  BookOpen, Target, Camera, Brain, Zap, ArrowRight,
  Sparkles
} from "lucide-react";

export default function TutorialModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: "power",
      icon: <Zap className="w-5 h-5" />,
      title: "Il Potere",
      content: {
        title: "Trasforma la Curiosità in Conoscenza",
        description:
          "Non più ricerche infinite su Google. Ottieni spiegazioni su misura che si adattano al tuo livello e stile di apprendimento.",
        features: [
          {
            icon: <Brain className="w-4 h-4" />,
            text: "Personalizzazione intelligente",
            desc: "Adatta al tuo livello scolastico",
          },
          {
            icon: <Camera className="w-4 h-4" />,
            text: "OCR integrato",
            desc: "Fotografa e ottieni spiegazioni istantanee",
          },
          {
            icon: <Target className="w-4 h-4" />,
            text: "Precisione chirurgica",
            desc: "Vai dritto al punto, zero tempo perso",
          },
        ],
      },
    },
    {
      id: "method",
      icon: <BookOpen className="w-5 h-5" />,
      title: "Il Metodo",
      content: {
        title: "La Formula del Successo",
        description:
          'Tre passi per ottenere spiegazioni che ti faranno dire "Finalmente ho capito!"',
        steps: [
          {
            number: "01",
            title: "DEFINISCI",
            desc: "Scrivi una domanda precisa invece di un argomento generico",
          },
          {
            number: "02",
            title: "CALIBRA",
            desc: "Seleziona il tuo livello per ottenere il linguaggio giusto",
          },
          {
            number: "03",
            title: "APPROFONDISCI",
            desc: "Continua la conversazione per esplorare ogni dettaglio",
          },
        ],
      },
    },
    {
      id: "examples",
      icon: <Sparkles className="w-5 h-5" />,
      title: "Gli Esempi",
      content: {
        title: "Trasforma le Tue Domande",
        description:
          "Vedi la differenza tra una domanda normale e una domanda che ottiene risultati straordinari.",
        comparisons: [
          {
            bad: { text: "Spiegami la matematica", type: "Vago" },
            good: {
              text: "Come si risolve un sistema di equazioni con il metodo di sostituzione?",
              type: "Specifico",
            },
          },
          {
            bad: { text: "Che cos'è la storia?", type: "Generico" },
            good: {
              text: "Quali furono le cause della caduta dell'Impero Romano d'Occidente?",
              type: "Mirato",
            },
          },
          {
            bad: { text: "Aiutami con la chimica", type: "Indefinito" },
            good: {
              text: "Come funziona il legame ionico tra sodio e cloro?",
              type: "Preciso",
            },
          },
        ],
      },
    },
  ];

  const currentTab = tabs[activeTab];

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
       <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="relative bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl max-w-4xl w-full z-50">
          <button
  onClick={onClose}
  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition text-xl"
  aria-label="Chiudi tutorial"
>
  &times;
</button>

          <div className="text-center mb-6">
  <div className="inline-flex items-center justify-center gap-2 text-purple-600 dark:text-purple-300 text-3xl font-bold mb-2 animate-fade-in">
    <Sparkles className="w-6 h-6" />
    <span>Spiegazione Intelligente</span>
    <Sparkles className="w-6 h-6" />
  </div>
  <p className="text-gray-500 dark:text-gray-400 text-sm">
    L'AI che trasforma ogni domanda in una lezione su misura.
  </p>
</div>


          <div className="flex justify-center mb-6">
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(index)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 ${ activeTab === index
    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105 ring-2 ring-white/50'
    : 'text-gray-600 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/30'
}`}

                >
                  {tab.icon}
                  <span className="font-medium">{tab.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                {currentTab.content.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                {currentTab.content.description}
              </p>
            </div>

            {activeTab === 0 && currentTab.content.features && (
              <div className="grid md:grid-cols-3 gap-6">
                {currentTab.content.features.map((feature, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-5 border hover:scale-105 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-indigo-500 text-white rounded-lg">
                        {feature.icon}
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                        {feature.text}
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">{feature.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 1 && currentTab.content.steps && (
              <div className="space-y-4">
                {currentTab.content.steps.map((step, index) => (
                  <div
  key={index}
  className="flex flex-col items-center text-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
>
  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm">
    {step.number}
  </div>
  <div>
    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
      {step.title}
    </h3>
    <p className="text-sm text-gray-600 dark:text-gray-300">{step.desc}</p>
  </div>
</div>


                ))}
              </div>
            )}

            {activeTab === 2 && currentTab.content.comparisons && (
              <div className="space-y-6">
                {currentTab.content.comparisons.map((comp, index) => (
                  <div key={index} className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-red-100 dark:bg-red-800/20 border-l-4 border-red-400 rounded-xl">
                      <div className="text-red-600 font-medium">{comp.bad.type}</div>
                      <p className="italic text-gray-700 dark:text-gray-300">"{comp.bad.text}"</p>
                    </div>
                    <div className="p-4 bg-green-100 dark:bg-green-800/20 border-l-4 border-green-400 rounded-xl">
                      <div className="text-green-600 font-medium">{comp.good.type}</div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">"{comp.good.text}"</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
