import React, { useState } from 'react';
import { motion } from 'framer-motion';

const PANEL: React.CSSProperties = {
  background: 'rgba(6,16,38,0.88)',
  border: '1px solid rgba(0,160,255,0.15)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 6,
};

type Section = 'overview' | 'agents' | 'voice' | 'projects' | 'settings' | 'keyboard' | 'architecture' | 'troubleshoot';

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'overview',      label: 'Overview',       icon: '🏠' },
  { key: 'agents',        label: 'Agents',         icon: '🤖' },
  { key: 'voice',         label: 'Voice & Mic',    icon: '🎤' },
  { key: 'projects',      label: 'Projects',       icon: '📁' },
  { key: 'settings',      label: 'Settings',       icon: '⚙️' },
  { key: 'keyboard',      label: 'Shortcuts',      icon: '⌨️' },
  { key: 'architecture',  label: 'Architecture',   icon: '🏗' },
  { key: 'troubleshoot',  label: 'Troubleshoot',   icon: '🔧' },
];

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.3em', color: '#fff', marginBottom: 6, marginTop: 24 }}>{children}</h2>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 10, letterSpacing: '0.28em', color: 'rgba(0,180,255,0.6)', marginBottom: 10, marginTop: 18 }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 10.5, color: 'rgba(185,215,255,0.70)', lineHeight: 1.85, marginBottom: 10, letterSpacing: '0.03em' }}>{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'rgba(0,40,100,0.4)', border: '1px solid rgba(0,180,255,0.18)',
      borderRadius: 3, padding: '2px 6px', fontFamily: 'monospace', fontSize: 10,
      color: '#00d4ff', display: 'inline',
    }}>{children}</span>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(0,10,30,0.6)', border: '1px solid rgba(0,180,255,0.12)',
      borderRadius: 5, padding: '12px 16px', marginBottom: 12, fontFamily: 'monospace',
      fontSize: 10, color: 'rgba(185,215,255,0.75)', lineHeight: 1.75,
    }}>{children}</div>
  );
}

function AgentCard({ name, color, icon, role, triggers }: {
  name: string; color: string; icon: string; role: string; triggers: string[];
}) {
  return (
    <div style={{
      ...PANEL, padding: '14px 16px', marginBottom: 10,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: '0.15em' }}>{name}</span>
      </div>
      <P>{role}</P>
      <div style={{ fontSize: 8, color: 'rgba(0,180,255,0.4)', letterSpacing: '0.2em', marginBottom: 6 }}>EXAMPLE TRIGGERS</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {triggers.map(t => (
          <span key={t} style={{
            fontSize: 8, padding: '2px 8px',
            background: `${color}10`, border: `1px solid ${color}25`,
            color: `${color}BB`, borderRadius: 3, fontStyle: 'italic',
          }}>"{t}"</span>
        ))}
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <div>
      <Heading>JARVIS AI OPERATING SYSTEM</Heading>
      <P>JARVIS is a multi-agent AI operating system inspired by Tony Stark's AI assistant. It uses a master orchestrator architecture where JARVIS Core never does specialized work itself — instead it analyzes every request, routes it to the correct specialist agent, and synthesizes a polished final response.</P>

      <Sub>WHAT JARVIS CAN DO</Sub>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          ['🏗 Build Software', 'Generate complete apps, websites, APIs, scripts, and databases with live preview'],
          ['🎤 Voice Control', 'Speak naturally — JARVIS transcribes, processes, and responds in voice'],
          ['⚡ Wake Word', 'Say "Hey Jarvis" to activate without pressing any buttons'],
          ['🔧 Self-Repair', 'Detect and fix errors in code it generates automatically'],
          ['🎨 Design', 'Generate professional UI design specs and visual systems'],
          ['⚙️ System Ops', 'Run commands, manage files, and automate workflows'],
          ['📁 Projects', 'Browse, view, and live-preview all generated code projects'],
          ['🧠 Memory', 'Persistent conversation history and agent activity log'],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ ...PANEL, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#00d4ff', marginBottom: 5 }}>{title as string}</div>
            <div style={{ fontSize: 9, color: 'rgba(180,210,255,0.5)', lineHeight: 1.6 }}>{desc as string}</div>
          </div>
        ))}
      </div>

      <Sub>HOW IT WORKS</Sub>
      <P>Every message you send goes to JARVIS Core (the master orchestrator). JARVIS decides whether it can answer directly (for simple questions) or whether it needs to delegate to a specialist agent. If delegation is needed, JARVIS returns a JSON routing decision, the agent is invoked with the full context and appropriate system prompt, and the result is synthesized into a final response. All agents run in sequence for multi-step tasks (design → code → debug → repair).</P>
    </div>
  );
}

