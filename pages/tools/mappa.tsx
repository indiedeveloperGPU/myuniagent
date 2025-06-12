import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  NodeProps,
  Handle,
  Position,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import DashboardLayout from "@/components/DashboardLayout";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import dagre from "dagre";

type CustomData = {
  label: string;
  onDoubleClick: () => void;
  isEditing: boolean;
  onChange: (text: string) => void;
  onBlur: () => void;
};

function CustomNode({ data, selected }: NodeProps<CustomData>) {
  return (
    <div
      onDoubleClick={data.onDoubleClick}
      className={`
        p-2 rounded shadow text-sm text-center min-w-[100px]
        bg-blue-100 dark:bg-blue-900 text-black dark:text-white
        ${selected ? "ring-2 ring-blue-500" : ""}
        hover:ring-2 hover:ring-indigo-400 hover:shadow-md transition
      `}
    >
      {data.isEditing ? (
        <input
          value={data.label}
          autoFocus
          onChange={(e) => data.onChange(e.target.value)}
          onBlur={data.onBlur}
          className="w-full p-1 text-sm bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-600 rounded"
        />
      ) : (
        <div>{data.label}</div>
      )}
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

export default function MappaConcettuale() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [userChecked, setUserChecked] = useState(false);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [mappeSalvate, setMappeSalvate] = useState<any[]>([]);
  const [presentazioneAttiva, setPresentazioneAttiva] = useState(false);
  const [showGuida, setShowGuida] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");
  const [titoloMappa, setTitoloMappa] = useState("Mappa senza titolo");

  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);

  const saveToHistory = () => {
    setHistory((prev) => [...prev, { nodes, edges }]);
    setFuture([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [{ nodes, edges }, ...f]);
    setNodes(prev.nodes);
    setEdges(prev.edges);
  };

  const toggleFullscreen = () => {
    const el = document.getElementById("reactflow-wrapper");
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const layoutGraph = (nodes: Node[], edges: Edge[]): Node[] => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: layoutDirection });

    nodes.forEach((node) => {
      g.setNode(node.id, { width: 150, height: 60 });
    });

    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    return nodes.map((node) => {
      const pos = g.node(node.id);
      return {
        ...node,
        position: { x: pos.x - 75, y: pos.y - 30 }, // centra i nodi
      };
    });
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUserId(data.user.id);
      setUserChecked(true);
      fetchMappeUtente(data.user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && presentazioneAttiva) {
        setPresentazioneAttiva(false);
        document.exitFullscreen?.();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [presentazioneAttiva]);

  useEffect(() => {
    if (nodes.length && edges.length) {
      const newNodes = layoutGraph(nodes, edges);
      setNodes(newNodes);
    }
  }, [layoutDirection]);

  useEffect(() => {
    const saved = localStorage.getItem("autosave-mappa");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nodes && parsed.edges) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          setTitoloMappa(parsed.titoloMappa || "Mappa senza titolo");
          setNodeCount((parsed.nodes?.length || 0) + 1);
          console.log("✔️ Mappa recuperata da auto-save");
        }
      } catch (e) {
        console.error("Errore nel parsing autosave", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      if (!isFullscreen) {
        setPresentazioneAttiva(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (nodes.length || edges.length) {
        localStorage.setItem(
          "autosave-mappa",
          JSON.stringify({ nodes, edges, titoloMappa })
        );
        toast.success("💾 Mappa salvata automaticamente", { duration: 1500 });
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [nodes, edges, titoloMappa]);

  const fetchMappeUtente = async (userId: string) => {
    const { data } = await supabase
      .from("mappe_concettuali")
      .select("*")
      .eq("user_id", userId)
      .order("creata_il", { ascending: false });

    if (data) setMappeSalvate(data);
  };

  const addNewNode = () => {
    const newNode: Node = {
      id: nodeCount.toString(),
      type: "custom",
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: { label: `Nuovo Nodo ${nodeCount}` },
    };
    saveToHistory();
    setNodes((nds) => [...nds, newNode]);
    setNodeCount((prev) => prev + 1);
  };

  const updateNodeLabel = (id: string, label: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, label } } : node
      )
    );
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      saveToHistory();
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    saveToHistory();
    setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId
      )
    );
    setSelectedNodeId(null);
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    saveToHistory();
    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  const handleExportDocx = () => {
    const paragraphs = nodes.map(
      (node) => new Paragraph({ children: [new TextRun(`${node.data.label}`)] })
    );
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: "Mappa Concettuale", heading: "Heading1" }),
            ...paragraphs,
          ],
        },
      ],
    });
    Packer.toBlob(doc).then((blob) =>
      saveAs(blob, "mappa-concettuale.docx")
    );
  };

  const handleExportPDF = async () => {
    const flowWrapper = document.getElementById("reactflow-wrapper");

    if (!flowWrapper) {
      toast.error("Errore durante l'esportazione!");
      return;
    }

    setLoading(true);

    try {
      const dataUrl = await htmlToImage.toPng(flowWrapper, { pixelRatio: 2 });
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
      });

      const imgProps = await new Promise<{ width: number; height: number }>(
        (resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          img.src = dataUrl;
        }
      );

      let pdfWidth = pdf.internal.pageSize.getWidth();
      let pdfHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = imgProps.width / imgProps.height;
      const pdfRatio = pdfWidth / pdfHeight;

      let finalImgWidth, finalImgHeight;
      if (imgRatio > pdfRatio) {
        finalImgWidth = pdfWidth;
        finalImgHeight = pdfWidth / imgRatio;
      } else {
        finalImgHeight = pdfHeight;
        finalImgWidth = pdfHeight * imgRatio;
      }

      const xOffset = (pdfWidth - finalImgWidth) / 2;
      const yOffset = (pdfHeight - finalImgHeight) / 2;

      pdf.addImage(
        dataUrl,
        "PNG",
        xOffset,
        yOffset,
        finalImgWidth,
        finalImgHeight
      );
      pdf.save(`${titoloMappa || "mappa-concettuale"}.pdf`);
      toast.success("✅ Mappa esportata in PDF!");
    } catch (error) {
      console.error("Errore durante la generazione del PDF:", error);
      toast.error("Errore durante l'esportazione in PDF!");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPNG = async () => {
    const flowWrapper = document.getElementById("reactflow-wrapper");
    if (!flowWrapper) {
      toast.error(
        "Errore: Impossibile trovare l'area della mappa per l'esportazione."
      );
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await htmlToImage.toPng(flowWrapper);
      saveAs(dataUrl, `${titoloMappa || "mappa-concettuale"}.png`);
      toast.success("✅ Mappa esportata correttamente in PNG");
    } catch (error) {
      console.error("Errore durante la generazione del PNG:", error);
      toast.error("Si è verificato un errore durante l'esportazione in PNG");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return toast.error("Utente non loggato");
    await supabase.from("mappe_concettuali").insert({
      user_id: userId,
      titolo: titoloMappa,
      data: { nodes, edges },
    });
    toast.success("✅ Mappa salvata!");
    fetchMappeUtente(userId);
  };

  const handleLoad = async (id: string) => {
    const { data } = await supabase
      .from("mappe_concettuali")
      .select("data, titolo")
      .eq("id", id)
      .single();

    if (data?.data) {
      setNodes(data.data.nodes || []);
      setEdges(data.data.edges || []);
      setTitoloMappa(data.titolo || "Mappa senza titolo");
      setNodeCount((data.data.nodes?.length || 0) + 1);
    }
  };

  const handleEliminaMappa = async (id: string) => {
    if (!confirm("Vuoi davvero eliminare questa mappa?")) return;
    await supabase.from("mappe_concettuali").delete().eq("id", id);
    fetchMappeUtente(userId!);
  };

  const handleRinominaMappa = async (id: string) => {
    const nuovoTitolo = prompt("Nuovo titolo:");
    if (!nuovoTitolo) return;
    await supabase
      .from("mappe_concettuali")
      .update({ titolo: nuovoTitolo })
      .eq("id", id);
    fetchMappeUtente(userId!);
  };

  // NUOVA FUNZIONE PER IL RESET
  const handleResetSessione = () => {
    if (!confirm("Vuoi davvero cancellare la mappa attuale non salvata? Questa azione non può essere annullata.")) return;
    
    // Rimuove l'autosave dal browser
    localStorage.removeItem("autosave-mappa");
    
    // Resetta lo stato della mappa nell'applicazione
    setNodes([]);
    setEdges([]);
    setTitoloMappa("Mappa senza titolo");
    setHistory([]);
    setFuture([]);
    toast.success("🧹 Sessione pulita. Puoi ricominciare da capo.");
  };

  const handleGeneraMappa = async () => {
    if (!topic || !userId) return;
    setLoading(true);

    const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;

const res = await fetch("/api/mappa", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ argomento: topic }),
});


    const data = await res.json();
    const { nodiGenerati } = data;

    if (nodiGenerati?.length) {
      const generati = nodiGenerati.map((label: string, idx: number) => ({
        id: `g-${idx}`,
        type: "custom",
        position: {
          x: 100 + (idx % 3) * 200,
          y: 150 + Math.floor(idx / 3) * 120,
        },
        data: { label },
      }));

      const connessioni = nodiGenerati
        .slice(0, -1)
        .map(
          (_l: string, idx: number): Edge => ({
            id: `e-${idx}`,
            source: `g-${idx}`,
            target: `g-${idx + 1}`,
            type: "default",
          })
        );

      setNodes(generati);
      setEdges(connessioni);
      setTitoloMappa(`Mappa: ${topic}`);

      await supabase.from("mappe_concettuali").insert({
        user_id: userId,
        titolo: `Mappa: ${topic}`,
        data: { nodes: generati, edges: connessioni },
      });

      fetchMappeUtente(userId);
    }

    setLoading(false);
  };

  const nodesWithEdit = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      isEditing: editingNodeId === node.id,
      onDoubleClick: () => setEditingNodeId(node.id),
      onChange: (val: string) => updateNodeLabel(node.id, val),
      onBlur: () => setEditingNodeId(null),
    },
  }));

  const styledEdges = edges.map((edge) => ({
    ...edge,
    label: edge.label || "",
    style: {
      stroke: edge.id === selectedEdgeId ? "#ef4444" : "#777",
      strokeWidth: edge.id === selectedEdgeId ? 3 : 1.5,
      strokeDasharray: edge.id === selectedEdgeId ? "5,5" : "none",
      filter:
        edge.id === selectedEdgeId ? "drop-shadow(0 0 3px red)" : "none",
    },
  }));

  if (!userChecked) {
    return (
      <DashboardLayout>
        <p>Caricamento...</p>
      </DashboardLayout>
    );
  }
  const buttonStyle =
    "px-4 py-2 rounded text-white transition-transform transform hover:-translate-y-1 hover:shadow-lg duration-200";
  const enabledButtonStyle = "bg-indigo-600 hover:bg-indigo-700";
  const disabledButtonStyle = "bg-gray-400 cursor-not-allowed";

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      {presentazioneAttiva && (
        <button
          onClick={() => {
            setPresentazioneAttiva(false);
            document.exitFullscreen?.();
          }}
          className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded shadow-lg"
        >
          ✖ Esci
        </button>
      )}

      <h1 className="text-2xl font-bold mb-4">🧠 Mappa Concettuale</h1>

      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={titoloMappa}
            onChange={(e) => setTitoloMappa(e.target.value)}
            placeholder="Titolo mappa"
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 rounded w-full max-w-md"
          />
          <button
            onClick={() => setShowGuida(true)}
            className="text-blue-600 text-xl font-bold border border-blue-400 rounded-full w-7 h-7 flex items-center justify-center hover:bg-blue-100"
            title="Mostra guida"
          >
            ?
          </button>
        </div>
      </div>

      {showGuida && (
        <div className="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 dark:border-yellow-300 text-yellow-900 dark:text-yellow-100 p-4 rounded mb-4 relative max-w-2xl">
          <button
            onClick={() => setShowGuida(false)}
            className="absolute top-2 right-2 text-yellow-900 font-bold hover:text-red-500"
            title="Chiudi"
          >
            ×
          </button>
          <h2 className="font-semibold text-base mb-2">
            ℹ️ Come funziona la sezione Mappe
          </h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              Genera automaticamente una mappa da un argomento oppure crea nodi
              manualmente.
            </li>
            <li>Doppio clic su un nodo per modificarne il testo.</li>
            <li>
              Collega nodi trascinandoli, elimina nodi o connessioni
              selezionandoli.
            </li>
            <li>
              Puoi salvare, esportare in PDF o DOCX e annullare/ripristinare
              modifiche.
            </li>
          </ul>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Argomento per mappa automatica"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-3 py-2 w-full"
        />
        <button
          onClick={handleGeneraMappa}
          className={`${buttonStyle} ${enabledButtonStyle}`}
        >
          {loading ? "Generazione..." : "✨ Genera mappa"}
        </button>
      </div>

      <select
        value={layoutDirection}
        onChange={(e) =>
          setLayoutDirection(e.target.value as "TB" | "LR")
        }
        className="border border-gray-300 dark:border-gray-600 text-sm rounded px-2 py-1 mb-4"
        title="Direzione layout"
      >
        <option value="TB">⬇️ Albero verticale</option>
        <option value="LR">➡️ Albero orizzontale</option>
      </select>

      {!presentazioneAttiva && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={addNewNode}
            className={`${buttonStyle} bg-blue-600 hover:bg-blue-700`}
          >
            ➕ Nodo
          </button>
          <button
            onClick={handleExportPNG}
            className={`${buttonStyle} bg-teal-600 hover:bg-teal-700`}
          >
            🖼️ PNG
          </button>
          <button
            onClick={handleExportDocx}
            className={`${buttonStyle} bg-sky-600 hover:bg-sky-700`}
          >
            📄 DOCX
          </button>
          <button
            onClick={handleExportPDF}
            className={`${buttonStyle} bg-orange-600 hover:bg-orange-700`}
          >
            📄 PDF
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`${buttonStyle} ${
              history.length > 0 ? enabledButtonStyle : disabledButtonStyle
            }`}
          >
            ↩️ Indietro
          </button>
          <button
            onClick={handleRedo}
            disabled={future.length === 0}
            className={`${buttonStyle} ${
              future.length > 0 ? enabledButtonStyle : disabledButtonStyle
            }`}
          >
            ↪️ Avanti
          </button>
          <button
            onClick={handleSave}
            className={`${buttonStyle} bg-green-600 hover:bg-green-700`}
          >
            💾 Salva
          </button>
          <button
            onClick={() => {
              const newNodes = layoutGraph(nodes, edges);
              saveToHistory();
              setNodes(newNodes);
            }}
            className={`${buttonStyle} bg-purple-600 hover:bg-purple-700`}
          >
            🧭 Riordina
          </button>
          <button
            onClick={() => {
              const attiva = !presentazioneAttiva;
              setPresentazioneAttiva(attiva);
              if (attiva) toggleFullscreen();
              else document.exitFullscreen?.();
            }}
            className={`${buttonStyle} bg-yellow-600 hover:bg-yellow-700`}
          >
            {presentazioneAttiva ? "💼 Normale" : "🎥 Presentazione"}
          </button>
          <button
            onClick={deleteSelectedNode}
            disabled={!selectedNodeId}
            className={`${buttonStyle} ${
              selectedNodeId
                ? "bg-red-600 hover:bg-red-700"
                : disabledButtonStyle
            }`}
          >
            🗑️ Nodo
          </button>
          <button
            onClick={deleteSelectedEdge}
            disabled={!selectedEdgeId}
            className={`${buttonStyle} ${
              selectedEdgeId
                ? "bg-red-500 hover:bg-red-600"
                : disabledButtonStyle
            }`}
          >
            🗑️ Connessione
          </button>
          {/* NUOVO PULSANTE RESET */}
          <button
            onClick={handleResetSessione}
            className={`${buttonStyle} bg-pink-600 hover:bg-pink-700`}
          >
            🧹 Pulisci sessione
          </button>
        </div>
      )}

      {selectedEdgeId && (
        <input
          type="text"
          placeholder="Etichetta connessione"
          onChange={(e) => {
            const text = e.target.value;
            setEdges((eds) =>
              eds.map((edge) =>
                edge.id === selectedEdgeId ? { ...edge, label: text } : edge
              )
            );
          }}
          className="border px-2 py-1 rounded mb-4"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {mappeSalvate.map((mappa) => (
          <div
            key={mappa.id}
            className="p-3 bg-white dark:bg-gray-800 rounded shadow border border-gray-300 dark:border-gray-700"
          >
            <p className="font-semibold">{mappa.titolo}</p>
            <div className="mt-2 flex gap-2 flex-wrap">
              <button
                onClick={() => handleLoad(mappa.id)}
                className="bg-blue-600 text-white px-2 py-1 rounded"
              >
                Carica
              </button>
              <button
                onClick={() => handleRinominaMappa(mappa.id)}
                className="bg-yellow-500 text-white px-2 py-1 rounded"
              >
                Rinomina
              </button>
              <button
                onClick={() => handleEliminaMappa(mappa.id)}
                className="bg-red-600 text-white px-2 py-1 rounded"
              >
                Elimina
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        className="h-[70vh] w-full border rounded bg-white dark:bg-gray-900 shadow border-gray-300 dark:border-gray-700"
        id="reactflow-wrapper"
        onDoubleClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const { project } = useReactFlow();
          const position = project({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          });

          const newNode: Node = {
            id: nodeCount.toString(),
            type: "custom",
            position,
            data: { label: `Nuovo Nodo ${nodeCount}` },
          };

          saveToHistory();
          setNodes((nds) => [...nds, newNode]);
          setNodeCount((prev) => prev + 1);
        }}
      >
        <ReactFlow
          nodes={nodesWithEdit}
          edges={styledEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid={true}
          snapGrid={[20, 20]}
          selectNodesOnDrag={true}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </DashboardLayout>
  );
}

MappaConcettuale.requireAuth = true;
