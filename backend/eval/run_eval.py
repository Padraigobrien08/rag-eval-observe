#!/usr/bin/env python3
"""
Evaluation harness for RAG system.

Runs evaluation directly (not via HTTP) and produces metrics and report.
"""
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import structlog
from dotenv import load_dotenv

from app.core.logging import setup_logging
from app.rag.retrieve import retrieve
from app.rag.answer import generate_answer
from app.llm.openai_client import get_openai_client

# Load environment variables
load_dotenv()

# Setup logging
setup_logging()
logger = structlog.get_logger()


@dataclass
class EvaluationCase:
    """Single evaluation case."""

    query: str
    expected_sources: List[str]
    expected_answer_contains: List[str]


@dataclass
class EvaluationResult:
    """Result for a single evaluation case."""

    query: str
    expected_sources: List[str]
    retrieved_sources: List[str]
    answer: str
    hit_at_1: bool
    hit_at_3: bool
    hit_at_5: bool
    hit_at_8: bool
    mrr: float
    llm_judge_correctness: Optional[bool] = None
    llm_judge_faithfulness: Optional[bool] = None
    llm_judge_reasoning: Optional[str] = None
    error: Optional[str] = None


@dataclass
class EvaluationSummary:
    """Summary of all evaluation results."""

    total_cases: int
    successful: int
    failed: int
    hit_at_1: float
    hit_at_3: float
    hit_at_5: float
    hit_at_8: float
    mrr: float
    llm_judge_correctness_rate: Optional[float] = None
    llm_judge_faithfulness_rate: Optional[float] = None
    failure_examples: List[Dict[str, Any]] = field(default_factory=list)


def load_dataset(dataset_path: Path) -> List[EvaluationCase]:
    """Load evaluation dataset from JSONL file."""
    cases = []
    with open(dataset_path, "r") as f:
        for line in f:
            if line.strip():
                data = json.loads(line)
                cases.append(
                    EvaluationCase(
                        query=data["query"],
                        expected_sources=data.get("expected_sources", []),
                        expected_answer_contains=data.get(
                            "expected_answer_contains", []
                        ),
                    )
                )
    return cases


def calculate_hit_at_k(
    retrieved_sources: List[str], expected_sources: List[str], k: int
) -> bool:
    """Calculate hit@k: whether any expected source is in top k retrieved."""
    if not expected_sources:
        return False
    top_k_sources = retrieved_sources[:k]
    # Check if any expected source appears in retrieved sources
    for expected in expected_sources:
        # Direct match or substring match
        for retrieved in top_k_sources:
            if expected.lower() in retrieved.lower() or retrieved.lower() in expected.lower():
                return True
    return False


def calculate_mrr(
    retrieved_sources: List[str], expected_sources: List[str]
) -> float:
    """Calculate Mean Reciprocal Rank."""
    if not expected_sources:
        return 0.0

    for rank, source in enumerate(retrieved_sources, start=1):
        for expected in expected_sources:
            # Case-insensitive matching
            if expected.lower() in source.lower() or source.lower() in expected.lower():
                return 1.0 / rank
    return 0.0


async def llm_judge_correctness(
    query: str, answer: str, expected_answer_contains: List[str]
) -> Dict[str, Any]:
    """
    Use LLM to judge answer correctness and faithfulness.

    Returns dict with correctness, faithfulness, and reasoning.
    """
    try:
        openai_client = get_openai_client()

        # Build judgment prompt
        expected_keywords = ", ".join(expected_answer_contains)
        prompt = f"""You are an evaluator judging RAG system answers.

Question: {query}

Generated Answer: {answer}

Expected answer should contain these concepts: {expected_keywords}

Evaluate:
1. Correctness: Does the answer correctly address the question? (true/false)
2. Faithfulness: Is the answer grounded in the provided context, not hallucinated? (true/false)

Respond in JSON format:
{{
  "correctness": true/false,
  "faithfulness": true/false,
  "reasoning": "brief explanation"
}}"""

        messages = [
            {
                "role": "system",
                "content": "You are a precise evaluator. Respond only with valid JSON.",
            },
            {"role": "user", "content": prompt},
        ]

        response = await openai_client.create_chat_completion(
            messages=messages, temperature=0.0, max_tokens=200
        )

        # Parse JSON response
        import re

        json_match = re.search(r"\{[^}]+\}", response.content, re.DOTALL)
        if json_match:
            judgment = json.loads(json_match.group())
            return {
                "correctness": judgment.get("correctness", False),
                "faithfulness": judgment.get("faithfulness", False),
                "reasoning": judgment.get("reasoning", ""),
            }
        else:
            return {
                "correctness": False,
                "faithfulness": False,
                "reasoning": "Failed to parse LLM judgment",
            }

    except Exception as e:
        logger.warning("LLM judgment failed", error=str(e))
        return {
            "correctness": None,
            "faithfulness": None,
            "reasoning": f"Error: {str(e)}",
        }


