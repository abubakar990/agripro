export const confirmDialog = (message) => {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('confirm-event', { detail: { message, resolve } }));
  });
};
