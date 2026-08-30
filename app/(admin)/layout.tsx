import { requireSuperAdmin } from "@/lib/auth/admin";
import AdminShell from "./components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin();
  return <AdminShell name={admin.fullName}>{children}</AdminShell>;
}
