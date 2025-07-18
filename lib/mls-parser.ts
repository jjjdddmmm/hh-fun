// Clean MLS URL parser - extracts property identifiers from various MLS URLs

export interface MLSUrlInfo {
  platform: 'zillow' | 'realtor' | 'redfin' | 'unknown';
  zpid?: string;
  propertyId?: string;
  url: string;
}

export function parseMLSUrl(url: string): MLSUrlInfo {
  const cleanUrl = url.trim();
  
  // Zillow patterns
  const zillowPatterns = [
    /\/(\d+)_zpid/,           // Standard: /12345_zpid/
    /zpid[_-](\d+)/,          // zpid_12345 or zpid-12345
    /\/(\d{8,})\/?$/,         // Long number at end
  ];
  
  if (/zillow\.com/i.test(cleanUrl)) {
    for (const pattern of zillowPatterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        return {
          platform: 'zillow',
          zpid: match[1],
          url: cleanUrl
        };
      }
    }
    return { platform: 'zillow', url: cleanUrl };
  }
  
  // Realtor.com patterns
  if (/realtor\.com/i.test(cleanUrl)) {
    const realtorPattern = /realestateandhomes-detail\/([^\/]+)/;
    const match = cleanUrl.match(realtorPattern);
    return {
      platform: 'realtor',
      propertyId: match?.[1],
      url: cleanUrl
    };
  }
  
  // Redfin patterns
  if (/redfin\.com/i.test(cleanUrl)) {
    const redfinPattern = /\/home\/(\d+)/;
    const match = cleanUrl.match(redfinPattern);
    return {
      platform: 'redfin',
      propertyId: match?.[1],
      url: cleanUrl
    };
  }
  
  return { platform: 'unknown', url: cleanUrl };
}

export function extractZpidFromUrl(url: string): string | null {
  const parsed = parseMLSUrl(url);
  return parsed.zpid || null;
}