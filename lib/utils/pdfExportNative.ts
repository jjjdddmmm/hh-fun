import jsPDF from 'jspdf';

export interface NativePDFExportOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export class NativePDFExportService {
  static async exportNegotiationStrategy(
    summary: any,
    issues: any[],
    reportType: string,
    options: NativePDFExportOptions = {}
  ): Promise<void> {
    const {
      filename = `negotiation-strategy-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`,
      format = 'a4',
      orientation = 'portrait'
    } = options;

    try {
      // Create PDF with proper margins
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      });

      // Page dimensions and margins
      const pageWidth = format === 'a4' ? 210 : 216;
      const pageHeight = format === 'a4' ? 297 : 279;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let currentY = margin;

      // Colors matching the brand
      const brandColor = [92, 27, 16]; // #5C1B10
      const lightBrandColor = [140, 60, 40];
      const textColor = [51, 51, 51];
      const lightTextColor = [102, 102, 102];

      // Helper function to add text with automatic page breaks
      const addText = (text: string, x: number, y: number, fontSize: number = 12, color: number[] = textColor, maxWidth?: number) => {
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...color);
        
        if (maxWidth && pdf.getTextWidth(text) > maxWidth) {
          const lines = pdf.splitTextToSize(text, maxWidth);
          lines.forEach((line: string, index: number) => {
            if (y + (index * (fontSize / 2.5)) > pageHeight - margin) {
              pdf.addPage();
              currentY = margin;
              y = currentY;
            }
            pdf.text(line, x, y + (index * (fontSize / 2.5)));
          });
          return y + (lines.length * (fontSize / 2.5));
        } else {
          if (y > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
            y = currentY;
          }
          pdf.text(text, x, y);
          return y + (fontSize / 2.5);
        }
      };

      // Helper function to format currency
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      };

      // Header
      pdf.setFillColor(...brandColor);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setFontSize(24);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Negotiation Strategy Report', margin, 25);
      
      pdf.setFontSize(14);
      pdf.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Inspection Analysis`, margin, 35);

      currentY = 55;

      // Executive Summary Box
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, currentY - 5, contentWidth, 35, 'F');
      pdf.setDrawColor(...lightBrandColor);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, currentY - 5, contentWidth, 35, 'S');

      pdf.setFontSize(16);
      pdf.setTextColor(...brandColor);
      pdf.text('Executive Summary', margin + 5, currentY + 5);

      pdf.setFontSize(12);
      pdf.setTextColor(...textColor);
      pdf.text(`Recommended Ask: ${formatCurrency(summary.recommendedAsk)}`, margin + 5, currentY + 15);
      pdf.text(`Negotiation Strength: ${summary.negotiationStrength.level.replace('_', ' ')}`, margin + 5, currentY + 22);
      pdf.text(`Success Rate: ${summary.successRate}%`, margin + 5, currentY + 29);

      currentY += 50;

      // Issues breakdown
      const criticalIssues = issues.filter((issue: any) => 
        issue.severity === 'critical' || 
        issue.severity === 'safety' || 
        issue.severity === 'urgent' ||
        (issue.severity === 'major' && issue.urgency === 'immediate') ||
        (issue.riskLevel === 'high' && issue.urgency === 'immediate')
      );
      
      const majorIssues = issues.filter((issue: any) => 
        issue.severity === 'major' && 
        issue.urgency !== 'immediate' && 
        issue.riskLevel !== 'high'
      );
      
      const minorIssues = issues.filter((issue: any) => 
        (issue.severity === 'minor' || issue.severity === 'cosmetic') &&
        !majorIssues.some((major: any) => major.id === issue.id) &&
        !criticalIssues.some((critical: any) => critical.id === issue.id)
      );

      // Function to render issue section
      const renderIssueSection = (sectionIssues: any[], title: string, color: number[]) => {
        if (sectionIssues.length === 0) return;

        // Check if we need a new page
        if (currentY > pageHeight - 60) {
          pdf.addPage();
          currentY = margin;
        }

        // Section header
        pdf.setFontSize(16);
        pdf.setTextColor(...color);
        currentY = addText(`${title} (${sectionIssues.length})`, margin, currentY, 16, color);
        currentY += 5;

        // Section total
        const sectionTotal = sectionIssues.reduce((sum, issue) => sum + issue.negotiationValue, 0);
        pdf.setFontSize(12);
        pdf.setTextColor(...lightTextColor);
        currentY = addText(`Total: ${formatCurrency(sectionTotal)}`, margin, currentY, 12, lightTextColor);
        currentY += 8;

        // Issues list
        sectionIssues.forEach((issue, index) => {
          // Check if we need a new page for this issue
          if (currentY > pageHeight - 40) {
            pdf.addPage();
            currentY = margin;
          }

          // Issue item background
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(margin, currentY - 3, contentWidth, 25, 'F');
          }

          // Issue title and location
          pdf.setFontSize(11);
          pdf.setTextColor(...textColor);
          const titleText = `${issue.category} - ${issue.location}`;
          currentY = addText(titleText, margin + 3, currentY + 5, 11, textColor, contentWidth - 60);

          // Issue value (right aligned)
          const valueText = formatCurrency(issue.negotiationValue);
          const valueWidth = pdf.getTextWidth(valueText);
          pdf.setFontSize(11);
          pdf.setTextColor(...brandColor);
          pdf.text(valueText, pageWidth - margin - valueWidth - 3, currentY - 5);

          // Confidence (right aligned, below value)
          const confText = `${Math.round((issue.confidence || 0.75) * 100)}% conf.`;
          const confWidth = pdf.getTextWidth(confText);
          pdf.setFontSize(9);
          pdf.setTextColor(...lightTextColor);
          pdf.text(confText, pageWidth - margin - confWidth - 3, currentY + 2);

          // Issue description
          pdf.setFontSize(9);
          pdf.setTextColor(...lightTextColor);
          currentY = addText(issue.description, margin + 3, currentY + 5, 9, lightTextColor, contentWidth - 60);
          
          currentY += 8;
        });

        currentY += 10;
      };

      // Render all sections
      renderIssueSection(criticalIssues, 'Critical Issues', [220, 38, 127]); // Red
      renderIssueSection(majorIssues, 'Major Issues', [245, 158, 11]); // Orange
      renderIssueSection(minorIssues, 'Minor Issues', [161, 98, 7]); // Yellow

      // Footer on last page
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(...lightTextColor);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
      }

      // Save the PDF
      pdf.save(filename);

    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF. Please try again.');
    }
  }
}