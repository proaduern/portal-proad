import { redirect } from "next/navigation";

export default async function VerificarPortalRedirect({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  const basePca = (process.env.NEXT_PUBLIC_PCA_URL || "https://pca-uern.vercel.app").replace(/\/$/, "");
  if (codigo && codigo.trim()) {
    redirect(`${basePca}/verificar/${encodeURIComponent(codigo.trim().toUpperCase())}`);
  }
  redirect(`${basePca}/verificar`);
}
