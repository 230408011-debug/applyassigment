const buttons = document.querySelectorAll('button[data-path]');
const statusOutput = document.querySelector('#status');
const bodyOutput = document.querySelector('#response');

async function tryRoute(button) {
  const path = button.dataset.path;
  const method = button.dataset.method;

  buttons.forEach((item) => { item.disabled = true; });
  statusOutput.className = '';
  statusOutput.textContent = `Loading ${method} ${path}...`;
  bodyOutput.textContent = '';

  try {
    const response = await fetch(path, { method });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? JSON.stringify(await response.json(), null, 2)
      : await response.text();

    statusOutput.textContent = `${method} ${path} — HTTP ${response.status} ${response.statusText}`;
    statusOutput.className = response.ok ? 'success' : 'error';
    bodyOutput.textContent = body;
  } catch (error) {
    statusOutput.textContent = 'Network error: could not reach the server. Please try again.';
    statusOutput.className = 'error';
    bodyOutput.textContent = error.message;
  } finally {
    buttons.forEach((item) => { item.disabled = false; });
  }
}

buttons.forEach((button) => {
  button.addEventListener('click', () => tryRoute(button));
});
