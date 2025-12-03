import { Link } from "react-router-dom";
import styles from "./NotFoundScreen.module.css";

export default function NotFoundScreen() {
  return (
    <div className={styles.container}>
      <span className={styles.title}>Página não encontrada</span>
      <Link to="/" className={styles.link}>
        <span className={styles.linkText}>Voltar ao perfil</span>
      </Link>
    </div>
  );
}

