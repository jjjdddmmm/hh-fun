"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  MessageCircle, 
  Copy, 
  Edit3,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  User,
  Building
} from "lucide-react";
import { PrioritizedIssue } from "./IssuePrioritization";

interface NegotiationScript {
  id: string;
  type: 'email' | 'verbal' | 'formal_letter';
  scenario: 'opening_position' | 'counter_offer' | 'final_position' | 'follow_up';
  title: string;
  description: string;
  template: string;
  tone: 'professional' | 'friendly' | 'firm' | 'collaborative';
}

interface ScriptVariables {
  agentName: string;
  sellerName: string;
  propertyAddress: string;
  totalAsk: number;
  topIssues: PrioritizedIssue[];
  inspectionDate: string;
  closingDate: string;
}

interface NegotiationScriptsProps {
  issues: PrioritizedIssue[];
  enabledIssues: Set<string>;
  totalAsk: number;
}

export function NegotiationScripts({ 
  issues, 
  enabledIssues,
  totalAsk 
}: NegotiationScriptsProps) {
  const [selectedScript, setSelectedScript] = useState<string>('opening_email');
  const [customizedScript, setCustomizedScript] = useState<string>('');
  const [variables, setVariables] = useState<ScriptVariables>({
    agentName: '',
    sellerName: '',
    propertyAddress: '',
    totalAsk,
    topIssues: issues.filter(issue => enabledIssues.has(issue.id)).slice(0, 3),
    inspectionDate: new Date().toLocaleDateString(),
    closingDate: ''
  });
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const scripts: NegotiationScript[] = [
    {
      id: 'opening_email',
      type: 'email',
      scenario: 'opening_position',
      title: 'Opening Position Email',
      description: 'Professional email to present your initial credit request',
      tone: 'professional',
      template: `Subject: Inspection Credit Request - {{propertyAddress}}

Hi {{agentName}},

I hope this email finds you well. Following our inspection on {{inspectionDate}}, we've completed a thorough review of the findings and would like to discuss credit adjustments.

Our inspector identified several items that require attention, and we've obtained current market pricing for the necessary repairs. Based on this analysis, we're requesting a credit of {{totalAsk}} to address the most significant issues.

**Key Issues Requiring Immediate Attention:**

{{#topIssues}}
• **{{category}}** ({{location}}): {{description}}
  - Estimated Cost: {{negotiationValue}}
  - {{whatToSay}}

{{/topIssues}}

These estimates reflect current contractor rates in our local market. We've prioritized items that affect safety, structural integrity, and major building systems.

We believe this credit request is fair and reasonable given the scope of work required. We're open to discussing the details and look forward to working together toward a mutually acceptable resolution.

Please let me know when you're available to discuss this further.

Best regards,
[Your Name]

---
*This request is based on professional inspection findings dated {{inspectionDate}}*`
    },
    {
      id: 'counter_offer',
      type: 'email',
      scenario: 'counter_offer',
      title: 'Counter-Offer Response',
      description: 'Response when sellers counter with a lower amount',
      tone: 'collaborative',
      template: `Subject: Re: Inspection Credit Request - {{propertyAddress}}

Hi {{agentName}},

Thank you for getting back to me regarding our credit request. I appreciate {{sellerName}}'s willingness to address these items.

While I understand their position on the {{totalAsk}} request, I'd like to share some additional context on why these items warrant the full credit amount:

**Critical Safety & Code Issues (Cannot be deferred):**
{{#topIssues}}
{{#if (eq severity 'safety')}}
• {{category}}: {{negotiationValue}} - This creates liability concerns and must be addressed before closing per local building codes.
{{/if}}
{{/topIssues}}

**Major System Repairs (Time-sensitive):**
{{#topIssues}}
{{#if (eq severity 'major')}}
• {{category}}: {{negotiationValue}} - Current market rates reflect post-pandemic pricing increases.
{{/if}}
{{/topIssues}}

I'm willing to work toward a solution that addresses both parties' concerns. Could we meet in the middle at {{reducedAsk}}? This would cover the most critical items while showing good faith on our part.

Alternatively, if {{sellerName}} prefers to handle some repairs directly, we could discuss having the safety items professionally completed before closing, with credits for the remaining items.

I'm confident we can find a path forward that works for everyone. When would be a good time to discuss?

Best regards,
[Your Name]`
    },
    {
      id: 'final_position',
      type: 'email',
      scenario: 'final_position',
      title: 'Final Position Statement',
      description: 'Clear communication of your walk-away position',
      tone: 'firm',
      template: `Subject: Final Position - Inspection Credits for {{propertyAddress}}

Hi {{agentName}},

After careful consideration of our previous discussions, I need to provide clarity on our final position regarding the inspection credit request.

**Our minimum acceptable credit amount is {{minimumAcceptable}}.**

This covers only the most critical items that cannot be deferred:

{{#topIssues}}
{{#if (eq dropPriority 'never')}}
• {{category}} ({{negotiationValue}}): {{description}}
  Required for: {{evidence[0]}}
{{/if}}
{{/topIssues}}

We've already removed several items from our original request as a show of good faith. However, these remaining items represent genuine safety and structural concerns that will cost significantly more to address after closing.

**Why this position is firm:**
- These are not cosmetic issues but functional problems
- Current contractor availability and pricing support these estimates  
- Deferring these repairs creates liability and increased costs
- Our financing requires these items to be resolved

We remain committed to this transaction and hope {{sellerName}} will see the reasonableness of this final request. If we can reach agreement on {{minimumAcceptable}}, we're ready to move forward to closing.

Please let me know {{sellerName}}'s decision by [DATE] so we can finalize our agreement.

Thank you for your continued assistance in this matter.

Best regards,
[Your Name]`
    },
    {
      id: 'verbal_talking_points',
      type: 'verbal',
      scenario: 'opening_position',
      title: 'Phone Conversation Script',
      description: 'Key talking points for phone discussions',
      tone: 'friendly',
      template: `**Opening the Conversation:**
"Hi {{agentName}}, thanks for taking my call. I wanted to discuss the inspection findings for {{propertyAddress}} and talk through our credit request."

**Present the Big Picture:**
"We've identified {{totalIssues}} items totaling {{totalAsk}} in necessary repairs. I want to walk you through our thinking on the most significant ones."

**Key Talking Points:**

**Safety Issues (Lead with these):**
{{#topIssues}}
{{#if (eq severity 'safety')}}
• "The {{category}} issue is a safety concern that affects habitability. {{whatToSay}} Current market rate for this repair is {{negotiationValue}}."
{{/if}}
{{/topIssues}}

**Major Systems:**
{{#topIssues}}
{{#if (eq severity 'major')}}
• "For the {{category}}, {{whatToSay}} We're seeing {{negotiationValue}} as the going rate with local contractors."
{{/if}}
{{/topIssues}}

**Address Common Objections:**

*If they say "That seems high":*
"I understand it may seem substantial. These are current market rates, and we've actually been conservative in our estimates. Would it help if I share the contractor quotes we've received?"

*If they want to negotiate down:*
"We're reasonable people and want this transaction to work. The safety items are non-negotiable, but we could discuss some flexibility on the other repairs if needed."

**Closing the Conversation:**
"What's the best way to present this to {{sellerName}}? I'm happy to provide additional documentation or contractor references if that would be helpful."

**Follow-up:**
"When do you think we might hear back? We're committed to this property and want to work together on a solution."`
    }
  ];

  const generateScript = (template: string, vars: ScriptVariables): string => {
    let result = template;
    
    // Simple template replacement
    result = result.replace(/\{\{agentName\}\}/g, vars.agentName || '[Agent Name]');
    result = result.replace(/\{\{sellerName\}\}/g, vars.sellerName || '[Seller Name]');
    result = result.replace(/\{\{propertyAddress\}\}/g, vars.propertyAddress || '[Property Address]');
    result = result.replace(/\{\{totalAsk\}\}/g, formatCurrency(vars.totalAsk));
    result = result.replace(/\{\{inspectionDate\}\}/g, vars.inspectionDate);
    result = result.replace(/\{\{closingDate\}\}/g, vars.closingDate || '[Closing Date]');
    result = result.replace(/\{\{minimumAcceptable\}\}/g, formatCurrency(Math.round(vars.totalAsk * 0.8)));
    result = result.replace(/\{\{reducedAsk\}\}/g, formatCurrency(Math.round(vars.totalAsk * 0.9)));
    result = result.replace(/\{\{totalIssues\}\}/g, vars.topIssues.length.toString());
    
    // Handle issue loops (simplified)
    const topIssuesSection = result.match(/\{\{#topIssues\}\}([\s\S]*?)\{\{\/topIssues\}\}/);
    if (topIssuesSection) {
      const template = topIssuesSection[1];
      let issuesText = '';
      
      vars.topIssues.forEach(issue => {
        let issueText = template;
        issueText = issueText.replace(/\{\{category\}\}/g, issue.category);
        issueText = issueText.replace(/\{\{location\}\}/g, issue.location);
        issueText = issueText.replace(/\{\{description\}\}/g, issue.description);
        issueText = issueText.replace(/\{\{negotiationValue\}\}/g, formatCurrency(issue.negotiationValue));
        issueText = issueText.replace(/\{\{whatToSay\}\}/g, issue.whatToSay);
        issueText = issueText.replace(/\{\{evidence\[0\]\}\}/g, issue.evidence[0] || 'Safety/code requirement');
        
        // Simple conditional handling
        if (issue.severity === 'safety') {
          issueText = issueText.replace(/\{\{#if \(eq severity 'safety'\)\}\}/g, '');
          issueText = issueText.replace(/\{\{\/if\}\}/g, '');
        } else {
          issueText = issueText.replace(/\{\{#if \(eq severity 'safety'\)\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }
        
        if (issue.severity === 'major') {
          issueText = issueText.replace(/\{\{#if \(eq severity 'major'\)\}\}/g, '');
          issueText = issueText.replace(/\{\{\/if\}\}/g, '');
        } else {
          issueText = issueText.replace(/\{\{#if \(eq severity 'major'\)\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }
        
        if (issue.dropPriority === 'never') {
          issueText = issueText.replace(/\{\{#if \(eq dropPriority 'never'\)\}\}/g, '');
          issueText = issueText.replace(/\{\{\/if\}\}/g, '');
        } else {
          issueText = issueText.replace(/\{\{#if \(eq dropPriority 'never'\)\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }
        
        issuesText += issueText;
      });
      
      result = result.replace(/\{\{#topIssues\}\}[\s\S]*?\{\{\/topIssues\}\}/g, issuesText);
    }
    
    return result;
  };

  const handleScriptSelect = (scriptId: string) => {
    setSelectedScript(scriptId);
    const script = scripts.find(s => s.id === scriptId);
    if (script) {
      const generated = generateScript(script.template, variables);
      setCustomizedScript(generated);
    }
  };

  const handleVariableChange = (key: keyof ScriptVariables, value: string | number) => {
    const newVariables = { ...variables, [key]: value };
    setVariables(newVariables);
    
    // Regenerate script with new variables
    const script = scripts.find(s => s.id === selectedScript);
    if (script) {
      const generated = generateScript(script.template, newVariables);
      setCustomizedScript(generated);
    }
  };

  const copyToClipboard = async (text: string, scriptId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(scriptId);
      setTimeout(() => setCopiedScript(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Initialize with first script
  if (!customizedScript && scripts.length > 0) {
    setTimeout(() => handleScriptSelect(scripts[0].id), 100);
  }

  const currentScript = scripts.find(s => s.id === selectedScript);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#5C1B10]" />
          Negotiation Script Generator
        </CardTitle>
        <p className="text-gray-600">
          Professional templates customized with your specific issues and details
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Script Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Choose Template</h3>
            {scripts.map(script => (
              <div
                key={script.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedScript === script.id 
                    ? 'border-[#5C1B10] bg-[#5C1B10]/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleScriptSelect(script.id)}
              >
                <div className="flex items-start gap-2 mb-2">
                  {script.type === 'email' && <Mail className="h-4 w-4 text-gray-500 mt-0.5" />}
                  {script.type === 'verbal' && <Phone className="h-4 w-4 text-gray-500 mt-0.5" />}
                  {script.type === 'formal_letter' && <FileText className="h-4 w-4 text-gray-500 mt-0.5" />}
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">
                      {script.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {script.description}
                    </p>
                    <Badge 
                      variant="outline" 
                      className="mt-2 text-xs"
                    >
                      {script.tone}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            {/* Variables Input */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Customize Details</h3>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Agent Name</label>
                <Input
                  value={variables.agentName}
                  onChange={(e) => handleVariableChange('agentName', e.target.value)}
                  placeholder="Enter agent's name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Seller Name</label>
                <Input
                  value={variables.sellerName}
                  onChange={(e) => handleVariableChange('sellerName', e.target.value)}
                  placeholder="Enter seller's name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Property Address</label>
                <Input
                  value={variables.propertyAddress}
                  onChange={(e) => handleVariableChange('propertyAddress', e.target.value)}
                  placeholder="Enter property address"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Closing Date</label>
                <Input
                  type="date"
                  value={variables.closingDate}
                  onChange={(e) => handleVariableChange('closingDate', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Generated Script */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Generated Script</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(customizedScript, selectedScript)}
                  className="flex items-center gap-2"
                >
                  {copiedScript === selectedScript ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedScript === selectedScript ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-2">
                {currentScript?.type === 'email' && <Mail className="h-4 w-4 text-gray-500" />}
                {currentScript?.type === 'verbal' && <Phone className="h-4 w-4 text-gray-500" />}
                {currentScript?.type === 'formal_letter' && <FileText className="h-4 w-4 text-gray-500" />}
                <span className="text-sm font-medium text-gray-700">
                  {currentScript?.title}
                </span>
                <Badge variant="outline" className="text-xs">
                  {currentScript?.tone}
                </Badge>
              </div>
              
              <div className="p-4">
                <Textarea
                  value={customizedScript}
                  onChange={(e) => setCustomizedScript(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Select a template to generate your script..."
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Always lead with safety issues - they carry the most weight</li>
                <li>• Include specific cost estimates and evidence for credibility</li>
                <li>• Leave room for negotiation by starting 15-20% above your target</li>
                <li>• Be prepared to drop minor issues to show good faith</li>
                <li>• Follow up within 24-48 hours of sending your request</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}