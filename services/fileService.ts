import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

/**
 * Extracts raw text from a PDF file.
 */
const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}`;
  }

  return fullText;
};

/**
 * Extracts text from an HTML file by parsing DOM and getting textContent.
 */
const extractTextFromHtml = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const htmlString = event.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      // Remove scripts and styles to get clean text
      const scripts = doc.getElementsByTagName('script');
      const styles = doc.getElementsByTagName('style');
      for (let i = scripts.length - 1; i >= 0; i--) scripts[i].remove();
      for (let i = styles.length - 1; i >= 0; i--) styles[i].remove();
      
      resolve(doc.body.textContent || doc.body.innerText || '');
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};

/**
 * Extracts text from plain text files (Markdown, TXT).
 */
const extractTextFromPlain = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};

export const processFile = async (file: File): Promise<string> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await extractTextFromPdf(file);
    } else if (
      fileType === 'text/html' || 
      fileName.endsWith('.html') || 
      fileName.endsWith('.htm')
    ) {
      return await extractTextFromHtml(file);
    } else if (
      fileType === 'text/markdown' || 
      fileName.endsWith('.md') || 
      fileName.endsWith('.markdown') || 
      fileType.startsWith('text/')
    ) {
      return await extractTextFromPlain(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error("File processing failed:", error);
    throw new Error("Failed to parse file content. Please check the file format.");
  }
};