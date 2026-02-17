import styles from '../styles/components/Page.module.css';

export default function Plugins() {
  return (
    <section className={styles.page} aria-label="Plugins">
      <header className={styles.pageHeader}>
        <h1>Plugins</h1>
      </header>
      <div className={styles.card}>No plugins installed.</div>
    </section>
  );
}
