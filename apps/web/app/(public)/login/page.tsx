import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const error = resolvedParams.error as string;
  const redirectUrl = resolvedParams.redirect as string;
  
  let url = "/?auth_step=EMAIL_ENTRY";
  if (error) {
    url += `&error=${error}`;
  }
  if (redirectUrl) {
    url += `&redirect=${encodeURIComponent(redirectUrl)}`;
  }
  
  redirect(url);
}
