export function readPlainText(el: HTMLElement): string {
  return el.innerText.replace(/\r\n/g, '\n');
}

export function syncTextContent(el: HTMLElement, value: string, focused: boolean): void {
  if (focused) return;
  const next = value ?? '';
  if (readPlainText(el) === next) return;
  el.textContent = next;
}

export function stripRichPaste(event: ClipboardEvent): void {
  event.preventDefault();
  const text = event.clipboardData?.getData('text/plain') ?? '';
  if (!text) return;

  const selection = window.getSelection();
  if (!selection?.rangeCount) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}
