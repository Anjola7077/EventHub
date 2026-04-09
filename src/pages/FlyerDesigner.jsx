import React, { useState, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Type, Image as ImageIcon, Square, Circle, Download, RotateCcw, Trash2, 
  LayoutTemplate, MoveUp, MoveDown, AlignLeft, AlignCenter, AlignRight, ChevronUp } from 'lucide-react';
import html2canvas from 'html2canvas';

const FlyerDesigner = ({ darkMode }) => {
  const [elements, setElements] = useState([
    { id: '1', type: 'text', content: 'YOUR EVENT NAME', x: 150, y: 200,
       color: '#ffffff', fontSize: 32, rotation: 0, scale: 1, skewX: 0, skewY: 0,
        fontWeight: '800', 
        fontStyle: 'normal', fontFamily: 'Inter, sans-serif', textAlign: 'center', borderWidth: 0, borderColor: '#000000',
         borderStyle: 'solid', borderRadius: 0, opacity: 1 }
  ]);
  const [bgColor, setBgColor] = useState('#1a47c8');
  const [bgType, setBgType] = useState('color'); 
  const [bgGradient, setBgGradient] = useState('linear-gradient(45deg, #1a47c8, #3b82f6)');
  const [bgImage, setBgImage] = useState('');
  
  const [selectedId, setSelectedId] = useState(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const canvasRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleAddImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setElements([...elements, {
      id: Date.now().toString(),
      type: 'shape',
      shape: 'rect',
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      color: '#ffffff',
      rotation: 0,
      scale: 1,
      skewX: 0,
      skewY: 0,
      fillType: 'image',
      fillImage: imageUrl,
      borderWidth: 0,
      borderColor: '#000000',
      borderStyle: 'solid',
      borderRadius: 0,
      opacity: 1
    }]);
    e.target.value = null;
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  const updateElement = (id, updates) => {
    setElements(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  const bringToFront = () => {
    if (!selectedId) return;
    setElements((prev) => {
      const filtered = prev.filter((el) => el.id !== selectedId);
      const selected = prev.find((el) => el.id === selectedId);
      return [...filtered, selected];
    });
  };

  const sendToBack = () => {
    if (!selectedId) return;
    setElements((prev) => {
      const filtered = prev.filter((el) => el.id !== selectedId);
      const selected = prev.find((el) => el.id === selectedId);
      return [selected, ...filtered];
    });
  };

  const handleAlign = (alignment) => {
    if (!selectedId || !canvasRef.current) return;
    const canvasWidth = canvasRef.current.clientWidth;
    const domElement = document.getElementById(`element-${selectedId}`);
    const elWidth = domElement ? domElement.offsetWidth : (selectedElement?.width || 100);

    let newX = selectedElement.x;
    if (alignment === 'left') newX = 0;
    if (alignment === 'center') newX = (canvasWidth - elWidth) / 2;
    if (alignment === 'right') newX = canvasWidth - elWidth;

    updateElement(selectedId, { x: newX });
  };

  const glassStyle = darkMode 
    ? 'bg-slate-800/60 border-slate-700/50 backdrop-blur-2xl' 
    : 'bg-white/80 border-white/50 backdrop-blur-2xl shadow-xl';

  const addText = () => {
    setElements([...elements, {
      id: Date.now().toString(),
      type: 'text',
      content: 'New Text',
      x: 50,
      y: 50,
      color: '#ffffff',
      fontSize: 24,
      rotation: 0,
      scale: 1,
      skewX: 0,
      skewY: 0,
      fontWeight: '700',
      fontStyle: 'normal',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'left',
      borderWidth: 0,
      borderColor: '#000000',
      borderStyle: 'solid',
      borderRadius: 0,
      opacity: 1
    }]);
  };

  const addShape = (shapeType) => {
    setElements([...elements, {
      id: Date.now().toString(),
      type: 'shape',
      shape: shapeType,
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      color: '#3b82f6',
      rotation: 0,
      scale: 1,
      skewX: 0,
      skewY: 0,
      fillType: 'color',
      fillGradient: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
      fillImage: '',
      borderWidth: 0,
      borderColor: '#000000',
      borderStyle: 'solid',
      borderRadius: 0,
      opacity: 1
    }]);
  };

  const handleDragEnd = (id, e, info) => {
    setElements(elements.map(el => el.id === id ? { ...el, x: el.x + info.offset.x, y: el.y + info.offset.y } : el));
  };

  const handleDelete = () => {
    if (selectedId) setElements(elements.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  const downloadFlyer = async (format = 'png') => {
    if (!canvasRef.current) return;
    setSelectedId(null); 
    setShowDownloadOptions(false);
    setTimeout(async () => {
      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        scale: 2,
      });

      if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'l' : 'p',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        // Use PNG for best quality in PDF
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('event-flyer.pdf');
      } else {
        const link = document.createElement('a');
        link.download = `event-flyer.${format}`;
        link.href = canvas.toDataURL(`image/${format}`, 1.0);
        link.click();
      }
    }, 100);
  };

  return (
    <Motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-28 pb-10 px-4 md:px-8 max-w-[90rem] mx-auto min-h-screen flex flex-col lg:flex-row gap-6">

     
      <div className={`w-full lg:w-72 shrink-0 p-6 rounded-[2.5rem] border flex flex-col gap-6 overflow-y-auto shadow-2xl ${glassStyle}`}>
        <div>
          <h2 className={`text-xs font-black uppercase tracking-widest opacity-100 mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Add Elements</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={addText} className={`py-3 rounded-xl flex flex-col items-center gap-2 font-bold text-xs transition-colors ${darkMode ? 'bg-slate-700/50 hover:bg-blue-600 text-white' : 'bg-black/5 hover:bg-blue-100 text-slate-900'}`}><Type size={18}/> Text</button>
            <button onClick={() => addShape('rect')} className={`py-3 rounded-xl flex flex-col items-center gap-2 font-bold text-xs transition-colors ${darkMode ? 'bg-slate-700/50 hover:bg-blue-600 text-white' : 'bg-black/5 hover:bg-blue-100 text-slate-900'}`}><Square size={18}/> Rectangle</button>
            <button onClick={() => addShape('circle')} className={`py-3 rounded-xl flex flex-col items-center gap-2 font-bold text-xs transition-colors ${darkMode ? 'bg-slate-700/50 hover:bg-blue-600 text-white' : 'bg-black/5 hover:bg-blue-100 text-slate-900'}`}><Circle size={18}/> Circle</button>
            <button onClick={() => imageInputRef.current?.click()} className={`py-3 rounded-xl flex flex-col items-center gap-2 font-bold text-xs transition-colors opacity-100 ${darkMode ? 'bg-slate-700/50 text-white hover:bg-blue-600' : 'bg-black/5 text-slate-900 hover:bg-blue-100'}`}><ImageIcon size={18}/> Image</button>
            <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleAddImage} />
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <button onClick={() => setElements([])} className={`w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors ${darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-black/10 text-slate-900'}`}>
            <RotateCcw size={16}/> Clear Canvas
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowDownloadOptions(prev => !prev)} 
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-600/30 flex justify-center items-center gap-2 transition-transform hover:scale-[1.02]"
            >
              <Download size={18}/> 
              <span>Download Flyer</span>
              <ChevronUp size={16} className={`transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showDownloadOptions && (
                <Motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`absolute bottom-full mb-2 w-full p-2 rounded-2xl border flex flex-col gap-1 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                >
                  <button onClick={() => downloadFlyer('png')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-colors ${darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-900'}`}>Download as PNG</button>
                  <button onClick={() => downloadFlyer('jpeg')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-colors ${darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-900'}`}>Download as JPEG</button>
                  <button onClick={() => downloadFlyer('pdf')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-colors ${darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-900'}`}>Download as PDF</button>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className={`flex-1 rounded-[2.5rem] border overflow-hidden flex items-center justify-center relative shadow-2xl min-h-[500px] ${glassStyle}`}>
        
        <div 
          ref={canvasRef}
          className="relative w-full min-h-[500px] max-w-full sm:w-[400px] sm:min-h-[500px] shadow-2xl rounded-xl overflow-hidden cursor-crosshair"
          style={{ 
            background: bgType === 'color' ? bgColor : bgType === 'gradient' ? bgGradient : `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          onClick={() => setSelectedId(null)}
        >
          {elements.map((el) => (
            <Motion.div
              key={el.id}
              id={`element-${el.id}`}
              drag
              dragMomentum={false}
              onDragEnd={(e, info) => handleDragEnd(el.id, e, info)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
              className={`absolute flex items-center justify-center ${selectedId === el.id ? 'ring-2 ring-blue-400 ring-offset-2' : ''} ${selectedId !== el.id ? 'cursor-move' : ''}`}
              animate={{
                x: el.x,
                y: el.y,
                rotate: el.rotation,
                scale: el.scale,
                skewX: el.skewX,
                skewY: el.skewY,
              }}
              transition={{ duration: 0 }}
              style={{
                color: el.color,
                fontSize: el.type === 'text' ? el.fontSize : undefined,
                width: el.width,
                height: el.height,
                background: el.type === 'shape' ? (el.fillType === 'color' ? el.color : el.fillType === 'gradient' ? el.fillGradient : `url(${el.fillImage})`) : 'transparent',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: el.shape === 'circle' ? '50%' : `${el.borderRadius || 0}px`,
                borderWidth: `${el.borderWidth || 0}px`,
                borderColor: el.borderColor || '#000000',
                borderStyle: el.borderStyle || 'solid',
                opacity: el.opacity !== undefined ? el.opacity : 1,
                transformOrigin: 'center center'
              }}
            >
              {el.type === 'text' && (
                <div 
                  contentEditable={selectedId === el.id} 
                  suppressContentEditableWarning
                  onBlur={(e) => updateElement(el.id, { content: e.target.innerText })}
                  className={`outline-none whitespace-nowrap font-black p-2 ${selectedId === el.id ? 'cursor-text' : 'cursor-move'}`}
                  style={{ fontWeight: el.fontWeight, fontStyle: el.fontStyle, fontFamily: el.fontFamily || 'inherit', textAlign: el.textAlign || 'left' }}
                  onPointerDown={(e) => {
                    if (selectedId === el.id) {
                      e.stopPropagation();
                    }
                  }}
                >
                  {el.content}
                </div>
              )}
            </Motion.div>
          ))}
        </div>
      </div>
      
      {/* Right Sidebar: Properties */}
      <div className={`w-full lg:w-80 xl:w-96 shrink-0 p-6 rounded-[2.5rem] border flex flex-col gap-6 overflow-y-auto shadow-2xl ${glassStyle}`}>
        <div>
          <h2 className={`text-xs font-black uppercase tracking-widest opacity-100 mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}><LayoutTemplate size={14}/> Canvas Settings</h2>
          <div className="flex flex-col xl:flex-row gap-3">
            <select value={bgType} onChange={(e) => setBgType(e.target.value)} className="px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-sm">
              <option value="color">Solid Color</option>
              <option value="gradient">Gradient</option>
              <option value="image">Image</option>
            </select>
            {bgType === 'color' && (
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full xl:w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent" />
            )}
            {bgType === 'gradient' && (
              <input type="text" value={bgGradient} onChange={(e) => setBgGradient(e.target.value)} placeholder="linear-gradient(45deg, #color1, #color2)" className="px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-sm flex-1" />
            )}
            {bgType === 'image' && (
              <div className="flex gap-2 flex-1">
                <input type="text" value={bgImage} onChange={(e) => setBgImage(e.target.value)} placeholder="Image URL" className="px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-sm flex-1 w-full" />
                <label className="px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-sm cursor-pointer flex items-center justify-center">
                  <span className="sr-only">Upload</span>
                  <ImageIcon size={16} />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    if (e.target.files[0]) {
                      setBgImage(URL.createObjectURL(e.target.files[0]));
                    }
                  }} />
                </label>
              </div>
            )}
          </div>
        </div>

        {selectedElement ? (
          <div className="rounded-3xl p-5 border border-slate-200/70 bg-slate-50/60 dark:bg-slate-900/60 dark:border-slate-700 flex flex-col flex-1 mb-0">
            <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Type size={16} /> Selected Element
              </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={bringToFront} className={`py-2 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-900'}`}><MoveUp size={14}/> To Front</button>
              <button onClick={sendToBack} className={`py-2 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-900'}`}><MoveDown size={14}/> To Back</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button onClick={() => handleAlign('left')} className={`py-2 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-900'}`} title="Align Left"><AlignLeft size={14}/></button>
              <button onClick={() => handleAlign('center')} className={`py-2 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-900'}`} title="Align Center"><AlignCenter size={14}/></button>
              <button onClick={() => handleAlign('right')} className={`py-2 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-900'}`} title="Align Right"><AlignRight size={14}/></button>
            </div>
              <div className="flex flex-col gap-3">
                  <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                    {selectedElement.type === 'text' ? 'Text Color' : 'Fill Color'}
                    <input
                      type="color"
                      value={selectedElement.color}
                      onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                      className="mt-2 h-10 w-full rounded-xl border-none bg-transparent"
                    />
                  </label>
                {selectedElement.type === 'shape' && (
                  <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                    Fill Type
                    <select value={selectedElement.fillType} onChange={(e) => updateElement(selectedElement.id, { fillType: e.target.value })} className="mt-2 px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-sm">
                      <option value="color">Solid</option>
                      <option value="gradient">Gradient</option>
                      <option value="image">Image</option>
                    </select>
                  </label>
                )}
              </div>
              {selectedElement.type === 'shape' && selectedElement.fillType === 'gradient' && (
                <div className="mb-3">
                  <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                    Gradient
                    <input
                      type="text"
                      value={selectedElement.fillGradient}
                      onChange={(e) => updateElement(selectedElement.id, { fillGradient: e.target.value })}
                      placeholder="linear-gradient(45deg, #color1, #color2)"
                      className="mt-2 px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-sm"
                    />
                  </label>
                </div>
              )}
              {selectedElement.type === 'shape' && selectedElement.fillType === 'image' && (
                <div className="mb-3">
                  <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                    Image URL
                    <div className="flex gap-2 mt-2 w-full">
                      <input
                        type="text"
                        value={selectedElement.fillImage}
                        onChange={(e) => updateElement(selectedElement.id, { fillImage: e.target.value })}
                        placeholder="Image URL"
                        className="px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-sm flex-1"
                      />
                      <label className="px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-sm cursor-pointer flex items-center justify-center">
                        <ImageIcon size={16} />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          if (e.target.files[0]) {
                            updateElement(selectedElement.id, { fillImage: URL.createObjectURL(e.target.files[0]) });
                          }
                        }} />
                      </label>
                    </div>
                  </label>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
                <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                  Text Alignment
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateElement(selectedElement.id, { textAlign: 'left' })}
                      className={`p-2 flex-1 flex justify-center rounded-xl border ${selectedElement.textAlign === 'left' || !selectedElement.textAlign ? 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700' : 'bg-slate-100 dark:bg-slate-800 dark:border-slate-700'} dark:text-white transition-colors`}
                    ><AlignLeft size={14} /></button>
                    <button
                      type="button"
                      onClick={() => updateElement(selectedElement.id, { textAlign: 'center' })}
                      className={`p-2 flex-1 flex justify-center rounded-xl border ${selectedElement.textAlign === 'center' ? 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700' : 'bg-slate-100 dark:bg-slate-800 dark:border-slate-700'} dark:text-white transition-colors`}
                    ><AlignCenter size={14} /></button>
                    <button
                      type="button"
                      onClick={() => updateElement(selectedElement.id, { textAlign: 'right' })}
                      className={`p-2 flex-1 flex justify-center rounded-xl border ${selectedElement.textAlign === 'right' ? 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700' : 'bg-slate-100 dark:bg-slate-800 dark:border-slate-700'} dark:text-white transition-colors`}
                    ><AlignRight size={14} /></button>
                  </div>
                </label>
                <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                  Rotate
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={selectedElement.rotation}
                    onChange={(e) => updateElement(selectedElement.id, { rotation: Number(e.target.value) })}
                    className="mt-2"
                  />
                  <span className="text-right text-[11px] mt-1">{selectedElement.rotation}°</span>
                </label>
                <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                  Scale
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.05"
                    value={selectedElement.scale}
                    onChange={(e) => updateElement(selectedElement.id, { scale: Number(e.target.value) })}
                    className="mt-2"
                  />
                  <span className="text-right text-[11px] mt-1">{selectedElement.scale.toFixed(2)}x</span>
                </label>
                <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                  Warp X
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={selectedElement.skewX}
                    onChange={(e) => updateElement(selectedElement.id, { skewX: Number(e.target.value) })}
                    className="mt-2"
                  />
                  <span className="text-right text-[11px] mt-1">{selectedElement.skewX}°</span>
                </label>
                <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                  Warp Y
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={selectedElement.skewY}
                    onChange={(e) => updateElement(selectedElement.id, { skewY: Number(e.target.value) })}
                    className="mt-2"
                  />
                  <span className="text-right text-[11px] mt-1">{selectedElement.skewY}°</span>
                </label>
              </div>
              <div className="mb-3">
                <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                  Opacity
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedElement.opacity !== undefined ? selectedElement.opacity : 1}
                    onChange={(e) => updateElement(selectedElement.id, { opacity: Number(e.target.value) })}
                    className="mt-2"
                  />
                  <span className="text-right text-[11px] mt-1">{Math.round((selectedElement.opacity !== undefined ? selectedElement.opacity : 1) * 100)}%</span>
                </label>
              </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
              <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                Border Width
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={selectedElement.borderWidth || 0}
                  onChange={(e) => updateElement(selectedElement.id, { borderWidth: Number(e.target.value) })}
                  className="mt-2"
                />
                <span className="text-right text-[11px] mt-1">{selectedElement.borderWidth || 0}px</span>
              </label>
              <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                Border Color
                <input
                  type="color"
                  value={selectedElement.borderColor || '#000000'}
                  onChange={(e) => updateElement(selectedElement.id, { borderColor: e.target.value })}
                  className="mt-2 h-10 w-full rounded-xl border-none bg-transparent cursor-pointer"
                />
              </label>
            </div>
              {selectedElement.type === 'shape' && (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                    Width
                    <input
                      type="range"
                      min="10"
                      max="800"
                      value={selectedElement.width}
                      onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                      className="mt-2"
                    />
                    <span className="text-right text-[11px] mt-1">{selectedElement.width}px</span>
                  </label>
                  <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                    Height
                    <input
                      type="range"
                      min="10"
                      max="800"
                      value={selectedElement.height}
                      onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                      className="mt-2"
                    />
                    <span className="text-right text-[11px] mt-1">{selectedElement.height}px</span>
                  </label>
                  {selectedElement.shape === 'rect' && (
                    <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                      Border Radius
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={selectedElement.borderRadius || 0}
                        onChange={(e) => updateElement(selectedElement.id, { borderRadius: Number(e.target.value) })}
                        className="mt-2"
                      />
                      <span className="text-right text-[11px] mt-1">{selectedElement.borderRadius || 0}px</span>
                    </label>
                  )}
                </div>
              )}
              {selectedElement.type === 'text' && (
                <div className="flex flex-col gap-3">
                <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                  Font Family
                  <select 
                    value={selectedElement.fontFamily || 'Inter, sans-serif'} 
                    onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                    className="mt-2 px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-sm"
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value='"Times New Roman", serif'>Times New Roman</option>
                    <option value='"Courier New", monospace'>Courier New</option>
                    <option value="Impact, sans-serif">Impact</option>
                    <option value='"Comic Sans MS", cursive'>Comic Sans MS</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="Georgia, serif">Georgia</option>
                  </select>
                </label>
                    <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                      Font Size
                      <input
                        type="range"
                        min="8"
                        max="200"
                        value={selectedElement.fontSize}
                        onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                        className="mt-2"
                      />
                      <span className="text-right text-[11px] mt-1">{selectedElement.fontSize}px</span>
                    </label>
                    <label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-white">
                      Style
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === '700' ? '900' : '700' })}
                          className="px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-xs"
                        >{selectedElement.fontWeight === '900' ? 'Heavy' : 'Bold'}</button>
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                          className="px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white text-xs"
                        >{selectedElement.fontStyle === 'italic' ? 'Italic' : 'Normal'}</button>
                      </div>
                    </label>
                  </div>
              )}
              <button onClick={handleDelete} disabled={!selectedId} className="w-full mt-auto py-3 rounded-xl font-bold flex justify-center items-center gap-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
                <Trash2 size={16}/> Delete Selected
              </button>
            </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60 min-h-[200px]">
            <LayoutTemplate size={48} className="mb-4" />
            <p className="text-sm font-bold text-center px-8">Select an element on the canvas to edit its properties</p>
          </div>
        )}
      </div>
    </Motion.main>
  );
};

export default FlyerDesigner;
