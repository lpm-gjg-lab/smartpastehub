import styles from '../styles/components/Page.module.css';

export default function Templates() {
  return (
    <section className={styles.page} aria-label="Templates">
      <header className={styles.pageHeader}>
        <h1>Templates</h1>
        <button>Create Template</button>
      </header>
      <div className={styles.cardList}>
        <div className={styles.cardItem}>
          <div className={styles.row}><strong>Email Follow-up</strong><span>Dear {`{name}`}, ...</span></div>
          <div className={styles.actions}><button>Edit</button><button>Use</button><button>Delete</button></div>
        </div>
      </div>
    </section>
  );
}
