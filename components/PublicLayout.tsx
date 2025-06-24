import { ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";


type PublicLayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function PublicLayout({ children, title }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-2xl space-y-6"
        >
          <div className="text-center">
            <Image
              src="/logo-myuniagent.png"
              alt="Logo MyUniAgent"
              width={100}
              height={100}
              className="mx-auto mb-4"
            />
            {title && (
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {title}
              </h1>
            )}
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
