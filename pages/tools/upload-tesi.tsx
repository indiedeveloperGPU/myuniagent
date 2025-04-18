import { useState } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout"; // ✅ Layout studente
import { supabase } from "@/lib/supabaseClient";

function UploadTesiPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setMessage("");
    setError("");
    setPreview("");

    if (file) {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Formato file non supportato. Carica un PDF, DOCX o TXT.");
        return;
      }

      // Anteprima per TXT e PDF
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setPreview(content.slice(0, 1000));
        };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdfjsLib = await import("pdfjs-dist");

          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.js";

          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          const page = await pdf.getPage(1);
          const content = await page.getTextContent();
          const text = content.items.map((item: any) => item.str).join(" ");
          setPreview(text.slice(0, 1000));
        };
        reader.readAsArrayBuffer(file);
      }
    }
  };


  const handleUpload = async () => {
    if (!selectedFile) return;
  
    const formData = new FormData();
    formData.append("file", selectedFile);
  
    setLoading(true);
    setMessage("");
    setError("");
  
    try {
      // ✅ Recupera il token utente
      const {
        data: { session },
      } = await supabase.auth.getSession();
  
      if (!session?.access_token) {
        setError("Utente non autenticato.");
        setLoading(false);
        return;
      }
  
      const res = await fetch("/api/upload-tesi", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`, // 🔥 qui invii il token!
        },
        body: formData,
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore durante l'upload");
  
      setMessage(data.message || "Upload completato ✅");
      setSelectedFile(null);
      setPreview("");
  
      setTimeout(() => {
        router.push("/tools/analyze-tesi");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Errore durante l'invio.");
    } finally {
      setLoading(false);
    }
  };
  


  return (
    <>
      <h1 className="text-2xl font-bold mb-4">📤 Upload Tesi</h1>

      <input type="file" onChange={handleFileChange} className="mb-2" />

      {selectedFile && (
        <p className="text-sm text-gray-600 mb-2">
          File selezionato: {selectedFile.name}
        </p>
      )}

      <button
        onClick={handleUpload}
        disabled={loading || !selectedFile}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Caricamento..." : "Carica"}
      </button>

      {message && <p className="mt-4 text-green-600">{message}</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {preview && (
        <div className="mt-6 p-4 border rounded bg-gray-50 text-sm max-h-[300px] overflow-y-auto whitespace-pre-wrap">
          <h2 className="font-semibold mb-2">📑 Anteprima contenuto:</h2>
          {preview}
        </div>
      )}
    </>
  );
}

// ✅ Protezione pagina e layout studente
UploadTesiPage.requireAuth = true;
UploadTesiPage.getLayout = (page: React.ReactNode) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default UploadTesiPage;
