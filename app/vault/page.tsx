import { redirect } from "next/navigation";

export default function VaultPage() {
  redirect("/?view=audit-log");
}
