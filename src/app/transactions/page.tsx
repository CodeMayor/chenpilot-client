"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import { getAccountTransactions } from "@/store/slices/accountSlice";
import TransactionTable from "@/components/dashboard/TransactionTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptText } from "lucide-react";

export default function TransactionsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { transactions } = useAppSelector((state) => state.account);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (user?.id) {
      dispatch(
        getAccountTransactions({
          userId: user.id,
          page: currentPage,
          limit: pageSize,
        }),
      );
    }
  }, [dispatch, user?.id, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const hasTransactions = transactions.transactions.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Transaction History</h1>

      {!hasTransactions && !transactions.isLoading ? (
        <EmptyState
          icon={<ReceiptText aria-hidden="true" className="h-8 w-8" />}
          title="No transactions yet"
          description="Your completed transactions will appear here. Start with a wallet transfer or payment."
          action={{ label: "Go to dashboard", onClick: () => router.push("/dashboard") }}
        />
      ) : (
        <TransactionTable
          transactions={transactions.transactions}
          isLoading={transactions.isLoading}
          error={transactions.error}
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={transactions.total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
