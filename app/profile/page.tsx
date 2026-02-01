import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/utils/session";
import { ProfilePage } from "@/app/components/profile/ProfilePage";

export const metadata: Metadata = {
  title: "Profile Settings",
  description: "Manage your Pikes Calendar account settings and preferences.",
};

export default async function ProfilePageWrapper() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return <ProfilePage session={session} />;
}
