import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle, Calendar, Filter, Activity, MapPin, DollarSign, Archive } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Analytics = () => {
    const { token } = useAuth();
    const [sparePartsData, setSparePartsData] = useState([]);
    const [maintenanceFreq, setMaintenanceFreq] = useState([]);
    const [lowStockData, setLowStockData] = useState([]);
    const [timeRange, setTimeRange] = useState(30);
    const [groupBy, setGroupBy] = useState('area');
    const [inventoryOverview, setInventoryOverview] = useState(null);
    const [inventoryDistribution, setInventoryDistribution] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch spare parts usage
            const spareRes = await fetch(`/api/analytics/spare-parts-usage?days=${timeRange}&limit=10`, { headers });
            const spareData = await spareRes.json();
            setSparePartsData(spareData.data || []);

            // Fetch maintenance frequency
            const maintRes = await fetch(`/api/analytics/maintenance-frequency?groupBy=${groupBy}&days=${timeRange}`, { headers });
            const maintData = await maintRes.json();
            setMaintenanceFreq(maintData.data || []);

            // Fetch low stock dashboard
            const stockRes = await fetch(`/api/analytics/low-stock-dashboard`, { headers });
            const stockData = await stockRes.json();
            setLowStockData(stockData.data || []);

            // Fetch Inventory Overview
            const overviewRes = await fetch(`/api/analytics/inventory-overview`, { headers });
            const overviewData = await overviewRes.json();
            setInventoryOverview(overviewData.data || null);

            // Fetch Inventory Distribution
            const distRes = await fetch(`/api/analytics/inventory-distribution`, { headers });
            const distData = await distRes.json();
            setInventoryDistribution(distData.data || []);

            // Fetch Recent Activity
            const activityRes = await fetch(`/api/stock-movements`, { headers });
            const activityData = await activityRes.json();
            setRecentActivity((activityData.data || []).slice(0, 10)); // Take top 10

        } catch (err) {
            console.error("Failed to fetch analytics", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange, groupBy]);

    const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];

    const urgencyColors = {
        critical: 'bg-red-500',
        high: 'bg-orange-500',
        medium: 'bg-yellow-500',
        low: 'bg-emerald-500'
    };

    const [activeTab, setActiveTab] = useState('maintenance');

    if (loading) {
        return (
            <div className="p-8 w-full min-h-screen flex items-center justify-center">
                <div className="text-white text-xl">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 w-full min-h-screen">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    Analytics Dashboard
                </h1>
                <p className="text-slate-400 mt-1">Insights and trends from your maintenance and inventory data</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-white/10 pb-1">
                <button
                    onClick={() => setActiveTab('maintenance')}
                    className={`pb-3 px-2 text-lg font-medium transition-colors relative ${activeTab === 'maintenance' ? 'text-brand-orange' : 'text-slate-400 hover:text-white'}`}
                >
                    Preventive Maintenance
                    {activeTab === 'maintenance' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`pb-3 px-2 text-lg font-medium transition-colors relative ${activeTab === 'inventory' ? 'text-brand-orange' : 'text-slate-400 hover:text-white'}`}
                >
                    Inventory Management
                    {activeTab === 'inventory' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange rounded-full" />
                    )}
                </button>
            </div>

            {/* Time Range Filter (Global) */}
            <div className="flex gap-4 mb-8">
                <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3">
                    <Calendar size={20} className="text-brand-orange" />
                    <span className="text-slate-400 text-sm font-medium">Time Range:</span>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(Number(e.target.value))}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-orange"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                        <option value={180}>Last 6 Months</option>
                        <option value={365}>Last Year</option>
                    </select>
                </div>
            </div>

            {/* MAINTENANCE TAB */}
            {activeTab === 'maintenance' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-10"
                >
                    {/* Maintenance Frequency */}
                    <section>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                                <TrendingUp className="text-brand-orange" size={24} />
                                Maintenance Frequency
                            </h2>
                            <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3">
                                <Filter size={18} className="text-brand-orange" />
                                <span className="text-slate-400 text-sm font-medium">Group By:</span>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value)}
                                    className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-orange"
                                >
                                    <option value="area">Area</option>
                                    <option value="system">System</option>
                                    <option value="component">Component</option>
                                    <option value="action">Action Type</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Bar Chart */}
                            <div className="glass-panel rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Maintenance Count by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</h3>
                                {maintenanceFreq.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={350}>
                                        <BarChart data={maintenanceFreq}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis
                                                dataKey="category"
                                                stroke="#94a3b8"
                                                angle={-45}
                                                textAnchor="end"
                                                height={80}
                                            />
                                            <YAxis stroke="#94a3b8" />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1e293b',
                                                    border: '1px solid #334155',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                            />
                                            <Bar dataKey="maintenance_count" fill="#f97316" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">No data available</div>
                                )}
                            </div>

                            {/* Pie Chart - Action Types */}
                            <div className="glass-panel rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Action Distribution</h3>
                                {maintenanceFreq.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={350}>
                                        <PieChart>
                                            <Pie
                                                data={maintenanceFreq}
                                                dataKey="maintenance_count"
                                                nameKey="category"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label
                                            >
                                                {maintenanceFreq.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1e293b',
                                                    border: '1px solid #334155',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                            />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">No data available</div>
                                )}
                            </div>
                        </div>
                    </section>
                </motion.div>
            )}

            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-10"
                >
                    {/* Inventory Overview (New) */}
                    {inventoryOverview && (
                        <section>
                            <h2 className="text-2xl font-semibold text-white flex items-center gap-2 mb-6">
                                <Package className="text-brand-orange" size={24} />
                                Inventory Overview
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm mb-1">Total Items</p>
                                        <h3 className="text-3xl font-bold text-white">{inventoryOverview.total_items}</h3>
                                    </div>
                                    <div className="p-3 bg-blue-500/10 rounded-lg">
                                        <Archive className="text-blue-400" size={28} />
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm mb-1">Total Value</p>
                                        <h3 className="text-3xl font-bold text-emerald-400">
                                            ${(inventoryOverview.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-emerald-500/10 rounded-lg">
                                        <DollarSign className="text-emerald-400" size={28} />
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border-l-4 border-red-500 flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm mb-1">Low Stock Items</p>
                                        <h3 className="text-3xl font-bold text-red-400">{inventoryOverview.low_stock_count}</h3>
                                    </div>
                                    <div className="p-3 bg-red-500/10 rounded-lg">
                                        <AlertTriangle className="text-red-400" size={28} />
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border-l-4 border-slate-600 flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm mb-1">Out of Stock</p>
                                        <h3 className="text-3xl font-bold text-slate-300">{inventoryOverview.out_of_stock_count}</h3>
                                    </div>
                                    <div className="p-3 bg-slate-700/50 rounded-lg">
                                        <Package className="text-slate-400" size={28} />
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Inventory Distribution Chart (New) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <section className="lg:col-span-1">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                                <MapPin className="text-brand-orange" size={20} />
                                Inventory by Area
                            </h2>
                            <div className="glass-panel rounded-2xl p-6 h-[400px]">
                                {inventoryDistribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={inventoryDistribution}
                                                dataKey="item_count"
                                                nameKey="location_area"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                                    const RADIAN = Math.PI / 180;
                                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                    return (
                                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                            {`${(percent * 100).toFixed(0)}%`}
                                                        </text>
                                                    );
                                                }}
                                            >
                                                {inventoryDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1e293b',
                                                    border: '1px solid #334155',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                            />
                                            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-slate-500 italic">No distribution data</div>
                                )}
                            </div>
                        </section>

                        <section className="lg:col-span-2">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                                <Activity className="text-brand-orange" size={20} />
                                Recent Inventory Activity
                            </h2>
                            <div className="glass-panel rounded-2xl p-0 overflow-hidden h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase sticky top-0 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="p-4 font-semibold">Time</th>
                                            <th className="p-4 font-semibold">Product</th>
                                            <th className="p-4 font-semibold">Type</th>
                                            <th className="p-4 font-semibold text-right">Qty</th>
                                            <th className="p-4 font-semibold">User</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm">
                                        {recentActivity.length > 0 ? (
                                            recentActivity.map((log) => (
                                                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 text-slate-400 whitespace-nowrap">
                                                        {new Date(log.timestamp).toLocaleDateString()} <span className="text-xs opacity-50">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </td>
                                                    <td className="p-4 font-medium text-slate-200">{log.product_name || `ID: ${log.product_id}`}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.movement_type === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                            }`}>
                                                            {log.movement_type}
                                                        </span>
                                                    </td>
                                                    <td className={`p-4 text-right font-mono font-bold ${log.movement_type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {log.movement_type === 'IN' ? '+' : '-'}{log.quantity}
                                                    </td>
                                                    <td className="p-4 text-slate-400">{log.username || 'System'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-slate-500 italic">No recent activity recorded</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* Low Stock Dashboard */}
                    <section>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                                <AlertTriangle className="text-red-400" size={24} />
                                Low Stock Dashboard
                            </h2>
                            <span className="text-slate-400 text-sm">
                                {lowStockData.length} items need attention
                            </span>
                        </div>

                        {lowStockData.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {lowStockData.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{ y: -5 }}
                                        className={`glass-panel p-6 rounded-2xl border-l-4 ${item.urgency === 'critical' ? 'border-red-500' : item.urgency === 'high' ? 'border-orange-500' : item.urgency === 'medium' ? 'border-yellow-500' : 'border-emerald-500'}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-white font-bold text-lg">{item.product_name}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${urgencyColors[item.urgency]} text-white`}>
                                                {item.urgency.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Current Stock:</span>
                                                <span className="text-white font-semibold">{item.qty}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Min Required:</span>
                                                <span className="text-white font-semibold">{item.min_qty}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Stock Level:</span>
                                                <span className="text-white font-semibold">{item.stockPercentage}%</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Days to Stockout:</span>
                                                <span className={`font-semibold ${item.daysToStockout < 7 ? 'text-red-400' : item.daysToStockout < 14 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                                    {item.daysToStockout === 999 ? 'N/A' : `~${item.daysToStockout} days`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Used (30d):</span>
                                                <span className="text-white font-semibold">{item.used_last_30_days}</span>
                                            </div>

                                            <div className="pt-3 border-t border-white/10">
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-slate-400">Recommended Order:</span>
                                                    <span className="text-brand-orange font-bold">{item.recommendedOrderQty} units</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">Supplier:</span>
                                                    <span className="text-white font-medium">{item.supplier_name || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-panel rounded-2xl p-12 text-center">
                                <div className="text-emerald-400 mb-3">
                                    <Package size={48} className="mx-auto" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">All Stock Levels Healthy</h3>
                                <p className="text-slate-400">No items are currently below reorder point</p>
                            </div>
                        )}
                    </section>

                    {/* Most Used Spare Parts (Inventory View) */}
                    <section className="mb-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                                <Package className="text-brand-orange" size={24} />
                                Spare Parts Usage Trends
                            </h2>
                        </div>

                        <div className="glass-panel rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Top Consumed Parts</h3>
                            {sparePartsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={sparePartsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis
                                            dataKey="product_name"
                                            stroke="#94a3b8"
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                        />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="total_used" fill="#f97316" name="Total Units Used" />
                                        <Bar dataKey="usage_count" fill="#3b82f6" name="Number of Usage Events" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    No spare parts usage data available for the selected period
                                </div>
                            )}
                        </div>
                    </section>
                </motion.div>
            )}
        </div>
    );
};

export default Analytics;
