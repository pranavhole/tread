import ProtectedShell from "../../components/ProtectedShell/ProtectedShell";
import MarketTable from "../../components/MarketTable/MarketTable";

export default function MarketsPage() {
  return (
    <ProtectedShell>
      <MarketTable />
    </ProtectedShell>
  );
}
