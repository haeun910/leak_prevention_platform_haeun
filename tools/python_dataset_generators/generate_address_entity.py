"""ADDRESS ENTITY 5,000개 생성."""

from common_single import run_single
from generate_ner_datasets import gen_address_entity


if __name__ == "__main__":
    run_single(
        entity_type="ADDRESS",
        label="ENTITY",
        generator=gen_address_entity,
        filename="address_entity_5000.csv",
    )
