import React, { useEffect, useState, useMemo } from 'react';
import { Trash2, Edit2, X, Calendar, Filter as FilterIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { equipmentData } from '../data/equipmentData';
import { exportToCSV } from '../utils/exportUtils';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const MaintenanceLogs = ({ initialParams = {}, setView }) => {
    const { user, apiCall } = useAuth();
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [inventory, setInventory] = useState([]);

    // Edit State
    const [editingLog, setEditingLog] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Column filters
    const [filters, setFilters] = useState({
        engineer: '',
        area: '',
        system: '',
        component: '',
        action: '',
        work_status: ''
    });


    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;
    const [showDateFilter, setShowDateFilter] = useState(false);

    // Initialize filters from Props
    useEffect(() => {
        const { search, action, system, area } = initialParams;

        if (search) setSearchTerm(search);

        if (action || system || area) {
            setFilters(prev => ({
                ...prev,
                action: action || prev.action,
                system: system || prev.system,
                area: area || prev.area
            }));
        }
    }, [initialParams]);

    // Dropdown Data
    const engineers = [
        "Andris Gerins", "Mathews Lawrence", "Mykhailo Baranov",
        "Samuel Martin", "Stepan Chividzhiyan", "Volodymyr Kalianov"
    ];

    const fetchLogs = async () => {
        try {
            const res = await apiCall('/api/logs');
            const data = await res.json();
            if (data.data) {
                // Sort by date_of_work descending
                const sortedLogs = data.data.sort((a, b) => {
                    const dateA = new Date(a.date_of_work || a.timestamp);
                    const dateB = new Date(b.date_of_work || b.timestamp);
                    return dateB - dateA;
                });
                setLogs(sortedLogs);
            }
        } catch (err) {
            console.error("Failed to fetch logs", err);
        }
    };

    const fetchInventory = async () => {
        try {
            const res = await apiCall('/api/inventory');
            const data = await res.json();
            if (data.data) setInventory(data.data);
        } catch (err) {
            console.error(err);
        }
    }

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this log?")) return;
        try {
            await apiCall(`/api/logs/${id}`, { method: 'DELETE' });
            fetchLogs();
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (log) => {
        setEditingLog(log);
        setEditForm({ ...log });
    };

    const handleUpdateLog = async () => {
        try {
            const res = await apiCall(`/api/logs/${editingLog.id}`, {
                method: 'PUT',
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                setEditingLog(null);
                fetchLogs();
            } else {
                alert("Failed to update log.");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating log.");
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchInventory();
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, []);

    // Format date and time
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get unique values for each filter column
    const uniqueValues = useMemo(() => {
        return {
            engineers: [...new Set(logs.map(log => log.engineer).filter(Boolean))].sort(),
            areas: [...new Set(logs.map(log => log.area).filter(Boolean))].sort(),
            systems: [...new Set(logs.map(log => log.system).filter(Boolean))].sort(),
            components: [...new Set(logs.map(log => log.component).filter(Boolean))].sort(),
            actions: [...new Set(logs.map(log => log.action).filter(Boolean))].sort(),
            statuses: [...new Set(logs.map(log => log.work_status).filter(Boolean))].sort()
        };
    }, [logs]);

    // Filter logs based on search and column filters
    const filteredLogs = logs.filter(log => {
        // Search filter
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || (
            log.engineer?.toLowerCase().includes(searchLower) ||
            log.area?.toLowerCase().includes(searchLower) ||
            log.system?.toLowerCase().includes(searchLower) ||
            log.component?.toLowerCase().includes(searchLower) ||
            log.action?.toLowerCase().includes(searchLower) ||
            log.work_status?.toLowerCase().includes(searchLower)
        );

        // Date Range Filter Logic
        let matchesDate = true;
        if (startDate && endDate) {
            const logDate = new Date(log.date_of_work || log.timestamp);
            // set times to compare dates only
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            matchesDate = logDate >= start && logDate <= end;
        } else if (startDate) {
            const logDate = new Date(log.date_of_work || log.timestamp);
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            matchesDate = logDate >= start;
        }

        // Column filters
        const matchesFilters = (
            matchesDate &&
            (!filters.engineer || log.engineer === filters.engineer) &&
            (!filters.area || log.area === filters.area) &&
            (!filters.system || log.system === filters.system) &&
            (!filters.component || log.component === filters.component) &&
            (!filters.action || log.action === filters.action) &&
            (!filters.work_status || log.work_status === filters.work_status)
        );

        return matchesSearch && matchesFilters;
    });

    const handleFilterChange = (column, value) => {
        setFilters(prev => ({ ...prev, [column]: value }));
    };

    const clearAllFilters = () => {
        setFilters({
            engineer: '',
            area: '',
            system: '',
            component: '',
            action: '',
            work_status: ''
        });
        setDateRange([null, null]);
        setSearchTerm('');
    };

    // Helpers for Edit Form
    const getSystems = () => {
        if (!editForm.area) return [];
        return Object.keys(equipmentData[editForm.area] || {});
    };

    const getComponents = () => {
        if (!editForm.area || !editForm.system) return [];
        return equipmentData[editForm.area]?.[editForm.system] || [];
    };

    const activeFiltersCount = Object.values(filters).filter(v => v !== '').length + (startDate ? 1 : 0) + (searchTerm ? 1 : 0);

    return (
        <div className="p-4 md:p-6 bg-ocean-dark min-h-screen text-slate-200 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-brand-orange">Maintenance Logs</h1>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="bg-slate-800 border border-slate-600 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none focus:border-brand-orange w-64 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Date Filter Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDateFilter(!showDateFilter)}
                            className={`p-2 rounded-full border transition ${startDate ? 'bg-brand-orange text-white border-brand-orange' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                            title="Filter by Date Range"
                        >
                            <Calendar size={20} />
                        </button>
                        {showDateFilter && (
                            <div className="absolute top-12 right-0 z-50 bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-2xl w-64">
                                <h3 className="text-white font-bold mb-2">Select Date Range</h3>
                                <DatePicker
                                    selectsRange={true}
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={(update) => {
                                        setDateRange(update);
                                    }}
                                    isClearable={true}
                                    inline
                                />
                                <div className="mt-2 flex justify-end">
                                    <button
                                        onClick={() => setShowDateFilter(false)}
                                        className="text-xs text-slate-400 hover:text-white"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clear Filters Button */}
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-full hover:bg-red-500/30 transition text-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear Filters ({activeFiltersCount})
                        </button>
                    )}

                    <button
                        onClick={() => exportToCSV(filteredLogs, 'maintenance_logs')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 text-slate-300 transition text-sm ml-2"
                        title="Export Filtered Logs to CSV"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        <span>Export</span>
                    </button>

                    {/* Total Count */}
                    <div className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-full text-sm">
                        <span className="text-slate-400">Total: </span>
                        <span className="text-brand-orange font-bold">{filteredLogs.length}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-ocean-light rounded-lg shadow-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800">
                        {/* Column Headers */}
                        <tr className="text-slate-400 uppercase">
                            <th className="px-4 py-3">Date & Time</th>
                            <th className="px-4 py-3">Engineer</th>
                            <th className="px-4 py-3">Area</th>
                            <th className="px-4 py-3">System</th>
                            <th className="px-4 py-3">Component</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Duration</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Remarks</th>
                            {user?.role === 'admin' && <th className="px-4 py-3 text-center">Actions</th>}
                        </tr>
                        {/* Filter Row */}
                        <tr className="border-t border-slate-700">
                            <th className="px-4 py-2">
                                {/* Date filter moved to header icon */}
                            </th>
                            <th className="px-4 py-2">
                                <select
                                    value={filters.engineer}
                                    onChange={(e) => handleFilterChange('engineer', e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-orange"
                                >
                                    <option value="">All</option>
                                    {uniqueValues.engineers.map(engineer => (
                                        <option key={engineer} value={engineer}>{engineer}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-4 py-2">
                                <select
                                    value={filters.area}
                                    onChange={(e) => handleFilterChange('area', e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-orange"
                                >
                                    <option value="">All</option>
                                    {uniqueValues.areas.map(area => (
                                        <option key={area} value={area}>{area}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-4 py-2">
                                <select
                                    value={filters.system}
                                    onChange={(e) => handleFilterChange('system', e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-orange"
                                >
                                    <option value="">All</option>
                                    {uniqueValues.systems.map(system => (
                                        <option key={system} value={system}>{system}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-4 py-2">
                                <select
                                    value={filters.component}
                                    onChange={(e) => handleFilterChange('component', e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-orange"
                                >
                                    <option value="">All</option>
                                    {uniqueValues.components.map(component => (
                                        <option key={component} value={component}>{component}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-4 py-2">
                                <select
                                    value={filters.action}
                                    onChange={(e) => handleFilterChange('action', e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-orange"
                                >
                                    <option value="">All</option>
                                    {uniqueValues.actions.map(action => (
                                        <option key={action} value={action}>{action}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-4 py-2">
                                {/* No filter for duration */}
                            </th>
                            <th className="px-4 py-2">
                                <select
                                    value={filters.work_status}
                                    onChange={(e) => handleFilterChange('work_status', e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-orange"
                                >
                                    <option value="">All</option>
                                    {uniqueValues.statuses.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-4 py-2">
                                {/* No filter for remarks */}
                            </th>
                            {user?.role === 'admin' && <th className="px-4 py-2"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="px-6 py-8 text-center text-slate-500 italic">
                                    No maintenance logs found.
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-700/50 transition">
                                    <td className="px-4 py-4 text-slate-300 whitespace-nowrap">
                                        {formatDateTime(log.date_of_work || log.timestamp)}
                                    </td>
                                    <td className="px-4 py-4 font-medium text-white">
                                        {log.engineer || 'N/A'}
                                    </td>
                                    <td className="px-4 py-4 text-slate-300">
                                        {log.area || 'N/A'}
                                    </td>
                                    <td className="px-4 py-4 text-slate-300">
                                        {log.system || 'N/A'}
                                    </td>
                                    <td className="px-4 py-4 text-slate-300">
                                        {log.component || 'N/A'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.action === 'Replaced' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                                            log.action === 'Inspected' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' :
                                                log.action === 'Cleaned' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                                                    log.action === 'Tightened' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                                        'bg-slate-500/20 text-slate-400 border border-slate-500/50'
                                            } `}>
                                            {log.action || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-slate-300">
                                        {log.duration ? `${log.duration} min` : 'N/A'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.work_status === 'Completed' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                                            log.work_status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                                log.work_status === 'Waiting for Parts' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                                                    'bg-slate-500/20 text-slate-400 border border-slate-500/50'
                                            } `}>
                                            {log.work_status || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-slate-300 max-w-xs truncate" title={log.remarks}>
                                        {log.remarks || '-'}
                                    </td>
                                    {user?.role === 'admin' && (
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => handleEdit(log)}
                                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                                                    title="Edit Log"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(log.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                                    title="Delete Log"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">Edit Log</h2>
                            <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Engineer */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Engineer</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                    value={editForm.engineer || ''}
                                    onChange={e => setEditForm({ ...editForm, engineer: e.target.value })}
                                >
                                    {engineers.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>

                            {/* Area & System & Component */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Area</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        value={editForm.area || ''}
                                        onChange={e => setEditForm({ ...editForm, area: e.target.value, system: '', component: '' })}
                                    >
                                        <option value="">Select Area</option>
                                        {Object.keys(equipmentData).map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">System</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        value={editForm.system || ''}
                                        onChange={e => setEditForm({ ...editForm, system: e.target.value, component: '' })}
                                        disabled={!editForm.area}
                                    >
                                        <option value="">Select System</option>
                                        {getSystems().map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Component</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        value={editForm.component || ''}
                                        onChange={e => setEditForm({ ...editForm, component: e.target.value })}
                                        disabled={!editForm.system}
                                    >
                                        <option value="">Select Component</option>
                                        {getComponents().map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Action */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Action</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['Inspected', 'Replaced', 'Cleaned', 'Tightened'].map(act => (
                                        <button
                                            key={act}
                                            onClick={() => setEditForm({ ...editForm, action: act })}
                                            className={`p-2 text-sm rounded border ${editForm.action === act
                                                ? 'bg-brand-orange text-black border-brand-orange font-bold'
                                                : 'bg-transparent text-slate-400 border-slate-700'}`}
                                        >
                                            {act}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Status</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                    value={editForm.work_status || ''}
                                    onChange={e => setEditForm({ ...editForm, work_status: e.target.value })}
                                >
                                    {['Pending', 'Completed', 'Waiting for Parts'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Duration (min)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                    value={editForm.duration || ''}
                                    onChange={e => setEditForm({ ...editForm, duration: e.target.value })}
                                />
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Remarks</label>
                                <textarea
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white min-h-[100px]"
                                    value={editForm.remarks || ''}
                                    onChange={e => setEditForm({ ...editForm, remarks: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleUpdateLog}
                                className="w-full bg-brand-orange text-black font-bold py-3 rounded hover:bg-orange-600 transition"
                            >
                                Update Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceLogs;
