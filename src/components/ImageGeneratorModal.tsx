import { useState, useEffect } from 'react';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export default function ImageGeneratorModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [hasKey, setHasKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(setHasKey).catch(console.error);
    } else if (isOpen) {
      setHasKey(!!process.env.API_KEY || !!process.env.GEMINI_API_KEY);
    }
  }, [isOpen]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
        setError(null);
      } catch (err) {
        console.error("Failed to open key selector", err);
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: size
          }
        }
      });

      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setGeneratedImage(imageUrl);
      } else {
        setError("No image generated. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
         setHasKey(false);
         setError("API Key error. Please select your key again.");
         if (window.aistudio) {
           handleSelectKey();
         }
      } else {
         setError(err.message || "An error occurred during generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-[#1a1d24] border border-gray-700 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#13151a]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            Generate Game Cover
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!hasKey ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">API Key Required</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                To generate high-quality images with Nano Banana Pro, you need to select a paid Google Cloud API key.
                <br/><br/>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Learn more about billing</a>
              </p>
              <button 
                onClick={handleSelectKey}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-8 rounded-xl transition-colors shadow-lg shadow-purple-500/20"
              >
                Select API Key
              </button>
              {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A futuristic racing game cover with neon lights, highly detailed, 4k..."
                  className="w-full bg-[#252830] border border-gray-700 rounded-xl p-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px] resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Image Size</label>
                <div className="flex gap-3">
                  {(['1K', '2K', '4K'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${size === s ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-[#252830] text-gray-400 hover:bg-gray-800 border border-gray-700/50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={!prompt || isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Generate Image
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {generatedImage && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Result</h3>
                  <div className="rounded-xl overflow-hidden border border-gray-700 bg-black aspect-[16/9] shadow-2xl">
                    <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                  </div>
                  <a 
                    href={generatedImage} 
                    download="generated-cover.png"
                    className="mt-4 block w-full text-center bg-[#252830] hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors border border-gray-700"
                  >
                    Download Image
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
