import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BackgroundFX } from './BackgroundFX';
import { CoreOrb } from './CoreOrb';
import { LeftSystemPanel } from './LeftSystemPanel';
import { RightTaskPanel } from './RightTaskPanel';
import { VoiceHUD } from './VoiceHUD';
import { HudOverlay } from './HudOverlay';
import { ConfirmationModal } from './ConfirmationModal';
import { FileDiffModal } from './FileDiffModal';
import { AgentsPage } from '../pages/AgentsPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { MemoryPage } from '../pages/MemoryPage';
import { AutomationPage } from '../pages/AutomationPage';
import { SettingsModal } from './SettingsModal';
import { useJarvisStore } from '../../store/jarvisStore';

export type Page = 'home' | 'agents' | 'projects' | 'memory' | 'automation';

export function AppShell() {
  const { sendConfirmation } = useJarvisStore();
  const [page, setPage] = useState<Page>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: '#030a18',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      color: '#ffffff',
      position: 'relative',
    }}>
      <BackgroundFX />

      {/* Top nav — receives page + setter */}
      <HudOverlay activePage={page} onNavigate={setPage} />

      {/* ── Page content ── */}
      <AnimatePresence mode="wait">
        {page === 'home' ? (
          <motion.div key="home"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              flex: 1, display: 'grid',
              gridTemplateColumns: '228px 1fr 228px',
              gap: '10px', padding: '10px 12px',
              minHeight: 0, position: 'relative', zIndex: 10,
            }}>
            {/* LEFT */}
            <div style={{ overflowY: 'auto', paddingRight: 2 }}>
              <LeftSystemPanel />
            </div>
            {/* CENTER */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 }}>
              <CoreOrb />
            </div>
            {/* RIGHT */}
            <div style={{ overflowY: 'auto', paddingLeft: 2 }}>
              <RightTaskPanel />
            </div>
          </motion.div>
        ) : (
          <motion.div key={page}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative', zIndex: 10, overflowY: 'auto' }}>
            {page === 'agents'     && <AgentsPage />}
            {page === 'projects'   && <ProjectsPage />}
            {page === 'memory'     && <MemoryPage />}
            {page === 'automation' && <AutomationPage />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom command bar — always visible */}
      <div style={{ position: 'relative', zIndex: 20, paddingBottom: 4 }}>
        <VoiceHUD onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConfirmationModal onConfirm={sendConfirmation} />
      <FileDiffModal onConfirm={sendConfirmation} />
    </div>
  );
}
