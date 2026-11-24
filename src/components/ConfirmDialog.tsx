import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLoading) onCancel();
          }}
          className="absolute inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-center justify-center p-5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] rounded-[28px] bg-[#101017] border border-white/14 p-5 shadow-2xl space-y-4 text-center"
          >
            <div className="w-12 h-12 rounded-2xl mx-auto bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={isLoading}
                onClick={onCancel}
                className="h-11 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={onConfirm}
                className="h-11 rounded-2xl bg-rose-500 hover:bg-rose-400 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(244,63,94,0.6)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Deleting…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
