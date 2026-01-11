import { useState, useEffect } from 'react';

// 1. Definimos la estructura de los datos que espera el Dashboard
export interface QuickStats {
  salesToday: number;
  ticketsToday: number;
  salesMonth: number;
  outStock: number;
  lowStock: number;
}

// 2. Datos vacíos para mostrar mientras carga
const initialStats: QuickStats = {
  salesToday: 0,
  ticketsToday: 0,
  salesMonth: 0,
  outStock: 0,
  lowStock: 0,
};

export function useQuickStats(storeId: string | undefined) {
  const [stats, setStats] = useState<QuickStats>(initialStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si no hay ID de tienda, no hacemos nada
    if (!storeId) return;

    console.log(`🔌 Dashboard: Conectando a la tienda ${storeId}...`);
    setLoading(true);

    // ⚠️ IMPORTANTE: Esta URL debe ser la de tu Worker (wss:// para WebSocket)
    // Asegúrate de que coincide con tu deploy de wrangler
    const WORKER_URL = `wss://tustock-bridge.marcelprats-0.workers.dev/connect?storeId=${storeId}&role=WEB`;

    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(WORKER_URL);

      socket.onopen = () => {
        console.log("✅ WebSocket Conectado: Esperando datos...");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // El Worker nos envía un 'SNAPSHOT_UPDATE' con los datos frescos
          if (message.type === 'SNAPSHOT_UPDATE' && message.data) {
            console.log("🔥 Datos en tiempo real recibidos:", message.data);
            
            // Actualizamos el estado -> El Dashboard se repinta solo
            setStats(prev => ({
                ...prev, // Mantenemos lo anterior por si acaso
                ...message.data // Sobrescribimos con lo nuevo
            }));
            setLoading(false);
          }
        } catch (e) {
          console.error("Error al leer mensaje del socket:", e);
        }
      };

      socket.onerror = (error) => {
        console.error("❌ Error en WebSocket:", error);
        setLoading(false);
      };

    } catch (e) {
      console.error("Error al crear conexión:", e);
      setLoading(false);
    }

    // LIMPIEZA: Cuando el usuario sale del dashboard, cerramos la conexión
    return () => {
      if (socket) {
        console.log("🔌 Desconectando...");
        socket.close();
      }
    };

  }, [storeId]); // Se re-ejecuta si cambia la tienda

  return { stats, loading };
}