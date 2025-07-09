import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type SupabaseUser = {
  id: string;
  email?: string;
};

type RawChunk = {
  title: string;
  order_index: number;
};

type SummaryChunk = {
  output_summary: string;
};

type ChunkResult = {
  raw_chunks: RawChunk[];
  summary_chunks: SummaryChunk[];
};

type ProjectData = {
  id: string;
  user_id: string;
  project_title: string;
  facolta: string;
  materia: string;
  status: string;
};

type FinalSummary = {
  id: string;
};


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token mancante" });

  const {
    data: userData,
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({ error: "Utente non autenticato" });
  }

  const user: SupabaseUser = userData.user;

  const { projectId } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: "projectId è obbligatorio" });
  }

  try {
    // Verifica progetto
    const {
      data: projectData,
      error: projectError
    } = await supabase
      .from("summary_sessions")
      .select("id, user_id, project_title, facolta, materia, status")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single<ProjectData>();

    if (projectError || !projectData) {
      return res.status(404).json({ error: "Progetto non trovato o non autorizzato" });
    }

    if (projectData.status === 'completed') {
      return res.status(400).json({ error: "Il progetto è già stato finalizzato." });
    }

    // Recupera i chunk
    const {
      data: processedChunks,
      error: chunksError
    } = await supabase
      .from("batch_results")
      .select(`
        summary_chunk_id,
        summary_chunks (
          output_summary
        ),
        raw_chunks (
          title,
          order_index
        )
      `)
      .eq("raw_chunks.project_id", projectId)
      .not("summary_chunks", "is", null)
      .order("order_index", { referencedTable: "raw_chunks", ascending: true });

    if (chunksError) throw chunksError;

    if (!processedChunks || processedChunks.length === 0) {
      return res.status(400).json({ error: "Nessun riassunto trovato da unire per questo progetto." });
    }

    // Unisci i riassunti
    const finalSummaryText = (processedChunks as ChunkResult[])
      .map((chunk, index) => {
        const raw = chunk.raw_chunks?.[0];
        const summary = chunk.summary_chunks?.[0];

        const title = raw?.title ?? `Sezione ${index + 1}`;
        const output = summary?.output_summary ?? "[Riassunto mancante]";

        return `## ${title}\n\n${output}\n\n---\n\n`;
      })
      .join("");

    // Salva riassunto finale
    const {
      data: finalSummary,
      error: insertError
    } = await supabase
      .from("riassunti_generati")
      .insert({
        user_id: user.id,
        titolo: `${projectData.project_title} (Riassunto Finale)`,
        output: finalSummaryText,
        facolta: projectData.facolta,
        materia: projectData.materia,
        is_public: false,
        processing_metadata: {
          source: 'project_finalization',
          projectId,
          chunks_count: processedChunks.length
        }
      })
      .select("id")
      .single<FinalSummary>();

    if (insertError) throw insertError;

    // Collega riassunto al progetto
    const {
      data: updatedProject,
      error: updateError
    } = await supabase
      .from("summary_sessions")
      .update({
        final_summary_id: finalSummary.id,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq("id", projectId)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      message: "Progetto finalizzato con successo!",
      project: updatedProject
    });

  } catch (err: any) {
    console.error(`[FINALIZE] Errore su progetto ${projectId}:`, err);
    return res.status(500).json({
      error: "Errore interno del server durante la finalizzazione",
      details: err.message
    });
  }
}
