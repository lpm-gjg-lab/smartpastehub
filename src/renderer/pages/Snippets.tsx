import styles from '../styles/components/Page.module.css';

export default function Snippets() {
  return (
    <section className={styles.page} aria-label="Snippets">
      <header className={styles.pageHeader}>
        <h1>Snippets</h1>
      </header>
      <div className={styles.cardList}>
        <div className={styles.cardItem}>
          <div className={styles.row}><strong>Email Signature</strong><span>Regards, ...</span></div>
          <div className={styles.actions}><button>Use</button><button>Edit</button></div>
        </div>
      </div>
    </section>
  );
}
