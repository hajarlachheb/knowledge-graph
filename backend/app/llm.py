"""LLM provider abstraction — supports Grok, OpenAI, Llama (Ollama), or heuristic fallback.

Configure via environment variables:
  LLM_PROVIDER=grok|openai|llama|ollama|none
  LLM_API_KEY=your-api-key (optional for llama/ollama)
  LLM_MODEL=grok-2 | gpt-4o | llama3.2 | etc.
  LLM_BASE_URL=https://api.x.ai/v1 (Grok) or http://localhost:11434/v1 (Ollama)
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
    """Works with OpenAI, Grok (xAI), and Llama via Ollama — any OpenAI-compatible API."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
    ):
        self.base_url = base_url or settings.llm_base_url or "https://api.openai.com/v1"
        self.model = model or settings.llm_model or "gpt-4o"
        self.api_key = api_key if api_key is not None else settings.llm_api_key

    async def _call(self, messages: list[dict], max_tokens: int = 500) -> str:
        try:
            import httpx
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.base_url.rstrip('/')}/chat/completions",
                    headers=headers,
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
        if not context:
            return "I couldn't find any relevant REX sheets in the knowledge base for your question."

        # Build a rich context block from the retrieved REX sheets
        ctx_parts = []
        for i, c in enumerate(context[:8], start=1):
            tags = c.get("tags", "none")
            dept = c.get("department", "")
            author = c.get("author", "")
            category = c.get("category", "")
            meta = f"[REX #{c.get('id', i)}: {c.get('title', '')}]"
            if author or dept:
                meta += f" — by {author}" + (f" ({dept})" if dept else "")
            if category:
                meta += f" | Category: {category}"
            if tags and tags != "none":
                meta += f" | Tags: {tags}"
            problem = c.get("problematic", "")[:400]
            solution = c.get("solution", "")[:400]
            ctx_parts.append(f"{meta}\nProblem: {problem}\nSolution: {solution}")

        ctx_text = "\n\n---\n\n".join(ctx_parts)

        system_prompt = (
            "You are Knowledia, an AI knowledge assistant for a professional services firm. "
            "You ONLY answer using the REX (Return of Experience) sheets provided below as your knowledge base. "
            "If the answer is not clearly supported by the REX sheets, say so honestly rather than making things up.\n\n"
            "Guidelines:\n"
            "- Give a direct, concise answer (2-4 sentences max).\n"
            "- Always cite the source REX sheet(s) by their title or ID, e.g. 'According to REX #3 ...'.\n"
            "- If multiple REX sheets are relevant, synthesize them.\n"
            "- If no REX sheet answers the question, say: 'I don't have a REX sheet covering that topic yet.'\n"
            "- Never invent facts not present in the provided REX sheets."
        )

        result = await self._call([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Knowledge base (REX sheets):\n\n{ctx_text}\n\n---\n\nQuestion: {question}"},
        ], max_tokens=500)
        if not result:
            return await HeuristicProvider().chat(question, context)
        return result


def get_llm_provider() -> LLMProvider:
    provider = (settings.llm_provider or "").lower()
    if provider in ("llama", "ollama"):
        return OpenAICompatibleProvider(
            base_url=settings.llm_base_url or "http://localhost:11434/v1",
            model=settings.llm_model or "llama3.2",
            api_key=settings.llm_api_key or "ollama",
        )
    if provider in ("grok", "openai") and settings.llm_api_key:
        return OpenAICompatibleProvider()
    return HeuristicProvider()
