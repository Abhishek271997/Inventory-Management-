import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Filter, Calendar as CalendarIcon, Clock, Zap, AlertTriangle, CheckCircle, Activity, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const MaintenanceAnalytics = ({ setView, setLogsParams }) => {
    const { token } = useAuth();
    const [maintenanceFreq, setMaintenanceFreq] = useState([]);

    // Efficiency & Predictive State
    const [efficiency, setEfficiency] = useState({ overall: {}, bySystem: [] });
    const [predictions, setPredictions] = useState([]);

    const [startDate, setStartDate] = useState(subDays(new Date(), 30));
    const [endDate, setEndDate] = useState(new Date());
    const [groupBy, setGroupBy] = useState('area');

    // Drill Down State
    const [drillDown, setDrillDown] = useState({ active: false, category: '', filterKey: '' });

    const [loading, setLoading] = useState(true);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    // Premium Dark Palette: Brand Orange, Cyan, Indigo, Emerald, Violet, Rose, Amber
    const COLORS = ['#f97316', '#06b6d4', '#6366f1', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b'];

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            const startStr = format(startDate, 'yyyy-MM-dd');
            const endStr = format(endDate, 'yyyy-MM-dd');

            // 1. Fetch Maintenance Frequency
            // If drill down is active, we group by 'system' (or whatever makes sense) but filter by the clicked category
            const currentGroupBy = drillDown.active ? 'system' : groupBy;
            const filterParams = drillDown.active ? `&filterKey=${drillDown.filterKey}&filterValue=${drillDown.category}` : '';

            const maintRes = await fetch(`/api/analytics/maintenance-frequency?groupBy=${currentGroupBy}&startDate=${startStr}&endDate=${endStr}${filterParams}`, { headers });
            const maintData = await maintRes.json();
            // Parse maintenance_count to number
            const formattedMaintData = (maintData.data || []).map(item => ({
                ...item,
                maintenance_count: Number(item.maintenance_count)
            }));
            setMaintenanceFreq(formattedMaintData);

            // 2. Fetch Efficiency Metrics
            const effRes = await fetch(`/api/analytics/efficiency?startDate=${startStr}&endDate=${endStr}`, { headers });
            const effData = await effRes.json();
            console.log("DEBUG FRONTEND EFFICIENCY:", effData); // Debug log
            setEfficiency(effData);

            // 3. Fetch Predictive Analytics
            const predRes = await fetch(`/api/analytics/predictive`, { headers });
            const predData = await predRes.json();
            setPredictions(predData.data || []);

        } catch (err) {
            console.error("Failed to fetch analytics", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token && startDate && endDate) {
            fetchAnalytics();
        }
    }, [token, startDate, endDate, groupBy, drillDown]); // Trigger fetch on drillDown change

    // Calendar Generation Logic
    const generateCalendarDays = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Pad start
        const startDay = monthStart.getDay();
        const paddingDays = Array(startDay).fill(null);

        return [...paddingDays, ...days];
    };

    // Get events for a specific day
    const getEventsForDay = (day) => {
        if (!day) return [];
        return predictions.filter(pred => isSameDay(new Date(pred.predicted_date), day));
    };

    // Custom Tooltip Component
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900/90 border border-slate-700/50 p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="text-slate-200 font-semibold mb-1">{label}</p>
                    <p className="text-brand-orange font-bold text-lg">
                        {payload[0].value} <span className="text-xs text-slate-400 font-normal">{payload[0].name === 'avg_duration_minutes' ? 'mins' : 'count'}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading && !maintenanceFreq.length) {
        return (
            <div className="p-8 w-full min-h-screen flex items-center justify-center">
                <div className="text-white text-xl animate-pulse">Loading analytics...</div>
            </div>
        );
    }

    const calendarDays = generateCalendarDays();

    const handleChartClick = (data, chartType) => {
        let category = '';

        if (chartType === 'bar') {
            if (data && data.activePayload && data.activePayload[0]) {
                category = data.activePayload[0].payload.category;
            }
        } else if (chartType === 'pie') {
            // Recharts Pie returns the data entry directly
            category = data.category;
        }

        if (!category) return;

        if (!drillDown.active) {
            // ENTER DRILL DOWN
            setDrillDown({
                active: true,
                category: category,
                filterKey: groupBy
            });
        } else {
            // NAVIGATE TO LOGS
            // We are currently showing 'system' breakdown (hardcoded in fetch)
            const params = {};

            // 1. Apply Parent Filter (e.g. area = 'Production')
            params[drillDown.filterKey] = drillDown.category;

            // 2. Apply Clicked Item Filter (e.g. system = 'Conveyor')
            // Note: If we are already grouping by 'system' initially, this logic might need flexibility, 
            // but for now drill-down is 'system' centric.
            params['system'] = category;

            setLogsParams(params);
            setView('logs');
        }
    };

    return (
        <div className="p-4 md:p-8 w-full min-h-screen">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    Maintenance Analytics
                </h1>
                <p className="text-slate-400 mt-1">Track frequency, efficiency, and future predictions.</p>
            </header>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center">
                <div className="glass-panel px-4 py-2 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 border border-slate-700/30 relative z-50">
                    <div className="flex items-center gap-2 text-brand-orange">
                        <CalendarIcon size={20} />
                        <span className="text-slate-300 font-medium">Date Range:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-orange w-28 text-center cursor-pointer hover:bg-slate-800"
                            dateFormat="MMM d, yyyy"
                        />
                        <span className="text-slate-500">to</span>
                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-orange w-28 text-center cursor-pointer hover:bg-slate-800"
                            dateFormat="MMM d, yyyy"
                        />
                    </div>
                </div>

                <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border border-slate-700/30">
                    <Filter size={18} className="text-brand-orange" />
                    <span className="text-slate-400 text-sm font-medium">Group By:</span>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-orange cursor-pointer"
                    >
                        <option value="all">All (Total)</option>
                        <option value="area">Area</option>
                        <option value="system">System</option>
                        <option value="component">Component</option>
                        <option value="action">Action Type</option>
                    </select>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
            >
                {/* 1. Frequency Stats with Drill Down */}
                <section>
                    <div className="grid grid-cols-1 gap-6">
                        {/* Header handling for Drill Down */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <TrendingUp size={20} className="text-brand-orange" />
                                {drillDown.active
                                    ? `Breakdown of ${drillDown.category} (by System)`
                                    : `Distribution by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`
                                }
                            </h3>

                            {drillDown.active && (
                                <button
                                    onClick={() => setDrillDown({ active: false, category: '', filterKey: '' })}
                                    className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors border border-slate-600"
                                >
                                    <ChevronLeft size={16} /> Back to Overview
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* LEFT: Bar Chart (Clickable) */}
                            <div className="glass-panel rounded-2xl p-6 border border-slate-700/30 shadow-lg bg-slate-900/40 backdrop-blur-sm">
                                <h4 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Frequency Count</h4>
                                {maintenanceFreq.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={350}>
                                        <BarChart
                                            data={maintenanceFreq}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                            onClick={(data) => handleChartClick(data, 'bar')}
                                            className="cursor-pointer"
                                        >
                                            <defs>
                                                <linearGradient id="barColor" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.9} />
                                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.2} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} strokeOpacity={0.3} />
                                            <XAxis dataKey="category" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <YAxis stroke="#94a3b8" />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                            <Bar dataKey="maintenance_count" fill="url(#barColor)" radius={[6, 6, 0, 0]} barSize={50} animationDuration={800} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <div className="h-[350px] flex items-center justify-center text-slate-500">No data available</div>}
                                {!drillDown.active && (
                                    <div className="text-center text-xs text-slate-500 mt-2">Click a bar to see detailed breakdown</div>
                                )}
                            </div>

                            {/* RIGHT: Donut Chart (Reactive) */}
                            <div className="glass-panel rounded-2xl p-6 border border-slate-700/30 shadow-lg bg-slate-900/40 backdrop-blur-sm">
                                <h4 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Proportion Breakdown</h4>
                                {maintenanceFreq.length > 0 ? (
                                    <div className="relative">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <PieChart>
                                                <Pie
                                                    data={maintenanceFreq}
                                                    dataKey="maintenance_count"
                                                    nameKey="category"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={90}
                                                    outerRadius={140}
                                                    paddingAngle={4}
                                                    stroke="none"
                                                    className="cursor-pointer"
                                                    onClick={(data) => handleChartClick(data, 'pie')}
                                                >
                                                    {maintenanceFreq.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pr-[110px]">
                                            <div className="text-3xl font-bold text-white">{maintenanceFreq.reduce((sum, item) => sum + (Number(item.maintenance_count) || 0), 0)}</div>
                                            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Events</div>
                                        </div>
                                    </div>
                                ) : <div className="h-[350px] flex items-center justify-center text-slate-500">No data available</div>}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Efficiency Metrics Section */}
                <section>
                    <h2 className="text-2xl font-semibold text-white flex items-center gap-2 mb-6 border-b border-slate-700/50 pb-2">
                        <Zap className="text-brand-orange" size={24} />
                        Efficiency Metrics
                    </h2>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div
                            onClick={() => { setLogsParams({}); setView('logs'); }}
                            className="glass-panel p-6 rounded-2xl border border-slate-700/30 relative overflow-hidden group cursor-pointer hover:border-brand-orange/50 transition-colors"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Clock size={80} className="text-brand-orange" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Avg Resolution Time</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-bold text-white">
                                        {efficiency.overall?.avg_duration_minutes ? Math.round(Number(efficiency.overall.avg_duration_minutes)) : 0}
                                    </span>
                                    <span className="text-slate-400 mb-1">mins</span>
                                </div>
                            </div>
                        </div>
                        <div
                            onClick={() => { setLogsParams({}); setView('logs'); }}
                            className="glass-panel p-6 rounded-2xl border border-slate-700/30 relative overflow-hidden group cursor-pointer hover:border-emerald-400/50 transition-colors"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp size={80} className="text-emerald-400" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Maint. Hours</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-bold text-white">
                                        {efficiency.overall?.total_duration_minutes ? (Number(efficiency.overall.total_duration_minutes) / 60).toFixed(1) : 0}
                                    </span>
                                    <span className="text-slate-400 mb-1">hrs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Predictive & Calendar Section */}
                <section>
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-2">
                        <Activity className="text-brand-orange" size={24} />
                        <div>
                            <h2 className="text-2xl font-semibold text-white">Predictive Health & Calendar</h2>
                            <p className="text-slate-400 text-sm">Forecasted failures and maintenance schedule (MTBF).</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Left: Health Cards (2/3 width on large screens) */}
                        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                            {predictions.map((pred, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`glass-panel p-6 rounded-2xl border ${pred.status === 'Critical' ? 'border-red-500/50 bg-red-500/10' :
                                        pred.status === 'Risk' ? 'border-yellow-500/50 bg-yellow-500/10' :
                                            'border-slate-700/30'
                                        } shadow-lg relative overflow-hidden`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-bold text-white">{pred.system}</h3>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${pred.status === 'Critical' ? 'bg-red-500/20 text-red-500' :
                                            pred.status === 'Risk' ? 'bg-yellow-500/20 text-yellow-500' :
                                                'bg-emerald-500/20 text-emerald-500'
                                            }`}>
                                            {pred.status}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400 flex items-center gap-2"><Info size={14} /> MTBF</span>
                                            <span className="text-slate-200 font-semibold">{pred.mtbf_days ? `${pred.mtbf_days} Days` : 'N/A'}</span>
                                        </div>
                                        <div className="pt-3 border-t border-slate-700/30">
                                            <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Estimated Next Failure</div>
                                            <div className="text-xl font-bold flex items-center gap-2">
                                                {pred.days_until_due < 0 ? (
                                                    <span className="text-red-400 flex items-center gap-2"><AlertTriangle size={20} /> Overdue {Math.abs(pred.days_until_due)} days</span>
                                                ) : (
                                                    <span className={`${pred.status === 'Risk' ? 'text-yellow-400' : 'text-emerald-400'}`}>in {pred.days_until_due} Days</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                Predicted: {format(new Date(pred.predicted_date), 'MMM d, yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {predictions.length === 0 && (
                                <div className="text-center py-12 text-slate-500 glass-panel rounded-2xl border-slate-700/30 col-span-full">
                                    No sufficient history to generate predictions yet.
                                </div>
                            )}
                        </div>

                        {/* Right: Calendar View */}
                        <div className="glass-panel p-6 rounded-2xl border border-slate-700/30 h-fit">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">{format(currentMonth, 'MMMM yyyy')}</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentMonth(subDays(currentMonth, 30))}
                                        className="p-1 hover:bg-slate-700 rounded-lg text-slate-400"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                                        className="p-1 hover:bg-slate-700 rounded-lg text-slate-400"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-500 uppercase font-bold tracking-wider">
                                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, idx) => {
                                    if (!day) return <div key={`pad-${idx}`} className="p-2" />;

                                    const events = getEventsForDay(day);
                                    const isCurrentMonth = isSameMonth(day, currentMonth);
                                    const isTodayDate = isToday(day);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(day)}
                                            className={`
                                                relative p-2 rounded-lg cursor-pointer h-14 flex flex-col items-center justify-start border
                                                transition-colors
                                                ${isCurrentMonth ? 'text-slate-200' : 'text-slate-600'}
                                                ${isTodayDate ? 'bg-slate-700/50 border-brand-orange/50' : 'bg-slate-800/30 border-transparent hover:bg-slate-700/50'}
                                            `}
                                        >
                                            <span className={`text-xs ${isTodayDate ? 'font-bold text-brand-orange' : ''} ${!isCurrentMonth ? 'opacity-50' : ''}`}>
                                                {format(day, 'd')}
                                            </span>

                                            {/* Event Dots */}
                                            <div className="flex gap-1 mt-1 flex-wrap justify-center">
                                                {events.map((evt, i) => (
                                                    <div
                                                        key={i}
                                                        className={`w-1.5 h-1.5 rounded-full ${evt.status === 'Critical' ? 'bg-red-500' :
                                                            evt.status === 'Risk' ? 'bg-yellow-500' : 'bg-emerald-500'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Selected Date Details */}
                            {selectedDate && (
                                <div className="mt-4 pt-4 border-t border-slate-700/50 animate-fade-in-up">
                                    <h4 className="text-sm font-semibold text-brand-orange mb-2">
                                        Events for {format(selectedDate, 'MMM d')}
                                    </h4>
                                    {getEventsForDay(selectedDate).length > 0 ? (
                                        <div className="space-y-2">
                                            {getEventsForDay(selectedDate).map((evt, i) => (
                                                <div key={i} className="text-xs bg-slate-800/50 p-2 rounded flex justify-between items-center">
                                                    <span className="text-white">{evt.system}</span>
                                                    <span className={`${evt.status === 'Critical' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {evt.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">No failures predicted.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </motion.div>
        </div>
    );
};

export default MaintenanceAnalytics;
