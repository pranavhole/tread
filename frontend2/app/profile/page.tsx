import Profile from "../../components/Profile/Profile";
import ProtectedShell from "../../components/ProtectedShell/ProtectedShell";

export default function ProfilePage() {
  return (
    <ProtectedShell>
      <Profile />
    </ProtectedShell>
  );
}
