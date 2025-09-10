import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  quality?: number;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export class PDFExportService {
  static async exportElementToPDF(
    elementId: string, 
    options: PDFExportOptions = {}
  ): Promise<void> {
    const {
      filename = 'negotiation-strategy.pdf',
      quality = 1.0,
      format = 'a4',
      orientation = 'portrait'
    } = options;

    try {
      // Get the element to export
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID "${elementId}" not found`);
      }

      // Scroll to top and ensure full content is visible
      window.scrollTo(0, 0);
      element.scrollTo(0, 0);
      
      // Wait a moment for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create canvas from the element with better settings
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Preserve transparency/gradients
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (node) => {
          // Skip export button itself
          return node.classList?.contains('export-button') || false;
        }
      });

      // Calculate dimensions with margins
      const margin = 10; // mm margins
      const imgWidth = (format === 'a4' ? 210 : 216) - (margin * 2); // mm
      const pageHeight = (format === 'a4' ? 297 : 279) - (margin * 2); // mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      });

      // Add the image to PDF
      const imgData = canvas.toDataURL('image/png', quality);
      
      if (imgHeight <= pageHeight) {
        // Single page
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      } else {
        // Multiple pages
        let heightLeft = imgHeight;
        let position = margin;
        
        while (heightLeft >= 0) {
          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          position -= pageHeight;
          
          if (heightLeft > 0) {
            pdf.addPage();
            position = margin;
          }
        }
      }

      // Download the PDF
      pdf.save(filename);
      
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF. Please try again.');
    }
  }

  static async exportNegotiationStrategy(
    summary: any,
    issues: any[],
    reportType: string,
    filename?: string
  ): Promise<void> {
    const exportFilename = filename || 
      `negotiation-strategy-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    return this.exportElementToPDF('executive-dashboard-export', {
      filename: exportFilename,
      quality: 0.95,
      format: 'a4',
      orientation: 'portrait'
    });
  }
}