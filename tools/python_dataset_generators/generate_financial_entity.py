"""FINANCIAL ENTITY 5,000개 생성."""

from common_single import run_single
from generate_ner_datasets import gen_financial_entity


if __name__ == "__main__":
    run_single(
        entity_type="FINANCIAL",
        label="ENTITY",
        generator=gen_financial_entity,
        filename="financial_entity_5000.csv",
    )
