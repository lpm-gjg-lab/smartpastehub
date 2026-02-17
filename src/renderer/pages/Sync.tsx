import styles from '../styles/components/Page.module.css';

export default function Sync() {
  return (
    <section className={styles.page} aria-label="Sync">
      <header className={styles.pageHeader}>
        <h1>Sync</h1>
      </header>
      <div className={styles.card}>No devices paired.</div>
      <button>Scan QR Code</button>
    </section>
  );
}
