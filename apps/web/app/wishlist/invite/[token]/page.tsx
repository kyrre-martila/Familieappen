import { WishlistInviteClient } from "./WishlistInviteClient";

export default async function WishlistInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <WishlistInviteClient token={token} />;
}
