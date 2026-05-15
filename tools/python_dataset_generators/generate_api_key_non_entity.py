"""API_KEY NON_ENTITY 5,000개 생성."""

from common_single import run_single
from generate_ner_datasets import gen_api_key_non


if __name__ == "__main__":
    run_single(
        entity_type="API_KEY",
        label="NON_ENTITY",
        generator=gen_api_key_non,
        filename="api_key_non_entity_5000.csv",
    )
