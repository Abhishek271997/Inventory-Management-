import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';

const PurchaseOrders = () => {
    const { apiCall, user } = useAuth();
    const [pos, setPOs] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [showNewPO, setShowNewPO] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchPOs = async () => {
        try {
            const res = await apiCall('/api/purchase-orders');
            const data = await res.json();
            if (data.data) setPOs(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchLowStock = async () => {
        try {
            const res = await apiCall('/api/inventory/low-stock');
            const data = await res.json();
            if (data.data) setLowStockItems(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPOs();
        fetchLowStock();
    }, []);

    const handleAutoReorder = async () => {
        if (!confirm('Generate purchase orders for all low stock items?')) return;
        setLoading(true);
        try {
            const res = await apiCall('/api/automation/trigger-reorder', {
                method: 'POST'
            });
            const data = await res.json();
            alert(data.message);
            fetchPOs();
            fetchLowStock();
        } catch (err) {
            alert('Failed to generate purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const handleReceivePO = async (poId) => {
        if (!confirm('Mark this PO as received and update inventory?')) return;
        try {
            const res = await apiCall(`/api/purchase-orders/${poId}/receive`, {
                method: 'POST'
            });
            const data = await res.json();
            alert(data.message);
            fetchPOs();
        } catch (err) {
            alert('Failed to receive PO');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            'Draft': { color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', icon: Clock },
            'Sent': { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Truck },
            'Received': { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle },
            'Cancelled': { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: XCircle }
        };
        const badge = badges[status] || badges['Draft'];
        const Icon = badge.icon;
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${badge.color}`}>
                <Icon size={14} />
                {status}
            </span>
        );
    };

    return (
        <div className="p-6 bg-ocean-dark min-h-screen text-slate-200 pl-80">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-brand-orange">Purchase Orders</h1>

                <div className="flex gap-4">
                    {lowStockItems.length > 0 && (
                        <button
                            onClick={handleAutoReorder}
                            disabled={loading}
                            className="px-4 py-2 bg-brand-orange text-black font-bold rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
                        >
                            <Package size={18} />
                            Auto-Generate POs ({lowStockItems.length} items)
                        </button>
                    )}
                    <button
                        onClick={() => setShowNewPO(true)}
                        className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                    >
                        <Plus size={18} />
                        New PO
                    </button>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                    <h3 className="text-red-400 font-bold mb-2">⚠️ {lowStockItems.length} Items Need Reordering</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {lowStockItems.slice(0, 8).map(item => (
                            <div key={item.id} className="text-slate-300">
                                {item.product_name} (Qty: {item.qty})
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PO Table */}
            <div className="overflow-x-auto bg-ocean-light rounded-lg shadow-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800">
                        <tr className="text-slate-400 uppercase">
                            <th className="px-4 py-3">PO Number</th>
                            <th className="px-4 py-3">Supplier</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Order Date</th>
                            <th className="px-4 py-3">Items</th>
                            <th className="px-4 py-3">Total Cost</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {pos.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center text-slate-500 italic">
                                    No purchase orders found.
                                </td>
                            </tr>
                        ) : (
                            pos.map(po => (
                                <tr key={po.id} className="hover:bg-slate-700/50 transition">
                                    <td className="px-4 py-4 font-bold text-brand-orange">{po.po_number}</td>
                                    <td className="px-4 py-4 text-white">{po.supplier_name || 'Unknown'}</td>
                                    <td className="px-4 py-4">{getStatusBadge(po.status)}</td>
                                    <td className="px-4 py-4 text-slate-300">
                                        {new Date(po.order_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-4 text-slate-300">{po.item_count || 0}</td>
                                    <td className="px-4 py-4 text-slate-300">
                                        ${(po.total_cost || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4">
                                        {po.status === 'Draft' && (
                                            <button
                                                onClick={() => handleReceivePO(po.id)}
                                                className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded hover:bg-green-500/30 transition text-xs font-bold"
                                            >
                                                Receive
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PurchaseOrders;
