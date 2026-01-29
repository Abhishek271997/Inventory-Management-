import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, X, Camera } from 'lucide-react';

const QRScanner = ({ onScan, onClose, token }) => {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let scanner;

        const initScanner = () => {
            scanner = new Html5QrcodeScanner('qr-reader', {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                rememberLastUsedCamera: true
            });

            scanner.render(onScanSuccess, onScanError);
            setScanning(true);
        };

        const onScanSuccess = async (decodedText) => {
            try {
                // Try to decode the QR data
                const res = await fetch('/api/qr/decode', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ qrData: decodedText })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (scanner) {
                        scanner.clear();
                    }
                    onScan(data);
                } else {
                    setError('Invalid QR code or item not found');
                }
            } catch (err) {
                console.error('QR decode error:', err);
                setError('Failed to process QR code');
            }
        };

        const onScanError = (err) => {
            // Ignore common scanning errors, only log critical ones
            if (err && !err.includes('NotFoundException')) {
                console.warn('QR Scan error:', err);
            }
        };

        initScanner();

        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [token, onScan]);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="glass-panel w-full max-w-lg p-6 rounded-2xl relative"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-brand-orange/20 flex items-center justify-center">
                                <QrCode className="text-brand-orange" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Scan QR Code</h2>
                                <p className="text-sm text-slate-400">Point camera at inventory QR code</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Scanner Container */}
                    <div id="qr-reader" className="rounded-lg overflow-hidden mb-4"></div>

                    {/* Status */}
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Camera size={16} className="animate-pulse text-brand-orange" />
                        <span>{scanning ? 'Scanning...' : 'Initializing camera...'}</span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Instructions */}
                    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <h4 className="text-white font-semibold text-sm mb-2">Tips:</h4>
                        <ul className="text-slate-400 text-xs space-y-1">
                            <li>• Hold camera steady and ensure good lighting</li>
                            <li>• Keep QR code within the scanning box</li>
                            <li>• Make sure QR code is in focus and not blurry</li>
                        </ul>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default QRScanner;
