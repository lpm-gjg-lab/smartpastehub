import styles from '../styles/components/Page.module.css';

export default function Settings() {
  return (
    <section className={styles.page} aria-label="Settings">
      <header className={styles.pageHeader}>
        <h1>Settings</h1>
      </header>
      <div className={styles.section}>
        <h2>Hotkey Configuration</h2>
        <div className={styles.card}>
          <div className={styles.row}><span>Paste Clean</span><button>Edit</button></div>
          <div className={styles.row}><span>OCR Capture</span><button>Edit</button></div>
          <div className={styles.row}><span>Multi-Copy</span><button>Edit</button></div>
          <div className={styles.row}><span>Queue Toggle</span><button>Edit</button></div>
        </div>
      </div>
      <div className={styles.section}>
        <h2>Active Preset</h2>
        <div className={styles.card}>
          <label><input type="radio" name="preset" defaultChecked /> Plain Text</label>
          <label><input type="radio" name="preset" /> Keep Structure</label>
          <label><input type="radio" name="preset" /> Custom Preset</label>
          <button>Add New Preset</button>
        </div>
      </div>
      <div className={styles.section}>
        <h2>Security</h2>
        <div className={styles.card}>
          <div className={styles.row}><span>Detect sensitive data</span><button>On</button></div>
          <div className={styles.row}><span>Auto-clear clipboard</span><button>Off</button></div>
          <div className={styles.row}><span>Timer</span><select><option>30 seconds</option></select></div>
        </div>
      </div>
    </section>
  );
}