async def evaluate_case(
    case: EvaluationCase, use_llm_judge: bool = False
) -> EvaluationResult:
    """Evaluate a single case."""
    try:
        # Retrieve chunks
        retrieved_chunks = await retrieve(query=case.query, top_k=8)

        # Extract retrieved sources
        retrieved_sources = [
            chunk.source for chunk in retrieved_chunks if chunk.source
        ]

        # Calculate retrieval metrics
        hit_at_1 = calculate_hit_at_k(retrieved_sources, case.expected_sources, 1)
        hit_at_3 = calculate_hit_at_k(retrieved_sources, case.expected_sources, 3)
        hit_at_5 = calculate_hit_at_k(retrieved_sources, case.expected_sources, 5)
        hit_at_8 = calculate_hit_at_k(retrieved_sources, case.expected_sources, 8)
        mrr = calculate_mrr(retrieved_sources, case.expected_sources)

        # Generate answer
        answer_response = await generate_answer(
            query=case.query, retrieved_chunks=retrieved_chunks
        )
        answer = answer_response.answer

        # LLM judgment (optional)
        llm_judge_correctness = None
        llm_judge_faithfulness = None
        llm_judge_reasoning = None

        if use_llm_judge:
            judgment = await llm_judge_correctness(
                case.query, answer, case.expected_answer_contains
            )
            llm_judge_correctness = judgment["correctness"]
            llm_judge_faithfulness = judgment["faithfulness"]
            llm_judge_reasoning = judgment["reasoning"]

        return EvaluationResult(
            query=case.query,
            expected_sources=case.expected_sources,
            retrieved_sources=retrieved_sources,
            answer=answer,
            hit_at_1=hit_at_1,
            hit_at_3=hit_at_3,
            hit_at_5=hit_at_5,
            hit_at_8=hit_at_8,
            mrr=mrr,
            llm_judge_correctness=llm_judge_correctness,
            llm_judge_faithfulness=llm_judge_faithfulness,
            llm_judge_reasoning=llm_judge_reasoning,
        )

    except Exception as e:
        logger.error("Evaluation case failed", query=case.query, error=str(e))
        return EvaluationResult(
            query=case.query,
            expected_sources=case.expected_sources,
            retrieved_sources=[],
            answer="",
            hit_at_1=False,
            hit_at_3=False,
            hit_at_5=False,
            hit_at_8=False,
            mrr=0.0,
            error=str(e),
        )


def generate_report(summary: EvaluationSummary, results: List[EvaluationResult]) -> str:
    """Generate markdown report."""
    report = f"""# RAG Evaluation Report

Generated: {time.strftime("%Y-%m-%d %H:%M:%S")}

## Summary

| Metric | Value |
|--------|-------|
| Total Cases | {summary.total_cases} |
| Successful | {summary.successful} |
| Failed | {summary.failed} |
| Hit@1 | {summary.hit_at_1:.2%} |
| Hit@3 | {summary.hit_at_3:.2%} |
| Hit@5 | {summary.hit_at_5:.2%} |
| Hit@8 | {summary.hit_at_8:.2%} |
| MRR | {summary.mrr:.3f} |
"""

    if summary.llm_judge_correctness_rate is not None:
        report += f"""| LLM Judge Correctness | {summary.llm_judge_correctness_rate:.2%} |
| LLM Judge Faithfulness | {summary.llm_judge_faithfulness_rate:.2%} |
"""

    report += "\n## Retrieval Metrics\n\n"
    report += "Hit@K measures whether any expected source appears in the top K retrieved results.\n"
    report += "MRR (Mean Reciprocal Rank) measures the average reciprocal rank of the first relevant result.\n\n"

    if summary.failure_examples:
        report += "## Failure Examples\n\n"
        for i, failure in enumerate(summary.failure_examples[:5], 1):
            report += f"### Example {i}\n\n"
            report += f"**Query:** {failure['query']}\n\n"
            report += f"**Expected Sources:** {', '.join(failure['expected_sources'])}\n\n"
            report += f"**Retrieved Sources:** {', '.join(failure['retrieved_sources'][:5])}\n\n"
            report += f"**Answer:** {failure['answer'][:200]}...\n\n"
            if failure.get("llm_judge_reasoning"):
                report += f"**LLM Judgment:** {failure['llm_judge_reasoning']}\n\n"
            report += "\n"

    return report


