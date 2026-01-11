import { 
  TrendingUp, Calendar, ShoppingCart, 
  AlertTriangle, Package, Activity 
} from 'lucide-react';
import { useQuickStats } from '~/hooks/useStoreData'; // 👈 Reutilizamos la lógica

export function Dashboard({ user, store }: any) {
  
  // Usamos el mismo gancho mágico. Si estamos en Web, leerá de la Nube.
  const { stats, loading } = useQuickStats(store?.id);

  const displayName = user?.full_name || user?.name || 'Usuario';

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-6 overflow-auto animate-fadeIn">
      
      {/* HEADER SIMPLE */}
      <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">
            Dashboard
          </h1>
          <p className="text-slate-500">
            Vista general de <span className="font-bold text-slate-700 dark:text-slate-300">{store?.name}</span>
          </p>
      </div>

      {/* GRILLA DE KPIS (DATOS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* 1. Ventas Hoy */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp size={80}/>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Ventas Hoy</p>
          <div className="flex items-baseline gap-2">
             <h3 className="text-4xl font-black text-blue-600 dark:text-blue-400">
                {stats.salesToday?.toFixed(2) || '0.00'}€
             </h3>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
             <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
               {stats.ticketsToday}
             </span>
             tickets emitidos
          </div>
        </div>

        {/* 2. Acumulado Mes (Placeholder hasta que conectemos query histórica) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Proyección Mes</p>
          <h3 className="text-4xl font-black text-slate-700 dark:text-white">
            {stats.salesMonth?.toFixed(2) || '0.00'}€
          </h3>
          <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
            <Calendar size={14}/> {new Date().toLocaleString('es-ES', { month: 'long' })}
          </p>
        </div>

        {/* 3. Estado del Inventario */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm col-span-1 md:col-span-2">
          <p className="text-slate-500 text-xs font-bold uppercase mb-4">Salud del Stock</p>
          <div className="grid grid-cols-2 gap-4">
             {/* Agotados */}
             <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-lg">
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <span className="block text-2xl font-black text-red-600">{stats.outStock}</span>
                    <span className="text-xs text-red-500 font-bold uppercase">Agotados</span>
                </div>
             </div>

             {/* Stock Bajo */}
             <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/50">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/50 text-orange-600 rounded-lg">
                    <Package size={20} />
                </div>
                <div>
                    <span className="block text-2xl font-black text-orange-600">{stats.lowStock}</span>
                    <span className="text-xs text-orange-500 font-bold uppercase">Stock Bajo</span>
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* AQUÍ PONDREMOS GRÁFICAS MÁS ADELANTE */}
      <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400">
         <Activity size={48} className="mb-4 opacity-50"/>
         <p>Próximamente: Gráficas detalladas de ventas</p>
      </div>

    </div>
  );
}