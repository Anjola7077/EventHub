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
            <input type="file" accept="image

}
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

      {}
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
                  <input type="file" accept="image

