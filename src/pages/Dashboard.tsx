import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold">
          Bem-vindo ao Raio-X Comercial{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gerencie seu pipeline comercial de forma inteligente.
        </p>
      </div>
    </DashboardLayout>
  );
}