function AgentsSection() {
  return (
    <div>
      <Heading>AGENT ROSTER</Heading>
      <P>Each agent is independently prompted and has a single, non-overlapping responsibility. JARVIS Core never does specialized work — it only orchestrates.</P>

      <AgentCard
        name="JARVIS CORE" color="#00d4ff" icon="🔮"
        role="The master orchestrator. Analyzes every user request and decides whether to answer directly (simple queries, conversation) or route to a specialist agent. Never performs specialized tasks itself — only coordinates and synthesizes."
        triggers={['What is quantum computing?', 'Hey Jarvis', 'Who are you?', 'Status report']}
      />
      <AgentCard
        name="CODING AGENT" color="#22c55e" icon="⌨️"
        role="Elite full-stack software engineer. Builds complete, production-quality applications with real functionality — no placeholders or TODO comments. Generates multi-file projects saved to the Projects view with live preview support."
        triggers={['Build a weather app', 'Create a REST API', 'Write a Python script', 'Make a todo list app']}
      />
      <AgentCard
        name="DESIGN AGENT" color="#a855f7" icon="🎨"
        role="World-class product designer. Only activated for UI-heavy projects (websites, dashboards, landing pages) — not for APIs or scripts. Produces complete design specifications: CSS custom properties, typography, animations, component specs."
        triggers={['Design a SaaS dashboard', 'Create a landing page', 'Design a portfolio site']}
      />
      <AgentCard
        name="DEBUGGING AGENT" color="#f59e0b" icon="🔍"
        role="Code quality assurance specialist. Automatically reviews all generated code after the Coding Agent finishes. Checks for syntax errors, missing files, broken references, API misuse, and logic errors. Returns either OK or a list of specific issues."
        triggers={['[Automatic — always runs after Coding Agent]']}
      />
      <AgentCard
        name="SYSTEM AGENT" color="#38bdf8" icon="🖥"
        role="Operating system automation expert. Handles file management, running commands, installing software, environment configuration, and OS-level automation tasks."
        triggers={['Open my terminal', 'Install Node.js', 'List files in Downloads', 'Run my dev server']}
      />
      <AgentCard
        name="REPAIR AGENT" color="#ef4444" icon="🔧"
        role="Systems reliability engineer. Diagnoses errors, crashes, and performance problems. Proposes and implements fixes. Activated when bugs are discovered by the Debugging Agent or reported by the user."
        triggers={['Fix the error', 'My app is crashing', 'Debug this issue', 'Repair the code']}
      />
    </div>
  );
}

function VoiceSection() {
  return (
    <div>
      <Heading>VOICE & MICROPHONE</Heading>

      <Sub>GETTING STARTED</Sub>
      <P>Click the microphone icon in the command bar to grant permission. Once granted, JARVIS continuously monitors your microphone for speech. When you speak, the waveform bars respond in real-time using your actual audio data.</P>

      <Sub>VOICE COMMANDS</Sub>
      <P>Simply speak naturally. JARVIS uses the Web Speech API to transcribe your voice, then processes it through the same agent system as typed commands. You can ask anything, give commands, or have full conversations.</P>

      <Block>
        <div>Try saying:</div>
        <div style={{ color: '#00d4ff', marginTop: 6 }}>"Build me a weather dashboard with animated icons"</div>
        <div style={{ color: '#00d4ff' }}>"What's the status of all systems?"</div>
        <div style={{ color: '#00d4ff' }}>"Explain how neural networks work"</div>
        <div style={{ color: '#00d4ff' }}>"Write a Python script to sort a CSV file"</div>
      </Block>

      <Sub>WAKE WORD</Sub>
      <P>Enable "Hey Jarvis" wake word detection in Settings → Wake Word. Once enabled, JARVIS listens passively for the wake phrase and automatically activates when it hears it. Sensitivity is configurable to reduce false triggers.</P>

      <Sub>MICROPHONE SETTINGS</Sub>
      <P>In Settings → Microphone, you can select a specific input device from all connected microphones, enable noise cancellation, echo cancellation, and auto gain control, and test your mic level with the real-time bar indicator.</P>

      <Sub>REAL-TIME LEVEL METER</Sub>
      <P>The waveform bars in the command bar reflect your actual microphone input using the Web Audio API's AnalyserNode. The small vertical indicator on the right side of the bars shows your current mic level — green is normal, orange is loud, red is clipping.</P>
    </div>
  );
}

