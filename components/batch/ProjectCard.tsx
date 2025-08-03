import React from 'react';

// Assicurati che le interfacce necessarie siano disponibili
// Potresti metterle in un file condiviso types.ts o importarle se necessario
interface Project {
  id: string;
  project_title: string;
  facolta: string;
  materia: string;
  status: 'attivo' | 'annullato' | 'completato';
  created_at: string;
  chunks_count?: number;
  total_chars?: number;
  ready_chunks?: number;
  completed_chunks?: number;
}

interface ProjectCardProps {
  project: Project;
  onSelect: () => void;
  onDelete: () => void;
}

const ProjectCardComponent: React.FC<ProjectCardProps> = ({ project, onSelect, onDelete }) => {
  const getProgressPercentage = () => {
    if (!project.chunks_count) return 0;
    return Math.round(((project.completed_chunks || 0) / project.chunks_count) * 100);
  };

  const getStatusInfo = () => {
    switch (project.status) {
      case 'completato':
        return { icon: '✅', label: 'Completato', color: 'text-green-600 bg-green-50 border-green-200' };
      case 'annullato':
        return { icon: '❌', label: 'Annullato', color: 'text-gray-600 bg-gray-50 border-gray-200' };
      default:
        return { icon: '🔄', label: 'Attivo', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
  };

  const statusInfo = getStatusInfo();
  const progress = getProgressPercentage();

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1" onClick={onSelect}>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {project.project_title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {project.facolta} • {project.materia}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
              {statusInfo.icon} {statusInfo.label}
            </span>
          </div>
        </div>

        {project.status === 'attivo' && (
          <div className="mb-4" onClick={onSelect}>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Progresso elaborazione</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-4" onClick={onSelect}>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {project.chunks_count || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Sezioni</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {project.completed_chunks || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Elaborate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((project.total_chars || 0) / 1000)}k
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Caratteri</div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-400">
            {new Date(project.created_at).toLocaleDateString('it-IT', { 
              day: 'numeric', 
              month: 'short',
              year: 'numeric'
            })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all hover:scale-105"
            >
              Gestisci →
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Elimina progetto"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProjectCard = React.memo(ProjectCardComponent);