async def run_evaluation():
    """Run the evaluation harness."""
    # Load configuration
    use_llm_judge = os.getenv("EVAL_USE_LLM_JUDGE", "false").lower() == "true"

    # Load dataset
    eval_dir = Path(__file__).parent
    dataset_path = eval_dir / "dataset.jsonl"
    report_path = eval_dir / "report.md"

    logger.info("Loading evaluation dataset", dataset_path=str(dataset_path))
    cases = load_dataset(dataset_path)
    logger.info("Loaded cases", count=len(cases))

    # Run evaluation
    results = []
    for i, case in enumerate(cases, 1):
        logger.info("Evaluating case", case_num=i, total=len(cases), query=case.query)
        result = await evaluate_case(case, use_llm_judge=use_llm_judge)
        results.append(result)

        # Small delay to avoid rate limits
        if i < len(cases):
            await asyncio.sleep(0.5)

    # Calculate summary
    successful = sum(1 for r in results if not r.error)
    failed = len(results) - successful

    hit_at_1_count = sum(1 for r in results if r.hit_at_1)
    hit_at_3_count = sum(1 for r in results if r.hit_at_3)
    hit_at_5_count = sum(1 for r in results if r.hit_at_5)
    hit_at_8_count = sum(1 for r in results if r.hit_at_8)
    mrr_sum = sum(r.mrr for r in results)

    summary = EvaluationSummary(
        total_cases=len(results),
        successful=successful,
        failed=failed,
        hit_at_1=hit_at_1_count / len(results) if results else 0.0,
        hit_at_3=hit_at_3_count / len(results) if results else 0.0,
        hit_at_5=hit_at_5_count / len(results) if results else 0.0,
        hit_at_8=hit_at_8_count / len(results) if results else 0.0,
        mrr=mrr_sum / len(results) if results else 0.0,
    )

    # LLM judge metrics
    if use_llm_judge:
        correctness_count = sum(
            1
            for r in results
            if r.llm_judge_correctness is True
        )
        faithfulness_count = sum(
            1
            for r in results
            if r.llm_judge_faithfulness is True
        )
        judged_count = sum(
            1
            for r in results
            if r.llm_judge_correctness is not None
        )

        if judged_count > 0:
            summary.llm_judge_correctness_rate = correctness_count / judged_count
            summary.llm_judge_faithfulness_rate = faithfulness_count / judged_count

    # Collect failure examples
    failure_examples = []
    for result in results:
        if not result.hit_at_5 or result.error:
            failure_examples.append(
                {
                    "query": result.query,
                    "expected_sources": result.expected_sources,
                    "retrieved_sources": result.retrieved_sources,
                    "answer": result.answer,
                    "llm_judge_reasoning": result.llm_judge_reasoning,
                }
            )
    summary.failure_examples = failure_examples[:10]  # Top 10 failures

    # Generate and save report
    report = generate_report(summary, results)
    with open(report_path, "w") as f:
        f.write(report)

    logger.info(
        "Evaluation completed",
        report_path=str(report_path),
        hit_at_1=summary.hit_at_1,
        hit_at_5=summary.hit_at_5,
        mrr=summary.mrr,
    )

    # Print summary to console
    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Total Cases: {summary.total_cases}")
    print(f"Successful: {summary.successful}")
    print(f"Failed: {summary.failed}")
    print(f"\nRetrieval Metrics:")
    print(f"  Hit@1: {summary.hit_at_1:.2%}")
    print(f"  Hit@3: {summary.hit_at_3:.2%}")
    print(f"  Hit@5: {summary.hit_at_5:.2%}")
    print(f"  Hit@8: {summary.hit_at_8:.2%}")
    print(f"  MRR: {summary.mrr:.3f}")
    if summary.llm_judge_correctness_rate is not None:
        print(f"\nLLM Judge Metrics:")
        print(f"  Correctness: {summary.llm_judge_correctness_rate:.2%}")
        print(f"  Faithfulness: {summary.llm_judge_faithfulness_rate:.2%}")
    print(f"\nReport saved to: {report_path}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    try:
        asyncio.run(run_evaluation())
    except KeyboardInterrupt:
        logger.info("Evaluation interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error("Evaluation failed", error=str(e), exc_info=True)
        sys.exit(1)

