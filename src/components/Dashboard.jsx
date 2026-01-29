import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, AlertTriangle, Package, Layers, MapPin, Edit2, Trash2, X, Save, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import QRCodeModal from './QRCodeModal';
import QRScanner from './QRScanner';
import { exportToCSV } from '../utils/exportUtils';

const Dashboard = ({ setView }) => {
    const { user, token, apiCall } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStock, setShowLowStock] = useState(false);
    const [showReorder, setShowReorder] = useState(false);
    const [showHealthy, setShowHealthy] = useState(false);
    const [lowStockAlert, setLowStockAlert] = useState({ show: false, message: '' });
    const [recentActivitiesCount, setRecentActivitiesCount] = useState(0);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState({
        id: null,
        product_name: '',
        nav_number: '',
        qty: '',
        min_qty: 1,
        location_area: '',
        location: '',
        sub_location: ''
    });

    // Generic Scanner State
    const [showScanner, setShowScanner] = useState(false);

    // QR Code Modal State
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrCodeData, setQRCodeData] = useState(null);

    const fetchInventory = async () => {
        try {
            const res = await apiCall('/api/inventory');
            const data = await res.json();
            if (data.data) {
                setInventory(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch inventory", err);
        }
    };

    const handleScanResult = (data) => {
        if (data.item) {
            // Item exists -> Update
            setCurrentItem(data.item);
            setIsEditing(true);
            setShowModal(true);
            setShowScanner(false);
        } else {
            // Item likely undefined or just text. 
            // If we have text, try to prepopulate Add Form
            if (data.text) {
                // Try to parse if it is JSON
                try {
                    const parsed = JSON.parse(data.text);
                    setCurrentItem({
                        ...currentItem, // keep defaults
                        product_name: parsed.product_name || '',
                        nav_number: parsed.nav_number || '',
                        location_area: parsed.location_area || '',
                        location: parsed.location || '',
                        id: null
                    });
                } catch (e) {
                    // Not JSON, use as product name?
                    setCurrentItem({ ...currentItem, product_name: data.text });
                }
            }
            // Open "Add New" Modal
            setIsEditing(false);
            setShowModal(true);
            setShowScanner(false);
        }
    };

    const fetchRecentActivities = async () => {
        try {
            // Fetch maintenance logs from last 7 days
            const res = await apiCall('/api/logs');
            const data = await res.json();
            if (data.data) {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const recentLogs = data.data.filter(log => new Date(log.date_of_work || log.timestamp) >= sevenDaysAgo);
                setRecentActivitiesCount(recentLogs.length);
            }
        } catch (err) {
            console.error("Failed to fetch activities", err);
        }
    };

    useEffect(() => {
        if (token) {
            fetchInventory();
            fetchRecentActivities();
        }
        const interval = setInterval(() => {
            if (token) {
                fetchInventory();
                fetchRecentActivities();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [token]);

    // Check for low stock and trigger alert
    useEffect(() => {
        const lowStockItems = inventory.filter(item => item.qty <= item.min_qty);
        if (lowStockItems.length > 0) {
            setLowStockAlert({
                show: true,
                message: `Warning: ${lowStockItems.length} item(s) are low on stock!`
            });

            const timer = setTimeout(() => {
                setLowStockAlert(prev => ({ ...prev, show: false }));
            }, 60000);

            return () => clearTimeout(timer);
        }
    }, [inventory]);

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            await apiCall(`/api/inventory/${id}`, { method: 'DELETE' });
            fetchInventory();
        } catch (err) {
            console.error(err);
        }
    };

    const handleViewQR = async (item) => {
        try {
            const res = await apiCall(`/api/inventory/${item.id}/qrcode`);
            const data = await res.json();
            setQRCodeData({ ...data, product_name: item.product_name });
            setShowQRModal(true);
        } catch (err) {
            console.error('Failed to generate QR code:', err);
        }
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        const url = isEditing
            ? `/api/inventory/${currentItem.id}`
            : '/api/inventory';

        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await apiCall(url, {
                method: method,
                // headers: { 'Content-Type': 'application/json' }, // apiCall adds Content-Type
                body: JSON.stringify(currentItem)
            });
            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchInventory();
            } else {
                alert("Failed to save item");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEditClick = (item) => {
        setIsEditing(true);
        setCurrentItem(item);
        setShowModal(true);
    };

    const handleAddClick = () => {
        setIsEditing(false);
        resetForm();
        setShowModal(true);
    };

    const resetForm = () => {
        setCurrentItem({
            id: null,
            product_name: '',
            nav_number: '',
            qty: '',
            min_qty: 1,
            location_area: '',
            location: '',
            sub_location: ''
        });
    };

    const handleStockAdjust = async (item, adjustment) => {
        const newQty = item.qty + adjustment;
        if (newQty < 0) return;

        try {
            const res = await apiCall(`/api/inventory/${item.id}`, {
                method: 'PUT',
                // headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...item, qty: newQty })
            });
            if (res.ok) {
                // Optimistic update
                setInventory(prev => prev.map(i => i.id === item.id ? { ...i, qty: newQty } : i));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const resetFilters = () => {
        setSearchTerm('');
        setShowLowStock(false);
        setShowReorder(false);
        setShowHealthy(false);
    };

    // Filter Logic
    const filteredInventory = inventory.filter(item => {
        const name = item.product_name || '';
        const nav = item.nav_number || '';
        const loc = item.location || '';
        const searchLower = searchTerm.toLowerCase();

        const matchesSearch = name.toLowerCase().includes(searchLower) ||
            nav.toLowerCase().includes(searchLower) ||
            loc.toLowerCase().includes(searchLower);

        let matchesStatus = true;
        if (showLowStock) {
            matchesStatus = item.qty <= item.min_qty;
        } else if (showReorder) {
            matchesStatus = item.qty <= (item.reorder_point || item.min_qty);
        } else if (showHealthy) {
            matchesStatus = item.qty > item.min_qty;
        }

        return matchesSearch && matchesStatus;
    });

    console.log("DEBUG: Inventory State:", inventory);
    console.log("DEBUG: Filtered Inventory:", filteredInventory);

    // Stats
    const totalItems = inventory.length;
    const lowStockCount = inventory.filter(i => i.qty <= i.min_qty).length;
    const totalValuation = inventory.reduce((acc, curr) => acc + curr.qty, 0); // Just sum of qty for now

    // New metrics
    const itemsNeedingReorder = inventory.filter(i => i.qty <= (i.reorder_point || i.min_qty)).length;
    const wellStockedItems = inventory.filter(i => i.qty > i.min_qty).length;
    const stockHealthPercentage = totalItems > 0 ? Math.round((wellStockedItems / totalItems) * 100) : 0;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="p-4 md:p-8 w-full min-h-screen relative">

            {/* Top Bar */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Overview</h1>
                    <p className="text-slate-400 mt-1">Manage your inventory and stock levels</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search with Scan */}
                    <div className="relative group flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-slate-500 group-focus-within:text-brand-orange transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                className="bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 pl-10 pr-4 text-white w-64 glass-input focus:w-80 transition-all duration-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setShowScanner(true)}
                            className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 hover:bg-brand-orange hover:text-white transition group"
                            title="Scan to Search"
                        >
                            <QrCode size={20} />
                        </button>
                    </div>

                    {user?.role === 'admin' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleAddClick}
                            className="bg-gradient-to-r from-brand-orange to-orange-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2"
                        >
                            <Plus size={20} />
                            <span>Add Item</span>
                        </motion.button>
                    )}
                </div>
            </header>

            {/* Scanner Modal */}
            <AnimatePresence>
                {showScanner && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="relative w-full max-w-md">
                            <button
                                onClick={() => setShowScanner(false)}
                                className="absolute -top-10 right-0 text-white hover:text-brand-orange"
                            >
                                <X size={32} />
                            </button>
                            <QRScanner
                                token={user.token}
                                onScan={handleScanResult}
                                onClose={() => setShowScanner(false)}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
                <StatCard
                    title="Total Products"
                    value={totalItems}
                    icon={Package}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                    onClick={resetFilters}
                />
                <StatCard
                    title="Low Stock Alerts"
                    value={lowStockCount}
                    icon={AlertTriangle}
                    color="text-red-400"
                    bg="bg-red-500/10"
                    alert={lowStockCount > 0}
                    onClick={() => { resetFilters(); setShowLowStock(true); }}
                />
                <StatCard
                    title="Items Needing Reorder"
                    value={itemsNeedingReorder}
                    icon={Layers}
                    color="text-orange-400"
                    bg="bg-orange-500/10"
                    onClick={() => { resetFilters(); setShowReorder(true); }}
                />
                <StatCard
                    title="Recent Activities"
                    value={recentActivitiesCount}
                    subtitle="Last 7 days"
                    icon={Package}
                    color="text-purple-400"
                    bg="bg-purple-500/10"
                    onClick={() => setView && setView('logs')}
                />
                <StatCard
                    title="Stock Health"
                    value={`${stockHealthPercentage}%`}
                    subtitle="Well-stocked items"
                    icon={Package}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                    onClick={() => { resetFilters(); setShowHealthy(true); }}
                />
            </div>

            {/* Controls Row */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Layers size={20} className="text-brand-orange" />
                    Inventory List
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => exportToCSV(filteredInventory, 'inventory_export')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700/50 hover:text-white transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        <span className="text-sm font-medium">Export CSV</span>
                    </button>
                    <button
                        onClick={() => {
                            const wasOn = showLowStock;
                            resetFilters();
                            if (!wasOn) setShowLowStock(true);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${showLowStock ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50'}`}
                    >
                        <Filter size={16} />
                        <span className="text-sm font-medium">Low Stock Only</span>
                    </button>
                </div>
            </div>

            {/* Debug & Status Bar */}
            <div className="flex justify-between items-center bg-slate-800 p-3 rounded-t-xl border border-slate-700 border-b-0">
                <span className="text-slate-400 text-xs font-mono">
                    STATUS: {filteredInventory.length} visible / {inventory.length} total
                    {(searchTerm || showLowStock || showReorder || showHealthy) && (
                        <button
                            onClick={resetFilters}
                            className="ml-4 text-brand-orange hover:underline cursor-pointer"
                        >
                            (Clear Filters)
                        </button>
                    )}
                </span>
            </div>

            {/* Simplified Table Container */}
            <div className="bg-slate-900 rounded-b-xl border border-slate-700 p-4 border-t-0">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 uppercase font-bold">
                        <tr>
                            <th className="px-4 py-3">Product Name</th>
                            <th className="px-4 py-3">Nav Number</th>
                            <th className="px-4 py-3">Quantity</th>
                            <th className="px-4 py-3">Area</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Sub-Location</th>
                            <th className="px-4 py-3">Min Qty</th>
                            {user?.role === 'admin' && <th className="px-4 py-3 text-center">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredInventory.length === 0 ? (
                            <tr>
                                <td colSpan={user?.role === 'admin' ? "8" : "7"} className="px-4 py-8 text-center text-slate-500">
                                    No items found. (Inventory count: {inventory.length})
                                </td>
                            </tr>
                        ) : (
                            filteredInventory.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-800">
                                    <td className="px-4 py-3 font-medium text-white">{item.product_name}</td>
                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.nav_number || '-'}</td>
                                    <td className="px-4 py-3 font-mono">
                                        <span className={item.qty <= item.min_qty ? "text-red-400 font-bold" : ""}>
                                            {item.qty}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{item.location_area}</td>
                                    <td className="px-4 py-3">{item.location}</td>
                                    <td className="px-4 py-3">{item.sub_location}</td>
                                    <td className="px-4 py-3">{item.min_qty}</td>
                                    {user?.role === 'admin' && (
                                        <td className="px-4 py-3 text-center flex justify-center gap-2">
                                            <button
                                                onClick={() => handleViewQR(item)}
                                                className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded"
                                                title="QR Code"
                                            >
                                                <QrCode size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEditClick(item)}
                                                className="p-1.5 text-brand-orange hover:bg-orange-500/10 rounded"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Low Stock Toast */}
            <AnimatePresence>
                {lowStockAlert.show && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        className="fixed top-6 left-1/2 z-50"
                    >
                        <div className="bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-red-400/50 backdrop-blur-md">
                            <AlertTriangle size={24} className="animate-pulse" />
                            <div>
                                <h3 className="font-bold text-sm">Action Required</h3>
                                <p className="text-xs opacity-90">{lowStockAlert.message}</p>
                            </div>
                            <button onClick={() => setLowStockAlert({ ...lowStockAlert, show: false })} className="ml-2 opacity-70 hover:opacity-100">
                                <X size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="glass-panel w-full max-w-lg p-8 rounded-2xl relative z-10 shadow-2xl border border-white/10"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    {isEditing ? <Edit2 className="text-brand-orange" /> : <Plus className="text-brand-orange" />}
                                    {isEditing ? 'Edit Item' : 'New Inventory Item'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveItem} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Product Name</label>
                                    <input
                                        type="text"
                                        className="w-full glass-input rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-orange/50"
                                        required
                                        value={currentItem.product_name}
                                        onChange={e => setCurrentItem({ ...currentItem, product_name: e.target.value })}
                                        placeholder="e.g. Servo Motor X-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Nav Number</label>
                                    <input
                                        type="text"
                                        className="w-full glass-input rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-orange/50"
                                        value={currentItem.nav_number || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, nav_number: e.target.value })}
                                        placeholder="e.g. NAV-1001"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Quantity</label>
                                        <input
                                            type="number"
                                            className="w-full glass-input rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-orange/50"
                                            required
                                            min="0"
                                            value={currentItem.qty}
                                            onChange={e => setCurrentItem({ ...currentItem, qty: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Min Level</label>
                                        <input
                                            type="number"
                                            className="w-full glass-input rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-orange/50"
                                            required
                                            min="1"
                                            value={currentItem.min_qty}
                                            onChange={e => setCurrentItem({ ...currentItem, min_qty: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Area</label>
                                        <input
                                            type="text"
                                            className="w-full glass-input rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-orange/50"
                                            value={currentItem.location_area}
                                            onChange={e => setCurrentItem({ ...currentItem, location_area: e.target.value })}
                                            placeholder="e.g. Warehouse A"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Location</label>
                                        <input
                                            type="text"
                                            className="w-full glass-input rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-orange/50"
                                            value={currentItem.location}
                                            onChange={e => setCurrentItem({ ...currentItem, location: e.target.value })}
                                            placeholder="e.g. Rack C-4"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Sub-Location</label>
                                    <input
                                        type="text"
                                        className="w-full glass-input rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-orange/50"
                                        value={currentItem.sub_location || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, sub_location: e.target.value })}
                                        placeholder="e.g. Bin 3"
                                    />
                                </div>

                                <div className="pt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-5 py-2.5 text-slate-400 hover:text-white transition font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-brand-orange hover:bg-orange-600 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <Save size={18} />
                                        {isEditing ? 'Update Changes' : 'Save Item'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QR Code Modal */}
            {showQRModal && (
                <QRCodeModal
                    qrCodeData={qrCodeData}
                    onClose={() => setShowQRModal(false)}
                />
            )}
        </div>
    );
};

// StatCard Component
const StatCard = ({ title, value, icon: Icon, color, bg, alert = false, subtitle, onClick }) => (
    <motion.div
        whileHover={{ y: -5 }}
        onClick={onClick}
        className={`glass-panel p-8 rounded-2xl border-t border-white/10 relative overflow-hidden ${alert ? 'ring-2 ring-red-500/50' : ''} ${onClick ? 'cursor-pointer hover:bg-white/5 active:scale-95 transition-all' : ''}`}
    >
        <div className="flex justify-between items-start z-10 relative">
            <div>
                <p className="text-slate-400 text-base font-medium uppercase tracking-wider">{title}</p>
                <h3 className="text-5xl font-bold text-white mt-3">{value}</h3>
                {subtitle && (
                    <p className="text-slate-500 text-sm mt-2">{subtitle}</p>
                )}
            </div>
            <div className={`p-4 rounded-xl ${bg} ${color}`}>
                <Icon size={32} />
            </div>
        </div>
        {/* Background Glow */}
        <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full ${bg} opacity-50 blur-2xl pointer-events-none`} />
    </motion.div>
);

export default Dashboard;
