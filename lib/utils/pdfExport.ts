import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  quality?: number;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  pageMode?: 'single' | 'multi' | 'smart'; // New pagination option
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
      orientation = 'portrait',
      pageMode = 'single'
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
      const standardPageHeight = (format === 'a4' ? 297 : 279) - (margin * 2); // mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add the image to PDF
      const imgData = canvas.toDataURL('image/png', quality);
      
      let pdf: jsPDF;
      
      if (pageMode === 'single') {
        // Single long page - no page breaks, infinite scroll
        pdf = new jsPDF({
          orientation,
          unit: 'mm',
          format: [imgWidth + (margin * 2), imgHeight + (margin * 2)] // Custom page size to fit content
        });
        
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        
      } else if (pageMode === 'smart') {
        // Smart page breaks - try to break at natural content boundaries
        if (imgHeight <= standardPageHeight) {
          pdf = new jsPDF({ orientation, unit: 'mm', format });
          pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        } else {
          // Create custom page size for long content
          pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format: [imgWidth + (margin * 2), Math.min(imgHeight + (margin * 2), 2000)] // Cap at reasonable height
          });
          pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        }
        
      } else {
        // Multi-page mode - improved to avoid harsh cutoffs
        pdf = new jsPDF({ orientation, unit: 'mm', format });
        
        if (imgHeight <= standardPageHeight) {
          // Single page
          pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        } else {
          // Multiple pages with better breaks
          const pageHeight = standardPageHeight;
          const totalPages = Math.ceil(imgHeight / pageHeight);
          
          for (let page = 0; page < totalPages; page++) {
            if (page > 0) {
              pdf.addPage();
            }
            
            const sourceY = page * pageHeight;
            const sourceHeight = Math.min(pageHeight, imgHeight - sourceY);
            
            // Create a temporary canvas for this page section
            const pageCanvas = document.createElement('canvas');
            const pageCtx = pageCanvas.getContext('2d');
            const scale = canvas.width / imgWidth;
            
            pageCanvas.width = canvas.width;
            pageCanvas.height = sourceHeight * scale;
            
            pageCtx?.drawImage(
              canvas,
              0, sourceY * scale, // source x, y
              canvas.width, sourceHeight * scale, // source width, height
              0, 0, // dest x, y
              canvas.width, sourceHeight * scale // dest width, height
            );
            
            const pageImgData = pageCanvas.toDataURL('image/png', quality);
            pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, sourceHeight);
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
    filename?: string,
    pageMode: 'single' | 'multi' | 'smart' = 'single'
  ): Promise<void> {
    const exportFilename = filename || 
      `negotiation-strategy-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    return this.exportElementToPDF('executive-dashboard-export', {
      filename: exportFilename,
      quality: 0.95,
      format: 'a4',
      orientation: 'portrait',
      pageMode
    });
  }
}