import './styles.css';
import { setupUI } from './ui';

window.addEventListener('load', () => {
  setupUI(document.getElementById('app')!);
});
