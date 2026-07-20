export const toast = {
  success: (message) => {
    window.dispatchEvent(new CustomEvent('toast-event', { detail: { type: 'success', message } }));
  },
  error: (message) => {
    window.dispatchEvent(new CustomEvent('toast-event', { detail: { type: 'error', message } }));
  },
  info: (message) => {
    window.dispatchEvent(new CustomEvent('toast-event', { detail: { type: 'info', message } }));
  }
};
