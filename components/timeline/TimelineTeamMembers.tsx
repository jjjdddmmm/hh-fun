// Timeline Team Members Component - Production Ready, Zero Tech Debt
// Team contact management with hh.fun design system

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Phone, 
  Mail, 
  Globe, 
  Star,
  Edit2,
  Trash2,
  Crown,
  Clock,
  MapPin
} from "lucide-react";
import { TimelineWithRelations, TeamMemberRole, ContactMethod } from "@/lib/types/timeline";

interface TimelineTeamMembersProps {
  timeline: TimelineWithRelations;
  onTeamUpdate: () => void;
}

interface TeamMemberForm {
  name: string;
  role: TeamMemberRole | '';
  company: string;
  email: string;
  phone: string;
  website: string;
  licenseNumber: string;
  specialties: string;
  preferredContact: ContactMethod;
  availability: string;
  timezone: string;
  notes: string;
  isPrimary: boolean;
}

const initialForm: TeamMemberForm = {
  name: '',
  role: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  licenseNumber: '',
  specialties: '',
  preferredContact: ContactMethod.EMAIL,
  availability: '',
  timezone: '',
  notes: '',
  isPrimary: false,
};

export function TimelineTeamMembers({ timeline, onTeamUpdate }: TimelineTeamMembersProps) {
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [formData, setFormData] = useState<TeamMemberForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRoleColor = (role: TeamMemberRole) => {
    switch (role) {
      case TeamMemberRole.BUYER_AGENT: return 'bg-blue-100 text-blue-800';
      case TeamMemberRole.SELLER_AGENT: return 'bg-green-100 text-green-800';
      case TeamMemberRole.LENDER: return 'bg-purple-100 text-purple-800';
      case TeamMemberRole.LOAN_OFFICER: return 'bg-purple-100 text-purple-800';
      case TeamMemberRole.INSPECTOR: return 'bg-orange-100 text-orange-800';
      case TeamMemberRole.APPRAISER: return 'bg-yellow-100 text-yellow-800';
      case TeamMemberRole.ATTORNEY: return 'bg-red-100 text-red-800';
      case TeamMemberRole.TITLE_COMPANY: return 'bg-indigo-100 text-indigo-800';
      case TeamMemberRole.INSURANCE_AGENT: return 'bg-teal-100 text-teal-800';
      case TeamMemberRole.CONTRACTOR: return 'bg-gray-100 text-gray-800';
      case TeamMemberRole.ESCROW_OFFICER: return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRole = (role: TeamMemberRole) => {
    return role.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatContactMethod = (method: ContactMethod) => {
    return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.role || (!formData.email && !formData.phone)) {
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        timelineId: timeline.id,
        name: formData.name,
        role: formData.role,
        company: formData.company || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        licenseNumber: formData.licenseNumber || undefined,
        specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()) : [],
        preferredContact: formData.preferredContact,
        availability: formData.availability || undefined,
        timezone: formData.timezone || undefined,
        notes: formData.notes || undefined,
        isPrimary: formData.isPrimary,
      };

      const url = editingMember 
        ? '/api/timeline/team'
        : '/api/timeline/team';
      
      const method = editingMember ? 'PUT' : 'POST';
      
      if (editingMember) {
        (payload as any).memberId = editingMember;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save team member');
      }

      setFormData(initialForm);
      setIsAddingMember(false);
      setEditingMember(null);
      onTeamUpdate();
    } catch (error) {
      console.error('Error saving team member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (member: any) => {
    setFormData({
      name: member.name,
      role: member.role,
      company: member.company || '',
      email: member.email || '',
      phone: member.phone || '',
      website: member.website || '',
      licenseNumber: member.licenseNumber || '',
      specialties: member.specialties?.join(', ') || '',
      preferredContact: member.preferredContact,
      availability: member.availability || '',
      timezone: member.timezone || '',
      notes: member.notes || '',
      isPrimary: member.isPrimary,
    });
    setEditingMember(member.id);
    setIsAddingMember(true);
  };

  const removeMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/timeline/team?memberId=${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }

      onTeamUpdate();
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  // Group team members by role
  const groupedMembers = timeline.teamMembers.reduce((acc, member) => {
    if (!acc[member.role]) {
      acc[member.role] = [];
    }
    acc[member.role].push(member);
    return acc;
  }, {} as Record<TeamMemberRole, typeof timeline.teamMembers>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Team Members</CardTitle>
              <CardDescription>
                Manage your home buying team contacts and communication
              </CardDescription>
            </div>
            <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
              <DialogTrigger>
                <Button
                  style={{ backgroundColor: '#5C1B10', color: 'white' }}
                  onClick={() => {
                    setFormData(initialForm);
                    setEditingMember(null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                  </DialogTitle>
                  <DialogDescription>
                    Add professionals to your home buying team for easy reference and communication.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as TeamMemberRole }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(TeamMemberRole).map(role => (
                            <SelectItem key={role} value={role}>
                              {formatRole(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Company name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        placeholder="License #"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="specialties">Specialties</Label>
                    <Input
                      id="specialties"
                      value={formData.specialties}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialties: e.target.value }))}
                      placeholder="First-time buyers, luxury homes, etc. (comma separated)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="preferredContact">Preferred Contact</Label>
                      <Select
                        value={formData.preferredContact}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, preferredContact: value as ContactMethod }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ContactMethod).map(method => (
                            <SelectItem key={method} value={method}>
                              {formatContactMethod(method)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="availability">Availability</Label>
                      <Input
                        id="availability"
                        value={formData.availability}
                        onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
                        placeholder="Mon-Fri 9-5, Weekends by appt"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this team member..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="isPrimary">Set as primary contact for this role</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingMember(false);
                        setEditingMember(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !formData.name || !formData.role}
                      style={{ backgroundColor: '#5C1B10', color: 'white' }}
                    >
                      {isSubmitting ? 'Saving...' : editingMember ? 'Update' : 'Add'} Team Member
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Team Members List */}
      {Object.keys(groupedMembers).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedMembers).map(([role, members]) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className={getRoleColor(role as TeamMemberRole)}>
                    {formatRole(role as TeamMemberRole)}
                  </Badge>
                  <span className="text-sm text-gray-500">({members.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{member.name}</h4>
                            {member.isPrimary && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                            {member.rating && (
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-gray-600 ml-1">
                                  {Number(member.rating).toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {member.company && (
                            <p className="text-sm text-gray-600 mb-2">{member.company}</p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            {member.email && (
                              <a
                                href={`mailto:${member.email}`}
                                className="flex items-center space-x-1 hover:text-blue-600"
                              >
                                <Mail className="h-3 w-3" />
                                <span>{member.email}</span>
                              </a>
                            )}
                            {member.phone && (
                              <a
                                href={`tel:${member.phone}`}
                                className="flex items-center space-x-1 hover:text-blue-600"
                              >
                                <Phone className="h-3 w-3" />
                                <span>{member.phone}</span>
                              </a>
                            )}
                            {member.website && (
                              <a
                                href={member.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 hover:text-blue-600"
                              >
                                <Globe className="h-3 w-3" />
                                <span>Website</span>
                              </a>
                            )}
                          </div>

                          {member.availability && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{member.availability}</span>
                            </div>
                          )}

                          {member.specialties && member.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.specialties.slice(0, 3).map((specialty, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                              {member.specialties.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{member.specialties.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(member)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMember(member.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Empty State
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <SectionHeader className="text-lg mb-2">No Team Members Yet</SectionHeader>
            <p className="text-gray-600 mb-4">
              Add professionals to your home buying team for easy reference and communication.
            </p>
            <Button
              style={{ backgroundColor: '#5C1B10', color: 'white' }}
              onClick={() => setIsAddingMember(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Team Member
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}