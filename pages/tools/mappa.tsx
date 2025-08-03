import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
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
import { X, Plus, Download, Save, Undo, Redo, Trash2, RotateCcw, Presentation, Layout, HelpCircle, Search, Filter, RefreshCw } from "lucide-react";

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
        p-3 rounded-lg shadow-md text-sm text-center min-w-[120px] transition-all duration-300
        bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 
        text-gray-900 dark:text-gray-100 border border-blue-200 dark:border-blue-700
        ${selected ? "ring-2 ring-purple-500 shadow-lg transform scale-105" : ""}
        hover:ring-2 hover:ring-purple-400 hover:shadow-lg hover:transform hover:scale-105
      `}
    >
      {data.isEditing ? (
        <input
          value={data.label}
          autoFocus
          onChange={(e) => data.onChange(e.target.value)}
          onBlur={data.onBlur}
          className="w-full p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-purple-300 dark:border-purple-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        />
      ) : (
        <div className="font-medium">{data.label}</div>
      )}
      <Handle 
        type="source" 
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-900"
      />
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-900"
      />
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
  const [activeTab, setActiveTab] = useState<'canvas' | 'saved' | 'export'>('canvas');
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMappe, setFilteredMappe] = useState<any[]>([]);

  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);

  // 🎨 HELPER FUNCTIONS ENTERPRISE
  const getButtonStyle = (variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' = 'primary') => {
    const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
    
    const variants = {
      primary: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl",
      secondary: "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl",
      success: "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl",
      warning: "bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 shadow-lg hover:shadow-xl",
      danger: "bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 shadow-lg hover:shadow-xl",
      info: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl"
    };
    
    return `${baseStyle} ${variants[variant]}`;
  };

  const getSectionGradient = (color: string) => {
    const gradients = {
      blue: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800',
      purple: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800',
      green: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800',
      yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800',
      red: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800',
      gray: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700'
    };
    return gradients[color as keyof typeof gradients] || gradients.gray;
  };

  const getCardBorder = (color: string) => {
    const borders = {
      blue: 'border-blue-200 dark:border-blue-700',
      purple: 'border-purple-200 dark:border-purple-700',
      green: 'border-green-200 dark:border-green-700',
      yellow: 'border-yellow-200 dark:border-yellow-700',
      red: 'border-red-200 dark:border-red-700',
      gray: 'border-gray-200 dark:border-gray-700'
    };
    return borders[color as keyof typeof borders] || borders.gray;
  };

  const getStats = () => ({
    totalNodes: nodes.length,
    totalEdges: edges.length,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    hasSelection: selectedNodeId || selectedEdgeId
  });

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
    toast.success("↩️ Azione annullata");
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
    toast.success("↪️ Azione ripristinata");
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
        position: { x: pos.x - 75, y: pos.y - 30 },
      };
    });
  };

  // 🔍 FILTRO MAPPE SALVATE
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = mappeSalvate.filter(mappa => 
        mappa.titolo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMappe(filtered);
    } else {
      setFilteredMappe(mappeSalvate);
    }
  }, [mappeSalvate, searchTerm]);

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
          toast.success("📋 Mappa recuperata da auto-save");
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
        toast.success("💾 Auto-salvataggio completato", { duration: 1500 });
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
    toast.success("➕ Nodo aggiunto");
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
      toast.success("🔗 Connessione creata");
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
    toast.success("🗑️ Nodo eliminato");
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    saveToHistory();
    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    toast.success("🗑️ Connessione eliminata");
  };

  const handleExportDocx = async () => {
    setLoading(true);
    try {
      const paragraphs = nodes.map(
        (node) => new Paragraph({ children: [new TextRun(`${node.data.label}`)] })
      );
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: titoloMappa, heading: "Heading1" }),
              ...paragraphs,
            ],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${titoloMappa || "mappa-concettuale"}.docx`);
      toast.success("📄 Esportazione DOCX completata");
    } catch (error) {
      toast.error("❌ Errore nell'esportazione DOCX");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const flowWrapper = document.getElementById("reactflow-wrapper");
    if (!flowWrapper) {
      toast.error("❌ Errore durante l'esportazione!");
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
      toast.success("📄 Esportazione PDF completata");
    } catch (error) {
      console.error("Errore durante la generazione del PDF:", error);
      toast.error("❌ Errore durante l'esportazione PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPNG = async () => {
    const flowWrapper = document.getElementById("reactflow-wrapper");
    if (!flowWrapper) {
      toast.error("❌ Impossibile trovare l'area della mappa per l'esportazione");
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await htmlToImage.toPng(flowWrapper, { pixelRatio: 2 });
      saveAs(dataUrl, `${titoloMappa || "mappa-concettuale"}.png`);
      toast.success("🖼️ Esportazione PNG completata");
    } catch (error) {
      console.error("Errore durante la generazione del PNG:", error);
      toast.error("❌ Errore durante l'esportazione PNG");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return toast.error("❌ Utente non loggato");
    setLoading(true);
    try {
      await supabase.from("mappe_concettuali").insert({
        user_id: userId,
        titolo: titoloMappa,
        data: { nodes, edges },
      });
      toast.success("💾 Mappa salvata con successo");
      fetchMappeUtente(userId);
    } catch (error) {
      toast.error("❌ Errore nel salvataggio");
    } finally {
      setLoading(false);
    }
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
      toast.success("📋 Mappa caricata");
    }
  };

  const handleEliminaMappa = async (id: string) => {
    if (!confirm("Vuoi davvero eliminare questa mappa?")) return;
    await supabase.from("mappe_concettuali").delete().eq("id", id);
    fetchMappeUtente(userId!);
    toast.success("🗑️ Mappa eliminata");
  };

  const handleRinominaMappa = async (id: string) => {
    const nuovoTitolo = prompt("Nuovo titolo:");
    if (!nuovoTitolo) return;
    await supabase
      .from("mappe_concettuali")
      .update({ titolo: nuovoTitolo })
      .eq("id", id);
    fetchMappeUtente(userId!);
    toast.success("✏️ Mappa rinominata");
  };

  const handleResetSessione = () => {
    if (!confirm("Vuoi davvero cancellare la mappa attuale non salvata? Questa azione non può essere annullata.")) return;
    
    localStorage.removeItem("autosave-mappa");
    setNodes([]);
    setEdges([]);
    setTitoloMappa("Mappa senza titolo");
    setHistory([]);
    setFuture([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    toast.success("🧹 Sessione pulita. Puoi ricominciare da capo");
  };

  const handleGeneraMappa = async () => {
    if (!topic || !userId) return;
    setLoading(true);

    try {
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
        toast.success("✨ Mappa generata con successo");
      }
    } catch (error) {
      toast.error("❌ Errore nella generazione della mappa");
    } finally {
      setLoading(false);
    }
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
      stroke: edge.id === selectedEdgeId ? "#8b5cf6" : "#6b7280",
      strokeWidth: edge.id === selectedEdgeId ? 3 : 2,
      strokeDasharray: edge.id === selectedEdgeId ? "5,5" : "none",
    },
  }));

  const stats = getStats();

  if (!userChecked) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Caricamento mappa concettuale...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      
      {/* 🎯 OVERLAY PRESENTAZIONE */}
      {presentazioneAttiva && (
        <button
          onClick={() => {
            setPresentazioneAttiva(false);
            document.exitFullscreen?.();
          }}
          className="fixed top-4 right-4 z-50 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all transform hover:scale-105"
        >
          <X className="w-4 h-4 mr-2 inline" />
          Esci dalla Presentazione
        </button>
      )}

      {/* 🎯 HEADER ENTERPRISE */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-2xl">🧠</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Mappa Concettuale Enterprise
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Crea e gestisci mappe concettuali professionali con AI
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGuida(true)}
              className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105"
              title="Mostra guida"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 📊 STATISTICHE ENTERPRISE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`${getSectionGradient('purple')} p-4 rounded-xl border ${getCardBorder('purple')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Nodi Totali</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.totalNodes}</p>
              </div>
              <div className="text-2xl">🔵</div>
            </div>
          </div>
          
          <div className={`${getSectionGradient('blue')} p-4 rounded-xl border ${getCardBorder('blue')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Connessioni</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalEdges}</p>
              </div>
              <div className="text-2xl">🔗</div>
            </div>
          </div>
          
          <div className={`${getSectionGradient('green')} p-4 rounded-xl border ${getCardBorder('green')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Mappe Salvate</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{mappeSalvate.length}</p>
              </div>
              <div className="text-2xl">💾</div>
            </div>
          </div>
          
          <div className={`${getSectionGradient('yellow')} p-4 rounded-xl border ${getCardBorder('yellow')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Azioni</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{history.length}</p>
              </div>
              <div className="text-2xl">📈</div>
            </div>
          </div>
        </div>

        {/* 🎯 TAB NAVIGATION ENTERPRISE */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'canvas'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Layout className="w-4 h-4" />
            Canvas
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'saved'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Save className="w-4 h-4" />
            Salvate ({mappeSalvate.length})
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'export'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* 🎯 GUIDA MODAL */}
      {showGuida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📚</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Guida Mappa Concettuale
                </h2>
              </div>
              <button
                onClick={() => setShowGuida(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className={`${getSectionGradient('blue')} p-4 rounded-lg border ${getCardBorder('blue')}`}>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">✨ Generazione Automatica</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Inserisci un argomento e l'AI genererà automaticamente una mappa concettuale strutturata.
                </p>
              </div>
              
              <div className={`${getSectionGradient('green')} p-4 rounded-lg border ${getCardBorder('green')}`}>
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🎯 Editing Manuale</h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  • Doppio clic su un nodo per modificarne il testo<br/>
                  • Trascina per collegare nodi<br/>
                  • Clicca per selezionare e eliminare elementi
                </p>
              </div>
              
              <div className={`${getSectionGradient('purple')} p-4 rounded-lg border ${getCardBorder('purple')}`}>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">💾 Salvataggio e Export</h3>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  Salva le tue mappe nel cloud ed esportale in PDF, PNG o DOCX per presentazioni e documenti.
                </p>
              </div>
              
              <div className={`${getSectionGradient('yellow')} p-4 rounded-lg border ${getCardBorder('yellow')}`}>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">🎥 Modalità Presentazione</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Attiva la modalità fullscreen per presentazioni professionali.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 CONTENUTO CONDIZIONALE */}
      {activeTab === 'canvas' && (
        <>
          {/* 🎯 CONTROLLI CANVAS */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            {/* Titolo Mappa */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titolo Mappa
                </label>
                <input
                  type="text"
                  value={titoloMappa}
                  onChange={(e) => setTitoloMappa(e.target.value)}
                  placeholder="Inserisci il titolo della mappa"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Layout
                </label>
                <select
                  value={layoutDirection}
                  onChange={(e) => setLayoutDirection(e.target.value as "TB" | "LR")}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="TB">⬇️ Verticale</option>
                  <option value="LR">➡️ Orizzontale</option>
                </select>
              </div>
            </div>

            {/* Generazione AI */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Generazione AI
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Inserisci un argomento per la generazione automatica"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={handleGeneraMappa}
                  disabled={!topic || loading}
                  className={getButtonStyle('primary')}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <span className="text-lg">✨</span>
                      Genera Mappa
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Toolbar Principale */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={addNewNode}
                className={getButtonStyle('primary')}
              >
                <Plus className="w-4 h-4" />
                Aggiungi Nodo
              </button>
              
              <button
                onClick={handleUndo}
                disabled={!stats.canUndo}
                className={getButtonStyle('secondary')}
              >
                <Undo className="w-4 h-4" />
                Annulla
              </button>
              
              <button
                onClick={handleRedo}
                disabled={!stats.canRedo}
                className={getButtonStyle('secondary')}
              >
                <Redo className="w-4 h-4" />
                Ripristina
              </button>
              
              <button
                onClick={() => {
                  const newNodes = layoutGraph(nodes, edges);
                  saveToHistory();
                  setNodes(newNodes);
                  toast.success("🧭 Layout riorganizzato");
                }}
                className={getButtonStyle('info')}
              >
                <RefreshCw className="w-4 h-4" />
                Riordina
              </button>
              
              <button
                onClick={handleSave}
                disabled={loading}
                className={getButtonStyle('success')}
              >
                <Save className="w-4 h-4" />
                Salva
              </button>
              
              <button
                onClick={deleteSelectedNode}
                disabled={!selectedNodeId}
                className={getButtonStyle('danger')}
              >
                <Trash2 className="w-4 h-4" />
                Elimina Nodo
              </button>
              
              <button
                onClick={deleteSelectedEdge}
                disabled={!selectedEdgeId}
                className={getButtonStyle('danger')}
              >
                <Trash2 className="w-4 h-4" />
                Elimina Connessione
              </button>
              
              <button
                onClick={() => {
                  const attiva = !presentazioneAttiva;
                  setPresentazioneAttiva(attiva);
                  if (attiva) toggleFullscreen();
                  else document.exitFullscreen?.();
                }}
                className={getButtonStyle('warning')}
              >
                <Presentation className="w-4 h-4" />
                {presentazioneAttiva ? "Esci" : "Presentazione"}
              </button>
              
              <button
                onClick={handleResetSessione}
                className={getButtonStyle('danger')}
              >
                <RotateCcw className="w-4 h-4" />
                Reset Sessione
              </button>
            </div>

            {/* Etichetta Connessione */}
            {selectedEdgeId && (
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-lg border border-purple-200 dark:border-purple-700">
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  Etichetta Connessione Selezionata
                </label>
                <input
                  type="text"
                  placeholder="Inserisci etichetta per la connessione"
                  onChange={(e) => {
                    const text = e.target.value;
                    setEdges((eds) =>
                      eds.map((edge) =>
                        edge.id === selectedEdgeId ? { ...edge, label: text } : edge
                      )
                    );
                  }}
                  className="block w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            )}
          </div>

          {/* 🎯 CANVAS REACTFLOW */}
          <div
            className="h-[70vh] w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-xl"
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
              toast.success("➕ Nodo aggiunto con doppio clic");
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
              className="rounded-xl"
            >
              <MiniMap 
                className="!bg-white dark:!bg-gray-800 !border-2 !border-gray-200 dark:!border-gray-700 !rounded-lg"
                maskColor="rgb(0, 0, 0, 0.1)"
              />
              <Controls 
                className="!bg-white dark:!bg-gray-800 !border-2 !border-gray-200 dark:!border-gray-700 !rounded-lg !shadow-lg"
              />
              <Background 
                color="#e5e7eb" 
                gap={20}
                variant={BackgroundVariant.Dots}
              />
            </ReactFlow>
          </div>
        </>
      )}

      {/* 🎯 TAB MAPPE SALVATE */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          {/* Barra di Ricerca */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca nelle mappe salvate..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Lista Mappe */}
          {filteredMappe.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {mappeSalvate.length === 0 ? 'Nessuna mappa salvata' : 'Nessun risultato'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {mappeSalvate.length === 0 
                  ? 'Crea la tua prima mappa concettuale per vederla qui.'
                  : 'Prova a modificare i termini di ricerca.'
                }
              </p>
              {mappeSalvate.length === 0 && (
                <button
                  onClick={() => setActiveTab('canvas')}
                  className={getButtonStyle('primary')}
                >
                  <Plus className="w-4 h-4" />
                  Crea Prima Mappa
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMappe.map((mappa) => (
                <div
                  key={mappa.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-lg p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg">🧠</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                          {mappa.titolo}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(mappa.creata_il).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>{mappa.data?.nodes?.length || 0} nodi</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>{mappa.data?.edges?.length || 0} collegamenti</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleLoad(mappa.id);
                        setActiveTab('canvas');
                      }}
                      className={`flex-1 ${getButtonStyle('primary')} !px-3 !py-2 !text-sm`}
                    >
                      <Layout className="w-4 h-4" />
                      Carica
                    </button>
                    <button
                      onClick={() => handleRinominaMappa(mappa.id)}
                      className={`${getButtonStyle('warning')} !px-3 !py-2 !text-sm`}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleEliminaMappa(mappa.id)}
                      className={`${getButtonStyle('danger')} !px-3 !py-2 !text-sm`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🎯 TAB EXPORT */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Esporta Mappa Corrente
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Esporta la tua mappa concettuale in diversi formati per presentazioni, documenti e archivi.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${getSectionGradient('blue')} p-6 rounded-xl border ${getCardBorder('blue')} text-center`}>
                <div className="text-3xl mb-3">🖼️</div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">PNG</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                  Immagine ad alta risoluzione per presentazioni e web
                </p>
                <button
                  onClick={handleExportPNG}
                  disabled={loading}
                  className={getButtonStyle('info')}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Esportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Esporta PNG
                    </>
                  )}
                </button>
              </div>
              
              <div className={`${getSectionGradient('red')} p-6 rounded-xl border ${getCardBorder('red')} text-center`}>
                <div className="text-3xl mb-3">📄</div>
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">PDF</h4>
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                  Documento professionale per stampa e condivisione
                </p>
                <button
                  onClick={handleExportPDF}
                  disabled={loading}
                  className={getButtonStyle('danger')}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Esportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Esporta PDF
                    </>
                  )}
                </button>
              </div>
              
              <div className={`${getSectionGradient('green')} p-6 rounded-xl border ${getCardBorder('green')} text-center`}>
                <div className="text-3xl mb-3">📝</div>
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">DOCX</h4>
                <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                  Documento Word modificabile per report e documenti
                </p>
                <button
                  onClick={handleExportDocx}
                  disabled={loading}
                  className={getButtonStyle('success')}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Esportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Esporta DOCX
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

MappaConcettuale.requireAuth = true;