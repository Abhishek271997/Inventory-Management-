import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, X } from 'lucide-react';

const QRCodeModal = ({ qrCodeData, onClose }) => {
    if (!qrCodeData) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10 shadow-2xl border border-white/10"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <QrCode className="text-brand-orange" />
                            QR Code
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-1">{qrCodeData.product_name}</h3>
                        {qrCodeData.nav_number && (
                            <p className="text-brand-orange font-mono mb-4 text-lg">{qrCodeData.nav_number}</p>
                        )}

                        <div className="text-left bg-white/5 p-4 rounded-xl mb-4 text-sm space-y-2">
                            <div className="flex justify-between border-b border-white/10 pb-1">
                                <span className="text-slate-400">Quantity:</span>
                                <span className="text-white font-mono">{qrCodeData.qty} (Min: {qrCodeData.min_qty})</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-1">
                                <span className="text-slate-400">Area:</span>
                                <span className="text-white">{qrCodeData.location_area}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-1">
                                <span className="text-slate-400">Location:</span>
                                <span className="text-white">{qrCodeData.location}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Sub-Loc:</span>
                                <span className="text-white">{qrCodeData.sub_location || '-'}</span>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl inline-block">
                            <img src={qrCodeData.qrCode} alt="QR Code" className="w-64 h-64" />
                        </div>
                        <p className="text-xs text-slate-500 mt-4">Scan this code with the mobile app to quickly access this item</p>

                        <a
                            href={qrCodeData.qrCode}
                            download={`${qrCodeData.product_name}-qr.png`}
                            className="mt-6 inline-block bg-brand-orange hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded-lg transition"
                        >
                            Download QR Code
                        </a>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default QRCodeModal;
