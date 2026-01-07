import { useState, useEffect, useRef } from 'react';
import { 
  Wifi, RefreshCw, TrendingUp, ShoppingCart, 
  Search, Package, AlertTriangle, Activity 
} from 'lucide-react';

// 🔥 TU URL DEL WORKER DE CLOUDFLARE (La que obtuviste antes)
const WORKER_URL = 'wss://tustock-bridge.marcelprats-0.workers.dev'; 

export const LiveMonitor = ({ shopId }: { shopId: string }) => {
  const [status, setStatus] = useState<'CONNECTING' | 'LIVE' | 'OFFLINE'>('CONNECTING');
  const [data, setData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectToBridge();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const connectToBridge = () => {
    setStatus('CONNECTING');
    
    // Conectamos como WEB (Observer)
    const socket = new WebSocket(`${WORKER_URL}/connect?storeId=${shopId}&role=WEB`);
    ws.current = socket;

    socket.onopen = () => {
      console.log("🔌 Web conectada a la Nube");
      // Al conectar, el Worker nos enviará el Snapshot automáticamente si lo tiene
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // 1. Recibimos actualización de estado (Snapshot)
        if (msg.type === 'SNAPSHOT_UPDATE') {
          console.log("📸 Snapshot recibido:", msg.data);
          setData(msg.data);
          
          // Calculamos si está "Vivo" (si el último update fue hace menos de 60s)
          const lastTime = new Date(msg.data.lastUpdate).getTime();
          const now = new Date().getTime();
          const isLive = (now - lastTime) < 60000; // 1 minuto de margen

          setStatus(isLive ? 'LIVE' : 'OFFLINE');
          setLastUpdated(new Date(msg.data.lastUpdate).toLocaleTimeString());
        }

        // 2. Recibimos respuesta de búsqueda (Túnel)
        if (msg.type === 'QUERY_RESPONSE') {
            if (msg.success && Array.isArray(msg.data)) {
                setSearchResults(msg.data);
            }
        }

      } catch (e) {
        console.error("Error parsing msg", e);
      }
    };

    socket.onclose = () => {
      console.log("❌ Desconectado");
      setStatus('OFFLINE');
    };
  };

  const buscarProducto = (e: any) => {
    e.preventDefault();
    if(!query || !ws.current) return;
    
    setStatus('LIVE'); // Asumimos live al buscar
    setSearchResults([]); // Limpiar anteriores

    // Enviamos petición al túnel
    ws.current.send(JSON.stringify({
        type: 'EXEC_QUERY',
        requestId: Date.now(),
        queryType: 'GLOBAL_STOCK', // Coincide con lo que programamos en Electron
        payload: { query } 
    }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER ESTADO */}
      <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${status === 'LIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
         <div className="flex items-center gap-4">
            <div className="relative">
                <div className={`w-4 h-4 rounded-full ${status === 'LIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                {status === 'LIVE' && <div className="absolute top-0 left-0 w-4 h-4 bg-emerald-500 rounded-full animate-ping opacity-75"></div>}
            </div>
            <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                    {status === 'LIVE' ? 'CONECTADO AL TPV' : 'MODO SINCRONIZADO (OFFLINE)'}
                </h3>
                <p className="text-xs opacity-70">
                    {status === 'LIVE' ? 'Recibiendo datos en tiempo real' : `Mostrando datos de: ${lastUpdated}`}
                </p>
            </div>
         </div>
         <button onClick={connectToBridge} className="p-2 hover:bg-white/50 rounded-full transition-colors" title="Reconectar">
            <RefreshCw size={18} className={status === 'CONNECTING' ? 'animate-spin' : ''}/>
         </button>
      </div>

      {/* KPIS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {/* VENTAS */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <TrendingUp size={48} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Ventas Hoy</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {data?.totalSales ? parseFloat(data.totalSales).toFixed(2) : '0.00'}€
            </h3>
            <div className="mt-3 flex items-center gap-1 text-emerald-600 text-xs font-bold">
                <Activity size={12}/> Caja Abierta
            </div>
         </div>

         {/* TICKETS */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <ShoppingCart size={48} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Tickets</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {data?.ticketCount || 0}
            </h3>
            <div className="mt-3 text-slate-400 text-xs">Transacciones realizadas</div>
         </div>

         {/* ESTADO SISTEMA */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Versión TPV</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2 truncate">
                v{data?.version || '---'}
            </h3>
            <div className="mt-3 flex items-center gap-2">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status==='LIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {status === 'LIVE' ? 'ONLINE' : 'SYNC'}
                 </span>
            </div>
         </div>
      </div>

      {/* BUSCADOR TÚNEL (SOLO SI ESTÁ LIVE) */}
      <div className={`transition-all duration-500 ${status === 'LIVE' ? 'opacity-100 translate-y-0' : 'opacity-50 grayscale'}`}>
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
                <Wifi size={20} className="text-blue-400 animate-pulse"/> 
                <h3 className="font-bold text-lg">Buscador Remoto</h3>
            </div>
            
            <form onSubmit={buscarProducto} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3.5 text-slate-500" size={18}/>
                    <input 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Busca stock en el PC de la tienda (ej: perfume)..." 
                        disabled={status !== 'LIVE'}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-blue-500 transition-colors disabled:cursor-not-allowed"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={status !== 'LIVE'} 
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 px-6 rounded-xl font-bold transition-colors"
                >
                    Buscar
                </button>
            </form>

            {/* RESULTADOS */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden min-h-[120px]">
                {searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-600">
                        <Package size={32} className="mb-2 opacity-20"/>
                        <p className="text-sm">Resultados en tiempo real</p>
                    </div>
                ) : (
                    <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900 text-slate-400 uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="p-3 font-semibold">Producto</th>
                                    <th className="p-3 text-right font-semibold">Precio</th>
                                    <th className="p-3 text-center font-semibold">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {searchResults.map((p, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-medium text-slate-200">
                                            {p.name}
                                            <div className="text-[10px] text-slate-500 font-mono">{p.sku}</div>
                                        </td>
                                        <td className="p-3 text-right font-mono text-emerald-400">{p.price}€</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.stock > 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                                                {p.stock}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      </div>

    </div>
  );
};