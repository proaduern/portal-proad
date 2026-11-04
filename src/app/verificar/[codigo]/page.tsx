import { redirect } from "next/navigation";

export default async function VerificarCodigoPortalRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { codigo } = await params;
  const { t } = await searchParams;
  const basePca = (process.env.NEXT_PUBLIC_PCA_URL || "https://pca-uern.vercel.app").replace(/\/$/, "");
  const query = t ? `?t=${encodeURIComponent(t)}` : "";
  redirect(`${basePca}/verificar/${encodeURIComponent(codigo)}${query}`);
}