function ProjectsSection() {
  return (
    <div>
      <Heading>PROJECTS</Heading>
      <P>Every application JARVIS builds is saved to the Projects page automatically. You can view the code, browse files, and see a live preview — all in your browser.</P>

      <Sub>LIVE PREVIEW</Sub>
      <P>HTML/CSS/JavaScript projects show a live preview in a sandboxed iframe. JARVIS automatically inlines all CSS and JS files into the HTML entry point so the project runs instantly. Click the ▶ PREVIEW tab in project detail to see it running.</P>

      <Sub>FILE TREE</Sub>
      <P>The left sidebar shows all project files grouped by folder. Click any file to view its complete source code with line numbers and syntax highlighting. Each file shows its extension badge with a distinct color.</P>

      <Sub>WHAT GETS PREVIEWED</Sub>
      <Block>
        <div>✓ HTML + CSS + JavaScript projects → Live iframe preview</div>
        <div>✗ Python, Rust, Go, Java → "Backend project" notice + run instructions</div>
        <div>✗ Projects without index.html → Build instructions shown</div>
      </Block>

      <Sub>COPYING CODE</Sub>
      <P>Use COPY FILE to copy the currently selected file, or COPY ALL to get all files concatenated with file path headers. This makes it easy to use JARVIS-built code in your own environment.</P>

      <Sub>PROJECT LIFECYCLE</Sub>
      <P>When you ask JARVIS to build something, the Coding Agent generates all files, the Debugging Agent reviews them, and if issues are found, the Repair Agent fixes them — all automatically. The project status badge shows: BUILDING → COMPLETE (or FAILED).</P>
    </div>
  );
}

function SettingsSection() {
  return (
    <div>
      <Heading>SETTINGS</Heading>
      <P>Access Settings via the gear icon in the command bar. Settings are organized into tabs:</P>

      {[
        ['🤖 AI Model', 'Configure the LLM endpoint, model name, and API key. Use presets for Groq (default), OpenAI, or any local model (Ollama, LM Studio). The Groq server preset requires no API key in the browser.'],
        ['🎤 Microphone', 'Select input device from all connected microphones. Test mic level with the real-time bar. Configure noise cancellation, echo cancellation, and auto gain control.'],
        ['🔊 Voice', 'Adjust text-to-speech rate and volume. Preview the current voice settings by clicking Test Voice.'],
        ['⚡ Wake Word', 'Enable "Hey Jarvis" passive listening. Configure the wake phrase and detection sensitivity.'],
        ['🎨 Appearance', 'Choose a color theme (Arc Reactor / Matrix / Nexus), adjust orb size, and toggle animations.'],
        ['⚙️ General', 'View system information and clear all data if needed.'],
      ].map(([title, desc]) => (
        <div key={title as string} style={{ marginBottom: 12, padding: '12px 14px', ...PANEL }}>
          <div style={{ fontSize: 10, color: '#00d4ff', marginBottom: 6 }}>{title as string}</div>
          <div style={{ fontSize: 9.5, color: 'rgba(180,210,255,0.55)', lineHeight: 1.65 }}>{desc as string}</div>
        </div>
      ))}
    </div>
  );
}

