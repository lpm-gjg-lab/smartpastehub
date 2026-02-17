import styles from '../styles/components/Page.module.css';

export default function AISettings() {
  return (
    <section className={styles.page} aria-label="AI and OCR">
      <header className={styles.pageHeader}>
        <h1>AI & OCR</h1>
      </header>
      <div className={styles.section}>
        <h2>OCR Preview</h2>
        <div className={styles.card}>No OCR result yet.</div>
      </div>
      <div className={styles.section}>
        <h2>Rewrite Preview</h2>
        <div className={styles.card}>Enable AI to preview rewrites.</div>
      </div>
    </section>
  );
}
