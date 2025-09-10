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
      
      // Add PDF-specific styling for better readability and proper text wrapping
      const pdfStyleSheet = document.createElement('style');
      pdfStyleSheet.id = 'pdf-export-styles';
      pdfStyleSheet.textContent = `
        #executive-dashboard-export {
          font-size: 14px !important;
          line-height: 1.5 !important;
          width: 800px !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 20px !important;
          box-sizing: border-box !important;
        }
        #executive-dashboard-export * {
          word-wrap: break-word !important;
          word-break: break-word !important;
          white-space: normal !important;
        }
        #executive-dashboard-export h1,
        #executive-dashboard-export h2,
        #executive-dashboard-export h3 {
          font-size: 18px !important;
          margin-bottom: 12px !important;
          line-height: 1.3 !important;
        }
        #executive-dashboard-export h4 {
          font-size: 16px !important;
          margin-bottom: 8px !important;
          line-height: 1.3 !important;
        }
        #executive-dashboard-export p {
          font-size: 14px !important;
          margin-bottom: 8px !important;
          line-height: 1.4 !important;
        }
        #executive-dashboard-export .text-xs {
          font-size: 12px !important;
        }
        #executive-dashboard-export .text-sm {
          font-size: 13px !important;
        }
        #executive-dashboard-export .text-lg {
          font-size: 16px !important;
        }
        #executive-dashboard-export .text-xl {
          font-size: 18px !important;
        }
        #executive-dashboard-export .text-2xl {
          font-size: 20px !important;
        }
        #executive-dashboard-export .text-6xl {
          font-size: 32px !important;
        }
        #executive-dashboard-export .grid {
          display: block !important;
        }
        #executive-dashboard-export .grid > div {
          margin-bottom: 16px !important;
        }
        #executive-dashboard-export .flex {
          display: block !important;
        }
        #executive-dashboard-export .flex > div {
          margin-bottom: 8px !important;
        }
        #executive-dashboard-export .truncate {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        #executive-dashboard-export .line-clamp-2 {
          -webkit-line-clamp: unset !important;
          display: block !important;
          white-space: normal !important;
        }
      `;
      document.head.appendChild(pdfStyleSheet);
      
      // Wait a moment for styles to apply and animations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create canvas from the element with optimized settings
      const canvas = await html2canvas(element, {
        scale: 2, // Reduced for smaller file size while maintaining quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#5C1B10', // Solid background instead of gradient for smaller file
        logging: false,
        width: 800,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        removeContainer: true, // Clean up temporary containers
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
      
      // Convert to JPEG for smaller file size with good quality
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // 85% quality JPEG instead of PNG
      
      let pdf: jsPDF;
      
      if (pageMode === 'single') {
        // Single long page - no page breaks, infinite scroll
        pdf = new jsPDF({
          orientation,
          unit: 'mm',
          format: [imgWidth + (margin * 2), imgHeight + (margin * 2)] // Custom page size to fit content
        });
        
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
        
      } else if (pageMode === 'smart') {
        // Smart page breaks - try to break at natural content boundaries
        if (imgHeight <= standardPageHeight) {
          pdf = new jsPDF({ orientation, unit: 'mm', format });
          pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
        } else {
          // Create custom page size for long content
          pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format: [imgWidth + (margin * 2), Math.min(imgHeight + (margin * 2), 2000)] // Cap at reasonable height
          });
          pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
        }
        
      } else {
        // Multi-page mode - improved to avoid harsh cutoffs
        pdf = new jsPDF({ orientation, unit: 'mm', format });
        
        if (imgHeight <= standardPageHeight) {
          // Single page
          pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
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
            
            const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.85);
            pdf.addImage(pageImgData, 'JPEG', margin, margin, imgWidth, sourceHeight);
          }
        }
      }

      // Download the PDF
      pdf.save(filename);
      
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF. Please try again.');
    } finally {
      // Clean up PDF-specific styles
      const pdfStyles = document.getElementById('pdf-export-styles');
      if (pdfStyles) {
        pdfStyles.remove();
      }
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