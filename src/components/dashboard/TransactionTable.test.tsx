import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import TransactionTable from "./TransactionTable";
import type { StellarTransaction } from "@/types";

const transaction: StellarTransaction = {
  id: "tx-1",
  hash: "abc123hash",
  ledger: 123,
  created_at: "2026-10-20T00:00:00.000Z",
  source_account: "Gsource",
  fee_charged: "100",
  operation_count: 1,
  successful: true,
  memo: "Invoice 42",
  operations: [{ id: "op-1", type: "payment", amount: "25", asset: "USDC", to: "Gdestination", source_account: "Gsource" }],
};

function renderTable(tx = transaction) {
  return render(
    <TransactionTable
      transactions={[tx]}
      isLoading={false}
      error={null}
      currentPage={1}
      pageSize={10}
      totalCount={1}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
    />,
  );
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
});

describe("TransactionTable details", () => {
  it("opens operation details on row selection and restores focus on close", () => {
    renderTable();
    const row = screen.getByRole("row", { name: /view transaction details for payment/i });
    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });

    const drawer = screen.getByRole("dialog", { name: "Transaction details" });
    expect(drawer).toBeTruthy();
    expect(within(drawer).getByText("Payment")).toBeTruthy();
    expect(within(drawer).getByText(/Amount: 25/)).toBeTruthy();
    expect(within(drawer).getByText("Invoice 42")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close transaction details" }));
    expect(document.activeElement).toBe(row);
  });

  it("renders a drawer for a transaction without operation records", () => {
    renderTable({ ...transaction, operations: [] });
    fireEvent.click(screen.getByRole("row", { name: /view transaction details for unknown/i }));
    expect(screen.getByText("No operation details are available for this transaction.")).toBeTruthy();
  });

  it("uses the explorer URL for the configured network", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    renderTable();
    fireEvent.click(screen.getByRole("row", { name: /view transaction details for payment/i }));
    expect(screen.getByRole("link", { name: /open in stellar explorer/i }).getAttribute("href"))
      .toBe("https://stellar.expert/explorer/testnet/tx/abc123hash");
  });
});
