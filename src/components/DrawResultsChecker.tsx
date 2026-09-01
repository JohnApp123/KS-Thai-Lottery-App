import React, { useState } from 'react';
import { DrawResult } from '../types';
import { checkTicketWinning, PrizeCheckResult } from '../services/thaiLotteryService';

interface Props {
  currentDraw: DrawResult;
}

export const DrawResultsChecker: React.FC<Props> = ({ currentDraw }) => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [result, setResult] = useState<PrizeCheckResult | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketNumber.trim().length !== 6) {
      alert('ထီလက်မှတ် ဂဏန်း ၆ လုံး အပြည့် ရိုက်ထည့်ပေးပါခင်ဗျာ။');
      return;
    }
    const checkRes = checkTicketWinning(ticketNumber, currentDraw);
    setResult(checkRes);
    setHasChecked(true);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-5 my-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-slate-800">
          🇹🇭 ထိုင်းထီပေါက်စဉ် တိုက်စစ်ရန်
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          ထီလက်မှတ်ပေါ်ရှိ ဂဏန်း ၆ လုံးကို ရိုက်ထည့်ပါ
        </p>
      </div>

      <form onSubmit={handleCheck} className="space-y-3">
        <input
          type="text"
          maxLength={6}
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full text-center text-2xl tracking-[0.25em] font-black text-indigo-950 py-3 px-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 transition"
        />

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-md shadow-indigo-200 transition active:scale-[0.98]"
        >
          ထီပေါက်စဉ် စစ်ဆေးမည်
        </button>
      </form>

      {hasChecked && (
        <div className="mt-5 pt-4 border-t border-slate-100 animate-fadeIn">
          {result && result.isWinner ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <span className="text-3xl">🎉</span>
              <h4 className="text-emerald-800 font-bold text-base mt-1">
                ဂုဏ်ယူပါသည်! ထီပေါက်ပါသည်
              </h4>
              <div className="mt-3 space-y-2">
                {result.prizes.map((win, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-emerald-100 shadow-sm text-sm"
                  >
                    <span className="font-medium text-slate-700">
                      {win.nameBurmese}
                    </span>
                    <span className="font-bold text-emerald-600">
                      {win.amountTHB.toLocaleString()} ဘတ်
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-emerald-200 flex justify-between font-bold text-emerald-900 text-sm">
                <span>စုစုပေါင်း ဆုကြေးငွေ:</span>
                <span>{result.totalPrizeTHB.toLocaleString()} ဘတ်</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-2xl">😢</span>
              <p className="text-slate-700 font-semibold text-sm mt-1">
                စိတ်မကောင်းပါခင်ဗျာ၊ ဆုမပေါက်ပါ
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                နောက်တစ်ကြိမ် ကံစမ်းနိုင်ပါသည်
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
