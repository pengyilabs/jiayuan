import './styles/main.css';
import { bootstrap } from './app/bootstrap';

const root = document.getElementById('root');
if (!root) throw new Error('Falta el contenedor #root');
void bootstrap(root);
