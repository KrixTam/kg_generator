
import React, { useState, useRef } from 'react';
import { Play, FileText, Loader2, Wand2, Upload } from 'lucide-react';
import { processFile } from '../services/fileService';

interface InputSectionProps {
  onGenerate: (text: string, focus: string) => void;
  isProcessing: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onGenerate, isProcessing }) => {
  const [text, setText] = useState('');
  const [focus, setFocus] = useState('');
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSample = () => {
    const sample = `埃隆·马斯克（Elon Musk）是SpaceX和特斯拉（Tesla）的首席执行官，他宣布了一项新的火星任务。该声明在德克萨斯州的博卡奇卡（Boca Chica）发布。美国国家航空航天局（NASA）表示有兴趣在星舰（Starship）项目上进行合作。与此同时，特斯拉的股价在纽约交易中上涨了5%。`;
    setText(sample);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileProcessing(true);
    try {
      const extractedText = await processFile(file);
      setText(extractedText);
    } catch (error) {
      alert("读取文件错误: " + (error as Error).message);
    } finally {
      setIsFileProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onGenerate(text, focus || '通用');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full p-6 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
           <Wand2 className="text-indigo-600 dark:text-indigo-400" />
           图谱构建器
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          导入文档（PDF, MD, HTML）或直接粘贴文本，AI将自动提取实体与关系并构建知识图谱。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        <div className="flex-1 flex flex-col relative">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              原始文本内容
            </label>
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={isProcessing || isFileProcessing}
              className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors disabled:opacity-50"
            >
              {isFileProcessing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              上传文档
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.md,.markdown,.html,.htm,.txt" 
              onChange={handleFileUpload}
            />
          </div>
          
          <textarea
            className="flex-1 w-full p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all font-sans text-sm leading-relaxed"
            placeholder={isFileProcessing ? "正在提取文件内容..." : "在此输入或粘贴文本，或点击上方上传文档..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isProcessing || isFileProcessing}
          />
          
          {isFileProcessing && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg">
                    <Loader2 size={24} className="animate-spin text-indigo-600" />
                </div>
            </div>
          )}
        </div>

        <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                分析侧重点 (可选)
            </label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="例如：'财务往来'、'时间演变'、'人物关系'"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                disabled={isProcessing}
            />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSample}
            disabled={isProcessing || isFileProcessing}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <FileText size={16} />
            使用示例
          </button>
          
          <button
            type="submit"
            disabled={isProcessing || isFileProcessing || !text.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                正在生成...
              </>
            ) : (
              <>
                <Play size={16} />
                开始生成图谱
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputSection;
