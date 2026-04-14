import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stages, emptyLead } from "./crmUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { OrgMember } from "@/hooks/useOrgMembers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  projectOptions: string[];
  orgMembers: OrgMember[];
}

export function CRMAddLeadModal({ open, onOpenChange, orgId, projectOptions, orgMembers }: Props) {
  const [form, setForm] = useState(emptyLead);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and Phone are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name, phone: form.phone, project: form.project,
      source: form.source, assigned_to: form.assigned_to, notes: form.notes,
      status: form.status, org_id: orgId, client_id: orgId,
    });
    setSaving(false);
    if (error) { toast.error("Failed to add lead"); return; }
    toast.success("Lead added");
    onOpenChange(false);
    setForm(emptyLead);
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>Fill in the lead details below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Lead name" />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
          </div>
          <div>
            <Label>Project</Label>
            <Select value={form.project} onValueChange={v => setForm(p => ({ ...p, project: v }))}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projectOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                <SelectItem value="__other">Other</SelectItem>
              </SelectContent>
            </Select>
            {form.project === "__other" && (
              <Input className="mt-2" placeholder="Enter project name" onChange={e => setForm(p => ({ ...p, project: e.target.value }))} />
            )}
          </div>
          <div>
            <Label>Source</Label>
            <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {["Facebook", "Google Ads", "LinkedIn", "Referral", "Walk-in", "Other"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned To</Label>
            <Select value={form.assigned_to} onValueChange={v => setForm(p => ({ ...p, assigned_to: v }))}>
              <SelectTrigger><SelectValue placeholder="Select rep" /></SelectTrigger>
              <SelectContent>
                {orgMembers.map(m => (
                  <SelectItem key={m.user_id} value={m.email}>
                    {m.display_name} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Adding..." : "Add Lead"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
