import React, { useState } from 'react';
import { useMqtt } from '../mqttContext';
import { Mic, MicOff, Send } from 'lucide-react';

export const VoiceCommandPanel: React.FC = () => {
  const { publish, state } = useMqtt();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState('');
  const [manualText, setManualText] = useState('');

  const processCommand = (text: string) => {
    const t = text.toLowerCase().trim();
    setTranscript(text);

    // ===== STOP VARIASI =====
    if (t.includes('variasi') &&
       (t.includes('stop') || t.includes('mati') || t.includes('henti') || t.includes('off'))) {
      publish('smarthome/variasi', 'STOP');
      setResult('⏹ Variasi dihentikan');
      return;
    }

    // ===== VARIASI 1 =====
    if (t.includes('variasi') && (t.includes('1') || t.includes('satu'))) {
      publish('smarthome/variasi', 'VARIASI1');
      setResult('🎉 Variasi 1 aktif!');
      return;
    }

    // ===== VARIASI 2 =====
    if (t.includes('variasi') && (t.includes('2') || t.includes('dua'))) {
      publish('smarthome/variasi', 'VARIASI2');
      setResult('🎉 Variasi 2 aktif!');
      return;
    }

    // ===== SUHU / TEMPERATUR =====
    if (t.includes('suhu') || t.includes('temperatur') || t.includes('temperature') || t.includes('panas')) {
      setResult(`🌡 Suhu saat ini: ${state.temperature.toFixed(1)} °C`);
      return;
    }

    // ===== KELEMBAPAN =====
    if (t.includes('kelembap') || t.includes('lembab') || t.includes('humid') || t.includes('kelembaban')) {
      setResult(`💧 Kelembapan saat ini: ${state.humidity.toFixed(0)} %`);
      return;
    }

    // ===== SEMUA ON =====
    const isSemua = t.includes('semua') || t.includes('all') || (!t.match(/lampu\s*[1-4]/) && !t.includes('satu') && !t.includes('dua') && !t.includes('tiga') && !t.includes('empat'));
    const isOn  = t.includes('nyala') || t.includes('hidup') || t.includes(' on') || t.startsWith('on');
    const isOff = t.includes('mati') || t.includes('padam') || t.includes(' off') || t.startsWith('off');

    // ===== PER LAMPU =====
    type LampKey = 'lampu1' | 'lampu2' | 'lampu3' | 'lampu4';
    const lampuMap: { keys: string[]; relay: LampKey }[] = [
      { keys: ['lampu 1', 'lampu1', 'satu', '1'],  relay: 'lampu1' },
      { keys: ['lampu 2', 'lampu2', 'dua',  '2'],  relay: 'lampu2' },
      { keys: ['lampu 3', 'lampu3', 'tiga', '3'],  relay: 'lampu3' },
      { keys: ['lampu 4', 'lampu4', 'empat','4'],  relay: 'lampu4' },
    ];

    for (const { keys, relay } of lampuMap) {
      if (keys.some(k => t.includes(k))) {
        if (isOn) {
          publish(`smarthome/${relay}`, 'ON');
          setResult(`💡 ${relay} dinyalakan`);
          return;
        }
        if (isOff) {
          publish(`smarthome/${relay}`, 'OFF');
          setResult(`🔌 ${relay} dimatikan`);
          return;
        }
      }
    }

    // ===== SEMUA LAMPU =====
    if (isOn && isSemua) {
      ['lampu1','lampu2','lampu3','lampu4'].forEach(l => publish(`smarthome/${l}`, 'ON'));
      setResult('⚡ Semua lampu dinyalakan');
      return;
    }
    if (isOff && isSemua) {
      ['lampu1','lampu2','lampu3','lampu4'].forEach(l => publish(`smarthome/${l}`, 'OFF'));
      setResult('🔴 Semua lampu dimatikan');
      return;
    }

    setResult('❓ Perintah tidak dikenali');
  };

  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setResult('⚠️ Browser tidak mendukung suara. Gunakan Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    setResult('🎤 Mendengarkan...');
    recognition.start();

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      processCommand(text);
      setListening(false);
    };

    recognition.onerror = () => {
      setResult('❌ Gagal mendengar, coba lagi.');
      setListening(false);
    };

    recognition.onend = () => setListening(false);
  };

  const exampleCommands = [
    'Nyalakan lampu',
    'Matikan lampu',
    'Berapa temperatur',
    'Berapa kelembapan',
    'Nyalakan variasi 1',
    'Nyalakan variasi 2',
  ];

  return (
    <div className="bg-white/40 border border-white rounded-[2.5rem] p-6 backdrop-blur-md">
      <h3 className="text-md font-black text-slate-800 mb-4">Voice & Text Command</h3>

      {/* Voice Button */}
      <button
        onClick={startVoice}
        className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 mb-3 ${
          listening
            ? 'bg-pink-400 text-white animate-pulse shadow-lg shadow-pink-200'
            : 'bg-slate-800 text-white hover:bg-slate-700 shadow-sm'
        }`}
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
        {listening ? 'Mendengarkan...' : 'Tekan & Bicara'}
      </button>

      {/* Manual Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={manualText}
          onChange={e => setManualText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && manualText.trim()) {
              processCommand(manualText);
              setManualText('');
            }
          }}
          placeholder="Atau ketik perintah..."
          className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white/70 text-sm outline-none focus:border-pink-300 transition-colors"
        />
        <button
          onClick={() => {
            if (manualText.trim()) {
              processCommand(manualText);
              setManualText('');
            }
          }}
          className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-colors shadow-sm"
        >
          <Send size={15} />
        </button>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="p-3 bg-white/60 rounded-2xl border border-slate-100 mb-2">
          <p className="text-[10px] text-slate-400 mb-0.5">Terdeteksi:</p>
          <p className="text-sm font-bold text-slate-700">"{transcript}"</p>
        </div>
      )}

      {/* Result */}
      {result && result !== '🎤 Mendengarkan...' && (
        <div className={`p-3 rounded-2xl border mb-3 ${
          result.startsWith('❓') || result.startsWith('❌') || result.startsWith('⚠️')
            ? 'bg-red-50 border-red-100 text-red-600'
            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
          <p className="text-sm font-bold">{result}</p>
        </div>
      )}

      {/* Example Commands */}
      <div className="mt-2 p-3 bg-white/40 rounded-2xl border border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          Contoh Perintah Suara
        </p>
        <div className="grid grid-cols-2 gap-1">
          {exampleCommands.map(cmd => (
            <button
              key={cmd}
              onClick={() => processCommand(cmd)}
              className="text-left text-[11px] text-slate-500 hover:text-pink-500 py-1 px-2 rounded-xl hover:bg-pink-50 transition-colors"
            >
              "{cmd}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
