"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  Copy, 
  Edit3,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  User,
  Building,
  RefreshCw,
  ArrowRight,
  Users,
  UserCheck,
  Lightbulb,
  Shield,
  TrendingUp,
  Clock,
  BarChart3,
  Target
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

type ConversationContext = 'seller_agent' | 'buyer_agent' | 'seller_direct';
type ConversationStage = 'initial' | 'response_analysis' | 'follow_up';

interface ScriptVariables {
  agentName: string;
  sellerName: string;
  propertyAddress: string;
  totalAsk: number;
  topIssues: PrioritizedIssue[];
  inspectionDate: string;
  closingDate: string;
  conversationContext: ConversationContext;
}

interface ConversationFlow {
  stage: ConversationStage;
  initialMessage?: string;
  theirResponse?: string;
  responseAnalysis?: {
    tone: 'receptive' | 'resistant' | 'neutral';
    objections: string[];
    counterOffer?: number;
    concerns: string[];
  };
}

interface NegotiationScriptsProps {
  issues: PrioritizedIssue[];
  enabledIssues: Set<string>;
  totalAsk: number;
  propertyAddress?: string;
  inspectionDate?: string;
  reportTypes?: string[];
}

export function NegotiationScripts({ 
  issues, 
  enabledIssues,
  totalAsk,
  propertyAddress = '[Property Address]',
  inspectionDate = '[Inspection Date]',
  reportTypes = []
}: NegotiationScriptsProps) {
  const [selectedScript, setSelectedScript] = useState<string>('opening_email');
  const [customizedScript, setCustomizedScript] = useState<string>('');
  const [variables, setVariables] = useState<ScriptVariables>({
    agentName: '',
    sellerName: '',
    propertyAddress: '[Property Address]',
    totalAsk,
    topIssues: issues.filter(issue => enabledIssues.has(issue.id)).slice(0, 3),
    inspectionDate: '[Inspection Date]',
    closingDate: '',
    conversationContext: 'buyer_agent'
  });
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [conversationFlow, setConversationFlow] = useState<ConversationFlow>({
    stage: 'initial'
  });
  const [activeTab, setActiveTab] = useState<string>('templates');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get context-aware opening email templates only
  const getOpeningEmailTemplate = (): NegotiationScript => {
    const template = {
      id: 'opening_email',
      type: 'email' as const,
      scenario: 'opening_position' as const,
      title: variables.conversationContext === 'seller_agent' 
        ? 'Opening Email to Seller\'s Agent' 
        : variables.conversationContext === 'buyer_agent'
        ? 'Strategy Email to Your Agent'
        : 'Direct Email to Seller',
      description: variables.conversationContext === 'seller_agent' 
        ? 'Professional request with clear documentation'
        : variables.conversationContext === 'buyer_agent'
        ? 'Strategic planning with your representative'
        : 'Respectful direct communication',
      tone: variables.conversationContext === 'seller_agent' ? 'professional' as const : 'collaborative' as const,
        template: variables.conversationContext === 'seller_agent' 
          ? `Subject: Inspection Credit Request - {{propertyAddress}}

Dear {{agentName}},

Following our recent inspection on {{inspectionDate}}, I'm writing to formally request credits for necessary repairs identified in the inspection report.

═══════════════════════════════════════════════════
TOTAL CREDIT REQUEST: {{totalAsk}}
═══════════════════════════════════════════════════

INSPECTION FINDINGS SUMMARY:
──────────────────────────────────────────────────
{{#topIssues}}
▸ {{category}} - {{location}}
  - Issue: {{description}}
  - Cost: {{negotiationValue}}
  - Why: {{whatToSay}}

{{/topIssues}}

SUPPORTING INFORMATION:
──────────────────────────────────────────────────
▸ All estimates based on current local contractor rates
▸ Focus on safety, structural, and major system issues only
▸ Cosmetic items excluded from this request
▸ Full inspection report available for review

NEXT STEPS:
──────────────────────────────────────────────────
I'm available to discuss this request at your convenience. Please let me know if you need any additional documentation or contractor quotes to support these estimates.

Thank you for your attention to this matter.

Best regards,
[Your Name]
[Phone Number]`
          : variables.conversationContext === 'buyer_agent'
          ? `Subject: Negotiation Strategy - {{propertyAddress}}

Hi {{agentName}},

I've reviewed the inspection findings and need your expertise on positioning our credit request.

═══════════════════════════════════════════════════
TARGET CREDIT REQUEST: {{totalAsk}}
═══════════════════════════════════════════════════

PRIORITY ISSUES FOR NEGOTIATION:
──────────────────────────────────────────────────
NON-NEGOTIABLE (Safety/Structural):
{{#topIssues}}
{{#if (eq severity 'safety')}}
▸ {{category}}: {{negotiationValue}}
  - Description: {{description}}
  - Leverage: {{whatToSay}}

{{/if}}
{{/topIssues}}

NEGOTIABLE (System/Maintenance):
{{#topIssues}}
{{#if (ne severity 'safety')}}
▸ {{category}}: {{negotiationValue}}
  - Description: {{description}}
  - Position: {{whatToSay}}

{{/if}}
{{/topIssues}}

Let me know when we can connect to finalize our approach.

Best,
[Your Name]`
          : `Subject: Property Inspection Findings - {{propertyAddress}}

Dear {{sellerName}},

I hope this message finds you well. Following our recent inspection of your property, I wanted to discuss some findings that require attention.

═══════════════════════════════════════════════════
REQUESTED CREDIT AMOUNT: {{totalAsk}}
═══════════════════════════════════════════════════

KEY FINDINGS:
──────────────────────────────────────────────────
{{#topIssues}}
▸ {{category}} - {{location}}
  - Concern: {{description}}
  - Estimated Repair: {{negotiationValue}}

{{/topIssues}}

These items were identified by a licensed inspector and estimates are from local contractors. I believe addressing these through a credit at closing would be the most efficient solution for both of us.

I'm committed to moving forward with this purchase and hope we can work together on a fair resolution.

Please feel free to contact me directly to discuss.

Warm regards,
[Your Name]
[Phone Number]`
    };
    return template;
  };

  const scripts = [getOpeningEmailTemplate()];

  // Response analysis function
  const analyzeResponse = (response: string) => {
    const lowerResponse = response.toLowerCase();
    
    // Simple sentiment analysis
    const resistantWords = ['no', 'cannot', 'refuse', 'decline', 'impossible', 'unreasonable', 'excessive'];
    const receptiveWords = ['yes', 'consider', 'discuss', 'reasonable', 'fair', 'willing', 'acceptable'];
    
    const resistantCount = resistantWords.filter(word => lowerResponse.includes(word)).length;
    const receptiveCount = receptiveWords.filter(word => lowerResponse.includes(word)).length;
    
    let tone: 'receptive' | 'resistant' | 'neutral';
    if (receptiveCount > resistantCount) tone = 'receptive';
    else if (resistantCount > receptiveCount) tone = 'resistant';
    else tone = 'neutral';
    
    // Extract potential objections
    const objections: string[] = [];
    if (lowerResponse.includes('too high') || lowerResponse.includes('excessive')) {
      objections.push('Price concern - thinks amount is too high');
    }
    if (lowerResponse.includes('market rate') || lowerResponse.includes('contractor')) {
      objections.push('Questioning cost estimates');
    }
    if (lowerResponse.includes('minor') || lowerResponse.includes('cosmetic')) {
      objections.push('Dismissing issues as minor');
    }
    
    // Look for counter offers (simple regex)
    const counterMatch = response.match(/\$([0-9,]+)/);
    const counterOffer = counterMatch ? parseInt(counterMatch[1].replace(/,/g, '')) : undefined;
    
    return {
      tone,
      objections,
      counterOffer,
      concerns: objections // simplified for now
    };
  };

  // Generate response based on analysis
  const generateResponseScript = (analysis: NonNullable<ConversationFlow['responseAnalysis']>) => {
    const baseTemplate = variables.conversationContext === 'seller_agent'
      ? `Subject: Re: Inspection Credit Request - {{propertyAddress}}

Hi {{agentName}},

Thank you for the response. I've reviewed {{sellerName}}'s feedback on our credit request.

**Addressing Your Concerns:**

{{#objections}}
• {{objection}} - {{response}}
{{/objections}}

**Our Position:**
Based on the {{tone}} nature of your response, I believe we can find common ground. ${analysis.counterOffer ? `While I appreciate the {{counterOffer}} counter-offer, ` : ''}Let me provide additional context on our most critical items:

{{#topIssues}}
• **{{category}}**: {{negotiationValue}} - {{whatToSay}}
{{/topIssues}}

**Next Steps:**
${analysis.tone === 'receptive' ? 'Since you seem open to discussion, shall we schedule a call to work through the details?' : analysis.tone === 'resistant' ? 'I understand your position. Could we focus on just the safety-critical items as a compromise?' : 'I\'d like to better understand your concerns. Could we discuss this further?'}

Best regards,
[Your Name]`
      : `Hi {{agentName}},

Just got their response. Here's what I'm seeing:

**Their Tone:** ${analysis.tone.charAt(0).toUpperCase() + analysis.tone.slice(1)}

**Their Objections:**
${analysis.objections.map(obj => `• ${obj}`).join('\n')}

${analysis.counterOffer ? `**Their Counter:** $${analysis.counterOffer.toLocaleString()}\n\n` : ''}**My Read:**
${analysis.tone === 'receptive' ? 'They seem open to negotiation. I think we can work with this.' : analysis.tone === 'resistant' ? 'They\'re pushing back hard. We may need to focus on just our must-haves.' : 'Mixed signals. Let\'s see if we can clarify their position.'}

**Suggested Response Strategy:**
1. ${analysis.tone === 'receptive' ? 'Acknowledge their willingness to work with us' : 'Address their main concerns head-on'}
2. Re-emphasize our strongest points (safety issues)
3. ${analysis.counterOffer ? 'Counter their counter with our compromise number' : 'Offer a middle ground'}

What do you think? Should I proceed with this approach?

Thanks,
[Your Name]`;
    
    return baseTemplate;
  };

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

  const handleVariableChange = (key: keyof ScriptVariables, value: string | number | ConversationContext) => {
    const newVariables = { ...variables, [key]: value };
    setVariables(newVariables);
    
    // Regenerate script with new variables
    const script = getOpeningEmailTemplate();
    if (script) {
      const generated = generateScript(script.template, newVariables);
      setCustomizedScript(generated);
    }
  };

  const handleResponseAnalysis = () => {
    if (!conversationFlow.theirResponse) return;
    
    const analysis = analyzeResponse(conversationFlow.theirResponse);
    const responseScript = generateResponseScript(analysis);
    
    setConversationFlow({
      ...conversationFlow,
      stage: 'response_analysis',
      responseAnalysis: analysis
    });
    
    setCustomizedScript(generateScript(responseScript, variables));
    setActiveTab('response');
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
    <div className="space-y-6">
            {/* Conversation Context Selector */}
            <Card className="bg-gray-50 border-2 border-gray-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Users className="h-5 w-5 text-gray-600" />
                    <label className="text-sm font-medium text-gray-900">Who are you communicating with?</label>
                  </div>
                  <Select
                    value={variables.conversationContext}
                    onValueChange={(value: ConversationContext) => handleVariableChange('conversationContext', value)}
                  >
                    <SelectTrigger className="flex-1 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer_agent">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Your Agent
                        </div>
                      </SelectItem>
                      <SelectItem value="seller_agent">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Seller's Agent
                        </div>
                      </SelectItem>
                      <SelectItem value="seller_direct">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Seller Directly
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Script Selection */}
          <div className="space-y-4">
            {scripts.map(script => (
              <div
                key={script.id}
                className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
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

            {/* Pro Tips */}
            <div className="border-t pt-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Pro Tips
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-start gap-2">
                    <Shield className="h-3 w-3 mt-1 flex-shrink-0" />
                    Always lead with safety issues - they carry the most weight
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="h-3 w-3 mt-1 flex-shrink-0" />
                    Include specific cost estimates and evidence for credibility
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-3 w-3 mt-1 flex-shrink-0" />
                    Leave room for negotiation by starting 15-20% above your target
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                    Be prepared to drop minor issues to show good faith
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-3 w-3 mt-1 flex-shrink-0" />
                    Follow up within 24-48 hours of sending your request
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Generated Script */}
          <div className="lg:col-span-2">
            <div className="border-2 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">Generated Script</h3>
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
              
              <div className="p-4 bg-white">
                <Textarea
                  value={customizedScript}
                  onChange={(e) => setCustomizedScript(e.target.value)}
                  className="min-h-[400px] font-mono text-sm border-0 focus:ring-0 resize-none"
                  placeholder="Select a template to generate your script..."
                />
              </div>
            </div>

          </div>
        </div>
      
      {/* Response Analyzer Section */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-green-600" />
            Response Analyzer
          </CardTitle>
          <p className="text-gray-600">
            Paste their response and get AI-powered analysis with tailored reply suggestions
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Their Response (Email/Text/Notes)
            </label>
            <Textarea
              value={conversationFlow.theirResponse || ''}
              onChange={(e) => setConversationFlow({
                ...conversationFlow,
                theirResponse: e.target.value
              })}
              placeholder="Paste their response here... (email content, phone call notes, text messages, etc.)"
              className="min-h-[120px]"
            />
          </div>

          <Button
            onClick={handleResponseAnalysis}
            disabled={!conversationFlow.theirResponse}
            className="bg-[#5C1B10] hover:bg-[#4A1508] text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Analyze & Generate Response
          </Button>

          {conversationFlow.responseAnalysis && (
            <div className="space-y-4">
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analysis Results
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tone</label>
                      <Badge 
                        className={`mt-1 ${
                          conversationFlow.responseAnalysis.tone === 'receptive' ? 'bg-green-100 text-green-800' :
                          conversationFlow.responseAnalysis.tone === 'resistant' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {conversationFlow.responseAnalysis.tone.charAt(0).toUpperCase() + conversationFlow.responseAnalysis.tone.slice(1)}
                      </Badge>
                    </div>
                    {conversationFlow.responseAnalysis.counterOffer && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Counter Offer</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          {formatCurrency(conversationFlow.responseAnalysis.counterOffer)}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Objections Found</label>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {conversationFlow.responseAnalysis.objections.length}
                      </p>
                    </div>
                  </div>

                  {conversationFlow.responseAnalysis.objections.length > 0 && (
                    <div className="mt-4">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Key Concerns</label>
                      <ul className="mt-2 space-y-1">
                        {conversationFlow.responseAnalysis.objections.map((objection, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            <span className="text-sm text-gray-700">{objection}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Suggested Response
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(customizedScript, 'response')}
                    className="flex items-center gap-2"
                  >
                    {copiedScript === 'response' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedScript === 'response' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                
                <Textarea
                  value={customizedScript}
                  onChange={(e) => setCustomizedScript(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Generated response will appear here..."
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}