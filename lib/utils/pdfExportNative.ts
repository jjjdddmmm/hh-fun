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

      // Colors matching the app design
      const brandColor = [92, 27, 16]; // #5C1B10
      const brandColorLight = [74, 21, 8]; // #4A1508 (gradient end)
      const white = [255, 255, 255];
      const whiteTransparent = [255, 255, 255, 0.8];
      const criticalColor = [220, 38, 127]; // Red for critical
      const majorColor = [251, 146, 60]; // Orange for major  
      const minorColor = [250, 204, 21]; // Yellow for minor
      const textColor = [51, 51, 51];
      const lightTextColor = [156, 163, 175];

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

      // Create gradient-like header (simulate with multiple rectangles)
      const headerHeight = 70;
      for (let i = 0; i < headerHeight; i++) {
        const ratio = i / headerHeight;
        const r = brandColor[0] + (brandColorLight[0] - brandColor[0]) * ratio;
        const g = brandColor[1] + (brandColorLight[1] - brandColor[1]) * ratio;
        const b = brandColor[2] + (brandColorLight[2] - brandColor[2]) * ratio;
        pdf.setFillColor(r, g, b);
        pdf.rect(0, i, pageWidth, 1, 'F');
      }
      
      // Header content with app-like styling
      pdf.setFontSize(22);
      pdf.setTextColor(...white);
      pdf.text('🎯 Negotiation Strategy', margin, 28);
      
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255, 0.9);
      pdf.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Inspection Analysis`, margin, 42);
      
      // Big recommended ask (more prominent like the app)
      const askText = formatCurrency(summary.recommendedAsk);
      pdf.setFontSize(36);
      pdf.setTextColor(...white);
      const askWidth = pdf.getTextWidth(askText);
      pdf.text(askText, pageWidth - margin - askWidth, 38);
      
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255, 0.8);
      const labelWidth = pdf.getTextWidth('Recommended Ask');
      pdf.text('Recommended Ask', pageWidth - margin - labelWidth, 52);

      currentY = headerHeight + 25;

      // Executive Summary - Key Stats Grid (like the app)
      const cardHeight = 25;
      const cardWidth = (contentWidth - 20) / 3;
      
      // Card 1: Negotiation Strength
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, currentY, cardWidth, cardHeight, 'DF');
      
      pdf.setFontSize(12);
      pdf.setTextColor(...textColor);
      pdf.text('Negotiation Strength', margin + 5, currentY + 8);
      pdf.setFontSize(16);
      pdf.setTextColor(...brandColor);
      pdf.text(summary.negotiationStrength.level.replace('_', ' '), margin + 5, currentY + 18);
      
      // Card 2: Success Rate  
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin + cardWidth + 10, currentY, cardWidth, cardHeight, 'DF');
      
      pdf.setFontSize(12);
      pdf.setTextColor(...textColor);
      pdf.text('Success Rate', margin + cardWidth + 15, currentY + 8);
      pdf.setFontSize(16);
      pdf.setTextColor(...brandColor);
      pdf.text(`${summary.successRate}%`, margin + cardWidth + 15, currentY + 18);
      
      // Card 3: Total Issues
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin + (cardWidth + 10) * 2, currentY, cardWidth, cardHeight, 'DF');
      
      pdf.setFontSize(12);
      pdf.setTextColor(...textColor);
      pdf.text('Total Issues', margin + (cardWidth + 10) * 2 + 5, currentY + 8);
      pdf.setFontSize(16);
      pdf.setTextColor(...brandColor);
      pdf.text(`${issues.length}`, margin + (cardWidth + 10) * 2 + 5, currentY + 18);

      currentY += cardHeight + 25;

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

      // Function to render issue section with app-like styling
      const renderIssueSection = (sectionIssues: any[], title: string, bgColor: number[], textColor: number[], borderColor: number[]) => {
        if (sectionIssues.length === 0) return;

        // Check if we need a new page
        if (currentY > pageHeight - 100) {
          pdf.addPage();
          currentY = margin;
        }

        // Add spacing before section
        currentY += 15;

        // Section header with colored background (like app cards)
        const sectionHeaderHeight = 40;
        pdf.setFillColor(...bgColor);
        pdf.setDrawColor(...borderColor);
        pdf.setLineWidth(1);
        pdf.rect(margin, currentY, contentWidth, sectionHeaderHeight, 'DF');

        // Section icon and title
        const icon = title.includes('Critical') ? '⚠️' : title.includes('Major') ? '🛡️' : '🕐';
        pdf.setFontSize(16);
        pdf.setTextColor(...white);
        pdf.text(`${icon} ${title} (${sectionIssues.length})`, margin + 12, currentY + 16);

        // Section total (right aligned) 
        const sectionTotal = sectionIssues.reduce((sum, issue) => sum + issue.negotiationValue, 0);
        const totalText = formatCurrency(sectionTotal);
        const totalWidth = pdf.getTextWidth(totalText);
        pdf.setFontSize(18);
        pdf.setTextColor(...white);
        pdf.text(totalText, pageWidth - margin - totalWidth - 12, currentY + 16);
        
        pdf.setFontSize(9);
        pdf.setTextColor(...white);
        const labelWidth = pdf.getTextWidth('Total');
        pdf.text('Total', pageWidth - margin - labelWidth - 12, currentY + 28);

        currentY += sectionHeaderHeight + 5;

        // Issues list with better spacing
        sectionIssues.forEach((issue, index) => {
          // Check if we need a new page for this issue
          if (currentY > pageHeight - 60) {
            pdf.addPage();
            currentY = margin;
          }

          const itemHeight = 35;
          
          // Issue item background with subtle alternating colors
          if (index % 2 === 0) {
            pdf.setFillColor(255, 255, 255);
          } else {
            pdf.setFillColor(249, 250, 251);
          }
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.5);
          pdf.rect(margin, currentY, contentWidth, itemHeight, 'DF');

          // Issue category and location (bold)
          pdf.setFontSize(12);
          pdf.setTextColor(...textColor);
          const titleText = `${issue.category} - ${issue.location}`;
          pdf.text(titleText, margin + 10, currentY + 12);

          // Issue value (right aligned, prominent)
          const valueText = formatCurrency(issue.negotiationValue);
          const valueWidth = pdf.getTextWidth(valueText);
          pdf.setFontSize(14);
          pdf.setTextColor(...brandColor);
          pdf.text(valueText, pageWidth - margin - valueWidth - 10, currentY + 12);

          // Confidence (right aligned, below value)
          const confText = `${Math.round((issue.confidence || 0.75) * 100)}% conf.`;
          const confWidth = pdf.getTextWidth(confText);
          pdf.setFontSize(9);
          pdf.setTextColor(...lightTextColor);
          pdf.text(confText, pageWidth - margin - confWidth - 10, currentY + 24);

          // Issue description (wraps properly with more space)
          pdf.setFontSize(10);
          pdf.setTextColor(...lightTextColor);
          const descWidth = contentWidth - valueWidth - 40;
          const descLines = pdf.splitTextToSize(issue.description, descWidth);
          pdf.text(descLines[0] || '', margin + 10, currentY + 24);
          
          currentY += itemHeight + 3;
        });

        currentY += 15;
      };

      // Render all sections with app-like styling
      renderIssueSection(criticalIssues, 'Critical Issues', 
        [153, 27, 27], // bg-red-900/30 equivalent
        [252, 165, 165], // text-red-300 equivalent  
        [220, 38, 38] // border-red-600
      );
      
      renderIssueSection(majorIssues, 'Major Issues',
        [154, 52, 18], // bg-orange-900/30 equivalent
        [253, 186, 116], // text-orange-300 equivalent
        [234, 88, 12] // border-orange-600  
      );
      
      renderIssueSection(minorIssues, 'Minor Issues',
        [133, 77, 14], // bg-yellow-900/30 equivalent
        [253, 224, 71], // text-yellow-300 equivalent
        [202, 138, 4] // border-yellow-600
      );

      // Add negotiation strategy summary with better styling
      if (currentY > pageHeight - 100) {
        pdf.addPage();
        currentY = margin;
      }

      currentY += 25;
      
      // Strategic summary box with app-like styling
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(1);
      pdf.rect(margin, currentY, contentWidth, 50, 'DF');
      
      pdf.setFontSize(14);
      pdf.setTextColor(...brandColor);
      pdf.text('💡 Strategic Recommendation', margin + 12, currentY + 16);
      
      pdf.setFontSize(11);
      pdf.setTextColor(...textColor);
      const totalHighPriority = criticalIssues.length + majorIssues.length;
      const totalHighValue = [...criticalIssues, ...majorIssues].reduce((sum, issue) => sum + issue.negotiationValue, 0);
      
      const line1 = `Lead with the ${totalHighPriority} high-priority issues above. These represent ${formatCurrency(totalHighValue)} in`;
      const line2 = 'well-documented problems that require immediate attention and provide the strongest';
      const line3 = `negotiation position. Your ${summary.negotiationStrength.level.toLowerCase().replace('_', ' ')} position supports this ${formatCurrency(summary.recommendedAsk)} ask.`;
      
      pdf.text(line1, margin + 12, currentY + 26);
      pdf.text(line2, margin + 12, currentY + 34);
      pdf.text(line3, margin + 12, currentY + 42);

      // Clean professional footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Footer background
        pdf.setFillColor(249, 250, 251);
        pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        
        pdf.setFontSize(8);
        pdf.setTextColor(...lightTextColor);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 15, pageHeight - 5);
        pdf.text(`Generated ${new Date().toLocaleDateString()}`, margin, pageHeight - 5);
      }

      // Save the PDF
      pdf.save(filename);

    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF. Please try again.');
    }
  }
}