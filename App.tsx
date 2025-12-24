
import React, { useState } from 'react';
import InputSection from './components/InputSection';
import ForceGraph from './components/ForceGraph';
import { generateKnowledgeGraph, verifyKnowledgeGraph, optimizeKnowledgeGraph } from './services/aiService';
import { GraphData, ProcessingStatus, VerificationResult } from './types';
import { Share2, AlertCircle, Download, ShieldCheck, X, CheckCircle2, AlertTriangle, Loader2, Wand2, Sparkles, RefreshCcw, Eye } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [sourceText, setSourceText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [isConfirmingReverify, setIsConfirmingReverify] = useState(false);

  const handleGenerate = async (text: string, focus: string) => {
    setSourceText(text);
    setStatus(ProcessingStatus.PROCESSING);
    setErrorMessage(null);
    setVerificationResult(null);
    setShowVerification(false);
    try {
      const data = await generateKnowledgeGraph(text, focus);
      setGraphData(data);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (error: any) {
      setStatus(ProcessingStatus.ERROR);
      setErrorMessage(error.message || "生成图谱失败。");
    }
  };

  const executeVerify = async () => {
    if (!sourceText || graphData.nodes.length === 0) return;
    setStatus(ProcessingStatus.VERIFYING);
    setIsConfirmingReverify(false);
    setShowVerification(false); // 重新验证时先隐藏侧边栏
    try {
      const result = await verifyKnowledgeGraph(sourceText, graphData);
      setVerificationResult(result);
      setShowVerification(true);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (error: any) {
      setStatus(ProcessingStatus.SUCCESS);
      setErrorMessage("验证失败: " + error.message);
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleVerifyButtonClick = () => {
    // 如果已经有验证结果，显示自定义确认弹窗
    if (verificationResult) {
      setIsConfirmingReverify(true);
    } else {
      executeVerify();
    }
  };

  const handleShowExistingReport = () => {
    setShowVerification(true);
    setIsConfirmingReverify(false);
  };

  const handleOptimize = async () => {
    if (!sourceText || !verificationResult || status === ProcessingStatus.OPTIMIZING) return;
    
    setStatus(ProcessingStatus.OPTIMIZING);
    try {
      const optimizedData = await optimizeKnowledgeGraph(
        sourceText,
        graphData,
        verificationResult.suggestions
      );
      setGraphData(optimizedData);
      setVerificationResult(null);
      setShowVerification(false);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (error: any) {
      setStatus(ProcessingStatus.SUCCESS);
      setErrorMessage("优化失败: " + error.message);
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleDownload = () => {
    if (graphData.nodes.length === 0) return;
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
      
      {/* 侧边栏 / 输入区域 */}
      <div className="w-full md:w-[400px] h-[40vh] md:h-screen shrink-0 z-20 shadow-xl">
        <InputSection onGenerate={handleGenerate} isProcessing={status === ProcessingStatus.PROCESSING || status === ProcessingStatus.OPTIMIZING} />
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 h-[60vh] md:h-screen relative flex flex-col">
        
        {/* 页眉叠加层 */}
        <header className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-10 pointer-events-none">
           <h1 className="text-xl font-bold text-slate-800 dark:text-white drop-shadow-md pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
            知识图谱<span className="text-indigo-500">.可视化</span>
           </h1>
           <div className="pointer-events-auto flex items-center gap-4">
             <button 
               onClick={handleVerifyButtonClick}
               disabled={graphData.nodes.length === 0 || status === ProcessingStatus.VERIFYING || status === ProcessingStatus.OPTIMIZING}
               className="px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-all shadow-sm flex items-center gap-2 disabled:opacity-40"
               title="验证图谱的有效性和完备性"
             >
               {status === ProcessingStatus.VERIFYING ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14}/>} 
               验证图谱
             </button>
             <button 
               onClick={handleDownload}
               disabled={graphData.nodes.length === 0}
               className="px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-all shadow-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
               title="下载 JSON 以便导入 Neo4j"
             >
               <Download size={14}/> 
               下载结果
             </button>
           </div>
        </header>

        {/* 图谱展示区 */}
        <main className="flex-1 w-full h-full relative">
          
          {/* 自定义确认重新验证弹窗 */}
          {isConfirmingReverify && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 mx-auto">
                   <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-3">已有验证结果</h3>
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                  系统检测到当前内容已生成过验证报告。您希望重新通过 AI 进行一次深度审计，还是直接打开查看之前的报告？
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={executeVerify}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-indigo-500/20"
                  >
                    <RefreshCcw size={18} /> 重新生成报告
                  </button>
                  <button 
                    onClick={handleShowExistingReport}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95"
                  >
                    <Eye size={18} /> 查看现有报告
                  </button>
                  <button 
                    onClick={() => setIsConfirmingReverify(false)}
                    className="w-full py-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs font-medium transition-colors"
                  >
                    暂不处理
                  </button>
                </div>
              </div>
            </div>
          )}

          {(status === ProcessingStatus.IDLE || status === ProcessingStatus.OPTIMIZING) && graphData.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-600 flex-col gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                 {status === ProcessingStatus.OPTIMIZING ? <Loader2 size={32} className="animate-spin text-indigo-500" /> : <Share2 size={32} className="opacity-50" />}
              </div>
              <p>{status === ProcessingStatus.OPTIMIZING ? "正在根据审计报告优化图谱..." : "准备就绪。请输入文本开始分析。"}</p>
            </div>
          )}

          {status === ProcessingStatus.ERROR && (
             <div className="absolute inset-0 flex items-center justify-center p-8 z-50 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex flex-col items-center text-center">
                    <AlertCircle size={48} className="text-red-500 mb-4" />
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">操作失败</h3>
                    <p className="text-sm text-red-600 dark:text-red-300">{errorMessage}</p>
                    <button 
                        onClick={() => { setStatus(ProcessingStatus.IDLE); setErrorMessage(null); }}
                        className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-200 rounded-md text-sm font-medium transition-colors"
                    >
                        关闭
                    </button>
                </div>
             </div>
          )}

          {/* D3 图谱组件 */}
          <div className="w-full h-full p-4 relative">
             <ForceGraph data={graphData} />
             {status === ProcessingStatus.OPTIMIZING && (
               <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-[2px] z-20">
                 <div className="bg-white dark:bg-slate-800 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-indigo-100 dark:border-slate-700">
                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-slate-100">正在重构图谱</span>
                      <span className="text-xs text-slate-500">正在应用 AI 改进建议...</span>
                    </div>
                 </div>
               </div>
             )}
          </div>

          {/* 验证结果面板 */}
          {showVerification && verificationResult && (
            <div className="absolute inset-y-0 right-0 w-80 md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-2xl z-30 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck size={20} />
                  知识图谱验证报告
                </div>
                <button onClick={() => setShowVerification(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 评分区 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1 tracking-wider">有效性</div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{verificationResult.validityScore}%</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${verificationResult.validityScore}%` }}></div>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1 tracking-wider">完备性</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{verificationResult.completenessScore}%</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${verificationResult.completenessScore}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* 反馈详情 */}
                <section>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    详细分析反馈
                  </h4>
                  <ul className="space-y-2">
                    {verificationResult.feedback.map((item, i) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400 pl-4 border-l-2 border-emerald-500/30 py-0.5">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* 缺失实体 */}
                {verificationResult.missingEntities.length > 0 && (
                  <section>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      建议增加的实体
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {verificationResult.missingEntities.map((entity, i) => (
                        <span key={i} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs border border-amber-200 dark:border-amber-800">
                          {entity}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* 专家建议 */}
                <section className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                  <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                    <Wand2 size={14} />
                    改进建议
                  </h4>
                  <p className="text-sm text-indigo-600 dark:text-indigo-300 leading-relaxed italic">
                    "{verificationResult.suggestions}"
                  </p>
                </section>
                
                {/* 优化按钮 */}
                <button
                  onClick={handleOptimize}
                  disabled={status === ProcessingStatus.OPTIMIZING}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 font-bold transition-all transform active:scale-95 disabled:opacity-50"
                >
                  {status === ProcessingStatus.OPTIMIZING ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      正在优化...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      一键优化图谱
                    </>
                  )}
                </button>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest">Powered by Configurable AI Model</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;
