import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Save, X } from "lucide-react";

interface SalesChannel {
  id: string;
  name: string;
  is_active: boolean;
}

export default function ChannelsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchChannels = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("sales_channels")
      .select("id, name, is_active")
      .eq("user_id", user.id)
      .order("created_at");
    if (data) setChannels(data);
  };

  useEffect(() => { fetchChannels(); }, [user]);

  const handleAdd = async () => {
    if (!user || !newName.trim()) return;
    if (channels.length >= 7) {
      toast({ title: "Limite atingido", description: "Máximo de 7 canais.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("sales_channels").insert({ user_id: user.id, name: newName.trim() });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { setNewName(""); await fetchChannels(); toast({ title: "Canal criado!" }); }
    setLoading(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("sales_channels").update({ name: editName.trim() }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { setEditingId(null); await fetchChannels(); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("sales_channels").update({ is_active: !current }).eq("id", id);
    await fetchChannels();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Canais de Venda</h1>
        <p className="text-muted-foreground">Gerencie os canais de aquisição da sua operação (máx. 7).</p>

        {/* Add new channel */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Adicionar Canal</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Nome do Canal</Label>
                <Input placeholder="ex: Tráfego Pago, Indicação, Outbound..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} />
              </div>
              <Button onClick={handleAdd} disabled={loading || !newName.trim() || channels.length >= 7} className="bg-[#5B2333] hover:bg-[#5B2333]/90 text-white">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Channels list */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Seus Canais ({channels.length}/7)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#5B2333] hover:bg-[#5B2333]">
                  <TableHead className="text-white font-semibold">Nome do Canal</TableHead>
                  <TableHead className="text-white font-semibold text-center">Status</TableHead>
                  <TableHead className="text-white font-semibold text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((ch, i) => (
                  <TableRow key={ch.id} className={i % 2 === 0 ? "bg-[#FAF6F0]" : "bg-white"}>
                    <TableCell>
                      {editingId === ch.id ? (
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" onKeyDown={e => e.key === "Enter" && handleUpdate(ch.id)} />
                      ) : (
                        <span className="font-medium">{ch.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch checked={ch.is_active} onCheckedChange={() => toggleActive(ch.id, ch.is_active)} />
                        <Badge variant="outline" className={ch.is_active ? "bg-green-50 text-green-600 border-green-200" : "bg-muted text-muted-foreground"}>
                          {ch.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {editingId === ch.id ? (
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleUpdate(ch.id)}><Save className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" onClick={() => { setEditingId(ch.id); setEditName(ch.name); }}><Pencil className="h-4 w-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {channels.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum canal cadastrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
