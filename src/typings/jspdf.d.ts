declare module 'jspdf' {
  export default class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string | number[]);
    addPage(): void;
    setFont(font: string, style?: string): void;
    setFontSize(size: number): void;
    setTextColor(ch1: number, ch2?: number, ch3?: number): void;
    text(
      text: string | string[],
      x: number,
      y: number,
      options?: { align?: 'left' | 'center' | 'right' | 'justify' },
    ): void;
    splitTextToSize(text: string, maxWidth: number): string[];
    save(filename: string): void;
  }
}
