import { errorMessage } from './errors';

/** Pantalla mínima cuando no se pueden cargar los datos iniciales (F2 la sustituye por el login). */
export function renderBootError(root: HTMLElement, error: unknown): void {
  const box = document.createElement('div');
  box.className = 'boot-error';
  box.setAttribute('role', 'alert');

  const title = document.createElement('h1');
  title.textContent = 'PropPulse';
  const message = document.createElement('p');
  message.textContent = errorMessage(error);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn btn-primary';
  retry.textContent = '↻';
  retry.addEventListener('click', () => {
    window.location.reload();
  });

  box.append(title, message, retry);
  root.replaceChildren(box);
  console.error(error);
}
