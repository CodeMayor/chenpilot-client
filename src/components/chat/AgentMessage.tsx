"use client";

import React, { useState } from "react";
import { logger } from "../../utils/logger";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, MessageFeedback } from "@/types";
import { Copy, Check, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import ExecutionTrace from "./ExecutionTrace";
import { useAppDispatch, useAppSelector } from "@/store";
import { setMessageFeedback } from "@/store/slices/chatSlice";
import { submitFeedback } from "@/services/feedbackService";

interface AgentMessageProps {
  message: ChatMessage;
  onCopy?: (text: string) => void;
  onReply?: (messageId: string) => void;
}

export default function AgentMessage({ message, onCopy, onReply }: AgentMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showNegativeFeedbackPrompt, setShowNegativeFeedbackPrompt] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  const dispatch = useAppDispatch();
  const currentFeedback = useAppSelector((state) =>
    state.chat.messages.find((item) => item.id === message.id)?.metadata?.feedback ?? message.metadata?.feedback,
  );
  const selectedRating = currentFeedback?.rating;

  const saveFeedback = (feedback: MessageFeedback | null) => {
    dispatch(setMessageFeedback({ messageId: message.id, feedback }));
    void submitFeedback(message.id, feedback);
  };

  const rateAnswer = (rating: MessageFeedback["rating"]) => {
    if (selectedRating === rating) {
      setShowNegativeFeedbackPrompt(false);
      saveFeedback(null);
      return;
    }
    if (rating === "down") {
      setFeedbackComment("");
      setShowNegativeFeedbackPrompt(true);
      return;
    }
    saveFeedback({ rating, submittedAt: new Date().toISOString() });
  };

  const submitNegativeFeedback = () => {
    saveFeedback({
      rating: "down",
      ...(feedbackComment.trim() ? { comment: feedbackComment.trim() } : {}),
      submittedAt: new Date().toISOString(),
    });
    setShowNegativeFeedbackPrompt(false);
    setFeedbackComment("");
  };

  // Handle both string and object content
  const renderContent = () => {
    // Debug logging to see what content we're receiving
    logger.debug("[AgentMessage] Message content:", message.content);
    logger.debug("[AgentMessage] Content type:", typeof message.content);

    if (typeof message.content === "string") {
      return message.content;
    }

    if (typeof message.content === "object" && message.content !== null) {
      const content = message.content as any;
      logger.debug("[AgentMessage] Object content keys:", Object.keys(content));

      // Handle the new backend response format with vaults array
      if (content.vaults && Array.isArray(content.vaults)) {
        return renderVaultsContent(content.vaults, content.marketInsights);
      }

      // Handle troves positions response
      if (content.positions && Array.isArray(content.positions)) {
        return renderPositionsContent(content.positions);
      }

      // Handle troves quote response
      if (content.vaultId && content.estimatedShares) {
        return renderQuoteContent(content);
      }

      // Handle deposit quote response with vault info
      if (content.vault && content.deposit) {
        return renderDepositQuoteContent(content);
      }

      // Handle troves strategies response
      if (content.strategies && Array.isArray(content.strategies)) {
        return renderStrategiesContent(content.strategies);
      }

      // Handle troves yield response
      if (content.vaultId && content.currentApy) {
        return renderYieldContent(content);
      }

      // Handle troves health response
      if (content.status && content.totalTvl) {
        return renderHealthContent(content);
      }

      // Handle deposit/withdraw/harvest responses
      if (content.success !== undefined) {
        return renderOperationContent(content);
      }

      // For other objects, return a generic message
      return "Operation completed successfully.";
    }

    return String(message.content || "");
  };

  const renderVaultsContent = (vaults: any[], marketInsights?: any) => {
    let content = `🏦 **Available Vaults (${vaults.length})**\n\n`;

    // Add market insights if available
    if (marketInsights) {
      content +=
        `📊 **Market Overview**\n` +
        `• Total TVL: ${marketInsights.totalTvl}\n` +
        `• Average APY: ${marketInsights.averageApy}\n` +
        `• Top Performer: ${marketInsights.topPerformer.name} (${marketInsights.topPerformer.apy})\n` +
        `• Risk Distribution: ${marketInsights.riskDistribution.highRisk} High, ${marketInsights.riskDistribution.mediumRisk} Medium, ${marketInsights.riskDistribution.lowRisk} Low Risk\n\n`;
    }

    // Add vault details
    content +=
      `**Vault Details:**\n\n` +
      vaults
        .map(
          (vault) =>
            `**${vault.name}**\n` +
            `• Asset: ${vault.asset}\n` +
            `• APY: ${vault.apy}\n` +
            `• TVL: ${vault.tvl}\n` +
            `• Strategy: ${vault.strategy}\n` +
            `• Min Deposit: ${vault.minDeposit} ${vault.asset}\n` +
            `• Risk Level: ${vault.riskLevel}\n` +
            `• Fees: ${vault.fees.managementFee * 100}% management, ${vault.fees.performanceFee * 100}% performance\n`,
        )
        .join("\n");

    return content;
  };

  const renderPositionsContent = (positions: any[]) => {
    if (positions.length === 0) {
      return "📊 **Your Positions**\n\nNo positions found.";
    }

    return (
      `📊 **Your Positions (${positions.length})**\n\n` +
      positions
        .map(
          (position) =>
            `**${position.vaultName}**\n` +
            `• Asset: ${position.asset}\n` +
            `• Shares: ${position.shares}\n` +
            `• Assets: ${position.assets}\n` +
            `• Estimated Value: $${position.estimatedValue}\n` +
            `• APY: ${position.apy}%\n` +
            `• Total Earned: $${position.totalEarned}\n` +
            `• Deposited: ${position.depositedAt}\n`,
        )
        .join("\n")
    );
  };

  const renderQuoteContent = (quote: any) => {
    return (
      `💰 **Deposit Quote**\n\n` +
      `• Vault: ${quote.vaultId}\n` +
      `• Asset: ${quote.asset}\n` +
      `• Amount: ${quote.amount}\n` +
      `• Estimated Shares: ${quote.estimatedShares}\n` +
      `• APY: ${quote.apy}%\n` +
      `• Estimated Yield: $${quote.estimatedYield}\n` +
      `• Time Horizon: ${quote.timeHorizon}\n` +
      `• Fees: ${quote.fees}\n`
    );
  };

  const renderDepositQuoteContent = (data: any) => {
    const { message, vault, deposit, yieldProjections, fees, riskAssessment } =
      data;

    return (
      `💰 **${message}**\n\n` +
      `**Vault Information:**\n` +
      `• Name: ${vault.name}\n` +
      `• Asset: ${vault.asset}\n` +
      `• APY: ${vault.apy}\n` +
      `• TVL: ${vault.tvl}\n` +
      `• Strategy: ${vault.strategy}\n\n` +
      `**Deposit Details:**\n` +
      `• Amount: ${deposit.amount} ${deposit.asset}\n` +
      `• Estimated Shares: ${deposit.estimatedShares}\n` +
      `• Share Price: ${deposit.sharePrice}\n\n` +
      `**Yield Projections:**\n` +
      `• Daily: ${yieldProjections.daily}\n` +
      `• Weekly: ${yieldProjections.weekly}\n` +
      `• Monthly: ${yieldProjections.monthly}\n` +
      `• Annual: ${yieldProjections.annual}\n\n` +
      `**Fees:**\n` +
      `• Management Fee: ${fees.managementFee} (${fees.managementFeeAmount})\n` +
      `• Performance Fee: ${fees.performanceFee} (${fees.performanceFeeAmount})\n\n` +
      `**Risk Assessment:**\n` +
      `• Risk Level: ${riskAssessment.riskLevel}\n` +
      `• Recommendation: ${riskAssessment.recommendation}\n`
    );
  };

  const renderStrategiesContent = (strategies: any[]) => {
    return (
      `🎯 **Available Strategies (${strategies.length})**\n\n` +
      strategies
        .map(
          (strategy) =>
            `**${strategy.name}**\n` +
            `• Description: ${strategy.description}\n` +
            `• Risk Level: ${strategy.riskLevel}\n` +
            `• Target APY: ${strategy.targetApy}%\n` +
            `• Current APY: ${strategy.currentApy}%\n` +
            `• TVL: $${strategy.tvl}\n` +
            `• Supported Assets: ${strategy.supportedAssets.join(", ")}\n` +
            `• Strategy Type: ${strategy.strategyType}\n`,
        )
        .join("\n")
    );
  };

  const renderYieldContent = (yieldData: any) => {
    return (
      `📈 **Yield Data for ${yieldData.vaultName}**\n\n` +
      `• Asset: ${yieldData.asset}\n` +
      `• Current APY: ${yieldData.currentApy}%\n` +
      `• Historical APY: ${yieldData.historicalApy}%\n` +
      `• TVL: $${yieldData.tvl}\n` +
      `• Risk Level: ${yieldData.riskLevel}\n` +
      `• Last Updated: ${yieldData.lastUpdated}\n`
    );
  };

  const renderHealthContent = (health: any) => {
    return (
      `🏥 **Troves Health Status**\n\n` +
      `• Status: ${health.status}\n` +
      `• Total TVL: $${health.totalTvl}\n` +
      `• Total APY: ${health.totalApy}%\n` +
      `• Vault Status: ${health.vaultStatus}\n` +
      `• Recommendations: ${health.recommendations}\n`
    );
  };

  const renderOperationContent = (operation: any) => {
    if (operation.success) {
      return (
        `✅ **${operation.message || "Operation Successful"}**\n\n` +
        (operation.quote
          ? `Quote: ${JSON.stringify(operation.quote, null, 2)}\n`
          : "") +
        (operation.vault
          ? `Vault: ${operation.vault.name} (${operation.vault.asset})\n`
          : "") +
        (operation.note ? `\n${operation.note}` : "")
      );
    } else {
      return `❌ **Operation Failed**\n\n${operation.message || "Unknown error occurred"}`;
    }
  };

  const handleCopy = async () => {
    const content = renderContent();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (onCopy) {
        onCopy(content);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <div className="text-white text-left group relative">
      <div className="prose prose-invert prose-lg max-w-none leading-relaxed pr-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children, ...props }: any) => (
              <p className="mb-3 last:mb-0" {...props}>
                {children}
              </p>
            ),
            strong: ({ children, ...props }: any) => (
              <strong className="font-semibold text-white" {...props}>
                {children}
              </strong>
            ),
            em: ({ children, ...props }: any) => (
              <em className="italic text-gray-300" {...props}>
                {children}
              </em>
            ),
            code: ({ inline, className, children, ...props }: any) => (
              <CodeBlock className={className} inline={inline}>
                {String(children).replace(/\n$/, "")}
              </CodeBlock>
            ),
            pre: ({ children, ...props }: any) => <>{children}</>,
            ul: ({ children, ...props }: any) => (
              <ul className="list-disc list-inside mb-3 space-y-1" {...props}>
                {children}
              </ul>
            ),
            ol: ({ children, ...props }: any) => (
              <ol
                className="list-decimal list-inside mb-3 space-y-1"
                {...props}
              >
                {children}
              </ol>
            ),
            li: ({ children, ...props }: any) => (
              <li className="text-gray-200" {...props}>
                {children}
              </li>
            ),
            h1: ({ children, ...props }: any) => (
              <h1 className="text-2xl font-bold text-white mb-4" {...props}>
                {children}
              </h1>
            ),
            h2: ({ children, ...props }: any) => (
              <h2 className="text-xl font-bold text-white mb-3" {...props}>
                {children}
              </h2>
            ),
            h3: ({ children, ...props }: any) => (
              <h3 className="text-lg font-semibold text-white mb-2" {...props}>
                {children}
              </h3>
            ),
            blockquote: ({ children, ...props }: any) => (
              <blockquote
                className="border-l-4 border-purple-500 pl-4 italic text-gray-300 my-4"
                {...props}
              >
                {children}
              </blockquote>
            ),
          }}
        >
          {renderContent()}
        </ReactMarkdown>
      </div>

      {/* Execution Trace */}
      {message.metadata?.executionTrace && (
        <ExecutionTrace trace={message.metadata.executionTrace} />
      )}

      {message.type === "agent" && (
        <div className="mt-3 flex items-center gap-2" aria-label="Rate this answer">
          <button
            type="button"
            onClick={() => rateAnswer("up")}
            aria-label="Thumbs up"
            aria-pressed={selectedRating === "up"}
            className={`rounded-md p-2 transition-colors ${selectedRating === "up" ? "bg-green-500/20 text-green-300" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => rateAnswer("down")}
            aria-label="Thumbs down"
            aria-pressed={selectedRating === "down"}
            className={`rounded-md p-2 transition-colors ${selectedRating === "down" ? "bg-red-500/20 text-red-300" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
          {showNegativeFeedbackPrompt && (
            <div role="dialog" aria-label="Tell us what was wrong" className="ml-2 w-full max-w-sm rounded-lg border border-white/10 bg-gray-900 p-3">
              <label htmlFor={`feedback-${message.id}`} className="mb-2 block text-sm text-gray-200">What could be improved? (optional)</label>
              <textarea
                id={`feedback-${message.id}`}
                value={feedbackComment}
                onChange={(event) => setFeedbackComment(event.target.value)}
                maxLength={280}
                rows={2}
                className="w-full resize-y rounded border border-gray-700 bg-gray-950 p-2 text-sm text-white"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowNegativeFeedbackPrompt(false)} className="rounded px-3 py-1 text-sm text-gray-300 hover:bg-white/10">Cancel</button>
                <button type="button" onClick={submitNegativeFeedback} className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500">Submit feedback</button>
              </div>
            </div>
          )}
        </div>
      )}

      {onReply && message.replyCount !== undefined && message.replyCount > 0 && <button
        onClick={() => onReply(message.id)}
        className="mt-1.5 flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        aria-label={`View ${message.replyCount} ${message.replyCount === 1 ? 'reply' : 'replies'}`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>
          {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
        </span>
      </button>}
    </div>
  );
}
