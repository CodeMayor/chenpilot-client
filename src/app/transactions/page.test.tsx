import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import accountReducer from "@/store/slices/accountSlice";
import authReducer, { login } from "@/store/slices/authSlice";
import TransactionsPage from "./page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { getAccountTransactions } = vi.hoisted(() => ({
  getAccountTransactions: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  default: {
    getAccountTransactions,
    setStore: vi.fn(),
  },
}));

vi.mock("@/utils/horizonFetch", () => ({
  horizonFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ _embedded: { records: [] } }),
  }),
}));

const transaction = {
  id: "tx-1",
  hash: "abc123hash",
  ledger: 123,
  created_at: "2026-10-20T00:00:00.000Z",
  source_account: "Gsource",
  fee_charged: "100",
  operation_count: 1,
  successful: true,
  memo: "Invoice 42",
  operations: [
    {
      id: "op-1",
      type: "payment",
      amount: "25",
      asset: "USDC",
      to: "Gdestination",
      source_account: "Gsource",
    },
  ],
};

function renderPage() {
  const store = configureStore({
    reducer: { account: accountReducer, auth: authReducer },
  });
  store.dispatch(login({ email: "person@example.com", password: "Password1" }));
  render(
    <Provider store={store}>
      <TransactionsPage />
    </Provider>,
  );
  return store;
}

// The page dispatches on mount, so the initial empty render is replaced by the
// loading state and then by the settled result. Wait for the request to be
// issued and for the slice to settle before asserting on the DOM.
async function waitForSettled(store: ReturnType<typeof renderPage>) {
  await waitFor(() => expect(getAccountTransactions).toHaveBeenCalled());
  await waitFor(() =>
    expect(store.getState().account.transactions.isLoading).toBe(false),
  );
}

describe("TransactionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountTransactions.mockResolvedValue({
      success: true,
      data: { transactions: [], total: 0, page: 1, limit: 10 },
    });
  });

  it("renders the empty state when there are no transactions", async () => {
    const store = renderPage();
    await waitForSettled(store);

    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });

  it("renders the transaction table with the stored transactions", async () => {
    getAccountTransactions.mockResolvedValue({
      success: true,
      data: { transactions: [transaction], total: 1, page: 1, limit: 10 },
    });

    const store = renderPage();
    await waitForSettled(store);

    const { transactions } = store.getState().account;
    expect(transactions.transactions).toHaveLength(1);
    expect(transactions.total).toBe(1);
    expect(
      screen.getByRole("row", { name: /view transaction details for payment/i }),
    ).toBeInTheDocument();
  });
});
