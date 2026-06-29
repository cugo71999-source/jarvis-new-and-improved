import React from 'react';
import { useJarvisStore } from '../../store/jarvisStore';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
  onConfirm: (id: string, approved: boolean) => void;
}

export function ConfirmationModal({ onConfirm }: ConfirmationModalProps) {
  const { confirmationRequest, setConfirmationRequest } = useJarvisStore();

  if (!confirmationRequest) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-md rounded-xl border border-cyan-500/30 bg-[#080e20ee] p-6 shadow-[0_0_30px_rgba(0,212,255,0.2)]"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="h-3 w-3 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
            <h2 className="font-sans text-lg font-bold tracking-widest text-cyan-400 uppercase">
              CONFIRMATION REQUIRED
            </h2>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-200/50 mb-1">Action</div>
              <div className="font-mono text-sm text-cyan-100">{confirmationRequest.action}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-200/50 mb-1">Details</div>
              <div className="font-mono text-sm text-cyan-100 bg-black/30 p-3 rounded border border-cyan-500/10">
                {confirmationRequest.details}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-300"
              onClick={() => {
                onConfirm(confirmationRequest.id, false);
                setConfirmationRequest(null);
              }}
            >
              DENY
            </Button>
            <Button
              className="flex-1 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 hover:text-green-300 transition-all duration-300"
              onClick={() => {
                onConfirm(confirmationRequest.id, true);
                setConfirmationRequest(null);
              }}
            >
              APPROVE
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
