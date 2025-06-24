// components/ProgressivePageLoader.tsx
import React, { memo, useEffect, useRef } from 'react';
import { Page } from 'react-pdf';

interface ProgressivePageLoaderProps {
  pageNumber: number;
  scale: number;
  quality: number;
  shouldRender: boolean;
  shouldRenderTextLayer: boolean;
  shouldRenderAnnotationLayer: boolean;
  onPageRender: (pageNum: number, element: HTMLElement | null) => void;
  isCurrentPage: boolean;
}

// Componente skeleton per pagine non ancora caricate
const PageSkeleton: React.FC<{ pageNumber: number; height?: number }> = memo(({ 
  pageNumber, 
  height = 300 
}) => (
  <div 
    className="flex items-center justify-center bg-gray-100 border border-gray-200 rounded"
    style={{ height, minHeight: height }}
  >
    <div className="text-center text-gray-500">
      <div className="animate-pulse">
        <div className="w-8 h-8 bg-gray-300 rounded mb-2 mx-auto"></div>
        <p className="text-sm">Caricamento pagina {pageNumber}...</p>
      </div>
    </div>
  </div>
));

// Componente placeholder per pagine non renderizzate
const PagePlaceholder: React.FC<{ pageNumber: number; onClick: () => void }> = memo(({ 
  pageNumber, 
  onClick 
}) => (
  <div 
    className="flex items-center justify-center bg-gray-50 border border-gray-300 rounded cursor-pointer hover:bg-gray-100 transition-colors"
    style={{ height: 400, minHeight: 400 }}
    onClick={onClick}
  >
    <div className="text-center text-gray-600">
      <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-sm font-medium">Pagina {pageNumber}</p>
      <p className="text-xs text-gray-500 mt-1">Clicca per caricare</p>
    </div>
  </div>
));

const ProgressivePageLoader: React.FC<ProgressivePageLoaderProps> = memo(({
  pageNumber,
  scale,
  quality,
  shouldRender,
  shouldRenderTextLayer,
  shouldRenderAnnotationLayer,
  onPageRender,
  isCurrentPage
}) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [forceRender, setForceRender] = React.useState(false);

  // Notifica al parent quando l'elemento è pronto per l'osservazione
  useEffect(() => {
    onPageRender(pageNumber, pageRef.current);
  }, [pageNumber, onPageRender]);

  // Auto-render per pagina corrente
  useEffect(() => {
    if (isCurrentPage && !shouldRender && !forceRender) {
      setForceRender(true);
    }
  }, [isCurrentPage, shouldRender, forceRender]);

  const handleManualLoad = () => {
    setForceRender(true);
    setIsLoading(true);
  };

  const handlePageLoadSuccess = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handlePageLoadError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Determina se dobbiamo renderizzare la pagina
  const shouldActuallyRender = shouldRender || forceRender;

  return (
    <div 
      ref={pageRef}
      className={`relative ${isCurrentPage ? 'ring-2 ring-blue-500' : ''}`}
      data-page={pageNumber}
    >
      {!shouldActuallyRender ? (
        // Placeholder per pagine non caricate
        <PagePlaceholder 
          pageNumber={pageNumber} 
          onClick={handleManualLoad}
        />
      ) : hasError ? (
        // Stato di errore
        <div 
          className="flex items-center justify-center bg-red-50 border border-red-200 rounded"
          style={{ height: 400 }}
        >
          <div className="text-center text-red-600">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium">Errore caricamento</p>
            <button 
              onClick={handleManualLoad}
              className="text-xs text-red-500 hover:text-red-700 mt-1 underline"
            >
              Riprova
            </button>
          </div>
        </div>
      ) : (
        // Rendering della pagina PDF
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <PageSkeleton pageNumber={pageNumber} />
            </div>
          )}
          
          <Page
            pageNumber={pageNumber}
            scale={scale * quality}
            loading={<PageSkeleton pageNumber={pageNumber} />}
            error={
              <div className="text-center text-red-600 p-4">
                <p>Errore nel caricamento della pagina {pageNumber}</p>
              </div>
            }
            renderTextLayer={shouldRenderTextLayer}
            renderAnnotationLayer={shouldRenderAnnotationLayer}
            onLoadSuccess={handlePageLoadSuccess}
            onLoadError={handlePageLoadError}
            className={`
              transition-opacity duration-300 
              ${isLoading ? 'opacity-0' : 'opacity-100'}
              ${!isCurrentPage && quality < 1 ? 'filter brightness-95' : ''}
            `}
          />
        </>
      )}

      {/* Indicatore modalità per debug */}
      {process.env.NODE_ENV === 'development' && shouldActuallyRender && (
        <div className="absolute top-2 right-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
          {Math.round(quality * 100)}%
          {shouldRenderTextLayer && ' T'}
          {shouldRenderAnnotationLayer && ' A'}
        </div>
      )}
    </div>
  );
});

ProgressivePageLoader.displayName = 'ProgressivePageLoader';

export default ProgressivePageLoader;