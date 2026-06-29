import React from 'react';
import { useJarvisStore } from '../../store/jarvisStore';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface FileDiffModalProps {
  onConfirm: (id: string, approved: boolean) => void;
}

export function FileDiffModal({ onConfirm }: FileDiffModalProps) {
  const { fileDiff, setFileDiff } = useJarvisStore();

  if (!fileDiff) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-xl border border-cyan-500/30 bg-[#080e20ee] shadow-[0_0_40px_rgba(0,212,255,0.2)]"
        >
          <div className="p-6 border-b border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <h2 className="font-sans text-lg font-bold tracking-widest text-cyan-400 uppercase">
                FILE CHANGE PREVIEW
              </h2>
            </div>
            <div className="mt-2 font-mono text-xs text-cyan-200/60 truncate">
              {fileDiff.path}
            </div>
          </div>

          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-px bg-cyan-500/10">
            <div className="flex flex-col overflow-hidden bg-[#0a1229]">
              <div className="p-2 text-[10px] uppercase tracking-widest text-red-400 bg-red-400/5 border-b border-red-500/10">BEFORE</div>
              <pre className="flex-1 p-4 font-mono text-xs text-red-200/70 overflow-auto">
                {fileDiff.before || '(Empty)'}
              </pre>
            </div>
            <div className="flex flex-col overflow-hidden bg-[#0a1229]">
              <div className="p-2 text-[10px] uppercase tracking-widest text-green-400 bg-green-400/5 border-b border-green-500/10">AFTER</div>
              <pre className="flex-1 p-4 font-mono text-xs text-green-200/70 overflow-auto">
                {fileDiff.after}
              </pre>
            </div>
          </div>

          <div className="p-6 border-t border-cyan-500/20 flex gap-4">
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              onClick={() => {
                onConfirm(fileDiff.id, false);
                setFileDiff(null);
              }}
            >
              REJECT CHANGES
            </Button>
            <Button
              className="flex-1 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 hover:text-green-300"
              onClick={() => {
                onConfirm(fileDiff.id, true);
                setFileDiff(null);
              }}
            >
              APPROVE CHANGES
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
