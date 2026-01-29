import React, { useState, useEffect } from 'react';
import { equipmentData } from '../data/equipmentData';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import VoiceInput from './VoiceInput';
import QRScanner from './QRScanner';
import { QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MaintenanceForm = () => {
    const { user, apiCall } = useAuth();

    // Dropdown Data
    const engineers = [
        "Andris Gerins",
        "Mathews Lawrence",
        "Mykhailo Baranov",
        "Samuel Martin",
        "Stepan Chividzhiyan",
        "Volodymyr Kalianov"
    ];
    const areas = Object.keys(equipmentData);


    const [inventory, setInventory] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().slice(0, 16), // yyyy-mm-ddThh:mm
        engineer: '',
        area: '',
        system: '',
        component: '',
        spare_part_used: '', // New field
        action: '', // Buttons: Inspected, Replaced...
        job_type: '', // Repair, Inspection, Cleaning
        quantity: 1,
        duration: '',
        work_status: '', // Pending, Completed, Waiting
        remarks: ''
    });

    // Search Dropdown State
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredItems, setFilteredItems] = useState([]);

    const [status, setStatus] = useState('');
    const [inventoryError, setInventoryError] = useState(''); // New error state
    const [showQRScanner, setShowQRScanner] = useState(false);

    useEffect(() => {
        // Fetch inventory for Spare Parts dropdown
        const fetchInventory = async () => {
            console.log("Debug: Fetching inventory...");

            try {
                // Use apiCall wrapper from AuthContext (handles headers automatically)
                const res = await apiCall('/api/inventory');

                console.log("Debug: Inventory API status:", res.status);

                if (!res.ok) {
                    const errText = await res.text();
                    console.error("Debug: Inventory fetch failed:", errText);
                    throw new Error(`Failed to fetch inventory: ${res.status}`);
                }

                const data = await res.json();
                console.log("Debug: Inventory data received:", data.data?.length || 0, "items");

                if (data.data) {
                    setInventory(data.data);
                    setInventoryError(''); // Clear any previous errors
                    if (data.data.length === 0) setInventoryError('No items in inventory');
                } else {
                    setInventoryError('Invalid data format');
                }
            } catch (err) {
                console.error("Failed to load inventory", err);
                setInventoryError(`Failed to load inventory: ${err.message}`);
            }
        };
        fetchInventory();
    }, [apiCall]);

    // Handle Search
    useEffect(() => {
        if (!inventory) return;
        if (!searchQuery) {
            setFilteredItems(inventory.slice(0, 50)); // Show max 50 initially
        } else {
            const lower = searchQuery.toLowerCase();
            const filtered = inventory.filter(item =>
                (item.product_name && item.product_name.toLowerCase().includes(lower)) ||
                (item.nav_number && item.nav_number.toLowerCase().includes(lower))
            );
            setFilteredItems(filtered.slice(0, 50)); // Limit to 50 results
        }
    }, [searchQuery, inventory]);

    const handleSelectPart = (item) => {
        setFormData({ ...formData, spare_part_used: `${item.product_name} : (${item.qty})` });
        setSearchQuery(item.product_name);
        setShowDropdown(false);
    };

    const handleAreaChange = (e) => {
        setFormData({ ...formData, area: e.target.value, system: '', component: '' });
    };

    const handleSystemChange = (e) => {
        setFormData({ ...formData, system: e.target.value, component: '' });
    };

    // Helper to get systems based on selected area
    const getSystems = () => {
        if (!formData.area) return [];
        return Object.keys(equipmentData[formData.area] || {});
    };

    // Helper to get components based on selected area and system
    const getComponents = () => {
        if (!formData.area || !formData.system) return [];
        return equipmentData[formData.area][formData.system] || [];
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.engineer || !formData.action) {
            alert("Please fill in Engineer and select an Action.");
            return;
        }

        // If Replaced, Spare Part is mandatory? Maybe not, but good practice.
        if (formData.action === 'Replaced' && !formData.spare_part_used) {
            if (!confirm("You selected 'Replaced' but didn't select a spare part. Continue?")) return;
        }

        try {
            const res = await apiCall('/api/maintenance', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (res.ok) {
                setStatus('Success! Log Saved.');
                setFormData({
                    ...formData,
                    system: '',
                    component: '',
                    remarks: '',
                    spare_part_used: '',
                    action: '',
                    quantity: 1
                });
                setTimeout(() => setStatus(''), 3000);
            } else {
                alert("Error: " + data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Network Error: Could not save log.");
        }
    };

    return (
        <div className="p-4 bg-slate-900 min-h-screen flex justify-center items-center font-sans">
            <div className="w-full max-w-2xl bg-gray-900 rounded-lg p-6 shadow-2xl border border-gray-700 text-gray-300">

                {/* Header */}
                <div className="flex items-center mb-6 border-b border-gray-700 pb-2">
                    <span className="text-xl font-semibold text-gray-100">Maintenance Record</span>
                </div>

                <div className="space-y-4 border border-gray-700 p-4 rounded-lg relative">
                    <span className="absolute -top-3 left-3 bg-gray-900 px-2 text-sm text-gray-400">Maintenance log</span>

                    {/* Date & Time */}
                    {/* Date & Time */}
                    <div className="custom-datepicker-wrapper relative">
                        <label className="text-xs text-gray-500 mb-1 block">Date & Time of Work</label>
                        <DatePicker
                            selected={formData.date ? new Date(formData.date) : new Date()}
                            onChange={(date) => setFormData({ ...formData, date: date.toISOString() })}
                            showTimeSelect
                            dateFormat="dd/MM/yyyy HH:mm"
                            timeFormat="HH:mm"
                            timeIntervals={1}
                            className="w-full bg-transparent border border-gray-600 rounded p-2 text-white text-sm focus:border-brand-orange outline-none pr-10" // Added pr-10 for icon space
                            calendarClassName="bg-gray-800 text-white border-gray-700"
                            dayClassName={() => "text-white hover:bg-brand-orange hover:text-black"}
                        />
                        {/* Calendar Icon */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="absolute right-3 bottom-2.5 w-5 h-5 text-gray-400 pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>

                    {/* Engineer */}
                    <select
                        className="w-full bg-transparent border border-gray-600 rounded p-2 text-white text-sm outline-none"
                        value={formData.engineer}
                        onChange={e => setFormData({ ...formData, engineer: e.target.value })}
                    >
                        <option value="" disabled>Engineer Name</option>
                        {engineers.map(e => <option key={e} value={e} className="bg-gray-800">{e}</option>)}
                    </select>

                    {/* Area with QR Scanner */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-gray-500">Select Area</label>
                        </div>
                        <select
                            className="w-full bg-transparent border border-gray-600 rounded p-2 text-white text-sm outline-none"
                            value={formData.area}
                            onChange={handleAreaChange}
                        >
                            <option value="" disabled>Select Area</option>
                            {areas.map(a => <option key={a} value={a} className="bg-gray-800">{a}</option>)}
                        </select>
                    </div>

                    {/* System */}
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Select System</label>
                        <select
                            className="w-full bg-transparent border border-gray-600 rounded p-2 text-white text-sm outline-none"
                            value={formData.system}
                            onChange={handleSystemChange}
                            disabled={!formData.area}
                        >
                            <option value="" disabled>Select System</option>
                            {getSystems().map(s => <option key={s} value={s} className="bg-gray-800">{s}</option>)}
                        </select>
                    </div>

                    {/* Component */}
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Select Component</label>
                        <select
                            className="w-full bg-transparent border border-gray-600 rounded p-2 text-white text-sm outline-none"
                            value={formData.component}
                            onChange={e => setFormData({ ...formData, component: e.target.value })}
                            disabled={!formData.system}
                        >
                            <option value="" disabled>Select Component</option>
                            {getComponents().map(c => <option key={c} value={c} className="bg-gray-800">{c}</option>)}
                        </select>
                    </div>

                    {/* Spare Part Used (Searchable) */}
                    <div className="pt-2 relative">
                        <label className="text-xs text-brand-orange block mb-1 font-bold">Spare Part Used (Deducts Stock)</label>

                        <div className="relative">
                            <input
                                type="text"
                                className="w-full bg-gray-800/50 border border-brand-orange/50 rounded p-2 text-white text-sm outline-none focus:ring-1 focus:ring-brand-orange"
                                placeholder="Search by Name or Nav Number..."
                                value={formData.spare_part_used ? formData.spare_part_used : searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    setFormData({ ...formData, spare_part_used: '' }); // Clear selection on edit
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // Delay to allow click
                            />
                            {showDropdown && (
                                <ul className="absolute z-50 w-full bg-gray-800 border border-gray-600 rounded mt-1 max-h-60 overflow-y-auto shadow-xl">
                                    <li
                                        onClick={() => {
                                            setFormData({ ...formData, spare_part_used: '' });
                                            setSearchQuery('');
                                            setShowDropdown(false);
                                        }}
                                        className="p-2 text-sm text-gray-400 hover:bg-gray-700 cursor-pointer border-b border-gray-700 italic"
                                    >
                                        None / Clear Selection
                                    </li>
                                    {filteredItems.map(item => (
                                        <li
                                            key={item.id}
                                            onClick={() => handleSelectPart(item)}
                                            className="p-2 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer border-b border-gray-700/50"
                                        >
                                            <div className="font-bold">{item.product_name}</div>
                                            <div className="text-xs text-brand-orange font-mono flex justify-between">
                                                <span>{item.nav_number || 'N/A'}</span>
                                                <span className={item.qty > 0 ? 'text-emerald-400' : 'text-red-400'}>Qty: {item.qty}</span>
                                            </div>
                                        </li>
                                    ))}
                                    {filteredItems.length === 0 && (
                                        <li className="p-3 text-sm text-gray-500 text-center">No items found</li>
                                    )}
                                </ul>
                            )}
                        </div>
                        {inventoryError && <p className="text-red-400 text-xs mt-1">{inventoryError}</p>}
                    </div>
                </div>

                {/* Job Type (JT) Buttons */}
                <div className="flex items-center gap-4 my-4">
                    <span className="text-gray-400 font-bold">JT</span>
                    <div className="flex gap-2 ml-auto">
                        {['Repair', 'Inspection', 'Cleaning'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFormData({ ...formData, job_type: type })}
                                className={`px-4 py-1 rounded text-sm transition-colors ${formData.job_type === type
                                    ? 'bg-gray-700 text-white border border-gray-500'
                                    : 'bg-transparent text-gray-400 hover:text-white'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action Taken Section */}
                <div className="border border-gray-600 rounded p-0 overflow-hidden mb-4">
                    {/* Orange Bar - Action Taken Header */}
                    <div className="bg-brand-orange p-3 flex justify-between items-center">
                        <span className="text-black font-bold text-sm flex items-center gap-2">
                            Action Taken
                        </span>
                    </div>

                    {/* Action Buttons Group */}
                    <div className="grid grid-cols-4 divide-x divide-gray-600 bg-gray-800">
                        {['Inspected', 'Replaced', 'Cleaned', 'Tightened'].map(action => (
                            <button
                                key={action}
                                onClick={() => setFormData({ ...formData, action })}
                                className={`p-3 text-sm font-medium transition-colors ${formData.action === action
                                    ? 'bg-brand-orange text-black'
                                    : 'text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Remarks Section (Voice + Text) */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-gray-400 text-sm block">Remarks</label>
                        <div className="scale-90 origin-right">
                            <VoiceInput
                                onTranscript={(text) => setFormData({ ...formData, remarks: formData.remarks ? formData.remarks + ' ' + text : text })}
                                fieldName="remarks"
                            />
                        </div>
                    </div>
                    <textarea
                        className="w-full bg-transparent border border-gray-600 rounded p-3 text-white text-sm outline-none placeholder-gray-500 min-h-[80px]"
                        placeholder="Type remarks or use voice input..."
                        value={formData.remarks}
                        onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    />
                </div>

                {/* Conditional Quantity (Only if Replaced) */}
                {formData.action === 'Replaced' && (
                    <div className="mb-4 animate-fade-in space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs text-gray-400 ml-1">Quantity Replaced</label>
                            <button
                                type="button"
                                onClick={() => setShowQRScanner(true)}
                                className="text-brand-orange hover:text-orange-400 text-xs flex items-center gap-1 bg-brand-orange/10 px-3 py-1.5 rounded-full border border-brand-orange/20"
                            >
                                <QrCode size={14} />
                                Scan Spare Part
                            </button>
                        </div>
                        <input type="number"
                            className="w-full bg-transparent border border-brand-orange rounded p-2 text-white"
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                            min="1"
                        />
                    </div>
                )}

                {/* Duration */}
                <div className="mb-4">
                    <input type="number"
                        placeholder="Duration (Minutes)"
                        className="w-full bg-transparent border border-gray-600 rounded p-3 text-white text-sm outline-none placeholder-gray-500"
                        value={formData.duration}
                        onChange={e => setFormData({ ...formData, duration: e.target.value })}
                    />
                </div>

                {/* Work Status */}
                <div className="mb-6">
                    <label className="text-gray-400 text-sm block mb-2">Work Status</label>
                    <div className="space-y-2">
                        {['Pending', 'Completed', 'Waiting for Parts'].map(statusOption => (
                            <label key={statusOption} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="work_status"
                                    value={statusOption}
                                    checked={formData.work_status === statusOption}
                                    onChange={e => setFormData({ ...formData, work_status: e.target.value })}
                                    className="accent-brand-orange"
                                />
                                <span className="text-gray-300 text-sm">{statusOption}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSubmit}
                    className="w-full bg-brand-orange hover:bg-orange-600 text-black font-bold py-3 rounded transition shadow-lg"
                >
                    Save Log
                </button>

                {/* Status Message */}
                {status && <div className="text-green-400 text-center mt-2 font-mono text-sm">{status}</div>}
            </div>

            {/* QR Scanner Modal */}
            {showQRScanner && (
                <QRScanner
                    token={user.token}
                    onScan={(data) => {
                        if (data.item) {
                            // Auto-fill area and location from scanned item
                            setFormData({
                                ...formData,
                                area: data.item.location_area || '',
                                spare_part_used: `${data.item.product_name} : (${data.item.qty})`
                            });
                            setStatus('QR Scanned: ' + data.item.product_name);
                            setTimeout(() => setStatus(''), 3000);
                        }
                        setShowQRScanner(false);
                    }}
                    onClose={() => setShowQRScanner(false)}
                />
            )}
        </div>
    );
};

export default MaintenanceForm;
