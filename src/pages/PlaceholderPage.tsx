import { DashboardLayout } from "@/components/DashboardLayout";

interface Props {
  title: string;
}

export default function PlaceholderPage({ title }: Props) {
  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground">
          Esta página está em construção.
        </p>
      </div>
    </DashboardLayout>
  );
}
