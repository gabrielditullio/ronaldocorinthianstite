import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <Card className="bg-white">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Construction className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Em construção</p>
            <p className="text-sm">Esta funcionalidade será implementada em breve.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
