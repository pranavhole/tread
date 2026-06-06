import { Suspense } from "react";
import Login from "../../components/Login/Login";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-dark-bg text-text-muted">
          Loading login...
        </div>
      }
    >
      <Login />
    </Suspense>
  );
}
