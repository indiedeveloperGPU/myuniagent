import React from "react";

const SisalBonusLanding = () => {
  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-6 py-12 text-white"
      style={{ backgroundImage: 'url(https://cdn.pixabay.com/photo/2017/05/10/20/29/football-2308507_1280.jpg)' }}
    >
      <div className="bg-black bg-opacity-90 backdrop-blur-sm rounded-3xl shadow-2xl p-10 max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 border-2 border-yellow-500">

        {/* TEXT SECTION */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-yellow-400">
            Anche i migliori ci giocano...
          </h1>
          <p className="text-xl font-semibold text-white">
            E tu, hai già provato?
          </p>

          <p className="text-base text-gray-200">
            Iscriviti oggi su SISAL, ricevi <span className="text-green-400 font-bold">20€ GRATIS</span> senza deposito e gioca dove vincono anche i campioni. Tutto quello che vinci è <strong>prelevabile</strong>.
          </p>

          <ul className="space-y-3 text-lg text-white">
            <li className="flex items-center gap-2">✅ 20€ subito disponibili</li>
            <li className="flex items-center gap-2">✅ Nessun deposito richiesto</li>
            <li className="flex items-center gap-2">✅ Vinci & preleva liberamente</li>
            <li className="flex items-center gap-2">🕒 Hai già un account? Cancellalo, attendi 15 giorni e rientra col bonus</li>
          </ul>

          <button className="mt-4 bg-gradient-to-r from-lime-400 via-yellow-300 to-orange-500 hover:brightness-110 text-black font-bold py-4 px-8 rounded-full text-xl shadow-2xl animate-pulse transition-transform transform hover:scale-105">
            🎯 ISCRIVITI ORA E TENTA LA FORTUNA 🎰
          </button>

          <p className="text-sm text-gray-400 italic pt-2">
            Offerta valida solo per nuovi utenti • Tempo limitato
          </p>
        </div>

        {/* IMAGE SECTION */}
        <div className="flex flex-col items-center justify-center gap-6">
          {/* Immagine di Tonali */}
          <img
            src="/images/tonali.jpg"
            alt="Sandro Tonali"
            className="w-full rounded-xl shadow-xl border-2 border-yellow-500"
          />

          {/* Immagine di Fagioli */}
          <img
            src="/images/fagioli.jpg"
            alt="Nicolò Fagioli"
            className="w-full rounded-xl shadow-xl border-2 border-yellow-500"
          />
        </div>

      </div>
    </div>
  );
};

export default SisalBonusLanding;
