import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Lead, LeadFormData } from "./types";
import { STAGES, SOURCES, formatBRL } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  teamMembers: { id: string; name: string; role: string }[];
  onSave: (data: LeadFormData & { id?: string }) => void;
  saving: boolean;
}

function parseCurrency(v: string): number {
  return Number(v.replace(/[^\d]/g, "")) / 100 || 0;
}

function currencyDisplay(v: number | null): string {
  if (v == null || v === 0) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function LeadModal({ open, onClose, lead, teamMembers, onSave, saving }: Props) {
  const [form, setForm] = useState<LeadFormData>({
    name: "", company: "", stage: "lead", proposal_value: null,
    assigned_to: null, lead_source: null, notes: "", contact_email: "", contact_phone: "",
  });
  const [rawCurrency, setRawCurrency] = useState("");

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name, company: lead.company || "", stage: lead.stage,
        proposal_value: lead.proposal_value, assigned_to: lead.assigned_to,
        lead_source: lead.lead_source, notes: lead.notes || "",
        contact_email: lead.contact_email || "", contact_phone: lead.contact_phone || "",
      });
      setRawCurrency(lead.proposal_value ? currencyDisplay(lead.proposal_value) : "");
    } else {
      setForm({ name: "", company: "", stage: "lead", proposal_value: null, assigned_to: null, lead_source: null, notes: "", contact_email: "", contact_phone: "" });
      setRawCurrency("");
    }
  }, [lead, open]);

  const handleCurrencyChange = (v: string) => {
    const num = parseCurrency(v);
    setRawCurrency(num > 0 ? currencyDisplay(num) : v);
    setForm({ ...form, proposal_value: num > 0 ? num : null });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, id: lead?.id, name: form.name.trim(), company: form.company.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome do Lead *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} placeholder="Nome do lead" />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Empresa" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor da Proposta</Label>
              <Input value={rawCurrency} onChange={(e) => handleCurrencyChange(e.target.value)} placeholder="R$ 0,00" />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? null : v })}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="none">Nenhum</SelectItem>
                  {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={form.lead_source || "none"} onValueChange={(v) => setForm({ ...form, lead_source: v === "none" ? null : v })}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {SOURCES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email de Contato</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone de Contato</Label>
              <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações sobre o lead..." rows={3} maxLength={1000} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {lead ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
