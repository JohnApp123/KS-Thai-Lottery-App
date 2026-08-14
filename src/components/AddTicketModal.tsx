import React, { useState } from 'react';
import { Ticket } from '../types';
import { X, Plus, Sparkles, Layers, RefreshCw, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { SAMPLE_TICKET_IMAGES } from '../data/initialData';

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTickets: (newTickets: Omit<Ticket, 'id' | 'createdAt' | 'status'>[]) => void;
  selectedDrawDate: string;
  exchangeRate?: number;
  fixedTicketPriceMMK?: number;
}

export const AddTicketModal: React.FC<AddTicketModalProps> = ({
  isOpen,
  onClose,
  onAddTickets,
  selectedDrawDate,
  exchangeRate = 120,
  fixedTicketPriceMMK = 15000,
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  
  // Single ticket fields
  const [ticketNumber, setTicketNumber] = useState('');
  const [serialCode, setSerialCode] = useState('');
  const [priceMMK, setPriceMMK] = useState<number>(fixedTicketPriceMMK);
  const [drawDate, setDrawDate] = useState(
    selectedDrawDate !== 'all' ? selectedDrawDate : '2026-08-16'
  );
  const [setCount, setSetCount] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');

  // Handle MMK change
  const handleMMKChange = (val: number) => {
    setPriceMMK(val);
  };

  // Batch tickets text field (comma or newline separated numbers)
  const [batchNumbersText, setBatchNumbersText] = useState('');
  const [batchSerialPrefix, setBatchSerialPrefix] = useState('SN-');
  const [batchStartNumber, setBatchStartNumber] = useState<number>(1);

  if (!isOpen) return null;

  // Handle image file selection/capture with canvas compression for smooth gallery uploading
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            setImageUrl(compressed);
          } else {
            setImageUrl(reader.result as string);
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Quick random 6-digit Thai lottery number generator helper
  const handleGenerateRandomNumber = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000).toString();
    setTicketNumber(randomNum);
  };

  const handleGenerateRandomBatch = () => {
    const nums: string[] = [];
    for (let i = 0; i < 5; i++) {
      nums.push(Math.floor(100000 + Math.random() * 900000).toString());
    }
    setBatchNumbersText(nums.join('\n'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'single') {
      const cleanNum = ticketNumber.trim();
      if (!cleanNum || cleanNum.length < 6) {
        alert('ကျေးဇူးပြု၍ ၆ လုံးပြည့် ထီနံပါတ် မှန်ကန်စွာ ထည့်သွင်းပါ');
        return;
      }

      onAddTickets([
        {
          number: cleanNum,
          serialCode: serialCode.trim() || undefined,
          seriesNumber: '',
          price: Math.round(Number(priceMMK) / (exchangeRate || 120)),
          priceMMK: Number(priceMMK) * Number(setCount),
          currency: 'MMK',
          drawDate,
          setCount: Number(setCount),
          notes,
          imageUrl: imageUrl || undefined,
        },
      ]);
    } else {
      // Batch mode
      const rawLines = batchNumbersText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (rawLines.length === 0) {
        alert('ကျေးဇူးပြု၍ အနည်းဆုံး ထီနံပါတ် ၁ ခု ထည့်သွင်းပါ');
        return;
      }

      let parsedItems: { number: string; serial?: string }[] = [];
      let currentSeq = batchStartNumber;

      rawLines.forEach((line) => {
        // Check if line contains custom delimiter like colon or comma
        if (line.includes(':') || line.includes('=')) {
          const parts = line.split(/[:=]/);
          const customSerial = parts[0].trim();
          const numPart = parts[1]?.trim().replace(/\D/g, '') || '';
          if (numPart.length >= 2) {
            parsedItems.push({
              number: numPart.padStart(6, '0').slice(0, 6),
              serial: customSerial,
            });
          }
        } else {
          // Space or comma separated 6-digit numbers
          const chunks = line.split(/[\s,]+/).filter((c) => c.replace(/\D/g, '').length >= 2);
          chunks.forEach((chunk) => {
            const cleanDigits = chunk.replace(/\D/g, '').padStart(6, '0').slice(0, 6);
            const autoSerial = batchSerialPrefix
              ? `${batchSerialPrefix}${String(currentSeq).padStart(3, '0')}`
              : undefined;
            parsedItems.push({
              number: cleanDigits,
              serial: autoSerial,
            });
            currentSeq++;
          });
        }
      });

      if (parsedItems.length === 0) {
        alert('မှန်ကန်သော ထီနံပါတ်များ မတွေ့ရှိပါ။ ပြန်လည်စစ်ဆေးပါ');
        return;
      }

      const newTicketsList = parsedItems.map((item) => ({
        number: item.number,
        serialCode: item.serial,
        seriesNumber: '',
        price: Math.round(Number(priceMMK) / (exchangeRate || 120)),
        priceMMK: Number(priceMMK) * Number(setCount),
        currency: 'MMK' as const,
        drawDate,
        setCount: Number(setCount),
        notes,
        imageUrl: imageUrl || undefined,
      }));

      onAddTickets(newTicketsList);
    }

    // Reset & close
    setTicketNumber('');
    setSerialCode('');
    setBatchNumbersText('');
    setNotes('');
    setImageUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full overflow-hidden shadow-xl my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                ထီလက်မှတ် အသစ်ထည့်သွင်းရန်
              </h2>
              <p className="text-xs text-slate-400">
                Add New Lottery Ticket Inventory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-4 pb-0 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'single'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>တစ်စောင်ချင်း သွင်းမည်</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('batch')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'batch'
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>အုပ်စုလိုက် သွင်းမည် (Batch Add)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'single' ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    ထီနံပါတ် ၆ လုံး <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomNumber}
                    className="text-[11px] text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>ကျနံပါတ် ထုတ်မည်</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="582914"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-base font-mono font-bold tracking-widest text-amber-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              {/* Serial Code / Tracking Tag Input */}
              <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/70">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-amber-950 flex items-center gap-1">
                    <span>🔖 အမှတ်စဉ်နံပါတ် (Serial / Tracking No.)</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-medium">ကိုယ်ပိုင်အမှတ်အသား</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ဥပမာ: SN-001 သို့မဟုတ် #01"
                    value={serialCode}
                    onChange={(e) => setSerialCode(e.target.value)}
                    className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.floor(1 + Math.random() * 99);
                      setSerialCode(`SN-${String(rand).padStart(3, '0')}`);
                    }}
                    className="text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Auto
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80">
                <p className="text-xs font-bold text-amber-950 mb-1.5">
                  🔖 အမှတ်စဉ် အလိုအလျောက် သတ်မှတ်ရန် (Auto-Serial Config):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-600 block mb-0.5">အမှတ်စဉ် ရှေ့စာလုံး (Prefix)</span>
                    <input
                      type="text"
                      placeholder="SN-"
                      value={batchSerialPrefix}
                      onChange={(e) => setBatchSerialPrefix(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block mb-0.5">စတင်မည့် ဂဏန်းနံပါတ် (Start No.)</span>
                    <input
                      type="number"
                      min="1"
                      value={batchStartNumber}
                      onChange={(e) => setBatchStartNumber(Number(e.target.value))}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    ထီနံပါတ်များ (တစ်လိုင်းလျှင် တစ်ခု သို့မဟုတ် ပေါ်ကော်မာခြား)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomBatch}
                    className="text-[11px] text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>နမူနာ ၅ စောင် ထုတ်မည်</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="582914&#10;918234&#10;SN-003: 304918&#10;749201"
                  value={batchNumbersText}
                  onChange={(e) => setBatchNumbersText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono font-semibold text-amber-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 မှတ်ချက်: <code>SN-001: 582914</code> ပုံစံဖြင့်လည်း စိတ်ကြိုက် အမှတ်စဉ်နံပါတ် တွဲ၍ ထည့်သွင်းနိုင်ပါသည်။
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Set Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                တွဲစောင်ရေ (ထီစောင်)
              </label>
              <select
                value={setCount}
                onChange={(e) => setSetCount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 cursor-pointer font-medium"
              >
                <option value={1}>၁ စောင်တွဲ</option>
                <option value={2}>၂ စောင်တွဲ</option>
                <option value={3}>၃ စောင်တွဲ</option>
                <option value={5}>၅ စောင်တွဲ</option>
              </select>
            </div>

            {/* Draw Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ထွက်မည့်ရက် (Draw Date)
              </label>
              <input
                type="date"
                required
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>

          {/* MMK Price Section */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                ၁ စောင် ရောင်းစျေးနှုန်း (Price per Ticket in MMK)
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded shadow-2xs">
                {(priceMMK || 0).toLocaleString()} MMK
              </span>
            </div>

            <div>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="100"
                  step="100"
                  value={priceMMK || ''}
                  onChange={(e) => handleMMKChange(Number(e.target.value))}
                  placeholder="15000"
                  className="w-full bg-white border border-slate-300 rounded-lg pl-3.5 pr-14 py-2.5 text-sm text-emerald-800 font-mono font-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">
                  MMK
                </span>
              </div>
            </div>

            {setCount > 1 && (
              <p className="text-[11px] font-bold text-slate-700 pt-1 text-right border-t border-emerald-200/60">
                စုစုပေါင်း {setCount} စောင်တွဲ = <span className="text-emerald-700 font-mono text-xs font-black">{(priceMMK * setCount).toLocaleString()} MMK</span>
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              မှတ်ချက် (Notes)
            </label>
            <input
              type="text"
              placeholder="ဥပမာ: ထီနံပါတ်လှ၊ အထူးတွဲ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500"
            />
          </div>

          {/* Ticket Photo Attachment Section */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>ထီလက်မှတ် ဓာတ်ပုံ ပူးတွဲထည့်ရန် (Ticket Photo)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>

            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-300 group">
                <img
                  src={imageUrl}
                  alt="Attached Lottery Ticket"
                  className="w-full h-36 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ဖျက်မည်</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {/* Photo Gallery / Library Picker */}
                  <label className="flex flex-col items-center justify-center p-3 border border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-emerald-50 hover:border-emerald-400 transition-all text-center group">
                    <ImageIcon className="w-5 h-5 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-800">
                      🖼️ Photo / Gallery
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      ဖုန်းထဲမှ ပုံရွေးမည်
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* Camera Direct Capture */}
                  <label className="flex flex-col items-center justify-center p-3 border border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-amber-50 hover:border-amber-400 transition-all text-center group">
                    <Camera className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-800">
                      📷 ကင်မရာ ရိုက်မည်
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      တိုက်ရိုက် ဓာတ်ပုံရိုက်မည်
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preset sample lottery ticket photo selector */}
                <div className="pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                    သို့မဟုတ် နမူနာ ထီလက်မှတ်ပုံများ အမြန်ရွေးပါ:
                  </span>
                  <div className="flex gap-2">
                    {SAMPLE_TICKET_IMAGES.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(img)}
                        className="w-16 h-10 rounded-md overflow-hidden border border-slate-300 hover:border-emerald-500 transition-all cursor-pointer relative group"
                      >
                        <img src={img} alt={`Sample ${idx}`} className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-slate-900/30 group-hover:bg-transparent transition-colors flex items-center justify-center text-[9px] text-white font-bold">
                          နမူနာ {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
            >
              မလုပ်တော့ပါ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>ထီလက်မှတ် စာရင်းသို့ သွင်းမည်</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