function KeyboardSection() {
  const shortcuts = [
    ['Enter', 'Send typed message'],
    ['Ctrl + K', 'Focus command bar'],
    ['Escape', 'Cancel current operation'],
    ['Ctrl + /','Open settings'],
  ];

  return (
    <div>
      <Heading>KEYBOARD SHORTCUTS</Heading>

      <div style={{ ...PANEL, padding: '6px 0', marginBottom: 20 }}>
        {shortcuts.map(([key, action]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderBottom: '1px solid rgba(0,180,255,0.06)',
          }}>
            <span style={{ fontSize: 9.5, color: 'rgba(185,215,255,0.65)', letterSpacing: '0.05em' }}>{action}</span>
            <Code>{key}</Code>
          </div>
        ))}
      </div>

      <Sub>NAVIGATION</Sub>
      <P>Navigate between pages using the top navigation bar: HOME, AGENTS, PROJECTS, MEMORY, AUTOMATION, INSTRUCTIONS. The home page shows the JARVIS orb, conversation panel, and task queue. All other pages replace the main view.</P>

      <Sub>VOICE SHORTCUTS</Sub>
      <Block>
        <div>"Hey Jarvis, ..."  → Activate and process command</div>
        <div>"Cancel"           → Stop current operation</div>
        <div>"Status report"    → Get system status</div>
      </Block>
    </div>
  );
}

