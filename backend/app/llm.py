"""LLM provider abstraction — supports Grok, OpenAI, or heuristic fallback.

Configure via environment variables:
  LLM_PROVIDER=grok|openai|none
  LLM_API_KEY=your-api-key
  LLM_MODEL=grok-2 | gpt-4o | etc.
  LLM_BASE_URL=https://api.x.ai/v1 (for Grok)
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    @abstractmethod
    async def summarize(self, title: str, problematic: str, solution: str) -> str:
        ...

    @abstractmethod
    async def search(self, query: str, documents: list[dict]) -> list[int]:
        """Return ranked indices of most relevant documents."""
        ...

    @abstractmethod
    async def suggest_tags(self, title: str, problematic: str, solution: str) -> list[str]:
        ...

    @abstractmethod
    async def chat(self, question: str, context: list[dict]) -> str:
        """Answer a question using REX sheet context."""
        ...


class HeuristicProvider(LLMProvider):
    """Keyword-based fallback when no LLM API is configured."""

    async def summarize(self, title: str, problematic: str, solution: str) -> str:
        problem_first = problematic.split(".")[0].strip()
        solution_sentences = [s.strip() for s in solution.split(".") if len(s.strip()) > 20]
        solution_highlight = solution_sentences[0] if solution_sentences else solution[:150]
        if len(problem_first) > 120:
            problem_first = problem_first[:117] + "..."
        if len(solution_highlight) > 150:
            solution_highlight = solution_highlight[:147] + "..."
        return f"Problem: {problem_first}. Solution: {solution_highlight}."

    async def search(self, query: str, documents: list[dict]) -> list[int]:
        return list(range(len(documents)))

    async def suggest_tags(self, title: str, problematic: str, solution: str) -> list[str]:
        return []

    async def chat(self, question: str, context: list[dict]) -> str:
        if not context:
            return "I don't have enough context to answer that question. Try searching for specific topics."
        titles = [c.get("title", "") for c in context[:3]]
        return f"Based on the knowledge base, you might find relevant information in: {', '.join(titles)}. Please review these REX sheets for detailed answers."


class OpenAICompatibleProvider(LLMProvider):
    """Works with both OpenAI and Grok (xAI) APIs via the OpenAI-compatible interface."""

    def __init__(self):
        self.api_key = settings.llm_api_key
        self.model = settings.llm_model or "gpt-4o"
        self.base_url = settings.llm_base_url or "https://api.openai.com/v1"

    async def _call(self, messages: list[dict], max_tokens: int = 500) -> str:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json={"model": self.model, "messages": messages, "max_tokens": max_tokens, "temperature": 0.3},
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.warning(f"LLM call failed: {e}")
            return ""

    async def summarize(self, title: str, problematic: str, solution: str) -> str:
        result = await self._call([
            {"role": "system", "content": "You are a concise technical summarizer. Create a 1-2 sentence TL;DR of this REX (Return of Experience) sheet."},
            {"role": "user", "content": f"Title: {title}\n\nProblem: {problematic[:500]}\n\nSolution: {solution[:500]}"},
        ], max_tokens=150)
        if not result:
            return await HeuristicProvider().summarize(title, problematic, solution)
        return result

    async def search(self, query: str, documents: list[dict]) -> list[int]:
        if not documents:
            return []
        doc_list = "\n".join(f"[{i}] {d.get('title', '')}: {d.get('problematic', '')[:100]}" for i, d in enumerate(documents[:20]))
        result = await self._call([
            {"role": "system", "content": "You are a search relevance ranker. Given a query and documents, return the indices of the most relevant documents as comma-separated numbers."},
            {"role": "user", "content": f"Query: {query}\n\nDocuments:\n{doc_list}\n\nReturn only the indices of relevant documents, comma-separated:"},
        ], max_tokens=100)
        try:
            indices = [int(x.strip()) for x in result.split(",") if x.strip().isdigit()]
            return [i for i in indices if 0 <= i < len(documents)]
        except Exception:
            return list(range(min(10, len(documents))))

    async def suggest_tags(self, title: str, problematic: str, solution: str) -> list[str]:
        result = await self._call([
            {"role": "system", "content": "Suggest 3-8 relevant tags for this REX sheet. Return only lowercase tags separated by commas, no explanations."},
            {"role": "user", "content": f"Title: {title}\nProblem: {problematic[:300]}\nSolution: {solution[:300]}"},
        ], max_tokens=100)
        if result:
            return [t.strip().lower().replace(" ", "-") for t in result.split(",") if t.strip()][:8]
        return []

    async def chat(self, question: str, context: list[dict]) -> str:
        ctx_text = "\n\n".join(
            f"REX: {c.get('title', '')}\nProblem: {c.get('problematic', '')[:300]}\nSolution: {c.get('solution', '')[:300]}"
            for c in context[:5]
        )
        result = await self._call([
            {"role": "system", "content": "You are Knowledia's AI assistant. Answer questions using the REX sheet context provided. Be concise and reference specific REX sheets when relevant."},
            {"role": "user", "content": f"Context from knowledge base:\n{ctx_text}\n\nQuestion: {question}"},
        ], max_tokens=400)
        if not result:
            return await HeuristicProvider().chat(question, context)
        return result


def get_llm_provider() -> LLMProvider:
    provider = settings.llm_provider.lower()
    if provider in ("grok", "openai") and settings.llm_api_key:
        return OpenAICompatibleProvider()
    return HeuristicProvider()
