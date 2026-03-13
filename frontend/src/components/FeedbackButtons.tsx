"use client";

import { useState } from "react";
import { submitFeedback } from "@/lib/api";

interface Props {
  query: string;
  answer: string;
}

export function FeedbackButtons({ query, answer }: Props) {
  const [submitted, setSubmitted] = useState<"up" | "down" | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");

  const handleFeedback = async (rating: "up" | "down") => {
    setSubmitted(rating);
    if (rating === "down") {
      setShowComment(true);
      return;
    }
    await submitFeedback({ query, answer, rating });
  };

  const handleCommentSubmit = async () => {
    if (!submitted) return;
    await submitFeedback({ query, answer, rating: submitted, comment: comment || undefined });
    setShowComment(false);
  };

  if (submitted && !showComment) {
    return (
      <p className="text-xs text-gray-500">
        Thanks for your feedback!
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">Was this helpful?</span>
        <button
          onClick={() => handleFeedback("up")}
          className={`rounded-md px-2.5 py-1 text-sm transition ${
            submitted === "up"
              ? "bg-green-100 text-green-700"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          👍
        </button>
        <button
          onClick={() => handleFeedback("down")}
          className={`rounded-md px-2.5 py-1 text-sm transition ${
            submitted === "down"
              ? "bg-red-100 text-red-700"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          👎
        </button>
      </div>

      {showComment && (
        <div className="mt-3 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What could be improved?"
            className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleCommentSubmit}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
