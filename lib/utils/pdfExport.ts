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

      // Create canvas from the element
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      // Calculate dimensions
      const imgWidth = format === 'a4' ? 210 : 216; // mm
      const pageHeight = format === 'a4' ? 297 : 279; // mm
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
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multiple pages
        let heightLeft = imgHeight;
        let position = 0;
        
        while (heightLeft >= 0) {
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          position -= pageHeight;
          
          if (heightLeft > 0) {
            pdf.addPage();
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