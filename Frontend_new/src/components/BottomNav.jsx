import { motion } from 'framer-motion';

export default function BottomNav({ current, onNavigate }) {
  const tabs = [
    { id: 'sanctuary', label: 'Sanctuary', icon: '🌿' },
    { id: 'log', label: 'Log', icon: '📝' },  
    { id: 'companion', label: 'Companion', icon: '🦊' },
    { id: 'museum', label: 'Museum', icon: '🏛️' }
  ];

  return (
    <div style={{
      background: 'rgba(4,6,14,0.95)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(12px)',
      padding: '8px 0',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center'
    }}>
      {tabs.map(tab => (
        <motion.button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'none',
            border: 'none',
            color: current === tab.id ? '#6EF3C5' : 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px',
            cursor: 'pointer',
            transition: 'color 0.2s'
          }}
        >
          <span style={{ fontSize: '18px' }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </motion.button>
      ))}
    </div>
  );
}