import styles from '../styles/components/Page.module.css';

export default function History() {
  return (
    <section className={styles.page} aria-label="History">
      <header className={styles.pageHeader}>
        <h1>Clipboard History</h1>
        <input className={styles.search} type="search" placeholder="Search history" aria-label="Search history" />
      </header>
      <div className={styles.cardList}>
        <div className={styles.cardItem}>
          <div className={styles.row}><strong>14:32</strong><span>Lorem ipsum...</span></div>
          <div className={styles.actions}><button>Copy</button><button>Pin</button><button>Delete</button></div>
        </div>
      </div>
    </section>
  );
}