function ArchitectureSection() {
  return (
    <div>
      <Heading>ARCHITECTURE</Heading>

      <Sub>TECH STACK</Sub>
      <Block>
        <div>Frontend:  React + Vite + TypeScript + Framer Motion</div>
        <div>Backend:   Express.js (API proxy server)</div>
        <div>AI:        Groq Cloud API (llama-3.3-70b-versatile)</div>
        <div>Voice:     Web Speech API + AudioContext</div>
        <div>Storage:   localStorage (projects, settings, memory)</div>
        <div>Styling:   Inline styles + CSS animations (no CSS framework)</div>
      </Block>

      <Sub>AGENT MODELS</Sub>
      <Block>
        <div>JARVIS Core (routing):   llama-3.1-8b-instant   (fast, minimal tokens)</div>
        <div>Coding Agent:            llama-3.3-70b-versatile (5500 max tokens)</div>
        <div>Debugging Agent:         llama-3.3-70b-versatile (1500 max tokens)</div>
        <div>Design Agent:            llama-3.3-70b-versatile (2500 max tokens)</div>
        <div>System Agent:            llama-3.3-70b-versatile (2000 max tokens)</div>
        <div>Repair Agent:            llama-3.3-70b-versatile (3000 max tokens)</div>
        <div>Synthesis (summary):     llama-3.1-8b-instant   (150 max tokens)</div>
      </Block>

      <Sub>REQUEST FLOW</Sub>
      <P>
        1. User message → JARVIS Core (routing decision)<br />
        2. If simple → direct response<br />
        3. If complex → route to agent (coding / design / system / repair)<br />
        4. For coding: Design Agent (if UI) → Coding Agent → Debugging Agent → Repair Agent (if errors)<br />
        5. Result saved to Projects (if code was generated)<br />
        6. JARVIS Core synthesizes a 1-sentence summary<br />
        7. TTS speaks the summary if voice is active
      </P>

      <Sub>DATA FLOW</Sub>
      <Block>
        <div>Browser → api-server (Express) → /api/llm/v1/* → Groq API</div>
        <div>GROQ_API_KEY stored as server env var — never exposed to browser</div>
        <div>All conversation history stored in Zustand (in-memory)</div>
        <div>Projects stored in localStorage as JSON</div>
      </Block>

      <Sub>PERFORMANCE</Sub>
      <P>The CoreOrb runs at 36fps cap using requestAnimationFrame. CSS animations handle all HUD decorations (rotating rings, brackets) at 60fps via GPU. The audio analyzer reads mic data at 60fps but only renders bar heights, not the canvas.</P>
    </div>
  );
}

function TroubleshootSection() {
  const items = [
    {
      q: 'JARVIS says "could not connect" or shows an LLM error',
      a: 'Open Settings → AI Model. Make sure the Groq (Server) preset is selected (the API key is stored server-side — no key needed in the browser). If using a local model, ensure your LLM server is running and the endpoint URL is correct.',
    },
    {
      q: 'Microphone permission is denied',
      a: 'Click the mic icon and accept the browser permission prompt. If already denied, go to your browser settings → Site Permissions → Microphone and allow it for this site. Then reload the page.',
    },
    {
      q: 'The preview tab shows blank or broken page',
      a: 'This happens when the project uses external resources that are blocked by the sandbox, or uses a module bundler (like Vite/webpack). The live preview only works for vanilla HTML/CSS/JS projects. Copy the files and run them locally for other project types.',
    },
    {
      q: 'Voice recognition stops working mid-session',
      a: 'The Web Speech API has session limits in some browsers. Click the mic button to restart recognition. If the problem persists, reload the page — your conversation history is preserved in memory.',
    },
    {
      q: 'JARVIS is generating very short or incomplete code',
      a: 'This is usually a token rate-limit issue with the Groq free tier. Wait 30-60 seconds and try again. The app uses llama-3.3-70b-versatile which has a 12K tokens-per-minute limit.',
    },
    {
      q: 'Wake word keeps triggering accidentally',
      a: 'Reduce the Wake Word Sensitivity in Settings → Wake Word. Also ensure Noise Cancellation and Echo Cancellation are enabled in Settings → Microphone.',
    },
    {
      q: 'The orb is laggy or animations are slow',
      a: 'The canvas orb is capped at 36fps. If still slow, disable animations in Settings → Appearance. This turns off CSS ring rotations which can cause GPU pressure on low-power devices.',
    },
  ];

  return (
    <div>
      <Heading>TROUBLESHOOTING</Heading>
      <P>Common issues and their solutions. If none of these help, try clearing all data in Settings → General (last resort — this resets everything).</P>

      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: 12, ...PANEL, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: '#00d4ff', marginBottom: 7, lineHeight: 1.5 }}>Q: {item.q}</div>
          <div style={{ fontSize: 9.5, color: 'rgba(180,210,255,0.60)', lineHeight: 1.75 }}>A: {item.a}</div>
        </div>
      ))}

      <Sub>PRIVACY</Sub>
      <P>Your voice data is processed locally by the Web Speech API — audio is not sent to JARVIS servers. Only the transcribed text is sent to the Groq API for processing. Your API key (if using direct Groq) is stored only in your browser's localStorage and never logged.</P>
    </div>
  );
}

export function InstructionsPage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':     return <OverviewSection />;
      case 'agents':       return <AgentsSection />;
      case 'voice':        return <VoiceSection />;
      case 'projects':     return <ProjectsSection />;
      case 'settings':     return <SettingsSection />;
      case 'keyboard':     return <KeyboardSection />;
      case 'architecture': return <ArchitectureSection />;
      case 'troubleshoot': return <TroubleshootSection />;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, fontFamily: 'monospace', padding: '0 20px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.4em', color: '#fff', marginBottom: 4 }}>DOCUMENTATION</h2>
          <p style={{ fontSize: 8.5, letterSpacing: '0.28em', color: 'rgba(0,180,255,0.4)' }}>JARVIS AI OPERATING SYSTEM — COMPLETE GUIDE</p>
        </div>
        <div style={{ fontSize: 8, color: 'rgba(0,180,255,0.3)', letterSpacing: '0.2em' }}>v2.4.1</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '175px 1fr', gap: 14, minHeight: 0 }}>

        {/* Sidebar */}
        <div style={{ ...PANEL, padding: '12px 8px', overflowY: 'auto' }}>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 10px', marginBottom: 2,
                background: activeSection === s.key ? 'rgba(0,180,255,0.12)' : 'transparent',
                border: activeSection === s.key ? '1px solid rgba(0,180,255,0.25)' : '1px solid transparent',
                borderRadius: 4, cursor: 'pointer',
                color: activeSection === s.key ? '#00d4ff' : 'rgba(140,180,230,0.48)',
                fontSize: 9.5, letterSpacing: '0.08em', transition: 'all 0.15s', textAlign: 'left',
              }}>
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ ...PANEL, padding: '20px 28px', overflowY: 'auto' }}>
          <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            {renderSection()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
