"""DOCUMENT ENTITY 5,000개 생성."""

from common_single import run_single
from generate_ner_datasets import gen_document_entity


if __name__ == "__main__":
    run_single(
        entity_type="DOCUMENT",
        label="ENTITY",
        generator=gen_document_entity,
        filename="document_entity_5000.csv",
    )
