"""API_KEY ENTITY 5,000개 생성."""

from common_single import run_single
from generate_ner_datasets import gen_api_key_entity


if __name__ == "__main__":
    run_single(
        entity_type="API_KEY",
        label="ENTITY",
        generator=gen_api_key_entity,
        filename="api_key_entity_5000.csv",
    )
