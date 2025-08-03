import React from 'react';

// Interfacce necessarie
interface BatchJob {
  id: string;
  status: 'in_coda' | 'elaborazione' | 'completato' | 'fallito' | 'annullato';
  total_chunks: number;
  processed_chunks: number;
  estimated_cost_usd: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress_percentage?: number;
}

interface BatchJobItemProps {
  job: BatchJob;
  onSelect: (job: BatchJob) => void;
  getStatusColor: (status: string) => string;
}

const BatchJobItemComponent: React.FC<BatchJobItemProps> = ({ job, onSelect, getStatusColor }) => {
  return (
    <div
      onClick={() => onSelect(job)}
      className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-6 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Elaborazione Batch</h4>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">ID: {job.id.slice(-12)}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {job.processed_chunks}/{job.total_chunks}
          </div>
          <div className="text-xs text-gray-500">sezioni</div>
        </div>
      </div>

      {job.status === 'elaborazione' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Progresso</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{job.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${job.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Creato</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {new Date(job.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {job.started_at && (
          <div>
            <div className="text-gray-500 dark:text-gray-400">Avviato</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {new Date(job.started_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}
        {job.completed_at && (
          <div>
            <div className="text-gray-500 dark:text-gray-400">Completato</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {new Date(job.completed_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}
        <div>
          <div className="text-gray-500 dark:text-gray-400">Costo Stimato</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">${job.estimated_cost_usd.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
};

export const BatchJobItem = React.memo(BatchJobItemComponent);