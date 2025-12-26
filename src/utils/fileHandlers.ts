import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker (essential for PDF.js in the browser)
// Use unpkg CDN which is more reliable than cdnjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
  });
};

export const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
  });
};

export const pdfToText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}`;
  }
  
  return fullText;
};

export const downloadFlow = (nodes: any[], edges: any[], groups: any[], viewport: any) => {
  const data = { nodes, edges, groups, viewport };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flowdo-data.json';
  a.click();
  URL.revokeObjectURL(url);
};

export const uploadFlow = (file: File): Promise<{ nodes: any[], edges: any[], groups: any[], viewport: any }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        // Validate the structure
        if (data.nodes && data.edges && data.groups && data.viewport) {
          resolve(data);
        } else {
          reject(new Error('Invalid flow file format. Missing required properties.'));
        }
      } catch (error) {
        reject(new Error('Failed to parse JSON file. Please ensure it is a valid flow file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
  });
};