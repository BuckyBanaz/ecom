/** Print only `.invoice-print-area` content — hides admin chrome, modals, and site UI. */
export function printInvoice(): void {
  document.body.classList.add("print-invoice");
  const cleanup = () => {
    document.body.classList.remove("print-invoice");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}
