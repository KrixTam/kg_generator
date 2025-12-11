import React, { useState } from 'react';
import InputSection from './components/InputSection';
import ForceGraph from './components/ForceGraph';
import { generateKnowledgeGraph } from './services/aiService';
import { GraphData, ProcessingStatus } from './types';
import { Share2, AlertCircle, Download } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async (text: string, focus: string) => {
    setStatus(ProcessingStatus.PROCESSING);
    setErrorMessage(null);
    try {
      const data = await generateKnowledgeGraph(text, focus);
      setGraphData(data);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (error: any) {
      setStatus(ProcessingStatus.ERROR);
      setErrorMessage(error.message || "Failed to generate graph. Please check your API key and try again.");
    }
  };

  const handleDownload = () => {
    if (graphData.nodes.length === 0) return;

    // Create a downloadable JSON file
    const dataStr = JSON.stringify(graphData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "knowledge_graph.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* Sidebar / Input Area */}
      <div className="w-full md:w-[400px] h-[40vh] md:h-screen shrink-0 z-20 shadow-xl">
        <InputSection onGenerate={handleGenerate} isProcessing={status === ProcessingStatus.PROCESSING} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-[60vh] md:h-screen relative flex flex-col">
        
        {/* Header Overlay */}
        <header className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-10 pointer-events-none">
           <h1 className="text-xl font-bold text-slate-800 dark:text-white drop-shadow-md pointer-events-auto opacity-50 hover:opacity-100 transition-opacity">
            Gemini KG<span className="text-indigo-500">.visualizer</span>
           </h1>
           <div className="pointer-events-auto">
             <button 
               onClick={handleDownload}
               disabled={graphData.nodes.length === 0}
               className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
               title="Download JSON for Neo4j Import"
             >
               <Download size={16}/> 
               Download JSON
             </button>
           </div>
        </header>

        {/* Graph Area */}
        <main className="flex-1 w-full h-full relative">
          
          {status === ProcessingStatus.IDLE && graphData.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-600 flex-col gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                 <Share2 size={32} className="opacity-50" />
              </div>
              <p>Ready to visualize. Enter text to begin.</p>
            </div>
          )}

          {status === ProcessingStatus.ERROR && (
             <div className="absolute inset-0 flex items-center justify-center p-8 z-50 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex flex-col items-center text-center">
                    <AlertCircle size={48} className="text-red-500 mb-4" />
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Extraction Failed</h3>
                    <p className="text-sm text-red-600 dark:text-red-300">{errorMessage}</p>
                    <button 
                        onClick={() => setStatus(ProcessingStatus.IDLE)}
                        className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-200 rounded-md text-sm font-medium transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
             </div>
          )}

          {/* D3 Graph Component */}
          <div className="w-full h-full p-4">
             <ForceGraph data={graphData} />
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;